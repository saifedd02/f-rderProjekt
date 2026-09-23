import { MAX_DIGEST_ENTRIES } from "@/config/catalog";
import { TOPIC_PROFILES } from "@/config/topics";
import { renderDigest, type DigestContent } from "@/lib/alerts/digest-email";
import { parsePriorityAlertConfig } from "@/lib/alerts/priority-config";
import { renderPriorityAlert } from "@/lib/alerts/priority-email";
import { matchTopics, topScore } from "@/lib/alerts/topic-match";
import { createLogger } from "@/lib/utils/logger";
import type { CatalogChange, CatalogProgram } from "@/types/catalog";
import { loadEuCalls } from "./eu-source";
import { loadFoerderdatenbank } from "./fdb-source";
import { isAlertable } from "./ingest";

/**
 * The whole pipeline without a database — fetch, match, render.
 *
 * Exists because the real value of the Förderradar only shows on day two: the
 * diff needs yesterday's snapshot. This runs every other part against live data
 * today, which is what you actually want while tuning topic profiles: change a
 * term, run it, look at the numbers.
 *
 * Deliberately read-only. Nothing is stored, nothing is mailed.
 */

const log = createLogger("Catalog:DryRun");

export interface TopicCoverage {
  topicId: string;
  label: string;
  matches: number;
}

export interface DryRunReport {
  /** Programs fetched per source. */
  fetched: { foerderdatenbank: number; euPortal: number };
  /** Quality of the catalogue as fetched. */
  quality: {
    withOfficialUrl: number;
    withDetailUrl: number;
    withFundingBody: number;
    withDeadline: number;
  };
  /** Programs open to companies, and how many of those match a topic. */
  relevance: { forCompanies: number; withTopic: number };
  perTopic: TopicCoverage[];
  /** The digest as it would look if the top matches had appeared today. */
  digest: DigestContent;
  /** The priority alert for the same hypothetical day. */
  priority: DigestContent;
}

function countIf(programs: CatalogProgram[], test: (p: CatalogProgram) => boolean) {
  return programs.filter(test).length;
}

export interface DryRunOptions {
  archive?: Uint8Array;
  /** Skip the EU portal — useful when working offline on the German catalogue. */
  skipEu?: boolean;
  /** How many matches to put into the sample digest. */
  sampleSize?: number;
}

export async function runDryRun(options: DryRunOptions = {}): Promise<DryRunReport> {
  const [fdb, eu] = await Promise.all([
    loadFoerderdatenbank(options.archive),
    options.skipEu ? Promise.resolve([]) : loadEuCalls().catch(() => []),
  ]);

  const programs = [...fdb, ...eu];

  // Same admission rule as the live ingest and the search.
  const forCompanies = programs.filter((program) => isAlertable(program));

  const scored = forCompanies
    .map((program) => ({ program, matches: matchTopics(program) }))
    .filter((entry) => entry.matches.length > 0)
    .sort((a, b) => topScore(b.matches) - topScore(a.matches));

  const perTopic: TopicCoverage[] = TOPIC_PROFILES.map((topic) => ({
    topicId: topic.id,
    label: topic.label,
    matches: scored.filter((entry) =>
      entry.matches.some((match) => match.topicId === topic.id)
    ).length,
  })).sort((a, b) => b.matches - a.matches);

  // Present the strongest matches as if they had arrived today, so the digest
  // can be judged on real content rather than on placeholder text.
  const sampleSize = options.sampleSize ?? Math.min(MAX_DIGEST_ENTRIES, 8);
  const toChange = (entry: (typeof scored)[number], index: number): CatalogChange => ({
    id: index + 1,
    programId: entry.program.id,
    kind: "new",
    detectedAt: new Date().toISOString(),
    program: entry.program,
    fields: [],
    matches: entry.matches,
    topScore: topScore(entry.matches),
  });
  const changes = scored.slice(0, sampleSize).map(toChange);

  // The priority alert as it would look if today's strongest matches were new.
  const priorityConfig = parsePriorityAlertConfig(process.env);
  const aboveThreshold = scored.filter(
    (entry) => topScore(entry.matches) >= priorityConfig.threshold
  );
  const priorityChanges = aboveThreshold
    .slice(0, priorityConfig.maxEntries)
    .map(toChange);

  log.info("Probelauf:", programs.length, "Programme,", scored.length, "mit mpool-Thema");

  return {
    fetched: { foerderdatenbank: fdb.length, euPortal: eu.length },
    quality: {
      withOfficialUrl: countIf(programs, (p) => Boolean(p.officialUrl)),
      withDetailUrl: countIf(programs, (p) => Boolean(p.detailUrl)),
      withFundingBody: countIf(programs, (p) => Boolean(p.fundingBody)),
      withDeadline: countIf(programs, (p) => Boolean(p.deadline)),
    },
    relevance: { forCompanies: forCompanies.length, withTopic: scored.length },
    perTopic,
    digest: renderDigest({
      changes,
      date: new Date(),
      appUrl: process.env.NEXT_PUBLIC_BASE_URL,
    }),
    priority: renderPriorityAlert({
      changes: priorityChanges,
      date: new Date(),
      threshold: priorityConfig.threshold,
      deferred: Math.max(0, aboveThreshold.length - priorityChanges.length),
      appUrl: process.env.NEXT_PUBLIC_BASE_URL,
      notes: [
        "Probelauf ohne Datenbank: die stärksten Treffer des heutigen Bestands, dargestellt als wären sie neu. Nichts wurde versendet.",
      ],
    }),
  };
}
