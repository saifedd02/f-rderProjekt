import type { ProgramFacts } from "./facts";

/**
 * Domain model for a single Förderprogramm and its checked/ranked form.
 */

/** Where a program record originated. `hybrid` = web hit carrying catalogue facts. */
export type ProgramSource = "datenbank" | "websuche" | "hybrid";

/** Relevance for display. Replaces the former "% Match", which mixed in hard criteria. */
export type RelevanceLevel = "hoch" | "mittel" | "niedrig";

/** A funding program as it is rendered in the UI. */
export interface Foerderprogramm {
  id: string;
  name: string;
  beschreibung?: string;
  foerderhoehe?: string;
  zielgruppe?: string;
  /** Display text; the check uses `facts.foerdergebiet`. */
  region?: string;
  /** Deadline as the source words it; the check uses `facts.antragsstatus`. */
  frist?: string;
  /** Readable Förderbereiche, comma-separated. */
  foerderbereich?: string;
  /** Förderbereich slugs of the Förderdatenbank, for the topic assessment. */
  kategorien?: string[];
  /** Display text; the check uses `facts.instrumente`. */
  foerderart?: string;
  link?: string;
  quelle?: string;
  /** Sources backing THIS specific program (per-program, never a shared global list). */
  sourceUrls?: string[];
  /** Why the status was set, e.g. "laut offizieller Quelle ausgelaufen". */
  statusNote?: string;
  /** Hard criteria as fixed values. Missing on favorites saved before v3. */
  facts?: ProgramFacts;
  /** Id of the catalogue record this program was matched to, if any. */
  catalogId?: string;
}

/** A program that passed the hard criteria, plus what the server derived for this query. */
export interface ScoredProgram {
  program: Foerderprogramm;
  /** Relevance 0–100, for ordering only — never shown as a percentage. */
  score: number;
  relevance: RelevanceLevel;
  /** GUELTIG = all hard criteria confirmed; UNGEPRUEFT = at least one unknown. */
  verdict: "GUELTIG" | "UNGEPRUEFT";
  /** Short positive hints for the card, e.g. "Bundesweit verfügbar". */
  hints: string[];
  /** Hard criteria the sources do not answer, e.g. ["Antragsstatus"]. */
  unchecked: string[];
  /** Warning about deadline or link quality. */
  linkWarning?: string;
  /** Whether `program.link` is only a generic overview page — single source of truth for the CTA label. */
  linkIsGeneric?: boolean;
  source: ProgramSource;
  /** ISO date the data was last checked. */
  checkedAt: string;
  /** true = live erreichbar, false = fehlt/bestätigt tot, undefined = temporär nicht prüfbar. */
  linkVerified?: boolean;
  sourceUrls?: string[];
}

/** A program the user bookmarked, as persisted in localStorage (format v3). */
export interface StoredFavorite extends ScoredProgram {
  /** ISO timestamp of when it was bookmarked. */
  savedAt: string;
}
