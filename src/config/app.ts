/** Application-wide constants. Change behaviour here, not at the call sites. */

/** localStorage keys. Versioned — bump the suffix when the stored shape changes. */
export const STORAGE_KEYS = {
  favorites: "mpool-favorites-v3",
  /** Previous favorites format; migrated into v3 once, then removed. */
  legacyFavorites: "mpool-favorites-v2",
  /** Legacy key from the removed onboarding profile; cleared on boot. */
  legacyProfile: "mpool-company-profile",
} as const;

/** Maximum number of programs returned per search. */
export const MAX_PROGRAM_RESULTS = 8;

/** How many previous turns are sent to the model as context. */
export const HISTORY_WINDOW = 6;

/** Below this score a program is not worth showing when the query had context. */
export const MIN_RELEVANCE_SCORE = 20;

/** A deadline this close counts as "expiring soon". */
export const EXPIRING_SOON_DAYS = 60;

/** Starter prompts on the welcome screen — mirrors the Förderbereiche taxonomy. */
export const SUGGESTED_PROMPTS = [
  "Welche Förderprogramme passen zu uns?",
  "Digitalisierungsförderung",
  "Energieeffizienz & Klimaschutz",
  "Beratungsförderung",
  "Existenzgründung & Startups",
] as const;
