/**
 * Local catalogue CLI — the same code the cron routes run, without HTTP.
 *
 *   npm run catalog:demo              fetch and evaluate everything, store nothing
 *   npm run catalog:ingest            fetch, diff and store (first run only seeds)
 *   npm run catalog:ingest -- --file export.zip   use a downloaded export
 *   npm run catalog:ingest -- --no-alert          ingest without the priority alert
 *   npm run catalog:preview           write the digest to digest.html
 *   npm run catalog:digest            actually send the digest
 *   npm run catalog:priority-preview  dry run: next priority alert → priority-alert.html
 *   npm run catalog:priority          actually send pending priority alerts
 */
import fs from "node:fs";
import { runDryRun } from "@/server/catalog/dry-run";
import { runIngest } from "@/server/catalog/ingest";
import { buildDigestPreview, runDigest } from "@/server/alerts/digest";
import {
  alertAfterIngest,
  buildPriorityAlertPreview,
  runPriorityAlert,
} from "@/server/alerts/priority";

function flag(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function isDryRun(): boolean {
  return process.argv.includes("--dry-run");
}

function percent(part: number, total: number): string {
  return total > 0 ? `${Math.round((part / total) * 100)} %` : "–";
}

async function main() {
  const command = process.argv[2];

  if (command === "demo") {
    const file = flag("file");
    const report = await runDryRun({
      archive: file ? new Uint8Array(fs.readFileSync(file)) : undefined,
      skipEu: process.argv.includes("--no-eu"),
    });

    const total = report.fetched.foerderdatenbank + report.fetched.euPortal;
    console.log(`\nGeladen: ${report.fetched.foerderdatenbank} aus der Förderdatenbank, \
${report.fetched.euPortal} EU-Calls`);
    console.log(
      `Mit Link des Fördergebers: ${report.quality.withOfficialUrl} (${percent(
        report.quality.withOfficialUrl,
        total
      )})`
    );
    console.log(
      `Mit Fördergeber: ${report.quality.withFundingBody} · mit Frist-Zitat: ${report.quality.withDeadline}`
    );
    console.log(`\nFür Unternehmen antragsberechtigt: ${report.relevance.forCompanies}`);
    console.log(
      `Davon mit mindestens einem mpool-Thema: ${report.relevance.withTopic}\n`
    );

    for (const topic of report.perTopic) {
      console.log(`  ${String(topic.matches).padStart(5)}  ${topic.label}`);
    }

    const target = flag("out") ?? "digest.html";
    fs.writeFileSync(target, report.digest.html, "utf8");
    console.log(`\nBeispiel-Digest: „${report.digest.subject}"\n→ ${target}`);
    fs.writeFileSync("priority-alert.html", report.priority.html, "utf8");
    console.log(
      `Beispiel-Prioritätsalarm: „${report.priority.subject}"\n→ priority-alert.html`
    );
    return;
  }

  if (command === "ingest") {
    const file = flag("file");
    const archive = file ? new Uint8Array(fs.readFileSync(file)) : undefined;
    const report = await runIngest({ archive });
    const priorityAlert = process.argv.includes("--no-alert")
      ? { skipped: true, reason: "--no-alert" }
      : await alertAfterIngest(report);
    console.log(JSON.stringify({ ...report, priorityAlert }, null, 2));
    return;
  }

  if (command === "preview") {
    const digest = await buildDigestPreview();
    const target = flag("out") ?? "digest.html";
    fs.writeFileSync(target, digest.html, "utf8");
    console.log(`${digest.subject}\n→ ${target}`);
    return;
  }

  if (command === "digest") {
    console.log(JSON.stringify(await runDigest(), null, 2));
    return;
  }

  // Dry run: reads the database, renders the next priority mail, sends and
  // marks nothing.
  if (command === "priority-preview" || (command === "priority" && isDryRun())) {
    const preview = await buildPriorityAlertPreview();
    const target = flag("out") ?? "priority-alert.html";
    fs.writeFileSync(target, preview.content.html, "utf8");

    for (const warning of preview.config.warnings) console.warn(warning);
    console.log(
      `${preview.content.subject}\n${preview.entries} Einträge${
        preview.sample ? " (Beispielansicht, keine offenen Treffer)" : ""
      }, ${preview.deferred} an den Wochen-Digest zurückgestellt\n→ ${target}`
    );
    return;
  }

  if (command === "priority") {
    console.log(JSON.stringify(await runPriorityAlert(), null, 2));
    return;
  }

  console.error(
    "Unbekannter Befehl. Erwartet: demo | ingest | preview | digest | priority | priority-preview"
  );
  process.exitCode = 1;
}

main().then(
  () => process.exit(process.exitCode ?? 0),
  (error) => {
    // A missing key or database URL is a setup problem, not a crash — show the
    // sentence that says what to do, and keep the stack behind --verbose.
    console.error(error instanceof Error ? `\n${error.message}\n` : error);
    if (process.argv.includes("--verbose") && error instanceof Error) {
      console.error(error.stack);
    }
    process.exit(1);
  }
);
