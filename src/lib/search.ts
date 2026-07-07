import {
  DbFoerderprogramm,
  branchen,
  foerderarten,
  foerderbereiche,
  foerderprogramme,
  regionen,
  unternehmensgroessen,
} from "@/data/foerderprogramme";
import {
  CompanyProfile,
  DeadlineStatus,
  Foerderprogramm,
  MatchReason,
  ProgramSource,
  ScoredProgram,
  SearchFilters,
  defaultFilters,
  getTodayIso,
} from "./types";

type ProgramInput = Foerderprogramm | DbFoerderprogramm;

const GENERIC_DOMAINS = [
  "sachsen.de",
  "hessen.de",
  "baden-wuerttemberg.de",
  "bmuv.de",
  "bafa.de",
];

const GENERIC_PATH_PATTERNS = [
  /^\/de\/?$/i,
  /\/website\/de\/foerderangebote\/?$/i,
  /\/inlandsfoerderung\/unternehmen\/digitalisierung\/?$/i,
  /\/inlandsfoerderung\/unternehmen\/gruenden\/?$/i,
  /\/inlandsfoerderung\/unternehmen\/energie-und-umwelt\/?$/i,
];

// Entries are normalized via normalizeText (umlauts stripped) because
// extractKeywords compares AFTER normalization — raw umlaut forms never match.
const STOPWORDS = new Set(
  [
    "und",
    "oder",
    "der",
    "die",
    "das",
    "dem",
    "den",
    "des",
    "ein",
    "eine",
    "einer",
    "einem",
    "eines",
    "mit",
    "fuer",
    "für",
    "auf",
    "aus",
    "von",
    "zum",
    "zur",
    "bei",
    "im",
    "in",
    "am",
    "an",
    "wir",
    "uns",
    "unser",
    "unsere",
    "unternehmen",
    "foerderung",
    "förderung",
    "foerderprogramme",
    "förderprogramme",
    "programm",
    "programme",
    "moechten",
    "möchten",
    "lassen",
    "passen",
    "passend",
    "welche",
    "gibt",
    "suche",
    "suchen",
    "finde",
    "finden",
    "wollen",
    "brauchen",
    "kleine",
    "kleines",
    "kleiner",
    "mittlere",
    "mittleres",
    "grosse",
    "große",
    "grosses",
    "großes",
  ].map((word) => normalizeText(word))
);

const REGION_ALIASES: Record<string, string> = {
  deutschlandweit: "Bundesweit",
  bund: "Bundesweit",
  bundeslandweit: "Bundesweit",
  nrw: "Nordrhein-Westfalen",
};

const FOERDERBEREICH_ALIASES: Record<string, string> = {
  "ressoursen management": "Ressourcenmanagement",
  "ressourcen management": "Ressourcenmanagement",
  ressourcenmanagement: "Ressourcenmanagement",
  "nachhaltige technologische entwicklung in produktionsprozess":
    "Nachhaltige technologische Entwicklung in Produktionsprozessen",
  "nachhaltige technologische entwicklung in produktionsprozessen":
    "Nachhaltige technologische Entwicklung in Produktionsprozessen",
  emissionsminderung: "Maßnahmen zu Emissionsminderung",
  energieeffizienz: "Energieeffizienz & Erneuerbare Energien",
  erneuerbare: "Energieeffizienz & Erneuerbare Energien",
};

const FOERDERART_ALIASES: Record<string, string> = {
  darlehen: "Kredit / Darlehen",
  kredit: "Kredit / Darlehen",
  kredite: "Kredit / Darlehen",
  coaching: "Beratung / Coaching",
  beratung: "Beratung / Coaching",
  zuschuesse: "Zuschuss",
  zuschüsse: "Zuschuss",
};

