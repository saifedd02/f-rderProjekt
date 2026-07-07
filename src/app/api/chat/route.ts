import { NextRequest, NextResponse } from "next/server";
import { generateGroundedJson } from "@/lib/gemini";
import {
  searchFoerderprogramme,
  hasPerplexityApiKey,
  PerplexityProgram,
  PerplexitySource,
} from "@/lib/perplexity";
import {
  scoreProgramList,
  reconcileWebProgram,
  isGenericLink,
  buildFallbackReply,
} from "@/lib/search";
import {
  CompanyProfile,
  Foerderprogramm,
  ScoredProgram,
  SearchFilters,
  getTodayIso,
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

// ── Gemini fallback response schema ─────────────────────────────────

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
  const today = getTodayIso();
  const dissatisfied = isUserDissatisfied(message);
  const hasShownPrograms = shownPrograms && shownPrograms.length > 0;

  const exclusionBlock = hasShownPrograms
    ? `\nBEREITS GEZEIGTE PROGRAMME (NICHT WIEDERHOLEN):
${shownPrograms.map((n) => `- ${n}`).join("\n")}
→ Diese Programme DARF du NICHT nochmal nennen. Suche nach KOMPLETT ANDEREN Programmen!\n`
    : "";

  const diversityInstruction = dissatisfied
    ? `\nDER NUTZER IST UNZUFRIEDEN MIT DEN BISHERIGEN ERGEBNISSEN:
- Suche unter ANDEREN Stichwörtern und bei ANDEREN Quellen als bisher
- Erweitere die Suche auf Landes- und EU-Programme die noch nicht genannt wurden
- Probiere andere Förderarten (z.B. wenn bisher Zuschüsse: jetzt Kredite/Bürgschaften)
- Schaue bei spezialisierten Förderbanken und Ministerien die noch nicht erwähnt wurden
- Gib NIEMALS dieselben Programme wie zuvor zurück\n`
    : "";

  const profileBlock = profile
    ? `UNTERNEHMENSPROFIL:
${formatProfile(profile)}

`
    : "";

  return `Heute ist der ${today}. Recherchiere aktuell aktive, HEUTE noch beantragbare Förderprogramme in Deutschland.
Nimm KEINE ausgelaufenen Programme auf (z.B. "Digital Jetzt" und "go-digital" sind beendet).
${exclusionBlock}${diversityInstruction}
${profileBlock}AKTIVE FILTER:
${formatFilters(filters)}

BISHERIGE KONVERSATION:
${formatHistory(history)}

AKTUELLE NUTZERANFRAGE:
${message}

Finde maximal 8 passende, aktuell aktive Förderprogramme. Nenne für jedes Programm: Name, Beschreibung, Förderhöhe, Zielgruppe, Region, Frist, Förderart, Quelle und die EXAKTE URL der offiziellen Programmseite. Verweise pro Programm auf die belegenden Quellen (sourceIndices).`;
}

// ── Link validation ─────────────────────────────────────────────────

const TRUSTED_DOMAINS = [
  "kfw.de", "bafa.de", "bmwk.de", "bundeswirtschaftsministerium.de",
  "bmwe.de", "foerderdatenbank.de", "foerderinfo.bund.de", "nrwbank.de",
  "wirtschaft.nrw", "nrw.de", "l-bank.de", "lfa.de",
  "nbank.de", "ibb.de", "ifb-hamburg.de", "wib-hessen.de", "sab.sachsen.de",
  "ib-sh.de", "europa.eu", "efre.nrw.de", "bmf.de", "bmbf.de", "ptj.de",
  "dlr.de", "ble.de", "exist.de", "zim.de", "innovation-beratung-foerderung.de",
  "go-digital.de", "mittelstand-digital.de", "inqa.de", "digitalbonus.bayern",
  "bayern.de", "sachsen.de",
  "niedersachsen.de", "hessen.de", "baden-wuerttemberg.de", "thueringen.de",
  "brandenburg.de", "sachsen-anhalt.de", "mecklenburg-vorpommern.de",
  "saarland.de", "schleswig-holstein.de", "berlin.de", "bremen.de",
  "hamburg.de", "rheinland-pfalz.de",
];

