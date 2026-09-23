import type { ProgramFacts } from "@/types/facts";

/** Facts of a program nobody has checked — every hard criterion UNBEKANNT. */
export function unknownFacts(): ProgramFacts {
  return {
    foerdergebiet: ["UNBEKANNT"],
    foerdergeberEbene: "UNBEKANNT",
    antragsstatus: "UNBEKANNT",
    antragsberechtigte: ["UNBEKANNT"],
    groessen: ["UNBEKANNT"],
    instrumente: ["UNBEKANNT"],
    merkmale: [],
    gegenstaende: [],
    branchenausschluesse: [],
    herkunft: "WEB",
  };
}
