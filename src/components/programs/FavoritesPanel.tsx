"use client";

import React from "react";
import ProgramCard from "@/components/programs/ProgramCard";
import type { ScoredProgram, StoredFavorite } from "@/types";

interface FavoritesPanelProps {
  favorites: StoredFavorite[];
  favoriteCards: ScoredProgram[];
  onRemove: (programId: string) => void;
  onOpenChat: (scored: ScoredProgram) => void;
}

/** The bookmarked programs, with an Excel export of the whole list. */
export default function FavoritesPanel({
  favorites,
  favoriteCards,
  onRemove,
  onOpenChat,
}: FavoritesPanelProps) {
  // Loaded on demand: the xlsx library is large and most sessions never export.
  const handleExport = async () => {
    const { exportFavoritesToExcel } = await import("@/lib/export/excel");
    exportFavoritesToExcel(favorites);
  };

  return (
    <div className="mb-6 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700">
          Gemerkte Programme ({favorites.length})
        </h2>

        {favorites.length > 0 && (
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium hover:bg-emerald-100 transition-colors border border-emerald-200"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Excel exportieren
          </button>
        )}
      </div>

      {favorites.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">Noch keine Programme gemerkt.</p>
          <p className="text-xs mt-1 text-gray-300">
            Klicken Sie bei einem Programm auf das Herz.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {favoriteCards.map((scored) => (
            <ProgramCard
              key={scored.program.id}
              scoredProgram={scored}
              isFavorite
              onToggleFavorite={() => onRemove(scored.program.id)}
              onOpenChat={onOpenChat}
            />
          ))}
        </div>
      )}
    </div>
  );
}