// Fördergeber → official domain (used to prefer the right source in fallbacks).
const QUELLE_DOMAIN_MAP: Record<string, string> = {
  kfw: "kfw.de",
  bafa: "bafa.de",
  bmwk: "bundeswirtschaftsministerium.de",
  bmwe: "bundeswirtschaftsministerium.de",
  zim: "zim.de",
  inqa: "inqa.de",
  euronorm: "innovation-beratung-foerderung.de",
  efre: "efre.nrw.de",
};

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

function uniqueStrings(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.filter((v): v is string => Boolean(v))));
}

// Combining diacritical marks (U+0300–U+036F). Built via RegExp(string) so the
// source contains no invisible combining characters that an editor could mangle.
const DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");

function nameTokens(name: string): string[] {
  return name
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 3);
}

/**
 * Choose the best official link + per-program source list from a set of
 * candidate sources, preferring (1) the model's explicit specific link,
 * (2) a source whose domain matches the Fördergeber, (3) a source whose URL
 * contains program-name tokens, falling back to the first non-generic source.
 * Returns no link rather than a wrong/generic one when nothing qualifies well.
 */
function resolveLinkAndSources(
  modelLink: string | undefined,
  quelle: string | undefined,
  programName: string,
  candidates: PerplexitySource[]
): { link?: string; sourceUrls: string[] } {
  const validated = candidates
    .map((s) => ({ source: s, url: validateLink(s.url) }))
    .filter((s): s is { source: PerplexitySource; url: string } => Boolean(s.url));

  const sourceUrls = uniqueStrings(validated.map((s) => s.url)).slice(0, 4);

  const directLink = validateLink(modelLink);

  // 1. Model link that is specific (not a generic overview page) wins.
  if (directLink && !isGenericLink(directLink)) {
    return { link: directLink, sourceUrls: uniqueStrings([directLink, ...sourceUrls]).slice(0, 4) };
  }

  // 2. Score candidate sources.
  const quelleKey = (quelle || "").toLowerCase();
  const preferredDomain = Object.entries(QUELLE_DOMAIN_MAP).find(([key]) =>
    quelleKey.includes(key)
  )?.[1];
  const tokens = nameTokens(programName);

  let best: { url: string; score: number } | undefined;
  for (const { url } of validated) {
    let score = 0;
    let host = "";
    let path = "";
    try {
      const u = new URL(url);
      host = u.hostname.replace("www.", "").toLowerCase();
      path = u.pathname.toLowerCase();
    } catch {
      continue;
    }
    if (isGenericLink(url)) score -= 3;
    if (preferredDomain && (host === preferredDomain || host.endsWith(`.${preferredDomain}`))) {
      score += 4;
    }
    const haystack = `${path} ${url.toLowerCase()}`;
    if (tokens.some((t) => haystack.includes(t))) score += 2;
    if (path.length > 1) score += 1;
    if (!best || score > best.score) best = { url, score };
  }

  if (best && best.score > 0) {
    return { link: best.url, sourceUrls: uniqueStrings([best.url, ...sourceUrls]).slice(0, 4) };
  }

  // 3. Fall back to the model link (even if generic) or nothing.
  return {
    link: directLink || undefined,
    sourceUrls: directLink
      ? uniqueStrings([directLink, ...sourceUrls]).slice(0, 4)
      : sourceUrls,
  };
}

// ── Resolve Google grounding-redirect URLs to their real target ─────────
// Gemini grounding exposes sources as vertexaisearch.cloud.google.com redirect
// URLs (not official domains), so they fail validateLink and the Gemini path
// would otherwise produce link-less, source-less cards. We follow each redirect
// once (cached, bounded, fail-open) to recover the real publisher URL.
const redirectCache = new Map<string, string | undefined>();

async function resolveRedirect(url: string): Promise<string | undefined> {
  if (redirectCache.has(url)) return redirectCache.get(url);

  let finalUrl: string | undefined;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(timeout);
    finalUrl = res.url && res.url !== url ? res.url : undefined;
  } catch {
    finalUrl = undefined;
  }

  redirectCache.set(url, finalUrl);
  return finalUrl;
}

