import { NextRequest, NextResponse } from "next/server";
import { generateGroundedJson, formatToJson } from "@/lib/gemini";
import { searchFoerderprogramme, hasPerplexityApiKey } from "@/lib/perplexity";
import { scoreProgramList } from "@/lib/search";
import {
  CompanyProfile,
  Foerderprogramm,
  ScoredProgram,
  SearchFilters,
  TODAY,
} from "@/lib/types";

// ── Helpers ─────────────────────────────────────────────────────────

function formatProfile(profile: CompanyProfile | null): string {
  if (!profile) return "Kein Unternehmensprofil vorhanden.";

  return [
    profile.name ? `- Unternehmen: ${profile.name}` : "",
    profile.branche ? `- Branche: ${profile.branche}` : "- Branche: nicht angegeben",
    profile.region ? `- Region: ${profile.region}` : "- Region: nicht angegeben",
    profile.groesse ? `- Größe: ${profile.groesse}` : "- Größe: nicht angegeben",
    profile.mitarbeiter ? `- Mitarbeiter: ca. ${profile.mitarbeiter}` : "",
    profile.umsatz ? `- Umsatz: ca. ${profile.umsatz}` : "",
    profile.vorhaben ? `- Vorhaben: ${profile.vorhaben}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function formatFilters(filters?: Partial<SearchFilters>): string {
  if (!filters) return "Keine aktiven Filter.";

  const entries = [
    filters.region && filters.region !== "Alle Regionen"
      ? `- Region: ${filters.region}`
      : "",
    filters.foerderbereich && filters.foerderbereich !== "Alle Kategorien"
      ? `- Förderbereich: ${filters.foerderbereich}`
      : "",
    filters.foerderart && filters.foerderart !== "Alle auswählen"
      ? `- Förderart: ${filters.foerderart}`
      : "",
    filters.unternehmensbranche &&
    filters.unternehmensbranche !== "Alle auswählen"
      ? `- Branche: ${filters.unternehmensbranche}`
      : "",
    filters.unternehmensgroesse &&
    filters.unternehmensgroesse !== "Alle auswählen"
      ? `- Unternehmensgröße: ${filters.unternehmensgroesse}`
      : "",
  ].filter(Boolean);

  return entries.length > 0 ? entries.join("\n") : "Keine aktiven Filter.";
}

function formatHistory(history: Array<{ role: string; content: string }> = []): string {
  if (history.length === 0) return "Keine vorherige Konversation.";

  return history
    .slice(-6)
    .map((entry) => `${entry.role === "assistant" ? "Assistent" : "Nutzer"}: ${entry.content}`)
    .join("\n");
}

// ── Response schema ─────────────────────────────────────────────────

const SEARCH_RESPONSE_SCHEMA = {
  type: "object",
  required: ["reply", "programs"],
  properties: {
    reply: { type: "string" },
    programs: {
      type: "array",
      items: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string" },
          beschreibung: { type: "string" },
          foerderhoehe: { type: "string" },
          zielgruppe: { type: "string" },
          region: { type: "string" },
          frist: { type: "string" },
          foerderbereich: { type: "string" },
          foerderart: { type: "string" },
          link: { type: "string" },
          quelle: { type: "string" },
          unternehmensgroesse: {
            type: "array",
            items: { type: "string" },
          },
          unternehmensbranche: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
    },
  },
} as const;

interface ParsedProgram {
  name?: string;
  beschreibung?: string;
  foerderhoehe?: string;
  zielgruppe?: string;
  region?: string;
  frist?: string;
  foerderbereich?: string;
  foerderart?: string;
  link?: string;
  quelle?: string;
  unternehmensgroesse?: string[];
  unternehmensbranche?: string[];
}

interface ParsedSearchResponse {
  reply?: string;
  programs?: ParsedProgram[];
}

// ── Dissatisfaction detection ───────────────────────────────────────

const DISSATISFIED_PATTERNS = [
  /nicht zufrieden/i,
  /unzufrieden/i,
  /andere(n)? (programme|ergebnisse|vorschläge|optionen)/i,
  /mehr (programme|ergebnisse|vorschläge|optionen)/i,
  /noch mehr/i,
  /weitere(n)? (programme|ergebnisse|vorschläge)/i,
  /das (gleiche|selbe) wieder/i,
  /schon gesehen/i,
  /kenne ich (schon|bereits)/i,
  /andere(s)? zeigen/i,
  /was anderes/i,
  /nicht (gut|hilfreich|passend)/i,
  /gibt es (noch )?(andere|mehr|weitere)/i,
  /zeig mir (andere|mehr|weitere)/i,
  /nochmal suchen/i,
  /erneut suchen/i,
  /neue(re)? (programme|ergebnisse)/i,
];

function isUserDissatisfied(message: string): boolean {
  return DISSATISFIED_PATTERNS.some((pattern) => pattern.test(message));
}

// ── Search prompt builder ───────────────────────────────────────────

function buildSearchPrompt(
  message: string,
  profile: CompanyProfile | null,
  filters?: Partial<SearchFilters>,
  history?: Array<{ role: string; content: string }>,
  shownPrograms?: string[]
) {
  const dissatisfied = isUserDissatisfied(message);
  const hasShownPrograms = shownPrograms && shownPrograms.length > 0;

  // Determine region from filters or profile
  const regionFilter = filters?.region && filters.region !== "Alle Regionen" ? filters.region : null;
  const regionProfile = profile?.region || null;
  const effectiveRegion = regionFilter || regionProfile;

  // Determine foerderbereich from filters
  const foerderbereich = filters?.foerderbereich && filters.foerderbereich !== "Alle Kategorien"
    ? filters.foerderbereich : null;

  const exclusionBlock = hasShownPrograms
    ? `\nBEREITS GEZEIGTE PROGRAMME (NICHT WIEDERHOLEN):
${shownPrograms.map((n) => `- ${n}`).join("\n")}
→ Suche nach KOMPLETT ANDEREN Programmen!\n`
    : "";

  const diversityInstruction = dissatisfied
    ? `\nDER NUTZER IST UNZUFRIEDEN — suche bei ANDEREN Quellen, mit ANDEREN Stichwörtern. Probiere andere Förderarten. Gib NIEMALS dieselben Programme wie zuvor zurück.\n`
    : "";

  // Build a focused, minimal prompt
  let prompt = `Heute ist der ${TODAY}. Recherchiere aktuelle Förderprogramme in Deutschland.\n`;

  // STRICT region instruction — most important constraint
  if (effectiveRegion && effectiveRegion !== "Bundesweit") {
    prompt += `\n⚠️ REGION-EINSCHRÄNKUNG (STRIKT EINHALTEN):
Zeige NUR Programme die in "${effectiveRegion}" ODER bundesweit verfügbar sind.
Programme die NUR in anderen Bundesländern gelten, NIEMALS anzeigen!
Bei jedem Programm MUSS das Feld "Region" entweder "${effectiveRegion}" oder "Bundesweit" sein.\n`;
  }

  prompt += `${exclusionBlock}${diversityInstruction}`;

  prompt += `\nSUCHANFRAGE: ${message}\n`;

  // Only include minimal, search-relevant context — NO company name, employees, revenue
  const contextParts: string[] = [];
  if (foerderbereich) contextParts.push(`Förderbereich: ${foerderbereich}`);
  if (profile?.groesse) contextParts.push(`Unternehmensgröße: ${profile.groesse}`);
  if (profile?.vorhaben) contextParts.push(`Vorhaben: ${profile.vorhaben}`);
  if (profile?.branche) contextParts.push(`Branche: ${profile.branche}`);
  if (filters?.foerderart && filters.foerderart !== "Alle auswählen") {
    contextParts.push(`Bevorzugte Förderart: ${filters.foerderart}`);
  }

  if (contextParts.length > 0) {
    prompt += `\nKONTEXT:\n${contextParts.map((p) => `- ${p}`).join("\n")}\n`;
  }

  if (history && history.length > 0) {
    prompt += `\nBISHERIGE KONVERSATION:\n${formatHistory(history)}\n`;
  }

  prompt += `\nFinde 5-8 passende Förderprogramme. Für jedes Programm nenne: Name, Beschreibung, Förderhöhe, Zielgruppe, Region, Frist, Förderart, Quelle und die URL der offiziellen Programmseite.`;

  return prompt;
}

// ── Link validation & verification ──────────────────────────────────

const TRUSTED_DOMAINS = [
  "kfw.de", "bafa.de", "bmwk.de", "bundeswirtschaftsministerium.de",
  "foerderdatenbank.de", "nrwbank.de", "nrw.de", "l-bank.de", "lfa.de",
  "nbank.de", "ibb.de", "ifb-hamburg.de", "wib-hessen.de", "sab.sachsen.de",
  "ib-sh.de", "europa.eu", "efre.nrw.de", "bmf.de", "bmbf.de", "ptj.de",
  "dlr.de", "ble.de", "exist.de", "zim.de", "innovation-beratung-foerderung.de",
  "go-digital.de", "mittelstand-digital.de", "bayern.de", "sachsen.de",
  "niedersachsen.de", "hessen.de", "baden-wuerttemberg.de", "thueringen.de",
  "brandenburg.de", "sachsen-anhalt.de", "mecklenburg-vorpommern.de",
  "saarland.de", "schleswig-holstein.de", "berlin.de", "bremen.de",
  "hamburg.de", "rheinland-pfalz.de",
];

function validateLink(url?: string): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed || trimmed.length < 10) return undefined;
  if (!trimmed.startsWith("https://") && !trimmed.startsWith("http://")) return undefined;

  try {
    const hostname = new URL(trimmed).hostname.toLowerCase();
    const isTrusted = TRUSTED_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
    );
    return isTrusted ? trimmed : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Verify that a URL is actually reachable via HEAD request.
 * Returns the URL if reachable (2xx/3xx), undefined otherwise.
 */
async function verifyUrl(url: string): Promise<string | undefined> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "FoerderprogrammFinder/1.1 LinkCheck" },
    });

    clearTimeout(timeout);
    return res.ok || (res.status >= 300 && res.status < 400) ? url : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Verify multiple URLs in parallel with a concurrency limit.
 * Returns a Map<url, verified_url | undefined>.
 */
async function verifyUrls(urls: string[]): Promise<Map<string, string | undefined>> {
  const unique = Array.from(new Set(urls.filter(Boolean)));
  if (unique.length === 0) return new Map();

  const results = await Promise.allSettled(
    unique.map(async (url) => ({
      url,
      verified: await verifyUrl(url),
    }))
  );

  const map = new Map<string, string | undefined>();
  for (const result of results) {
    if (result.status === "fulfilled") {
      map.set(result.value.url, result.value.verified);
    }
  }
  return map;
}

// ── Program mapping ─────────────────────────────────────────────────

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "programm";
}

function matchCitationToProgram(
  program: ParsedProgram,
  citations: string[]
): string | undefined {
  if (citations.length === 0) return undefined;

  const programNameLower = (program.name || "").toLowerCase();
  const quelleLower = (program.quelle || "").toLowerCase();

  const matched = citations.find((url) => {
    const urlLower = url.toLowerCase();
    const nameTokens = programNameLower
      .split(/[\s\-–]+/)
      .filter((t) => t.length > 3);
    return (
      nameTokens.some((token) => urlLower.includes(token)) ||
      (quelleLower && urlLower.includes(quelleLower))
    );
  });

  return matched ? validateLink(matched) : undefined;
}

async function mapAndVerifyPrograms(
  programs: ParsedProgram[],
  citations: string[]
): Promise<Foerderprogramm[]> {
  const validPrograms = programs.filter(
    (p) => typeof p.name === "string" && p.name.trim()
  );

  // First pass: assign links from program data or citation matching
  const mapped = validPrograms.map((program) => {
    const directLink = validateLink(program.link);
    const citationLink = !directLink
      ? matchCitationToProgram(program, citations)
      : undefined;
    const link = directLink || citationLink;

    return {
      program,
      link,
    };
  });

  // Collect all links that need verification
  const linksToVerify = mapped
    .map((m) => m.link)
    .filter((l): l is string => Boolean(l));

  // Verify all links in parallel
  const verifiedMap = await verifyUrls(linksToVerify);

  // Build final Foerderprogramm array with verified links
  return mapped.map(({ program, link }) => ({
    id: `web-${slugify(program.name || "")}-${slugify(program.quelle || "quelle")}`,
    name: program.name?.trim() || "Unbekanntes Förderprogramm",
    beschreibung: program.beschreibung?.trim() || undefined,
    foerderhoehe: program.foerderhoehe?.trim() || undefined,
    zielgruppe: program.zielgruppe?.trim() || undefined,
    region: program.region?.trim() || undefined,
    frist: program.frist?.trim() || undefined,
    foerderbereich: program.foerderbereich?.trim() || undefined,
    foerderart: program.foerderart?.trim() || undefined,
    link: link ? verifiedMap.get(link) : undefined,
    quelle: program.quelle?.trim() || "Websuche",
    unternehmensgroesse: Array.isArray(program.unternehmensgroesse)
      ? program.unternehmensgroesse.filter(Boolean)
      : [],
    unternehmensbranche: Array.isArray(program.unternehmensbranche)
      ? program.unternehmensbranche.filter(Boolean)
      : [],
    isActive: true,
  }));
}

// ── Search paths ────────────────────────────────────────────────────

function hasGeminiApiKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

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
        .map((c: Record<string, unknown>) => (c?.web as Record<string, unknown>)?.uri)
        .filter((uri): uri is string => typeof uri === "string" && uri.startsWith("http"))
    )
  );
}

async function searchWithPerplexity(
  prompt: string,
  temperature: number
): Promise<{ programs: Foerderprogramm[]; reply: string; sourceUrls: string[] }> {
  const { text, citations } = await searchFoerderprogramme(prompt, { temperature });

  if (!text) {
    return { programs: [], reply: "", sourceUrls: citations };
  }

  if (hasGeminiApiKey()) {
    const parsed = await formatToJson<ParsedSearchResponse>(text, citations, SEARCH_RESPONSE_SCHEMA);
    const programs = await mapAndVerifyPrograms(parsed.programs || [], citations);
    return {
      programs,
      reply: parsed.reply?.trim() || "",
      sourceUrls: citations,
    };
  }

  return { programs: [], reply: text, sourceUrls: citations };
}

async function searchWithGemini(
  prompt: string,
  temperature: number
): Promise<{ programs: Foerderprogramm[]; reply: string; sourceUrls: string[] }> {
  const { parsed, raw } = await generateGroundedJson<ParsedSearchResponse>(
    prompt,
    SEARCH_RESPONSE_SCHEMA,
    { temperature }
  );

  const sourceUrls = extractGroundingUrls(raw.grounded as Record<string, unknown>);
  const programs = await mapAndVerifyPrograms(parsed.programs || [], sourceUrls);

  return {
    programs,
    reply: parsed.reply?.trim() || "",
    sourceUrls,
  };
}

// ── Main handler ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { message, profile, history, filters, shownPrograms } = await request.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Nachricht ist erforderlich" },
        { status: 400 }
      );
    }

    const normalizedProfile = profile || null;
    const shownProgramNames: string[] = Array.isArray(shownPrograms)
      ? shownPrograms.filter((n): n is string => typeof n === "string" && n.trim().length > 0)
      : [];

    const dissatisfied = isUserDissatisfied(message);
    const isFollowUp = (history?.length ?? 0) > 0;

    const shownNamesNormalized = new Set(
      shownProgramNames.map((n) => n.toLowerCase().trim())
    );

    const searchPrompt = buildSearchPrompt(
      message,
      normalizedProfile,
      filters,
      history,
      shownProgramNames
    );
    const searchTemperature = dissatisfied ? 0.7 : isFollowUp ? 0.4 : 0.2;

    const usePerplexity = hasPerplexityApiKey();
    const useGemini = hasGeminiApiKey();

    let programs: ScoredProgram[] = [];
    let webReply = "";
    let searchEngine: "perplexity" | "gemini" | "none" = "none";

    if (usePerplexity || useGemini) {
      try {
        let searchResult: {
          programs: Foerderprogramm[];
          reply: string;
          sourceUrls: string[];
        };

        if (usePerplexity) {
          console.log("[Search] Using Perplexity for web search");
          searchEngine = "perplexity";
          searchResult = await searchWithPerplexity(searchPrompt, searchTemperature);
        } else {
          console.log("[Search] Using Gemini grounding for web search");
          searchEngine = "gemini";
          searchResult = await searchWithGemini(searchPrompt, searchTemperature);
        }

        const confidence = searchResult.sourceUrls.length > 0
          ? (usePerplexity ? "high" : "medium")
          : "low";

        programs = scoreProgramList({
          programs: searchResult.programs,
          profile: normalizedProfile,
          filters,
          textQuery: message,
          source: "websuche",
          checkedAt: TODAY,
          confidence: confidence as "high" | "medium" | "low",
          sourceUrls: searchResult.sourceUrls,
          limit: 8,
        });

        // Exclude already-shown programs
        if (shownNamesNormalized.size > 0) {
          programs = programs.filter(
            (sp) => !shownNamesNormalized.has(sp.program.name.toLowerCase().trim())
          );
        }

        webReply = searchResult.reply;
      } catch (error) {
        console.error("Web search error:", error);

        // If Perplexity failed, try Gemini as fallback
        if (usePerplexity && useGemini) {
          try {
            console.log("[Search] Perplexity failed, falling back to Gemini");
            searchEngine = "gemini";
            const fallback = await searchWithGemini(searchPrompt, searchTemperature);

            programs = scoreProgramList({
              programs: fallback.programs,
              profile: normalizedProfile,
              filters,
              textQuery: message,
              source: "websuche",
              checkedAt: TODAY,
              confidence: fallback.sourceUrls.length > 0 ? "medium" : "low",
              sourceUrls: fallback.sourceUrls,
              limit: 8,
            });

            if (shownNamesNormalized.size > 0) {
              programs = programs.filter(
                (sp) => !shownNamesNormalized.has(sp.program.name.toLowerCase().trim())
              );
            }

            webReply = fallback.reply;
          } catch (fallbackError) {
            console.error("Gemini fallback also failed:", fallbackError);
          }
        }
      }
    }

    const reply =
      webReply ||
      (programs.length > 0
        ? `Ich habe ${programs.length} passende Förderprogramme für Sie gefunden.`
        : "Leider konnte ich keine passenden Förderprogramme finden. Bitte versuchen Sie eine andere Beschreibung oder passen Sie Ihre Filter an.");

    return NextResponse.json({
      reply,
      programs,
      stats: {
        total: programs.length,
        fromWeb: programs.length,
        searchEngine,
        linksVerified: programs.filter((p) => p.program.link).length,
      },
    });
  } catch (error: unknown) {
    console.error("Chat API error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unbekannter Fehler";
    return NextResponse.json(
      { error: "Fehler bei der Verarbeitung: " + errorMessage },
      { status: 500 }
    );
  }
}
