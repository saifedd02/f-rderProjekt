import { thresholdFor, TOPIC_PROFILES, type TopicProfile } from "@/config/topics";
import { normalizeText } from "@/lib/utils/text";
import type { CatalogProgram, TopicMatch } from "@/types/catalog";
import type { ThemenBewertung } from "@/types/facts";

/**
 * Match a catalogue program against mpool's topics — deterministically.
 *
 * Same principle as `lib/search/scoring.ts`: no model decides what lands in an
 * alert mail. Every point is traceable to a category, a term or a heading, and
 * the reasons travel with the match so the digest can say WHY a program is in it.
 *
 * Two rules keep the precision up, both learned from running this over the full
 * catalogue: a topic needs at least one of its OWN distinctive terms (a broad
 * source category plus generic wording is not evidence), and a term found in the
 * program's name or purpose counts far more than one buried in 16 KB of prose,
 * where "Energie" or "Beratung" appear almost everywhere.
 *
 * This is the ONE Förderbereich definition: the alerts rank with `matchTopics`,
 * the search and the catalogue ask `assessTopic` — both on the same profiles,
 * the same term matching and the same negation handling.
 */

const POINTS = {
  /** Distinctive term in name, teaser or the purpose section. */
  primaryFocus: 30,
  primaryFocusCap: 60,
  /** Same term, but only somewhere deep in the full text. */
  primaryBody: 12,
  primaryBodyCap: 36,
  /** The source's own coarse category — corroboration, never evidence on its own. */
  category: 20,
  secondary: 8,
  secondaryCap: 24,
  /** The Fördergeber itself put the topic in the program's name. */
  nameBonus: 15,
} as const;

/** Below this length a term must match as a whole word, not as a substring. */
const WORD_BOUNDARY_MAX_LENGTH = 5;

/** Headings that state what a program is actually for. */
const PURPOSE_HEADING = /ziel|gegenstand|zweck|was wird gef|kurzbeschreibung|überblick/i;

/** How much of the description still counts as "up front". */
const FOCUS_DESCRIPTION_CHARS = 800;

/** The two zones a term can be found in. */
export interface ProgramText {
  /** Name, teaser, headings and the purpose section. */
  focus: string;
  /** Everything, including the full body prose. */
  full: string;
  /** The program name on its own. */
  name: string;
}

/**
 * Does `haystack` (already normalized) contain `term`?
 *
 * Short terms are matched on word boundaries — "csrd" must not fire inside a
 * longer token, while "energieeffizienz" is safe as a substring because German
 * compounds legitimately embed it ("Energieeffizienzberatung").
 */
function containsTerm(haystack: string, term: string): boolean {
  const needle = normalizeText(term);
  if (!needle) return false;

  if (needle.length <= WORD_BOUNDARY_MAX_LENGTH && !needle.includes(" ")) {
    return ` ${haystack} `.includes(` ${needle} `);
  }
  return haystack.includes(needle);
}

/**
 * Wording that negates what it governs: "Digitalisierung wird nicht gefördert",
 * "Ausgenommen sind …". A topic term inside such a clause is no evidence.
 */
const NEGATION =
  /\b(nicht (gefordert|forderfahig|zuwendungsfahig|unterstutzt|forderbar)|ausgenommen|ausgeschlossen|keine forderung|nicht antragsberechtigt)\b/;

/**
 * Drop negated clauses before matching.
 *
 * A clause is a sentence part between commas. When the negation LEADS a list
 * ("Nicht gefördert werden: A, B, C."), the rest of that sentence goes too.
 */
export function withoutNegations(text: string | undefined): string {
  if (!text) return "";
  return text
    .split(/(?<=[.!?;])\s+|\n+/)
    .map((sentence) => {
      const clauses = sentence.split(/,\s*/);
      const kept: string[] = [];
      for (const clause of clauses) {
        const normalized = normalizeText(clause);
        const negation = NEGATION.exec(normalized);
        if (negation) {
          // Leading negation ("Ausgenommen sind A, B und C"): it governs the
          // list that follows, so the rest of the sentence goes too.
          if (negation.index < 25 || clause.includes(":")) break;
          continue;
        }
        kept.push(clause);
      }
      return kept.join(", ");
    })
    .join(" ");
}

/** The minimal program shape the topic assessment needs — catalogue or web. */
export interface TopicInput {
  name: string;
  summary?: string;
  description?: string;
  sections: Array<{ heading: string; text: string }>;
  categories: string[];
  fundingBody?: string;
  fundingTypes?: string[];
}

