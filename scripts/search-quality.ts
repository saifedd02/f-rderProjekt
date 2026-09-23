import { runProgramSearch, type SearchEngine } from "../src/server/search/service";

const CASES = [
  "Digitalisierungszuschüsse für ein Maschinenbau-KMU in Bayern",
  "Energieeffizienz und Abwärmenutzung für einen Metallbetrieb in NRW",
  "Förderung für KI-Einführung in einem mittelständischen Produktionsunternehmen",
  "Investitionsförderung für Automatisierung in Baden-Württemberg",
  "Forschungsförderung für Robotik und neue Fertigungsverfahren",
  "Förderprogramme für Cybersecurity in einem kleinen Unternehmen",
  "Kredit oder Zuschuss für eine neue Photovoltaikanlage im Gewerbe",
  "Förderung für Weiterbildung und Qualifizierung von Produktionsmitarbeitern",
  "EU-Förderung für ein grenzüberschreitendes Industrie-4.0-Projekt",
  "Förderung für Ressourceneffizienz und Materialeinsparung in der Fertigung",
  "Programme für Unternehmensgründung im Bereich industrielle KI",
  "Exportförderung für einen deutschen Maschinenbauer",
  "Förderung für Wärmepumpe und Gebäudesanierung eines Gewerbebetriebs",
  "Innovationsgutschein für Produktentwicklung in Bayern",
  "Förderung für Elektromobilität und betriebliche Ladeinfrastruktur",
  "Programme für große Industrieunternehmen mit mehr als 250 Beschäftigten",
  "Förderung für Kreislaufwirtschaft und Recycling in Metallunternehmen",
  "ZIM-Förderung für Kooperation zwischen KMU und Hochschule",
  "Förderung für Digitalisierung im Handwerk",
  "Programme für Prozessoptimierung und digitale Zwillinge",
  "Förderung für Wasserstofftechnologie in der Industrie",
  "Finanzierung für eine energieeffiziente neue Produktionshalle",
  "Förderung für Patente und Schutzrechte bei KMU",
  "Programme zur Fachkräftesicherung und beruflichen Weiterbildung",
  "Förderung für Cloud-Migration und moderne ERP-Systeme",
  "Förderung für industrielle Forschung ohne KMU-Beschränkung",
  "Programme für Nachhaltigkeitsberatung und CO2-Bilanzierung",
  "Förderung für Unternehmensnachfolge in einem Produktionsbetrieb",
  "Förderprogramme für ländliche Regionen in Niedersachsen",
  "Aktuell neu veröffentlichte Förderprogramme für deutsche Industrie-KMU",
] as const;

const requested = process.argv.find((arg) => arg.startsWith("--engine="))?.split("=")[1];
const engine: "auto" | SearchEngine =
  requested === "perplexity" || requested === "gemini" || requested === "none"
    ? requested
    : "auto";
const all = process.argv.includes("--all");
const selected = all ? CASES : CASES.slice(0, 1);

async function main() {
  const rows = [];
  for (const query of selected) {
    const started = Date.now();
    const result = await runProgramSearch({ message: query, engine });
    rows.push({
      query,
      engine: result.stats.searchEngine,
      latencyMs: Date.now() - started,
      results: result.stats.total,
      liveVerifiedLinks: result.stats.linksVerified,
      fromCatalog: result.stats.fromCatalog,
      names: result.programs.map(({ program }) => program.name),
    });
  }

  console.log(JSON.stringify({ generatedAt: new Date().toISOString(), rows }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
