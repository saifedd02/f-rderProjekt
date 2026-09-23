import { DEFAULT_TOPIC_THRESHOLD } from "./catalog";

/**
 * mpool's consulting topics, as matchable profiles.
 *
 * `data/taxonomie.ts` names what mpool advises on; the official taxonomy of the
 * Förderdatenbank knows only broad categories ("umwelt_naturschutz"), and terms
 * like "Klimabilanzierung" or "CSRD" appear nowhere in it. So a topic is matched
 * on three signals at once: the source category, wording in the program text,
 * and — where a term alone would be too generic — a required context.
 *
 * `label` MUST stay identical to the entry in `data/taxonomie.ts`, so the
 * digest, the filters and the alerts speak about the same thing.
 */
export interface TopicProfile {
  id: string;
  /** Exactly as written in `data/taxonomie.ts` → `foerderbereiche`. */
  label: string;
  /** Förderbereich slugs of the source taxonomy that indicate this topic. */
  categories: string[];
  /** Distinctive terms — a single hit is strong evidence. */
  primary: string[];
  /** Supporting terms — several are needed to matter. */
  secondary: string[];
  /**
   * At least one of these must appear, otherwise the topic does not match at
   * all. Used where the primary terms are generic on their own ("Weiterbildung"
   * describes half the catalogue; "Weiterbildung zu Klimaschutz" does not).
   */
  requireAny?: string[];
  /** Any hit vetoes the match outright. */
  exclude?: string[];
  /** Overrides `DEFAULT_TOPIC_THRESHOLD` for this topic. */
  threshold?: number;
}