async function resolveRedirects(urls: string[]): Promise<string[]> {
  const unique = Array.from(new Set(urls.filter(Boolean)));
  if (unique.length === 0) return [];
  const results = await Promise.allSettled(unique.map((u) => resolveRedirect(u)));
  return results
    .map((r) => (r.status === "fulfilled" ? r.value : undefined))
    .filter((u): u is string => Boolean(u));
}

// ── Program mapping ─────────────────────────────────────────────────

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "programm";
}

function baseProgram(
  p: { name?: string; quelle?: string },
  fields: Partial<Foerderprogramm>
): Foerderprogramm {
  return {
    id: `web-${slugify(p.name || "")}-${slugify(p.quelle || "quelle")}`,
    name: (p.name || "").trim() || "Unbekanntes Förderprogramm",
    quelle: p.quelle?.trim() || "Websuche",
    unternehmensgroesse: [],
    unternehmensbranche: [],
    isActive: undefined,
    ...fields,
  };
}

/**
 * Reconcile a set of web programs against the curated local DB.
 *
 * The DB cross-reference HARD-excludes confirmed-ended programs (Digital Jetzt,
 * go-digital) and backfills verified official links for active ones. Currency
 * otherwise relies on the recency-biased Sonar search (official-domain filter +
 * fresh sources) and the prompt's explicit exclusion of discontinued programs —
 * we deliberately do NOT do a live per-page discontinuation scan: it added
 * real latency and produced false positives (a marker can refer to a predecessor
 * program on an otherwise active page) without ever hard-hiding anything.
 */
function finalizeWebPrograms(
  drafts: Array<{ program: Foerderprogramm }>
): Foerderprogramm[] {
  return drafts.map((d) => reconcileWebProgram(d.program));
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
): Promise<{ programs: Foerderprogramm[]; reply: string }> {
  const { reply, programs, searchResults } = await searchFoerderprogramme(prompt, {
    temperature,
  });

  const drafts = programs
    .filter((p: PerplexityProgram) => typeof p.name === "string" && p.name.trim())
    .map((p: PerplexityProgram) => {
      // Resolve THIS program's own sources from its sourceIndices ONLY. We do
      // NOT fall back to the full global search_results list when indices are
      // empty/invalid — that would put the same shared sources on every card,
      // reintroducing the exact bug this design fixes. With no valid indices we
      // rely on the model's own per-program link instead.
      const candidates = Array.isArray(p.sourceIndices)
        ? p.sourceIndices
            .map((i) => searchResults[i - 1])
            .filter((s): s is PerplexitySource => Boolean(s?.url))
        : [];
      const { link, sourceUrls } = resolveLinkAndSources(p.link, p.quelle, p.name, candidates);

      return {
        program: baseProgram(p, {
          beschreibung: p.beschreibung?.trim() || undefined,
          foerderhoehe: p.foerderhoehe?.trim() || undefined,
          zielgruppe: p.zielgruppe?.trim() || undefined,
          region: p.region?.trim() || undefined,
          frist: p.frist?.trim() || undefined,
          foerderbereich: p.foerderbereich?.trim() || undefined,
          foerderart: p.foerderart?.trim() || undefined,
          link,
          sourceUrls,
          unternehmensgroesse: Array.isArray(p.unternehmensgroesse)
            ? p.unternehmensgroesse.filter(Boolean)
            : [],
          unternehmensbranche: Array.isArray(p.unternehmensbranche)
            ? p.unternehmensbranche.filter(Boolean)
            : [],
          // Trust the model's "aktiv" only as a hint; evidence gates apply later.
          isActive: p.status?.toLowerCase() === "ausgelaufen" ? false : undefined,
        }),
      };
    });

  const finalized = finalizeWebPrograms(drafts);
  return { programs: finalized, reply: reply?.trim() || "" };
}

