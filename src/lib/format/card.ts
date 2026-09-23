/**
 * Card texts: short, complete, never cut mid-word.
 *
 * A card line is shortened to whole sentences or clauses. There is no "…":
 * a clipped amount ("bis zu 25 Mio. EUR in Stufe…") reads as a different
 * statement, while a complete first clause is still true.
 */

/**
 * Sentence ends that are not abbreviations ("Mio.", "z. B.") and not the dot
 * of a date ("31. März 2025") — splitting there cut deadlines in half.
 */
const SENTENCE_END =
  /(?<!\b(?:Mio|Mrd|Tsd|bzw|ca|max|min|inkl|zzgl|ggf|z|B|u|a|Nr|Abs|Art|S|vgl|d|h|i|e|Kap|Ziff|lit|\d{1,2}))[.!?](?=\s+[A-ZÄÖÜ0-9])(?!\s+(?:Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\b)/;

/** Split prose into sentences without breaking dates or abbreviations. */
export function sentences(text: string): string[] {
  const parts: string[] = [];
  let rest = text.replace(/\s+/g, " ").trim();
  while (rest) {
    const match = SENTENCE_END.exec(rest);
    if (!match) {
      parts.push(rest);
      break;
    }
    parts.push(rest.slice(0, match.index + 1).trim());
    rest = rest.slice(match.index + 1).trim();
  }
  return parts.filter(Boolean);
}

/** The longest prefix of whole clauses that fits `max`, or undefined if none does. */
function wholeClauses(sentence: string, max: number): string | undefined {
  if (sentence.length <= max) return sentence;
  const clauses = sentence.split(/(?<=[;,])\s+|\s+(?=\()/);
  let result = "";
  for (const clause of clauses) {
    const next = result ? `${result} ${clause}` : clause;
    if (next.length > max) break;
    result = next;
  }
  const trimmed = result.replace(/[;,]\s*$/, "").trim();
  return trimmed.length >= 20 ? trimmed : undefined;
}

/** First whole sentence(s) up to `max` characters; clause-cut only as a last resort. */
export function shortText(text: string | undefined, max = 160): string | undefined {
  if (!text) return undefined;
  const all = sentences(text);
  if (all.length === 0) return undefined;

  let result = "";
  for (const sentence of all) {
    const next = result ? `${result} ${sentence}` : sentence;
    if (next.length > max) break;
    result = next;
  }
  if (result) return result;
  return wholeClauses(all[0], max) ?? all[0];
}

const AMOUNT = /(\d[\d.,]*\s?(%|prozent|eur\b|euro|€|mio|mrd|tsd)|€\s?\d)/i;

/**
 * Förderhöhe for one or two card lines: the first sentence that names an
 * amount or rate, shortened to whole clauses.
 */
export function shortAmount(text: string | undefined, max = 150): string | undefined {
  if (!text) return undefined;
  const all = sentences(text);
  const withAmount = all.find((sentence) => AMOUNT.test(sentence));
  if (!withAmount) return shortText(text, max);
  return wholeClauses(withAmount, max) ?? withAmount;
}
