import { randomUUID } from "node:crypto";
import {
  CATALOG_SCHEMA_VERSION,
  INGEST_LOCK_MINUTES,
  REMOVAL_GRACE_HOURS,
} from "@/config/catalog";
import { matchTopics, topScore } from "@/lib/alerts/topic-match";
import { diffPrograms } from "@/lib/catalog/diff";
import { catalogFacts } from "@/lib/facts/catalog";
import { checkHardCriteria } from "@/lib/facts/check";
import { getTodayDate } from "@/lib/utils/date";
import { createLogger } from "@/lib/utils/logger";
import type {
  CatalogProgram,
  CatalogSource,
  IngestReport,
  TopicMatch,
} from "@/types/catalog";
import { ensureSchema, withClient } from "./db";
import { loadEuCalls } from "./eu-source";
import { loadFoerderdatenbank } from "./fdb-source";
import {
  acquireLock,
  finishRun,
  hasCompletedRun,
  insertChanges,
  loadFingerprints,
  loadPrograms,
  markRemoved,
  needsMigration,
  releaseLock,
  startRun,
  upsertPrograms,
  type PendingChange,
} from "./repository";

/**
 * The daily catalogue run: fetch, diff, score, store.
 *
 * "New" is defined here and nowhere else — as an id that was not in yesterday's
 * snapshot. That is what makes an alert trustworthy: no model is asked whether
 * a program is new, the two snapshots answer it.
 */

const log = createLogger("Catalog:Ingest");

/** Name of the lock that keeps two ingests from diffing the same snapshot. */
const INGEST_LOCK = "ingest";

/**
 * Another ingest is still running.
 *
 * Cron providers occasionally deliver the same schedule twice. Two runs that
 * both load yesterday's fingerprints before either commits would each record
 * the same programs as new — so the second one is refused instead.
 */
export class IngestInProgressError extends Error {
  constructor() {
    super("Ein anderer Katalog-Lauf ist noch aktiv — dieser Aufruf wurde übersprungen.");
    this.name = "IngestInProgressError";
  }
}

/**
 * May this program appear in an alert at all?
 *
 * The SAME check the search runs (`checkHardCriteria`), with no user criteria:
 * a program that takes no applications or is not open to companies is never
 * announced. Unknown values (EU calls state eligibility in prose) are not a
 * reason to stay silent — only a stated mismatch is.
 */
export function isAlertable(
  program: CatalogProgram,
  today: Date = getTodayDate()
): boolean {
  return checkHardCriteria(catalogFacts(program, today), {}).verdict !== "AUSGESCHLOSSEN";
}

/** Topics a change should be reported under; empty means "do not report". */
function relevantMatches(program: CatalogProgram): TopicMatch[] {
  if (!isAlertable(program)) return [];
  return matchTopics(program);
}

interface SourceResult {
  source: CatalogSource;
  programs: CatalogProgram[];
  failed: boolean;
}

/** Fetch one source, turning a failure into an empty, clearly-flagged result. */
async function loadSource(
  source: CatalogSource,
  load: () => Promise<CatalogProgram[]>
): Promise<SourceResult> {
  try {
    return { source, programs: await load(), failed: false };
  } catch (error) {
    log.error(`Quelle ${source} fehlgeschlagen:`, error);
    return { source, programs: [], failed: true };
  }
}

export interface IngestOptions {
  /** Pre-fetched export bytes, for local runs and tests. */
  archive?: Uint8Array;
  /**
   * Ingest without recording any changes. Set automatically on the very first
   * run — otherwise the first digest would announce all 2,500 programs as new —
   * and on the first run after `CATALOG_SCHEMA_VERSION` changed, when every
   * fingerprint differs for reasons no reader cares about.
   */
  seedOnly?: boolean;
  /** Replace the live sources — tests only. */
  loaders?: Partial<Record<CatalogSource, () => Promise<CatalogProgram[]>>>;
}

export async function runIngest(options: IngestOptions = {}): Promise<IngestReport> {
  await ensureSchema();

  const holder = randomUUID();
  if (!(await acquireLock(INGEST_LOCK, holder, INGEST_LOCK_MINUTES))) {
    throw new IngestInProgressError();
  }

  try {
    return await ingest(options);
  } finally {
    // A lock that cannot be released simply runs out after INGEST_LOCK_MINUTES.
    await releaseLock(INGEST_LOCK, holder).catch((error) =>
      log.error("Lock konnte nicht freigegeben werden:", error)
    );
  }
}

