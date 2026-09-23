import { MAX_PROGRAM_RESULTS } from "@/config/app";
import { hasPerplexityApiKey } from "@/lib/ai/perplexity";
import {
  adoptCatalogFacts,
  buildSearchReply,
  canonicalUrl,
  compareResults,
  scoreProgramList,
} from "@/lib/search";
import { getTodayIso } from "@/lib/utils/date";
import { createLogger } from "@/lib/utils/logger";
import { normalizeText } from "@/lib/utils/text";
import type {
  ChatHistoryEntry,
  Foerderprogramm,
  ProgramSource,
  ScoredProgram,
  SearchFilters,
} from "@/types";
import { lookupCatalogForWeb, searchCatalogPrograms } from "@/server/catalog/search";
import { verifyProgramLinks } from "./link-health";
import { buildSearchPrompt, getSearchTemperature } from "./prompt";
import { searchWithGemini, searchWithPerplexity, type ProviderResult } from "./providers";

/**
 * Program search — orchestration.
 *
 *   candidates   catalogue (structured facts) + web search (extracted facts)
 *   adopt        a web hit the catalogue knows takes over the catalogue's facts
 *   check        hard criteria, deterministic (`checkHardCriteria`)
 *   rank         relevance only, confirmed before unchecked
 *   verify       live link check; a page announcing a stop closes the program
 *
 * The model still only proposes. Nothing it says reaches the user unchecked.
 */

const log = createLogger("Search");

export type SearchEngine = "perplexity" | "gemini" | "none";

export interface ProgramSearchInput {
  message: string;
  filters?: Partial<SearchFilters>;
  history?: ChatHistoryEntry[];
  /** Program names already shown in this session; filtered out of the results. */
  shownPrograms?: string[];
  /** Internal evaluation override; the UI normally leaves this on auto. */
  engine?: "auto" | SearchEngine;
}

export interface ProgramSearchResult {
  reply: string;
  programs: ScoredProgram[];
  stats: {
    total: number;
    searchEngine: SearchEngine;
    linksVerified: number;
    /** How many of the shown programs came from our own catalogue. */
    fromCatalog: number;
  };
}

function hasGeminiApiKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/**
 * Run a program search end to end.
 *
 * Never throws for search failures: a provider outage yields the catalogue's
 * answer (or zero programs) and an honest reply rather than an error screen.
 */
export async function runProgramSearch({
  message,
  filters,
  history = [],
  shownPrograms = [],
  engine = "auto",
}: ProgramSearchInput): Promise<ProgramSearchResult> {
  const checkedAt = getTodayIso();
  const alreadyShown = new Set(shownPrograms.map((name) => name.toLowerCase().trim()));

  // The cap is applied AFTER dropping what the user has already seen.
  const rank = (programs: Foerderprogramm[], source: ProgramSource): ScoredProgram[] =>
    scoreProgramList({
      programs,
      filters,
      textQuery: message,
      source,
      checkedAt,
      sourceUrls: [], // per-program sources only — never a shared global list
      limit: Number.MAX_SAFE_INTEGER,
    }).filter((scored) => !alreadyShown.has(scored.program.name.toLowerCase().trim()));

  const [catalogPrograms, web] = await Promise.all([
    searchCatalogPrograms({ message, filters }),
    runWebSearch(message, filters, history, shownPrograms, engine),
  ]);

  // Catalogue facts beat web free text: first against today's candidates,
  // then against the whole catalogue by exact name/URL.
  const knownCatalog = [...catalogPrograms, ...(await lookupCatalogForWeb(web.programs))];
  const webPrograms = adoptCatalogFacts(web.programs, knownCatalog);
  const hybrid = webPrograms.filter((program) => program.facts?.herkunft === "KATALOG");
  const webOnly = webPrograms.filter((program) => program.facts?.herkunft !== "KATALOG");

  const fromCatalog = rank(catalogPrograms, "datenbank");
  const fromWeb = [...rank(hybrid, "hybrid"), ...rank(webOnly, "websuche")];

  const checkedPrograms = await verifyProgramLinks(
    mergeResults(fromCatalog, fromWeb).slice(0, MAX_PROGRAM_RESULTS)
  );
  const programs = checkedPrograms.filter(
    (scored) =>
      scored.linkVerified === true &&
      scored.program.facts?.antragsstatus !== "GESCHLOSSEN"
  );

  return {
    reply: buildSearchReply(programs, filters, message),
    programs,
    stats: {
      total: programs.length,
      searchEngine: web.engine,
      linksVerified: programs.filter((scored) => scored.linkVerified === true).length,
      fromCatalog: programs.filter((scored) => scored.source !== "websuche").length,
    },
  };
}

