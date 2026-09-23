import { TODAY } from "@/lib/utils/date";
import type { Foerderprogramm, ScoredProgram, StoredFavorite } from "@/types";

/**
 * Stored favorites — format v3 and the migration from v2.
 *
 * Favorites store the FULL program record, not just an id: a web program
 * cannot be looked up again later. v2 entries carried a "% Match" score,
 * reasons, a deadline badge and the removed industry field; v3 carries
 * relevance, hints and the structured facts. Old entries stay readable: the
 * removed fields are dropped, facts stay absent (the card then shows
 * "nicht angegeben" instead of a guess), and nothing is recomputed as "active".
 */

/** Program fields that exist in v3 — everything else is dropped on read. */
const PROGRAM_FIELDS: Array<keyof Foerderprogramm> = [
  "id",
  "name",
  "beschreibung",
  "foerderhoehe",
  "zielgruppe",
  "region",
  "frist",
  "foerderbereich",
  "kategorien",
  "foerderart",
  "link",
  "quelle",
  "sourceUrls",
  "statusNote",
  "facts",
  "catalogId",
];

function cleanProgram(value: Record<string, unknown>): Foerderprogramm {
  const program: Record<string, unknown> = {};
  for (const field of PROGRAM_FIELDS) {
    if (value[field] !== undefined) program[field] = value[field];
  }
  return program as unknown as Foerderprogramm;
}

const strings = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];

/**
 * Repair one stored entry, v2 or v3.
 *
 * Anything in localStorage may predate the current shape or have been edited
 * by hand, so each field is validated individually; entries without an
 * identifiable program are dropped.
 */
export function normalizeStoredFavorite(value: unknown): StoredFavorite | null {
  const entry = (value ?? {}) as Record<string, unknown>;
  const rawProgram = entry.program as Record<string, unknown> | undefined;
  if (!rawProgram?.id || !rawProgram.name) return null;

  const relevance = entry.relevance;
  return {
    program: cleanProgram(rawProgram),
    score: typeof entry.score === "number" ? entry.score : 50,
    relevance: relevance === "hoch" || relevance === "niedrig" ? relevance : "mittel",
    verdict: entry.verdict === "GUELTIG" ? "GUELTIG" : "UNGEPRUEFT",
    hints: strings(entry.hints),
    unchecked: strings(entry.unchecked),
    savedAt: typeof entry.savedAt === "string" ? entry.savedAt : new Date().toISOString(),
    linkWarning: typeof entry.linkWarning === "string" ? entry.linkWarning : undefined,
    linkIsGeneric:
      typeof entry.linkIsGeneric === "boolean" ? entry.linkIsGeneric : undefined,
    source:
      entry.source === "websuche" || entry.source === "hybrid"
        ? entry.source
        : "datenbank",
    checkedAt: typeof entry.checkedAt === "string" ? entry.checkedAt : TODAY,
    linkVerified:
      typeof entry.linkVerified === "boolean" ? entry.linkVerified : undefined,
    sourceUrls: strings(entry.sourceUrls),
  };
}

/** Parse a stored list; anything unreadable yields an empty list, never a crash. */
export function parseStoredFavorites(raw: string | null): StoredFavorite[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeStoredFavorite)
      .filter((entry): entry is StoredFavorite => Boolean(entry));
  } catch {
    return [];
  }
}

/** A search result as a favorite. */
export function toFavorite(scored: ScoredProgram): StoredFavorite {
  return { ...scored, savedAt: new Date().toISOString() };
}
