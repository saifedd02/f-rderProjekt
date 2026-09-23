import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { runPriorityAlert } from "@/server/alerts/priority";
import {
  claimPriorityChanges,
  createPriorityDelivery,
  pendingChanges,
} from "@/server/catalog/repository";
import {
  alertDeps,
  createTestDatabase,
  expireLeases,
  fakeMailer,
  seedChange,
  type TestDatabase,
} from "./helpers/database";

const DIGEST_PRIORITY = { threshold: 70, windowHours: 72 };

describe("runPriorityAlert", () => {
  let database: TestDatabase;

  beforeEach(async () => {
    database = await createTestDatabase();
  });
  afterEach(async () => {
    await database.close();
  });

  async function statuses(): Promise<Record<string, string | null>> {
    const rows = await database.query<{
      program_id: string;
      priority_status: string | null;
    }>("SELECT program_id, priority_status FROM catalog_changes ORDER BY id");
    return Object.fromEntries(rows.map((row) => [row.program_id, row.priority_status]));
  }

  it("meldet nur neue Programme; geänderte und entfallene bleiben für den Digest", async () => {
    await seedChange({ programId: "fdb:neu", kind: "new", score: 85 });
    await seedChange({ programId: "fdb:geaendert", kind: "updated", score: 100 });
    await seedChange({ programId: "fdb:entfallen", kind: "removed", score: 95 });
    const mailer = fakeMailer();

    const result = await runPriorityAlert(alertDeps(mailer));

    assert.equal(result.sent, true);
    assert.equal(result.entries, 1);
    assert.equal(mailer.calls.length, 1);
    assert.match(mailer.calls[0].content.text, /Programm fdb:neu/);
    assert.doesNotMatch(mailer.calls[0].content.text, /geaendert|entfallen/);

    const digest = await pendingChanges(45, 25, DIGEST_PRIORITY);
    assert.deepEqual(digest.map((entry) => entry.programId).sort(), [
      "fdb:entfallen",
      "fdb:geaendert",
    ]);
  });

  it("sortiert nach Score und stellt Überzählige für den Digest zurück", async () => {
    for (const [programId, score] of [
      ["fdb:72", 72],
      ["fdb:95", 95],
      ["fdb:80", 80],
      ["fdb:88", 88],
    ] as const) {
      await seedChange({ programId, score });
    }
    const mailer = fakeMailer();

    const result = await runPriorityAlert(
      alertDeps(mailer, { PRIORITY_ALERT_MAX_ENTRIES: "3" })
    );

    assert.equal(result.entries, 3);
    assert.equal(result.deliveries[0].deferred, 1);
    const { text } = mailer.calls[0].content;
    const order = ["fdb:95", "fdb:88", "fdb:80"].map((id) =>
      text.indexOf(`Programm ${id}`)
    );
    assert.ok(order.every((position) => position >= 0));
    assert.deepEqual(
      [...order].sort((a, b) => a - b),
      order
    );
    assert.ok(!text.includes("Programm fdb:72"));
    assert.match(text, /1 weiterer neuer Treffer/);

    assert.deepEqual(await statuses(), {
      "fdb:72": "deferred",
      "fdb:95": "sent",
      "fdb:80": "sent",
      "fdb:88": "sent",
    });
    const digest = await pendingChanges(45, 25, DIGEST_PRIORITY);
    assert.deepEqual(
      digest.map((entry) => entry.programId),
      ["fdb:72"]
    );
  });

  it("berücksichtigt nur Treffer ab dem Grenzwert", async () => {
    await seedChange({ programId: "fdb:69", score: 69 });
    await seedChange({ programId: "fdb:70", score: 70 });
    const mailer = fakeMailer();

    const result = await runPriorityAlert(alertDeps(mailer));

    assert.equal(result.entries, 1);
    assert.match(mailer.calls[0].content.text, /Programm fdb:70/);
    assert.doesNotMatch(mailer.calls[0].content.text, /Programm fdb:69/);
    // Below the threshold the weekly digest keeps it.
    const digest = await pendingChanges(45, 25, DIGEST_PRIORITY);
    assert.deepEqual(
      digest.map((entry) => entry.programId),
      ["fdb:69"]
    );
  });

  it("schickt nichts, wenn kein Treffer den Grenzwert erreicht", async () => {
    await seedChange({ programId: "fdb:85", score: 85 });
    const mailer = fakeMailer();

    const result = await runPriorityAlert(
      alertDeps(mailer, { PRIORITY_ALERT_THRESHOLD: "90" })
    );

    assert.equal(result.sent, false);
    assert.equal(result.reason, "keine neuen Treffer über dem Grenzwert");
    assert.equal(mailer.calls.length, 0);
    const deliveries = await database.query("SELECT id FROM alert_deliveries");
    assert.equal(deliveries.length, 0);
  });

  it("verschickt ein gemeldetes Programm nie ein zweites Mal", async () => {
    await seedChange({ programId: "fdb:a", score: 90 });
    const mailer = fakeMailer();

    await runPriorityAlert(alertDeps(mailer));
    const second = await runPriorityAlert(alertDeps(mailer));
    assert.equal(second.sent, false);
    assert.equal(mailer.calls.length, 1);

    // The program vanishes and comes back — a second "new" row for the same id.
    await seedChange({ programId: "fdb:a", score: 95 });
    const third = await runPriorityAlert(alertDeps(mailer));
    assert.equal(third.sent, false);
    assert.equal(mailer.calls.length, 1);

    // And the digest does not announce it as new either.
    const digest = await pendingChanges(45, 25, DIGEST_PRIORITY);
    assert.equal(digest.length, 0);
  });

  it("schickt bei leerem Bestand nichts und legt keine Zustellung an", async () => {
    const mailer = fakeMailer();

    const result = await runPriorityAlert(alertDeps(mailer));

    assert.equal(result.sent, false);
    assert.equal(mailer.calls.length, 0);
    assert.equal((await database.query("SELECT id FROM alert_deliveries")).length, 0);
  });

  it("verschluckt bei einem Mailfehler keine Treffer und wiederholt identisch", async () => {
    await seedChange({ programId: "fdb:a", score: 90 });
    await seedChange({ programId: "fdb:b", score: 80 });
    const mailer = fakeMailer({ failures: 1 });

    const failed = await runPriorityAlert(alertDeps(mailer));
    assert.equal(failed.sent, false);
    assert.equal(failed.error, "Resend: simulierter Ausfall");
    assert.deepEqual(await statuses(), { "fdb:a": "claimed", "fdb:b": "claimed" });

    // Within the retry pause nothing is sent — and nothing new is claimed.
    const tooEarly = await runPriorityAlert(alertDeps(mailer));
    assert.equal(tooEarly.sent, false);
    assert.match(tooEarly.reason ?? "", /Letzter Versand fehlgeschlagen/);
    assert.equal(mailer.calls.length, 1);

    await expireLeases(database);
    const retried = await runPriorityAlert(alertDeps(mailer));
    assert.equal(retried.sent, true);
    assert.equal(retried.entries, 2);
    assert.equal(retried.deliveries[0].resumed, true);
    assert.equal(mailer.calls.length, 2);
    assert.equal(mailer.calls[1].idempotencyKey, mailer.calls[0].idempotencyKey);
    assert.equal(mailer.calls[1].content.html, mailer.calls[0].content.html);
    assert.deepEqual(await statuses(), { "fdb:a": "sent", "fdb:b": "sent" });

    const after = await runPriorityAlert(alertDeps(mailer));
    assert.equal(after.sent, false);
    assert.equal(mailer.calls.length, 2);
  });

  it("übernimmt nach einem Absturz die eingefrorene Zustellung erst nach Lease-Ablauf", async () => {
    await seedChange({ programId: "fdb:a", score: 90 });
    // A run that claimed and then died before sending.
    const crashed = await createPriorityDelivery("abgestuerzt", 15);
    assert.ok(crashed);
    await claimPriorityChanges(crashed.id, DIGEST_PRIORITY, 10);
    const mailer = fakeMailer();

    const whileHeld = await runPriorityAlert(alertDeps(mailer));
    assert.equal(whileHeld.sent, false);
    assert.equal(whileHeld.reason, "Versand läuft bereits in einem anderen Aufruf");
    assert.equal(mailer.calls.length, 0);

    await expireLeases(database);
    const resumed = await runPriorityAlert(alertDeps(mailer));
    assert.equal(resumed.sent, true);
    assert.equal(resumed.deliveries[0].deliveryId, crashed.id);
    assert.equal(mailer.calls.length, 1);
  });

  it("erzeugt bei parallelen Aufrufen genau eine Mail", async () => {
    for (const [programId, score] of [
      ["fdb:a", 91],
      ["fdb:b", 82],
      ["fdb:c", 75],
    ] as const) {
      await seedChange({ programId, score });
    }
    const mailer = fakeMailer({ delayMs: 25 });

    const results = await Promise.all(
      Array.from({ length: 6 }, () => runPriorityAlert(alertDeps(mailer)))
    );

    assert.equal(mailer.calls.length, 1);
    assert.equal(results.filter((result) => result.sent).length, 1);
    assert.deepEqual(await statuses(), {
      "fdb:a": "sent",
      "fdb:b": "sent",
      "fdb:c": "sent",
    });
    const sent = await database.query(
      "SELECT id FROM alert_deliveries WHERE status = 'sent'"
    );
    assert.equal(sent.length, 1);
  });

  it("claimt nichts, solange der Alarm aus oder der Mailversand nicht eingerichtet ist", async () => {
    await seedChange({ programId: "fdb:a", score: 90 });
    const mailer = fakeMailer();

    const disabled = await runPriorityAlert(
      alertDeps(mailer, { PRIORITY_ALERT_ENABLED: "false" })
    );
    assert.match(disabled.reason ?? "", /deaktiviert/);

    const unconfigured = await runPriorityAlert({
      ...alertDeps(mailer),
      isMailerConfigured: () => false,
    });
    assert.match(unconfigured.reason ?? "", /nicht konfiguriert/);

    assert.equal(mailer.calls.length, 0);
    assert.deepEqual(await statuses(), { "fdb:a": null });
  });

  it("überlässt Programme außerhalb des Zeitfensters dem Wochen-Digest", async () => {
    await seedChange({ programId: "fdb:alt", score: 95, hoursAgo: 80 });
    const mailer = fakeMailer();

    const result = await runPriorityAlert(alertDeps(mailer));

    assert.equal(result.sent, false);
    assert.equal(mailer.calls.length, 0);
    const digest = await pendingChanges(45, 25, DIGEST_PRIORITY);
    assert.deepEqual(
      digest.map((entry) => entry.programId),
      ["fdb:alt"]
    );
  });

  it("hält frische Kandidaten aus dem Digest heraus, bis der Alarm sie verarbeitet hat", async () => {
    await seedChange({ programId: "fdb:frisch", score: 90 });

    assert.equal((await pendingChanges(45, 25, DIGEST_PRIORITY)).length, 0);
    // Without the priority alert the digest sees everything as before.
    assert.equal((await pendingChanges(45, 25)).length, 1);
  });
});
