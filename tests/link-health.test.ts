import assert from "node:assert/strict";
import test from "node:test";

import {
  checkLinkHealth,
  checkProgramLinkEvidence,
} from "../src/server/search/link-health";
import { isGenericLink } from "../src/lib/search/links";

const response = (status: number) => new Response("", { status });

test("erreichbarer Link wird live bestätigt", async () => {
  const fetcher = async () => response(200);
  assert.equal(await checkLinkHealth("https://example.org/program", fetcher), "verified");
});

test("HEAD-Fehler wird mit GET geprüft", async () => {
  const methods: string[] = [];
  const fetcher = async (_url: string | URL | Request, init?: RequestInit) => {
    methods.push(init?.method || "GET");
    return response(init?.method === "HEAD" ? 405 : 200);
  };
  assert.equal(await checkLinkHealth("https://example.org/program", fetcher), "verified");
  assert.deepEqual(methods, ["HEAD", "GET"]);
});

test("bestätigter 404-Link gilt als tot, Sperre nur als unbekannt", async () => {
  const dead = async () => response(404);
  const blocked = async () => response(403);
  assert.equal(await checkLinkHealth("https://example.org/dead", dead), "dead");
  assert.equal(await checkLinkHealth("https://example.org/blocked", blocked), "unknown");
});

test("erreichbare fremde Programmseite gilt nicht als fachlich bestätigt", async () => {
  const fetcher = async () =>
    new Response("<html><body>Bayerischer Energiekredit Produktion</body></html>", {
      status: 200,
      headers: { "content-type": "text/html" },
    });
  const evidence = await checkProgramLinkEvidence(
    "https://example.org/energiekredit",
    "Bundesförderung Energie- und Ressourceneffizienz Modul 4",
    fetcher
  );
  assert.equal(evidence?.matchesProgram, false);
});

test("Programmname und Antragsstopp werden auf offizieller Seite erkannt", async () => {
  const fetcher = async () =>
    new Response(
      "<html><body>Zentrales Innovationsprogramm Mittelstand. Befristeter Antragsstopp.</body></html>",
      { status: 200, headers: { "content-type": "text/html" } }
    );
  const evidence = await checkProgramLinkEvidence(
    "https://example.org/zim",
    "Zentrales Innovationsprogramm Mittelstand",
    fetcher
  );
  assert.deepEqual(evidence, { matchesProgram: true, paused: true });
});

test("Startseite eines offiziellen Portals ist keine konkrete Programmseite", () => {
  assert.equal(isGenericLink("https://www.nrwbank.de"), true);
  assert.equal(isGenericLink("https://www.efre.nrw.de/"), true);
  assert.equal(
    isGenericLink(
      "https://www.ibb.de/de/foerderprogramme/pro-fit-projektfinanzierung.html"
    ),
    false
  );
});
