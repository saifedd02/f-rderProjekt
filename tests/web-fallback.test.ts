import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { runWebProviders, type WebProvider } from "@/server/search/service";
import { buildSearchPrompt } from "@/server/search/prompt";
import { normalizeStoredFavorite } from "@/lib/favorites";

const program = { id: "p", name: "Programm", facts: undefined };

function provider(
  name: WebProvider["name"],
  behaviour: "ok" | "empty" | "error",
  calls: string[]
): WebProvider {
  return {
    name,
    async search() {
      calls.push(name);
      if (behaviour === "error") throw new Error(`${name} down`);
      return { programs: behaviour === "ok" ? [program] : [], reply: "" };
    },
  };
}

describe("Web-Anbieter", () => {
  it("Perplexity-Fehler → Gemini-Fallback", async () => {
    const calls: string[] = [];
    const result = await runWebProviders(
      [provider("perplexity", "error", calls), provider("gemini", "ok", calls)],
      "prompt",
      0.1
    );
    assert.equal(result.engine, "gemini");
    assert.deepEqual(calls, ["perplexity", "gemini"]);
  });

  it("leere Perplexity-Antwort → ebenfalls Gemini-Fallback", async () => {
    const calls: string[] = [];
    const result = await runWebProviders(
      [provider("perplexity", "empty", calls), provider("gemini", "ok", calls)],
      "prompt",
      0.1
    );
    assert.equal(result.engine, "gemini");
    assert.equal(result.programs.length, 1);
  });

  it("beide Anbieter ausgefallen → leeres Ergebnis statt Fehler", async () => {
    const calls: string[] = [];
    const result = await runWebProviders(
      [provider("perplexity", "error", calls), provider("gemini", "error", calls)],
      "prompt",
      0.1
    );
    assert.equal(result.engine, "none");
    assert.deepEqual(result.programs, []);
  });
});

describe("Suchprompt", () => {
  it("Unzufriedenheit widerspricht nicht den aktiven Filtern", () => {
    const prompt = buildSearchPrompt({
      message: "Zeig mir andere Programme",
      filters: { region: "Bayern", foerderart: "Zuschuss" },
    });
    assert.doesNotMatch(prompt, /andere Förderarten/i);
    assert.doesNotMatch(prompt, /Landes- und EU-Programme/i);
    assert.match(prompt, /UNBEKANNT/);
  });
});

describe("Favoriten-Migration", () => {
  it("alte Favoriten (v2) bleiben lesbar", () => {
    const legacy = {
      program: {
        id: "db-2",
        name: "ERP-Förderkredit",
        unternehmensbranche: ["Alle"],
        isActive: true,
      },
      score: 87,
      reasons: [{ label: "Bundesweit verfügbar", matched: true }],
      savedAt: "2026-05-01T10:00:00.000Z",
      source: "datenbank",
      checkedAt: "2026-05-01",
      deadlineStatus: "active",
      confidence: "high",
    };
    const migrated = normalizeStoredFavorite(legacy);
    assert.ok(migrated);
    assert.equal(migrated.program.name, "ERP-Förderkredit");
    assert.equal("unternehmensbranche" in migrated.program, false);
    assert.equal("isActive" in migrated.program, false);
    assert.deepEqual(migrated.hints, []);
    assert.equal(normalizeStoredFavorite({ program: { id: "", name: "" } }), null);
  });
});
