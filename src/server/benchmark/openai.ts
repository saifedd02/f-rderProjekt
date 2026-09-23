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
 * OpenAI as a benchmark candidate: Responses API with its web search tool and
 * a JSON-schema text format — the shared extraction schema, non-strict (strict
 * mode would force every optional field to be required).
 *
 * The model is deliberately not defaulted: set BENCH_OPENAI_MODEL to the model
 * under test, so a benchmark never runs against an outdated guess.
 */

interface ResponsesOutputItem {
  type: string;
  content?: Array<{
    type: string;
    text?: string;
    annotations?: Array<{ type: string; url?: string; title?: string }>;
  }>;
}

interface ResponsesApiResult {
  model?: string;
  output?: ResponsesOutputItem[];
  usage?: { input_tokens?: number; output_tokens?: number };
}

export function openAiModel(): string | undefined {
  return process.env.BENCH_OPENAI_MODEL || undefined;
}

export async function searchWithOpenAI(prompt: string): Promise<ProviderRun> {
  const model = openAiModel();
  const key = process.env.OPENAI_API_KEY;
  if (!model || !key) throw new Error("OPENAI_API_KEY und BENCH_OPENAI_MODEL setzen.");

  const started = Date.now();
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      input: `${prompt}\n\nDas Feld sourceIndices bleibt leer.`,
      tools: [{ type: "web_search" }],
      text: {
        format: {
          type: "json_schema",
          name: "foerderprogramme",
          schema: strictSchema(SEARCH_RESPONSE_SCHEMA),
          strict: false,
        },
      },
    }),
  });
  const data = (await response.json()) as ResponsesApiResult & {
    error?: { message?: string };
  };
  if (!response.ok) throw new Error(data.error?.message || `OpenAI ${response.status}`);

  const output = data.output ?? [];
  const texts = output.flatMap((item) =>
    item.type === "message"
      ? (item.content ?? []).filter((part) => part.type === "output_text")
      : []
  );
  const sources: PerplexitySource[] = texts.flatMap((part) =>
    (part.annotations ?? [])
      .filter((annotation) => annotation.type === "url_citation" && annotation.url)
      .map((annotation) => ({ url: annotation.url as string, title: annotation.title }))
  );

  let parsed: ParsedSearchResponse = {};
  try {
    parsed = JSON.parse(
      texts.map((part) => part.text ?? "").join("")
    ) as ParsedSearchResponse;
  } catch {
    parsed = {};
  }

  recordModelResponse({
    provider: "openai",
    model: data.model ?? model,
    prompt,
    raw: data,
    programs: parsed.programs?.length ?? 0,
    latencyMs: Date.now() - started,
  });

  const programs = (parsed.programs ?? []).filter(hasName).map((raw) => {
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
    reply: parsed.reply ?? "",
    model: data.model ?? model,
    raw: data,
    proposed: parsed.programs?.length ?? 0,
    usage: {
      inputTokens: data.usage?.input_tokens,
      outputTokens: data.usage?.output_tokens,
      searches: output.filter((item) => item.type === "web_search_call").length,
    },
  };
}
