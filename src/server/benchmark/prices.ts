import type { ProviderUsage } from "@/server/search/providers";

/**
 * List prices for the cost columns of the benchmark, in USD.
 *
 * Only the Claude rates are filled in (Anthropic list prices, Sept. 2026).
 * The other providers change prices and model names often; enter the rates of
 * the exact models under test via env before a run — a missing price shows as
 * "n/a" instead of a made-up number. Perplexity's own reported cost is used
 * when the API returns one.
 */
export interface Price {
  /** USD per 1M input tokens. */
  input: number;
  /** USD per 1M output tokens. */
  output: number;
  /** USD per single web search / grounded request. */
  perSearch: number;
}

function fromEnv(prefix: string): Price | undefined {
  const input = Number(process.env[`${prefix}_INPUT_PER_MTOK`]);
  const output = Number(process.env[`${prefix}_OUTPUT_PER_MTOK`]);
  const perSearch = Number(process.env[`${prefix}_PER_SEARCH`] ?? "0");
  if (!Number.isFinite(input) || !Number.isFinite(output) || input <= 0) return undefined;
  return { input, output, perSearch: Number.isFinite(perSearch) ? perSearch : 0 };
}

const CLAUDE_PRICES: Record<string, Price> = {
  // Web search: $10 per 1,000 searches.
  "claude-opus-5": { input: 5, output: 25, perSearch: 0.01 },
  "claude-sonnet-5": { input: 2, output: 10, perSearch: 0.01 },
  "claude-haiku-4-5": { input: 1, output: 5, perSearch: 0.01 },
};

export function priceFor(provider: string, model: string): Price | undefined {
  if (provider === "claude") return CLAUDE_PRICES[model] ?? fromEnv("BENCH_CLAUDE");
  if (provider === "perplexity") return fromEnv("BENCH_PERPLEXITY");
  if (provider === "gemini") return fromEnv("BENCH_GEMINI");
  if (provider === "openai") return fromEnv("BENCH_OPENAI");
  return undefined;
}

/** Cost of one call, or undefined when no price is known. */
export function costOf(
  provider: string,
  model: string,
  usage: ProviderUsage
): number | undefined {
  if (usage.reportedCostUsd !== undefined) return usage.reportedCostUsd;
  const price = priceFor(provider, model);
  if (!price || usage.inputTokens === undefined || usage.outputTokens === undefined) {
    return undefined;
  }
  return (
    (usage.inputTokens / 1e6) * price.input +
    (usage.outputTokens / 1e6) * price.output +
    (usage.searches ?? 0) * price.perSearch
  );
}
