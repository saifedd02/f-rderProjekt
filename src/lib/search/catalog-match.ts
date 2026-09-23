import { normalizeText } from "@/lib/utils/text";
import type { Foerderprogramm } from "@/types";
import { isGenericLink } from "./links";

/**
 * Web hits against the catalogue.
 *
 * A web result that names a program the catalogue knows must not bring its
 * own version of the hard facts: the catalogue's are structured and come from
 * the funding body's own classification, the web's were pieced together by a
 * model. So on a match the catalogue's facts and fact-derived fields win, and
 * the web keeps only what the catalogue lacks.
 */

/** Query parameters that only track a click and never select a page. */
const TRACKING_PARAM = /^(utm_[a-z]+|fbclid|gclid|dclid|msclkid|mc_cid|mc_eid|_ga|_gl)$/i;

/**
 * A link in comparable form: no fragment, no tracking parameters, no "www.",
 * no trailing slash. Other query parameters stay — on many Länder portals
 * (`index.php?id=101`) they are what identifies the program page.
 */
export function canonicalUrl(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    for (const key of Array.from(parsed.searchParams.keys())) {
      if (TRACKING_PARAM.test(key)) parsed.searchParams.delete(key);
    }
    parsed.searchParams.sort();
    parsed.hostname = parsed.hostname.replace(/^www\./, "").toLowerCase();
    parsed.pathname = parsed.pathname.replace(/\/+$/, "") || "/";
    return parsed.toString();
  } catch {
    return undefined;
  }
}

/** Distinctive core of a program name: the text before the first separator. */
function coreName(name: string): string {
  return normalizeText(name.split(/[–—(:]|\s-\s/)[0]);
}

/**
 * The catalogue record a web hit refers to: same specific program page, same
 * normalised name, or the same distinctive core name (≥ 3 words, so generic
 * names like "Digitalbonus" cannot collide across Länder).
 */
export function findCatalogMatch(
  web: Foerderprogramm,
  catalog: Foerderprogramm[]
): Foerderprogramm | undefined {
  const url = !isGenericLink(web.link) ? canonicalUrl(web.link) : undefined;
  const name = normalizeText(web.name);
  const core = coreName(web.name);

  return (
    (url && catalog.find((entry) => canonicalUrl(entry.link) === url)) ||
    catalog.find((entry) => normalizeText(entry.name) === name) ||
    (core.split(" ").length >= 3
      ? catalog.find((entry) => coreName(entry.name) === core)
      : undefined)
  );
}

/** Web hit + catalogue record → one program carrying the catalogue's facts. */
export function mergeWithCatalog(
  web: Foerderprogramm,
  catalog: Foerderprogramm
): Foerderprogramm {
  return {
    ...web,
    id: catalog.id,
    name: catalog.name,
    beschreibung: web.beschreibung ?? catalog.beschreibung,
    foerderhoehe: catalog.foerderhoehe ?? web.foerderhoehe,
    zielgruppe: catalog.zielgruppe ?? web.zielgruppe,
    region: catalog.region,
    frist: catalog.frist ?? web.frist,
    foerderbereich: catalog.foerderbereich ?? web.foerderbereich,
    kategorien: catalog.kategorien,
    foerderart: catalog.foerderart,
    link: isGenericLink(web.link) ? catalog.link : web.link,
    quelle: catalog.quelle ?? web.quelle,
    sourceUrls: Array.from(
      new Set([...(catalog.sourceUrls ?? []), ...(web.sourceUrls ?? [])])
    ),
    statusNote: catalog.statusNote,
    facts: catalog.facts,
    catalogId: catalog.catalogId ?? catalog.id,
  };
}

/** Replace the hard facts of every web hit the catalogue knows. */
export function adoptCatalogFacts(
  web: Foerderprogramm[],
  catalog: Foerderprogramm[]
): Foerderprogramm[] {
  return web.map((program) => {
    const match = findCatalogMatch(program, catalog);
    return match ? mergeWithCatalog(program, match) : program;
  });
}
