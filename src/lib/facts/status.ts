import { getTodayDate } from "@/lib/utils/date";
import { normalizeText } from "@/lib/utils/text";
import type { Antragsstatus } from "@/types/facts";

/**
 * Antragsstatus from evidence — never from a model's opinion.
 *
 * Two sources of evidence exist: the Förderdatenbank's editorial banner
 * (`gsb:header`) and deadline wording. Both are read conservatively: a closed
 * signal always wins, a concrete past deadline cannot be outvoted by "laufend",
 * and anything that is not clearly open stays UNBEKANNT.
 */

/** What the Förderdatenbank banner says, stored at ingest time. */
export type FdbHeaderStatus = "KEIN_VERMERK" | "GESCHLOSSEN" | "UNBEKANNT";

/**
 * Banner wording of a program that takes no new applications. Matched on the
 * normalized text so that the export's own typos ("Antagstellung", "nicht merh
 * möglich", "akktiv") are covered by the same rules.
 */
const CLOSED_HEADER = [
  /\bnicht (\w+ )?moglich\b/,
  /\bausgelaufen\b/,
  /\bbeendet\b/,
  /\beingestellt\b/,
  /\bverlangerung\b/,
  /\bantragsstopp\b/,
  /\bkeine (neuen )?antrage\b/,
];

/** Classify a `gsb:header` banner. An empty banner is "no remark", not "unknown". */
export function classifyFdbHeader(header: string | undefined): FdbHeaderStatus {
  const text = normalizeText(header);
  if (!text) return "KEIN_VERMERK";
  if (CLOSED_HEADER.some((pattern) => pattern.test(text))) return "GESCHLOSSEN";
  return "UNBEKANNT";
}

/** The status a banner implies on its own; undefined when there is no banner. */
export function statusFromFdbHeader(
  header: string | undefined
): Antragsstatus | undefined {
  const classified = classifyFdbHeader(header);
  return classified === "KEIN_VERMERK" ? undefined : classified;
}

// ── Deadline wording ──────────────────────────────────────────────────

/** What a closing statement is about — "Vorhaben beendet" is not "Programm beendet". */
const SUBJECT =
  "(programm|forderprogramm|forderung|richtlinie|aufruf|call|forderaufruf|ausschreibung|antragstellung|antragsverfahren|wettbewerb)\\w*";

const CLOSED_WORDING = [
  /\b(antrag\w*|einreichung\w*|bewerbung\w*)\b.{0,40}?\bnicht (mehr |derzeit |aktuell |langer )?moglich\b/,
  /\b(antrag\w*|einreichung\w*)\b.{0,30}?\b(ausgesetzt|gestoppt)\b/,
  /\bantragsstopp\b/,
  /\bkeine (neuen )?(antrage|antragstellung)\b/,
  /\b(mittel|kontingent|budget|fordermittel|haushaltsmittel) (sind |ist )?(bereits |vollstandig )?(aus)?(geschopft|erschopft)\b/,
  new RegExp(
    `\\b${SUBJECT}\\b.{0,30}?\\b(ausgelaufen|beendet|eingestellt|abgelaufen|geschlossen)\\b`
  ),
  /^(ausgelaufen|beendet|abgelaufen|eingestellt|geschlossen|closed|ended)\b/,
  /\b(call|submission|status) (is )?closed\b/,
];

const QUOTA_WORDING = [
  /\bsolange (die )?(haushalts|forder)?mittel\b/,
  /\bbis zur ausschopfung\b/,
  /\bnach verfugbarkeit\b/,
  /\bkontingent\b/,
  /\bwindhund/,
];

const OPEN_WORDING = [
  /\blaufend\b/,
  /\blaufendes programm\b/,
  /\bjederzeit\b/,
  /\bfortlaufend\b/,
  /\bganzjahrig\b/,
  /\b(ohne|keine) (antrags|einreichungs)?frist\b/,
  /\bantragstellung (ist )?(jederzeit |laufend |derzeit |aktuell )?moglich\b/,
  /\bantrage konnen\b.*\bgestellt werden\b/,
  /\b(derzeit|aktuell) geoffnet\b/,
  /\bcall (is )?open\b/,
];

