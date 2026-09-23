import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { Pool } from "pg";
import { runPriorityAlert } from "@/server/alerts/priority";
import { ensureSchema, useDatabaseForTesting } from "@/server/catalog/db";
import { alertDeps, fakeMailer, seedChange } from "./helpers/database";

/**
 * The same idempotency guarantee against a real Postgres with a real pool —
 * PGlite runs one statement at a time, a server runs them truly in parallel.
 *
 * Opt-in: set TEST_DATABASE_URL. Everything happens in a throwaway schema that
 * is dropped afterwards, so the database's own tables are never touched.
 */

const url = process.env.TEST_DATABASE_URL;

describe(
  "Prioritätsalarm gegen echtes Postgres",
  { skip: url ? false : "TEST_DATABASE_URL nicht gesetzt" },
  () => {
    const schema = `priority_alert_test_${process.pid}_${Date.now()}`;
    let admin: Pool;
    let pool: Pool;

    before(async () => {
      admin = new Pool({ connectionString: url, max: 1 });
      await admin.query(`CREATE SCHEMA ${schema}`);
      pool = new Pool({
        connectionString: url,
        max: 10,
        options: `-c search_path=${schema}`,
      });
      useDatabaseForTesting(pool);
      await ensureSchema();
    });

    after(async () => {
      useDatabaseForTesting(undefined);
      await pool?.end();
      await admin?.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
      await admin?.end();
    });

    it("zehn parallele Aufrufe über mehrere Verbindungen erzeugen genau eine Mail", async () => {
      await seedChange({ programId: "fdb:a", score: 93 });
      await seedChange({ programId: "fdb:b", score: 81 });
      const mailer = fakeMailer({ delayMs: 50 });

      const results = await Promise.all(
        Array.from({ length: 10 }, () => runPriorityAlert(alertDeps(mailer)))
      );

      assert.equal(mailer.calls.length, 1);
      assert.equal(results.filter((result) => result.sent).length, 1);
      const rows = await pool.query(
        "SELECT priority_status FROM catalog_changes ORDER BY id"
      );
      assert.deepEqual(
        rows.rows.map((row) => row.priority_status),
        ["sent", "sent"]
      );
    });
  }
);
