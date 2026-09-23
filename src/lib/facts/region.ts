import {
  LAENDER,
  type LandCode,
  type Pruefergebnis,
  type RegionCode,
} from "@/types/facts";
import { hasPhrase, padded, removePhrase, unique } from "./tokens";

/**
 * Fördergebiet: free text → region codes, and the region check.
 *
 * Names are matched as whole words, longest first, and removed once matched —
 * that is what keeps "Sachsen-Anhalt" from also counting as "Sachsen" and
 * "Niedersachsen" from counting at all for Sachsen.
 */

/** Every spelling of each Land, longest first within the table order below. */
const LAND_NAMES: Array<[LandCode, string[]]> = [
  ["NW", ["nordrhein-westfalen", "nordrhein westfalen", "nrw"]],
  ["MV", ["mecklenburg-vorpommern", "mecklenburg vorpommern", "m-v"]],
  ["SH", ["schleswig-holstein", "schleswig holstein"]],
  ["ST", ["sachsen-anhalt", "sachsen anhalt"]],
  ["BW", ["baden-württemberg", "baden wuerttemberg", "baden-wurttemberg", "bawü"]],
  ["RP", ["rheinland-pfalz", "rheinland pfalz"]],
  ["NI", ["niedersachsen"]],
  ["SN", ["freistaat sachsen", "sachsen"]],
  ["BY", ["freistaat bayern", "bayern", "bayerisch", "bayerische", "bayerischen"]],
  ["BE", ["berlin", "berliner"]],
  ["BB", ["brandenburg", "brandenburger"]],
  ["HB", ["bremen", "bremer"]],
  ["HH", ["hamburg", "hamburger"]],
  ["HE", ["hessen", "hessisch", "hessische", "hessischen"]],
  ["SL", ["saarland", "saarländisch", "saarländische"]],
  ["TH", ["thüringen", "thueringen", "thüringer"]],
];

/** Whole-word markers of a nationwide program. "national" alone is NOT one. */
const BUND_MARKERS = [
  "bundesweit",
  "deutschlandweit",
  "ganz deutschland",
  "gesamte bundesgebiet",
  "bundesgebiet",
  "alle bundesländer",
  "deutschland",
];

/** Whole-word markers of an EU-wide call. Funding FROM the EU is not one. */
const EU_MARKERS = ["eu-weit", "eu weit", "europaweit", "alle eu-mitgliedstaaten"];

/** "EU"/"Europa" as the WHOLE region value, e.g. the model answered just "EU". */
const EU_ONLY = new Set(["eu", "europa", "europaische union", "eu weit"]);

/** "Bund" means nationwide only as the whole value — elsewhere it names the funder. */
const BUND_ONLY = new Set(["bund", "bund de"]);

/**
 * Parse a region text into codes.
 *
 * A Land always wins over an EU mention: "NRW (EU-Mittel)" is an NRW program
 * paid from EU funds, not an EU-wide one. Returns `["UNBEKANNT"]` when nothing
 * reliable is found — never a guess.
 */
export function parseRegion(text: string | undefined): RegionCode[] {
  let rest = padded(text);
  if (!rest.trim()) return ["UNBEKANNT"];

  const found: RegionCode[] = [];
  for (const [code, names] of LAND_NAMES) {
    for (const name of names) {
      if (hasPhrase(rest, name)) {
        found.push(code);
        rest = removePhrase(rest, name);
      }
    }
  }
  if (found.length > 0) return unique(found);

  if (EU_ONLY.has(rest.trim()) || EU_MARKERS.some((marker) => hasPhrase(rest, marker))) {
    return ["EU"];
  }
  if (
    BUND_ONLY.has(rest.trim()) ||
    BUND_MARKERS.some((marker) => hasPhrase(rest, marker))
  ) {
    return ["BUND"];
  }

  return ["UNBEKANNT"];
}

/** Codes of a set of labels such as the Förderdatenbank's ("Bundesweit", "Bayern"). */
export function regionsFromLabels(labels: string[]): RegionCode[] {
  const codes = unique(labels.flatMap((label) => parseRegion(label)));
  const known = codes.filter((code) => code !== "UNBEKANNT");
  return known.length > 0 ? known : ["UNBEKANNT"];
}

/** The filter dropdown value → the criterion code. */
export function regionCriterion(
  label: string | undefined
): LandCode | "BUND" | undefined {
  if (!label || label === "Alle Regionen") return undefined;
  if (label === "Bundesweit") return "BUND";
  const [code] = parseRegion(label);
  return code && code !== "UNBEKANNT" && code !== "EU" ? code : undefined;
}

/** True when the list carries no usable region. */
export function isRegionUnknown(codes: RegionCode[]): boolean {
  return codes.length === 0 || codes.every((code) => code === "UNBEKANNT");
}

/**
 * The region check.
 *
 *   filter Land X:  X → gültig, BUND → gültig, EU → gültig,
 *                   another single Land → ausgeschlossen, UNBEKANNT → ungeprüft
 *   filter BUND:    BUND/EU → gültig, Land-only → ausgeschlossen
 */
export function checkRegion(
  codes: RegionCode[],
  filter: LandCode | "BUND" | undefined
): Pruefergebnis {
  if (!filter) return "GUELTIG";
  if (isRegionUnknown(codes)) return "UNGEPRUEFT";
  if (codes.includes("BUND") || codes.includes("EU")) return "GUELTIG";
  if (filter !== "BUND" && codes.includes(filter)) return "GUELTIG";
  return "AUSGESCHLOSSEN";
}

/** Reader-facing region, e.g. "Ganz Deutschland" or "Bayern, Hessen". */
export function regionLabel(codes: RegionCode[]): string | undefined {
  if (isRegionUnknown(codes)) return undefined;
  return codes
    .filter((code) => code !== "UNBEKANNT")
    .map((code) =>
      code === "BUND" ? "Ganz Deutschland" : code === "EU" ? "EU-weit" : LAENDER[code]
    )
    .join(", ");
}

/** A single Land named in a free-text query — only when it is unambiguous. */
export function landInQuery(text: string): LandCode | undefined {
  const codes = parseRegion(text).filter((code): code is LandCode => code in LAENDER);
  return codes.length === 1 ? codes[0] : undefined;
}

/** Words that name a region — they are hard criteria, not topic keywords. */
export function isRegionWord(word: string): boolean {
  return (
    LAND_NAMES.some(([, names]) => names.some((name) => hasPhrase(padded(name), word))) ||
    BUND_MARKERS.some((marker) => hasPhrase(padded(marker), word)) ||
    ["eu", "europa", "europaweit", "bundesland", "land"].includes(word)
  );
}