const BRANCH_ALIASES: Record<string, string> = {
  landwirtschaft: "(CPA A 01) Landwirtschaft und Jagd",
  "it softwareentwicklung": "(CPA J) Information und Kommunikation",
  "beratung consulting":
    "(CPA M 69-72) Freiberufliche, wissenschaftliche und technische Dienstleistungen",
  handel: "(CPA G 46) Großhandel (ohne Handel mit Kfz)",
  handwerk:
    "(CPA C 33) Reparatur und Installation von Maschinen und Ausrüstungen",
  "transport logistik":
    "(CPA H 52) Lagerei und sonstige Dienstleistungen für den Verkehr",
  gastronomie: "(CPA I) Gastgewerbe",
  hotellerie: "(CPA I) Gastgewerbe",
  gesundheitswesen: "(CPA Q) Gesundheits- und Sozialwesen",
  finanzdienstleistungen: "(CPA K) Finanz- und Versicherungsdienstleistungen",
  "energie umwelt":
    "(CPA D 35.2) Elektrizitätsversorgung, Wärme- und Kälteversorgung",
  "bildung forschung": "(CPA P) Erziehung und Unterricht",
  "medien kommunikation": "(CPA J) Information und Kommunikation",
  immobilienwirtschaft: "(CPA L) Grundstücks- und Wohnungswesen",
  "sonstige dienstleistungen": "(CPA R-T) Sonstige Dienstleistungen",
  "verarbeitendes gewerbe": "(CPA C 28) Maschinenbau",
  baugewerbe: "(CPA F 43) Vorb. Baustellenarbeiten, Bauinstallation, sonstiger",
};

const SIZE_ALIASES: Record<string, string> = {
  grossunternehmen: "Großes Unternehmen",
  grossesunternehmen: "Großes Unternehmen",
  "grosses unternehmen": "Großes Unternehmen",
  mittelstand: "Mittleres Unternehmen",
  mittleresunternehmen: "Mittleres Unternehmen",
  kleinesunternehmen: "Kleines Unternehmen",
  kleinstbetrieb: "Kleinstunternehmen",
  kleinstunternehmen: "Kleinstunternehmen",
};

const FILTER_DEFAULTS = new Set([
  "",
  defaultFilters.region,
  defaultFilters.foerderbereich,
  defaultFilters.unternehmensbranche,
  defaultFilters.foerderart,
  defaultFilters.unternehmensgroesse,
]);

const CONFIDENCE_RANK: Record<ScoredProgram["confidence"], number> = {
  low: 0,
  medium: 1,
  high: 2,
};

interface ScoreParams {
  profile: CompanyProfile | null;
  filters?: Partial<SearchFilters>;
  textQuery?: string;
}

interface ScoreProgramListParams extends ScoreParams {
  programs: ProgramInput[];
  source: ProgramSource;
  checkedAt?: string;
  confidence?: ScoredProgram["confidence"];
  sourceUrls?: string[];
  limit?: number;
}

function normalizeText(value?: string): string {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " und ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function isActiveFilter(value?: string): boolean {
  return !FILTER_DEFAULTS.has(value || "");
}

function canonicalizeValue(
  value: string | undefined,
  options: string[],
  aliases: Record<string, string> = {}
): string {
  if (!value) return "";

  const normalized = normalizeText(value);
  if (!normalized) return "";

  const alias = aliases[normalized];
  if (alias) return alias;

  const exact = options.find((option) => normalizeText(option) === normalized);
  if (exact) return exact;

  const close = options.find((option) => {
    const optionNormalized = normalizeText(option);
    return (
      optionNormalized.includes(normalized) || normalized.includes(optionNormalized)
    );
  });

  return close || value;
}

function canonicalizeRegion(value: string | undefined): string {
  return canonicalizeValue(
    value,
    regionen.filter((entry) => entry !== "Alle Regionen"),
    REGION_ALIASES
  );
}

function canonicalizeFoerderbereich(value: string | undefined): string {
  return canonicalizeValue(
    value,
    foerderbereiche.filter((entry) => entry !== "Alle Kategorien"),
    FOERDERBEREICH_ALIASES
  );
}

function canonicalizeFoerderart(value: string | undefined): string {
  return canonicalizeValue(
    value,
    foerderarten.filter((entry) => entry !== "Alle auswählen"),
    FOERDERART_ALIASES
  );
}

function canonicalizeBranche(value: string | undefined): string {
  return canonicalizeValue(
    value,
    branchen.filter((entry) => entry !== "Alle auswählen"),
    BRANCH_ALIASES
  );
}

function canonicalizeGroesse(value: string | undefined): string {
  return canonicalizeValue(
    value,
    unternehmensgroessen.filter((entry) => entry !== "Alle auswählen"),
    SIZE_ALIASES
  );
}

