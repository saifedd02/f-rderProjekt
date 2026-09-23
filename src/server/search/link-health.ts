import type { ScoredProgram } from "@/types";
import { nameTokens, normalizeText } from "@/lib/utils/text";
import { isGenericLink } from "@/lib/search/links";
import { unknownFacts } from "@/lib/facts/unknown";

export type LinkHealth = "verified" | "dead" | "unknown";

const DEFAULT_TIMEOUT_MS = 3500;

const PAUSED_PATTERNS = [
  /befristeter antragsstopp/i,
  /antraege? (?:koennen|kann).*nicht (?:angenommen|gestellt)/i,
  /antragstellung (?:ist )?(?:derzeit|aktuell|voruebergehend) nicht moeglich/i,
  /programm (?:ist )?(?:derzeit|aktuell|voruebergehend) geschlossen/i,
];

export interface ProgramLinkEvidence {
  matchesProgram: boolean;
  paused: boolean;
}

/** Verify that an HTML page actually discusses this program, not merely that it exists. */
export async function checkProgramLinkEvidence(
  url: string,
  programName: string,
  fetcher: typeof fetch = fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<ProgramLinkEvidence | undefined> {
  if (isGenericLink(url)) return { matchesProgram: false, paused: false };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "mpool-FoerderprogrammFinder/1.1",
        Accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
    });
    if (!response.ok) return undefined;
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("xhtml")) {
      return undefined;
    }

    const pageText = normalizeText((await response.text()).slice(0, 1_000_000));
    const tokens = nameTokens(programName);
    const matched = tokens.filter((token) => pageText.includes(token)).length;
    const required = tokens.length <= 1 ? 1 : Math.min(2, tokens.length);

    return {
      matchesProgram: matched >= required,
      paused: PAUSED_PATTERNS.some((pattern) => pattern.test(pageText)),
    };
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Check a public program URL without treating temporary blocking as a dead link.
 * A 404/410 is only accepted after GET confirms it; 401/403/429 and network
 * errors remain "unknown" so a funding body's anti-bot setup cannot erase a
 * valid link from the UI.
 */
export async function checkLinkHealth(
  url: string,
  fetcher: typeof fetch = fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<LinkHealth> {
  const request = async (method: "HEAD" | "GET") => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetcher(url, {
        method,
        redirect: "follow",
        signal: controller.signal,
        headers: { "User-Agent": "mpool-FoerderprogrammFinder/1.1" },
        cache: "no-store",
      });
    } finally {
      clearTimeout(timeout);
    }
  };

  try {
    const head = await request("HEAD");
    if (head.ok || (head.status >= 300 && head.status < 400)) return "verified";

    // Some official portals reject or misroute HEAD. Confirm with a real GET.
    const get = await request("GET");
    if (get.ok || (get.status >= 300 && get.status < 400)) return "verified";
    if (get.status === 404 || get.status === 410) return "dead";
    return "unknown";
  } catch {
    return "unknown";
  }
}

/** Check displayed links concurrently and annotate their evidence quality. */
export async function verifyProgramLinks(
  programs: ScoredProgram[],
  fetcher: typeof fetch = fetch
): Promise<ScoredProgram[]> {
  const cache = new Map<string, Promise<LinkHealth>>();
  const healthFor = (url: string) => {
    let pending = cache.get(url);
    if (!pending) {
      pending = checkLinkHealth(url, fetcher);
      cache.set(url, pending);
    }
    return pending;
  };

  return Promise.all(
    programs.map(async (scored) => {
      const link = scored.program.link;
      if (!link) return { ...scored, linkVerified: false };

      const health = await healthFor(link);
      if (health === "verified") {
        const evidence = await checkProgramLinkEvidence(
          link,
          scored.program.name,
          fetcher
        );
        if (!evidence) return { ...scored, linkVerified: undefined };
        if (!evidence.matchesProgram) {
          return {
            ...scored,
            program: { ...scored.program, link: undefined },
            linkVerified: false,
            linkWarning:
              "Der erreichbare Link gehört nicht eindeutig zu diesem Programm.",
          };
        }
        if (evidence.paused) {
          return {
            ...scored,
            program: {
              ...scored.program,
              facts: {
                ...(scored.program.facts ?? unknownFacts()),
                antragsstatus: "GESCHLOSSEN",
              },
              statusNote: "Die offizielle Programmseite meldet einen Antragsstopp.",
            },
            linkVerified: true,
            linkWarning:
              "Aktuell besteht laut offizieller Programmseite ein Antragsstopp.",
          };
        }
        return { ...scored, linkVerified: true };
      }
      if (health === "unknown") return { ...scored, linkVerified: undefined };

      return {
        ...scored,
        program: { ...scored.program, link: undefined },
        linkVerified: false,
        linkWarning: "Der bisherige Programmlink ist nicht mehr erreichbar.",
      };
    })
  );
}
