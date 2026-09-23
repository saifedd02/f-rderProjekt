import type {
  Antragsstatus,
  HardCheckResult,
  HardCriteria,
  KriteriumPruefung,
  Pruefergebnis,
  ProgramFacts,
} from "@/types/facts";
import { checkEligibility } from "./eligibility";
import { checkInstrument } from "./instrument";
import { checkRegion } from "./region";
import { checkSize } from "./size";

/**
 * THE hard-criteria check. Search and alerts both call this — there is no
 * second rule set anywhere.
 *
 * Deterministic and code-based: no substring, no free text, no model. Each
 * criterion yields GUELTIG, UNGEPRUEFT (the program does not say) or
 * AUSGESCHLOSSEN (the program says something else). The verdict is the worst
 * of them, so a single unknown can never add up to GUELTIG.
 */

function checkStatus(status: Antragsstatus): Pruefergebnis {
  if (status === "OFFEN" || status === "KONTINGENT") return "GUELTIG";
  if (status === "GESCHLOSSEN") return "AUSGESCHLOSSEN";
  return "UNGEPRUEFT";
}

function worst(results: Pruefergebnis[]): Pruefergebnis {
  if (results.includes("AUSGESCHLOSSEN")) return "AUSGESCHLOSSEN";
  if (results.includes("UNGEPRUEFT")) return "UNGEPRUEFT";
  return "GUELTIG";
}

export function checkHardCriteria(
  facts: ProgramFacts,
  criteria: HardCriteria
): HardCheckResult {
  const checks: KriteriumPruefung[] = [
    { kriterium: "Antragsstatus", ergebnis: checkStatus(facts.antragsstatus) },
    {
      kriterium: "Antragsberechtigung",
      ergebnis: checkEligibility(facts.antragsberechtigte),
    },
  ];
  if (criteria.region) {
    checks.push({
      kriterium: "Region",
      ergebnis: checkRegion(facts.foerdergebiet, criteria.region),
    });
  }
  if (criteria.groessen?.length) {
    checks.push({
      kriterium: "Unternehmensgröße",
      ergebnis: checkSize(facts.groessen, criteria.groessen),
    });
  }
  if (criteria.instrumente?.length) {
    checks.push({
      kriterium: "Förderart",
      ergebnis: checkInstrument(facts.instrumente, criteria.instrumente),
    });
  }

  return { verdict: worst(checks.map((check) => check.ergebnis)), checks };
}

/** The criteria that could not be checked, for an honest "bitte prüfen" line. */
export function uncheckedCriteria(result: HardCheckResult): string[] {
  return result.checks
    .filter((check) => check.ergebnis === "UNGEPRUEFT")
    .map((check) => check.kriterium);
}