function canonicalizeFilters(filters?: Partial<SearchFilters>): SearchFilters {
  return {
    region: canonicalizeRegion(filters?.region) || defaultFilters.region,
    foerderbereich:
      canonicalizeFoerderbereich(filters?.foerderbereich) ||
      defaultFilters.foerderbereich,
    unternehmensbranche:
      canonicalizeBranche(filters?.unternehmensbranche) ||
      defaultFilters.unternehmensbranche,
    foerderart:
      canonicalizeFoerderart(filters?.foerderart) || defaultFilters.foerderart,
    unternehmensgroesse:
      canonicalizeGroesse(filters?.unternehmensgroesse) ||
      defaultFilters.unternehmensgroesse,
  };
}

function canonicalizeProfile(profile: CompanyProfile | null): CompanyProfile {
  return {
    name: profile?.name || "",
    branche: canonicalizeBranche(profile?.branche) || profile?.branche || "",
    region: canonicalizeRegion(profile?.region) || profile?.region || "",
    groesse: canonicalizeGroesse(profile?.groesse) || profile?.groesse || "",
    mitarbeiter: profile?.mitarbeiter || "",
    umsatz: profile?.umsatz || "",
    vorhaben: profile?.vorhaben || "",
  };
}

function extractKeywords(text: string): string[] {
  return Array.from(
    new Set(
      normalizeText(text)
        .split(" ")
        .filter((word) => word.length > 2 && !STOPWORDS.has(word))
    )
  );
}

function slugify(value: string): string {
  return normalizeText(value).replace(/\s+/g, "-").slice(0, 80) || "programm";
}

