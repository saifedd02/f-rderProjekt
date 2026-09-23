import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { assessTopic } from "@/lib/alerts/topic-match";
import { catalogFacts } from "@/lib/facts/catalog";
import { checkHardCriteria } from "@/lib/facts/check";
import { parseInstruments } from "@/lib/facts/instrument";
import { checkRegion, parseRegion } from "@/lib/facts/region";
import { parseSizes, sizesFromLabels } from "@/lib/facts/size";
import { statusFromDeadlineText, statusFromFdbHeader } from "@/lib/facts/status";
import { factsFromExtraction } from "@/lib/facts/web";
import { catalogToProgram } from "@/lib/catalog/to-program";
import { relevanceKeywords, scoreProgramList } from "@/lib/search/scoring";
import { TOPIC_PROFILES } from "@/config/topics";
import type { Foerderprogramm } from "@/types";
import type { ProgramFacts } from "@/types/facts";
import { catalogProgram } from "./helpers/database";

/**
 * Regression tests for the known false positives. Each case is one bug that
 * reached (or would have reached) a user. They were written before the fix.
 */

const TODAY = new Date("2026-09-23T00:00:00");

function facts(overrides: Partial<ProgramFacts> = {}): ProgramFacts {
  return {
    foerdergebiet: ["BUND"],
    foerdergeberEbene: "BUND",
    antragsstatus: "OFFEN",
    antragsberechtigte: ["UNTERNEHMEN"],
    groessen: ["KLEINST", "KLEIN", "MITTEL", "GROSS"],
    instrumente: ["ZUSCHUSS"],
    merkmale: [],
    gegenstaende: [],
    branchenausschluesse: [],
    herkunft: "KATALOG",
    ...overrides,
  };
}

function program(name: string, programFacts: ProgramFacts): Foerderprogramm {
  return {
    id: name,
    name,
    beschreibung: `${name} fördert Digitalisierung in Unternehmen.`,
    link: `https://example.org/${encodeURIComponent(name)}`,
    facts: programFacts,
  };
}

describe("Region", () => {
  it("Leuna wird nicht wegen 'eu' als EU erkannt", () => {
    assert.deepEqual(parseRegion("Leuna (Sachsen-Anhalt)"), ["ST"]);
    assert.ok(!parseRegion("Chemiepark Leuna").includes("EU"));
  });

  it("Niedersachsen passt nicht zu Sachsen", () => {
    assert.deepEqual(parseRegion("Niedersachsen"), ["NI"]);
    assert.equal(checkRegion(["NI"], "SN"), "AUSGESCHLOSSEN");
  });

  it("Sachsen passt nicht automatisch zu Sachsen-Anhalt", () => {
    assert.deepEqual(parseRegion("Sachsen-Anhalt"), ["ST"]);
    assert.equal(checkRegion(["ST"], "SN"), "AUSGESCHLOSSEN");
    assert.equal(checkRegion(["SN"], "ST"), "AUSGESCHLOSSEN");
  });

  it("international gilt nicht wegen 'national' als bundesweit", () => {
    assert.ok(!parseRegion("international").includes("BUND"));
    assert.deepEqual(parseRegion("international"), ["UNBEKANNT"]);
  });

  it("bundesweites Programm bleibt bei Länderfilter zulässig", () => {
    assert.deepEqual(parseRegion("Bundesweit"), ["BUND"]);
    assert.equal(checkRegion(["BUND"], "NW"), "GUELTIG");
  });

  it("reines Bayern-Programm wird bei NRW ausgeschlossen", () => {
    assert.equal(checkRegion(parseRegion("Bayern"), "NW"), "AUSGESCHLOSSEN");
  });

  it("NRW-Programm mit EU-Mitteln bleibt NRW", () => {
    assert.deepEqual(parseRegion("Nordrhein-Westfalen (EU-Mittel aus dem EFRE)"), ["NW"]);
    assert.deepEqual(parseRegion("NRW, kofinanziert von der EU"), ["NW"]);
    assert.equal(checkRegion(["NW"], "BY"), "AUSGESCHLOSSEN");
  });

  it("unbekannte Region bei aktivem Regionsfilter wird UNGEPRÜFT", () => {
    assert.equal(checkRegion(["UNBEKANNT"], "NW"), "UNGEPRUEFT");
    assert.equal(checkRegion([], "NW"), "UNGEPRUEFT");
  });

  it("EU-Programm bleibt bei Länderfilter zulässig", () => {
    assert.equal(checkRegion(["EU"], "NW"), "GUELTIG");
  });
});

