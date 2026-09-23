import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import { parseProgramDocument } from "@/lib/catalog/parse-fdb";
import { catalogFacts } from "@/lib/facts/catalog";
import { extractIndustryExclusions } from "@/lib/facts/exclusions";
import { adoptCatalogFacts } from "@/lib/search/catalog-match";
import { catalogToProgram } from "@/lib/catalog/to-program";
import { factsFromExtraction } from "@/lib/facts/web";
import { runIngest } from "@/server/catalog/ingest";
import { searchCatalog } from "@/server/catalog/repository";
import { isAlertable } from "@/server/catalog/ingest";
import type { Foerderprogramm } from "@/types";
import {
  catalogProgram,
  createTestDatabase,
  type TestDatabase,
} from "./helpers/database";

const TODAY = new Date("2026-09-23T00:00:00");

/** A minimal Förderdatenbank program document, as the export ships it. */
function fdbXml({
  header = "",
  sizes = [] as string[],
  regions = ["nordrhein_westfalen"],
  expiration,
}: {
  header?: string;
  sizes?: string[];
  regions?: string[];
  expiration?: string;
}): string {
  const rich = (html: string) =>
    `<text>&lt;![CDATA[&lt;div&gt;${html}&lt;/div&gt;]]&gt;</text>`;
  const category = (group: string, slug: string) =>
    `<link xlink:href="target:/BMWI/FDB/Categories/FDB/${group}/${slug}"/>`;
  const list = (group: string, slugs: string[]) =>
    `<classifiedLinkList><classifierLinks><link xlink:href="target:/BMWI/FDB/Classifiers/${group}"/></classifierLinks><links>${slugs
      .map((slug) => category(group, slug))
      .join("")}</links></classifiedLinkList>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<document path="/BMWI/FDB/Content/DE/Foerderprogramm/Land/NRW" name="testprogramm" xmlns:xlink="http://www.w3.org/1999/xlink">
  <property name="gsb:title" type="RichText">${rich("Testprogramm Digitalisierung")}</property>
  <property name="gsb:header" type="RichText">${rich(header ? `&lt;p&gt;&lt;strong&gt;${header}&lt;/strong&gt;&lt;/p&gt;` : "")}</property>
  <property name="gsb:summary" type="RichText">${rich("Zuschuss für die Digitalisierung kleiner Unternehmen. Ausgenommen sind Unternehmen der Fischerei und Aquakultur sowie der Primärerzeugung landwirtschaftlicher Erzeugnisse.")}</property>
  ${expiration ? `<property name="gsb:dateOfExpiration" type="Date"><value>${expiration}</value></property>` : ""}
  <property name="gsb:cl2Processes" type="ClassifiedLinkLists"><classifiedLinkLists>
    ${list("Foerdergebiet", regions)}
    ${list("Foerderart", ["zuschuss"])}
    ${list("Foerderberechtigte", ["unternehmen"])}
    ${sizes.length ? list("Unternehmensgroesse", sizes) : ""}
    ${list("Foerderbereich", ["digitalisierung"])}
  </classifiedLinkLists></property>
</document>`;
}

const REFS = { externalUrls: new Map(), fundingBodies: new Map() };

describe("Förderdatenbank-Parser", () => {
  it("liest gsb:header als Antragsstatus", () => {
    const closed = parseProgramDocument(
      fdbXml({ header: "Förderprogramm aktiv, Antragstellung nicht mehr möglich" }),
      REFS
    )!;
    assert.equal(closed.headerStatus, "GESCHLOSSEN");
    assert.equal(catalogFacts(closed, TODAY).antragsstatus, "GESCHLOSSEN");

    const open = parseProgramDocument(fdbXml({}), REFS)!;
    assert.equal(open.headerStatus, "KEIN_VERMERK");
    assert.equal(catalogFacts(open, TODAY).antragsstatus, "OFFEN");
  });

  it("gsb:dateOfExpiration beendet kein Programm", () => {
    const parsed = parseProgramDocument(fdbXml({ expiration: "2020-01-01" }), REFS)!;
    assert.equal(catalogFacts(parsed, TODAY).antragsstatus, "OFFEN");
  });

  it("leere Unternehmensgröße bleibt UNBEKANNT, Region wird Code", () => {
    const parsed = parseProgramDocument(fdbXml({}), REFS)!;
    const programFacts = catalogFacts(parsed, TODAY);
    assert.deepEqual(programFacts.groessen, ["UNBEKANNT"]);
    assert.deepEqual(programFacts.foerdergebiet, ["NW"]);
    assert.equal(programFacts.foerdergeberEbene, "LAND");
  });

  it("erfasst nur ausdrückliche Branchenausschlüsse", () => {
    const parsed = parseProgramDocument(fdbXml({}), REFS)!;
    assert.deepEqual([...catalogFacts(parsed, TODAY).branchenausschluesse].sort(), [
      "FISCHEREI_AQUAKULTUR",
      "LANDWIRTSCHAFT",
    ]);
  });

  it("Kategorie-Slugs werden als lesbare Förderbereiche angezeigt", () => {
    const parsed = parseProgramDocument(fdbXml({}), REFS)!;
    const card = catalogToProgram(parsed, TODAY);
    assert.equal(card.foerderbereich, "Digitalisierung");
    assert.equal(card.region, "Nordrhein-Westfalen");
  });
});

