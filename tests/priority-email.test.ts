import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  describeDeadline,
  priorityLevel,
  renderPriorityAlert,
} from "@/lib/alerts/priority-email";
import type { CatalogChange } from "@/types/catalog";
import { catalogProgram, topicMatch } from "./helpers/database";

const TODAY = new Date("2026-09-15T06:00:00Z");

function change(id: number, score: number, overrides = {}): CatalogChange {
  return {
    id,
    programId: `fdb:p${id}`,
    kind: "new",
    detectedAt: "2026-09-15T05:20:00.000Z",
    program: catalogProgram({
      id: `fdb:p${id}`,
      name: `Programm ${score}`,
      ...overrides,
    }),
    fields: [],
    matches: [topicMatch(score)],
    topScore: score,
  };
}

describe("renderPriorityAlert", () => {
  it("zeigt die stärksten Treffer zuerst, auch bei unsortierter Eingabe", () => {
    const { html, text } = renderPriorityAlert({
      changes: [change(1, 72), change(2, 96), change(3, 85)],
      date: TODAY,
      threshold: 70,
    });

    for (const body of [html, text]) {
      const positions = ["Programm 96", "Programm 85", "Programm 72"].map((name) =>
        body.indexOf(name)
      );
      assert.ok(positions.every((position) => position >= 0));
      assert.deepEqual(
        [...positions].sort((a, b) => a - b),
        positions
      );
    }
    assert.match(text, /1\. \[SEHR HOHE PRIORITÄT · Score 96 %\] Programm 96/);
    assert.match(text, /3\. \[HOHE PRIORITÄT · Score 72 %\] Programm 72/);
  });

  it("kennzeichnet die Priorität im Betreff und an jedem Eintrag", () => {
    const { subject, html } = renderPriorityAlert({
      changes: [change(1, 96), change(2, 74)],
      date: TODAY,
      threshold: 70,
    });
    assert.equal(
      subject,
      "[Hohe Priorität] Förderradar: 2 neue Förderprogramme für mpool – Top-Treffer 96 %"
    );
    assert.match(html, /SEHR HOHE PRIORITÄT/);
    assert.match(html, /HOHE PRIORITÄT/);
    assert.equal(priorityLevel(90), "sehr-hoch");
    assert.equal(priorityLevel(89), "hoch");
  });

  it("enthält alle Pflichtangaben eines Eintrags", () => {
    const entry = change(1, 88, {
      name: "Digitalbonus Mittelstand",
      summary: "Zuschuss für Digitalisierungsprojekte kleiner Unternehmen.",
      fundingBody: "Bayerisches Staatsministerium für Wirtschaft",
      fundingTypes: ["Zuschuss"],
      regions: ["Bayern"],
      eligibleParties: ["Unternehmen"],
      companySizes: ["Kleines Unternehmen"],
      deadline: "Einreichungsfrist: 06.10.2026",
      officialUrl: "https://www.stmwi.bayern.de/digitalbonus",
      sections: [
        {
          heading: "Art und Höhe der Förderung",
          text: "Zuschuss von bis zu 50 % der Kosten, höchstens 10.000 EUR.",
        },
      ],
    });
    const { text, html } = renderPriorityAlert({
      changes: [entry],
      date: TODAY,
      threshold: 70,
    });

    for (const expected of [
      "Digitalbonus Mittelstand",
      "Score 88 %",
      "mpool-Themen: Digitalisierung 88 %",
      "Thema im Kern des Programms: digitalisierung",
      "Zuschuss für Digitalisierungsprojekte kleiner Unternehmen.",
      "Fördergeber: Bayerisches Staatsministerium für Wirtschaft",
      "Förderart: Zuschuss",
      "Förderhöhe: Zuschuss von bis zu 50 % der Kosten, höchstens 10.000 EUR.",
      "Zielgruppe: Antragsberechtigt: Unternehmen · Unternehmensgröße: Kleines Unternehmen",
      "Region: Bayern",
      "Frist: 06.10.2026 – noch 21 Tage",
      "Offizieller Link: https://www.stmwi.bayern.de/digitalbonus",
      "Quelle: Förderdatenbank des Bundes",
      "Erkannt am: 15.09.2026",
    ]) {
      assert.ok(text.includes(expected), `Text enthält nicht: ${expected}`);
    }
    assert.match(html, /name="viewport"/);
    assert.match(html, /href="https:\/\/www\.stmwi\.bayern\.de\/digitalbonus"/);
  });

  it("maskiert HTML aus der Quelle", () => {
    const { html } = renderPriorityAlert({
      changes: [change(1, 80, { name: '<script>alert("x")</script>' })],
      date: TODAY,
      threshold: 70,
    });
    assert.ok(!html.includes("<script>"));
    assert.ok(html.includes("&lt;script&gt;"));
  });

  it("nennt zurückgestellte Treffer, die in den Wochen-Digest gehen", () => {
    const { text } = renderPriorityAlert({
      changes: [change(1, 80)],
      date: TODAY,
      threshold: 70,
      deferred: 3,
    });
    assert.match(
      text,
      /3 weitere neue Treffer über dem Grenzwert .* im wöchentlichen Digest/
    );
  });
});

describe("describeDeadline", () => {
  it("rechnet bei einem strukturierten Datum die Resttage", () => {
    assert.equal(
      describeDeadline("Einreichungsfrist: 06.10.2026", TODAY),
      "06.10.2026 – noch 21 Tage"
    );
    assert.equal(
      describeDeadline("Einreichungsfrist: 16.09.2026", TODAY),
      "16.09.2026 – endet morgen"
    );
  });

  it("markiert ein vergangenes Datum", () => {
    assert.match(
      describeDeadline("Einreichungsfrist: 05.09.2023", TODAY),
      /Vergangenheit/
    );
  });

  it("sagt klar, wenn die Quelle keine Frist nennt", () => {
    assert.match(
      describeDeadline(undefined, TODAY),
      /^Keine Frist in der Quelle genannt/
    );
  });

  it("zitiert Fließtext statt ein Datum zu raten", () => {
    const sentence =
      "Anträge können bis zum 31.12.2026 gestellt werden, sofern Haushaltsmittel zur Verfügung stehen.";
    assert.equal(describeDeadline(sentence, TODAY), `Laut Quelle: „${sentence}“`);
  });
});
