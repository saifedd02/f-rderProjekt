import { getTodayDate } from "@/lib/utils/date";
import {
  LAENDER,
  type Antragsberechtigt,
  type Antragsstatus,
  type FoerdergeberEbene,
  type Groesse,
  type Instrument,
  type Merkmal,
  type ProgramFacts,
  type RegionCode,
} from "@/types/facts";
import { validExclusions } from "./exclusions";
import { parseInstruments } from "./instrument";
import { parseRegion } from "./region";
import { ALL_SIZES, parseSizes } from "./size";
import { statusFromDeadlineText, type DeadlineStatus } from "./status";
import { unique } from "./tokens";

/**
 * One extraction schema for every web provider (Perplexity, Gemini, Claude,
 * OpenAI), and its conversion into facts.
 *
 * The model reports; this module decides. Every enum value is validated,
 * unknown strings are dropped rather than mapped, and a claimed status only
 * counts with evidence: OFFEN needs a future deadline or explicit open
 * wording, never just the model's word.
 */
export interface ExtractedProgram {
  name?: string;
  beschreibung?: string;
  foerderhoehe?: string;
  zielgruppe?: string;
  /** Region as the source words it. */
  region?: string;
  foerdergebiet?: string[];
  foerdergeberEbene?: string;
  /** Deadline as the source words it. */
  frist?: string;
  /** YYYY-MM-DD, only when the source names a concrete date. */
  fristDatum?: string;
  antragsstatus?: string;
  /** Verbatim sentence the status rests on. */
  statusBeleg?: string;
  antragsberechtigte?: string[];
  unternehmensgroessen?: string[];
  instrumente?: string[];
  merkmale?: string[];
  foerderart?: string;
  foerderbereich?: string;
  ausgeschlosseneBranchen?: string[];
  quelle?: string;
  link?: string;
  sourceIndices?: number[];
}

const REGION_CODES = new Set<string>([...Object.keys(LAENDER), "BUND", "EU"]);
const EBENEN = new Set<string>(["BUND", "LAND", "EU", "KOMMUNE"]);
const BERECHTIGTE = new Set<string>([
  "UNTERNEHMEN",
  "EXISTENZGRUENDER",
  "KOMMUNE",
  "OEFFENTLICHE_EINRICHTUNG",
  "FORSCHUNGSEINRICHTUNG",
  "HOCHSCHULE",
  "BILDUNGSEINRICHTUNG",
  "PRIVATPERSON",
  "VERBAND",
]);
const INSTRUMENTE = new Set<string>([
  "ZUSCHUSS",
  "DARLEHEN",
  "BUERGSCHAFT",
  "GARANTIE",
  "BETEILIGUNG",
  "STEUERLICH",
  "SONSTIGE",
]);
const MERKMALE = new Set<string>(["TILGUNGSZUSCHUSS", "NACHRANG_MEZZANINE"]);

function valid<T extends string>(values: unknown, allowed: Set<string>): T[] {
  if (!Array.isArray(values)) return [];
  return unique(
    values
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim().toUpperCase())
      .filter((value) => allowed.has(value)) as T[]
  );
}

function regionOf(raw: ExtractedProgram): RegionCode[] {
  const codes = valid<RegionCode>(raw.foerdergebiet, REGION_CODES);
  if (codes.length > 0) return codes;
  return parseRegion(raw.region);
}

function sizesOf(raw: ExtractedProgram): Groesse[] {
  const values = Array.isArray(raw.unternehmensgroessen)
    ? raw.unternehmensgroessen.map((value) => String(value).trim().toUpperCase())
    : [];
  if (values.includes("ALLE")) return [...ALL_SIZES];
  const codes = valid<Groesse>(values, new Set(ALL_SIZES));
  if (codes.length > 0) return ALL_SIZES.filter((size) => codes.includes(size));
  // The source's own audience wording ("nur KMU") is evidence too.
  return parseSizes(raw.zielgruppe);
}

function isoDate(value: string | undefined): string | undefined {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value.trim()) ? value.trim() : undefined;
}

/** Status from evidence only. The model's claim may close, never open. */
function statusOf(raw: ExtractedProgram, today: Date): DeadlineStatus {
  const claimed = String(raw.antragsstatus ?? "").toUpperCase();
  const evidence = [
    statusFromDeadlineText(raw.frist, today),
    statusFromDeadlineText(raw.statusBeleg, today),
  ];
  const date = isoDate(raw.fristDatum);
  if (date) evidence.push(statusFromDeadlineText(`Frist bis ${date}`, today));

  const pick = (status: Antragsstatus) =>
    evidence.find((entry) => entry.status === status);

  if (claimed === "GESCHLOSSEN") return { status: "GESCHLOSSEN" };
  const closed = pick("GESCHLOSSEN");
  if (closed) return closed;
  if (claimed === "NOCH_NICHT_OFFEN")
    return pick("NOCH_NICHT_OFFEN") ?? { status: "NOCH_NICHT_OFFEN" };
  return (
    pick("NOCH_NICHT_OFFEN") ??
    pick("OFFEN") ??
    pick("KONTINGENT") ?? { status: "UNBEKANNT" }
  );
}

export function factsFromExtraction(
  raw: ExtractedProgram,
  today: Date = getTodayDate()
): ProgramFacts {
  const { status, fristDatum } = statusOf(raw, today);
  const parsedArt = parseInstruments(raw.foerderart);

  const instrumente = valid<Instrument>(raw.instrumente, INSTRUMENTE);
  const merkmale = unique([
    ...valid<Merkmal>(raw.merkmale, MERKMALE),
    ...parsedArt.merkmale,
    ...parseInstruments(raw.foerderhoehe).merkmale,
  ]);
  const berechtigte = valid<Antragsberechtigt>(raw.antragsberechtigte, BERECHTIGTE);
  const ebene = String(raw.foerdergeberEbene ?? "").toUpperCase();

  return {
    foerdergebiet: regionOf(raw),
    foerdergeberEbene: (EBENEN.has(ebene) ? ebene : "UNBEKANNT") as FoerdergeberEbene,
    antragsstatus: status,
    fristDatum,
    antragsberechtigte: berechtigte.length > 0 ? berechtigte : ["UNBEKANNT"],
    groessen: sizesOf(raw),
    instrumente: instrumente.length > 0 ? instrumente : parsedArt.instrumente,
    merkmale,
    gegenstaende: parsedArt.gegenstaende,
    branchenausschluesse: validExclusions(raw.ausgeschlosseneBranchen),
    herkunft: "WEB",
  };
}
