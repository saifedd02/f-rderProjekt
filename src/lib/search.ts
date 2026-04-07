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
  TODAY,
  defaultFilters,
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

const STOPWORDS = new Set([
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
]);

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
  return new Date(`${TODAY}T00:00:00`);
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

function isGenericLink(link: string | undefined): boolean {
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

const REGION_BUNDESWEIT_KEYWORDS = ["bundesweit", "deutschlandweit", "deutschland", "bund", "national"];

function normalizeRegionName(value: string): string {
  const norm = normalizeText(value);
  // Map common abbreviations to full names
  const regionMap: Record<string, string> = {
    nrw: "nordrhein westfalen",
    bw: "baden wurttemberg",
    "baden wuerttemberg": "baden wurttemberg",
    by: "bayern",
    be: "berlin",
    bb: "brandenburg",
    hb: "bremen",
    hh: "hamburg",
    he: "hessen",
    mv: "mecklenburg vorpommern",
    ni: "niedersachsen",
    rp: "rheinland pfalz",
    sl: "saarland",
    sn: "sachsen",
    st: "sachsen anhalt",
    sh: "schleswig holstein",
    th: "thuringen",
  };
  return regionMap[norm] || norm;
}

function isBundesweit(region: string): boolean {
  const norm = normalizeText(region);
  return REGION_BUNDESWEIT_KEYWORDS.some((kw) => norm.includes(kw));
}

function matchesRegion(programRegion: string, filterRegion: string): boolean {
  if (!isActiveFilter(filterRegion)) return true;
  // Programs with unknown region: allow them through (especially for web results)
  if (!programRegion) return true;

  const normProgram = normalizeRegionName(programRegion);
  const normFilter = normalizeRegionName(filterRegion);

  // Bundesweit programs match any region filter
  if (isBundesweit(programRegion)) return true;

  // If filter is Bundesweit, only show bundesweit programs
  if (isBundesweit(filterRegion)) return isBundesweit(programRegion);

  // Fuzzy matching: check if either contains the other
  return normProgram.includes(normFilter) || normFilter.includes(normProgram);
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
  return sizes.includes(groesse);
}

function matchesFilters(
  program: Foerderprogramm,
  filters: SearchFilters
): boolean {
  const deadlineStatus = getDeadlineStatus(program.frist, program.isActive);
  if (deadlineStatus === "expired") return false;

  if (!matchesRegion(program.region || "", filters.region)) return false;

  if (isActiveFilter(filters.foerderbereich) && program.foerderbereich) {
    const normProgram = normalizeText(program.foerderbereich);
    const normFilter = normalizeText(filters.foerderbereich);
    // Fuzzy: allow partial match (e.g. "Digitalisierung" matches "Digitalisierung und IT")
    if (!normProgram.includes(normFilter) && !normFilter.includes(normProgram)) {
      return false;
    }
  }

  if (isActiveFilter(filters.foerderart) && program.foerderart) {
    const normProgram = normalizeText(program.foerderart);
    const normFilter = normalizeText(filters.foerderart);
    if (!normProgram.includes(normFilter) && !normFilter.includes(normProgram)) {
      return false;
    }
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
  checkedAt = TODAY,
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
    [textQuery, normalizedProfile.vorhaben, effectiveBranche, normalizedFilters.foerderbereich]
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
        const normProgramRegion = normalizeRegionName(program.region || "");
        const normEffectiveRegion = normalizeRegionName(effectiveRegion);
        if (isBundesweit(program.region || "")) {
          score += 20;
          reasons.push({ label: "Bundesweit verfügbar", matched: true });
        } else if (
          normProgramRegion.includes(normEffectiveRegion) ||
          normEffectiveRegion.includes(normProgramRegion)
        ) {
          score += 25;
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
        const matchedTerms = combinedKeywords.filter((keyword) =>
          semanticText.includes(keyword)
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

      const normalizedScore =
        maxPossible > 0 ? Math.round((score / maxPossible) * 100) : 50;

      return {
        program,
        score: normalizedScore,
        reasons: reasons.slice(0, 5),
        linkWarning: getLinkWarning(program),
        source,
        checkedAt,
        deadlineStatus,
        confidence,
        sourceUrls,
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

      // Web results have less structured data → lower threshold
      const minScore = source === "websuche" ? 10 : 20;
      return hasContext ? result.score >= minScore : true;
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
    checkedAt: TODAY,
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
        : "für das aktuelle Profil";

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
