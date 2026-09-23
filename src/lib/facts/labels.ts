import type {
  Antragsberechtigt,
  Antragsstatus,
  Branchenausschluss,
  Groesse,
  Instrument,
  Merkmal,
} from "@/types/facts";

/** Reader-facing German labels of the fixed values. One place, one spelling. */

export const GROESSE_LABELS: Record<Exclude<Groesse, "UNBEKANNT">, string> = {
  KLEINST: "Kleinstunternehmen",
  KLEIN: "Kleines Unternehmen",
  MITTEL: "Mittleres Unternehmen",
  GROSS: "Großes Unternehmen",
};

export const INSTRUMENT_LABELS: Record<Exclude<Instrument, "UNBEKANNT">, string> = {
  ZUSCHUSS: "Zuschuss",
  DARLEHEN: "Kredit / Darlehen",
  BUERGSCHAFT: "Bürgschaft",
  GARANTIE: "Garantie",
  BETEILIGUNG: "Beteiligung",
  STEUERLICH: "Steuerliche Förderung",
  SONSTIGE: "Sonstige",
};

export const MERKMAL_LABELS: Record<Merkmal, string> = {
  TILGUNGSZUSCHUSS: "mit Tilgungszuschuss",
  NACHRANG_MEZZANINE: "Nachrang / Mezzanine",
};

export const ANTRAGSBERECHTIGT_LABELS: Record<
  Exclude<Antragsberechtigt, "UNBEKANNT">,
  string
> = {
  UNTERNEHMEN: "Unternehmen",
  EXISTENZGRUENDER: "Existenzgründer/innen",
  KOMMUNE: "Kommunen",
  OEFFENTLICHE_EINRICHTUNG: "Öffentliche Einrichtungen",
  FORSCHUNGSEINRICHTUNG: "Forschungseinrichtungen",
  HOCHSCHULE: "Hochschulen",
  BILDUNGSEINRICHTUNG: "Bildungseinrichtungen",
  PRIVATPERSON: "Privatpersonen",
  VERBAND: "Verbände / Vereinigungen",
};

export const BRANCHENAUSSCHLUSS_LABELS: Record<Branchenausschluss, string> = {
  FISCHEREI_AQUAKULTUR: "Fischerei und Aquakultur",
  LANDWIRTSCHAFT: "Landwirtschaft",
  FORSTWIRTSCHAFT: "Forstwirtschaft",
  KOHLEBERGBAU: "Kohlebergbau",
  STAHL: "Stahlindustrie",
  SCHIFFBAU: "Schiffbau",
  KUNSTFASER: "Kunstfaserindustrie",
  FINANZWIRTSCHAFT: "Kredit- und Finanzwirtschaft",
  VERSICHERUNG: "Versicherungswirtschaft",
  IMMOBILIEN: "Immobilienwirtschaft",
  GLUECKSSPIEL: "Glücksspiel",
  TABAK: "Tabakindustrie",
  RUESTUNG: "Rüstung und Waffen",
  VERKEHR: "Verkehrssektor",
};

export const ANTRAGSSTATUS_LABELS: Record<Antragsstatus, string> = {
  OFFEN: "Antragstellung möglich",
  KONTINGENT: "Solange Mittel verfügbar",
  NOCH_NICHT_OFFEN: "Noch nicht geöffnet",
  GESCHLOSSEN: "Antragstellung nicht möglich",
  UNBEKANNT: "Antragsstatus unklar",
};
