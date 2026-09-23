/** Shape of a curated entry in the local Förderprogramm database. */
export interface DbFoerderprogramm {
  id: string;
  name: string;
  beschreibung: string;
  foerderhoehe: string;
  zielgruppe: string;
  region: string;
  /** Use ISO dates like "2026-12-31", "laufend", or "ended:2023-12-31" */
  frist: string;
  foerderbereich: string;
  foerderart: string;
  unternehmensgroesse: string[];
  link: string;
  isActive: boolean;
  quelle: string;
}
