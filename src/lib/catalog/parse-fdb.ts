import { XMLParser } from "fast-xml-parser";
import {
  FDB_COMPANY_SIZE_LABELS,
  FDB_ELIGIBILITY_LABELS,
  FDB_FUNDING_TYPE_LABELS,
  FDB_INDUSTRY_LABELS,
  FDB_REGION_LABELS,
} from "@/config/catalog";
import { extractIndustryExclusions } from "@/lib/facts/exclusions";
import { FDB_INSTRUMENT_SLUGS } from "@/lib/facts/instrument";
import { classifyFdbHeader } from "@/lib/facts/status";
import { sentences } from "@/lib/format/card";
import type { CatalogLevel, CatalogProgram, CatalogSection } from "@/types/catalog";
import type { Instrument } from "@/types/facts";
import { contentFingerprint } from "./hash";
import { extractSections, repairTitle, richTextToPlain } from "./html";

/**
 * Parser for the Förderdatenbank XML export (Government Site Builder format).
 *
 * The export is a set of loosely linked documents: a program references an
 * `ExternerLink` document for its official URL and a `Foerdergeber` document
 * for its funding body. Those references are why the export beats web search —
 * the URL is editorially maintained, not guessed — so resolving them is the
 * whole point of this module.
 *
 * Status comes from the editorial banner `gsb:header` ("Antragstellung nicht
 * mehr möglich" …). `gsb:dateOfExpiration` is deliberately NOT read: it is the
 * CMS expiry of the page, not the end of the program.
 */

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  isArray: (name) =>
    name === "property" || name === "classifiedLinkList" || name === "link",
});

type XmlNode = Record<string, unknown>;

