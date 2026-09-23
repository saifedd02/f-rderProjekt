import { createLogger } from "@/lib/utils/logger";

/**
 * Gemini client — the primary web-search provider.
 *
 * Current Gemini 3 models can combine Google Search and structured output in
 * one request. We prefer that faster path and retain the proven two-pass flow
 * as a compatibility fallback for older models/accounts.
 */

const log = createLogger("Gemini");

const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

interface GeminiRequestOptions {
  prompt: string;
  jsonSchema?: Record<string, unknown>;
  grounded?: boolean;
  temperature?: number;
  maxOutputTokens?: number;
}

function getApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY fehlt. Bitte in .env.local hinterlegen.");
  }
  return apiKey;
}

function extractText(response: Record<string, any>): string {
  const parts = response?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";

  return parts
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .join("")
    .trim();
}

function extractGroundingSources(response: Record<string, any>): string {
  const chunks = response?.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (!Array.isArray(chunks)) return "";

  const sources = chunks
    .map((chunk) => {
      const title = chunk?.web?.title;
      const uri = chunk?.web?.uri;
      if (!title && !uri) return "";
      return `- ${title || "Quelle"}${uri ? ` | ${uri}` : ""}`;
    })
    .filter(Boolean);

  return Array.from(new Set(sources)).join("\n");
}

function safeJsonParse<T>(text: string): T {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "");

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const objectStart = cleaned.indexOf("{");
    const objectEnd = cleaned.lastIndexOf("}");

    if (objectStart >= 0 && objectEnd > objectStart) {
      return JSON.parse(cleaned.slice(objectStart, objectEnd + 1)) as T;
    }

    throw new Error("Gemini-Antwort konnte nicht als JSON geparst werden.");
  }
}

async function requestGemini({
  prompt,
  jsonSchema,
  grounded = false,
  temperature = 0.2,
  maxOutputTokens = 2048,
}: GeminiRequestOptions) {
  const models = Array.from(
    new Set([DEFAULT_GEMINI_MODEL, "gemini-2.5-flash", "gemini-2.5-flash-lite"])
  );

  let lastError = "Gemini-Anfrage fehlgeschlagen.";

  for (let index = 0; index < models.length; index++) {
    const model = models[index];
    const body: Record<string, unknown> = {
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature,
        maxOutputTokens,
      },
    };

    if (grounded) {
      body.tools = [{ google_search: {} }];
    }

    if (jsonSchema) {
      body.generationConfig = {
        ...(body.generationConfig as Record<string, unknown>),
        responseMimeType: "application/json",
        responseSchema: jsonSchema,
      };
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": getApiKey(),
        },
        body: JSON.stringify(body),
        cache: "no-store",
      }
    );

    const data = (await response.json()) as Record<string, any>;

    if (response.ok) {
      return data;
    }

    const message =
      data?.error?.message || `Gemini-Anfrage fehlgeschlagen für Modell ${model}.`;
    lastError = message;

    const retryable =
      /high demand|overloaded|unavailable|try again later|503/i.test(message) ||
      response.status >= 500;

    if (!retryable || index === models.length - 1) {
      throw new Error(message);
    }
  }

  throw new Error(lastError);
}