describe("Antragsstatus", () => {
  it("Antragstellung nicht mehr möglich → GESCHLOSSEN", () => {
    assert.equal(
      statusFromFdbHeader("Förderprogramm aktiv, Antragstellung nicht mehr möglich"),
      "GESCHLOSSEN"
    );
    // The export also carries typos of the same banner.
    assert.equal(
      statusFromFdbHeader("Förderprogramm aktiv, Antagstellung nicht mehr möglich"),
      "GESCHLOSSEN"
    );
  });

  it("derzeit nicht möglich → GESCHLOSSEN", () => {
    assert.equal(
      statusFromFdbHeader("Förderprogramm aktiv, Antragsstellung derzeit nicht möglich"),
      "GESCHLOSSEN"
    );
    assert.equal(
      statusFromFdbHeader("Förderprogramm aktiv. Einreichung nicht möglich."),
      "GESCHLOSSEN"
    );
  });

  it("nur Verlängerung möglich → für Neuanträge GESCHLOSSEN", () => {
    assert.equal(
      statusFromFdbHeader(
        "Förderprogramm aktiv, ausschließlich Anträge auf Verlängerung möglich"
      ),
      "GESCHLOSSEN"
    );
  });

  it("ausgelaufen → GESCHLOSSEN", () => {
    assert.equal(statusFromFdbHeader("Förderprogramm ausgelaufen"), "GESCHLOSSEN");
  });

  it("unbekannter Status → UNBEKANNT, niemals offen", () => {
    assert.equal(
      statusFromFdbHeader("Förderleistungsbeschreibung in Überarbeitung"),
      "UNBEKANNT"
    );
    assert.equal(statusFromDeadlineText(undefined, TODAY).status, "UNBEKANNT");
    assert.equal(statusFromDeadlineText("siehe Richtlinie", TODAY).status, "UNBEKANNT");
  });

  it("laufend bis 30.06.2025 → geschlossen", () => {
    assert.equal(
      statusFromDeadlineText("laufend bis 30.06.2025", TODAY).status,
      "GESCHLOSSEN"
    );
  });

  it("zweistellige Jahreszahlen werden korrekt erkannt", () => {
    assert.equal(
      statusFromDeadlineText("Antragsfrist: 30.06.25", TODAY).status,
      "GESCHLOSSEN"
    );
    const future = statusFromDeadlineText("Einreichung bis 31.03.27", TODAY);
    assert.equal(future.status, "OFFEN");
    assert.equal(future.fristDatum, "2027-03-31");
  });

  it("Datum muss zum Fristwort gehören", () => {
    assert.equal(
      statusFromDeadlineText(
        "Richtlinie vom 01.01.2020. Anträge können laufend gestellt werden.",
        TODAY
      ).status,
      "OFFEN"
    );
  });

  it("Katalog: gsb:dateOfExpiration ist kein Programmende", () => {
    const open = catalogProgram({
      id: "fdb:offen",
      statusHeader: "",
      headerStatus: "KEIN_VERMERK",
    });
    assert.equal(catalogFacts(open, TODAY).antragsstatus, "OFFEN");

    const closed = catalogProgram({
      id: "fdb:zu",
      statusHeader: "Förderprogramm aktiv, Antragstellung nicht mehr möglich",
      headerStatus: "GESCHLOSSEN",
    });
    assert.equal(catalogFacts(closed, TODAY).antragsstatus, "GESCHLOSSEN");
  });

  it("Katalog ohne gelesenen Header (Altbestand) ist UNBEKANNT, nicht aktiv", () => {
    const legacy = catalogProgram({ id: "fdb:alt" });
    assert.equal(catalogFacts(legacy, TODAY).antragsstatus, "UNBEKANNT");
  });

  it("Web: Modellbehauptung 'aktiv' ohne Beleg bleibt UNBEKANNT", () => {
    const webFacts = factsFromExtraction(
      { name: "X", antragsstatus: "OFFEN", frist: "" },
      TODAY
    );
    assert.equal(webFacts.antragsstatus, "UNBEKANNT");

    const withDate = factsFromExtraction(
      { name: "X", antragsstatus: "OFFEN", frist: "Einreichungsfrist 15.01.2027" },
      TODAY
    );
    assert.equal(withDate.antragsstatus, "OFFEN");
  });
});

