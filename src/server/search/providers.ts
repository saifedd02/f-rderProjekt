import { generateGroundedJson } from "@/lib/ai/gemini";
import { searchFoerderprogramme, type PerplexitySource } from "@/lib/ai/perplexity";
import { instrumentLabel } from "@/lib/facts/instrument";
import { regionLabel } from "@/lib/facts/region";
import { factsFromExtraction, type ExtractedProgram } from "@/lib/facts/web";
import { reconcileWebProgram } from "@/lib/search/reconcile";
import { parseGermanDate } from "@/lib/utils/date";
import { slugify, stripCitationMarkers } from "@/lib/utils/text";
import type { Foerderprogramm } from "@/types";
import { resolveLinkAndSources, resolveRedirects } from "./link-resolver";
import { recordModelResponse } from "./raw-log";
import {
  EXTRACTION_RULES,
  SEARCH_RESPONSE_SCHEMA,
  type ParsedSearchResponse,
} from "./schema";

/**
 * The web-search providers, behind one shape.
 *
 * Both return programs in the shared extraction schema; both end in the same
 * place: facts derived by `factsFromExtraction` (never taken on the model's
 * word), display fields derived from those facts, and a cross-check against
 * the curated list of ended programs.
 */

export interface ProviderResult {
  programs: Foerderprogramm[];
  reply: string;
}

/** Token and search usage of one provider call — the benchmark's cost basis. */
export interface ProviderUsage {
  inputTokens?: number;
  outputTokens?: number;
  searches?: number;
  /** Cost the provider itself reported, if it does (Perplexity). */
  reportedCostUsd?: number;
}

/** A provider result with everything the benchmark needs to measure it. */
export interface ProviderRun extends ProviderResult {
  model: string;
  raw: unknown;
  usage: ProviderUsage;
  /** Programs the model proposed, before the curated-list cross-check. */
  proposed: number;
}

/** Never display impossible model-generated dates such as 31.06.2027. */
function cleanDeadline(value?: string): string | undefined {
  const cleaned = stripCitationMarkers(value);
  if (!cleaned) return undefined;
  if (/\d{1,2}\.\d{1,2}\.\d{4}/.test(cleaned) && !parseGermanDate(cleaned)) {
    return undefined;
  }
  return cleaned;
}

/** Replace model citation coordinates such as "1.2.1, 1.4.6" with a useful source. */
function readableSource(
  rawSource: string | undefined,
  link: string | undefined,
  sourceUrls: string[]
): string {
  const cleaned = stripCitationMarkers(rawSource)?.trim();
  const looksLikeCitationCoordinates =
    !cleaned || /^[\d\s.,;:-]+$/.test(cleaned) || /^(websuche|quelle)$/i.test(cleaned);
  if (!looksLikeCitationCoordinates) return cleaned;

  const evidenceUrl = link || sourceUrls[0];
  if (!evidenceUrl) return "Offizielle Programmseite";

  try {
    const host = new URL(evidenceUrl).hostname.replace(/^www\./, "");
    const labels: Record<string, string> = {
      "ibb.de": "Investitionsbank Berlin (IBB)",
      "bafa.de": "Bundesamt für Wirtschaft und Ausfuhrkontrolle (BAFA)",
      "lfa.de": "LfA Förderbank Bayern",
      "nrwbank.de": "NRW.BANK",
      "zim.de": "Zentrales Innovationsprogramm Mittelstand (ZIM)",
      "foerderdatenbank.de": "Förderdatenbank des Bundes",
    };
    const key = Object.keys(labels).find(
      (domain) => host === domain || host.endsWith(`.${domain}`)
    );
    return key ? labels[key] : host;
  } catch {
    return "Offizielle Programmseite";
  }
}

/** A result is only usable if the model actually named a program. */
export function hasName(
  raw: ExtractedProgram
): raw is ExtractedProgram & { name: string } {
  return typeof raw.name === "string" && raw.name.trim().length > 0;
}

/**
 * Extracted program → runtime program. Citation markers are stripped here
 * rather than in the UI: these strings also feed ranking and the export.
 */
export function toWebProgram(
  raw: ExtractedProgram & { name: string },
  link: string | undefined,
  sourceUrls: string[]
): Foerderprogramm {
  const cleaned: ExtractedProgram = {
    ...raw,
    frist: cleanDeadline(raw.frist),
    region: stripCitationMarkers(raw.region),
    zielgruppe: stripCitationMarkers(raw.zielgruppe),
    foerderart: stripCitationMarkers(raw.foerderart),
    statusBeleg: stripCitationMarkers(raw.statusBeleg),
  };
  const facts = factsFromExtraction(cleaned);

  return {
    id: `web-${slugify(raw.name)}-${slugify(raw.quelle || "quelle")}`,
    name: raw.name.trim(),
    beschreibung: stripCitationMarkers(raw.beschreibung),
    foerderhoehe: stripCitationMarkers(raw.foerderhoehe),
    zielgruppe: cleaned.zielgruppe,
    region: regionLabel(facts.foerdergebiet),
    frist: cleaned.frist,
    foerderbereich: stripCitationMarkers(raw.foerderbereich),
    foerderart: instrumentLabel(facts.instrumente, facts.merkmale),
    link,
    quelle: readableSource(raw.quelle, link, sourceUrls),
    sourceUrls,
    facts,
  };
}

