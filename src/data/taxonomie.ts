/**
 * Controlled vocabulary of the Förderprogramm domain.
 *
 * These lists are the single source of truth for the filter dropdowns; the
 * hard criteria are derived from the selected label in `lib/facts/*`.
 *
 * The first entry of each list is its neutral "no selection" option and must
 * stay in sync with `defaultFilters` in `types/filters.ts`.
 */

export const regionen = [
  "Alle Regionen",
  "Bundesweit",
  "Baden-Württemberg",
  "Bayern",
  "Berlin",
  "Brandenburg",
  "Bremen",
  "Niedersachsen",
  "Sachsen-Anhalt",
  "Hamburg",
  "Hessen",
  "Mecklenburg-Vorpommern",
  "Nordrhein-Westfalen",
  "Rheinland-Pfalz",
  "Saarland",
  "Sachsen",
  "Schleswig-Holstein",
  "Thüringen",
];

export const foerderbereiche = [
  "Alle Kategorien",
  "Digitalisierung",
  "Nachhaltigkeitsberichterstattung",
  "Klimabilanzierung",
  "Nachhaltige technologische Entwicklung in Produktionsprozessen",
  "Nachhaltiger Einkauf",
  "Nachhaltige Seminare",
  "Maßnahmen zu Emissionsminderung",
  "Ressourcenmanagement",
  "Energiebereitstellung",
  "Energieeffizienz & Erneuerbare Energien",
];

/**
 * Förderinstrumente only. "Beratung / Coaching" is not an instrument (consulting
 * is funded by grant) and is no longer offered here; Bürgschaft and Garantie
 * are one choice because they are interchangeable for the applicant.
 */
export const foerderarten = [
  "Alle auswählen",
  "Zuschuss",
  "Kredit / Darlehen",
  "Bürgschaft / Garantie",
  "Beteiligung",
  "Steuervergünstigung",
];

export const unternehmensgroessen = [
  "Alle auswählen",
  "Großes Unternehmen",
  "Mittleres Unternehmen",
  "Kleines Unternehmen",
  "Kleinstunternehmen",
];

export const unternehmensgroessenInfo: Record<string, string> = {
  "Großes Unternehmen":
    "Mehr als 1.000 Beschäftigte und entweder einen Umsatz von über 50 Millionen € oder eine Bilanzsumme von über 25 Millionen €",
  "Mittleres Unternehmen":
    "Wenn zwei der folgenden Schwellenwerte nicht überschritten sind: 25 Mio. € Bilanzsumme; 50 Mio. € Nettoumsatz; durchschnittlich 250 Mitarbeiter",
  "Kleines Unternehmen":
    "Wenn zwei der folgenden Schwellenwerte nicht überschritten sind: 5 Mio. € Bilanzsumme; 10 Mio. € Nettoumsatz; durchschnittlich 50 Mitarbeiter",
  Kleinstunternehmen:
    "Wenn zwei der folgenden Schwellenwerte nicht überschritten sind: 450.000 € Bilanzsumme; 900.000 € Nettoumsatz; durchschnittlich 10 Mitarbeiter",
};
