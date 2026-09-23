import { getTodayDate } from "@/lib/utils/date";
import type { CatalogLevel, CatalogProgram } from "@/types/catalog";
import type { FoerdergeberEbene, ProgramFacts } from "@/types/facts";
import { eligibilityFromLabels } from "./eligibility";
import { extractIndustryExclusions } from "./exclusions";
import { instrumentsFromLabels, parseInstruments } from "./instrument";
import { regionsFromLabels } from "./region";
import { sizesFromLabels } from "./size";
import {
  isProgramDeadlineSentence,
  statusFromDeadlineText,
  type DeadlineStatus,
} from "./status";

/**
 * Catalogue record → hard facts.
 *
 * Computed at read time, not stored: a deadline passes without the record
 * changing, so the status has to be judged against today every time. What is
 * stored is the time-independent evidence (the portal banner, the EU status).
 *
 * Records written before these fields existed carry no banner. For them the
 * status is UNBEKANNT — the old blanket "isActive: true" is gone for good.
 */

const LEVELS: Record<CatalogLevel, FoerdergeberEbene> = {
  bund: "BUND",
  land: "LAND",
  eu: "EU",
  kommune: "KOMMUNE",
  unbekannt: "UNBEKANNT",
};

function parseIso(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** EU calls: the portal's own status, corrected by the dates it publishes. */
function euStatus(program: CatalogProgram, today: Date): DeadlineStatus {
  const deadline = parseIso(program.deadlineDate);
  const fristDatum = program.deadlineDate?.slice(0, 10);
  if (deadline && deadline < today) return { status: "GESCHLOSSEN", fristDatum };

  if (program.euStatus === "OPEN") return { status: "OFFEN", fristDatum };
  if (program.euStatus === "FORTHCOMING") {
    const opening = parseIso(program.openingDate);
    return opening && opening <= today
      ? { status: "OFFEN", fristDatum }
      : { status: "NOCH_NICHT_OFFEN", fristDatum };
  }

  // Legacy record without the portal status: only a passed deadline is certain.
  const fromText = statusFromDeadlineText(program.deadline, today);
  return fromText.status === "GESCHLOSSEN" ? fromText : { status: "UNBEKANNT" };
}

/**
 * Förderdatenbank: the editorial banner decides. A record WITHOUT a banner is
 * open — the portal flags every program that takes no applications — with two
 * exceptions taken from its own deadline sentence:
 *
 *   - a clear program deadline that has passed    → GESCHLOSSEN
 *   - any other passed date or closing wording    → UNBEKANNT (unclear, so
 *     neither shown as open nor hidden as closed)
 */
function fdbStatus(program: CatalogProgram, today: Date): DeadlineStatus {
  if (program.headerStatus === "GESCHLOSSEN") return { status: "GESCHLOSSEN" };

  const fromText = statusFromDeadlineText(program.deadline, today);
  const clear = isProgramDeadlineSentence(program.deadline);

  if (fromText.status === "GESCHLOSSEN") {
    return clear && fromText.fristDatum ? fromText : { status: "UNBEKANNT" };
  }
  // Legacy record (banner never read) or a banner we do not understand.
  if (program.headerStatus !== "KEIN_VERMERK") return { status: "UNBEKANNT" };

  if (
    clear &&
    (fromText.status === "KONTINGENT" || fromText.status === "NOCH_NICHT_OFFEN")
  ) {
    return fromText;
  }
  return {
    status: "OFFEN",
    fristDatum: clear && fromText.status === "OFFEN" ? fromText.fristDatum : undefined,
  };
}

export function catalogFacts(
  program: CatalogProgram,
  today: Date = getTodayDate()
): ProgramFacts {
  const { status, fristDatum } =
    program.source === "eu-portal" ? euStatus(program, today) : fdbStatus(program, today);

  const profileText = [program.name, program.summary].filter(Boolean).join(" ");

  return {
    foerdergebiet: regionsFromLabels(program.regions),
    foerdergeberEbene: LEVELS[program.level] ?? "UNBEKANNT",
    antragsstatus: status,
    fristDatum,
    antragsberechtigte: eligibilityFromLabels(program.eligibleParties),
    groessen: sizesFromLabels(program.companySizes),
    instrumente: program.instruments?.length
      ? program.instruments
      : instrumentsFromLabels(program.fundingTypes),
    merkmale: parseInstruments(profileText).merkmale,
    gegenstaende: program.categories.includes("beratung") ? ["BERATUNG_COACHING"] : [],
    branchenausschluesse:
      program.industryExclusions ??
      extractIndustryExclusions(
        program.description,
        [program.name, ...program.categories].join(" ")
      ),
    herkunft: "KATALOG",
  };
}