/** Perplexity: one Sonar call returning programs with their own citations. */
export async function searchWithPerplexity(
  prompt: string,
  temperature: number
): Promise<ProviderRun> {
  const started = Date.now();
  const result = await searchFoerderprogramme(prompt, {
    temperature,
    schema: SEARCH_RESPONSE_SCHEMA,
  });
  recordModelResponse({
    provider: "perplexity",
    model: result.model,
    prompt,
    raw: result.raw,
    programs: result.programs.length,
    latencyMs: Date.now() - started,
  });

  const mapped = result.programs.filter(hasName).map((raw) => {
    // THIS program's own sources from its sourceIndices ONLY — never the full
    // search_results list, which would put the same sources on every card.
    const candidates = Array.isArray(raw.sourceIndices)
      ? raw.sourceIndices
          .map((index) => result.searchResults[index - 1])
          .filter((source): source is PerplexitySource => Boolean(source?.url))
      : [];

    const { link, sourceUrls } = resolveLinkAndSources(
      raw.link,
      raw.quelle,
      raw.name,
      candidates
    );
    return toWebProgram(raw, link, sourceUrls);
  });

  const cost = (result.usage?.cost as { total_cost?: number } | undefined)?.total_cost;
  return {
    programs: mapped.map(reconcileWebProgram),
    reply: result.reply?.trim() || "",
    model: result.model,
    raw: result.raw,
    proposed: result.programs.length,
    usage: {
      inputTokens: result.usage?.prompt_tokens,
      outputTokens: result.usage?.completion_tokens,
      reportedCostUsd: typeof cost === "number" ? cost : undefined,
    },
  };
}

/** All web URIs Gemini cited as grounding for its answer. */
function extractGroundingUrls(response: Record<string, unknown>): string[] {
  const candidates = response?.candidates;
  if (!Array.isArray(candidates)) return [];

  const meta = (candidates[0] as Record<string, unknown>)?.groundingMetadata;
  if (!meta || typeof meta !== "object") return [];

  const chunks = (meta as Record<string, unknown>)?.groundingChunks;
  if (!Array.isArray(chunks)) return [];

  return Array.from(
    new Set(
      chunks
        .map(
          (chunk: Record<string, unknown>) => (chunk?.web as Record<string, unknown>)?.uri
        )
        .filter((uri): uri is string => typeof uri === "string" && uri.startsWith("http"))
    )
  );
}

/** Gemini: grounded search with the shared schema (combined path, two-pass fallback). */
export async function searchWithGemini(
  prompt: string,
  temperature: number
): Promise<ProviderRun> {
  const started = Date.now();
  const { parsed, raw, path } = await generateGroundedJson<ParsedSearchResponse>(
    prompt,
    SEARCH_RESPONSE_SCHEMA,
    { temperature, extractionRules: EXTRACTION_RULES }
  );
  recordModelResponse({
    provider: `gemini:${path}`,
    model: process.env.GEMINI_MODEL || "gemini-3.1-flash-lite",
    prompt,
    raw,
    programs: parsed.programs?.length ?? 0,
    latencyMs: Date.now() - started,
  });

  // Gemini grounding URLs are vertexaisearch redirects — resolve them to real
  // publisher URLs so they can pass validateLink and become usable sources.
  const groundingUrls = extractGroundingUrls(raw.grounded as Record<string, unknown>);
  const candidates: PerplexitySource[] = (await resolveRedirects(groundingUrls)).map(
    (url) => ({ url })
  );

  const mapped = (parsed.programs || []).filter(hasName).map((rawProgram) => {
    const { link, sourceUrls } = resolveLinkAndSources(
      rawProgram.link,
      rawProgram.quelle,
      rawProgram.name,
      candidates
    );
    return toWebProgram(rawProgram, link, sourceUrls);
  });

  return {
    programs: mapped.map(reconcileWebProgram),
    reply: parsed.reply?.trim() || "",
    model: process.env.GEMINI_MODEL || "gemini-3.1-flash-lite",
    raw,
    proposed: parsed.programs?.length ?? 0,
    usage: geminiUsage(raw, path),
  };
}

/** Summed token counts of the Gemini call(s); the two-pass path bills twice. */
function geminiUsage(
  raw: Record<string, unknown>,
  path: "combined" | "two-pass"
): ProviderUsage {
  const calls = path === "combined" ? [raw.grounded] : [raw.grounded, raw.formatted];
  let inputTokens = 0;
  let outputTokens = 0;
  for (const call of calls) {
    const meta = (call as { usageMetadata?: Record<string, number> } | undefined)
      ?.usageMetadata;
    inputTokens += meta?.promptTokenCount ?? 0;
    outputTokens += (meta?.candidatesTokenCount ?? 0) + (meta?.thoughtsTokenCount ?? 0);
  }
  return { inputTokens, outputTokens, searches: 1 };
}
