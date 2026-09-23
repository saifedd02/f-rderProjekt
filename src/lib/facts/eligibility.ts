import type { Antragsberechtigt, Pruefergebnis } from "@/types/facts";
import { ANTRAGSBERECHTIGT_LABELS } from "./labels";
import { unique } from "./tokens";

/**
 * Antragsberechtigung. The finder searches for companies, so only programs
 * open to Unternehmen or Existenzgründer/innen qualify; a program for
 * Kommunen only is excluded, an unknown one stays unchecked.
 */

const FDB_LABELS: Record<string, Antragsberechtigt> = {
  Unternehmen: "UNTERNEHMEN",
  Existenzgründung: "EXISTENZGRUENDER",
  "Existenzgründer/in": "EXISTENZGRUENDER",
  Kommune: "KOMMUNE",
  "Öffentliche Einrichtung": "OEFFENTLICHE_EINRICHTUNG",
  Forschungseinrichtung: "FORSCHUNGSEINRICHTUNG",
  Hochschule: "HOCHSCHULE",
  Bildungseinrichtung: "BILDUNGSEINRICHTUNG",
  Privatperson: "PRIVATPERSON",
  "Verband / Vereinigung": "VERBAND",
};

/** Who a company search accepts. */
const COMPANY_APPLICANTS: Antragsberechtigt[] = ["UNTERNEHMEN", "EXISTENZGRUENDER"];

export function eligibilityFromLabels(labels: string[]): Antragsberechtigt[] {
  const codes = unique(
    labels
      .map((label) => FDB_LABELS[label])
      .filter((code): code is Antragsberechtigt => Boolean(code))
  );
  return codes.length > 0 ? codes : ["UNBEKANNT"];
}

export function isEligibilityUnknown(codes: Antragsberechtigt[]): boolean {
  return codes.length === 0 || codes.every((code) => code === "UNBEKANNT");
}

/** The check for a company search. */
export function checkEligibility(codes: Antragsberechtigt[]): Pruefergebnis {
  if (isEligibilityUnknown(codes)) return "UNGEPRUEFT";
  return codes.some((code) => COMPANY_APPLICANTS.includes(code))
    ? "GUELTIG"
    : "AUSGESCHLOSSEN";
}

export function eligibilityLabel(codes: Antragsberechtigt[]): string | undefined {
  if (isEligibilityUnknown(codes)) return undefined;
  return codes
    .filter(
      (code): code is Exclude<Antragsberechtigt, "UNBEKANNT"> => code !== "UNBEKANNT"
    )
    .map((code) => ANTRAGSBERECHTIGT_LABELS[code])
    .join(", ");
}
