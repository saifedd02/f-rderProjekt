/**
 * Trust and quality rules for program links.
 *
 * Web search can return anything; only official funding bodies are accepted as
 * a program link, and even among those an overview page is not a program page.
 */

/** Official domains a program link may live on. Subdomains are included. */
export const TRUSTED_DOMAINS = [
  "kfw.de",
  "bafa.de",
  "bmwk.de",
  "bundeswirtschaftsministerium.de",
  "bmwe.de",
  "foerderdatenbank.de",
  "foerderinfo.bund.de",
  "nrwbank.de",
  "wirtschaft.nrw",
  "nrw.de",
  "l-bank.de",
  "lfa.de",
  "nbank.de",
  "ibb.de",
  "ifb-hamburg.de",
  "wib-hessen.de",
  "sab.sachsen.de",
  "ib-sh.de",
  "europa.eu",
  "efre.nrw.de",
  "bmf.de",
  "bmbf.de",
  "ptj.de",
  "dlr.de",
  "ble.de",
  "exist.de",
  "zim.de",
  "innovation-beratung-foerderung.de",
  "go-digital.de",
  "mittelstand-digital.de",
  "inqa.de",
  "digitalbonus.bayern",
  "bayern.de",
  "sachsen.de",
  "niedersachsen.de",
  "hessen.de",
  "baden-wuerttemberg.de",
  "thueringen.de",
  "brandenburg.de",
  "sachsen-anhalt.de",
  "mecklenburg-vorpommern.de",
  "saarland.de",
  "schleswig-holstein.de",
  "berlin.de",
  "bremen.de",
  "hamburg.de",
  "rheinland-pfalz.de",
];

/** Fördergeber → official domain, used to prefer the right source per program. */
export const QUELLE_DOMAIN_MAP: Record<string, string> = {
  kfw: "kfw.de",
  bafa: "bafa.de",
  bmwk: "bundeswirtschaftsministerium.de",
  bmwe: "bundeswirtschaftsministerium.de",
  zim: "zim.de",
  inqa: "inqa.de",
  euronorm: "innovation-beratung-foerderung.de",
  efre: "efre.nrw.de",
};

/** Domains whose bare root is a portal, never a specific program page. */
export const GENERIC_DOMAINS = [
  "sachsen.de",
  "hessen.de",
  "baden-wuerttemberg.de",
  "bmuv.de",
  "bafa.de",
];

/** Known overview/landing paths that are not a concrete Förderaufruf. */
export const GENERIC_PATH_PATTERNS = [
  /^\/de\/?$/i,
  /\/website\/de\/foerderangebote\/?$/i,
  /\/inlandsfoerderung\/unternehmen\/digitalisierung\/?$/i,
  /\/inlandsfoerderung\/unternehmen\/gruenden\/?$/i,
  /\/inlandsfoerderung\/unternehmen\/energie-und-umwelt\/?$/i,
];

/**
 * Domains Perplexity is allowed to search.
 *
 * Sonar otherwise cites commercial advisor blogs heavily, which we then have to
 * discard — leaving programs with no link. foerderdatenbank.de is the universal
 * federal aggregator (covers Bund + Länder) and its program pages are specific
 * and official, so a small allowlist still gives broad coverage.
 * Overridable via PERPLEXITY_DOMAIN_FILTER; set it to "off" to disable filtering.
 */
export const PERPLEXITY_SEARCH_DOMAINS = [
  "foerderdatenbank.de",
  "foerderinfo.bund.de",
  "kfw.de",
  "bafa.de",
  "bundeswirtschaftsministerium.de",
  "bmwk.de",
  "zim.de",
  "mittelstand-digital.de",
  "ec.europa.eu",
  "europa.eu",
];