export async function generateGroundedJson<T>(
  prompt: string,
  jsonSchema: Record<string, unknown>,
  options?: {
    temperature?: number;
    /** Field rules for the formatter pass — the same text the search prompt carries. */
    extractionRules?: string;
  }
): Promise<{ parsed: T; raw: Record<string, any>; path: "combined" | "two-pass" }> {
  const searchTemperature = options?.temperature ?? 0.2;

  // Fast path: Gemini 3 can search and obey a JSON schema in the same call.
  // If an account/model combination does not support it, the catch below uses
  // the established grounded-research + formatter flow.
  try {
    const combinedRaw = await requestGemini({
      prompt:
        prompt +
        "\n\nNutze die Google-Suche. Gib ausschließlich JSON im vorgegebenen Schema zurück.",
      jsonSchema,
      grounded: true,
      temperature: searchTemperature,
      maxOutputTokens: 8192,
    });
    const combinedText = extractText(combinedRaw);
    if (!combinedText) throw new Error("Leere kombinierte Gemini-Antwort.");
    const parsed = safeJsonParse<T>(combinedText);
    log.info("combined grounded+JSON path | parsed programs:", countPrograms(parsed));
    return {
      parsed,
      raw: { grounded: combinedRaw, formatted: combinedRaw },
      path: "combined",
    };
  } catch (error) {
    log.warn("combined grounded+JSON path unavailable; using two-pass fallback:", error);
  }

  // Pass 1: Grounded web search — ask for PROSE only, no JSON
  // Append instruction to avoid JSON in grounded mode (Gemini can't do it reliably)
  const searchPrompt =
    prompt +
    "\n\nWICHTIG: Antworte in normalem Fließtext. Kein JSON. Kein Code. " +
    "Liste jeden gefundenen Förderprogramm-Namen fett auf (**Name**) und beschreibe Details darunter.";

  const groundedRaw = await requestGemini({
    prompt: searchPrompt,
    grounded: true,
    temperature: searchTemperature,
    maxOutputTokens: 4096,
  });

  const groundedText = extractText(groundedRaw);
  if (!groundedText) {
    throw new Error("Gemini hat keine verwertbare grounded Antwort zurückgegeben.");
  }

  log.info("grounded text length:", groundedText.length);

  // Pass 2: format the grounded prose into the SAME schema and rules. Kept only
  // as a fallback for models/accounts without the combined path.
  const sources = extractGroundingSources(groundedRaw);

  // Strip any accidental JSON/code blocks from grounded text before sending to formatter
  const cleanedGroundedText = groundedText
    .replace(/```json[\s\S]*?```/g, "")
    .replace(/```[\s\S]*?```/g, "")
    .trim();

  const formatterPrompt = buildExtractionPrompt(
    cleanedGroundedText,
    sources,
    options?.extractionRules ?? ""
  );

  const formattedRaw = await requestGemini({
    prompt: formatterPrompt,
    jsonSchema,
    grounded: false,
    temperature: 0,
    maxOutputTokens: 8192,
  });

  const formattedText = extractText(formattedRaw);
  if (!formattedText) {
    throw new Error("Gemini hat keine JSON-Struktur zurückgegeben.");
  }

  const parsed = safeJsonParse<T>(formattedText);
  log.info("parsed programs:", countPrograms(parsed));

  return {
    parsed,
    raw: {
      grounded: groundedRaw,
      formatted: formattedRaw,
    },
    path: "two-pass",
  };
}

export async function generateGeminiText(
  prompt: string,
  options?: { grounded?: boolean; temperature?: number; maxOutputTokens?: number }
) {
  const raw = await requestGemini({
    prompt,
    grounded: options?.grounded,
    temperature: options?.temperature,
    maxOutputTokens: options?.maxOutputTokens,
  });

  return {
    text: extractText(raw),
    raw,
  };
}

/** Number of programs in a parsed response, for logging only. */
function countPrograms(parsed: unknown): number {
  const programs = (parsed as { programs?: unknown[] } | null)?.programs;
  return Array.isArray(programs) ? programs.length : 0;
}

/**
 * Pass-2 prompt: turn research prose into the structured program schema.
 *
 * Extraction only — nothing may be added that the text does not say. An empty
 * program list is a valid answer; a program that was never researched is not.
 */
function buildExtractionPrompt(
  researchText: string,
  sources: string,
  extractionRules: string
): string {
  return `Du erhältst einen Recherchetext über deutsche Förderprogramme und überführst ihn in das vorgegebene JSON-Schema.

AUFGABE:
- Übernimm jedes im Text genannte Förderprogramm als eigenen Eintrag in "programs".
- Übernimm nur, was der Text sagt. Fehlt eine Angabe, bleibt das Feld leer bzw. UNBEKANNT.
- "reply" = eine kurze Zusammenfassung auf Deutsch.

${extractionRules}

LINKS: nur URLs, die EXAKT so in den Quellen oder im Recherchetext stehen, sonst "".

QUELLEN:
${sources || "Keine strukturierten Quellen."}

RECHERCHETEXT:
${researchText}`;
}
