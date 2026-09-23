import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parsePriorityAlertConfig } from "@/lib/alerts/priority-config";

describe("parsePriorityAlertConfig", () => {
  it("nutzt ohne Env-Werte die Standards", () => {
    assert.deepEqual(parsePriorityAlertConfig({}), {
      enabled: true,
      threshold: 70,
      maxEntries: 10,
      warnings: [],
    });
  });

  it("übernimmt gültige Werte, auch mit Leerzeichen", () => {
    const config = parsePriorityAlertConfig({
      PRIORITY_ALERT_ENABLED: " false ",
      PRIORITY_ALERT_THRESHOLD: " 85 ",
      PRIORITY_ALERT_MAX_ENTRIES: "5",
    });
    assert.equal(config.enabled, false);
    assert.equal(config.threshold, 85);
    assert.equal(config.maxEntries, 5);
    assert.deepEqual(config.warnings, []);
  });

  it("schaltet den Alarm bei ungültigem Schalter sicherheitshalber aus", () => {
    const config = parsePriorityAlertConfig({ PRIORITY_ALERT_ENABLED: "vielleicht" });
    assert.equal(config.enabled, false);
    assert.equal(config.warnings.length, 1);
    assert.match(config.warnings[0], /PRIORITY_ALERT_ENABLED/);
  });

  for (const raw of ["abc", "70.5", "1e2", "150", "-1"]) {
    it(`fällt bei PRIORITY_ALERT_THRESHOLD="${raw}" auf 70 zurück`, () => {
      const config = parsePriorityAlertConfig({ PRIORITY_ALERT_THRESHOLD: raw });
      assert.equal(config.threshold, 70);
      assert.equal(config.enabled, true);
      assert.equal(config.warnings.length, 1);
      assert.match(config.warnings[0], /PRIORITY_ALERT_THRESHOLD/);
    });
  }

  for (const raw of ["0", "51", "zehn", "3.5"]) {
    it(`fällt bei PRIORITY_ALERT_MAX_ENTRIES="${raw}" auf 10 zurück`, () => {
      const config = parsePriorityAlertConfig({ PRIORITY_ALERT_MAX_ENTRIES: raw });
      assert.equal(config.maxEntries, 10);
      assert.equal(config.warnings.length, 1);
      assert.match(config.warnings[0], /PRIORITY_ALERT_MAX_ENTRIES/);
    });
  }

  it("akzeptiert die Grenzwerte der erlaubten Bereiche", () => {
    const low = parsePriorityAlertConfig({
      PRIORITY_ALERT_THRESHOLD: "0",
      PRIORITY_ALERT_MAX_ENTRIES: "1",
    });
    const high = parsePriorityAlertConfig({
      PRIORITY_ALERT_THRESHOLD: "100",
      PRIORITY_ALERT_MAX_ENTRIES: "50",
    });
    assert.deepEqual([low.threshold, low.maxEntries, low.warnings.length], [0, 1, 0]);
    assert.deepEqual(
      [high.threshold, high.maxEntries, high.warnings.length],
      [100, 50, 0]
    );
  });
});
