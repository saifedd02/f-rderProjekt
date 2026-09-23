import { TOPIC_PROFILES, type TopicProfile } from "@/config/topics";
import { instrumentCriterion } from "@/lib/facts/instrument";
import { landInQuery, regionCriterion } from "@/lib/facts/region";
import { sizeCriterion, sizesInQuery } from "@/lib/facts/size";
import type { HardCriteria, SearchFilters } from "@/types";

/**
 * The hard criteria of one search.
 *
 * Dropdowns come first. Where a dropdown is left open, an unambiguous region
 * or size in the user's own sentence ("… kleines IT-Unternehmen in NRW")
 * counts too — a Bayern program is a wrong answer to that sentence whether or
 * not the filter was touched. Ambiguous text (two Länder, "Mittelstand")
 * sets nothing.
 */
export function criteriaFor(
  filters: Partial<SearchFilters> | undefined,
  textQuery = ""
): HardCriteria {
  return {
    region: regionCriterion(filters?.region) ?? landInQuery(textQuery),
    groessen: sizeCriterion(filters?.unternehmensgroesse) ?? sizesInQuery(textQuery),
    instrumente: instrumentCriterion(filters?.foerderart),
  };
}

/** The mpool topic behind the Förderbereich dropdown, if one is selected. */
export function topicFor(foerderbereich: string | undefined): TopicProfile | undefined {
  if (!foerderbereich || foerderbereich === "Alle Kategorien") return undefined;
  return TOPIC_PROFILES.find((topic) => topic.label === foerderbereich);
}
