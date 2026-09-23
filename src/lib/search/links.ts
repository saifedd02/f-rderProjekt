import { EXPIRING_SOON_DAYS } from "@/config/app";
import { GENERIC_PATH_PATTERNS } from "@/config/sources";
import { diffInDays, getTodayDate } from "@/lib/utils/date";
import type { Foerderprogramm } from "@/types";

/**
 * True when a link only leads to a portal or overview page rather than to the
 * concrete Förderaufruf. Unparseable or missing links count as generic — the
 * caller must never present them as a verified program page.
 */
export function isGenericLink(link: string | undefined): boolean {
  if (!link) return true;

  try {
    const url = new URL(link);
    const host = url.hostname.replace("www.", "").toLowerCase();
    const path = url.pathname.toLowerCase();

    // A domain homepage can be official and reachable while still proving
    // nothing about one concrete programme.
    const isBareGenericHost = path.length <= 1;

    return (
      isBareGenericHost || GENERIC_PATH_PATTERNS.some((pattern) => pattern.test(path))
    );
  } catch {
    return true;
  }
}

/**
 * The single caveat to show on a program card, most severe first: a deadline
 * that is about to pass outranks a merely imprecise link. Closed programs never
 * get here — the hard check has already removed them.
 */
export function getLinkWarning(
  program: Foerderprogramm,
  today: Date = getTodayDate()
): string | undefined {
  const frist = program.facts?.fristDatum;
  if (frist && program.facts?.antragsstatus === "OFFEN") {
    const date = new Date(`${frist}T00:00:00`);
    const days = diffInDays(date, today);
    if (days >= 0 && days <= EXPIRING_SOON_DAYS) {
      return `Frist endet bald (${date.toLocaleDateString("de-DE")}).`;
    }
  }

  if (isGenericLink(program.link)) {
    return "Link führt nur zu einer allgemeinen Übersichtsseite. Bitte den konkreten Programmaufruf prüfen.";
  }

  return undefined;
}
