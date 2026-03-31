import * as XLSX from "xlsx";
import { StoredFavorite } from "@/lib/types";

export function exportFavoritesToExcel(favorites: StoredFavorite[]) {
  const rows = favorites.map((fav, index) => ({
    Nr: index + 1,
    Programmname: fav.program.name,
    Beschreibung: fav.program.beschreibung || "–",
    Förderhöhe: fav.program.foerderhoehe || "–",
    Förderart: fav.program.foerderart || "–",
    Region: fav.program.region || "–",
    Zielgruppe: fav.program.zielgruppe || "–",
    Förderbereich: fav.program.foerderbereich || "–",
    Frist: fav.program.frist || "–",
    Quelle: fav.program.quelle || "–",
    Link: fav.program.link || "–",
    "Match-Score": `${fav.score}%`,
    "Gemerkt am": new Date(fav.savedAt).toLocaleDateString("de-DE"),
  }));

  const ws = XLSX.utils.json_to_sheet(rows);

  // Auto-size columns
  const colWidths = Object.keys(rows[0] || {}).map((key) => {
    const maxLen = Math.max(
      key.length,
      ...rows.map((r) => String(r[key as keyof typeof r] || "").length)
    );
    return { wch: Math.min(maxLen + 2, 50) };
  });
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Förderprogramme");

  const filename = `Foerderprogramme_${new Date().toISOString().split("T")[0]}.xlsx`;
  XLSX.writeFile(wb, filename);
}
