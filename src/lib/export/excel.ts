import * as XLSX from "xlsx";
import { exclusionLabels } from "@/lib/facts/exclusions";
import type { StoredFavorite } from "@/types";

/** Widest a generated column may get, in characters. */
const MAX_COLUMN_WIDTH = 50;

/** Placeholder for a field the program does not provide. */
const EMPTY = "–";

/**
 * Download the bookmarked programs as an .xlsx workbook.
 *
 * Browser-only — it triggers a file download, so it must not run on the server.
 */
export function exportFavoritesToExcel(favorites: StoredFavorite[]): void {
  const rows = favorites.map((fav, index) => ({
    Nr: index + 1,
    Programmname: fav.program.name,
    Beschreibung: fav.program.beschreibung || EMPTY,
    Förderhöhe: fav.program.foerderhoehe || EMPTY,
    Förderart: fav.program.foerderart || EMPTY,
    Region: fav.program.region || EMPTY,
    Zielgruppe: fav.program.zielgruppe || EMPTY,
    Förderbereich: fav.program.foerderbereich || EMPTY,
    Frist: fav.program.frist || EMPTY,
    Quelle: fav.program.quelle || EMPTY,
    "Ausgeschlossene Branchen":
      exclusionLabels(fav.program.facts?.branchenausschluesse).join(", ") || EMPTY,
    Link: fav.program.link || EMPTY,
    Relevanz: fav.relevance,
    "Gemerkt am": new Date(fav.savedAt).toLocaleDateString("de-DE"),
  }));

  const ws = XLSX.utils.json_to_sheet(rows);

  // Auto-size columns
  const colWidths = Object.keys(rows[0] || {}).map((key) => {
    const maxLen = Math.max(
      key.length,
      ...rows.map((r) => String(r[key as keyof typeof r] || "").length)
    );
    return { wch: Math.min(maxLen + 2, MAX_COLUMN_WIDTH) };
  });
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Förderprogramme");

  const filename = `Foerderprogramme_${new Date().toISOString().split("T")[0]}.xlsx`;
  XLSX.writeFile(wb, filename);
}
