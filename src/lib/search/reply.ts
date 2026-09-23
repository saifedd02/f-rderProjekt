import type { ScoredProgram, SearchFilters } from "@/types";
import { criteriaFor } from "./criteria";
import { isActiveFilter } from "./normalize";
import { LAENDER, type Groesse } from "@/types/facts";
import { GROESSE_LABELS } from "@/lib/facts/labels";

/**
 * The assistant's answer text.
 *
 * Deliberately written here rather than taken from the model: the model's own
 * prose opened with a disclaimer ("Hinweis zur Auswahl") that read as an excuse
 * instead of a result. This states what was found, names the top matches with
 * the reason they ranked, and keeps the one caveat that matters.
 */
export function buildSearchReply(
  programs: ScoredProgram[],
  filters?: Partial<SearchFilters>,
  textQuery = ""
): string {
  if (programs.length === 0) {
    return buildEmptyReply(filters, textQuery);
  }

  const highlights = programs
    .slice(0, 3)
    .map((entry) => {
      const reason = entry.hints[entry.hints.length - 1] || "passt zu Ihren Kriterien";
      return `${entry.program.name}: ${reason}`;
    })
    .join("\n");

  const unchecked = programs.some((entry) => entry.verdict === "UNGEPRUEFT")
    ? " Bei einigen Programmen fehlen in den Quellen Angaben zu einzelnen Kriterien — das ist auf der Karte vermerkt."
    : "";

  return `Diese Programme sind aktuell am relevantesten.\n\n${highlights}\n\nDie Liste ist serverseitig geprüft.${unchecked} Prüfen Sie vor dem Antrag trotzdem Fristen, Detailkriterien und die offizielle Förderseite.`;
}

/** Nothing found — name the active criteria so the user knows what to loosen. */
function buildEmptyReply(
  filters: Partial<SearchFilters> | undefined,
  textQuery: string
): string {
  const active = describeActiveFilters(filters, textQuery);
  const scope =
    active.length > 0
      ? `mit den aktiven Kriterien (${active.join(", ")})`
      : "für Ihre Anfrage";

  return `Ich habe aktuell keine passenden, nach heutigem Stand beantragbaren Treffer ${scope} gefunden. Wahrscheinlich ist die Suche zu eng oder das Vorhaben passt nicht sauber auf die vorhandenen Programme. Versuchen Sie es mit einer allgemeineren Beschreibung oder lockern Sie einzelne Filter.`;
}

function sizeText(sizes: Groesse[]): string {
  return sizes
    .filter((size): size is Exclude<Groesse, "UNBEKANNT"> => size !== "UNBEKANNT")
    .map((size) => GROESSE_LABELS[size])
    .join(" / ");
}

/**
 * The criteria the search actually applied — dropdowns and what was read from
 * the query text ("in NRW"), in readable form.
 */
export function describeActiveFilters(
  filters?: Partial<SearchFilters>,
  textQuery = ""
): string[] {
  const criteria = criteriaFor(filters, textQuery);
  return [
    criteria.region === "BUND"
      ? "Bundesweit"
      : criteria.region
        ? LAENDER[criteria.region]
        : undefined,
    isActiveFilter(filters?.foerderbereich) ? filters?.foerderbereich : undefined,
    isActiveFilter(filters?.foerderart) ? filters?.foerderart : undefined,
    criteria.groessen ? sizeText(criteria.groessen) : undefined,
  ].filter((value): value is string => Boolean(value));
}