export const TOPIC_PROFILES: TopicProfile[] = [
  {
    id: "digitalisierung",
    label: "Digitalisierung",
    categories: ["digitalisierung"],
    primary: [
      "digitalisierung",
      "digitale transformation",
      "künstliche intelligenz",
      "industrie 4.0",
      "automatisierung",
      "cybersicherheit",
      "it-sicherheit",
      "digitalbonus",
      "digitale geschäftsmodelle",
      "datenanalyse",
      "cloud",
      "software",
      // EU calls are published in English only — without these the whole
      // EU catalogue would be invisible to a German-only profile.
      "digitalisation",
      "digital transformation",
      "artificial intelligence",
      "cybersecurity",
    ],
    secondary: [
      "innovation",
      "prozessoptimierung",
      "technologie",
      "vernetzung",
      "mittelstand",
      "beratung",
    ],
  },
  {
    id: "nachhaltigkeitsberichterstattung",
    label: "Nachhaltigkeitsberichterstattung",
    categories: ["beratung", "aus_weiterbildung", "umwelt_naturschutz"],
    primary: [
      "nachhaltigkeitsbericht",
      "nachhaltigkeitsberichterstattung",
      "csrd",
      "esrs",
      "nichtfinanzielle berichterstattung",
      "lieferkettensorgfaltspflichtengesetz",
      "eu-taxonomie",
      "berichtspflicht",
      "sustainability reporting",
      "non-financial reporting",
    ],
    secondary: [
      "nachhaltigkeit",
      "transparenz",
      "reporting",
      "zertifizierung",
      "managementsystem",
      "beratung",
    ],
  },
  {
    id: "klimabilanzierung",
    label: "Klimabilanzierung",
    categories: [
      "umwelt_naturschutz",
      "energieeffizienz_erneuerbare_energien",
      "beratung",
    ],
    primary: [
      "klimabilanz",
      "co2-bilanz",
      "treibhausgasbilanz",
      "carbon footprint",
      "co2-fußabdruck",
      "ghg protocol",
      "dekarbonisierungsfahrplan",
      "transformationskonzept",
      "klimaneutralität",
      "life cycle assessment",
      "climate accounting",
    ],
    secondary: [
      "klimaschutz",
      "emissionen",
      "bilanzierung",
      "monitoring",
      "energieaudit",
      "beratung",
    ],
  },
  {
    id: "nachhaltige-produktion",
    label: "Nachhaltige technologische Entwicklung in Produktionsprozessen",
    categories: [
      "forschung_innovation_themenspezifisch",
      "umwelt_naturschutz",
      "energieeffizienz_erneuerbare_energien",
    ],
    primary: [
      "produktionsprozess",
      "prozesswärme",
      "industrielle prozesse",
      "dekarbonisierung der industrie",
      "abwärmenutzung",
      "ressourceneffiziente produktion",
      "produktionstechnik",
      "klimaneutrale produktion",
      "sustainable manufacturing",
      "industrial decarbonisation",
      "process heat",
    ],
    secondary: [
      "fertigung",
      "anlage",
      "modernisierung",
      "investition",
      "effizienz",
      "industrie",
    ],
  },
  {
    id: "nachhaltiger-einkauf",
    label: "Nachhaltiger Einkauf",
    categories: ["beratung", "umwelt_naturschutz", "aussenwirtschaft"],
    primary: [
      "nachhaltige beschaffung",
      "nachhaltiger einkauf",
      "lieferkette",
      "supply chain",
      "lieferantenmanagement",
      "sorgfaltspflichten",
      "beschaffungsprozess",
      "sustainable procurement",
    ],
    secondary: ["nachhaltigkeit", "standards", "zertifizierung", "einkauf", "beratung"],
  },
  {
    id: "nachhaltige-seminare",
    label: "Nachhaltige Seminare",
    categories: ["aus_weiterbildung", "beratung"],
    primary: [
      "weiterbildung",
      "qualifizierung",
      "schulung",
      "seminar",
      "fortbildung",
      "kompetenzentwicklung",
    ],
    // "Weiterbildung" alone describes hundreds of programs — only the ones with
    // an mpool subject attached are of interest.
    requireAny: [
      "nachhaltigkeit",
      "klimaschutz",
      "energieeffizienz",
      "erneuerbare energien",
      "umweltmanagement",
      "ressourceneffizienz",
      "kreislaufwirtschaft",
      "digitalisierung",
      "csrd",
    ],
    secondary: ["beschäftigte", "personal", "coaching", "fachkräfte"],
    threshold: 55,
  },
  {
    id: "emissionsminderung",
    label: "Maßnahmen zu Emissionsminderung",
    categories: [
      "umwelt_naturschutz",
      "energieeffizienz_erneuerbare_energien",
      "mobilitaet",
    ],
    primary: [
      "emissionsminderung",
      "treibhausgasminderung",
      "co2-einsparung",
      "dekarbonisierung",
      "luftreinhaltung",
      "emissionsarm",
      "klimaneutral",
      "decarbonisation",
      "emission reduction",
      "greenhouse gas reduction",
    ],
    secondary: ["klimaschutz", "umwelt", "anlage", "investition", "energie"],
  },
  {
    id: "ressourcenmanagement",
    label: "Ressourcenmanagement",
    categories: ["umwelt_naturschutz", "forschung_innovation_themenspezifisch"],
    primary: [
      "ressourceneffizienz",
      "kreislaufwirtschaft",
      "materialeffizienz",
      "abfallvermeidung",
      "rohstoffeffizienz",
      "sekundärrohstoffe",
      "wassermanagement",
      "recycling",
      "circular economy",
      "resource efficiency",
      "waste prevention",
    ],
    secondary: ["umwelt", "effizienz", "produktion", "investition", "beratung"],
  },
  {
    id: "energiebereitstellung",
    label: "Energiebereitstellung",
    categories: ["energieeffizienz_erneuerbare_energien", "infrastruktur"],
    primary: [
      "photovoltaik",
      "windenergie",
      "erneuerbare energien",
      "eigenstromerzeugung",
      "kraft-wärme-kopplung",
      "wärmepumpe",
      "geothermie",
      "biomasse",
      "wasserstoff",
      "energiespeicher",
      "nahwärme",
      "fernwärme",
      "renewable energy",
      "photovoltaics",
      "hydrogen",
      "heat pump",
    ],
    secondary: ["energie", "strom", "anlage", "investition", "netz"],
  },
  {
    id: "energieeffizienz",
    label: "Energieeffizienz & Erneuerbare Energien",
    categories: ["energieeffizienz_erneuerbare_energien"],
    primary: [
      "energieeffizienz",
      "energieeinsparung",
      "energieaudit",
      "energiemanagementsystem",
      "energieberatung",
      "abwärme",
      "iso 50001",
      "gebäudesanierung",
      "energy efficiency",
      "energy audit",
    ],
    secondary: ["energie", "investition", "modernisierung", "beratung", "klimaschutz"],
  },
];

/** The threshold that applies to a topic. */
export function thresholdFor(topic: TopicProfile): number {
  return topic.threshold ?? DEFAULT_TOPIC_THRESHOLD;
}
