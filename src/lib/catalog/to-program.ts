import { FDB_CATEGORY_LABELS } from "@/config/catalog";
import { catalogFacts } from "@/lib/facts/catalog";
import { instrumentLabel } from "@/lib/facts/instrument";
import { regionLabel } from "@/lib/facts/region";
import { shortText } from "@/lib/format/card";
import { getTodayDate } from "@/lib/utils/date";
import type { CatalogProgram } from "@/types/catalog";
import type { Foerderprogramm } from "@/types";

/**
 * Catalogue record → the shape the search pipeline checks and ranks.
 *
 * The catalogue is deliberately NOT given its own ranking: it enters
 * `scoreProgramList` as one more candidate source, so a curated record and a
 * web result are filtered and scored by exactly the same rules. What the
 * catalogue brings is better inputs — structured facts, a verified link, a
 * funding body — not special treatment.
 */

/** Headings whose text answers a specific field of a program card. */
export const SECTION_FOR = {
  amount: /art und höhe|höhe der förderung|umfang der förderung|förderhöhe/i,
  audience: /antragsberechtigt|zuwendungsempfänger|wer wird gefördert|zielgruppe/i,
  purpose: /ziel und gegenstand|zweck|was wird gefördert|gegenstand der förderung/i,
} as const;

/** How much of a section is carried onto a card record — whole sentences only. */
const MAX_FIELD_LENGTH = 600;

export function sectionText(
  program: CatalogProgram,
  pattern: RegExp,
  maxLength = MAX_FIELD_LENGTH
): string | undefined {
  const section = program.sections.find((entry) => pattern.test(entry.heading));
  if (!section) return undefined;

  const text = section.text.replace(/\s+/g, " ").trim();
  if (!text) return undefined;
  return shortText(text, maxLength);
}

/** Readable Förderbereich of a source slug. */
export function categoryLabel(slug: string): string {
  const known = FDB_CATEGORY_LABELS[slug];
  if (known) return known;
  const words = slug.replace(/_/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function catalogToProgram(
  program: CatalogProgram,
  today: Date = getTodayDate()
): Foerderprogramm {
  const facts = catalogFacts(program, today);
  const purpose = sectionText(program, SECTION_FOR.purpose);
  const link = program.officialUrl ?? program.detailUrl;

  return {
    id: program.id,
    name: program.name,
    beschreibung: purpose ?? program.summary,
    foerderhoehe: sectionText(program, SECTION_FOR.amount),
    zielgruppe: sectionText(program, SECTION_FOR.audience),
    region: regionLabel(facts.foerdergebiet),
    frist: program.deadline,
    foerderbereich: program.categories.map(categoryLabel).join(", ") || undefined,
    kategorien: program.categories,
    foerderart: instrumentLabel(facts.instrumente, facts.merkmale),
    link,
    quelle: program.fundingBody ?? "Förderdatenbank des Bundes",
    statusNote: program.headerStatus === "GESCHLOSSEN" ? program.statusHeader : undefined,
    facts,
    catalogId: program.id,
    sourceUrls: Array.from(
      new Set(
        [program.officialUrl, program.detailUrl].filter((url): url is string =>
          Boolean(url)
        )
      )
    ),
  };
}

/** How much description enters the full-text index — enough to be findable,
 *  short enough that ranking is not dominated by one very long document. */
const MAX_INDEXED_DESCRIPTION = 6000;

/**
 * The text a catalogue record is searchable by.
 *
 * Kept next to the card mapping so the two never drift: anything a user can
 * read on a card should also be something they can search for.
 */
export function searchSourceOf(program: CatalogProgram): string {
  return [
    program.name,
    program.summary ?? "",
    (program.description ?? "").slice(0, MAX_INDEXED_DESCRIPTION),
    program.categories.map(categoryLabel).join(" "),
    program.regions.join(" "),
    program.fundingTypes.join(" "),
    program.industries.join(" "),
    program.fundingBody ?? "",
  ].join("\n");
}
