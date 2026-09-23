/**
 * Where the catalogue comes from and how its vocabulary maps to ours.
 *
 * Values only — no logic. Whoever needs to add a source domain, retune a
 * limit or fix a label edits exactly this file.
 */

/**
 * Bulk export of the federal Förderdatenbank (Bund, Länder, EU).
 *
 * ~28.5 MB ZIP, one XML per program, regenerated daily, licensed CC-BY 4.0.
 * The portal's HTML pages sit behind bot protection — always use this export,
 * never crawl the site.
 */
export const FDB_EXPORT_URL = "https://www.foerderdatenbank.de/FDB/WS/export";

/** Attribution required by the export's CC-BY 4.0 licence. */
export const FDB_ATTRIBUTION =
  "Datenquelle: Förderdatenbank des Bundes (BMWE), CC BY 4.0";

/** Path prefix of a program document inside the export archive. */
export const FDB_PROGRAM_PREFIX = "BMWI/FDB/Content/DE/Foerderprogramm/";

/** Path prefix of the external-link documents that carry the official URL. */
export const FDB_EXTERNAL_LINK_PREFIX = "BMWI/FDB/Content/DE/ExternerLink/";

/** Path prefix of the funding-body documents. */
export const FDB_FUNDING_BODY_PREFIX = "BMWI/FDB/Content/DE/Foerdergeber/";

/** Search endpoint of the EU Funding & Tenders Portal (anonymous read access). */
export const EU_SEARCH_URL = "https://api.tech.ec.europa.eu/search-api/prod/rest/search";

/** Public API key the portal itself uses for anonymous opportunity search. */
export const EU_SEARCH_API_KEY = "SEDIA";

/** Status ids of calls worth tracking: forthcoming and open. */
export const EU_OPEN_STATUS_IDS = ["31094501", "31094502"];

/** Result type id for calls for proposals (topics). */
export const EU_TOPIC_TYPE_ID = "1";

/** How many EU topics to pull per request; the portal caps page size. */
export const EU_PAGE_SIZE = 100;

/** Stop after this many EU pages — a guard against a runaway loop. */
export const EU_MAX_PAGES = 20;

/** Network timeouts, generous enough for a 28 MB download on a cold function. */
export const FETCH_TIMEOUT_MS = {
  export: 120_000,
  api: 30_000,
} as const;

// ── Vocabulary of the source taxonomy → our German labels ──────────────

/** Fördergebiet slugs. `_bundesweit` and `bundesweit` both occur upstream. */
export const FDB_REGION_LABELS: Record<string, string> = {
  _bundesweit: "Bundesweit",
  bundesweit: "Bundesweit",
  baden_wuerttemberg: "Baden-Württemberg",
  bayern: "Bayern",
  berlin: "Berlin",
  brandenburg: "Brandenburg",
  bremen: "Bremen",
  hamburg: "Hamburg",
  hessen: "Hessen",
  mecklenburg_vorpommern: "Mecklenburg-Vorpommern",
  // The export abbreviates these two and misspells Schleswig-Holstein.
  de_ni: "Niedersachsen",
  de_st: "Sachsen-Anhalt",
  nordrhein_westfalen: "Nordrhein-Westfalen",
  rheinland_pfalz: "Rheinland-Pfalz",
  saarland: "Saarland",
  sachsen: "Sachsen",
  schlesig_holstein: "Schleswig-Holstein",
  thueringen: "Thüringen",
  sonstige: "Sonstige",
};

/** Förderart slugs → the labels used in `data/taxonomie.ts`. */
export const FDB_FUNDING_TYPE_LABELS: Record<string, string> = {
  zuschuss: "Zuschuss",
  darlehen: "Kredit / Darlehen",
  buergschaft: "Bürgschaft",
  garantie: "Garantie",
  beteiligung: "Beteiligung",
  sonstige: "Sonstige",
};

/** Förderberechtigte slugs. */
export const FDB_ELIGIBILITY_LABELS: Record<string, string> = {
  unternehmen: "Unternehmen",
  existenzgruenderin: "Existenzgründung",
  kommune: "Kommune",
  oeffentliche_einrichtung: "Öffentliche Einrichtung",
  forschungseinrichtung: "Forschungseinrichtung",
  hochschule: "Hochschule",
  bildungseinrichtung: "Bildungseinrichtung",
  privatperson: "Privatperson",
  verband_vereinigung: "Verband / Vereinigung",
};

