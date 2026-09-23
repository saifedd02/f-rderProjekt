import type { CatalogSection } from "@/types/catalog";

/**
 * The export's RichText fields are HTML wrapped in an escaped CDATA marker.
 *
 * Everything here turns that into plain text we can index, score and put into
 * an email — including the document's own headings, which are the difference
 * between a readable digest entry and a wall of text.
 */

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  shy: "",
  euro: "€",
  bdquo: "„",
  ldquo: "“",
  rdquo: "”",
  laquo: "«",
  raquo: "»",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  szlig: "ß",
  auml: "ä",
  ouml: "ö",
  uuml: "ü",
  Auml: "Ä",
  Ouml: "Ö",
  Uuml: "Ü",
};

/** Resolve the entity references that survive the XML parser. */
export function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_, dec: string) =>
      String.fromCodePoint(Number.parseInt(dec, 10))
    )
    .replace(/&([a-zA-Z]+);/g, (match, name: string) => NAMED_ENTITIES[name] ?? match);
}

/** Strip the `<![CDATA[ … ]]>` wrapper the export puts around every RichText. */
export function unwrapRichText(value?: string): string {
  if (!value) return "";
  return value
    .trim()
    .replace(/^<!\[CDATA\[/, "")
    .replace(/\]\]>$/, "")
    .trim();
}

/** HTML → readable plain text, with block elements becoming line breaks. */
export function htmlToText(html: string): string {
  const withBreaks = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    // Inline markup is removed WITHOUT a space: the export wraps abbreviations
    // in <abbr>, so a blanket space would turn "ESF+" into "ESF +".
    .replace(/<\/?(?:abbr|span|strong|em|b|i|u|a|sup|sub|small|code|font)\b[^>]*>/gi, "")
    .replace(/<[^>]+>/g, " ");

  return decodeEntities(withBreaks)
    .split("\n")
    .map((line) => line.replace(/[ \t ]+/g, " ").trim())
    .filter((line, index, lines) => line.length > 0 || lines[index - 1]?.length > 0)
    .join("\n")
    .trim();
}

/** Plain text of a RichText property in one step. */
export function richTextToPlain(value?: string): string {
  return htmlToText(unwrapRichText(value));
}

/**
 * Repair dashes the export lost on its way through a legacy encoding.
 *
 * Program titles in the source read "Weiterbilden für die Zukunft ? Qualifizierung"
 * — a literal question mark where an en dash belongs. Only a question mark
 * *surrounded by spaces* is rewritten, so a genuine question ("Wer wird
 * gefördert?") is never touched. Titles and headings only; body prose keeps
 * whatever the source says.
 */
export function repairTitle(value: string): string {
  return (
    value
      // A PAIR of question marks wrapping a short phrase was a pair of quotes.
      // Requiring both halves keeps a genuine question ("Wer wird gefördert?")
      // untouched, since that has only one.
      .replace(/(^|\s)\?([^?]{1,120}?)\?(?=$|[\s,.;:)])/g, '$1„$2"')
      // A question mark alone between two spaces was an en dash …
      .replace(/\s+\?\s+/g, " – ")
      // … and one between two digits was a range dash ("2021?2027").
      .replace(/(\d)\?(\d)/g, "$1–$2")
      .replace(/\s+/g, " ")
      // The repaired quotes must not keep the spaces the question marks had.
      .replace(/„\s+/g, "„")
      .replace(/\s+"/g, '"')
      .trim()
  );
}

/**
 * Split a RichText body along its own `<h2>`/`<h3>` headings.
 *
 * The export's program descriptions are consistently structured ("Ziel und
 * Gegenstand", "Antragsberechtigte", "Art und Höhe der Förderung",
 * "Antragsverfahren"), so these sections are what makes a digest entry useful
 * without sending the whole page.
 */
export function extractSections(value?: string): CatalogSection[] {
  const html = unwrapRichText(value);
  if (!html) return [];

  const sections: CatalogSection[] = [];
  const pattern = /<h([23])[^>]*>([\s\S]*?)<\/h\1>([\s\S]*?)(?=<h[23][^>]*>|$)/gi;

  let match = pattern.exec(html);
  while (match !== null) {
    const heading = repairTitle(htmlToText(match[2]));
    const text = htmlToText(match[3]);
    if (heading && text) sections.push({ heading, text });
    match = pattern.exec(html);
  }

  return sections;
}
