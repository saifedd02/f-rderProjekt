import { checkHardCriteria } from "@/lib/facts/check";
import { adoptCatalogFacts, criteriaFor, scoreProgramList } from "@/lib/search";
import { normalizeText } from "@/lib/utils/text";
import type { Foerderprogramm, Kriterium, SearchFilters } from "@/types";
import { lookupCatalogForWeb } from "@/server/catalog/search";
import { buildSearchPrompt } from "@/server/search/prompt";
import {
  searchWithGemini,
  searchWithPerplexity,
  type ProviderRun,
} from "@/server/search/providers";
import { searchWithClaude } from "./claude";
import { openAiModel, searchWithOpenAI } from "./openai";
import { costOf } from "./prices";

/**
 * Provider benchmark: same cases, same prompt, same schema, same check.
 *
 * Every provider's answer goes through the production pipeline after the model
 * call — catalogue adoption, `checkHardCriteria`, relevance ranking — so the
 * only variable is the provider. Measured per case: correct hits, false
 * positives, false negatives (against the case's expectations), knock-out
 * errors (programs the model proposed that the hard check had to throw out),
 * latency and cost.
 */

export type BenchmarkProviderName = "perplexity" | "gemini" | "claude" | "openai";

export interface BenchmarkCase {
  id: string;
  query: string;
  filters?: Partial<SearchFilters>;
  expect?: {
    /** Name patterns (regex, case-insensitive) that a correct answer contains. */
    mustInclude?: string[];
    /** Name patterns that must never be shown (ended or ineligible programs). */
    mustExclude?: string[];
  };
}

export interface CaseResult {
  caseId: string;
  provider: BenchmarkProviderName;
  model?: string;
  error?: string;
  latencyMs: number;
  costUsd?: number;
  proposed: number;
  shown: string[];
  unchecked: number;
  correct: number;
  falsePositives: string[];
  falseNegatives: string[];
  /** Proposed programs the hard check excluded, by criterion. */
  koErrors: Partial<Record<Kriterium, number>>;
  raw?: unknown;
}

const PROVIDERS: Record<BenchmarkProviderName, (prompt: string) => Promise<ProviderRun>> =
  {
    perplexity: (prompt) => searchWithPerplexity(prompt, 0.1),
    gemini: (prompt) => searchWithGemini(prompt, 0.1),
    claude: searchWithClaude,
    openai: searchWithOpenAI,
  };

/** Providers whose credentials are present. */
export function availableProviders(): BenchmarkProviderName[] {
  return (Object.keys(PROVIDERS) as BenchmarkProviderName[]).filter((name) => {
    if (name === "perplexity") return Boolean(process.env.PERPLEXITY_API_KEY);
    if (name === "gemini") return Boolean(process.env.GEMINI_API_KEY);
    if (name === "claude")
      return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
    return Boolean(process.env.OPENAI_API_KEY && openAiModel());
  });
}

const matches = (patterns: string[] = [], name: string) =>
  patterns.filter((pattern) => new RegExp(pattern, "i").test(name));

function koErrors(programs: Foerderprogramm[], testCase: BenchmarkCase) {
  const criteria = criteriaFor(testCase.filters, testCase.query);
  const errors: Partial<Record<Kriterium, number>> = {};
  for (const program of programs) {
    if (!program.facts) continue;
    for (const check of checkHardCriteria(program.facts, criteria).checks) {
      if (check.ergebnis === "AUSGESCHLOSSEN") {
        errors[check.kriterium] = (errors[check.kriterium] ?? 0) + 1;
      }
    }
  }
  return errors;
}

export async function runCase(
  provider: BenchmarkProviderName,
  testCase: BenchmarkCase,
  keepRaw = true
): Promise<CaseResult> {
  const prompt = buildSearchPrompt({
    message: testCase.query,
    filters: testCase.filters,
  });
  const started = Date.now();
  const base = { caseId: testCase.id, provider, proposed: 0, shown: [], unchecked: 0 };

  let run: ProviderRun;
  try {
    run = await PROVIDERS[provider](prompt);
  } catch (error) {
    return {
      ...base,
      latencyMs: Date.now() - started,
      error: error instanceof Error ? error.message : String(error),
      correct: 0,
      falsePositives: [],
      falseNegatives: testCase.expect?.mustInclude ?? [],
      koErrors: {},
    };
  }
  const latencyMs = Date.now() - started;

  // The production pipeline from here on.
  const adopted = adoptCatalogFacts(
    run.programs,
    await lookupCatalogForWeb(run.programs)
  );
  const shown = scoreProgramList({
    programs: adopted,
    filters: testCase.filters,
    textQuery: testCase.query,
    source: "websuche",
  });
  const names = shown.map((entry) => entry.program.name);

  const included = testCase.expect?.mustInclude ?? [];
  const hits = included.filter((pattern) =>
    names.some((name) => matches([pattern], name).length)
  );
  const falsePositives = names.filter(
    (name) =>
      matches(testCase.expect?.mustExclude, normalizeText(name) + " " + name).length
  );

  return {
    ...base,
    model: run.model,
    latencyMs,
    costUsd: costOf(provider, run.model, run.usage),
    proposed: run.proposed,
    shown: names,
    unchecked: shown.filter((entry) => entry.verdict === "UNGEPRUEFT").length,
    correct: hits.length,
    falsePositives,
    falseNegatives: included.filter((pattern) => !hits.includes(pattern)),
    koErrors: koErrors(adopted, testCase),
    raw: keepRaw ? run.raw : undefined,
  };
}

export interface ProviderSummary {
  provider: BenchmarkProviderName;
  cases: number;
  errors: number;
  correct: number;
  falsePositives: number;
  falseNegatives: number;
  koErrors: number;
  uncheckedShare: number;
  avgLatencyMs: number;
  costPerSearchUsd?: number;
  costPerCorrectUsd?: number;
}

export function summarize(results: CaseResult[]): ProviderSummary[] {
  const providers = Array.from(new Set(results.map((result) => result.provider)));
  return providers.map((provider) => {
    const rows = results.filter((result) => result.provider === provider);
    const sum = (pick: (row: CaseResult) => number) =>
      rows.reduce((total, row) => total + pick(row), 0);
    const correct = sum((row) => row.correct);
    const shown = sum((row) => row.shown.length);
    const costs = rows.map((row) => row.costUsd);
    const totalCost = costs.every((cost) => cost !== undefined)
      ? costs.reduce((total: number, cost) => total + (cost ?? 0), 0)
      : undefined;

    return {
      provider,
      cases: rows.length,
      errors: rows.filter((row) => row.error).length,
      correct,
      falsePositives: sum((row) => row.falsePositives.length),
      falseNegatives: sum((row) => row.falseNegatives.length),
      koErrors: sum((row) =>
        Object.values(row.koErrors).reduce((a, b) => a + (b ?? 0), 0)
      ),
      uncheckedShare: shown > 0 ? sum((row) => row.unchecked) / shown : 0,
      avgLatencyMs: Math.round(sum((row) => row.latencyMs) / Math.max(1, rows.length)),
      costPerSearchUsd: totalCost !== undefined ? totalCost / rows.length : undefined,
      costPerCorrectUsd:
        totalCost !== undefined && correct > 0 ? totalCost / correct : undefined,
    };
  });
}
