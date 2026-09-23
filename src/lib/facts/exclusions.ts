import { normalizeText } from "@/lib/utils/text";
import type { Branchenausschluss } from "@/types/facts";
import { BRANCHENAUSSCHLUSS_LABELS } from "./labels";
import { unique } from "./tokens";

/**
 * Explicit industry exclusions ("Ausgenommen sind Unternehmen der Fischerei …").
 *
 * Only a sector named in the SAME sentence as exclusion wording counts, and
 * only in the part of the sentence the wording governs. Nothing is inferred
 * from silence or from a legal basis (De-minimis implies exclusions, but a
 * program that does not state them gets none from us).
 *
 * These are shown as information. The user's own industry is unknown, so an
 * exclusion never removes a program from the results.
 */

/** Wording that turns what follows (or the clause around it) into an exclusion. */
const EXCLUSION_WORDING =
  /\b(ausgenommen|ausgeschlossen|nicht antragsberechtigt|nicht gefordert|nicht forderfahig|nicht zuwendungsfahig|keine forderung|excluded|not eligible)\b/;

const SECTOR_TERMS: Array<[Branchenausschluss, RegExp]> = [
  ["FISCHEREI_AQUAKULTUR", /\b(fischerei\w*|aquakultur\w*|fischwirtschaft)\b/],
  [
    "LANDWIRTSCHAFT",
    /\b(landwirtschaft\w*|primarerzeugung landwirtschaftlicher|landwirtschaftlichen primarproduktion|primarproduktion landwirtschaftlicher|agrarsektor|agriculture)\b/,
  ],
  ["FORSTWIRTSCHAFT", /\bforstwirtschaft\w*\b/],
  [
    "KOHLEBERGBAU",
    /\b(kohle|steinkohle\w*|braunkohle\w*|kohlebergbau|kohleindustrie|coal)\b/,
  ],
  ["STAHL", /\b(stahlindustrie|stahlsektor|eisen und stahl\w*|stahl|steel)\b/],
  ["SCHIFFBAU", /\bschiffbau\w*\b/],
  ["KUNSTFASER", /\bkunstfaser\w*\b/],
  [
    "FINANZWIRTSCHAFT",
    /\b(kreditinstitut\w*|kreditwirtschaft|finanzdienstleist\w*|finanzsektor|finanzinstitut\w*|banken|finanzunternehmen)\b/,
  ],
  [
    "VERSICHERUNG",
    /\b(versicherungsunternehmen|versicherungswirtschaft|versicherungsgewerbe|versicherungssektor)\b/,
  ],
  [
    "IMMOBILIEN",
    /\b(immobilienwirtschaft|immobilienunternehmen|grundstucks und wohnungswesen)\b/,
  ],
  ["GLUECKSSPIEL", /\bglucksspiel\w*\b/],
  ["TABAK", /\btabak\w*\b/],
  ["RUESTUNG", /\b(rustung\w*|waffen\w*)\b/],
  ["VERKEHR", /\b(verkehrssektor|strassenguterverkehr\w*)\b/],
];

/**
 * The exclusion must be about businesses or sectors. "Nicht zuwendungsfähig
 * sind Ausgaben für … landwirtschaftliche Flächen" excludes a cost, not an
 * industry.
 */
const SECTOR_CONTEXT =
  /\b(unternehmen\w*|sektor\w*|bereich\w*|branche\w*|wirtschaftszweig\w*|primarproduktion|primarerzeugung|erzeugung|tatig\w*|investitionstatigkeit\w*|betriebe)\b/;

/** Fund names ("Europäischer Meeres-, Fischerei- und Aquakulturfonds") name no sector. */
const FUND_NAME = /(\b\w+\b ){0,4}\b\w*fonds\w*\b/g;

/** The part of one sentence that an exclusion wording governs. */
function governedText(sentence: string): string | undefined {
  const normalized = normalizeText(sentence);
  const match = EXCLUSION_WORDING.exec(normalized);
  if (!match) return undefined;

  // Leading form: "Ausgenommen sind A, B und C." → everything after the wording.
  const after = normalized.slice(match.index);
  // Trailing form: "Unternehmen der Fischerei sind ausgeschlossen." → the clause
  // that ends with the wording (commas separate unrelated clauses).
  const clauses = sentence.split(/,|\bsowie\b/);
  const trailing = clauses
    .map(normalizeText)
    .find((clause) => EXCLUSION_WORDING.test(clause));
  const governed = `${after} ${trailing ?? ""}`.replace(FUND_NAME, " ");
  return SECTOR_CONTEXT.test(governed) ? governed : undefined;
}

/**
 * Sentences, with a bulleted list joined to the sentence that introduces it:
 * "Ausgeschlossen sind Investitionen in den Sektoren:" + one item per line.
 */
function sentencesWithLists(text: string): string[] {
  const result: string[] = [];
  for (const line of text.split(/\n+/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const last = result[result.length - 1];
    if (last && /:\s*$/.test(last) && trimmed.length < 160) {
      result[result.length - 1] = `${last} ${trimmed}`.replace(/:\s+/, ": ");
      if (!/[.;]$/.test(trimmed)) result[result.length - 1] += ":";
      continue;
    }
    result.push(...trimmed.split(/(?<=[.!?])\s+|;/));
  }
  return result;
}

/**
 * @param text     the program's description
 * @param ownScope the program's name and categories — a program FOR a sector
 *                 does not exclude that sector as a whole ("Beratung in der
 *                 Landwirtschaft" excluding some consulting topics).
 */
export function extractIndustryExclusions(
  text: string | undefined,
  ownScope = ""
): Branchenausschluss[] {
  if (!text) return [];
  const scope = normalizeText(ownScope);
  const found: Branchenausschluss[] = [];

  for (const sentence of sentencesWithLists(text)) {
    const governed = governedText(sentence);
    if (!governed) continue;
    for (const [code, pattern] of SECTOR_TERMS) {
      if (pattern.test(governed) && !pattern.test(scope)) found.push(code);
    }
  }
  return unique(found);
}

/** Validate codes coming from a model: unknown strings are dropped, never mapped. */
export function validExclusions(values: unknown): Branchenausschluss[] {
  if (!Array.isArray(values)) return [];
  return unique(
    values.filter(
      (value): value is Branchenausschluss =>
        typeof value === "string" && value in BRANCHENAUSSCHLUSS_LABELS
    )
  );
}

export function exclusionLabels(codes: Branchenausschluss[] = []): string[] {
  return codes.map((code) => BRANCHENAUSSCHLUSS_LABELS[code]);
}
