import { catalogToProgram } from "@/lib/catalog/to-program";
import { canonicalUrl } from "@/lib/search/catalog-match";
import { criteriaFor, topicFor } from "@/lib/search/criteria";
import { createLogger } from "@/lib/utils/logger";
import { LAENDER, type Foerderprogramm, type SearchFilters } from "@/types";
import { hasDatabase } from "./db";
import { findCatalogCandidates, searchCatalog } from "./repository";

/**
 * The catalogue as a search source.
 *
 * Answers from our own index of the official exports: every hit is a program
 * that was in this morning's export, with the funding body's own link and
 * structured facts. The web search stays alongside it for calls published
 * since the last run.
 */

const log = createLogger("Catalog:Search");

/** Candidates handed to the check and ranking — wide enough to rank properly. */
const CANDIDATE_LIMIT = 40;

export interface CatalogSearchInput {
  message: string;
  filters?: Partial<SearchFilters>;
}

/**
 * Search the catalogue.
 *
 * Fails soft: without a database, or on a query error, the finder falls back to
 * web search alone rather than showing an error — the catalogue is an upgrade
 * to the pipeline, never a precondition for it.
 */
export async function searchCatalogPrograms({
  message,
  filters,
}: CatalogSearchInput): Promise<Foerderprogramm[]> {
  if (!hasDatabase()) return [];

  const criteria = criteriaFor(filters, message);
  const topic = topicFor(filters?.foerderbereich);
  const regions =
    criteria.region === "BUND"
      ? ["Bundesweit"]
      : criteria.region
        ? [LAENDER[criteria.region]]
        : undefined;

  try {
    const programs = await searchCatalog({
      text: message,
      extraTerms: topic?.primary,
      boostCategories: topic?.categories,
      regions,
      limit: CANDIDATE_LIMIT,
    });

    log.info("Kandidaten aus dem Katalog:", programs.length);
    return programs.map((program) => catalogToProgram(program));
  } catch (error) {
    log.error("Katalogsuche fehlgeschlagen:", error);
    return [];
  }
}

/**
 * Catalogue records the given web hits may refer to — looked up by exact name
 * and official URL, so a web hit outside today's candidate list can still
 * inherit the catalogue's facts.
 */
export async function lookupCatalogForWeb(
  web: Foerderprogramm[]
): Promise<Foerderprogramm[]> {
  if (!hasDatabase() || web.length === 0) return [];
  try {
    const records = await findCatalogCandidates(
      web.map((program) => program.name),
      web
        .map((program) => canonicalUrl(program.link))
        .filter((url): url is string => Boolean(url))
    );
    return records.map((program) => catalogToProgram(program));
  } catch (error) {
    log.error("Katalogabgleich der Web-Treffer fehlgeschlagen:", error);
    return [];
  }
}
