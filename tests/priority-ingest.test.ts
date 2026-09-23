import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { alertAfterIngest } from "@/server/alerts/priority";
import { IngestInProgressError, runIngest } from "@/server/catalog/ingest";
import { pendingChanges } from "@/server/catalog/repository";
import type { CatalogProgram } from "@/types/catalog";
import {
  alertDeps,
  catalogProgram,
  createTestDatabase,
  fakeMailer,
  type TestDatabase,
} from "./helpers/database";

const EXISTING = catalogProgram({
  id: "fdb:digitalbonus",
  name: "Digitalisierungsbonus für den Mittelstand",
  summary: "Förderung der Digitalisierung und Automatisierung im Mittelstand.",
  categories: ["digitalisierung"],
  deadline: "Einreichungsfrist: 01.12.2026",
});

const UNRELATED = catalogProgram({
  id: "fdb:kunstvereine",
  name: "Förderung von Kunstvereinen",
  summary: "Zuschüsse für die Arbeit von Kunstvereinen.",
  categories: ["kultur"],
  eligibleParties: ["Verband / Vereinigung"],
});

const BRAND_NEW = catalogProgram({
  id: "fdb:cybersicherheit",
  name: "Digitalisierung und Cybersicherheit im Mittelstand",
  summary:
    "Zuschuss für Digitalisierung, künstliche Intelligenz und IT-Sicherheit in kleinen und mittleren Unternehmen.",
  categories: ["digitalisierung"],
});

function sources(programs: CatalogProgram[]) {
  return {
    loaders: {
      foerderdatenbank: async () => programs,
      "eu-portal": async () => [],
    },
  };
}

describe("Ingest und Prioritätsalarm", () => {
  let database: TestDatabase;

  beforeEach(async () => {
    database = await createTestDatabase();
  });
  afterEach(async () => {
    await database.close();
  });

  it("verschickt beim ersten Katalogaufbau nichts", async () => {
    const mailer = fakeMailer();

    const report = await runIngest(sources([EXISTING, UNRELATED, BRAND_NEW]));
    const alert = await alertAfterIngest(report, alertDeps(mailer));

    assert.equal(report.seeded, true);
    assert.equal(alert.sent, false);
    assert.match(alert.reason ?? "", /Erstlauf/);
    assert.equal(mailer.calls.length, 0);
    assert.equal((await database.query("SELECT id FROM catalog_changes")).length, 0);
  });

  it("meldet nach dem Erstlauf nur das neue Programm, die Änderung bleibt im Digest", async () => {
    await runIngest(sources([EXISTING, UNRELATED]));
    const mailer = fakeMailer();

    const changedExisting = {
      ...EXISTING,
      deadline: "Einreichungsfrist: 15.01.2027",
      contentHash: "hash-geaendert",
    };
    const report = await runIngest(sources([changedExisting, UNRELATED, BRAND_NEW]));
    const alert = await alertAfterIngest(report, alertDeps(mailer));

    assert.equal(report.seeded, false);
    assert.deepEqual(report.totals, { seen: 3, new: 1, updated: 1, removed: 0 });
    assert.equal(alert.sent, true);
    assert.equal(alert.entries, 1);
    assert.equal(mailer.calls.length, 1);
    assert.match(mailer.calls[0].content.text, /Digitalisierung und Cybersicherheit/);
    assert.doesNotMatch(mailer.calls[0].content.text, /Digitalisierungsbonus/);

    const digest = await pendingChanges(45, 25, { threshold: 70, windowHours: 72 });
    assert.deepEqual(
      digest.map((change) => [change.programId, change.kind]),
      [["fdb:digitalbonus", "updated"]]
    );

    // The next daily run brings nothing new — and mails nothing.
    const quiet = await runIngest(sources([changedExisting, UNRELATED, BRAND_NEW]));
    const quietAlert = await alertAfterIngest(quiet, alertDeps(mailer));
    assert.equal(quietAlert.sent, false);
    assert.equal(mailer.calls.length, 1);
  });

  it("weist einen parallelen zweiten Ingest ab", async () => {
    await runIngest(sources([EXISTING]));

    const outcomes = await Promise.allSettled([
      runIngest(sources([EXISTING, BRAND_NEW])),
      runIngest(sources([EXISTING, BRAND_NEW])),
    ]);

    const rejected = outcomes.filter((outcome) => outcome.status === "rejected");
    assert.equal(outcomes.length - rejected.length, 1);
    assert.equal(rejected.length, 1);
    assert.ok(
      rejected[0].status === "rejected" &&
        rejected[0].reason instanceof IngestInProgressError
    );

    const newRows = await database.query(
      "SELECT id FROM catalog_changes WHERE kind = 'new'"
    );
    assert.equal(newRows.length, 1);
    assert.equal((await database.query("SELECT name FROM catalog_locks")).length, 0);
  });
});
