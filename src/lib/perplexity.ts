// Perplexity Sonar integration.
//
// Uses sonar-pro (current best model for citation-rich research) with:
//  - structured JSON output via response_format/json_schema (one call, no
//    separate formatting hop),
//  - the structured `search_results` array (url/title/date per source) instead
//    of the legacy flat `citations` list,
//  - per-program `sourceIndices` so EACH program is tied to its OWN sources
//    rather than a single global citation list reused on every card,
//  - high search context for better recall.
//
// Optional env knobs (all off by default to protect recall for a multi-region
// finder): PERPLEXITY_MODEL, PERPLEXITY_DOMAIN_FILTER (comma-separated
// allowlist), PERPLEXITY_RECENCY (hour|day|week|month|year).

const PERPLEXITY_MODEL = process.env.PERPLEXITY_MODEL || "sonar-pro";

interface PerplexityMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface PerplexityRawSearchResult {
  url?: string;
  title?: string;
  date?: string | null;
  last_updated?: string | null;
  snippet?: string;
}

interface PerplexityChoice {
  message: { role: string; content: string };
}

interface PerplexityResponse {
  choices: PerplexityChoice[];
  citations?: string[];
  search_results?: PerplexityRawSearchResult[];
}

function getApiKey(): string {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) {
    throw new Error("PERPLEXITY_API_KEY fehlt. Bitte in .env.local hinterlegen.");
  }
  return key;
}

export function hasPerplexityApiKey(): boolean {
  return Boolean(process.env.PERPLEXITY_API_KEY);
}

// ── Public shapes ────────────────────────────────────────────────────

/** One source from the structured `search_results` array. */
export interface PerplexitySource {
  url: string;
  title?: string;
  date?: string;
  lastUpdated?: string;
  snippet?: string;
}

/** A program as emitted by the model, with 1-based indices into `searchResults`. */
export interface PerplexityProgram {
  name: string;
  beschreibung?: string;
  foerderhoehe?: string;
  zielgruppe?: string;
  region?: string;
  frist?: string;
  foerderbereich?: string;
  foerderart?: string;
  quelle?: string;
  /** Official program URL the model asserts (validated server-side). */
  link?: string;
  /** 1-based indices into `searchResults` that back THIS program. */
  sourceIndices?: number[];
  /** Model's own status read: "aktiv" | "ausgelaufen" | "unbekannt". */
  status?: string;
  unternehmensgroesse?: string[];
  unternehmensbranche?: string[];
}

export interface PerplexityProgramSearch {
  reply: string;
  programs: PerplexityProgram[];
  searchResults: PerplexitySource[];
  citations: string[];
}

// ── Structured-output schema (reused so Perplexity caches the compiled schema) ──

const PROGRAM_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    reply: { type: "string" },
    programs: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          beschreibung: { type: "string" },
          foerderhoehe: { type: "string" },
          zielgruppe: { type: "string" },
          region: { type: "string" },
          frist: { type: "string" },
          foerderbereich: { type: "string" },
          foerderart: { type: "string" },
          quelle: { type: "string" },
          link: { type: "string" },
          status: { type: "string" },
          sourceIndices: { type: "array", items: { type: "integer" } },
          unternehmensgroesse: { type: "array", items: { type: "string" } },
          unternehmensbranche: { type: "array", items: { type: "string" } },
        },
        required: ["name", "link", "status", "sourceIndices"],
      },
    },
  },
  required: ["reply", "programs"],
} as const;

const SYSTEM_PROMPT = `Du bist ein Experte für deutsche Förderprogramme (Bund, Länder, EU). Du recherchierst ausschließlich aktuelle, real existierende und HEUTE noch beantragbare Programme aus dem Web.

REGELN:
- Nenne NUR Programme, die zum heutigen Datum noch beantragbar bzw. aktiv sind.
- Nimm AUSGELAUFENE/EINGESTELLTE Programme NICHT auf. Beispiele für beendete Programme, die du NICHT als aktiv nennen darfst: "Digital Jetzt" (Richtlinie zum 31.12.2023 ausgelaufen) und "go-digital" (zum 31.12.2024 beendet).
- Bevorzuge offizielle Quellen: foerderdatenbank.de, KfW, BAFA, BMWK/BMWE, foerderinfo.bund.de, Landesförderbanken, EU-Portale.
- Beachte die Unternehmensgröße: Reine KMU-Programme (< 250 Beschäftigte) passen NICHT zu großen Unternehmen ab 250 Beschäftigten. Nenne für große Unternehmen passende Instrumente (z.B. KfW-Förderkredite mit Umsatzgrenzen statt KMU-Grenzen).
- Für jedes Programm: setze "status" auf "aktiv", wenn es nachweislich noch beantragbar ist, sonst "unbekannt". Nenne keine Programme mit status "ausgelaufen".
- "link": die EXAKTE offizielle Programm-URL. Erfinde KEINE URLs. Wenn unsicher, leeren String setzen.
- "sourceIndices": die Nummern der Quellen (1-basiert), die DIESES konkrete Programm belegen.
- Antworte vollständig auf Deutsch und ausschließlich im vorgegebenen JSON-Format.`;

