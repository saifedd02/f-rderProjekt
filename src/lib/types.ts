// ── Dates ────────────────────────────────────────────────────────────
/** Today's date injected into every server-side pipeline run. */
export const TODAY = "2026-03-25";

// ── Company profile ──────────────────────────────────────────────────
export interface CompanyProfile {
  name?: string;
  branche: string;
  region: string;
  groesse: string;
  mitarbeiter?: string;
  umsatz?: string;
  vorhaben: string;
}

// ── Förderprogramm ───────────────────────────────────────────────────
export type DeadlineStatus = "active" | "expiring_soon" | "expired" | "unknown";
export type ProgramSource = "datenbank" | "websuche" | "hybrid";

export interface Foerderprogramm {
  id: string;
  name: string;
  beschreibung?: string;
  foerderhoehe?: string;
  zielgruppe?: string;
  region?: string;
  frist?: string;
  foerderbereich?: string;
  foerderart?: string;
  unternehmensgroesse?: string[];
  unternehmensbranche?: string[];
  link?: string;
  /** "aktiv" | "inaktiv" — derived from deadline + evidence, not LLM opinion */
  isActive?: boolean;
  quelle?: string;
}

// ── Scoring & match output ───────────────────────────────────────────
export interface MatchReason {
  label: string;
  matched: boolean;
}

export interface ScoredProgram {
  program: Foerderprogramm;
  /** Deterministic score 0-100, computed server-side */
  score: number;
  reasons: MatchReason[];
  /** Warning about link quality */
  linkWarning?: string;
  /** Where the data came from */
  source: ProgramSource;
  /** When the data was last checked (ISO date) */
  checkedAt: string;
  /** Deadline status based on parsed frist vs TODAY */
  deadlineStatus: DeadlineStatus;
  /** Confidence in the data (high = local DB, medium = web-verified, low = web-only) */
  confidence: "high" | "medium" | "low";
  /** Source URLs from grounding */
  sourceUrls?: string[];
}

// ── Search filters ───────────────────────────────────────────────────
export interface SearchFilters {
  region: string;
  foerderbereich: string;
  unternehmensbranche: string;
  foerderart: string;
  unternehmensgroesse: string;
}

export const defaultFilters: SearchFilters = {
  region: "Alle Regionen",
  foerderbereich: "Alle Kategorien",
  unternehmensbranche: "Alle auswählen",
  foerderart: "Alle auswählen",
  unternehmensgroesse: "Alle auswählen",
};

// ── Chat ─────────────────────────────────────────────────────────────
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  programs?: ScoredProgram[];
  filterSummary?: string;
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  programContext?: ScoredProgram;
}

// ── Favorites ────────────────────────────────────────────────────────
export interface StoredFavorite {
  program: Foerderprogramm;
  score: number;
  reasons: MatchReason[];
  savedAt: string;
  linkWarning?: string;
  source: ProgramSource;
  checkedAt: string;
  deadlineStatus: DeadlineStatus;
  confidence: "high" | "medium" | "low";
  sourceUrls?: string[];
}
