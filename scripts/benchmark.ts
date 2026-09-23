import fs from "node:fs";
import path from "node:path";
import {
  availableProviders,
  runCase,
  summarize,
  type BenchmarkCase,
  type BenchmarkProviderName,
  type CaseResult,
} from "../src/server/benchmark/run";

/**
 * Provider benchmark — Perplexity, Gemini, Claude, OpenAI on the same cases.
 *
 *   npm run benchmark                          all providers with credentials
 *   npm run benchmark -- --providers=claude,gemini
 *   npm run benchmark -- --cases=digital-nrw-klein --no-raw
 *
 * Every call costs money. Results (incl. raw model responses) are written to
 * benchmark/results/<timestamp>.json; a summary table is printed.
 */

const arg = (name: string) =>
  process.argv.find((entry) => entry.startsWith(`--${name}=`))?.split("=")[1];

async function main() {
  const file = JSON.parse(fs.readFileSync("benchmark/cases.json", "utf8")) as {
    cases: BenchmarkCase[];
  };
  const caseFilter = arg("cases")?.split(",");
  const cases = file.cases.filter(
    (entry) => !caseFilter || caseFilter.includes(entry.id)
  );

  const requested = arg("providers")?.split(",") as BenchmarkProviderName[] | undefined;
  const available = availableProviders();
  const providers = (requested ?? available).filter((name) => {
    if (available.includes(name)) return true;
    console.warn(`Übersprungen (keine Zugangsdaten/kein Modell gesetzt): ${name}`);
    return false;
  });

  const results: CaseResult[] = [];
  for (const testCase of cases) {
    for (const provider of providers) {
      const result = await runCase(
        provider,
        testCase,
        !process.argv.includes("--no-raw")
      );
      results.push(result);
      console.log(
        `${testCase.id.padEnd(26)} ${provider.padEnd(10)} ${result.error ? `FEHLER: ${result.error}` : `${result.shown.length} Treffer, ${result.latencyMs} ms`}`
      );
    }
  }

  const summary = summarize(results);
  console.table(
    summary.map((row) => ({
      Anbieter: row.provider,
      Fälle: row.cases,
      Fehler: row.errors,
      Korrekt: row.correct,
      "Falsch positiv": row.falsePositives,
      "Falsch negativ": row.falseNegatives,
      "K.-o.-Fehler": row.koErrors,
      "Anteil ungeprüft": `${Math.round(row.uncheckedShare * 100)} %`,
      "Ø Latenz ms": row.avgLatencyMs,
      "$ / Suche": row.costPerSearchUsd?.toFixed(4) ?? "n/a",
      "$ / korrekter Treffer": row.costPerCorrectUsd?.toFixed(4) ?? "n/a",
    }))
  );

  const outDir = path.join("benchmark", "results");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(
    outDir,
    `${new Date().toISOString().replace(/[:.]/g, "-")}.json`
  );
  fs.writeFileSync(outFile, JSON.stringify({ summary, results }, null, 2));
  console.log(`Ergebnisse: ${outFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