/** Förderbereich slugs → readable labels, as the portal itself names them. */
export const FDB_CATEGORY_LABELS: Record<string, string> = {
  arbeit: "Arbeit",
  aus_weiterbildung: "Aus- & Weiterbildung",
  aussenwirtschaft: "Außenwirtschaft",
  beratung: "Beratung",
  corona: "Corona-Hilfe",
  digitalisierung: "Digitalisierung",
  energieeffizienz_erneuerbare_energien: "Energieeffizienz & Erneuerbare Energien",
  existenzgruendung_festigung: "Existenzgründung & -festigung",
  forschung_innovation_themenoffen: "Forschung & Innovation (themenoffen)",
  forschung_innovation_themenspezifisch: "Forschung & Innovation (themenspezifisch)",
  frauenfoerderung: "Frauenförderung",
  gesundheit_soziales: "Gesundheit & Soziales",
  infrastruktur: "Infrastruktur",
  kultur_medien_sport: "Kultur, Medien & Sport",
  landwirtschaft_laendliche_entwicklung: "Landwirtschaft & Ländliche Entwicklung",
  messen_ausstellungen: "Messen & Ausstellungen",
  mobilitaet: "Mobilität",
  regionalfoerderung: "Regionalförderung",
  smart_cities_regionen: "Smart Cities & Regionen",
  staedtebau_stadterneuerung: "Städtebau & Stadterneuerung",
  umwelt_naturschutz: "Umwelt- & Naturschutz",
  unternehmensfinanzierung: "Unternehmensfinanzierung",
  wohnungsbau_modernisierung: "Wohnungsbau & Modernisierung",
};

/** Unternehmensgröße slugs → the labels used in `data/taxonomie.ts`. */
export const FDB_COMPANY_SIZE_LABELS: Record<string, string> = {
  kleinstunternehmen: "Kleinstunternehmen",
  kleines_unternehmen: "Kleines Unternehmen",
  mittleres_unternehmen: "Mittleres Unternehmen",
  grosses_unternehmen: "Großes Unternehmen",
};

/** Branchen slugs. */
export const FDB_INDUSTRY_LABELS: Record<string, string> = {
  dienstleistungen: "Dienstleistungen",
  freie_berufe: "Freie Berufe",
  gastgewerbe_tourismus: "Gastgewerbe / Tourismus",
  handel: "Handel",
  handwerk: "Handwerk",
  kultur_kreativwirtschaft: "Kultur- und Kreativwirtschaft",
  land_forst_fischwirtschaft: "Land-, Forst- und Fischwirtschaft",
  produzierendes_gewerbe: "Produzierendes Gewerbe",
};

// ── Alerting ──────────────────────────────────────────────────────────

/**
 * A change must reach this topic score to enter the digest.
 *
 * Deliberately not zero: a weekly mail that lists everything is a newsletter
 * nobody reads. Tune per topic in `config/topics.ts` when one runs hot.
 */
export const DEFAULT_TOPIC_THRESHOLD = 45;

/** Most entries in one digest mail; the rest stay in the app. */
export const MAX_DIGEST_ENTRIES = 25;

/**
 * How long a program may be missing before it counts as discontinued.
 *
 * A source that hiccups must not produce a mail full of "ENTFALLEN". With a
 * daily run, 36 hours means a program has to be absent from two consecutive
 * runs before anyone hears about it — the delay costs nothing (a discontinued
 * program is not urgent), a false alarm costs trust.
 */
export const REMOVAL_GRACE_HOURS = 36;

/**
 * Version of the stored record format. Bump it whenever a change to parsing or
 * fingerprinting alters the stored records: the next ingest then rebuilds the
 * catalogue as a silent migration run, so a format change can never be mailed
 * out as hundreds of "geändert" entries.
 */
export const CATALOG_SCHEMA_VERSION = 2;

// ── Priority alert ────────────────────────────────────────────────────

/**
 * Defaults of the priority alert — the mail that goes out right after a daily
 * ingest with NEW programs only. Each can be overridden via env
 * (`PRIORITY_ALERT_ENABLED`, `PRIORITY_ALERT_THRESHOLD`,
 * `PRIORITY_ALERT_MAX_ENTRIES`); an invalid value falls back to these.
 */
export const PRIORITY_ALERT_DEFAULTS = {
  enabled: true,
  threshold: 70,
  maxEntries: 10,
} as const;

/** Accepted ranges for the numeric env overrides. */
export const PRIORITY_ALERT_LIMITS = {
  threshold: { min: 0, max: 100 },
  maxEntries: { min: 1, max: 50 },
} as const;

/** From this topic score on, an entry is flagged as "Sehr hohe Priorität". */
export const PRIORITY_TOP_SCORE = 90;

/**
 * How long a new program counts as "sofort" meldewürdig.
 *
 * Covers two missed daily runs. Anything older is left to the weekly digest —
 * which also means that switching the feature on never floods the inbox with
 * a backlog of old changes.
 */
export const PRIORITY_ALERT_WINDOW_HOURS = 72;

/**
 * How long a delivery is held by the run that claimed it.
 *
 * Must exceed the longest route that sends (`/api/cron/ingest`, 300 s): only
 * after the lease has run out may another run take the delivery over.
 */
export const PRIORITY_ALERT_LEASE_MINUTES = 15;

/** Pause before a failed delivery may be retried. */
export const PRIORITY_ALERT_RETRY_MINUTES = 5;

/** How long an ingest run holds its lock; longer than the route's maxDuration. */
export const INGEST_LOCK_MINUTES = 10;

/** Reader-facing names of the catalogue sources. */
export const CATALOG_SOURCE_LABELS = {
  foerderdatenbank: "Förderdatenbank des Bundes",
  "eu-portal": "EU Funding & Tenders Portal",
} as const;
