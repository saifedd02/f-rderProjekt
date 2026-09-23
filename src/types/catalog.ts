/**
 * The local funding catalogue.
 *
 * Unlike `Foerderprogramm` (a runtime result of a chat search), a
 * `CatalogProgram` is a record in our own index: sourced from an official
 * bulk export, stable across runs, and diffable — which is what makes
 * "this program is new" a fact rather than a model's claim.
 */

import type { Branchenausschluss, Instrument } from "./facts";

/** Where a catalogue record came from. */
export type CatalogSource = "foerderdatenbank" | "eu-portal";

/** Administrative level of the funding body. */
export type CatalogLevel = "bund" | "land" | "eu" | "kommune" | "unbekannt";

/** A named section of a program's description, keyed by its heading. */
export interface CatalogSection {
  heading: string;
  text: string;
}

export interface CatalogProgram {
  /** Stable across exports: `fdb:<path>/<name>` or `eu:<topic identifier>`. */
  id: string;
  source: CatalogSource;
  name: string;
  /** Short teaser, if the source provides one. */
  summary?: string;
  /** Full description as plain text. */
  description?: string;
  /** Description split by its own headings — used to build readable digests. */
  sections: CatalogSection[];
  level: CatalogLevel;
  /** Funding body, e.g. "KfW – Kreditanstalt für Wiederaufbau". */
  fundingBody?: string;
  /** German labels, e.g. ["Bayern"] or ["Bundesweit"]. */
  regions: string[];
  /** Förderbereich slugs of the source taxonomy, e.g. "digitalisierung". */
  categories: string[];
  /** Förderart labels, e.g. ["Zuschuss"]. */
  fundingTypes: string[];
  /** Förderberechtigte labels, e.g. ["Unternehmen"]. */
  eligibleParties: string[];
  /** Unternehmensgröße labels. */
  companySizes: string[];
  /** Branchen labels. */
  industries: string[];
  /** Free-text deadline as stated by the source, if any. */
  deadline?: string;
  /**
   * Förderdatenbank banner (`gsb:header`) as published, "" when empty. Absent
   * on records written before it was read — those have an UNBEKANNT status.
   */
  statusHeader?: string;
  /** The banner, classified at ingest. `KEIN_VERMERK` = the portal flags nothing. */
  headerStatus?: "KEIN_VERMERK" | "GESCHLOSSEN" | "UNBEKANNT";
  /** EU portal status of the call. */
  euStatus?: "FORTHCOMING" | "OPEN";
  /** EU: when submissions open, ISO date. */
  openingDate?: string;
  /** EU: submission deadline, ISO date. */
  deadlineDate?: string;
  /** Instruments as fixed codes (Garantie stays apart from Bürgschaft). */
  instruments?: Instrument[];
  /** Industries the program text explicitly excludes. */
  industryExclusions?: Branchenausschluss[];
  /** Verified link to the funding body's own program page. */
  officialUrl?: string;
  /** Canonical page in the source portal. */
  detailUrl?: string;
  /** Date the source last stamped the record (not always present). */
  sourceUpdatedAt?: string;
  /** Hash over the fields that matter — the change detector. */
  contentHash: string;
}

/** What happened to a program between two ingest runs. */
export type ChangeKind = "new" | "updated" | "removed";

/** One field that differs between the previous and the current record. */
export interface FieldChange {
  field: string;
  before?: string;
  after?: string;
}

/** A scored match of one program against one mpool topic. */
export interface TopicMatch {
  topicId: string;
  topicLabel: string;
  /** 0–100, deterministic. */
  score: number;
  /** Human-readable justification, shown in the digest. */
  reasons: string[];
}

/** A detected change, enriched with why it matters to us. */
export interface CatalogChange {
  id: number;
  programId: string;
  kind: ChangeKind;
  detectedAt: string;
  program: CatalogProgram;
  fields: FieldChange[];
  matches: TopicMatch[];
  /** Highest topic score — the ranking key for the digest. */
  topScore: number;
  notifiedAt?: string;
}

/** Outcome of one ingest run, for the ops log. */
export interface IngestReport {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  /** First run: the catalogue was only built up, nothing was recorded or alerted. */
  seeded: boolean;
  /** The record format this run wrote — a change triggers a silent migration run. */
  schemaVersion?: number;
  /** Seeded because the record format changed, not because it was the first run. */
  migration?: boolean;
  sources: Record<CatalogSource, { fetched: number; failed: boolean }>;
  totals: { seen: number; new: number; updated: number; removed: number };
  /** Changes that matched at least one topic above its threshold. */
  relevant: number;
}