/**
 * Merge both sources: confirmed before unchecked, then by relevance.
 *
 * On a duplicate the catalogue entry wins regardless of score: it carries the
 * funding body's own maintained link and structured facts.
 *
 * A duplicate is the same normalised name, the same catalogue record, or a web
 * result pointing at the page a catalogue entry links to. Results that merely
 * share a link are NOT merged otherwise: the model often cites one overview
 * page for several distinct programs (KfW 077 and 365/366 both on the
 * "Gründen" page), and collapsing those would silently drop a real program.
 */
export function mergeResults(
  fromCatalog: ScoredProgram[],
  fromWeb: ScoredProgram[]
): ScoredProgram[] {
  const merged: ScoredProgram[] = [];
  const seenNames = new Set<string>();
  const seenCatalogIds = new Set<string>();
  const catalogUrls = new Set<string>();

  for (const scored of fromCatalog) {
    const name = normalizeText(scored.program.name);
    if (seenNames.has(name)) continue;
    seenNames.add(name);
    if (scored.program.catalogId) seenCatalogIds.add(scored.program.catalogId);
    const url = canonicalUrl(scored.program.link);
    if (url) catalogUrls.add(url);
    merged.push(scored);
  }

  for (const scored of fromWeb) {
    const name = normalizeText(scored.program.name);
    const url = canonicalUrl(scored.program.link);
    const catalogId = scored.program.catalogId;
    if (
      seenNames.has(name) ||
      (url && catalogUrls.has(url)) ||
      (catalogId && seenCatalogIds.has(catalogId))
    ) {
      continue;
    }
    seenNames.add(name);
    if (catalogId) seenCatalogIds.add(catalogId);
    merged.push(scored);
  }

  return merged.sort(compareResults);
}

export interface WebProvider {
  name: Exclude<SearchEngine, "none">;
  search: (prompt: string, temperature: number) => Promise<ProviderResult>;
}

export interface WebSearchOutcome {
  programs: Foerderprogramm[];
  engine: SearchEngine;
}

/**
 * Try the providers in order. An error AND an empty/unusable answer both hand
 * over to the next one — an empty Sonar reply is as useless as a 500. If every
 * provider fails the result is empty, and the catalogue still answers.
 */
export async function runWebProviders(
  providers: WebProvider[],
  prompt: string,
  temperature: number
): Promise<WebSearchOutcome> {
  for (const provider of providers) {
    try {
      log.info(`Websuche über ${provider.name}`);
      const result = await provider.search(prompt, temperature);
      if (result.programs.length > 0) {
        return { programs: result.programs, engine: provider.name };
      }
      log.warn(
        `${provider.name} lieferte keine verwertbaren Programme — nächster Anbieter`
      );
    } catch (error) {
      log.error(`${provider.name} fehlgeschlagen:`, error);
    }
  }
  return { programs: [], engine: "none" };
}

const PROVIDERS: Record<WebProvider["name"], WebProvider> = {
  gemini: { name: "gemini", search: searchWithGemini },
  perplexity: { name: "perplexity", search: searchWithPerplexity },
};

/** The configured order: WEB_SEARCH_PRIMARY first (default Gemini), the other as fallback. */
function providerOrder(requested: "auto" | SearchEngine): WebProvider[] {
  if (requested === "none") return [];
  const available = (["gemini", "perplexity"] as const).filter((name) =>
    name === "gemini" ? hasGeminiApiKey() : hasPerplexityApiKey()
  );
  if (requested !== "auto") {
    // An explicit engine still falls back, so a benchmark run never hides an outage.
    return [requested, ...available.filter((name) => name !== requested)]
      .filter((name) => available.includes(name))
      .map((name) => PROVIDERS[name]);
  }
  const primary: WebProvider["name"] =
    process.env.WEB_SEARCH_PRIMARY === "perplexity" ? "perplexity" : "gemini";
  return [primary, ...available.filter((name) => name !== primary)]
    .filter((name) => available.includes(name))
    .map((name) => PROVIDERS[name]);
}

/** The web-search half. Never throws. */
async function runWebSearch(
  message: string,
  filters: Partial<SearchFilters> | undefined,
  history: ChatHistoryEntry[],
  shownPrograms: string[],
  requestedEngine: "auto" | SearchEngine
): Promise<WebSearchOutcome> {
  const providers = providerOrder(requestedEngine);
  if (providers.length === 0) return { programs: [], engine: "none" };

  const prompt = buildSearchPrompt({ message, filters, history, shownPrograms });
  const temperature = getSearchTemperature(message, history.length);
  return runWebProviders(providers, prompt, temperature);
}
