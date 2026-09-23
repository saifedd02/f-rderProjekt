import type { ExtractedProgram } from "@/lib/facts/web";
import { LAENDER } from "@/types/facts";
import { BRANCHENAUSSCHLUSS_LABELS } from "@/lib/facts/labels";

/**
 * THE extraction contract for every web provider — Perplexity, Gemini, and
 * the benchmark candidates Claude and OpenAI. Same fields, same enums, same
 * rules, so a provider comparison measures the provider, not the prompt.
 *
 * Plain JSON-Schema subset (type/enum/items/properties/required) that all four
 * structured-output APIs accept.
 */

const REGION_CODES = [...Object.keys(LAENDER), "BUND", "EU"];

const stringArray = (values: string[]) => ({
  type: "array",
  items: { type: "string", enum: values },
});

export const PROGRAM_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    beschreibung: { type: "string" },
    foerderhoehe: { type: "string" },
    zielgruppe: { type: "string" },
    region: { type: "string" },
    foerdergebiet: stringArray(REGION_CODES),
    foerdergeberEbene: {
      type: "string",
      enum: ["BUND", "LAND", "EU", "KOMMUNE", "UNBEKANNT"],
    },
    frist: { type: "string" },
    fristDatum: { type: "string" },
    antragsstatus: {
      type: "string",
      enum: ["OFFEN", "GESCHLOSSEN", "NOCH_NICHT_OFFEN", "KONTINGENT", "UNBEKANNT"],
    },
    statusBeleg: { type: "string" },
    antragsberechtigte: stringArray([
      "UNTERNEHMEN",
      "EXISTENZGRUENDER",
      "KOMMUNE",
      "OEFFENTLICHE_EINRICHTUNG",
      "FORSCHUNGSEINRICHTUNG",
      "HOCHSCHULE",
      "BILDUNGSEINRICHTUNG",
      "PRIVATPERSON",
      "VERBAND",
    ]),
    unternehmensgroessen: stringArray(["KLEINST", "KLEIN", "MITTEL", "GROSS", "ALLE"]),
    instrumente: stringArray([
      "ZUSCHUSS",
      "DARLEHEN",
      "BUERGSCHAFT",
      "GARANTIE",
      "BETEILIGUNG",
      "STEUERLICH",
      "SONSTIGE",
    ]),
    merkmale: stringArray(["TILGUNGSZUSCHUSS", "NACHRANG_MEZZANINE"]),
    foerderart: { type: "string" },
    foerderbereich: { type: "string" },
    ausgeschlosseneBranchen: stringArray(Object.keys(BRANCHENAUSSCHLUSS_LABELS)),
    quelle: { type: "string" },
    link: { type: "string" },
    sourceIndices: { type: "array", items: { type: "integer" } },
  },
  required: ["name", "link", "antragsstatus", "sourceIndices"],
} as const;

export const SEARCH_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    reply: { type: "string" },
    programs: { type: "array", items: PROGRAM_SCHEMA },
  },
  required: ["reply", "programs"],
} as const;

/** The rules every provider gets — the text half of the contract. */
export const EXTRACTION_RULES = `REGELN FÜR DIE FAKTEN JE PROGRAMM (streng):
- Gib nur wieder, was die Quelle zu DIESEM Programm sagt. Die Filter des Nutzers sind Suchkontext, KEINE Fakten: übernimm Region, Förderart oder Unternehmensgröße niemals aus den Filtern.
- Formuliere nichts passend zum Filter um und ergänze keine fehlenden Werte. UNBEKANNT bzw. eine leere Liste ist ausdrücklich erlaubt und erwünscht, wenn die Quelle nichts dazu sagt.
- foerdergebiet: wo Antragsteller ihren Sitz haben müssen. Codes: BW, BY, BE, BB, HB, HH, HE, MV, NI, NW, RP, SL, SN, ST, SH, TH; BUND = bundesweit; EU = EU-weit. EU-Mittel (z. B. EFRE) machen ein Landesprogramm NICHT zu EU. "region": die Regionsangabe wörtlich.
- foerdergeberEbene: wer fördert (BUND, LAND, EU, KOMMUNE) — unabhängig vom Fördergebiet.
- antragsstatus: OFFEN nur mit Beleg (künftiges Fristdatum oder ausdrückliche Aussage, dass Anträge aktuell gestellt werden können); den Beleg wörtlich in "statusBeleg". GESCHLOSSEN bei Antragsstopp, ausgelaufenen Programmen oder abgelaufener Frist. KONTINGENT bei "solange Mittel verfügbar". Sonst UNBEKANNT.
- frist: wörtlich aus der Quelle. fristDatum: YYYY-MM-DD nur bei einem konkreten Datum, sonst "".
- antragsberechtigte: nur ausdrücklich genannte Gruppen.
- unternehmensgroessen: KMU = KLEINST, KLEIN, MITTEL. ALLE nur, wenn die Quelle ausdrücklich keine Größenbeschränkung nennt. "Unternehmen" oder "Mittelstand" allein → leere Liste.
- instrumente: Förderkredit = DARLEHEN. Ein Tilgungszuschuss ist ein Merkmal (merkmale: TILGUNGSZUSCHUSS), kein ZUSCHUSS. "100 % Förderung" ist keine Förderart. Beratung/Coaching ist kein Instrument.
- ausgeschlosseneBranchen: nur Branchen, die die Quelle ausdrücklich ausschließt. Nichts ableiten, nichts ergänzen.
- link: die EXAKTE offizielle Programm-URL aus den Quellen. Erfinde KEINE URLs; wenn unsicher, leerer String.`;

/** A program as a model returns it — every field optional and untrusted. */
export type ParsedProgram = ExtractedProgram;

export interface ParsedSearchResponse {
  reply?: string;
  programs?: ParsedProgram[];
}
