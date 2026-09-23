import type { PoolClient } from "pg";
import { CATALOG_SCHEMA_VERSION } from "@/config/catalog";
import { searchSourceOf } from "@/lib/catalog/to-program";
import { relevanceKeywords } from "@/lib/search/scoring";
import { normalizeText } from "@/lib/utils/text";
import type {
  CatalogChange,
  CatalogProgram,
  ChangeKind,
  FieldChange,
  IngestReport,
  TopicMatch,
} from "@/types/catalog";
import { withClient } from "./db";

/**
 * All catalogue reads and writes in one place.
 *
 * The diffing strategy is the reason for the shape here: a run compares 2,500+
 * fingerprints but only ever needs the full stored record for the handful that
 * actually changed, so those are two separate queries rather than one big one.
 */

/** The cheap per-run snapshot: what we know without loading any payload. */
export interface StoredFingerprint {
  contentHash: string;
  removed: boolean;
  /** When the program was last present in its source. */
  lastSeenAt: Date;
}

export async function loadFingerprints(): Promise<Map<string, StoredFingerprint>> {
  return withClient(async (client) => {
    const result = await client.query<{
      id: string;
      content_hash: string;
      removed_at: Date | null;
      last_seen_at: Date;
    }>("SELECT id, content_hash, removed_at, last_seen_at FROM catalog_programs");

    const map = new Map<string, StoredFingerprint>();
    for (const row of result.rows) {
      map.set(row.id, {
        contentHash: row.content_hash,
        removed: row.removed_at !== null,
        lastSeenAt: row.last_seen_at,
      });
    }
    return map;
  });
}

/** The stored records for a specific set of ids. */
export async function loadPrograms(ids: string[]): Promise<Map<string, CatalogProgram>> {
  if (ids.length === 0) return new Map();

  return withClient(async (client) => {
    const result = await client.query<{ id: string; payload: CatalogProgram }>(
      "SELECT id, payload FROM catalog_programs WHERE id = ANY($1::text[])",
      [ids]
    );
    return new Map(result.rows.map((row) => [row.id, row.payload]));
  });
}

/** Every program currently in the catalogue, for search and for the UI. */
export async function loadActivePrograms(): Promise<CatalogProgram[]> {
  return withClient(async (client) => {
    const result = await client.query<{ payload: CatalogProgram }>(
      "SELECT payload FROM catalog_programs WHERE removed_at IS NULL"
    );
    return result.rows.map((row) => row.payload);
  });
}

/** How many rows are written per statement — keeps parameter arrays sane. */
const UPSERT_BATCH_SIZE = 500;

/**
 * Insert or refresh programs.
 *
 * `last_seen_at` is bumped on every run so a program that vanishes from the
 * export can be recognised by its stale timestamp; `first_seen_at` is never
 * overwritten, because that is what "new" means.
 */
export async function upsertPrograms(
  client: PoolClient,
  programs: CatalogProgram[]
): Promise<void> {
  for (let start = 0; start < programs.length; start += UPSERT_BATCH_SIZE) {
    const batch = programs.slice(start, start + UPSERT_BATCH_SIZE);

    await client.query(
      `INSERT INTO catalog_programs
         (id, source, content_hash, payload, search_source, last_seen_at)
       SELECT t.id, t.source, t.content_hash, t.payload, t.search_source, NOW()
         FROM UNNEST($1::text[], $2::text[], $3::text[], $4::jsonb[], $5::text[])
           AS t(id, source, content_hash, payload, search_source)
       ON CONFLICT (id) DO UPDATE SET
         source        = EXCLUDED.source,
         content_hash  = EXCLUDED.content_hash,
         payload       = EXCLUDED.payload,
         search_source = EXCLUDED.search_source,
         last_seen_at  = NOW(),
         removed_at    = NULL`,
      [
        batch.map((program) => program.id),
        batch.map((program) => program.source),
        batch.map((program) => program.contentHash),
        batch.map((program) => JSON.stringify(program)),
        batch.map(searchSourceOf),
      ]
    );
  }
}

