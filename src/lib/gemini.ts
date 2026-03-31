const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

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
    new Set([
      DEFAULT_GEMINI_MODEL,
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite",
    ])
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

    if (jsonSchema && !grounded) {
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
  options?: { temperature?: number }
): Promise<{ parsed: T; raw: Record<string, any> }> {
  const searchTemperature = options?.temperature ?? 0.2;

  // Pass 1: Grounded web search — ask for PROSE only, no JSON
  // Append instruction to avoid JSON in grounded mode (Gemini can't do it reliably)
  const searchPrompt = prompt +
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

  console.log("[Gemini] Grounded text length:", groundedText.length);

  // Pass 2: ALWAYS format the grounded prose into structured JSON using schema enforcement
  const sources = extractGroundingSources(groundedRaw);

  // Strip any accidental JSON/code blocks from grounded text before sending to formatter
  const cleanedGroundedText = groundedText
    .replace(/```json[\s\S]*?```/g, "")
    .replace(/```[\s\S]*?```/g, "")
    .trim();

  const formatterPrompt = `Du erhältst einen Recherchetext über deutsche Förderprogramme und musst daraus strukturierte JSON-Daten extrahieren.

AUFGABE:
- Lies den Recherchetext sorgfältig
- Extrahiere JEDES genannte Förderprogramm als eigenen Eintrag in "programs"
- Für jedes Programm fülle alle bekannten Felder aus
- "reply" = eine Zusammenfassung in 2-3 Absätzen auf Deutsch

REGELN FÜR PROGRAMME:
- name: offizieller Programmname (PFLICHT)
- beschreibung: 1-2 Sätze was gefördert wird
- foerderhoehe: z.B. "bis 50.000 EUR" oder "bis 80% Zuschuss"
- zielgruppe: wer kann beantragen
- region: Bundesweit, Bayern, NRW etc.
- frist: Antragsfrist oder "laufend"
- foerderbereich: Kategorie (Digitalisierung, Energie etc.)
- foerderart: Zuschuss, Kredit, Bürgschaft etc.
- quelle: Fördergeber (KfW, BAFA, BMWK etc.)
- score: 0-100, Relevanz für das Nutzerprofil
- reasons: 2-4 kurze Bewertungen mit label (Text) und matched (true=positiv, false=Warnung)

LINKS — EXTREM WICHTIG:
- link: NUR URLs die EXAKT so in den Quellen oder im Recherchetext stehen
- Wenn keine URL im Text steht → link = leerer String ""
- NIEMALS Links raten, konstruieren oder aus dem Gedächtnis erfinden
- Lieber KEIN Link als ein falscher Link!

- Unbekannte Felder = leerer String ""
- Programme nach score ABSTEIGEND sortieren
- Es MÜSSEN Programme extrahiert werden wenn welche im Text stehen!

QUELLEN:
${sources || "Keine strukturierten Quellen."}

RECHERCHETEXT:
${cleanedGroundedText}`;

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
  console.log("[Gemini] Parsed programs count:", (parsed as any)?.programs?.length ?? 0);

  return {
    parsed,
    raw: {
      grounded: groundedRaw,
      formatted: formattedRaw,
    },
  };
}

/**
 * Format raw search text (e.g. from Perplexity) into structured JSON using Gemini.
 * This is Pass 2 only — no web search, just JSON extraction from existing prose.
 */
export async function formatToJson<T>(
  searchText: string,
  citations: string[],
  jsonSchema: Record<string, unknown>
): Promise<T> {
  const cleanedText = searchText
    .replace(/```json[\s\S]*?```/g, "")
    .replace(/```[\s\S]*?```/g, "")
    .trim();

  const sourcesBlock =
    citations.length > 0
      ? citations.map((url, i) => `- [${i + 1}] ${url}`).join("\n")
      : "Keine strukturierten Quellen.";

  const formatterPrompt = `Du erhältst einen Recherchetext über deutsche Förderprogramme und musst daraus strukturierte JSON-Daten extrahieren.

AUFGABE:
- Lies den Recherchetext sorgfältig
- Extrahiere JEDES genannte Förderprogramm als eigenen Eintrag in "programs"
- Für jedes Programm fülle alle bekannten Felder aus
- "reply" = eine Zusammenfassung in 2-3 Absätzen auf Deutsch

REGELN FÜR PROGRAMME:
- name: offizieller Programmname (PFLICHT)
- beschreibung: 1-2 Sätze was gefördert wird
- foerderhoehe: z.B. "bis 50.000 EUR" oder "bis 80% Zuschuss"
- zielgruppe: wer kann beantragen
- region: Bundesweit, Bayern, NRW etc.
- frist: Antragsfrist oder "laufend"
- foerderbereich: Kategorie (Digitalisierung, Energie etc.)
- foerderart: Zuschuss, Kredit, Bürgschaft etc.
- quelle: Fördergeber (KfW, BAFA, BMWK etc.)

LINKS — EXTREM WICHTIG:
- link: NUR URLs die EXAKT so in den Quellen unten stehen
- Wenn keine passende URL in den Quellen steht → link = leerer String ""
- NIEMALS Links raten, konstruieren oder aus dem Gedächtnis erfinden
- Lieber KEIN Link als ein falscher Link!

- Unbekannte Felder = leerer String ""
- Es MÜSSEN Programme extrahiert werden wenn welche im Text stehen!

VERIFIZIERTE QUELLEN-URLS (nur diese verwenden!):
${sourcesBlock}

RECHERCHETEXT:
${cleanedText}`;

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
  console.log("[Gemini] formatToJson — programs:", (parsed as any)?.programs?.length ?? 0);

  return parsed;
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
