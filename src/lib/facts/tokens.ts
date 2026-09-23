import { normalizeText } from "@/lib/utils/text";

/**
 * Whole-word matching on normalized text.
 *
 * Substring tests are what put "Leuna" into the EU (l-EU-na), "Niedersachsen"
 * into Sachsen and "international" into Germany. Every fact parser therefore
 * works on word sequences: a term matches only where it starts and ends on a
 * word boundary.
 */

/** Normalized text padded with spaces, so ` term ` finds whole words only. */
export function padded(text: string | undefined): string {
  return ` ${normalizeText(text)} `;
}

/** True when `phrase` (normalized) occurs as whole words in `paddedText`. */
export function hasPhrase(paddedText: string, phrase: string): boolean {
  const needle = normalizeText(phrase);
  return needle.length > 0 && paddedText.includes(` ${needle} `);
}

/** Remove every whole-word occurrence of `phrase`, so a shorter name cannot re-match it. */
export function removePhrase(paddedText: string, phrase: string): string {
  const needle = ` ${normalizeText(phrase)} `;
  let result = paddedText;
  while (result.includes(needle)) result = result.replace(needle, " ");
  return result;
}

/** The individual words of a text, normalized. */
export function words(text: string | undefined): string[] {
  return normalizeText(text).split(" ").filter(Boolean);
}

/** Distinct values in first-seen order. */
export function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}
