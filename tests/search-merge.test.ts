import assert from "node:assert/strict";
import test from "node:test";

import { mergeResults } from "../src/server/search/service";
import type { ScoredProgram } from "../src/types";

function item(
  name: string,
  link: string,
  source: ScoredProgram["source"]
): ScoredProgram {
  return {
    program: { id: name, name, link },
    score: source === "datenbank" ? 70 : 90,
    relevance: "hoch",
    verdict: "GUELTIG",
    hints: [],
    unchecked: [],
    source,
    checkedAt: "2026-09-15",
  };
}

test("gleiche URL mit Tracking und anderem Namen wird nur einmal gezeigt", () => {
  const catalog = item(
    "Bayerisches Transformationsprogramm",
    "https://beispiel.de/foerderung/transform?utm_source=x",
    "datenbank"
  );
  const web = item(
    "Transformation@Bayern",
    "https://www.beispiel.de/foerderung/transform/",
    "websuche"
  );
  const merged = mergeResults([catalog], [web]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].source, "datenbank");
});

test("verschiedene Webprogramme mit derselben Übersichtsseite bleiben erhalten", () => {
  const overview =
    "https://www.kfw.de/inlandsfoerderung/Unternehmen/Gr%C3%BCnden-Nachfolgen/Gr%C3%BCnden/";
  const merged = mergeResults(
    [],
    [
      item(
        "ERP-Förderkredit Gründung und Nachfolge (Kredit Nr. 077)",
        overview,
        "websuche"
      ),
      item("ERP-Förderkredit KMU (Kredit Nr. 365/366)", overview, "websuche"),
    ]
  );
  assert.equal(merged.length, 2);
});

test("Query-Parameter, die die Seite bestimmen, trennen Programme", () => {
  const merged = mergeResults(
    [item("Programm A", "https://www.ilb.de/index.php?id=101", "datenbank")],
    [item("Programm B", "https://www.ilb.de/index.php?id=202&utm_source=x", "websuche")]
  );
  assert.equal(merged.length, 2);
});