/** Words that, right before a date, make it a deadline. */
const DEADLINE_CONTEXT =
  /(bis|frist|stichtag|stichtage|einreich\w*|antragsschluss|schluss|endet|ende|ablauf|lauft|gultig|deadline|spatestens|befristet|einzureichen|eingereicht|bewerbung|termin|zum)\s*$/;

/** Words that, right before a date, make it anything BUT a deadline. */
const NOT_DEADLINE_CONTEXT =
  /(vom|seit|ab|stand|datum|veroffentlicht|kraft|fassung|bekanntmachung|aktualisiert)\s*$/;

/** Words right AFTER a date that make it a publication date ("zum 01.01.2024 in Kraft"). */
const NOT_DEADLINE_AFTER = /^(in kraft|veroffentlicht|bekannt gemacht|geandert|erlassen)/;

/** What may stand between two dates of one list. */
const LIST_SEPARATOR = /^(und|sowie|oder|bzw)?$/;

/** "Anträge ab 01.02.2027" — an opening date, not a deadline. */
const OPENING_CONTEXT = /\bab\s*$/;

/** Words that may stand around a date that is the whole deadline value. */
const BARE_DATE_WORDS = new Set([
  "bis",
  "zum",
  "am",
  "spatestens",
  "einschliesslich",
  "frist",
  "antragsfrist",
  "einreichungsfrist",
  "stichtag",
  "deadline",
  "den",
  "uhr",
]);

const MONTHS: Record<string, number> = {
  januar: 1,
  january: 1,
  jan: 1,
  februar: 2,
  february: 2,
  feb: 2,
  marz: 3,
  maerz: 3,
  march: 3,
  april: 4,
  mai: 5,
  may: 5,
  juni: 6,
  june: 6,
  juli: 7,
  july: 7,
  august: 8,
  september: 9,
  oktober: 10,
  october: 10,
  november: 11,
  dezember: 12,
  december: 12,
};

interface FoundDate {
  date: Date;
  start: number;
  end: number;
}

function makeDate(year: number, month: number, day: number): Date | undefined {
  const fullYear = year < 100 ? 2000 + year : year;
  const date = new Date(fullYear, month - 1, day);
  if (
    date.getFullYear() !== fullYear ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined;
  }
  return date;
}

/** Every concrete date in the text: 30.06.2025, 30.06.25, 2025-06-30, 30. Juni 2025. */
function findDates(text: string): FoundDate[] {
  const found: FoundDate[] = [];
  const patterns: Array<[RegExp, (m: RegExpExecArray) => Date | undefined]> = [
    [
      /(?<![\d.])(\d{1,2})\.\s?(\d{1,2})\.\s?(\d{4}|\d{2})(?![\d.]*\d)/g,
      (m) => makeDate(Number(m[3]), Number(m[2]), Number(m[1])),
    ],
    [
      /(?<!\d)(\d{4})-(\d{2})-(\d{2})(?!\d)/g,
      (m) => makeDate(Number(m[1]), Number(m[2]), Number(m[3])),
    ],
    [
      /(?<!\d)(\d{1,2})\.?\s+([a-zäöü]+)\s+(\d{4})(?!\d)/gi,
      (m) => {
        const month = MONTHS[normalizeText(m[2])];
        return month ? makeDate(Number(m[3]), month, Number(m[1])) : undefined;
      },
    ],
  ];

  for (const [pattern, toDate] of patterns) {
    for (const match of text.matchAll(pattern)) {
      const date = toDate(match as RegExpExecArray);
      if (date) {
        found.push({
          date,
          start: match.index ?? 0,
          end: (match.index ?? 0) + match[0].length,
        });
      }
    }
  }
  return found.sort((a, b) => a.start - b.start);
}

