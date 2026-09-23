import { QUELLE_DOMAIN_MAP, TRUSTED_DOMAINS } from "@/config/sources";
import { isGenericLink } from "@/lib/search";
import { createLogger } from "@/lib/utils/logger";
import { nameTokens, uniqueStrings } from "@/lib/utils/text";
import type { PerplexitySource } from "@/lib/ai/perplexity";

/**
 * Turn model-supplied links and search sources into ONE official program link.
 *
 * Language models invent plausible URLs, so nothing here is taken on trust: a
 * link must live on an official domain, and a generic portal page loses to a
 * specific program page. No link at all beats a wrong one.
 */

const log = createLogger("Links");

/** How many sources a single program card carries. */
const MAX_SOURCES_PER_PROGRAM = 4;

/** The URL if it is well-formed and on a trusted official domain, else undefined. */
export function validateLink(url?: string): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (trimmed.length < 10) return undefined;
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

/** Points a candidate source earns as THE link for this program. */
function scoreCandidate(
  url: string,
  preferredDomain: string | undefined,
  tokens: string[]
): number {
  let host: string;
  let path: string;
  try {
    const parsed = new URL(url);
    host = parsed.hostname.replace("www.", "").toLowerCase();
    path = parsed.pathname.toLowerCase();
  } catch {
    return Number.NEGATIVE_INFINITY;
  }

  let score = 0;
  if (isGenericLink(url)) score -= 3;
  if (
    preferredDomain &&
    (host === preferredDomain || host.endsWith(`.${preferredDomain}`))
  ) {
    score += 4;
  }
  if (tokens.some((token) => `${path} ${url.toLowerCase()}`.includes(token))) score += 2;
  if (path.length > 1) score += 1;

  return score;
}

export interface ResolvedLink {
  link?: string;
  sourceUrls: string[];
}

/**
 * Choose the best official link plus this program's own source list, preferring
 * (1) the model's explicit specific link, (2) a source on the Fördergeber's own
 * domain, (3) a source whose URL contains tokens of the program name — and
 * returning no link rather than a wrong or generic one when nothing qualifies.
 */
export function resolveLinkAndSources(
  modelLink: string | undefined,
  quelle: string | undefined,
  programName: string,
  candidates: PerplexitySource[]
): ResolvedLink {
  const validatedUrls = candidates
    .map((source) => validateLink(source.url))
    .filter((url): url is string => Boolean(url));

  const sourceUrls = uniqueStrings(validatedUrls).slice(0, MAX_SOURCES_PER_PROGRAM);
  const withLink = (link: string) => ({
    link,
    sourceUrls: uniqueStrings([link, ...sourceUrls]).slice(0, MAX_SOURCES_PER_PROGRAM),
  });

  const directLink = validateLink(modelLink);

  // 1. A specific link from the model wins outright.
  if (directLink && !isGenericLink(directLink)) return withLink(directLink);

  // 2. Otherwise pick the strongest source.
  const quelleKey = (quelle || "").toLowerCase();
  const preferredDomain = Object.entries(QUELLE_DOMAIN_MAP).find(([key]) =>
    quelleKey.includes(key)
  )?.[1];
  const tokens = nameTokens(programName);

  let best: { url: string; score: number } | undefined;
  for (const url of validatedUrls) {
    const score = scoreCandidate(url, preferredDomain, tokens);
    if (!best || score > best.score) best = { url, score };
  }

  // A path alone only proves that this is some page on an official portal.
  // Require either the expected funding body's domain or a program-name token
  // in the URL before attaching a search result to a program card.
  if (best && best.score > 1) return withLink(best.url);

  // 3. Fall back to the model's link even if generic, or to nothing at all.
  if (directLink) return withLink(directLink);

  log.info("no usable link for program:", programName);
  return { sourceUrls };
}

/**
 * Resolve Google grounding-redirect URLs to their real target.
 *
 * Gemini exposes sources as vertexaisearch.cloud.google.com redirects, not
 * official domains, so they fail `validateLink` and the Gemini path would
 * otherwise produce link-less, source-less cards. Each redirect is followed
 * once — cached, time-bounded and fail-open.
 */
const REDIRECT_TIMEOUT_MS = 4000;
const redirectCache = new Map<string, string | undefined>();

async function resolveRedirect(url: string): Promise<string | undefined> {
  const cached = redirectCache.get(url);
  if (redirectCache.has(url)) return cached;

  let finalUrl: string | undefined;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REDIRECT_TIMEOUT_MS);
    const response = await fetch(url, {
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
    finalUrl = response.url && response.url !== url ? response.url : undefined;
  } catch {
    finalUrl = undefined;
  }

  redirectCache.set(url, finalUrl);
  return finalUrl;
}

/** Resolve many redirects in parallel, dropping the ones that fail. */
export async function resolveRedirects(urls: string[]): Promise<string[]> {
  const unique = uniqueStrings(urls);
  if (unique.length === 0) return [];

  const results = await Promise.allSettled(unique.map(resolveRedirect));
  return results
    .map((result) => (result.status === "fulfilled" ? result.value : undefined))
    .filter((url): url is string => Boolean(url));
}
