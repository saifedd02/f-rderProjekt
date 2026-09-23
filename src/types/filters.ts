/**
 * The facets the user can narrow a search by. Region, size and Förderart are
 * hard criteria; the Förderbereich only steers relevance. The user's industry
 * is deliberately not a filter.
 */
export interface SearchFilters {
  region: string;
  foerderbereich: string;
  foerderart: string;
  unternehmensgroesse: string;
}

/** "No selection" state — each value is the neutral option of its dropdown. */
export const defaultFilters: SearchFilters = {
  region: "Alle Regionen",
  foerderbereich: "Alle Kategorien",
  foerderart: "Alle auswählen",
  unternehmensgroesse: "Alle auswählen",
};
