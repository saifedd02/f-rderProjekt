const PERPLEXITY_MODEL = "sonar-pro";

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
      content: `Du bist ein Recherche-Experte für deutsche Förderprogramme. Durchsuche das Internet GRÜNDLICH nach passenden Förderprogrammen.

SUCHSTRATEGIE:
- Durchsuche foerderdatenbank.de, KfW, BAFA, BMWK, BMBF und die jeweiligen Landesförderbanken (NRW.BANK, L-Bank, LfA, IBB, IFB Hamburg, NBank etc.)
- Suche auch bei EU-Portalen und spezialisierten Programmen (ZIM, go-digital, EXIST, etc.)
- Du MUSST mindestens 5 Programme finden, maximal 8
- Nenne REALE Programme mit echten Namen und echten Quellen

FÜR JEDES PROGRAMM NENNE:
- Name (offizieller Programmname)
- Beschreibung (1-2 Sätze was gefördert wird)
- Förderhöhe (z.B. "bis 50.000 EUR" oder "bis 80% Zuschuss")
- Zielgruppe (wer kann beantragen)
- Region (exakt: "Bundesweit" oder den vollen Bundesland-Namen wie "Nordrhein-Westfalen")
- Frist (Antragsfrist oder "laufend")
- Förderart (Zuschuss, Kredit, Bürgschaft, Beratung etc.)
- Quelle (Fördergeber: KfW, BAFA, NRW.BANK etc.)
- Exakte URL der offiziellen Programmseite

REGELN:
- Erfinde KEINE Programme und KEINE URLs
- Wenn du unsicher bist ob ein Programm noch aktiv ist, nenne es trotzdem mit Hinweis
- Antworte auf Deutsch
- Gib IMMER konkrete Programme zurück — sage NIEMALS "ich konnte nichts finden"`,
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
      max_tokens: 8192,
      return_citations: true,
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
