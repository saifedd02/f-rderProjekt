import { HISTORY_WINDOW, MAX_PROGRAM_RESULTS } from "@/config/app";
import { getTodayIso } from "@/lib/utils/date";
import type { ChatHistoryEntry, SearchFilters } from "@/types";
import { EXTRACTION_RULES } from "./schema";

/** Phrasings that mean "these results are not good enough". */
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

/**
 * Whether the user is rejecting the previous results.
 *
 * Drives both the search temperature and an explicit "look elsewhere"
 * instruction — repeating the same programs after this is the worst outcome.
 */
export function isUserDissatisfied(message: string): boolean {
  return DISSATISFIED_PATTERNS.some((pattern) => pattern.test(message));
}

/** Temperature for this turn: exact for a first search, exploratory when rejected. */
export function getSearchTemperature(message: string, historyLength: number): number {
  if (isUserDissatisfied(message)) return 0.6;
  return historyLength > 0 ? 0.3 : 0.1;
}

/** The user's filter selection as prompt lines; only narrowed facets appear. */
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
    filters.unternehmensgroesse && filters.unternehmensgroesse !== "Alle auswählen"
      ? `- Unternehmensgröße: ${filters.unternehmensgroesse}`
      : "",
  ].filter(Boolean);

  return entries.length > 0 ? entries.join("\n") : "Keine aktiven Filter.";
}

/** The last few turns, labelled for the model. */
function formatHistory(history: ChatHistoryEntry[] = []): string {
  if (history.length === 0) return "Keine vorherige Konversation.";

  return history
    .slice(-HISTORY_WINDOW)
    .map(
      (entry) =>
        `${entry.role === "assistant" ? "Assistent" : "Nutzer"}: ${entry.content}`
    )
    .join("\n");
}

export interface SearchPromptInput {
  message: string;
  filters?: Partial<SearchFilters>;
  history?: ChatHistoryEntry[];
  /** Programs already shown in this session — never repeat them. */
  shownPrograms?: string[];
}

/**
 * Build the research prompt.
 *
 * Two things are load-bearing: today's date (so the model rejects expired
 * programs itself) and the exclusion list (so a follow-up search actually
 * returns something new rather than the same eight cards).
 */
export function buildSearchPrompt({
  message,
  filters,
  history,
  shownPrograms,
}: SearchPromptInput): string {
  const exclusionBlock = shownPrograms?.length
    ? `\nBEREITS GEZEIGTE PROGRAMME (NICHT WIEDERHOLEN):
${shownPrograms.map((name) => `- ${name}`).join("\n")}
→ Diese Programme DARF du NICHT nochmal nennen. Suche nach KOMPLETT ANDEREN Programmen!\n`
    : "";

  // Deliberately no "try other Förderarten / other Länder": that would ask the
  // model to break the very criteria the user set.
  const diversityBlock = isUserDissatisfied(message)
    ? `\nDER NUTZER MÖCHTE ANDERE ERGEBNISSE:
- Suche unter anderen Stichwörtern und bei anderen Fördergebern als bisher.
- Bleibe dabei innerhalb des Suchkontexts (Region, Förderart, Unternehmensgröße).
- Gib NIEMALS dieselben Programme wie zuvor zurück.\n`
    : "";

  return `Heute ist der ${getTodayIso()}. Recherchiere Förderprogramme in Deutschland, die HEUTE beantragt werden können.
Nimm KEINE ausgelaufenen Programme auf (z.B. "Digital Jetzt" und "go-digital" sind beendet).
${exclusionBlock}${diversityBlock}
SUCHKONTEXT — Filter des Nutzers (nur für die Auswahl, NICHT als Fakten übernehmen):
${formatFilters(filters)}

BISHERIGE KONVERSATION:
${formatHistory(history)}

AKTUELLE NUTZERANFRAGE:
${message}

Finde maximal ${MAX_PROGRAM_RESULTS} passende Förderprogramme. Nenne für jedes Programm die Felder des Schemas und die EXAKTE URL der offiziellen Programmseite. Verweise pro Programm auf die belegenden Quellen (sourceIndices).

${EXTRACTION_RULES}`;
}