// Default allowlist of official German/EU funding domains. Empirically needed:
// Sonar otherwise cites commercial advisor blogs heavily, which we then have to
// discard — leaving programs with no link. foerderdatenbank.de is the universal
// federal aggregator (covers Bund + Länder) and its program pages are specific
// and official, so a small allowlist still gives broad coverage. Overridable via
// PERPLEXITY_DOMAIN_FILTER; set it to "off" to disable filtering entirely.
const DEFAULT_DOMAIN_FILTER = [
  "foerderdatenbank.de",
  "foerderinfo.bund.de",
  "kfw.de",
  "bafa.de",
  "bundeswirtschaftsministerium.de",
  "bmwk.de",
  "zim.de",
  "mittelstand-digital.de",
  "ec.europa.eu",
  "europa.eu",
];

function buildDomainFilter(): string[] | undefined {
  const raw = process.env.PERPLEXITY_DOMAIN_FILTER;
  if (raw === undefined) return DEFAULT_DOMAIN_FILTER;
  if (raw.trim().toLowerCase() === "off") return undefined;
  const domains = raw
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);
  return domains.length > 0 ? domains : DEFAULT_DOMAIN_FILTER;
}

function stripThinkBlock(text: string): string {
  // Defensive: reasoning models prefix a <think>…</think> block before JSON.
  return text.replace(/^\s*<think>[\s\S]*?<\/think>\s*/i, "").trim();
}

function safeParse(text: string): { reply: string; programs: PerplexityProgram[] } {
  const cleaned = stripThinkBlock(text)
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  const tryParse = (s: string) => {
    const obj = JSON.parse(s) as { reply?: string; programs?: PerplexityProgram[] };
    return {
      reply: typeof obj.reply === "string" ? obj.reply : "",
      programs: Array.isArray(obj.programs) ? obj.programs : [],
    };
  };

  try {
    return tryParse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return tryParse(cleaned.slice(start, end + 1));
      } catch {
        /* fall through */
      }
    }
    return { reply: cleaned, programs: [] };
  }
}

function normalizeSearchResults(
  raw: PerplexityRawSearchResult[] | undefined
): PerplexitySource[] {
  if (!Array.isArray(raw)) return [];
  // Preserve the ORIGINAL order/length 1:1. The model's sourceIndices are
  // 1-based positions into the array it saw, so we must NOT compact/filter here
  // (that would shift every index after a dropped entry). Entries without a
  // usable URL get url:"" and are skipped at consumption time (Boolean check).
  return raw.map((r) => ({
    url: typeof r?.url === "string" && r.url.startsWith("http") ? r.url : "",
    title: r?.title || undefined,
    date: r?.date || undefined,
    lastUpdated: r?.last_updated || undefined,
    snippet: r?.snippet || undefined,
  }));
}

/**
 * Search for funding programs and get structured, per-program-sourced results
 * in a single Sonar call.
 */
export async function searchFoerderprogramme(
  prompt: string,
  options?: { temperature?: number }
): Promise<PerplexityProgramSearch> {
  const temperature = options?.temperature ?? 0.1;

  const messages: PerplexityMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: prompt },
  ];

  const body: Record<string, unknown> = {
    model: PERPLEXITY_MODEL,
    messages,
    temperature,
    max_tokens: 8000,
    search_mode: "web",
    web_search_options: { search_context_size: "high" },
    return_related_questions: false,
    response_format: {
      type: "json_schema",
      json_schema: { name: "foerderprogramme", schema: PROGRAM_RESPONSE_SCHEMA },
    },
  };

  const domainFilter = buildDomainFilter();
  if (domainFilter) body.search_domain_filter = domainFilter;

  const recency = process.env.PERPLEXITY_RECENCY;
  if (recency) body.search_recency_filter = recency;

  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMsg =
      (errorData as Record<string, any>)?.error?.message ||
      `Perplexity-Anfrage fehlgeschlagen (${response.status})`;
    throw new Error(errorMsg);
  }

  const data = (await response.json()) as PerplexityResponse;

  const content = data.choices?.[0]?.message?.content?.trim() || "";
  const { reply, programs } = safeParse(content);
  const searchResults = normalizeSearchResults(data.search_results);
  const citations = Array.isArray(data.citations) ? data.citations : [];

  console.log(
    "[Perplexity] model:",
    PERPLEXITY_MODEL,
    "| programs:",
    programs.length,
    "| search_results:",
    searchResults.length,
    "| citations:",
    citations.length
  );

  return { reply, programs, searchResults, citations };
}
