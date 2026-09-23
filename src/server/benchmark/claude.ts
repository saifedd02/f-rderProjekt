import Anthropic from "@anthropic-ai/sdk";
import type { PerplexitySource } from "@/lib/ai/perplexity";
import { reconcileWebProgram } from "@/lib/search/reconcile";
import { resolveLinkAndSources } from "@/server/search/link-resolver";
import { hasName, toWebProgram, type ProviderRun } from "@/server/search/providers";
import { recordModelResponse } from "@/server/search/raw-log";
import {
  SEARCH_RESPONSE_SCHEMA,
  type ParsedSearchResponse,
} from "@/server/search/schema";
import { strictSchema } from "./schema";

/**
 * Claude as a benchmark candidate: server-side web search plus a strict
 * `report_programs` tool carrying the shared extraction schema.
 *
 * Why a tool and not `output_config.format`: JSON outputs cannot be combined
 * with citations, and web search results cite. A strict tool gives the same
 * schema guarantee without that conflict.
 *
 * Server-side refusal fallbacks are on (`fallbacks: "default"`); the served
 * model is recorded, so a benchmark row never silently measures another model.
 */

const MODEL = process.env.BENCH_CLAUDE_MODEL || "claude-opus-5";
const MAX_TURNS = 4;

const REPORT_TOOL = {
  name: "report_programs",
  description:
    "Meldet das Rechercheergebnis: die gefundenen Förderprogramme mit ihren Fakten im festen Schema. Genau einmal am Ende aufrufen.",
  input_schema: strictSchema(
    SEARCH_RESPONSE_SCHEMA
  ) as unknown as Anthropic.Tool.InputSchema,
  strict: true,
};

function searchSources(content: Anthropic.Beta.BetaContentBlock[]): PerplexitySource[] {
  const sources: PerplexitySource[] = [];
  for (const block of content) {
    if (block.type !== "web_search_tool_result") continue;
    // A success is a list of results; an error is a single object.
    if (!Array.isArray(block.content)) continue;
    for (const result of block.content) {
      if (result.type === "web_search_result")
        sources.push({ url: result.url, title: result.title });
    }
  }
  return sources;
}

export async function searchWithClaude(prompt: string): Promise<ProviderRun> {
  const client = new Anthropic();
  const started = Date.now();
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    {
      role: "user",
      content: `${prompt}\n\nRecherchiere mit web_search und melde das Ergebnis am Ende genau einmal über report_programs. Das Feld sourceIndices bleibt leer.`,
    },
  ];

  const responses: Anthropic.Beta.BetaMessage[] = [];
  const sources: PerplexitySource[] = [];
  let report: ParsedSearchResponse | undefined;

  for (let turn = 0; turn < MAX_TURNS && !report; turn += 1) {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      tools: [
        { type: "web_search_20260209", name: "web_search", max_uses: 6 },
        REPORT_TOOL,
      ],
      tool_choice: { type: "auto" },
      messages,
    });
    responses.push(response);
    sources.push(...searchSources(response.content));

    if (response.stop_reason === "refusal") break;
    const call = response.content.find(
      (block): block is Anthropic.Beta.BetaToolUseBlock =>
        block.type === "tool_use" && block.name === "report_programs"
    );
    if (call) {
      report = call.input as ParsedSearchResponse;
      break;
    }

    // pause_turn: resend so the server continues; end_turn without a report:
    // ask once more for the report instead of guessing from prose.
    messages.push({ role: "assistant", content: response.content });
    if (response.stop_reason !== "pause_turn") {
      messages.push({
        role: "user",
        content: "Bitte melde das Ergebnis jetzt über report_programs.",
      });
    }
  }

  const last = responses[responses.length - 1];
  const usage = responses.reduce(
    (total, response) => ({
      inputTokens: total.inputTokens + response.usage.input_tokens,
      outputTokens: total.outputTokens + response.usage.output_tokens,
      searches:
        total.searches + (response.usage.server_tool_use?.web_search_requests ?? 0),
    }),
    { inputTokens: 0, outputTokens: 0, searches: 0 }
  );

  recordModelResponse({
    provider: "claude",
    model: last?.model ?? MODEL,
    prompt,
    raw: responses,
    programs: report?.programs?.length ?? 0,
    latencyMs: Date.now() - started,
  });

  const programs = (report?.programs ?? []).filter(hasName).map((raw) => {
    const { link, sourceUrls } = resolveLinkAndSources(
      raw.link,
      raw.quelle,
      raw.name,
      sources
    );
    return reconcileWebProgram(toWebProgram(raw, link, sourceUrls));
  });

  return {
    programs,
    reply: report?.reply ?? "",
    // The served model — differs from MODEL when a refusal fallback ran.
    model: last?.model ?? MODEL,
    raw: responses,
    proposed: report?.programs?.length ?? 0,
    usage,
  };
}
