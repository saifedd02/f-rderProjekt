import { defaultFilters } from "@/types";
import { normalizeText } from "@/lib/utils/text";

/**
 * Filter defaults and keyword extraction.
 *
 * Filter values arrive from dropdowns and are already canonical labels; the
 * hard criteria are derived from them in `lib/search/criteria.ts`. Nothing
 * here folds free text onto a filter by substring any more.
 */

// Entries are normalized via normalizeText (umlauts stripped) because
// extractKeywords compares AFTER normalization — raw umlaut forms never match.
const STOPWORDS = new Set(
  [
    "und",
    "oder",
    "der",
    "die",
    "das",
    "dem",
    "den",
    "des",
    "ein",
    "eine",
    "einer",
    "einem",
    "eines",
    "mit",
    "für",
    "auf",
    "aus",
    "von",
    "zum",
    "zur",
    "bei",
    "im",
    "in",
    "am",
    "an",
    "als",
    "wie",
    "auch",
    "bitte",
    "ich",
    "mein",
    "meine",
    "wir",
    "uns",
    "unser",
    "unsere",
    "unseren",
    "unternehmen",
    "unternehmens",
    "firma",
    "betrieb",
    "förderung",
    "förderungen",
    "fördermöglichkeiten",
    "förderprogramm",
    "förderprogramme",
    "programm",
    "programme",
    "möchten",
    "lassen",
    "passen",
    "passend",
    "passende",
    "welche",
    "welcher",
    "gibt",
    "suche",
    "suchen",
    "finde",
    "finden",
    "wollen",
    "brauchen",
    "aktuell",
    "aktuelle",
    "neue",
    "neuen",
    "neu",
    "deutsche",
    "deutschen",
    "deutscher",
    "mehr",
    "sind",
    "haben",
    "einen",
  ].map((word) => normalizeText(word))
);

/** Values that mean "the user did not narrow this facet". */
const FILTER_DEFAULTS = new Set<string>([
  "",
  defaultFilters.region,
  defaultFilters.foerderbereich,
  defaultFilters.foerderart,
  defaultFilters.unternehmensgroesse,
]);

/** True when the user actually narrowed this facet. */
export function isActiveFilter(value?: string): boolean {
  return !FILTER_DEFAULTS.has(value || "");
}

/** Distinct, meaningful search terms from free text — stopwords and short words dropped. */
export function extractKeywords(text: string): string[] {
  return Array.from(
    new Set(
      normalizeText(text)
        .split(" ")
        .filter((word) => word.length > 2 && !STOPWORDS.has(word))
    )
  );
}