function parseIsoDate(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseGermanDate(value: string): Date | undefined {
  const match = value.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (!match) return undefined;

  const date = new Date(
    Number.parseInt(match[3], 10),
    Number.parseInt(match[2], 10) - 1,
    Number.parseInt(match[1], 10)
  );

  return Number.isNaN(date.getTime()) ? undefined : date;
}

function getTodayDate(): Date {
  return new Date(`${getTodayIso()}T00:00:00`);
}

function diffInDays(target: Date, reference: Date): number {
  return Math.ceil((target.getTime() - reference.getTime()) / (1000 * 60 * 60 * 24));
}

export function getDeadlineStatus(
  frist?: string,
  isActive?: boolean
): DeadlineStatus {
  if (isActive === false) return "expired";
  if (!frist) return "unknown";

  const lower = frist.trim().toLowerCase();
  const today = getTodayDate();

  if (lower.startsWith("ended:")) {
    return "expired";
  }

  if (lower === "laufend" || lower.includes("laufend")) {
    return "active";
  }

  const isoDate = parseIsoDate(lower);
  if (isoDate) {
    if (isoDate < today) return "expired";
    return diffInDays(isoDate, today) <= 60 ? "expiring_soon" : "active";
  }

  const germanDate = parseGermanDate(lower);
  if (germanDate) {
    if (germanDate < today) return "expired";
    return diffInDays(germanDate, today) <= 60 ? "expiring_soon" : "active";
  }

  const allYears = [...lower.matchAll(/(\d{4})/g)].map((match) =>
    Number.parseInt(match[1], 10)
  );
  if (allYears.length > 0) {
    const lastYear = Math.max(...allYears);
    const currentYear = today.getFullYear();
    if (lastYear < currentYear) return "expired";
    if (lastYear === currentYear) return "expiring_soon";
    return "active";
  }

  return "unknown";
}

function createStableProgramId(program: ProgramInput, fallbackSource: ProgramSource): string {
  if (program.id) return program.id;

  const sourcePart = normalizeText(
    "quelle" in program ? program.quelle || fallbackSource : fallbackSource
  );
  return `${fallbackSource}-${slugify(program.name)}-${slugify(sourcePart || "quelle")}`;
}

function toRuntimeProgram(
  program: ProgramInput,
  fallbackSource: ProgramSource
): Foerderprogramm {
  const runtimeProgram: Foerderprogramm = {
    id: createStableProgramId(program, fallbackSource),
    name: program.name,
    beschreibung: program.beschreibung || undefined,
    foerderhoehe: program.foerderhoehe || undefined,
    zielgruppe: program.zielgruppe || undefined,
    region: program.region || undefined,
    frist: program.frist || undefined,
    foerderbereich: program.foerderbereich || undefined,
    foerderart: program.foerderart || undefined,
    unternehmensgroesse:
      program.unternehmensgroesse && program.unternehmensgroesse.length > 0
        ? program.unternehmensgroesse
        : [],
    unternehmensbranche:
      program.unternehmensbranche && program.unternehmensbranche.length > 0
        ? program.unternehmensbranche
        : [],
    link: program.link || undefined,
    quelle: program.quelle || fallbackSource,
    isActive:
      typeof program.isActive === "boolean" ? program.isActive : undefined,
    sourceUrls:
      "sourceUrls" in program && program.sourceUrls && program.sourceUrls.length > 0
        ? program.sourceUrls
        : undefined,
    statusNote: "statusNote" in program ? program.statusNote || undefined : undefined,
  };

  const deadlineStatus = getDeadlineStatus(runtimeProgram.frist, runtimeProgram.isActive);
  runtimeProgram.isActive = deadlineStatus !== "expired";

  return runtimeProgram;
}

function buildSemanticText(program: Foerderprogramm): string {
  return normalizeText(
    [
      program.name,
      program.beschreibung,
      program.foerderbereich,
      program.foerderart,
      program.zielgruppe,
      program.region,
      program.quelle,
      program.unternehmensbranche?.join(" "),
      program.unternehmensgroesse?.join(" "),
    ]
      .filter(Boolean)
      .join(" ")
  );
}

export function isGenericLink(link: string | undefined): boolean {
  if (!link) return true;

  try {
    const url = new URL(link);
    const host = url.hostname.replace("www.", "").toLowerCase();
    const path = url.pathname.toLowerCase();

    if (
      GENERIC_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`)) &&
      path.length <= 1
    ) {
      return true;
    }

    return GENERIC_PATH_PATTERNS.some((pattern) => pattern.test(path));
  } catch {
    return true;
  }
}

function getDeadlineWarning(
  program: Foerderprogramm,
  deadlineStatus: DeadlineStatus
): string | undefined {
  if (deadlineStatus === "expired") {
    return `Programm oder Frist ist nicht mehr aktiv${program.frist ? ` (${program.frist})` : ""}.`;
  }

  if (deadlineStatus === "expiring_soon") {
    return `Frist läuft bald aus${program.frist ? ` (${program.frist})` : ""}.`;
  }

  return undefined;
}

export function getLinkWarning(program: Foerderprogramm): string | undefined {
  const deadlineStatus = getDeadlineStatus(program.frist, program.isActive);
  const deadlineWarning = getDeadlineWarning(program, deadlineStatus);
  if (deadlineWarning) return deadlineWarning;

  if (isGenericLink(program.link)) {
    return "Link führt nur zu einer allgemeinen Übersichtsseite. Bitte den konkreten Programmaufruf prüfen.";
  }

  return undefined;
}

// ── Cross-reference against the curated local database ───────────────────
// The local DB is hand-maintained and knows which well-known programs have
// ended (e.g. "Digital Jetzt", "go-digital"). The web pipeline must respect
// that knowledge so a hallucinated "still active" result can't slip through.

/** Distinctive core of a program name (text before the first separator). */
function programShortName(name: string): string {
  const core = name.split(/[–—(:]|\s-\s/)[0];
  return normalizeText(core);
}

const KNOWN_PROGRAMS = foerderprogramme.map((program) => ({
  fullNorm: normalizeText(program.name),
  shortNorm: programShortName(program.name),
  program,
}));

/** Find the curated DB entry that a web result refers to, if any. */
function findKnownProgram(name: string): DbFoerderprogramm | undefined {
  const fullNorm = normalizeText(name);
  if (!fullNorm) return undefined;

  const hit = KNOWN_PROGRAMS.find((known) => {
    if (fullNorm === known.fullNorm) return true;
    // Require a reasonably distinctive short name to avoid generic collisions.
    if (known.shortNorm.length < 5) return false;
    // Only forward containment: the web name must CONTAIN the known program's
    // distinctive short name. We deliberately do NOT match the reverse
    // direction (a short generic web name like "Digital" contained in a longer
    // DB short name) — that wrongly swept up unrelated programs.
    return fullNorm.includes(known.shortNorm);
  });

  return hit?.program;
}

/**
 * Reconcile a web-sourced program with the curated DB:
 *  - if it maps to a program the DB marks as ended → force inactive (so it gets
 *    filtered out instead of being shown as "Aktiv");
 *  - if it maps to an active DB program → backfill a verified official link when
 *    the web link is missing/generic, and trust the DB deadline.
 */
export function reconcileWebProgram(program: Foerderprogramm): Foerderprogramm {
  const known = findKnownProgram(program.name);
  if (!known) return program;

  const knownEnded =
    known.isActive === false ||
    getDeadlineStatus(known.frist, known.isActive) === "expired";

  if (knownEnded) {
    return {
      ...program,
      frist: known.frist,
      isActive: false,
      statusNote: `Laut Datenbank ausgelaufen/beendet (${known.frist.replace("ended:", "")}). Keine Neuanträge.`,
    };
  }

  // Active known program → enrich with the curated official link if ours is weak,
  // and TRUST THE DB DEADLINE: a hallucinated stale web `frist` (e.g. a past year)
  // must not flip a DB-confirmed-active program to "expired" and filter it out.
  const useDbLink = isGenericLink(program.link);
  return {
    ...program,
    link: useDbLink ? known.link : program.link,
    frist: known.frist || program.frist,
    quelle: program.quelle || known.quelle,
    isActive: true,
  };
}

/** Lenient text match: true if either normalized value contains the other.
 *  An empty program value passes (we don't filter out on missing free-text data). */
function textOverlaps(programValue: string | undefined, filterValue: string): boolean {
  const pb = normalizeText(programValue);
  const fb = normalizeText(filterValue);
  if (!fb || !pb) return true;
  return pb.includes(fb) || fb.includes(pb);
}

// National/EU markers. Web results express "Bundesweit" a dozen ways
// ("Deutschland", "Deutschlandweit", "Bund", "national", "EU", "bundesweit (DE)").
// An exact "Bundesweit" string-equality gate dropped almost every web program and
// returned nothing — so we match on any of these tokens instead.
const NATIONWIDE_MARKERS = [
  "bundesweit",
  "deutschland",
  "deutschlandweit",
  "bund",
  "national",
  "ganz deutschland",
  "eu",
  "europa",
  "europaweit",
  "europaisch",
];

function isNationwideRegion(normalizedRegion: string): boolean {
  if (!normalizedRegion) return false;
  return NATIONWIDE_MARKERS.some((marker) => normalizedRegion.includes(marker));
}

function matchesRegion(programRegion: string, filterRegion: string): boolean {
  if (!isActiveFilter(filterRegion)) return true;

  const pr = normalizeText(programRegion);
  // Missing region on a web result must NOT drop the program — recall first.
  if (!pr) return true;

  // "Bundesweit" filter → any nationally/EU-available program qualifies.
  if (filterRegion === "Bundesweit") return isNationwideRegion(pr);

  // Specific Bundesland → that land (lenient containment) OR a nationwide program.
  const fr = normalizeText(filterRegion);
  if (pr.includes(fr) || fr.includes(pr)) return true;
  return isNationwideRegion(pr);
}

function matchesBranche(program: Foerderprogramm, branche: string): boolean {
  if (!isActiveFilter(branche)) return true;

  const entries = program.unternehmensbranche || [];
  if (entries.length === 0) return true;
  if (entries.includes("Alle")) return true;
  if (entries.includes(branche)) return true;

  const normalizedTarget = normalizeText(branche);
  return entries.some((entry) => {
    const normalizedEntry = normalizeText(entry);
    return (
      normalizedEntry.includes(normalizedTarget) ||
      normalizedTarget.includes(normalizedEntry)
    );
  });
}

function matchesSize(program: Foerderprogramm, groesse: string): boolean {
  if (!isActiveFilter(groesse)) return true;

  const sizes = program.unternehmensgroesse || [];
  if (sizes.length === 0) return true;
  if (sizes.includes(groesse)) return true;

  // Web results use free-text size labels ("Grossunternehmen", "MidCap", "KMU").
  // Canonicalize both sides so e.g. "Grossunternehmen" matches "Großes Unternehmen".
  const target = canonicalizeGroesse(groesse) || groesse;
  return sizes.some((entry) => canonicalizeGroesse(entry) === target);
}

function matchesFilters(
  program: Foerderprogramm,
  filters: SearchFilters
): boolean {
  const deadlineStatus = getDeadlineStatus(program.frist, program.isActive);
  if (deadlineStatus === "expired") return false;

  if (!matchesRegion(program.region || "", filters.region)) return false;

  // foerderbereich/foerderart: lenient containment rather than strict equality.
  // Web results carry free-text values ("Digitalisierung, Investitionen, KI"),
  // so an exact-equality filter would drop every web program and return nothing.
  if (
    isActiveFilter(filters.foerderbereich) &&
    !textOverlaps(program.foerderbereich, filters.foerderbereich)
  ) {
    return false;
  }

  if (
    isActiveFilter(filters.foerderart) &&
    !textOverlaps(program.foerderart, filters.foerderart)
  ) {
    return false;
  }

  if (!matchesSize(program, filters.unternehmensgroesse)) return false;
  if (!matchesBranche(program, filters.unternehmensbranche)) return false;

  return true;
}

export function scoreProgramList({
  programs,
  profile,
  filters,
  textQuery,
  source,
  checkedAt = getTodayIso(),
  confidence = source === "datenbank" ? "high" : "medium",
  sourceUrls = [],
  limit = 8,
}: ScoreProgramListParams): ScoredProgram[] {
  const normalizedProfile = canonicalizeProfile(profile);
  const normalizedFilters = canonicalizeFilters(filters);
  const effectiveRegion = isActiveFilter(normalizedFilters.region)
    ? normalizedFilters.region
    : normalizedProfile.region;
  const effectiveGroesse = isActiveFilter(normalizedFilters.unternehmensgroesse)
    ? normalizedFilters.unternehmensgroesse
    : normalizedProfile.groesse;
  const effectiveBranche = isActiveFilter(normalizedFilters.unternehmensbranche)
    ? normalizedFilters.unternehmensbranche
    : normalizedProfile.branche;

  const combinedKeywords = extractKeywords(
    [
      textQuery,
      normalizedProfile.vorhaben,
      effectiveBranche,
      isActiveFilter(normalizedFilters.foerderbereich)
        ? normalizedFilters.foerderbereich
        : "",
    ]
      .filter(Boolean)
      .join(" ")
  );

  const candidates = programs
    .map((program) => toRuntimeProgram(program, source))
    .filter((program) => matchesFilters(program, normalizedFilters));

  return candidates
    .map((program) => {
      let score = 0;
      let maxPossible = 0;
      const reasons: MatchReason[] = [];
      const deadlineStatus = getDeadlineStatus(program.frist, program.isActive);

      if (effectiveRegion) {
        maxPossible += 25;
        const programRegionNorm = normalizeText(program.region);
        if (program.region === effectiveRegion) {
          score += 25;
          reasons.push({ label: `Verfügbar in ${effectiveRegion}`, matched: true });
        } else if (isNationwideRegion(programRegionNorm)) {
          score += 20;
          reasons.push({ label: "Bundesweit verfügbar", matched: true });
        } else if (programRegionNorm.includes(normalizeText(effectiveRegion))) {
          score += 22;
          reasons.push({ label: `Verfügbar in ${effectiveRegion}`, matched: true });
        }
      }

      if (effectiveGroesse) {
        maxPossible += 20;
        if (matchesSize(program, effectiveGroesse)) {
          score += 20;
          reasons.push({
            label: `Für ${effectiveGroesse} geeignet`,
            matched: true,
          });
        } else {
          reasons.push({ label: `Nicht für ${effectiveGroesse}`, matched: false });
        }
      }

      if (effectiveBranche) {
        maxPossible += 20;
        if ((program.unternehmensbranche || []).includes("Alle")) {
          score += 16;
          reasons.push({ label: "Branchenoffen", matched: true });
        } else if (matchesBranche(program, effectiveBranche)) {
          score += 20;
          reasons.push({ label: "Branche passt", matched: true });
        } else {
          reasons.push({ label: "Andere Branche", matched: false });
        }
      }

      if (isActiveFilter(normalizedFilters.foerderbereich)) {
        maxPossible += 15;
        if (
          normalizeText(program.foerderbereich) ===
          normalizeText(normalizedFilters.foerderbereich)
        ) {
          score += 15;
          reasons.push({
            label: normalizedFilters.foerderbereich,
            matched: true,
          });
        }
      }

      if (isActiveFilter(normalizedFilters.foerderart)) {
        maxPossible += 10;
        if (
          normalizeText(program.foerderart) === normalizeText(normalizedFilters.foerderart)
        ) {
          score += 10;
          reasons.push({
            label: normalizedFilters.foerderart,
            matched: true,
          });
        }
      }

      if (combinedKeywords.length > 0) {
        maxPossible += 25;
        const semanticText = buildSemanticText(program);
        const semanticTokens = semanticText.split(" ");
        // German compounds ("digitalisierungsfoerderung") must also match
        // their contained stem in the program text ("digitalisierung").
        const matchedTerms = combinedKeywords.filter(
          (keyword) =>
            semanticText.includes(keyword) ||
            (keyword.length >= 8 &&
              semanticTokens.some(
                (token) => token.length >= 6 && keyword.includes(token)
              ))
        );
        const textScore = Math.min(
          25,
          Math.round((matchedTerms.length / combinedKeywords.length) * 25)
        );

        score += textScore;

        if (matchedTerms.length >= 3) {
          reasons.push({
            label: `Thema passt: ${matchedTerms.slice(0, 3).join(", ")}`,
            matched: true,
          });
        } else if (matchedTerms.length > 0) {
          reasons.push({ label: "Thema teilweise relevant", matched: true });
        } else if (textQuery || normalizedProfile.vorhaben) {
          reasons.push({
            label: "Wenig thematische Übereinstimmung",
            matched: false,
          });
        }
      }

      if (deadlineStatus === "expiring_soon") {
        reasons.push({ label: "Frist läuft bald aus", matched: false });
      }

      if (program.statusNote) {
        reasons.push({ label: program.statusNote, matched: false });
      }

      const normalizedScore =
        maxPossible > 0 ? Math.round((score / maxPossible) * 100) : 50;

      const programSources =
        program.sourceUrls && program.sourceUrls.length > 0
          ? program.sourceUrls
          : sourceUrls;

      return {
        program,
        score: normalizedScore,
        reasons: reasons.slice(0, 5),
        linkWarning: getLinkWarning(program),
        linkIsGeneric: program.link ? isGenericLink(program.link) : undefined,
        source,
        checkedAt,
        deadlineStatus,
        confidence,
        sourceUrls: programSources,
      } satisfies ScoredProgram;
    })
    .filter((result) => {
      const hasContext =
        combinedKeywords.length > 0 ||
        effectiveRegion ||
        effectiveGroesse ||
        effectiveBranche ||
        isActiveFilter(normalizedFilters.foerderbereich) ||
        isActiveFilter(normalizedFilters.foerderart);

      return hasContext ? result.score >= 20 : true;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function scorePrograms({
  profile,
  filters,
  textQuery,
}: ScoreParams): ScoredProgram[] {
  return scoreProgramList({
    programs: foerderprogramme,
    profile,
    filters,
    textQuery,
    source: "datenbank",
    checkedAt: getTodayIso(),
    confidence: "high",
  });
}

function getProgramKey(program: ScoredProgram): string {
  return [
    normalizeText(program.program.name),
    normalizeText(program.program.quelle),
    normalizeText(program.program.region),
  ]
    .filter(Boolean)
    .join("|");
}

function uniqueStrings(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function mergeReasons(a: MatchReason[], b: MatchReason[]): MatchReason[] {
  const seen = new Set<string>();
  const merged: MatchReason[] = [];

  for (const reason of [...a, ...b]) {
    const key = `${reason.label}|${reason.matched ? "1" : "0"}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(reason);
  }

  return merged.slice(0, 5);
}

function pickPreferredProgram(a: ScoredProgram, b: ScoredProgram): ScoredProgram {
  if (a.score !== b.score) return a.score > b.score ? a : b;
  if (CONFIDENCE_RANK[a.confidence] !== CONFIDENCE_RANK[b.confidence]) {
    return CONFIDENCE_RANK[a.confidence] > CONFIDENCE_RANK[b.confidence] ? a : b;
  }
  if ((a.sourceUrls?.length || 0) !== (b.sourceUrls?.length || 0)) {
    return (a.sourceUrls?.length || 0) > (b.sourceUrls?.length || 0) ? a : b;
  }
  return a;
}

function mergeTwoPrograms(a: ScoredProgram, b: ScoredProgram): ScoredProgram {
  const preferred = pickPreferredProgram(a, b);
  const other = preferred === a ? b : a;

  return {
    ...preferred,
    program: {
      ...other.program,
      ...preferred.program,
      isActive: preferred.program.isActive ?? other.program.isActive,
    },
    reasons: mergeReasons(preferred.reasons, other.reasons),
    linkWarning: preferred.linkWarning || other.linkWarning,
    source:
      preferred.source === other.source ? preferred.source : "hybrid",
    confidence:
      CONFIDENCE_RANK[preferred.confidence] >= CONFIDENCE_RANK[other.confidence]
        ? preferred.confidence
        : other.confidence,
    sourceUrls: uniqueStrings([...(preferred.sourceUrls || []), ...(other.sourceUrls || [])]),
  };
}

export function mergeScoredPrograms(
  groups: ScoredProgram[][],
  limit = 8
): ScoredProgram[] {
  const merged = new Map<string, ScoredProgram>();

  for (const group of groups) {
    for (const program of group) {
      const key = getProgramKey(program);
      const existing = merged.get(key);
      if (!existing) {
        merged.set(key, program);
        continue;
      }

      merged.set(key, mergeTwoPrograms(existing, program));
    }
  }

  return Array.from(merged.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function getProgramsSummary(programs: ScoredProgram[]): string {
  return programs
    .slice(0, 5)
    .map((entry, index) => {
      const positives = entry.reasons
        .filter((reason) => reason.matched)
        .slice(0, 3)
        .map((reason) => reason.label)
        .join(", ");

      return `${index + 1}. ${entry.program.name} (${entry.score}% Match)
- Förderbereich: ${entry.program.foerderbereich}
- Förderart: ${entry.program.foerderart}
- Region: ${entry.program.region}
- Förderhöhe: ${entry.program.foerderhoehe}
- Gründe: ${positives || "keine klaren Stärken"}`;
    })
    .join("\n\n");
}

export function buildFallbackReply(
  programs: ScoredProgram[],
  profile: CompanyProfile | null,
  filters?: Partial<SearchFilters>
): string {
  const normalizedProfile = canonicalizeProfile(profile);
  const normalizedFilters = canonicalizeFilters(filters);
  const activeFilters = [
    isActiveFilter(normalizedFilters.region) ? normalizedFilters.region : "",
    isActiveFilter(normalizedFilters.foerderbereich)
      ? normalizedFilters.foerderbereich
      : "",
    isActiveFilter(normalizedFilters.foerderart) ? normalizedFilters.foerderart : "",
    isActiveFilter(normalizedFilters.unternehmensbranche)
      ? normalizedFilters.unternehmensbranche
      : "",
    isActiveFilter(normalizedFilters.unternehmensgroesse)
      ? normalizedFilters.unternehmensgroesse
      : "",
  ].filter(Boolean);

  if (programs.length === 0) {
    const scope =
      activeFilters.length > 0
        ? `mit den aktiven Filtern (${activeFilters.join(", ")})`
        : "für Ihre Anfrage";

    return `Ich habe aktuell keine guten und nach heutigem Stand aktiven Treffer ${scope} gefunden. Wahrscheinlich ist die Suche zu eng oder das Vorhaben passt nicht sauber auf die vorhandenen Programme. Versuchen Sie es mit einer allgemeineren Beschreibung oder lockern Sie einzelne Filter.`;
  }

  const intro =
    normalizedProfile.name || normalizedProfile.branche
      ? `Für ${normalizedProfile.name || "Ihr Unternehmen"} sind diese Programme aktuell am relevantesten.`
      : "Diese Programme sind aktuell am relevantesten.";

  const highlights = programs
    .slice(0, 3)
    .map((entry) => {
      const positiveReason =
        entry.reasons.find((reason) => reason.matched)?.label || "gute Gesamtabdeckung";
      return `${entry.program.name} (${entry.score}%): ${positiveReason}`;
    })
    .join("\n");

  return `${intro}\n\n${highlights}\n\nDie Liste ist serverseitig gefiltert; prüfen Sie trotzdem vor dem Antrag Fristen, Detailkriterien und die offizielle Förderseite.`;
}