describe("Antragsberechtigung", () => {
  it("Smart-Cities nur für Kommunen erscheint nicht bei Unternehmenssuche", () => {
    const smartCity = catalogToProgram(
      catalogProgram({
        id: "fdb:smart-cities",
        name: "Modellprojekte Smart Cities",
        summary: "Förderung von Smart-City-Strategien und Digitalisierung in Kommunen.",
        categories: ["smart_cities_regionen", "digitalisierung"],
        eligibleParties: ["Kommune"],
        headerStatus: "KEIN_VERMERK",
      }),
      TODAY
    );
    const results = scoreProgramList({
      programs: [smartCity],
      textQuery: "Smart City Digitalisierung",
      source: "datenbank",
      today: TODAY,
    });
    assert.equal(results.length, 0);
  });
});

describe("Unternehmensgröße", () => {
  it("KMU-only erscheint nicht bei Großunternehmen", () => {
    const kmu = facts({ groessen: ["KLEINST", "KLEIN", "MITTEL"] });
    assert.equal(
      checkHardCriteria(kmu, { groessen: ["GROSS"] }).verdict,
      "AUSGESCHLOSSEN"
    );
  });

  it("leere Größenangabe ist nicht ALLE", () => {
    assert.deepEqual(sizesFromLabels([]), ["UNBEKANNT"]);
    const unknown = facts({ groessen: ["UNBEKANNT"] });
    assert.equal(
      checkHardCriteria(unknown, { groessen: ["GROSS"] }).verdict,
      "UNGEPRUEFT"
    );
  });

  it("KMU → Kleinst + Klein + Mittel", () => {
    assert.deepEqual(parseSizes("KMU"), ["KLEINST", "KLEIN", "MITTEL"]);
  });

  it("Unternehmen allein ist nicht automatisch GROSS", () => {
    assert.deepEqual(parseSizes("Unternehmen"), ["UNBEKANNT"]);
  });

  it("Mittelstand ist nicht automatisch MITTEL", () => {
    assert.deepEqual(parseSizes("Mittelstand"), ["UNBEKANNT"]);
    assert.deepEqual(parseSizes("mittelständische Unternehmen"), ["UNBEKANNT"]);
  });
});

describe("Förderart", () => {
  it("Förderkredit → Kredit/Darlehen", () => {
    assert.deepEqual(parseInstruments("ERP-Förderkredit").instrumente, ["DARLEHEN"]);
  });

  it("Garantie passt zu Bürgschaft/Garantie", () => {
    const garantie = facts({ instrumente: ["GARANTIE"] });
    assert.equal(
      checkHardCriteria(garantie, { instrumente: ["BUERGSCHAFT", "GARANTIE"] }).verdict,
      "GUELTIG"
    );
  });

  it("Darlehen + Zuschuss kann mehreren Instrumenten zugeordnet sein", () => {
    const parsed = parseInstruments("Darlehen mit Zuschuss").instrumente;
    assert.deepEqual([...parsed].sort(), ["DARLEHEN", "ZUSCHUSS"]);
  });

  it("Tilgungszuschuss ist ein Merkmal, kein Zuschuss", () => {
    const parsed = parseInstruments("Kredit mit Tilgungszuschuss");
    assert.deepEqual(parsed.instrumente, ["DARLEHEN"]);
    assert.deepEqual(parsed.merkmale, ["TILGUNGSZUSCHUSS"]);
  });

  it("100 % Förderung ist keine Förderart", () => {
    assert.deepEqual(parseInstruments("100 % Förderung").instrumente, ["UNBEKANNT"]);
  });
});