/** Documents a program points at, keyed by their `path/name` id. */
export interface FdbReferences {
  externalUrls: Map<string, string>;
  fundingBodies: Map<string, string>;
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function documentOf(xml: string): XmlNode | undefined {
  try {
    const parsed = parser.parse(xml) as XmlNode;
    const document = parsed?.document as XmlNode | undefined;
    return document && typeof document === "object" ? document : undefined;
  } catch {
    return undefined;
  }
}

/** `path` + `name` — the id other documents reference via `target:` links. */
function documentId(document: XmlNode): string | undefined {
  const path = document["@_path"];
  const name = document["@_name"];
  if (typeof path !== "string" || typeof name !== "string") return undefined;
  return `${path.replace(/\/$/, "")}/${name}`;
}

function properties(document: XmlNode): Map<string, XmlNode> {
  const map = new Map<string, XmlNode>();
  for (const property of asArray(document.property as XmlNode | XmlNode[])) {
    const name = property?.["@_name"];
    if (typeof name === "string") map.set(name, property);
  }
  return map;
}

function stringProperty(props: Map<string, XmlNode>, name: string): string | undefined {
  const value = props.get(name)?.value;
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function richTextProperty(props: Map<string, XmlNode>, name: string): string | undefined {
  const value = props.get(name)?.text;
  return typeof value === "string" ? value : undefined;
}

/** One classified group: which classifier it is, and what it points at. */
interface ClassifiedGroup {
  classifier: string;
  targets: string[];
}

function hrefsOf(container: unknown): string[] {
  if (!container || typeof container !== "object") return [];
  const links = asArray((container as XmlNode).link as XmlNode | XmlNode[]);
  return links
    .map((link) => link?.["@_xlink:href"])
    .filter((href): href is string => typeof href === "string")
    .map((href) => href.replace(/^target:/, ""));
}

/** Read a `ClassifiedLinkLists` property into flat groups. */
function classifiedGroups(props: Map<string, XmlNode>, name: string): ClassifiedGroup[] {
  const lists = props.get(name)?.classifiedLinkLists as XmlNode | undefined;
  if (!lists || typeof lists !== "object") return [];

  return asArray(lists.classifiedLinkList as XmlNode | XmlNode[]).map((entry) => {
    const classifierHref = hrefsOf(entry?.classifierLinks)[0] || "";
    return {
      classifier: classifierHref.split("/").pop() || "",
      targets: hrefsOf(entry?.links),
    };
  });
}

/** Slugs of one category group, e.g. `Foerderart` → ["zuschuss"]. */
function categorySlugs(groups: ClassifiedGroup[], classifier: string): string[] {
  const group = groups.find((entry) => entry.classifier === classifier);
  if (!group) return [];

  return group.targets
    .filter((target) => target.includes("/Categories/FDB/"))
    .map((target) => target.split("/").pop() || "")
    .filter(Boolean);
}

/** Map slugs onto German labels, dropping unknown ones rather than inventing. */
function labelled(slugs: string[], labels: Record<string, string>): string[] {
  return Array.from(
    new Set(
      slugs.map((slug) => labels[slug]).filter((label): label is string => Boolean(label))
    )
  );
}

/** `/…/Foerderprogramm/Land/Bayern` → level and, for a Land, its name. */
function levelFromPath(path: string): { level: CatalogLevel; landFromPath?: string } {
  const segments = path.split("/Foerderprogramm/")[1]?.split("/") ?? [];
  const head = (segments[0] || "").toLowerCase();

  if (head === "bund") return { level: "bund" };
  if (head === "eu") return { level: "eu" };
  if (head === "kommune") return { level: "kommune" };
  if (head === "land") {
    return { level: "land", landFromPath: segments[1]?.replace(/-/g, " ") };
  }
  return { level: "unbekannt" };
}

/** Canonical public page of a program in the Förderdatenbank portal. */
function detailUrlFor(path: string, name: string): string {
  const publicPath = path.replace(/^\/BMWI/, "");
  return `https://www.foerderdatenbank.de${publicPath}/${name}.html`;
}

/** Headings whose text most often carries an application deadline. */
const DEADLINE_HEADINGS = /frist|termin|antragsverfahren|einreichung/i;

/** Terms that name a deadline outright — enough on their own. */
const DEADLINE_TERM =
  /\b(antragsfrist|antragsschluss|einreichungsfrist|bewerbungsfrist|ausschlussfrist|stichtag)\b/i;

/** A concrete date, either numeric or with a German month name. */
const DEADLINE_DATE =
  /\b\d{1,2}\.\s?\d{1,2}\.\s?\d{2,4}\b|\b\d{1,2}\.\s?(januar|februar|märz|april|mai|juni|juli|august|september|oktober|november|dezember)\s+\d{4}\b/i;

/** Weaker phrasings that only count when a date backs them up. */
const DEADLINE_HINT =
  /\b(frist|bis zum|bis spätestens|einzureichen|eingereicht werden)\b/i;

/**
 * A deadline sentence quoted verbatim from the program text.
 *
 * The export has a structured `Foerdertermin` field, but it is empty on every
 * one of the ~2,500 documents — deadlines live in prose only. So we quote the
 * source rather than parse a date out of it: a wrong date in an alert is worse
 * than an honest "see the program page".
 *
 * The bar is deliberately high. A first version accepted any sentence
 * containing "Laufzeit" or "befristet" and produced lines like "Projekte können
 * nur gefördert werden, wenn ihre Laufzeit so gewählt wird …" — technically a
 * match, useless as a deadline. Now a sentence qualifies only if it names a
 * deadline outright, or pairs a date with deadline wording, and a sentence with
 * a concrete date always wins over one without.
 */
export function extractDeadline(sections: CatalogSection[]): string | undefined {
  const ordered = [
    ...sections.filter((section) => DEADLINE_HEADINGS.test(section.heading)),
    ...sections.filter((section) => !DEADLINE_HEADINGS.test(section.heading)),
  ];

  let fallback: string | undefined;

  for (const section of ordered) {
    for (const raw of section.text.split(/\n+/).flatMap(sentences)) {
      const sentence = raw.trim().replace(/\s+/g, " ");
      if (sentence.length < 10 || sentence.length > 400) continue;
      const hasDate = DEADLINE_DATE.test(sentence);
      const named = DEADLINE_TERM.test(sentence);

      if (hasDate && (named || DEADLINE_HINT.test(sentence))) return sentence;
      if (named && !fallback) fallback = sentence;
    }
  }

  return fallback;
}

/** An `ExternerLink` document: the official URL of a program. */
export function parseExternalLinkDocument(
  xml: string
): { id: string; url: string } | undefined {
  const document = documentOf(xml);
  if (!document) return undefined;

  const id = documentId(document);
  const url = stringProperty(properties(document), "gsb:url");
  if (!id || !url || !/^https?:\/\//i.test(url)) return undefined;

  return { id, url };
}

/** A `Foerdergeber` document: the name of a funding body. */
export function parseFundingBodyDocument(
  xml: string
): { id: string; name: string } | undefined {
  const document = documentOf(xml);
  if (!document) return undefined;

  const id = documentId(document);
  const props = properties(document);
  const name =
    richTextToPlain(richTextProperty(props, "gsb:title")).replace(/\s+/g, " ").trim() ||
    stringProperty(props, "gsb:name");
  if (!id || !name) return undefined;

  return { id, name };
}

/** Turn a program document into a catalogue record. */
export function parseProgramDocument(
  xml: string,
  references: FdbReferences
): CatalogProgram | undefined {
  const document = documentOf(xml);
  if (!document) return undefined;

  const path = document["@_path"];
  const name = document["@_name"];
  if (typeof path !== "string" || typeof name !== "string") return undefined;

  const props = properties(document);
  const title = repairTitle(richTextToPlain(richTextProperty(props, "gsb:title")));
  if (!title) return undefined;

  const bodySections = extractSections(richTextProperty(props, "gsb:bodyText"));
  const summaryText = richTextToPlain(richTextProperty(props, "gsb:summary"));
  const teaser = richTextToPlain(richTextProperty(props, "gsb:teaserText"))
    .replace(/\s+/g, " ")
    .trim();
  const legalBasis = richTextToPlain(richTextProperty(props, "gsb:regulatoryFWork"))
    .replace(/\s+/g, " ")
    .trim();

  const sections: CatalogSection[] = [
    ...bodySections,
    ...(legalBasis ? [{ heading: "Rechtsgrundlage", text: legalBasis }] : []),
  ];

  const statusHeader = richTextToPlain(richTextProperty(props, "gsb:header"))
    .replace(/\s+/g, " ")
    .trim();

  const processes = classifiedGroups(props, "gsb:cl2Processes");
  const { level, landFromPath } = levelFromPath(path);

  const regions = labelled(categorySlugs(processes, "Foerdergebiet"), FDB_REGION_LABELS);
  if (regions.length === 0 && landFromPath) regions.push(landFromPath);
  if (regions.length === 0 && level === "bund") regions.push("Bundesweit");

  // The funding organisation is a document reference, not a category.
  const organisationTarget = processes
    .find((group) => group.classifier === "Foerderorganisation")
    ?.targets.find((target) => target.includes("/Foerdergeber/"));
  const fundingBody = organisationTarget
    ? references.fundingBodies.get(organisationTarget)
    : undefined;

  // Same for the official link: follow the ExternerLink reference.
  const officialUrl = classifiedGroups(props, "gsb:cl2CustServices")
    .flatMap((group) => group.targets)
    .filter((target) => target.includes("/ExternerLink/"))
    .map((target) => references.externalUrls.get(target))
    .find((url): url is string => Boolean(url));

  const description = [summaryText, ...bodySections.map((section) => section.text)]
    .filter(Boolean)
    .join("\n\n")
    .trim();

  const fundingTypeSlugs = categorySlugs(processes, "Foerderart");
  const instruments = Array.from(
    new Set(
      fundingTypeSlugs
        .map((slug) => FDB_INSTRUMENT_SLUGS[slug])
        .filter((code): code is Instrument => Boolean(code))
    )
  );

  const program: Omit<CatalogProgram, "contentHash"> = {
    id: `fdb:${path.replace(/^\/BMWI\/FDB\/Content\/DE\/Foerderprogramm\//, "")}/${name}`,
    source: "foerderdatenbank",
    name: title,
    summary: teaser || summaryText.split("\n")[0] || undefined,
    description: description || undefined,
    sections,
    level,
    fundingBody,
    regions,
    categories: categorySlugs(processes, "Foerderbereich"),
    fundingTypes: labelled(fundingTypeSlugs, FDB_FUNDING_TYPE_LABELS),
    eligibleParties: labelled(
      categorySlugs(processes, "Foerderberechtigte"),
      FDB_ELIGIBILITY_LABELS
    ),
    companySizes: labelled(
      categorySlugs(processes, "Unternehmensgroesse"),
      FDB_COMPANY_SIZE_LABELS
    ),
    industries: labelled(
      Array.from(
        new Set([
          ...categorySlugs(processes, "BranchenUnternehmen"),
          ...categorySlugs(processes, "BranchenExistenzgruenderin"),
        ])
      ),
      FDB_INDUSTRY_LABELS
    ),
    deadline: extractDeadline(sections),
    statusHeader,
    headerStatus: classifyFdbHeader(statusHeader),
    instruments,
    industryExclusions: extractIndustryExclusions(
      [description, legalBasis].filter(Boolean).join("\n\n"),
      [title, ...categorySlugs(processes, "Foerderbereich")].join(" ")
    ),
    officialUrl,
    detailUrl: detailUrlFor(path, name),
    sourceUpdatedAt: stringProperty(props, "gsb:dateOfIssue"),
  };

  return { ...program, contentHash: fingerprintOf(program) };
}

/**
 * Fingerprint the fields whose change is worth an alert.
 *
 * `sourceUpdatedAt` is deliberately excluded — the portal restamps records
 * without touching their substance, and a digest full of "updated: nothing"
 * would train the reader to ignore it.
 */
export function fingerprintOf(program: Omit<CatalogProgram, "contentHash">): string {
  return contentFingerprint(
    [
      program.name,
      program.summary ?? "",
      program.description ?? "",
      program.deadline ?? "",
      program.officialUrl ?? "",
      program.fundingBody ?? "",
      program.level,
      program.regions.join("|"),
      program.categories.join("|"),
      program.fundingTypes.join("|"),
      program.eligibleParties.join("|"),
      program.companySizes.join("|"),
      program.industries.join("|"),
    ].join("")
  );
}