/** The clause right before `index` — the part a date's meaning depends on. */
function contextBefore(text: string, index: number): string {
  const before = text.slice(Math.max(0, index - 60), index);
  const clause = before.split(/[;\n]|\.\s|:\s(?=[A-ZÄÖÜ])/).pop() ?? "";
  return normalizeText(clause);
}

function isBareDate(text: string, date: FoundDate): boolean {
  const rest = normalizeText(text.slice(0, date.start) + " " + text.slice(date.end));
  return rest.split(" ").every((word) => !word || BARE_DATE_WORDS.has(word));
}

function toIso(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export interface DeadlineStatus {
  status: Antragsstatus;
  /** The deadline the status rests on, ISO — the next one if several are open. */
  fristDatum?: string;
}

/**
 * Antragsstatus from deadline wording.
 *
 * Order is the rule set:
 *   1. closed wording                 → GESCHLOSSEN
 *   2. a future deadline date         → OFFEN (the next round counts)
 *   3. only past deadline dates       → GESCHLOSSEN ("laufend" cannot outvote it)
 *   4. a past year as deadline        → GESCHLOSSEN ("bis 2024")
 *   5. quota wording                  → KONTINGENT
 *   6. explicit open wording          → OFFEN
 *   7. anything else                  → UNBEKANNT
 *
 * A date counts only when it belongs to deadline wording ("bis", "Frist",
 * "Stichtag" …) or is the whole value; "Richtlinie vom 01.01.2020" is not a
 * deadline.
 */
export function statusFromDeadlineText(
  text: string | undefined,
  today: Date = getTodayDate()
): DeadlineStatus {
  const raw = (text ?? "").trim();
  if (!raw) return { status: "UNBEKANNT" };

  const normalized = normalizeText(raw);
  if (CLOSED_WORDING.some((pattern) => pattern.test(normalized))) {
    return { status: "GESCHLOSSEN" };
  }

  const dates = findDates(raw);
  const deadlines: FoundDate[] = [];
  let previous: FoundDate | undefined;
  for (const found of dates) {
    const context = contextBefore(raw, found.start);
    // "bis zum 14.04.2026, 07.07.2026 und 29.09.2026": a date listed right
    // after a deadline date is a deadline too.
    const listed =
      previous !== undefined &&
      deadlines.includes(previous) &&
      LIST_SEPARATOR.test(normalizeText(raw.slice(previous.end, found.start)));
    const isDeadline =
      listed ||
      (!NOT_DEADLINE_CONTEXT.test(context) &&
        !NOT_DEADLINE_AFTER.test(normalizeText(raw.slice(found.end, found.end + 30))) &&
        (DEADLINE_CONTEXT.test(context) || isBareDate(raw, found)));
    if (isDeadline) deadlines.push(found);
    previous = found;
  }

  const future = deadlines.filter((found) => found.date >= today);
  if (future.length > 0) {
    const next = future.reduce((a, b) => (a.date <= b.date ? a : b));
    return { status: "OFFEN", fristDatum: toIso(next.date) };
  }
  if (deadlines.length > 0) {
    const last = deadlines.reduce((a, b) => (a.date >= b.date ? a : b));
    return { status: "GESCHLOSSEN", fristDatum: toIso(last.date) };
  }

  const opening = dates.find(
    (found) => found.date > today && OPENING_CONTEXT.test(contextBefore(raw, found.start))
  );
  if (opening && /\b(antrag\w*|einreich\w*|bewerb\w*|call|aufruf)\b/.test(normalized)) {
    return { status: "NOCH_NICHT_OFFEN", fristDatum: toIso(opening.date) };
  }

  const yearDeadline = normalized.match(
    /\b(bis|ende|endet|lauft bis|laufzeit bis)( ende)? (20\d{2})\b/
  );
  if (yearDeadline && Number(yearDeadline[3]) < today.getFullYear()) {
    return { status: "GESCHLOSSEN" };
  }

  if (QUOTA_WORDING.some((pattern) => pattern.test(normalized))) {
    return { status: "KONTINGENT" };
  }
  if (OPEN_WORDING.some((pattern) => pattern.test(normalized))) {
    return { status: "OFFEN" };
  }
  return { status: "UNBEKANNT" };
}

/** Whether a status counts as normally active. */
export function isActiveStatus(status: Antragsstatus): boolean {
  return status === "OFFEN" || status === "KONTINGENT";
}

// ── Förderdatenbank deadline sentences ───────────────────────────────

/** What a sentence must be about for its date to decide the program's status. */
const PROGRAM_DEADLINE_SUBJECT = [
  // The Richtlinie itself ends: "Sie ist befristet bis zum 31. Dezember 2025."
  /^(\d+( \d+)* )?(sie|diese|die|das|der)\b.{0,120}\b(befristet|gilt bis|endet|ausser kraft)\b/,
  // A general application deadline: "Anträge können bis zum 30.06.2024 gestellt werden."
  /\b(antrag|antrage|antragstellung|antragsstellung|forderantrag\w*|projektskizzen?|einreichung)\b.{0,160}\b(bis (zum |spatestens )?|spatestens|frist)\b/,
];

/**
 * Sentences whose dates are about something else, or only about a special
 * case: records, reports, old versions, one year's round, a bonus, a
 * transitional rule. Their dates must neither open nor close a program.
 */
const OTHER_DEADLINE = [
  /\bfassung\b|\bgeltend\w*/,
  /\baufzubewahren\b|\baufbewahr\w*/,
  /\b(verwendungsnachweis|rechnung|sachbericht|nachweis|bericht)\w*/,
  /\b(abgeschlossen|beendet|abgerechnet|durchgefuhrt|umgesetzt) (sein|werden)\b/,
  /\b(gestellt|bewilligt|eingegangen|eingereicht|eingetragen) (wurden|worden|sind)\b/,
  /\b(massnahme|vorhaben)s?beginn\b|\bvorzeitig/,
  /\bin kraft\b(?!.{0,40}\bausser kraft)/,
  /\babweichend\b|\bubergang\w*|\berstmalig\w*|\bnachfolgend\b|\bjeweilig\w*/,
  /\b(bei|fur) (antragen|vorhaben|massnahmen)\b|\b(vorhaben|massnahmen|antrage|unternehmen|vereine)\b.{0,40}\bdie\b.{0,20}\bbis\b/,
  /\bdie bis\b/,
  /\b(jahr|jahre|jahres|haushaltsjahr|kalenderjahr|spieljahr|programmjahr|halfte|halbjahr|quartal) \d{4}\b/,
  /\b(forderrunde|einreichrunde|antragsrunde|runde) \d{4}\b|\b(einreichrunde|antragsrunde)\b/,
  /\b(sollen|sollten|hierfur|dafur|hoheren|erhohten|zusatzlich\w*)\b/,
  /\b(bewilligungszeitraum|zeitraum vom|stichtag)\b/,
  // Only a part of the program ends: "Diese Teilmaßnahme …", "gemäß Ziffer 2.1.1 …".
  /\b(teilmassnahme|ziffer|modellprojekt|einrichtungsphase)\b/,
];

/**
 * Whether a quoted Förderdatenbank sentence states when APPLICATIONS end (or
 * the Richtlinie expires). The portal's prose is full of other dates — "Belege
 * bis 31.12.2026 aufzubewahren", "in der bis 2017 geltenden Fassung" — and
 * those must not open or close anything.
 */
export function isProgramDeadlineSentence(sentence: string | undefined): boolean {
  const text = normalizeText(sentence);
  if (!text || !findDates(sentence ?? "").length) return false;
  if (OTHER_DEADLINE.some((pattern) => pattern.test(text))) return false;
  return PROGRAM_DEADLINE_SUBJECT.some((pattern) => pattern.test(text));
}