describe("Web-Treffer und Katalog", () => {
  it("Katalogfakten überschreiben Web-Freitext", () => {
    const catalog = catalogToProgram(
      catalogProgram({
        id: "fdb:erp-digital",
        name: "ERP-Förderkredit Digitalisierung und Innovation",
        regions: ["Bundesweit"],
        fundingTypes: ["Kredit / Darlehen"],
        officialUrl: "https://www.kfw.de/inlandsfoerderung/Unternehmen/Digitalisierung/",
        headerStatus: "KEIN_VERMERK",
      }),
      TODAY
    );
    const web: Foerderprogramm = {
      id: "web-erp",
      name: "ERP-Förderkredit Digitalisierung und Innovation",
      region: "Nordrhein-Westfalen",
      foerderart: "Zuschuss",
      link: "https://www.kfw.de/inlandsfoerderung/Unternehmen/Digitalisierung/",
      facts: factsFromExtraction(
        { name: "ERP", foerdergebiet: ["NW"], instrumente: ["ZUSCHUSS"] },
        TODAY
      ),
    };

    const [adopted] = adoptCatalogFacts([web], [catalog]);
    assert.deepEqual(adopted.facts?.foerdergebiet, ["BUND"]);
    assert.deepEqual(adopted.facts?.instrumente, ["DARLEHEN"]);
    assert.equal(adopted.facts?.herkunft, "KATALOG");
    assert.equal(adopted.region, "Ganz Deutschland");
  });
});

describe("Katalog in Postgres", () => {
  let database: TestDatabase;

  beforeEach(async () => {
    database = await createTestDatabase();
  });
  afterEach(async () => {
    await database.close();
  });

  it("reale Anfrage im Satzformat liefert Katalogkandidaten", async () => {
    const digital = catalogProgram({
      id: "fdb:digitalbonus",
      name: "Digitalbonus NRW",
      summary: "Zuschüsse für die Digitalisierung von kleinen Unternehmen.",
      regions: ["Nordrhein-Westfalen"],
      categories: ["digitalisierung"],
      headerStatus: "KEIN_VERMERK",
    });
    const other = catalogProgram({
      id: "fdb:kunst",
      name: "Förderung von Kunstvereinen",
      summary: "Zuschüsse für Kunstvereine.",
      regions: ["Bayern"],
      categories: ["kultur_medien_sport"],
      headerStatus: "KEIN_VERMERK",
    });
    await runIngest({
      loaders: {
        foerderdatenbank: async () => [digital, other],
        "eu-portal": async () => [],
      },
    });

    const hits = await searchCatalog({
      text: "Digitalisierungsförderung für ein kleines IT-Unternehmen in NRW",
      limit: 10,
    });
    assert.deepEqual(
      hits.map((hit) => hit.id),
      ["fdb:digitalbonus"]
    );
  });

  it("Schema-Änderung löst einen Migrationslauf ohne Meldungen aus", async () => {
    const program = catalogProgram({
      id: "fdb:digitalbonus",
      name: "Digitalisierungsbonus",
      summary: "Förderung der Digitalisierung und Automatisierung.",
      categories: ["digitalisierung"],
    });
    const loaders = (programs: (typeof program)[]) => ({
      loaders: { foerderdatenbank: async () => programs, "eu-portal": async () => [] },
    });

    await runIngest(loaders([program]));
    // Simulate a catalogue written by the previous code: no schema version.
    await database.query(`UPDATE catalog_runs SET report = report - 'schemaVersion'`);

    const rewritten = {
      ...program,
      headerStatus: "KEIN_VERMERK" as const,
      contentHash: "neu",
    };
    const fresh = catalogProgram({
      id: "fdb:neu",
      name: "Digitalisierung und KI im Mittelstand",
      summary: "Zuschuss für Digitalisierung und künstliche Intelligenz.",
      categories: ["digitalisierung"],
    });
    const migration = await runIngest(loaders([rewritten, fresh]));

    assert.equal(migration.seeded, true);
    assert.equal((await database.query("SELECT id FROM catalog_changes")).length, 0);

    // The run after the migration is a normal one again.
    const next = await runIngest(loaders([rewritten, fresh]));
    assert.equal(next.seeded, false);
  });
});