/** Flag programs that disappeared from their source. */
export async function markRemoved(client: PoolClient, ids: string[]): Promise<void> {
  if (ids.length === 0) return;

  await client.query(
    `UPDATE catalog_programs
        SET removed_at = NOW()
      WHERE id = ANY($1::text[]) AND removed_at IS NULL`,
    [ids]
  );
}

export interface PendingChange {
  programId: string;
  kind: ChangeKind;
  program: CatalogProgram;
  fields: FieldChange[];
  matches: TopicMatch[];
  topScore: number;
}

/** Record detected changes so the weekly digest can pick them up later. */
export async function insertChanges(
  client: PoolClient,
  changes: PendingChange[]
): Promise<void> {
  for (let start = 0; start < changes.length; start += UPSERT_BATCH_SIZE) {
    const batch = changes.slice(start, start + UPSERT_BATCH_SIZE);

    await client.query(
      `INSERT INTO catalog_changes (program_id, kind, payload, fields, matches, top_score)
       SELECT * FROM UNNEST(
         $1::text[], $2::text[], $3::jsonb[], $4::jsonb[], $5::jsonb[], $6::int[]
       )`,
      [
        batch.map((change) => change.programId),
        batch.map((change) => change.kind),
        batch.map((change) => JSON.stringify(change.program)),
        batch.map((change) => JSON.stringify(change.fields)),
        batch.map((change) => JSON.stringify(change.matches)),
        batch.map((change) => change.topScore),
      ]
    );
  }
}

function toChange(row: {
  id: string;
  program_id: string;
  kind: string;
  detected_at: Date;
  payload: CatalogProgram;
  fields: FieldChange[];
  matches: TopicMatch[];
  top_score: number;
}): CatalogChange {
  return {
    id: Number(row.id),
    programId: row.program_id,
    kind: row.kind as ChangeKind,
    detectedAt: row.detected_at.toISOString(),
    program: row.payload,
    fields: row.fields ?? [],
    matches: row.matches ?? [],
    topScore: row.top_score,
  };
}

/** The part of the priority settings the digest has to respect. */
export interface PriorityCriteria {
  threshold: number;
  windowHours: number;
}

/**
 * Relevant changes that have not been mailed yet, strongest match first.
 *
 * With the priority alert enabled (`priority` given), a NEW program belongs to
 * exactly one channel at a time, so the two mails can never both send it:
 *
 * - claimed or sent by the priority alert → not the digest's business;
 * - still waiting for the priority alert (above its threshold, inside its
 *   window, untouched) → skipped for now;
 * - below the threshold, older than the window, deferred or expired → digest.
 *
 * Updated and removed programs always stay with the digest. A program already
 * announced as new by the priority alert is never listed as new again.
 */
export async function pendingChanges(
  minScore: number,
  limit: number,
  priority?: PriorityCriteria
): Promise<CatalogChange[]> {
  return withClient(async (client) => {
    const result = await client.query(
      `SELECT id, program_id, kind, detected_at, payload, fields, matches, top_score
         FROM catalog_changes c
        WHERE c.notified_at IS NULL
          AND c.top_score >= $1
          AND (c.kind <> 'new' OR (
                COALESCE(c.priority_status, '') <> 'sent'
            AND NOT EXISTS (
                  SELECT 1 FROM catalog_changes announced
                   WHERE announced.program_id = c.program_id
                     AND announced.kind = 'new'
                     AND announced.priority_status = 'sent')
            AND ($3::int IS NULL OR (
                  COALESCE(c.priority_status, '') <> 'claimed'
              AND (c.priority_status IS NOT NULL
                   OR c.top_score < $3::int
                   OR c.detected_at < NOW() - ($4::int * INTERVAL '1 hour')))))
          )
        ORDER BY c.top_score DESC, c.detected_at DESC
        LIMIT $2`,
      [minScore, limit, priority?.threshold ?? null, priority?.windowHours ?? null]
    );
    return result.rows.map(toChange);
  });
}

