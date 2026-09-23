/**
 * Search pipeline — public surface.
 *
 * A candidate travels: facts (catalogue or web extraction) → `adoptCatalogFacts`
 * (web hits inherit catalogue facts) → `checkHardCriteria` (admission) →
 * `scoreProgramList` (relevance, order) → `buildSearchReply` (explain).
 */
export { adoptCatalogFacts, canonicalUrl } from "./catalog-match";
export { criteriaFor, topicFor } from "./criteria";
export { getLinkWarning, isGenericLink } from "./links";
export { extractKeywords, isActiveFilter } from "./normalize";
export { reconcileWebProgram } from "./reconcile";
export { buildSearchReply, describeActiveFilters } from "./reply";
export {
  compareResults,
  relevanceKeywords,
  scoreProgramList,
  type ScoreProgramListParams,
} from "./scoring";
