import { unzipSync } from "fflate";
import {
  FDB_EXPORT_URL,
  FDB_EXTERNAL_LINK_PREFIX,
  FDB_FUNDING_BODY_PREFIX,
  FDB_PROGRAM_PREFIX,
  FETCH_TIMEOUT_MS,
} from "@/config/catalog";
import {
  parseExternalLinkDocument,
  parseFundingBodyDocument,
  parseProgramDocument,
  type FdbReferences,
} from "@/lib/catalog/parse-fdb";
import { createLogger } from "@/lib/utils/logger";
import type { CatalogProgram } from "@/types/catalog";

/**
 * Loads the Förderdatenbank bulk export.
 *
 * The archive is read twice on purpose: once for the small reference documents
 * (official URLs, funding bodies), once for the programs themselves. Holding
 * all ~10,600 decompressed entries at once would cost several hundred MB of
 * heap for no benefit — inflating 28 MB twice costs a second or two.
 */

const log = createLogger("Catalog:FDB");

const decoder = new TextDecoder("utf-8");

async function downloadExport(url: string): Promise<Uint8Array> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS.export);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers: { Accept: "application/zip" },
    });
    if (!response.ok) {
      throw new Error(`Förderdatenbank-Export nicht erreichbar (${response.status})`);
    }
    return new Uint8Array(await response.arrayBuffer());
  } finally {
    clearTimeout(timeout);
  }
}

/** Resolve the documents a program points at: official URLs and funding bodies. */
function readReferences(archive: Uint8Array): FdbReferences {
  const entries = unzipSync(archive, {
    filter: (file) =>
      file.name.startsWith(FDB_EXTERNAL_LINK_PREFIX) ||
      file.name.startsWith(FDB_FUNDING_BODY_PREFIX),
  });

  const references: FdbReferences = {
    externalUrls: new Map<string, string>(),
    fundingBodies: new Map<string, string>(),
  };

  for (const [name, bytes] of Object.entries(entries)) {
    if (!name.endsWith(".xml")) continue;
    const xml = decoder.decode(bytes);

    if (name.startsWith(FDB_EXTERNAL_LINK_PREFIX)) {
      const link = parseExternalLinkDocument(xml);
      if (link) references.externalUrls.set(link.id, link.url);
      continue;
    }

    const body = parseFundingBodyDocument(xml);
    if (body) references.fundingBodies.set(body.id, body.name);
  }

  log.info(
    "references:",
    references.externalUrls.size,
    "URLs,",
    references.fundingBodies.size,
    "Fördergeber"
  );
  return references;
}

/** Parse every program document in the archive. */
function readPrograms(archive: Uint8Array, references: FdbReferences): CatalogProgram[] {
  const entries = unzipSync(archive, {
    filter: (file) =>
      file.name.startsWith(FDB_PROGRAM_PREFIX) && file.name.endsWith(".xml"),
  });

  const programs: CatalogProgram[] = [];
  let skipped = 0;

  for (const bytes of Object.values(entries)) {
    const program = parseProgramDocument(decoder.decode(bytes), references);
    if (program) programs.push(program);
    else skipped += 1;
  }

  if (skipped > 0) log.info("übersprungen (kein Titel oder defektes XML):", skipped);
  return programs;
}

/**
 * Fetch and parse the whole Förderdatenbank catalogue.
 *
 * `archive` lets a caller supply bytes it already has (a local file, a test
 * fixture) instead of hitting the portal again.
 */
export async function loadFoerderdatenbank(
  archive?: Uint8Array
): Promise<CatalogProgram[]> {
  const bytes = archive ?? (await downloadExport(FDB_EXPORT_URL));
  log.info("Export geladen:", Math.round(bytes.byteLength / 1024 / 1024), "MB");

  const references = readReferences(bytes);
  const programs = readPrograms(bytes, references);

  log.info("Programme:", programs.length);
  return programs;
}