/** The most recent relevant changes, whether or not they were mailed. */
export async function recentChanges(
  minScore: number,
  limit: number,
  kind?: ChangeKind
): Promise<CatalogChange[]> {
  return withClient(async (client) => {
    const result = await client.query(
      `SELECT id, program_id, kind, detected_at, payload, fields, matches, top_score
         FROM catalog_changes
        WHERE top_score >= $1
          AND ($3::text IS NULL OR kind = $3::text)
        ORDER BY detected_at DESC, top_score DESC
        LIMIT $2`,
      [minScore, limit, kind ?? null]
    );
    return result.rows.map(toChange);
  });
}

/**
 * Mark changes as mailed.
 *
 * Called only after the provider accepted the message — a crash between
 * sending and marking repeats one digest, which is recoverable; marking first
 * would lose the alert silently, which is not.
 */
export async function markNotified(ids: number[]): Promise<void> {
  if (ids.length === 0) return;

  await withClient(async (client) => {
    await client.query(
      "UPDATE catalog_changes SET notified_at = NOW() WHERE id = ANY($1::bigint[])",
      [ids]
    );
  });
}

/** Open a run record; returns its id so the outcome can be attached. */
export async function startRun(startedAt: Date): Promise<number> {
  return withClient(async (client) => {
    const result = await client.query<{ id: string }>(
      "INSERT INTO catalog_runs (started_at, status) VALUES ($1, 'running') RETURNING id",
      [startedAt]
    );
    return Number(result.rows[0].id);
  });
}

export async function finishRun(
  runId: number,
  status: "ok" | "failed",
  report: IngestReport | { error: string }
): Promise<void> {
  await withClient(async (client) => {
    await client.query(
      "UPDATE catalog_runs SET finished_at = NOW(), status = $2, report = $3 WHERE id = $1",
      [runId, status, JSON.stringify(report)]
    );
  });
}

/**
 * The record format the last completed run wrote. Runs from before the
 * versioning have none — which is exactly what makes them trigger a migration.
 */
export async function lastCompletedSchemaVersion(): Promise<number | undefined> {
  return withClient(async (client) => {
    const result = await client.query<{ version: string | null }>(
      `SELECT report ->> 'schemaVersion' AS version
         FROM catalog_runs
        WHERE status = 'ok'
        ORDER BY finished_at DESC NULLS LAST, id DESC
        LIMIT 1`
    );
    const version = result.rows[0]?.version;
    return version ? Number(version) : undefined;
  });
}

/** True when the stored catalogue was written in an older record format. */
export async function needsMigration(): Promise<boolean> {
  return (await lastCompletedSchemaVersion()) !== CATALOG_SCHEMA_VERSION;
}

/** Whether an ingest has ever completed — the first run must not alert. */
export async function hasCompletedRun(): Promise<boolean> {
  return withClient(async (client) => {
    const result = await client.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM catalog_runs WHERE status = 'ok'"
    );
    return Number(result.rows[0]?.count ?? "0") > 0;
  });
}

// ── Locks ─────────────────────────────────────────────────────────────

/**
 * Take a named lock for `minutes`; false when someone else holds it.
 *
 * A row with an expiry instead of a Postgres advisory lock: a session lock
 * does not survive a transaction-mode pooler (Neon, Vercel Postgres), and a
 * crashed holder releases this one simply by letting it run out.
 */
export async function acquireLock(
  name: string,
  holder: string,
  minutes: number
): Promise<boolean> {
  return withClient(async (client) => {
    const result = await client.query(
      `INSERT INTO catalog_locks (name, holder, locked_until)
       VALUES ($1, $2, NOW() + ($3::int * INTERVAL '1 minute'))
       ON CONFLICT (name) DO UPDATE
         SET holder = EXCLUDED.holder, locked_until = EXCLUDED.locked_until
       WHERE catalog_locks.locked_until <= NOW()
       RETURNING holder`,
      [name, holder, minutes]
    );
    return result.rows.length > 0;
  });
}

export async function releaseLock(name: string, holder: string): Promise<void> {
  await withClient(async (client) => {
    await client.query("DELETE FROM catalog_locks WHERE name = $1 AND holder = $2", [
      name,
      holder,
    ]);
  });
}

