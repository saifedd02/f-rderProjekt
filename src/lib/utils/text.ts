/** Combining diacritical marks (U+0300–U+036F).
 *  Built via `new RegExp(string)` so the source carries no invisible combining
 *  characters that an editor or copy-paste could mangle. */
const DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");

/** Strip accents from a string, leaving base letters. */
export function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(DIACRITICS, "");
}

/**
 * Canonical comparison form: accent-free, lowercase, "ß" as "ss", "&" spelled
 * out and every non-alphanumeric run collapsed to a single space.
 *
 * Everything that compares German free text goes through this — matching,
 * keyword extraction and id generation must all agree on one normal form.
 */
export function normalizeText(value?: string): string {
  return (value || "")
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/&/g, " und ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** URL/id-safe form of a label, capped at 80 characters. */
export function slugify(value: string): string {
  return normalizeText(value).replace(/\s+/g, "-").slice(0, 80) || "programm";
}

/** Distinct, non-empty values in first-seen order. */
export function uniqueStrings(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

/** Words longer than 3 characters, accent-free — used to match a name against a URL. */
export function nameTokens(name: string): string[] {
  return stripDiacritics(name)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 3);
}

/**
 * Remove the footnote markers a citing model leaves in its prose.
 *
 * Sonar writes "Antragstellung vor Vorhabensbeginn.[5][10]" into fields we show
 * verbatim on a card. The sources are already modelled per program, so the
 * markers carry no information here — they just look like a bug to the reader.
 */
export function stripCitationMarkers(value?: string): string | undefined {
  if (!value) return undefined;
  const cleaned = value
    .replace(/(\[\d{1,2}\])+/g, "")
    .replace(/\s+([.,;:])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
  return cleaned.length > 0 ? cleaned : undefined;
}