describe("Alerts nutzen dieselbe Prüfung", () => {
  it("geschlossene und reine Kommunalprogramme werden nicht gemeldet", () => {
    assert.equal(
      isAlertable(catalogProgram({ id: "a", headerStatus: "GESCHLOSSEN" }), TODAY),
      false
    );
    assert.equal(
      isAlertable(
        catalogProgram({
          id: "b",
          eligibleParties: ["Kommune"],
          headerStatus: "KEIN_VERMERK",
        }),
        TODAY
      ),
      false
    );
    assert.equal(
      isAlertable(catalogProgram({ id: "c", headerStatus: "KEIN_VERMERK" }), TODAY),
      true
    );
  });
});

describe("Fristsätze der Förderdatenbank", () => {
  const withDeadline = (deadline: string) =>
    catalogFacts(
      catalogProgram({ id: "fdb:x", headerStatus: "KEIN_VERMERK", deadline }),
      TODAY
    );

  it("eindeutiges Geltungsende schließt", () => {
    assert.equal(
      withDeadline("Sie ist befristet bis zum 31. Dezember 2023.").antragsstatus,
      "GESCHLOSSEN"
    );
    assert.equal(
      withDeadline("Anträge können maximal bis zum 30.06.2024 gestellt werden.")
        .antragsstatus,
      "GESCHLOSSEN"
    );
  });

  it("Sonderfälle und fremde Daten schließen nicht, sondern bleiben unklar", () => {
    for (const sentence of [
      "Bei Anträgen, die bis zum 31.12.2021 gestellt werden, wird eine Pauschale von 15 v.H. gewährt.",
      "Abweichend von Satz 1 können im Jahr 2022 Anträge zusätzlich bis zum 30. September 2022 eingereicht werden.",
      "Die Kosten sind nach der bis zum 31. Dezember 2017 geltenden Fassung zu erheben.",
    ]) {
      assert.equal(withDeadline(sentence).antragsstatus, "UNBEKANNT", sentence);
    }
  });

  it("Aufbewahrungsfristen öffnen nichts und setzen kein Fristdatum", () => {
    const facts = withDeadline(
      "Die Belege sind mindestens bis zum 31.12.2030 aufzubewahren."
    );
    assert.equal(facts.antragsstatus, "OFFEN");
    assert.equal(facts.fristDatum, undefined);
  });

  it("aufgezählte Termine gehören zur Frist davor", () => {
    const facts = withDeadline(
      "Eine Antragsstellung ist jeweils bis zum 14.04.2026, 07.07.2026 und 29.09.2026 möglich."
    );
    assert.equal(facts.antragsstatus, "OFFEN");
    assert.equal(facts.fristDatum, "2026-09-29");
  });
});

describe("Branchenausschlüsse", () => {
  it("Fondsnamen und Kostenpositionen sind keine Branchenausschlüsse", () => {
    assert.deepEqual(
      extractIndustryExclusions(
        "Von der Förderung ausgeschlossen sind Vorhaben, die aus dem Europäischen Meeres-, Fischerei- und Aquakulturfonds gefördert werden."
      ),
      []
    );
    assert.deepEqual(
      extractIndustryExclusions(
        "Nicht förderfähig sind Versicherungen und Ausgaben für landwirtschaftliche Flächen."
      ),
      []
    );
  });

  it("eine Aufzählung nach Doppelpunkt wird vollständig erfasst", () => {
    assert.deepEqual(
      extractIndustryExclusions(
        "Ausgeschlossen sind Investitionstätigkeiten in den Sektoren:\nFischerei und Aquakultur\nSchiffbau\nTabakindustrie"
      ).sort(),
      ["FISCHEREI_AQUAKULTUR", "SCHIFFBAU", "TABAK"]
    );
  });

  it("ein Programm für eine Branche schließt diese Branche nicht aus", () => {
    assert.deepEqual(
      extractIndustryExclusions(
        "Nicht förderfähig sind Beratungen in den Bereichen Verarbeitung landwirtschaftlicher Erzeugnisse.",
        "Förderung der Beratung in der Landwirtschaft"
      ),
      []
    );
  });

  it("ohne ausdrücklichen Ausschluss wird nichts erfunden", () => {
    assert.deepEqual(
      extractIndustryExclusions(
        "Gefördert werden Unternehmen der Landwirtschaft und Fischerei."
      ),
      []
    );
  });
});
