import { MAX_PROGRAM_RESULTS, MIN_RELEVANCE_SCORE } from "@/config/app";
import { assessTopic, type TopicInput } from "@/lib/alerts/topic-match";
import { checkHardCriteria, uncheckedCriteria } from "@/lib/facts/check";
import { isInstrumentWord } from "@/lib/facts/instrument";
import { isRegionWord } from "@/lib/facts/region";
import { isSizeWord } from "@/lib/facts/size";
import { unknownFacts } from "@/lib/facts/unknown";
import { sentences } from "@/lib/format/card";
import { getTodayDate, getTodayIso } from "@/lib/utils/date";
import { normalizeText } from "@/lib/utils/text";
import {
  LAENDER,
  type Foerderprogramm,
  type HardCriteria,
  type ProgramSource,
  type RelevanceLevel,
  type ScoredProgram,
  type SearchFilters,
  type ThemenBewertung,
} from "@/types";
import { criteriaFor, topicFor } from "./criteria";
import { getLinkWarning, isGenericLink } from "./links";
import { extractKeywords } from "./normalize";

/**
 * Check, then rank.
 *
 * 1. Hard criteria (`checkHardCriteria`): excluded programs are dropped here
 *    and never reach ranking.
 * 2. Relevance: ONLY how well the program fits what the user asked about —
 *    the words of the query and the chosen Förderbereich. Region, size, status
 *    and Förderart earn no points: they already decided admission.
 * 3. Order: confirmed programs (GUELTIG) before unchecked ones, then relevance.
 */

const WEIGHTS = { keywords: 60, topic: 40 } as const;

/** A generic word that ends a compound and says nothing about the topic. */
const GENERIC_TAIL =
  /(forderung|forderungen|forderprogramm|forderprogramme|programm|programme|zuschuss|zuschusse|zuschussen|kredit|kredite|darlehen|beihilfe|foerderung)$/;

/**
 * Topic keywords of a query. Words that are hard criteria (region, size,
 * instrument) are removed — they were checked already and must not also
 * count as relevance. A compound's topic head is kept:
 * "Digitalisierungsförderung" → "digitalisierung".
 */
export function relevanceKeywords(textQuery: string | undefined): string[] {
  const keywords = extractKeywords(textQuery ?? "").map((word) => {
    const tail = GENERIC_TAIL.exec(word);
    if (!tail || tail.index < 6) return word;
    return word.slice(0, tail.index).replace(/s$/, "");
  });
  return Array.from(
    new Set(
      keywords.filter(
        (word) =>
          word.length > 2 &&
          !isRegionWord(word) &&
          !isSizeWord(word) &&
          !isInstrumentWord(word)
      )
    )
  );
}

/**
 * What a program is ABOUT — its name and the first sentence of its
 * description — versus everything it merely mentions. A maritime program that
 * lists "Digitalisierung" among ten aspects is not a digitalisation program.
 */
function textZones(program: Foerderprogramm): { core: string; full: string } {
  const core = normalizeText(
    [program.name, sentences(program.beschreibung ?? "")[0]].filter(Boolean).join(" ")
  );
  const full = normalizeText(
    [
      program.name,
      program.beschreibung,
      program.foerderbereich,
      program.zielgruppe,
      program.foerderhoehe,
    ]
      .filter(Boolean)
      .join(" ")
  );
  return { core, full };
}

/** German compounds match both ways: "digitalisierungsprojekte" counts for "digitalisierung". */
function containsKeyword(haystack: string, keyword: string): boolean {
  if (haystack.includes(keyword)) return true;
  return (
    keyword.length >= 8 &&
    haystack.split(" ").some((token) => token.length >= 6 && keyword.includes(token))
  );
}

/** Keywords in the program's core (full credit) and only in the rest (half credit). */
function matchedKeywords(
  keywords: string[],
  program: Foerderprogramm
): { core: string[]; mentioned: string[] } {
  const zones = textZones(program);
  const core = keywords.filter((keyword) => containsKeyword(zones.core, keyword));
  const mentioned = keywords.filter(
    (keyword) => !core.includes(keyword) && containsKeyword(zones.full, keyword)
  );
  return { core, mentioned };
}

/** A keyword as the user typed it, for display ("nrw" never, "Digitalisierung" yes). */
function displayWord(keyword: string, textQuery: string): string {
  for (const raw of textQuery.split(/[^\p{L}\p{N}]+/u)) {
    const normalized = normalizeText(raw);
    if (normalized === keyword || normalized.startsWith(keyword)) {
      const original = raw.slice(0, keyword.length);
      return original.charAt(0).toUpperCase() + original.slice(1);
    }
  }
  return keyword.charAt(0).toUpperCase() + keyword.slice(1);
}

