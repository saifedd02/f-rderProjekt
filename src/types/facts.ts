/**
 * Hard criteria of a funding program as FIXED internal values.
 *
 * Free text never decides whether a program is admissible. Every source —
 * catalogue, web extraction, curated list — is folded onto these codes first,
 * and only the codes are compared. `UNBEKANNT` is a first-class value: it is
 * what we store when a source does not say, and it never counts as a match.
 */

/** The 16 Länder as fixed codes. Labels are the official spelling. */
export const LAENDER = {
  BW: "Baden-Württemberg",
  BY: "Bayern",
  BE: "Berlin",
  BB: "Brandenburg",
  HB: "Bremen",
  HH: "Hamburg",
  HE: "Hessen",
  MV: "Mecklenburg-Vorpommern",
  NI: "Niedersachsen",
  NW: "Nordrhein-Westfalen",
  RP: "Rheinland-Pfalz",
  SL: "Saarland",
  SN: "Sachsen",
  ST: "Sachsen-Anhalt",
  SH: "Schleswig-Holstein",
  TH: "Thüringen",
} as const;

export type LandCode = keyof typeof LAENDER;

/** Where applicants must be located — NOT who pays (see `FoerdergeberEbene`). */
export type RegionCode = LandCode | "BUND" | "EU" | "UNBEKANNT";

/** Who funds the program. An NRW program paid from EU funds is LAND, region NW. */
export type FoerdergeberEbene = "BUND" | "LAND" | "EU" | "KOMMUNE" | "UNBEKANNT";

/** Only OFFEN and KONTINGENT count as normally active. */
export type Antragsstatus =
  "OFFEN" | "GESCHLOSSEN" | "NOCH_NICHT_OFFEN" | "KONTINGENT" | "UNBEKANNT";

export type Antragsberechtigt =
  | "UNTERNEHMEN"
  | "EXISTENZGRUENDER"
  | "KOMMUNE"
  | "OEFFENTLICHE_EINRICHTUNG"
  | "FORSCHUNGSEINRICHTUNG"
  | "HOCHSCHULE"
  | "BILDUNGSEINRICHTUNG"
  | "PRIVATPERSON"
  | "VERBAND"
  | "UNBEKANNT";

/** "KMU" is only an alias for KLEINST + KLEIN + MITTEL, never a value of its own. */
export type Groesse = "KLEINST" | "KLEIN" | "MITTEL" | "GROSS" | "UNBEKANNT";

export type Instrument =
  | "ZUSCHUSS"
  | "DARLEHEN"
  | "BUERGSCHAFT"
  | "GARANTIE"
  | "BETEILIGUNG"
  | "STEUERLICH"
  | "SONSTIGE"
  | "UNBEKANNT";

/** Features of an instrument, stored apart so they never pose as an instrument. */
export type Merkmal = "TILGUNGSZUSCHUSS" | "NACHRANG_MEZZANINE";

/** What is funded, where that is not an instrument (consulting is paid by grant). */
export type Gegenstand = "BERATUNG_COACHING";

/** Industries a program EXPLICITLY excludes. Never inferred from silence. */
export type Branchenausschluss =
  | "FISCHEREI_AQUAKULTUR"
  | "LANDWIRTSCHAFT"
  | "FORSTWIRTSCHAFT"
  | "KOHLEBERGBAU"
  | "STAHL"
  | "SCHIFFBAU"
  | "KUNSTFASER"
  | "FINANZWIRTSCHAFT"
  | "VERSICHERUNG"
  | "IMMOBILIEN"
  | "GLUECKSSPIEL"
  | "TABAK"
  | "RUESTUNG"
  | "VERKEHR";

/** Where the facts of a program came from — catalogue facts outrank the web. */
export type FaktenHerkunft = "KATALOG" | "WEB" | "KURATIERT";

export interface ProgramFacts {
  foerdergebiet: RegionCode[];
  foerdergeberEbene: FoerdergeberEbene;
  antragsstatus: Antragsstatus;
  /** The next (or last) concrete deadline, ISO date, if one is known. */
  fristDatum?: string;
  antragsberechtigte: Antragsberechtigt[];
  groessen: Groesse[];
  instrumente: Instrument[];
  merkmale: Merkmal[];
  gegenstaende: Gegenstand[];
  branchenausschluesse: Branchenausschluss[];
  herkunft: FaktenHerkunft;
}

/** Outcome of checking one program against the hard criteria. */
export type Pruefergebnis = "GUELTIG" | "UNGEPRUEFT" | "AUSGESCHLOSSEN";

/** The hard criteria of one search (or of the alert run, which sets none). */
export interface HardCriteria {
  /** A Land, or BUND for "Bundesweit". */
  region?: LandCode | "BUND";
  /** Sizes the user's company may have; a program must allow at least one. */
  groessen?: Groesse[];
  /** Acceptable instruments; a program must offer at least one. */
  instrumente?: Instrument[];
}

export type Kriterium =
  "Region" | "Antragsstatus" | "Antragsberechtigung" | "Unternehmensgröße" | "Förderart";

export interface KriteriumPruefung {
  kriterium: Kriterium;
  ergebnis: Pruefergebnis;
}

export interface HardCheckResult {
  verdict: Pruefergebnis;
  checks: KriteriumPruefung[];
}

/** Förderbereich assessment — one definition for search, catalogue and alerts. */
export type ThemenBewertung = "PASST" | "MOEGLICHERWEISE" | "KEINE_AUSSAGE";