// ── Priority alert ────────────────────────────────────────────────────
//
// Exactly-once, as far as a mail provider allows, rests on three things:
//
// 1. One open delivery per kind, enforced by a partial unique index — a second
//    parallel run cannot even create one.
// 2. Changes are claimed by a single conditional UPDATE, so no row can end up
//    in two deliveries, and a delivery's content is frozen once claimed.
// 3. A delivery is marked sent only after the provider accepted it, and only by
//    the run that still holds its lease. A crashed run's delivery is retried
//    with the same content and the same provider idempotency key.

const PRIORITY_KIND = "priority";

const CHANGE_COLUMNS =
  "c.id, c.program_id, c.kind, c.detected_at, c.payload, c.fields, c.matches, c.top_score";

/**
 * New, relevant, untouched changes — one row per program, best row first.
 * Parameters: $1 threshold, $2 window in hours.
 */
const PRIORITY_CANDIDATES = `
  SELECT DISTINCT ON (c.program_id) c.id, c.top_score, c.detected_at
    FROM catalog_changes c
   WHERE c.kind = 'new'
     AND c.priority_status IS NULL
     AND c.notified_at IS NULL
     AND c.top_score >= $1::int
     AND c.detected_at >= NOW() - ($2::int * INTERVAL '1 hour')
     AND NOT EXISTS (
           SELECT 1 FROM catalog_changes announced
            WHERE announced.program_id = c.program_id
              AND announced.kind = 'new'
              AND (announced.priority_status IN ('claimed', 'sent')
                   OR announced.notified_at IS NOT NULL))
   ORDER BY c.program_id, c.top_score DESC, c.detected_at DESC, c.id DESC`;

const RANKED_CANDIDATES = `
  WITH candidates AS (${PRIORITY_CANDIDATES}),
  ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY top_score DESC, detected_at DESC, id DESC)
             AS position
      FROM candidates
  )`;

export interface PriorityDelivery {
  id: number;
  createdAt: Date;
  attempts: number;
  /** Older than the priority window: its entries belong to the digest now. */
  expired: boolean;
}

export interface OpenPriorityDelivery {
  id: number;
  status: "sending" | "failed";
  leaseUntil: Date | null;
  lastError: string | null;
}

function toDelivery(row: {
  id: string | number;
  created_at: Date;
  attempts: number;
  expired: boolean;
}): PriorityDelivery {
  return {
    id: Number(row.id),
    createdAt: row.created_at,
    attempts: Number(row.attempts),
    expired: Boolean(row.expired),
  };
}

/** The unfinished delivery, if any — for status messages only. */
export async function openPriorityDelivery(): Promise<OpenPriorityDelivery | undefined> {
  return withClient(async (client) => {
    const result = await client.query(
      `SELECT id, status, lease_until, last_error
         FROM alert_deliveries
        WHERE kind = $1 AND status IN ('sending', 'failed')
        LIMIT 1`,
      [PRIORITY_KIND]
    );
    const row = result.rows[0];
    return row
      ? {
          id: Number(row.id),
          status: row.status,
          leaseUntil: row.lease_until,
          lastError: row.last_error,
        }
      : undefined;
  });
}

/** Open a new delivery; undefined when another one is still unfinished. */
export async function createPriorityDelivery(
  leaseToken: string,
  leaseMinutes: number
): Promise<PriorityDelivery | undefined> {
  return withClient(async (client) => {
    const result = await client.query(
      `INSERT INTO alert_deliveries (kind, status, lease_token, lease_until)
       VALUES ($1, 'sending', $2, NOW() + ($3::int * INTERVAL '1 minute'))
       ON CONFLICT (kind) WHERE status IN ('sending', 'failed') DO NOTHING
       RETURNING id, created_at, attempts, false AS expired`,
      [PRIORITY_KIND, leaseToken, leaseMinutes]
    );
    return result.rows[0] ? toDelivery(result.rows[0]) : undefined;
  });
}

/**
 * Take over an unfinished delivery whose lease has run out — a crashed run, or
 * a failed send whose retry pause is over. Undefined while it is still held.
 */
