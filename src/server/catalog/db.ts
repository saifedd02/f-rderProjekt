import { Pool, type PoolClient } from "pg";

/**
 * Postgres access for the catalogue.
 *
 * One pool per process, created lazily: a serverless function that never runs
 * an ingest should not open a connection just because the module was imported.
 */

/** The part of a pool the catalogue uses — lets tests plug in an in-process Postgres. */
export interface DatabasePool {
  connect(): Promise<PoolClient>;
}

let pool: DatabasePool | undefined;
let schemaReady: Promise<void> | undefined;

function connectionString(): string {
  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL;

  if (!url) {
    throw new Error(
      "DATABASE_URL fehlt. Postgres-Verbindung in den Umgebungsvariablen hinterlegen."
    );
  }
  return url;
}

export function hasDatabase(): boolean {
  return Boolean(
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL
  );
}

export function getPool(): DatabasePool {
  if (!pool) {
    pool = new Pool({
      connectionString: connectionString(),
      // Serverless: many short-lived instances, each needing very few sockets.
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    });
  }
  return pool;
}

/** Replace the pool (tests only); `undefined` returns to the env-configured one. */
export function useDatabaseForTesting(testPool: DatabasePool | undefined): void {
  pool = testPool;
  schemaReady = undefined;
}

/** Run a unit of work on one client, always returning it to the pool. */
export async function withClient<T>(
  work: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    // Neon transaction-pooler connections do not apply the role's configured
    // search_path. Set it explicitly for every checked-out connection so the
    // catalogue tables in `public` are visible both locally and on Vercel.
    await client.query("SET search_path TO public");
    return await work(client);
  } finally {
    client.release();
  }
}

/** Arbitrary but fixed key: serialises schema bootstrapping across instances. */
const SCHEMA_LOCK_KEY = 815_204_117;

/**
 * Create the catalogue tables if they do not exist.
 *
 * Kept as plain idempotent DDL rather than a migration tool: the schema is
 * small, and an ingest that can bootstrap its own storage is one less manual
 * step between a fresh deployment and the first digest.
 *
 * Two cron calls arriving together would otherwise race on
 * `CREATE TABLE IF NOT EXISTS` (Postgres can fail that with a duplicate-key
 * error), so the DDL runs under a transaction-scoped advisory lock — which,
 * unlike a session lock, also behaves behind a transaction-mode pooler.
 * Memoised per process: once the schema exists, later calls cost nothing.
 */
export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = createSchema().catch((error) => {
      schemaReady = undefined;
      throw error;
    });
  }
  return schemaReady;
}