describe("UNBEKANNT und Prüfung", () => {
  it("unbekannte harte Kriterien führen nie zu GÜLTIG", () => {
    const unknown = facts({
      foerdergebiet: ["UNBEKANNT"],
      antragsstatus: "UNBEKANNT",
      antragsberechtigte: ["UNBEKANNT"],
      groessen: ["UNBEKANNT"],
      instrumente: ["UNBEKANNT"],
    });
    assert.equal(checkHardCriteria(unknown, {}).verdict, "UNGEPRUEFT");
    assert.equal(
      checkHardCriteria(unknown, {
        region: "NW",
        groessen: ["KLEIN"],
        instrumente: ["ZUSCHUSS"],
      }).verdict,
      "UNGEPRUEFT"
    );
    assert.equal(
      checkHardCriteria(facts({ antragsstatus: "UNBEKANNT" }), {}).verdict,
      "UNGEPRUEFT"
    );
  });

  it("geschlossene Programme sind immer ausgeschlossen", () => {
    assert.equal(
      checkHardCriteria(facts({ antragsstatus: "GESCHLOSSEN" }), {}).verdict,
      "AUSGESCHLOSSEN"
    );
  });

  it("Extraktion übernimmt Nutzerfilter nicht als Wahrheit", () => {
    const webFacts = factsFromExtraction({ name: "X" }, TODAY);
    assert.deepEqual(webFacts.foerdergebiet, ["UNBEKANNT"]);
    assert.deepEqual(webFacts.groessen, ["UNBEKANNT"]);
    assert.deepEqual(webFacts.instrumente, ["UNBEKANNT"]);
    assert.deepEqual(webFacts.antragsberechtigte, ["UNBEKANNT"]);
  });
});

describe("Relevanz", () => {
  it("Score enthält keine Punkte mehr für harte Kriterien", () => {
    const bund = program("Programm A", facts({ foerdergebiet: ["BUND"] }));
    const nrw = program("Programm B", facts({ foerdergebiet: ["NW"] }));
    const scored = scoreProgramList({
      programs: [bund, nrw],
      filters: {
        region: "Nordrhein-Westfalen",
        unternehmensgroesse: "Kleines Unternehmen",
        foerderart: "Zuschuss",
      },
      textQuery: "Digitalisierung",
      source: "datenbank",
      today: TODAY,
    });
    assert.equal(scored.length, 2);
    assert.equal(scored[0].score, scored[1].score);
  });

  it("Schlüsselwörter aus Region, Größe und Förderart zählen nicht als Thema", () => {
    assert.deepEqual(
      relevanceKeywords(
        "Digitalisierung für ein kleines Unternehmen in NRW als Zuschuss"
      ),
      ["digitalisierung"]
    );
  });

  it("gültige Treffer stehen vor ungeprüften", () => {
    const unchecked = program("Unklar", facts({ antragsstatus: "UNBEKANNT" }));
    const valid = program("Klar", facts());
    const scored = scoreProgramList({
      programs: [unchecked, valid],
      textQuery: "Digitalisierung",
      source: "datenbank",
      today: TODAY,
    });
    assert.deepEqual(
      scored.map((entry) => [entry.program.name, entry.verdict]),
      [
        ["Klar", "GUELTIG"],
        ["Unklar", "UNGEPRUEFT"],
      ]
    );
  });
});

describe("Relevanz nach Textzonen", () => {
  it("Nebenerwähnung zählt weniger als das Kernthema und gibt keinen Themen-Hinweis", () => {
    const core = {
      ...program("Digitalbonus", facts()),
      beschreibung: "Zuschuss für die Digitalisierung kleiner Unternehmen.",
    };
    const side = {
      ...program("Modernisierung von Binnenschiffen", facts()),
      beschreibung:
        "Gefördert wird die Modernisierung von Binnenschiffen. Dazu zählen Antriebe, Abgasnachbehandlung und Digitalisierung.",
    };
    const [first, second] = scoreProgramList({
      programs: [side, core],
      textQuery: "Digitalisierung",
      source: "datenbank",
      today: TODAY,
    });
    assert.equal(first.program.name, "Digitalbonus");
    assert.ok(first.score > second.score);
    assert.ok(!second.hints.some((hint) => hint.startsWith("Thema passt")));
  });
});

describe("Förderbereich", () => {
  const digital = TOPIC_PROFILES.find((topic) => topic.id === "digitalisierung")!;

  it("einfache Verneinung ist kein positiver Treffer", () => {
    const result = assessTopic(
      {
        name: "Investitionszuschuss Gewerbe",
        summary: "Digitalisierung wird nicht gefördert.",
        sections: [],
        categories: [],
      },
      digital
    );
    assert.equal(result, "KEINE_AUSSAGE");
  });

  it("Thema im Kern → PASST", () => {
    const result = assessTopic(
      {
        name: "Digitalbonus",
        summary: "Zuschuss für Digitalisierung und IT-Sicherheit.",
        sections: [],
        categories: ["digitalisierung"],
      },
      digital
    );
    assert.equal(result, "PASST");
  });
});