/** Split a program's text into the zones the scoring distinguishes. */
export function buildProgramText(program: TopicInput): ProgramText {
  const purposeSections = program.sections
    .filter((section) => PURPOSE_HEADING.test(section.heading))
    .map((section) => withoutNegations(section.text));

  const focus = normalizeText(
    [
      program.name,
      withoutNegations(program.summary),
      program.sections.map((section) => section.heading).join(" "),
      purposeSections.join(" "),
      withoutNegations((program.description ?? "").slice(0, FOCUS_DESCRIPTION_CHARS)),
    ]
      .filter(Boolean)
      .join(" ")
  );

  const full = normalizeText(
    [
      program.name,
      withoutNegations(program.summary),
      withoutNegations(program.description),
      program.sections
        .map((section) => `${section.heading} ${withoutNegations(section.text)}`)
        .join(" "),
      program.fundingBody,
      (program.fundingTypes ?? []).join(" "),
    ]
      .filter(Boolean)
      .join(" ")
  );

  return { focus, full, name: normalizeText(program.name) };
}

/** Score one program against one topic. Returns undefined when it does not match. */
export function matchTopic(
  program: TopicInput,
  topic: TopicProfile,
  text: ProgramText = buildProgramText(program)
): TopicMatch | undefined {
  if (topic.exclude?.some((term) => containsTerm(text.full, term))) return undefined;

  // Where a topic demands context, the context has to be part of what the
  // program is ABOUT — a passing mention deep in an annex does not make a
  // Weiterbildung program a sustainability program.
  if (
    topic.requireAny &&
    !topic.requireAny.some((term) => containsTerm(text.focus, term))
  ) {
    return undefined;
  }

  const focusHits = topic.primary.filter((term) => containsTerm(text.focus, term));
  const bodyHits = topic.primary.filter(
    (term) => !focusHits.includes(term) && containsTerm(text.full, term)
  );

  // No distinctive term of this topic anywhere: not our subject, full stop.
  if (focusHits.length === 0 && bodyHits.length === 0) return undefined;

  const reasons: string[] = [];
  let score = 0;

  if (focusHits.length > 0) {
    score += Math.min(focusHits.length * POINTS.primaryFocus, POINTS.primaryFocusCap);
    reasons.push(`Thema im Kern des Programms: ${focusHits.slice(0, 3).join(", ")}`);
  }
  if (bodyHits.length > 0) {
    score += Math.min(bodyHits.length * POINTS.primaryBody, POINTS.primaryBodyCap);
    reasons.push(`Im Volltext genannt: ${bodyHits.slice(0, 3).join(", ")}`);
  }

  const matchedCategory = topic.categories.find((category) =>
    program.categories.includes(category)
  );
  if (matchedCategory) {
    score += POINTS.category;
    reasons.push(`Förderbereich „${matchedCategory}"`);
  }

  // Supporting vocabulary only corroborates a topic that is already established
  // up front — on its own it would fire on almost any long program text.
  if (focusHits.length > 0) {
    const secondaryHits = topic.secondary.filter((term) =>
      containsTerm(text.focus, term)
    );
    if (secondaryHits.length > 0) {
      score += Math.min(secondaryHits.length * POINTS.secondary, POINTS.secondaryCap);
      reasons.push(`Umfeld: ${secondaryHits.slice(0, 3).join(", ")}`);
    }
  }

  if (topic.primary.some((term) => containsTerm(text.name, term))) {
    score += POINTS.nameBonus;
    reasons.push("Thema steht im Programmnamen");
  }

  return {
    topicId: topic.id,
    topicLabel: topic.label,
    score: Math.min(100, score),
    reasons,
  };
}

/**
 * All topics a program matches above their threshold, strongest first.
 *
 * An empty result means the program is genuinely not mpool's business — the
 * normal case for most of the ~2,500 programs in the catalogue.
 */
export function matchTopics(
  program: CatalogProgram,
  profiles: TopicProfile[] = TOPIC_PROFILES
): TopicMatch[] {
  const text = buildProgramText(program);

  return profiles
    .map((topic) => {
      const match = matchTopic(program, topic, text);
      return match && match.score >= thresholdFor(topic) ? match : undefined;
    })
    .filter((match): match is TopicMatch => Boolean(match))
    .sort((a, b) => b.score - a.score);
}

/** The best score across all topics — the digest's ranking key. */
export function topScore(matches: TopicMatch[]): number {
  return matches.reduce((best, match) => Math.max(best, match.score), 0);
}

/**
 * The shared Förderbereich verdict.
 *
 *   PASST            the topic clears its threshold — same bar as the alerts
 *   MOEGLICHERWEISE  a distinctive term is there, but only weakly
 *   KEINE_AUSSAGE    no un-negated distinctive term at all
 */
export function assessTopic(program: TopicInput, topic: TopicProfile): ThemenBewertung {
  const match = matchTopic(program, topic);
  if (!match) return "KEINE_AUSSAGE";
  return match.score >= thresholdFor(topic) ? "PASST" : "MOEGLICHERWEISE";
}
