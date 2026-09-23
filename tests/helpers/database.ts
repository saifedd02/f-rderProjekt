import { setTimeout as sleep } from "node:timers/promises";
import { PGlite } from "@electric-sql/pglite";
import type { PoolClient } from "pg";
import type { DigestContent } from "@/lib/alerts/digest-email";
import type { PriorityAlertDeps, SendMail } from "@/server/alerts/priority";
import { ensureSchema, useDatabaseForTesting, withClient } from "@/server/catalog/db";
import type { CatalogProgram, ChangeKind, TopicMatch } from "@/types/catalog";

/**
 * Test support: an in-process Postgres (PGlite) behind the catalogue's own
 * `withClient`, plus fixtures and a fake mailer. No network, no real mail.
 */

export interface TestDatabase {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
  close(): Promise<void>;
}

/** A statement list (the schema DDL) must go through `exec`; everything else through `query`. */
function isMultiStatement(text: string): boolean {
  return text.trim().replace(/;\s*$/, "").includes(";");
}

export async function createTestDatabase(): Promise<TestDatabase> {
  const db = new PGlite();

  const client = {
    async query(text: string, params?: unknown[]) {
      if ((!params || params.length === 0) && isMultiStatement(text)) {
        const results = await db.exec(text);
        const last = results[results.length - 1];
        return { rows: last?.rows ?? [], rowCount: last?.affectedRows ?? 0 };
      }
      const result = await db.query(text, params ?? []);
      return { rows: result.rows, rowCount: result.affectedRows ?? result.rows.length };
    },
    release() {},
  };

  useDatabaseForTesting({ connect: async () => client as unknown as PoolClient });
  await ensureSchema();

  return {
    async query<T>(text: string, params: unknown[] = []) {
      return (await db.query<T>(text, params)).rows;
    },
    async close() {
      useDatabaseForTesting(undefined);
      await db.close();
    },
  };
}

export function catalogProgram(
  overrides: Partial<CatalogProgram> & { id: string }
): CatalogProgram {
  const slug = overrides.id.replace(/[^a-z0-9]+/gi, "-");
  return {
    source: "foerderdatenbank",
    name: `Programm ${overrides.id}`,
    summary: `Kurzbeschreibung von ${overrides.id}.`,
    sections: [],
    level: "bund",
    fundingBody: "Bundesministerium für Wirtschaft und Energie",
    regions: ["Bundesweit"],
    categories: [],
    fundingTypes: ["Zuschuss"],
    eligibleParties: ["Unternehmen"],
    companySizes: ["Kleines Unternehmen", "Mittleres Unternehmen"],
    industries: [],
    officialUrl: `https://www.example.org/programm/${slug}`,
    detailUrl: `https://www.foerderdatenbank.de/FDB/Content/DE/Foerderprogramm/${slug}.html`,
    contentHash: `hash-${overrides.id}`,
    ...overrides,
  };
}

export function topicMatch(score: number, label = "Digitalisierung"): TopicMatch {
  return {
    topicId: label.toLowerCase(),
    topicLabel: label,
    score,
    reasons: [
      "Thema im Kern des Programms: digitalisierung",
      'Förderbereich „digitalisierung"',
    ],
  };
}

export interface SeedChange {
  programId: string;
  kind?: ChangeKind;
  score: number;
  /** How long ago the change was detected. */
  hoursAgo?: number;
}

/** Insert a change row directly — the alert tests do not need an ingest. */
export async function seedChange({
  programId,
  kind = "new",
  score,
  hoursAgo = 1,
}: SeedChange): Promise<number> {
  return withClient(async (client) => {
    const result = await client.query<{ id: string | number }>(
      `INSERT INTO catalog_changes (program_id, kind, payload, fields, matches, top_score, detected_at)
       VALUES ($1, $2, $3::jsonb, '[]'::jsonb, $4::jsonb, $5::int,
               NOW() - ($6::int * INTERVAL '1 hour'))
       RETURNING id`,
      [
        programId,
        kind,
        JSON.stringify(catalogProgram({ id: programId })),
        JSON.stringify([topicMatch(score)]),
        score,
        hoursAgo,
      ]
    );
    return Number(result.rows[0].id);
  });
}

export interface FakeMailer {
  send: SendMail;
  calls: Array<{ content: DigestContent; idempotencyKey?: string }>;
}

/** Records every send; the first `failures` calls throw like a provider outage. */
export function fakeMailer({ failures = 0, delayMs = 0 } = {}): FakeMailer {
  const calls: FakeMailer["calls"] = [];
  let remainingFailures = failures;

  return {
    calls,
    async send(content, options) {
      calls.push({ content, idempotencyKey: options.idempotencyKey });
      if (delayMs > 0) await sleep(delayMs);
      if (remainingFailures > 0) {
        remainingFailures -= 1;
        throw new Error("Resend: simulierter Ausfall");
      }
      return `message-${calls.length}`;
    },
  };
}

export const ALERT_ENV = {
  PRIORITY_ALERT_ENABLED: "true",
  PRIORITY_ALERT_THRESHOLD: "70",
  PRIORITY_ALERT_MAX_ENTRIES: "10",
};

export function alertDeps(
  mailer: FakeMailer,
  env: Record<string, string> = {}
): PriorityAlertDeps {
  return {
    env: { ...ALERT_ENV, ...env },
    send: mailer.send,
    isMailerConfigured: () => true,
  };
}

/** Let every lease and retry pause run out, as if the clock had moved on. */
export async function expireLeases(database: TestDatabase): Promise<void> {
  await database.query(
    "UPDATE alert_deliveries SET lease_until = NOW() - INTERVAL '1 minute' WHERE lease_until IS NOT NULL"
  );
}
