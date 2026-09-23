import { defaultFilters, type SearchFilters } from "@/types";

/**
 * Filter helpers for values that come straight from the UI dropdowns.
 *
 * These are already canonical, so a plain comparison is enough.
 */

/** The facets the user changed away from their default, in display order. */
export function selectedFilterValues(filters: SearchFilters): string[] {
  return (["region", "foerderbereich", "foerderart", "unternehmensgroesse"] as const)
    .filter((key) => filters[key] !== defaultFilters[key])
    .map((key) => filters[key]);
}

/** How many facets are currently narrowed. */
export function countActiveFilters(filters: SearchFilters): number {
  return selectedFilterValues(filters).length;
}