export async function takeOverPriorityDelivery(
  leaseToken: string,
  leaseMinutes: number,
  windowHours: number
): Promise<PriorityDelivery | undefined> {
  return withClient(async (client) => {
    const result = await client.query(
      `UPDATE alert_deliveries
          SET status = 'sending',
              lease_token = $2,
              lease_until = NOW() + ($3::int * INTERVAL '1 minute'),
              attempts = attempts + 1,
              updated_at = NOW()
        WHERE kind = $1
          AND status IN ('sending', 'failed')
          AND (lease_until IS NULL OR lease_until <= NOW())
       RETURNING id, created_at, attempts,
                 created_at < NOW() - ($4::int * INTERVAL '1 hour') AS expired`,
      [PRIORITY_KIND, leaseToken, leaseMinutes, windowHours]
    );
    return result.rows[0] ? toDelivery(result.rows[0]) : undefined;
  });
}

/**
 * Freeze the content of a delivery: the best `maxEntries` candidates are
 * claimed, the rest above the threshold are deferred to the weekly digest.
 * One statement, so a concurrent claimer can never take the same row.
 */
export async function claimPriorityChanges(
  deliveryId: number,
  criteria: PriorityCriteria,
  maxEntries: number
): Promise<{ claimed: number; deferred: number }> {
  return withClient(async (client) => {
    const result = await client.query<{ priority_status: string }>(
      `${RANKED_CANDIDATES}
       UPDATE catalog_changes AS target
          SET priority_status = CASE WHEN ranked.position <= $3::int
                                     THEN 'claimed' ELSE 'deferred' END,
              priority_delivery_id = $4::bigint
         FROM ranked
        WHERE target.id = ranked.id
          AND target.priority_status IS NULL
       RETURNING target.priority_status`,
      [criteria.threshold, criteria.windowHours, maxEntries, deliveryId]
    );
    const claimed = result.rows.filter((row) => row.priority_status === "claimed").length;
    return { claimed, deferred: result.rows.length - claimed };
  });
}

/** What the next priority mail would contain — reads only, claims nothing. */
export async function previewPriorityChanges(
  criteria: PriorityCriteria,
  maxEntries: number
): Promise<{ changes: CatalogChange[]; deferred: number }> {
  return withClient(async (client) => {
    const result = await client.query(
      `${RANKED_CANDIDATES}
       SELECT ${CHANGE_COLUMNS}, (SELECT COUNT(*) FROM ranked)::int AS total
         FROM ranked
         JOIN catalog_changes c ON c.id = ranked.id
        WHERE ranked.position <= $3::int
        ORDER BY ranked.position`,
      [criteria.threshold, criteria.windowHours, maxEntries]
    );
    const total = Number(result.rows[0]?.total ?? 0);
    return {
      changes: result.rows.map(toChange),
      deferred: Math.max(0, total - result.rows.length),
    };
  });
}

