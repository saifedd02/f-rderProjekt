import { foerderprogramme } from "@/data/foerderprogramme";
import { unknownFacts } from "@/lib/facts/unknown";
import { normalizeText } from "@/lib/utils/text";
import type { DbFoerderprogramm } from "@/types/database";
import type { Foerderprogramm } from "@/types";
import { isGenericLink } from "./links";

/**
 * Cross-reference web results against the curated local list.
 *
 * The list is hand-maintained and knows which well-known programs have ENDED
 * (e.g. "Digital Jetzt", "go-digital"). That knowledge may only close a
 * program, never open one: a hand-kept "laufend" is not current evidence, so
 * an active list entry contributes its verified link and nothing else.
 */

/** Distinctive core of a program name: the text before the first separator. */
function programShortName(name: string): string {
  const core = name.split(/[–—(:]|\s-\s/)[0];
  return normalizeText(core);
}

const KNOWN_PROGRAMS = foerderprogramme.map((program) => ({
  fullNorm: normalizeText(program.name),
  shortNorm: programShortName(program.name),
  program,
}));

/** The curated entry a web result refers to, if any. */
function findKnownProgram(name: string): DbFoerderprogramm | undefined {
  const fullNorm = normalizeText(name);
  if (!fullNorm) return undefined;

  const hit = KNOWN_PROGRAMS.find((known) => {
    if (fullNorm === known.fullNorm) return true;
    // Require a reasonably distinctive short name to avoid generic collisions.
    if (known.shortNorm.length < 5) return false;
    // Only forward containment: the web name must CONTAIN the known program's
    // distinctive short name. The reverse direction swept up unrelated programs.
    return fullNorm.includes(known.shortNorm);
  });

  return hit?.program;
}

function isEnded(known: DbFoerderprogramm): boolean {
  return known.isActive === false || known.frist.startsWith("ended:");
}

/**
 * Reconcile a web-sourced program with the curated list:
 *  - an ended program → status GESCHLOSSEN, so the hard check removes it;
 *  - an active one → the verified official link replaces a missing/generic one.
 */
export function reconcileWebProgram(program: Foerderprogramm): Foerderprogramm {
  const known = findKnownProgram(program.name);
  if (!known) return program;

  if (isEnded(known)) {
    return {
      ...program,
      frist: known.frist.replace("ended:", "ausgelaufen am "),
      facts: { ...(program.facts ?? unknownFacts()), antragsstatus: "GESCHLOSSEN" },
      statusNote: `Laut Datenbank ausgelaufen/beendet (${known.frist.replace("ended:", "")}). Keine Neuanträge.`,
    };
  }

  return {
    ...program,
    link: isGenericLink(program.link) ? known.link : program.link,
    quelle: program.quelle || known.quelle,
  };
}