function topicInput(program: Foerderprogramm): TopicInput {
  return {
    name: program.name,
    summary: program.beschreibung,
    description: [program.zielgruppe, program.foerderbereich].filter(Boolean).join(". "),
    sections: [],
    categories: program.kategorien ?? [],
  };
}

function relevanceLevel(score: number): RelevanceLevel {
  if (score >= 70) return "hoch";
  if (score >= 40) return "mittel";
  return "niedrig";
}

/** Region hint — a fact about admission, stated positively, never a score. */
function regionHint(
  program: Foerderprogramm,
  criteria: HardCriteria
): string | undefined {
  const regions = program.facts?.foerdergebiet ?? [];
  if (regions.includes("BUND")) return "Bundesweit verfügbar";
  if (regions.includes("EU")) return "EU-weit verfügbar";
  const wanted = criteria.region;
  if (wanted && wanted !== "BUND" && regions.includes(wanted)) {
    return `Verfügbar in ${LAENDER[wanted]}`;
  }
  return undefined;
}

export interface ScoreProgramListParams {
  programs: Foerderprogramm[];
  filters?: Partial<SearchFilters>;
  /** The user's free-text query, if any. */
  textQuery?: string;
  source: ProgramSource;
  /** ISO date the data was checked; defaults to today. */
  checkedAt?: string;
  /** Fallback sources for programs that carry none of their own. */
  sourceUrls?: string[];
  limit?: number;
  today?: Date;
}

export function scoreProgramList({
  programs,
  filters,
  textQuery = "",
  source,
  checkedAt = getTodayIso(),
  sourceUrls = [],
  limit = MAX_PROGRAM_RESULTS,
  today = getTodayDate(),
}: ScoreProgramListParams): ScoredProgram[] {
  const criteria = criteriaFor(filters, textQuery);
  const topic = topicFor(filters?.foerderbereich);
  const keywords = relevanceKeywords(textQuery);
  const hasRelevanceContext = keywords.length > 0 || Boolean(topic);

  return programs
    .map((program): ScoredProgram | undefined => {
      const facts = program.facts ?? unknownFacts();
      const check = checkHardCriteria(facts, criteria);
      if (check.verdict === "AUSGESCHLOSSEN") return undefined;

      let earned = 0;
      let possible = 0;
      const topicWords: string[] = [];

      if (keywords.length > 0) {
        possible += WEIGHTS.keywords;
        const matched = matchedKeywords(keywords, program);
        const credit = matched.core.length + matched.mentioned.length / 2;
        earned += (credit / keywords.length) * WEIGHTS.keywords;
        topicWords.push(
          ...matched.core.map((keyword) => displayWord(keyword, textQuery))
        );
      }

      let topicResult: ThemenBewertung = "KEINE_AUSSAGE";
      if (topic) {
        possible += WEIGHTS.topic;
        topicResult = assessTopic(topicInput(program), topic);
        if (topicResult === "PASST") earned += WEIGHTS.topic;
        if (topicResult === "MOEGLICHERWEISE") earned += WEIGHTS.topic / 2;
        if (topicResult === "PASST" && !topicWords.includes(topic.label)) {
          topicWords.unshift(topic.label);
        }
      }

      const score = possible > 0 ? Math.round((earned / possible) * 100) : 50;
      const hints = [regionHint({ ...program, facts }, criteria)].filter(
        (hint): hint is string => Boolean(hint)
      );
      if (topicWords.length > 0) {
        hints.push(
          `Thema passt: ${Array.from(new Set(topicWords)).slice(0, 3).join(", ")}`
        );
      } else if (topicResult === "MOEGLICHERWEISE" && topic) {
        hints.push(`Thema möglicherweise passend: ${topic.label}`);
      }

      return {
        program: { ...program, facts },
        score,
        relevance: relevanceLevel(score),
        verdict: check.verdict === "GUELTIG" ? "GUELTIG" : "UNGEPRUEFT",
        hints,
        unchecked: uncheckedCriteria(check),
        linkWarning: getLinkWarning(program, today),
        linkIsGeneric: program.link ? isGenericLink(program.link) : undefined,
        source,
        checkedAt,
        sourceUrls: program.sourceUrls?.length ? program.sourceUrls : sourceUrls,
      };
    })
    .filter((result): result is ScoredProgram => Boolean(result))
    .filter((result) => !hasRelevanceContext || result.score >= MIN_RELEVANCE_SCORE)
    .sort(compareResults)
    .slice(0, limit);
}

/** Confirmed before unchecked, then by relevance. */
export function compareResults(a: ScoredProgram, b: ScoredProgram): number {
  if (a.verdict !== b.verdict) return a.verdict === "GUELTIG" ? -1 : 1;
  return b.score - a.score;
}