/** The frozen content of a delivery, strongest match first. */
export async function priorityDeliveryChanges(
  deliveryId: number
): Promise<{ changes: CatalogChange[]; deferred: number }> {
  return withClient(async (client) => {
    const entries = await client.query(
      `SELECT ${CHANGE_COLUMNS}
         FROM catalog_changes c
        WHERE c.priority_delivery_id = $1
          AND c.priority_status = 'claimed'
          AND c.notified_at IS NULL
        ORDER BY c.top_score DESC, c.detected_at DESC, c.id DESC`,
      [deliveryId]
    );
    const deferred = await client.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM catalog_changes
        WHERE priority_delivery_id = $1 AND priority_status = 'deferred'`,
      [deliveryId]
    );
    return {
      changes: entries.rows.map(toChange),
      deferred: Number(deferred.rows[0]?.count ?? "0"),
    };
  });
}

/**
 * Mark a delivery and its mailed changes as sent — in one statement, and only
 * if this run still holds the lease. False means another run took over.
 */
export async function completePriorityDelivery(
  deliveryId: number,
  leaseToken: string,
  messageId: string,
  changeIds: number[]
): Promise<boolean> {
  return withClient(async (client) => {
    const result = await client.query<{ delivered: number }>(
      `WITH delivery AS (
         UPDATE alert_deliveries
            SET status = 'sent', sent_at = NOW(), updated_at = NOW(),
                message_id = $3, entries = $4::int,
                lease_token = NULL, lease_until = NULL, last_error = NULL
          WHERE id = $1 AND lease_token = $2 AND status = 'sending'
         RETURNING id
       ),
       announced AS (
         UPDATE catalog_changes
            SET priority_status = 'sent', priority_notified_at = NOW()
          WHERE priority_delivery_id IN (SELECT id FROM delivery)
            AND priority_status = 'claimed'
            AND id = ANY($5::bigint[])
         RETURNING id
       ),
       released AS (
         UPDATE catalog_changes
            SET priority_status = 'expired'
          WHERE priority_delivery_id IN (SELECT id FROM delivery)
            AND priority_status = 'claimed'
            AND NOT (id = ANY($5::bigint[]))
         RETURNING id
       )
       SELECT (SELECT COUNT(*) FROM delivery)::int AS delivered`,
      [deliveryId, leaseToken, messageId, changeIds.length, changeIds]
    );
    return Number(result.rows[0]?.delivered ?? 0) > 0;
  });
}

/** Record a failed send; the claimed changes stay claimed for the retry. */
export async function failPriorityDelivery(
  deliveryId: number,
  leaseToken: string,
  error: string,
  retryMinutes: number
): Promise<void> {
  await withClient(async (client) => {
    await client.query(
      `UPDATE alert_deliveries
          SET status = 'failed', last_error = LEFT($3, 1000), updated_at = NOW(),
              lease_token = NULL,
              lease_until = NOW() + ($4::int * INTERVAL '1 minute')
        WHERE id = $1 AND lease_token = $2`,
      [deliveryId, leaseToken, error, retryMinutes]
    );
  });
}

/**
 * Give up on a delivery that is too old to be a "Sofortalarm" any more. Its
 * changes are released to the weekly digest in the same statement, so they
 * cannot get stuck between the two channels.
 */
export async function abandonPriorityDelivery(
  deliveryId: number,
  leaseToken: string
): Promise<void> {
  await withClient(async (client) => {
    await client.query(
      `WITH delivery AS (
         UPDATE alert_deliveries
            SET status = 'abandoned', updated_at = NOW(),
                lease_token = NULL, lease_until = NULL
          WHERE id = $1 AND lease_token = $2
         RETURNING id
       )
       UPDATE catalog_changes
          SET priority_status = 'expired'
        WHERE priority_delivery_id IN (SELECT id FROM delivery)
          AND priority_status = 'claimed'`,
      [deliveryId, leaseToken]
    );
  });
}

/** Remove a delivery that claimed nothing. */
export async function discardPriorityDelivery(
  deliveryId: number,
  leaseToken: string
): Promise<void> {
  await withClient(async (client) => {
    await client.query(
      "DELETE FROM alert_deliveries WHERE id = $1 AND lease_token = $2",
      [deliveryId, leaseToken]
    );
  });
}

export interface CatalogSearchQuery {
  /** The user's free text; may be empty when only filters are set. */
  text?: string;
  /** Extra search terms, e.g. the distinctive terms of the chosen Förderbereich. */
  extraTerms?: string[];
  /** Förderbereich slugs that rank a record higher — never a hard restriction. */
  boostCategories?: string[];
  /** German region labels to admit; nationwide, EU-wide and unknown always qualify. */
  regions?: string[];
  limit: number;
}

/** Regions that satisfy any region filter. */
const UNIVERSAL_REGIONS = ["Bundesweit", "EU-weit"];

/** Förderberechtigte that a company search accepts (mirrors `checkEligibility`). */
const COMPANY_PARTIES = ["Unternehmen", "Existenzgründung"];

/**
 * A German full-text query that works on real sentences.
 *
 * The old `websearch_to_tsquery(message)` required EVERY word of the message,
 * so "Digitalisierungsförderung für ein kleines IT-Unternehmen in NRW" matched
 * nothing. Now: the topic words of the query (hard-criteria words removed,
 * compounds reduced to their topic head) OR-ed, with prefix matching so a
 * stem also finds its compounds.
 */
export function catalogTsQuery(
  text: string | undefined,
  extraTerms: string[] = []
): string {
  const terms = new Set<string>(relevanceKeywords(text));
  for (const term of extraTerms) {
    for (const word of normalizeText(term).split(" ")) {
      if (word.length >= 5) terms.add(word);
    }
  }
  return Array.from(terms)
    .filter((word) => /^[a-z0-9]+$/.test(word))
    .map((word) => (word.length >= 5 ? `${word}:*` : word))
    .join(" | ");
}

/**
 * Candidate programs from the catalogue.
 *
 * Deliberately a WIDE net ranked by German full-text relevance; admission is
 * decided afterwards by `checkHardCriteria`, exactly as for web hits. The SQL
 * only skips what that check would certainly exclude — records with a
 * closed-banner, other Länder, or no company among the eligible parties — so
 * those do not take candidate slots.
 */
export async function searchCatalog(
  query: CatalogSearchQuery
): Promise<CatalogProgram[]> {
  const tsquery = catalogTsQuery(query.text, query.extraTerms);
  const boost = query.boostCategories?.length ? query.boostCategories : null;
  const regions = query.regions?.length ? [...query.regions, ...UNIVERSAL_REGIONS] : null;

  // Nothing to go on: an unfiltered dump of the catalogue would be noise.
  if (!tsquery && !regions) return [];

  return withClient(async (client) => {
    const result = await client.query<{ payload: CatalogProgram }>(
      `SELECT payload
         FROM catalog_programs
        WHERE removed_at IS NULL
          AND ($1 = '' OR search_text @@ to_tsquery('german', $1))
          AND COALESCE(payload ->> 'headerStatus', '') <> 'GESCHLOSSEN'
          AND ($3::text[] IS NULL
               OR jsonb_array_length(COALESCE(payload -> 'regions', '[]'::jsonb)) = 0
               OR EXISTS (
                 SELECT 1 FROM jsonb_array_elements_text(payload -> 'regions') AS r
                  WHERE r = ANY($3::text[]) OR r = 'Sonstige'))
          AND (jsonb_array_length(COALESCE(payload -> 'eligibleParties', '[]'::jsonb)) = 0
               OR EXISTS (
                 SELECT 1 FROM jsonb_array_elements_text(payload -> 'eligibleParties') AS p
                  WHERE p = ANY($5::text[])))
        ORDER BY
          (CASE WHEN $1 = '' THEN 0
                ELSE ts_rank(search_text, to_tsquery('german', $1))
           END)
          + (CASE WHEN $2::text[] IS NOT NULL AND EXISTS (
                SELECT 1 FROM jsonb_array_elements_text(payload -> 'categories') AS c
                 WHERE c = ANY($2::text[])) THEN 0.5 ELSE 0 END) DESC,
          -- Without a text query this is a browse, not a search: show what
          -- entered the catalogue most recently.
          first_seen_at DESC,
          id
        LIMIT $4`,
      [tsquery, boost, regions, query.limit, COMPANY_PARTIES]
    );
    return result.rows.map((row) => row.payload);
  });
}

/** Catalogue records a set of web hits may refer to, by exact name or official URL. */
export async function findCatalogCandidates(
  names: string[],
  urls: string[]
): Promise<CatalogProgram[]> {
  if (names.length === 0 && urls.length === 0) return [];
  return withClient(async (client) => {
    const result = await client.query<{ payload: CatalogProgram }>(
      `SELECT payload
         FROM catalog_programs
        WHERE removed_at IS NULL
          AND (lower(payload ->> 'name') = ANY($1::text[])
               OR rtrim(regexp_replace(lower(payload ->> 'officialUrl'), '^https?://(www[.])?', ''), '/')
                  = ANY($2::text[]))
        LIMIT 50`,
      [
        names.map((name) => name.toLowerCase().trim()),
        urls.map((url) =>
          url
            .toLowerCase()
            .replace(/^https?:\/\/(www\.)?/, "")
            .replace(/\/+$/, "")
        ),
      ]
    );
    return result.rows.map((row) => row.payload);
  });
}
