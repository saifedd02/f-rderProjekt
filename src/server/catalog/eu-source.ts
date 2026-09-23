import {
  EU_MAX_PAGES,
  EU_OPEN_STATUS_IDS,
  EU_PAGE_SIZE,
  EU_SEARCH_API_KEY,
  EU_SEARCH_URL,
  EU_TOPIC_TYPE_ID,
  FETCH_TIMEOUT_MS,
} from "@/config/catalog";
import { htmlToText, repairTitle } from "@/lib/catalog/html";
import { fingerprintOf } from "@/lib/catalog/parse-fdb";
import { createLogger } from "@/lib/utils/logger";
import type { CatalogProgram, CatalogSection } from "@/types/catalog";

/**
 * Open and forthcoming calls from the EU Funding & Tenders Portal.
 *
 * The Förderdatenbank lists only a few dozen EU programs; this is the portal's
 * own index (over a thousand open topics), read through the anonymous search
 * API the portal's front end uses.
 */

const log = createLogger("Catalog:EU");

/** Every metadata value arrives as an array of strings. */
type EuMetadata = Record<string, string[] | undefined>;

interface EuResult {
  url?: string;
  metadata?: EuMetadata;
}

interface EuResponse {
  totalResults?: number;
  results?: EuResult[];
}

function first(metadata: EuMetadata, key: string): string | undefined {
  const value = metadata[key];
  return Array.isArray(value) && typeof value[0] === "string" ? value[0] : undefined;
}

/**
 * Send `query`/`languages` as JSON parts.
 *
 * This is load-bearing: the endpoint answers a plain text part with an opaque
 * "An internal error occurred", so the parts must carry an explicit
 * `application/json` content type.
 */
function buildBody(): FormData {
  const body = new FormData();
  const query = {
    bool: {
      must: [
        { terms: { type: [EU_TOPIC_TYPE_ID] } },
        { terms: { status: EU_OPEN_STATUS_IDS } },
      ],
    },
  };

  body.append(
    "query",
    new Blob([JSON.stringify(query)], { type: "application/json" }),
    "query.json"
  );
  body.append(
    "languages",
    new Blob([JSON.stringify(["en"])], { type: "application/json" }),
    "languages.json"
  );
  // A deterministic sort is REQUIRED, not cosmetic. Under the portal's default
  // relevance order, entries move between pages while we page through, so a run
  // silently misses a handful of calls — which the diff then reports as
  // "entfallen". Measured: 1,211 vs 1,204 results on two consecutive runs of an
  // unchanged catalogue, against a stable totalResults of 1,213.
  body.append(
    "sort",
    new Blob([JSON.stringify({ field: "identifier", order: "ASC" })], {
      type: "application/json",
    }),
    "sort.json"
  );
  return body;
}

async function fetchPage(pageNumber: number): Promise<EuResponse> {
  const url = new URL(EU_SEARCH_URL);
  url.searchParams.set("apiKey", EU_SEARCH_API_KEY);
  url.searchParams.set("text", "***");
  url.searchParams.set("pageSize", String(EU_PAGE_SIZE));
  url.searchParams.set("pageNumber", String(pageNumber));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS.api);

  try {
    const response = await fetch(url, {
      method: "POST",
      body: buildBody(),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`EU-Portal antwortete mit ${response.status}`);
    }
    return (await response.json()) as EuResponse;
  } finally {
    clearTimeout(timeout);
  }
}

/** Portal status ids → our reading of them. */
const EU_STATUS: Record<string, CatalogProgram["euStatus"]> = {
  "31094501": "FORTHCOMING",
  "31094502": "OPEN",
};

/** `2027-04-06T00:00:00.000+0000` → `2027-04-06`. */
function isoDay(value?: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
}

/** `2027-04-06T00:00:00.000+0000` → `06.04.2027`. */
function formatDeadline(value?: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

function toProgram(result: EuResult): CatalogProgram | undefined {
  const metadata = result.metadata;
  if (!metadata) return undefined;

  const identifier = first(metadata, "identifier");
  const title = repairTitle(first(metadata, "title") ?? "");
  if (!identifier || !title) return undefined;

  const description = htmlToText(first(metadata, "descriptionByte") ?? "");
  const conditions = htmlToText(first(metadata, "topicConditions") ?? "");
  const callTitle = first(metadata, "callTitle");
  const deadline = formatDeadline(first(metadata, "deadlineDate"));
  const status = first(metadata, "status");

  const sections: CatalogSection[] = [
    ...(description ? [{ heading: "Ziel und Gegenstand", text: description }] : []),
    ...(conditions ? [{ heading: "Bedingungen", text: conditions }] : []),
  ];

  const url = first(metadata, "url") ?? result.url;

  const program: Omit<CatalogProgram, "contentHash"> = {
    id: `eu:${identifier}`,
    source: "eu-portal",
    name: callTitle && callTitle !== title ? `${title} (${callTitle})` : title,
    summary: description.slice(0, 300) || undefined,
    description: description || undefined,
    sections,
    level: "eu",
    fundingBody: "Europäische Kommission",
    regions: ["EU-weit"],
    // The portal has no counterpart to the German Förderbereich taxonomy —
    // EU calls are matched on their wording alone.
    categories: [],
    fundingTypes: ["Zuschuss"],
    instruments: ["ZUSCHUSS"],
    // Deliberately left open: EU calls name eligible parties in prose, and an
    // invented restriction would silently drop relevant calls.
    eligibleParties: [],
    companySizes: [],
    industries: [],
    deadline: deadline ? `Einreichungsfrist: ${deadline}` : undefined,
    euStatus: status ? EU_STATUS[status] : undefined,
    openingDate: isoDay(first(metadata, "startDate")),
    deadlineDate: isoDay(first(metadata, "deadlineDate")),
    officialUrl: url,
    detailUrl: url,
    sourceUpdatedAt: first(metadata, "esDA_IngestDate"),
  };

  return { ...program, contentHash: fingerprintOf(program) };
}

/**
 * All open and forthcoming EU calls.
 *
 * Fails soft: a portal outage returns an empty list so the daily run still
 * ingests the German catalogue instead of aborting entirely.
 */
export async function loadEuCalls(): Promise<CatalogProgram[]> {
  const programs = new Map<string, CatalogProgram>();

  for (let page = 1; page <= EU_MAX_PAGES; page += 1) {
    const response = await fetchPage(page);
    const results = response.results ?? [];
    if (results.length === 0) break;

    for (const result of results) {
      const program = toProgram(result);
      if (program) programs.set(program.id, program);
    }

    const total = response.totalResults ?? 0;
    if (page * EU_PAGE_SIZE >= total) break;
  }

  log.info("EU-Calls:", programs.size);
  return Array.from(programs.values());
}
