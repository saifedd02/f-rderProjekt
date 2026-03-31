const PERPLEXITY_MODEL = "sonar";

interface PerplexityMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface PerplexityChoice {
  message: {
    role: string;
    content: string;
  };
}

interface PerplexityResponse {
  choices: PerplexityChoice[];
  citations?: string[];
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

export interface PerplexitySearchResult {
  text: string;
  citations: string[];
}

export async function searchFoerderprogramme(
  prompt: string,
  options?: { temperature?: number }
): Promise<PerplexitySearchResult> {
  const temperature = options?.temperature ?? 0.2;

  const messages: PerplexityMessage[] = [
    {
      role: "system",
      content: `Du bist ein Experte für deutsche Förderprogramme. Deine Aufgabe ist es, aktuelle, real existierende Förderprogramme aus dem Web zu recherchieren.

REGELN:
- Nenne NUR Programme die AKTUELL aktiv und beantragbar sind
- Bevorzuge offizielle Quellen: KfW, BAFA, BMWK, Landesförderbanken, EU-Portale, foerderdatenbank.de
- Für jedes Programm nenne: Name, Beschreibung, Förderhöhe, Zielgruppe, Region, Frist, Förderart, Quelle
- Nenne die EXAKTE URL der Programmseite wenn verfügbar
- Erfinde KEINE Programme und KEINE URLs
- Antworte auf Deutsch`,
    },
    {
      role: "user",
      content: prompt,
    },
  ];

  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: PERPLEXITY_MODEL,
      messages,
      temperature,
      max_tokens: 4096,
      web_search: true,
    }),
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

  const text = data.choices?.[0]?.message?.content?.trim() || "";
  const citations = Array.isArray(data.citations) ? data.citations : [];

  console.log(
    "[Perplexity] Response length:",
    text.length,
    "| Citations:",
    citations.length
  );

  return { text, citations };
}