async function ingest(options: IngestOptions): Promise<IngestReport> {
  const startedAt = new Date();
  const runId = await startRun(startedAt);

  try {
    const [fdb, eu] = await Promise.all([
      loadSource(
        "foerderdatenbank",
        options.loaders?.foerderdatenbank ?? (() => loadFoerderdatenbank(options.archive))
      ),
      loadSource("eu-portal", options.loaders?.["eu-portal"] ?? loadEuCalls),
    ]);

    const fetched = [...fdb.programs, ...eu.programs];
    if (fetched.length === 0) {
      throw new Error("Keine Quelle lieferte Daten — Lauf abgebrochen.");
    }

    const stored = await loadFingerprints();
    const firstRun = !(await hasCompletedRun());
    const migration = !firstRun && (await needsMigration());
    const seedOnly = options.seedOnly ?? (firstRun || migration);
    if (firstRun) log.info("Erstlauf: Bestand wird aufgebaut, keine Meldungen erzeugt.");
    else if (migration && seedOnly) {
      log.info(
        `Migrationslauf auf Datenformat ${CATALOG_SCHEMA_VERSION}: Bestand wird neu geschrieben, keine Meldungen erzeugt.`
      );
    }

    // Classify against yesterday's snapshot.
    const created: CatalogProgram[] = [];
    const changed: CatalogProgram[] = [];

    for (const program of fetched) {
      const previous = stored.get(program.id);
      if (!previous || previous.removed) created.push(program);
      else if (previous.contentHash !== program.contentHash) changed.push(program);
    }

    // Two guards before anything is declared gone.
    //
    // (1) The source has to have answered at all — if the EU portal is down,
    //     its programs must not be reported as discontinued.
    // (2) The program has to have been missing for longer than the grace
    //     period. Sources are not perfectly stable between two calls, and a
    //     single hiccup must never reach anyone as "ENTFALLEN".
    const fetchedIds = new Set(fetched.map((program) => program.id));
    const failedSources = new Set(
      [fdb, eu].filter((result) => result.failed).map((result) => result.source)
    );
    const graceCutoff = new Date(startedAt.getTime() - REMOVAL_GRACE_HOURS * 3_600_000);

    const removedIds = Array.from(stored.entries())
      .filter(([id, entry]) => {
        if (entry.removed || fetchedIds.has(id)) return false;
        if (entry.lastSeenAt > graceCutoff) return false;

        const source: CatalogSource = id.startsWith("eu:")
          ? "eu-portal"
          : "foerderdatenbank";
        return !failedSources.has(source);
      })
      .map(([id]) => id);

    // Only the changed records need their stored version loaded for a field diff.
    const previousVersions = seedOnly
      ? new Map<string, CatalogProgram>()
      : await loadPrograms([...changed.map((program) => program.id), ...removedIds]);

    const pending: PendingChange[] = [];

    if (!seedOnly) {
      for (const program of created) {
        const matches = relevantMatches(program);
        if (matches.length > 0) {
          pending.push({
            programId: program.id,
            kind: "new",
            program,
            fields: [],
            matches,
            topScore: topScore(matches),
          });
        }
      }

      for (const program of changed) {
        const matches = relevantMatches(program);
        if (matches.length === 0) continue;

        const before = previousVersions.get(program.id);
        const fields = before ? diffPrograms(before, program) : [];
        // A hash change with no watched field behind it is editorial noise.
        if (fields.length === 0) continue;

        pending.push({
          programId: program.id,
          kind: "updated",
          program,
          fields,
          matches,
          topScore: topScore(matches),
        });
      }

      for (const id of removedIds) {
        const program = previousVersions.get(id);
        if (!program) continue;
        const matches = relevantMatches(program);
        if (matches.length === 0) continue;

        pending.push({
          programId: id,
          kind: "removed",
          program,
          fields: [],
          matches,
          topScore: topScore(matches),
        });
      }
    }

    await withClient(async (client) => {
      await client.query("BEGIN");
      try {
        await upsertPrograms(client, fetched);
        await markRemoved(client, removedIds);
        await insertChanges(client, pending);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    });

    const finishedAt = new Date();
    const report: IngestReport = {
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      seeded: seedOnly,
      schemaVersion: CATALOG_SCHEMA_VERSION,
      migration: migration && seedOnly,
      sources: {
        foerderdatenbank: { fetched: fdb.programs.length, failed: fdb.failed },
        "eu-portal": { fetched: eu.programs.length, failed: eu.failed },
      },
      totals: {
        seen: fetched.length,
        new: seedOnly ? 0 : created.length,
        updated: seedOnly ? 0 : changed.length,
        removed: seedOnly ? 0 : removedIds.length,
      },
      relevant: pending.length,
    };

    await finishRun(runId, "ok", report);
    log.info(
      "fertig:",
      report.totals.seen,
      "Programme,",
      report.totals.new,
      "neu,",
      report.totals.updated,
      "geändert,",
      report.totals.removed,
      "entfallen,",
      report.relevant,
      "für mpool relevant"
    );
    return report;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unbekannter Fehler";
    await finishRun(runId, "failed", { error: message });
    throw error;
  }
}