async function searchWithGemini(
  prompt: string,
  temperature: number
): Promise<{ programs: Foerderprogramm[]; reply: string }> {
  const { parsed, raw } = await generateGroundedJson<ParsedSearchResponse>(
    prompt,
    SEARCH_RESPONSE_SCHEMA,
    { temperature }
  );

  // Gemini grounding URLs are vertexaisearch redirects — resolve them to real
  // publisher URLs so they can pass validateLink and become usable sources.
  const groundingUrls = extractGroundingUrls(raw.grounded as Record<string, unknown>);
  const resolvedUrls = await resolveRedirects(groundingUrls);
  const candidates: PerplexitySource[] = resolvedUrls.map((url) => ({ url }));

  const drafts = (parsed.programs || [])
    .filter((p) => typeof p.name === "string" && p.name.trim())
    .map((p) => {
      const { link, sourceUrls } = resolveLinkAndSources(p.link, p.quelle, p.name!, candidates);
      return {
        program: baseProgram(p, {
          beschreibung: p.beschreibung?.trim() || undefined,
          foerderhoehe: p.foerderhoehe?.trim() || undefined,
          zielgruppe: p.zielgruppe?.trim() || undefined,
          region: p.region?.trim() || undefined,
          frist: p.frist?.trim() || undefined,
          foerderbereich: p.foerderbereich?.trim() || undefined,
          foerderart: p.foerderart?.trim() || undefined,
          link,
          sourceUrls,
          unternehmensgroesse: Array.isArray(p.unternehmensgroesse)
            ? p.unternehmensgroesse.filter(Boolean)
            : [],
          unternehmensbranche: Array.isArray(p.unternehmensbranche)
            ? p.unternehmensbranche.filter(Boolean)
            : [],
          isActive: undefined,
        }),
      };
    });

  const finalized = finalizeWebPrograms(drafts);
  return { programs: finalized, reply: parsed.reply?.trim() || "" };
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

    const today = getTodayIso();
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
    const searchTemperature = dissatisfied ? 0.6 : isFollowUp ? 0.3 : 0.1;

    const usePerplexity = hasPerplexityApiKey();
    const useGemini = hasGeminiApiKey();

    let programs: ScoredProgram[] = [];
    let searchEngine: "perplexity" | "gemini" | "none" = "none";

    const runScore = (webPrograms: Foerderprogramm[], confidence: "high" | "medium" | "low") =>
      scoreProgramList({
        programs: webPrograms,
        profile: normalizedProfile,
        filters,
        textQuery: message,
        source: "websuche",
        checkedAt: today,
        confidence,
        sourceUrls: [], // per-program sources only — never a shared global list
        limit: 8,
      }).filter(
        (sp) =>
          shownNamesNormalized.size === 0 ||
          !shownNamesNormalized.has(sp.program.name.toLowerCase().trim())
      );

    if (usePerplexity || useGemini) {
      try {
        let searchResult: { programs: Foerderprogramm[]; reply: string };

        if (usePerplexity) {
          console.log("[Search] Using Perplexity (sonar-pro) for web search");
          searchEngine = "perplexity";
          searchResult = await searchWithPerplexity(searchPrompt, searchTemperature);
        } else {
          console.log("[Search] Using Gemini grounding for web search");
          searchEngine = "gemini";
          searchResult = await searchWithGemini(searchPrompt, searchTemperature);
        }

        const hasLinks = searchResult.programs.some((p) => p.link);
        const confidence: "high" | "medium" | "low" = hasLinks
          ? usePerplexity
            ? "high"
            : "medium"
          : "low";

        programs = runScore(searchResult.programs, confidence);
      } catch (error) {
        console.error("Web search error:", error);

        if (usePerplexity && useGemini) {
          try {
            console.log("[Search] Perplexity failed, falling back to Gemini");
            searchEngine = "gemini";
            const fallback = await searchWithGemini(searchPrompt, searchTemperature);
            const hasLinks = fallback.programs.some((p) => p.link);
            programs = runScore(fallback.programs, hasLinks ? "medium" : "low");
          } catch (fallbackError) {
            console.error("Gemini fallback also failed:", fallbackError);
          }
        }
      }
    }

    // Use a clean, result-based reply instead of the model's prose disclaimer
    // (the "Hinweis zur Auswahl" intro). That intro confused users and, with 0
    // shown programs, read as an excuse rather than a result.
    const reply = buildFallbackReply(programs, normalizedProfile, filters);

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
