import type { Gegenstand, Instrument, Merkmal, Pruefergebnis } from "@/types/facts";
import { INSTRUMENT_LABELS, MERKMAL_LABELS } from "./labels";
import { unique, words } from "./tokens";

/**
 * Förderinstrument: text → instrument codes, and the instrument check.
 *
 * Word-based: a "Tilgungszuschuss" is a feature of a loan, not a grant, and
 * "100 % Förderung" names no instrument at all. Consulting is what is funded,
 * not how — it is kept apart as a Gegenstand.
 */

export interface ParsedInstruments {
  instrumente: Instrument[];
  merkmale: Merkmal[];
  gegenstaende: Gegenstand[];
}

function instrumentOfWord(word: string): Instrument | undefined {
  if (word.includes("tilgungszuschuss")) return undefined;
  if (
    /(zuschuss|zuschusse|zuschuessen|zuschussen)$/.test(word) ||
    /^zuschuss/.test(word)
  ) {
    return "ZUSCHUSS";
  }
  if (/^(zuwendung|zuwendungen|grant|grants)$/.test(word)) return "ZUSCHUSS";
  if (
    /(kredit|kredite|darlehen|darlehens|loan|loans)$/.test(word) ||
    /darlehen/.test(word)
  ) {
    return "DARLEHEN";
  }
  if (/burgschaft/.test(word)) return "BUERGSCHAFT";
  if (/garantie(n|programm|programme|instrument)?$/.test(word)) return "GARANTIE";
  if (
    /beteiligung|beteiligungskapital|wagniskapital|risikokapital|venture|equity/.test(
      word
    )
  ) {
    return "BETEILIGUNG";
  }
  if (
    /^(steuervergunstigung\w*|steuerbegunstigung\w*|steuerlich\w*|steuergutschrift\w*|forschungszulage|investitionszulage)$/.test(
      word
    )
  ) {
    return "STEUERLICH";
  }
  if (word === "sonstige") return "SONSTIGE";
  return undefined;
}

/** Parse instruments; `instrumente: ["UNBEKANNT"]` when the text names none. */
export function parseInstruments(text: string | undefined): ParsedInstruments {
  const tokens = words(text);
  const instrumente = unique(
    tokens.map(instrumentOfWord).filter((code): code is Instrument => Boolean(code))
  );
  const merkmale: Merkmal[] = [];
  if (tokens.some((word) => word.includes("tilgungszuschuss")))
    merkmale.push("TILGUNGSZUSCHUSS");
  if (tokens.some((word) => /nachrang|mezzanine/.test(word)))
    merkmale.push("NACHRANG_MEZZANINE");

  const gegenstaende: Gegenstand[] = tokens.some((word) =>
    /^(beratung\w*|coaching\w*|berater\w*)$/.test(word)
  )
    ? ["BERATUNG_COACHING"]
    : [];

  return {
    instrumente: instrumente.length > 0 ? instrumente : ["UNBEKANNT"],
    merkmale,
    gegenstaende,
  };
}

/** Förderdatenbank Förderart slugs → codes (garantie is NOT folded into Bürgschaft). */
export const FDB_INSTRUMENT_SLUGS: Record<string, Instrument> = {
  zuschuss: "ZUSCHUSS",
  darlehen: "DARLEHEN",
  buergschaft: "BUERGSCHAFT",
  garantie: "GARANTIE",
  beteiligung: "BETEILIGUNG",
  sonstige: "SONSTIGE",
};

/** Labels (legacy catalogue records) → codes. */
export function instrumentsFromLabels(labels: string[]): Instrument[] {
  const codes = unique(
    labels.flatMap((label) =>
      parseInstruments(label).instrumente.filter((code) => code !== "UNBEKANNT")
    )
  );
  return codes.length > 0 ? codes : ["UNBEKANNT"];
}

/** The Förderart dropdown value → criterion. Bürgschaft and Garantie belong together. */
export function instrumentCriterion(label: string | undefined): Instrument[] | undefined {
  switch (label) {
    case "Zuschuss":
      return ["ZUSCHUSS"];
    case "Kredit / Darlehen":
      return ["DARLEHEN"];
    case "Bürgschaft":
    case "Bürgschaft / Garantie":
      return ["BUERGSCHAFT", "GARANTIE"];
    case "Beteiligung":
      return ["BETEILIGUNG"];
    case "Steuervergünstigung":
    case "Steuerliche Förderung":
      return ["STEUERLICH"];
    default:
      return undefined;
  }
}

export function isInstrumentUnknown(codes: Instrument[]): boolean {
  return codes.length === 0 || codes.every((code) => code === "UNBEKANNT");
}

export function checkInstrument(
  codes: Instrument[],
  wanted: Instrument[] | undefined
): Pruefergebnis {
  if (!wanted || wanted.length === 0) return "GUELTIG";
  if (isInstrumentUnknown(codes)) return "UNGEPRUEFT";
  return codes.some((code) => wanted.includes(code)) ? "GUELTIG" : "AUSGESCHLOSSEN";
}

/** Reader-facing Förderart, e.g. "Kredit / Darlehen (mit Tilgungszuschuss)". */
export function instrumentLabel(
  codes: Instrument[],
  merkmale: Merkmal[] = []
): string | undefined {
  if (isInstrumentUnknown(codes)) return undefined;
  const base = codes
    .filter((code): code is Exclude<Instrument, "UNBEKANNT"> => code !== "UNBEKANNT")
    .map((code) => INSTRUMENT_LABELS[code])
    .join(", ");
  const extras = merkmale.map((merkmal) => MERKMAL_LABELS[merkmal]);
  return extras.length > 0 ? `${base} (${extras.join(", ")})` : base;
}

/** Words that name an instrument — hard criteria, not topic keywords. */
export function isInstrumentWord(word: string): boolean {
  return Boolean(instrumentOfWord(word)) || /^(forderkredit\w*|finanzierung)$/.test(word);
}
