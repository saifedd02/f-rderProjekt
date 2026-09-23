import type { CatalogProgram, FieldChange } from "@/types/catalog";

/**
 * What changed between two versions of a program.
 *
 * Only the fields a reader would act on are compared — a deadline moving or a
 * link being replaced is news, a reworded paragraph is not. The description is
 * watched too, but reported as "geändert" rather than as a wall of text.
 */

const WATCHED_FIELDS: Array<{
  field: string;
  label: string;
  read: (program: CatalogProgram) => string | undefined;
  /** Long fields report that they changed instead of quoting both versions. */
  quiet?: boolean;
}> = [
  { field: "name", label: "Name", read: (p) => p.name },
  { field: "deadline", label: "Frist", read: (p) => p.deadline },
  {
    field: "statusHeader",
    label: "Antragsstatus",
    read: (p) =>
      p.statusHeader || (p.statusHeader === "" ? "Kein Sperrvermerk" : undefined),
  },
  { field: "officialUrl", label: "Offizieller Link", read: (p) => p.officialUrl },
  { field: "fundingBody", label: "Fördergeber", read: (p) => p.fundingBody },
  { field: "regions", label: "Region", read: (p) => p.regions.join(", ") },
  { field: "fundingTypes", label: "Förderart", read: (p) => p.fundingTypes.join(", ") },
  {
    field: "companySizes",
    label: "Unternehmensgröße",
    read: (p) => p.companySizes.join(", "),
  },
  {
    field: "eligibleParties",
    label: "Antragsberechtigte",
    read: (p) => p.eligibleParties.join(", "),
  },
  { field: "categories", label: "Förderbereich", read: (p) => p.categories.join(", ") },
  { field: "summary", label: "Kurzbeschreibung", read: (p) => p.summary, quiet: true },
  {
    field: "description",
    label: "Beschreibung",
    read: (p) => p.description,
    quiet: true,
  },
];

/** How much of a changed value is quoted in the digest. */
const MAX_QUOTED_LENGTH = 180;

function quote(value?: string): string | undefined {
  if (!value) return undefined;
  return value.length > MAX_QUOTED_LENGTH
    ? `${value.slice(0, MAX_QUOTED_LENGTH)}…`
    : value;
}

/** The user-visible differences between the stored and the freshly fetched record. */
export function diffPrograms(
  before: CatalogProgram,
  after: CatalogProgram
): FieldChange[] {
  const changes: FieldChange[] = [];

  for (const watched of WATCHED_FIELDS) {
    const previous = watched.read(before) ?? "";
    const next = watched.read(after) ?? "";
    if (previous === next) continue;

    changes.push(
      watched.quiet
        ? { field: watched.label }
        : {
            field: watched.label,
            before: quote(previous) || "—",
            after: quote(next) || "—",
          }
    );
  }

  return changes;
}
