import type { Groesse, Pruefergebnis } from "@/types/facts";
import { GROESSE_LABELS } from "./labels";
import { hasPhrase, padded, removePhrase, unique } from "./tokens";

/**
 * Unternehmensgröße: text → size codes, and the size check.
 *
 * "KMU" is an alias for three sizes. "Unternehmen" and "Mittelstand" say
 * nothing about size — the German Mittelstand reaches far beyond the EU's
 * medium-sized definition — so they yield UNBEKANNT, never a guess.
 */

export const ALL_SIZES: Groesse[] = ["KLEINST", "KLEIN", "MITTEL", "GROSS"];
const KMU: Groesse[] = ["KLEINST", "KLEIN", "MITTEL"];

const ALL_SIZE_PHRASES = [
  "alle unternehmensgrößen",
  "alle größen",
  "unabhängig von der unternehmensgröße",
  "unabhängig von der größe",
  "ohne größenbeschränkung",
  "keine größenbeschränkung",
];

const KMU_PHRASES = [
  "kleine und mittlere unternehmen",
  "kleinen und mittleren unternehmen",
  "kleine und mittlere unternehmen kmu",
  "kmu",
  "sme",
  "smes",
];

const SIZE_PHRASES: Array<[Groesse, string[]]> = [
  [
    "KLEINST",
    [
      "kleinstunternehmen",
      "kleinstunternehmer",
      "kleinstbetrieb",
      "kleinstbetriebe",
      "kleinstes unternehmen",
    ],
  ],
  [
    "KLEIN",
    [
      "kleine unternehmen",
      "kleinen unternehmen",
      "kleines unternehmen",
      "kleinunternehmen",
      "kleinbetrieb",
      "kleinbetriebe",
      "kleiner betrieb",
      "kleines it unternehmen",
      "kleiner unternehmen",
    ],
  ],
  ["MITTEL", ["mittlere unternehmen", "mittleren unternehmen", "mittleres unternehmen"]],
  [
    "GROSS",
    [
      "großunternehmen",
      "große unternehmen",
      "großen unternehmen",
      "großes unternehmen",
      "großbetrieb",
      "großbetriebe",
      "midcap",
      "midcaps",
      "mid cap",
      "mid caps",
      "large enterprises",
    ],
  ],
];

/** Parse sizes from text; `["UNBEKANNT"]` when the text states none. */
export function parseSizes(text: string | undefined): Groesse[] {
  let rest = padded(text);
  if (ALL_SIZE_PHRASES.some((phrase) => hasPhrase(rest, phrase))) return [...ALL_SIZES];

  const found: Groesse[] = [];
  for (const phrase of KMU_PHRASES) {
    if (hasPhrase(rest, phrase)) {
      found.push(...KMU);
      rest = removePhrase(rest, phrase);
    }
  }
  for (const [size, phrases] of SIZE_PHRASES) {
    for (const phrase of phrases) {
      if (hasPhrase(rest, phrase)) {
        found.push(size);
        rest = removePhrase(rest, phrase);
      }
    }
  }
  return found.length > 0
    ? ALL_SIZES.filter((size) => found.includes(size))
    : ["UNBEKANNT"];
}

/** Förderdatenbank labels → codes. An empty list is UNBEKANNT, not "all sizes". */
export function sizesFromLabels(labels: string[]): Groesse[] {
  const codes = unique(
    labels.flatMap((label) =>
      (Object.entries(GROESSE_LABELS) as Array<[Groesse, string]>)
        .filter(([, known]) => known === label)
        .map(([code]) => code)
    )
  );
  return codes.length > 0
    ? ALL_SIZES.filter((size) => codes.includes(size))
    : ["UNBEKANNT"];
}

/** The size dropdown value → criterion. */
export function sizeCriterion(label: string | undefined): Groesse[] | undefined {
  if (!label || label === "Alle auswählen") return undefined;
  const codes = sizesFromLabels([label]);
  return codes[0] === "UNBEKANNT" ? undefined : codes;
}

export function isSizeUnknown(sizes: Groesse[]): boolean {
  return sizes.length === 0 || sizes.every((size) => size === "UNBEKANNT");
}

export function checkSize(
  sizes: Groesse[],
  wanted: Groesse[] | undefined
): Pruefergebnis {
  if (!wanted || wanted.length === 0) return "GUELTIG";
  if (isSizeUnknown(sizes)) return "UNGEPRUEFT";
  return sizes.some((size) => wanted.includes(size)) ? "GUELTIG" : "AUSGESCHLOSSEN";
}

/** Sizes named in a free-text query, if it names any. */
export function sizesInQuery(text: string): Groesse[] | undefined {
  const sizes = parseSizes(text);
  return isSizeUnknown(sizes) || sizes.length === ALL_SIZES.length ? undefined : sizes;
}

/** Words that describe company size — hard criteria, not topic keywords. */
export function isSizeWord(word: string): boolean {
  return /^(kmu|sme|smes|klein\w*|mittler\w*|mittelst\w*|gross\w*|midcaps?)$/.test(word);
}