async function createSchema(): Promise<void> {
  await withClient(async (client) => {
    await client.query("BEGIN");
    try {
      await client.query("SELECT pg_advisory_xact_lock($1)", [SCHEMA_LOCK_KEY]);

      await client.query(`
        CREATE TABLE IF NOT EXISTS catalog_programs (
          id            TEXT PRIMARY KEY,
          source        TEXT        NOT NULL,
          content_hash  TEXT        NOT NULL,
          payload       JSONB       NOT NULL,
          first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          removed_at    TIMESTAMPTZ
        );

        CREATE INDEX IF NOT EXISTS catalog_programs_source_idx
          ON catalog_programs (source);
        CREATE INDEX IF NOT EXISTS catalog_programs_active_idx
          ON catalog_programs (removed_at) WHERE removed_at IS NULL;

        CREATE TABLE IF NOT EXISTS catalog_changes (
          id          BIGSERIAL PRIMARY KEY,
          program_id  TEXT        NOT NULL,
          kind        TEXT        NOT NULL,
          detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          payload     JSONB       NOT NULL,
          fields      JSONB       NOT NULL DEFAULT '[]'::jsonb,
          matches     JSONB       NOT NULL DEFAULT '[]'::jsonb,
          top_score   INTEGER     NOT NULL DEFAULT 0,
          notified_at TIMESTAMPTZ
        );

        CREATE INDEX IF NOT EXISTS catalog_changes_pending_idx
          ON catalog_changes (top_score DESC) WHERE notified_at IS NULL;
        CREATE INDEX IF NOT EXISTS catalog_changes_detected_idx
          ON catalog_changes (detected_at DESC);

        CREATE TABLE IF NOT EXISTS catalog_runs (
          id          BIGSERIAL PRIMARY KEY,
          started_at  TIMESTAMPTZ NOT NULL,
          finished_at TIMESTAMPTZ,
          status      TEXT        NOT NULL,
          report      JSONB
        );
      `);

      // Full-text search over the catalogue. Added separately because
      // CREATE TABLE IF NOT EXISTS never alters an existing table, and this
      // arrived after the first deployments.
      await client.query(`
        ALTER TABLE catalog_programs
          ADD COLUMN IF NOT EXISTS search_source TEXT NOT NULL DEFAULT '';
      `);
      await client.query(`
        ALTER TABLE catalog_programs
          ADD COLUMN IF NOT EXISTS search_text TSVECTOR
          GENERATED ALWAYS AS (to_tsvector('german', search_source)) STORED;
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS catalog_programs_search_idx
          ON catalog_programs USING GIN (search_text);
      `);

      // Priority alert. Additive only: existing rows keep working, NULL means
      // "not yet handled by the priority channel".
      //
      //   priority_status       claimed | sent | deferred | expired
      //   priority_delivery_id  the alert_deliveries row that handled the change
      await client.query(`
        ALTER TABLE catalog_changes
          ADD COLUMN IF NOT EXISTS priority_status TEXT;
        ALTER TABLE catalog_changes
          ADD COLUMN IF NOT EXISTS priority_delivery_id BIGINT;
        ALTER TABLE catalog_changes
          ADD COLUMN IF NOT EXISTS priority_notified_at TIMESTAMPTZ;

        CREATE INDEX IF NOT EXISTS catalog_changes_program_idx
          ON catalog_changes (program_id);
        CREATE INDEX IF NOT EXISTS catalog_changes_priority_idx
          ON catalog_changes (priority_delivery_id)
          WHERE priority_delivery_id IS NOT NULL;

        CREATE TABLE IF NOT EXISTS alert_deliveries (
          id          BIGSERIAL PRIMARY KEY,
          kind        TEXT        NOT NULL,
          status      TEXT        NOT NULL,
          lease_token TEXT,
          lease_until TIMESTAMPTZ,
          attempts    INTEGER     NOT NULL DEFAULT 1,
          entries     INTEGER     NOT NULL DEFAULT 0,
          created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          sent_at     TIMESTAMPTZ,
          message_id  TEXT,
          last_error  TEXT
        );

        -- At most ONE unfinished delivery per kind. This index is the mutex
        -- that keeps parallel cron calls from mailing twice.
        CREATE UNIQUE INDEX IF NOT EXISTS alert_deliveries_open_idx
          ON alert_deliveries (kind) WHERE status IN ('sending', 'failed');

        CREATE TABLE IF NOT EXISTS catalog_locks (
          name         TEXT PRIMARY KEY,
          holder       TEXT        NOT NULL,
          locked_until TIMESTAMPTZ NOT NULL
        );
      `);

      // Raw model responses of the web search — debugging and benchmark
      // evidence. Additive; nothing else reads or depends on it.
      await client.query(`
        CREATE TABLE IF NOT EXISTS model_responses (
          id          BIGSERIAL PRIMARY KEY,
          created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          provider    TEXT        NOT NULL,
          model       TEXT        NOT NULL,
          prompt      TEXT        NOT NULL,
          raw         JSONB,
          programs    INTEGER     NOT NULL DEFAULT 0,
          latency_ms  INTEGER     NOT NULL DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS model_responses_created_idx
          ON model_responses (created_at DESC);
      `);

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  });
}
