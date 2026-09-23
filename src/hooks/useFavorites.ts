"use client";

import { useCallback, useEffect, useState } from "react";
import { STORAGE_KEYS } from "@/config/app";
import { parseStoredFavorites, toFavorite } from "@/lib/favorites";
import type { ScoredProgram, StoredFavorite } from "@/types";

/**
 * Bookmarked programs, persisted in localStorage.
 *
 * Favorites store the FULL program record, not just an id: a program comes from
 * a live web search, so it cannot be looked up again later. The stored shape
 * and the v2 → v3 migration live in `lib/favorites.ts`.
 */

function readStoredFavorites(): StoredFavorite[] {
  try {
    const current = localStorage.getItem(STORAGE_KEYS.favorites);
    if (current) return parseStoredFavorites(current);

    // One-time migration: read the v2 list, normalize it, drop the old key.
    // The v3 list is written by the persistence effect right after loading.
    const legacy = parseStoredFavorites(
      localStorage.getItem(STORAGE_KEYS.legacyFavorites)
    );
    localStorage.removeItem(STORAGE_KEYS.legacyFavorites);
    return legacy;
  } catch {
    return [];
  }
}

export interface UseFavorites {
  favorites: StoredFavorite[];
  /** Favorites as program cards, for rendering. */
  favoriteCards: ScoredProgram[];
  favoriteIds: string[];
  /** True once localStorage has been read — render nothing before then. */
  isLoaded: boolean;
  toggleFavorite: (scored: ScoredProgram) => void;
  removeFavorite: (programId: string) => void;
}

export function useFavorites(): UseFavorites {
  const [favorites, setFavorites] = useState<StoredFavorite[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Clean up data left behind by the removed onboarding profile.
    try {
      localStorage.removeItem(STORAGE_KEYS.legacyProfile);
    } catch {
      /* storage unavailable — nothing to clean up */
    }

    setFavorites(readStoredFavorites());
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(favorites));
    } catch {
      /* quota or private mode — favorites stay in memory for this session */
    }
  }, [favorites, isLoaded]);

  const toggleFavorite = useCallback((scored: ScoredProgram) => {
    setFavorites((previous) => {
      if (previous.some((entry) => entry.program.id === scored.program.id)) {
        return previous.filter((entry) => entry.program.id !== scored.program.id);
      }
      return [...previous, toFavorite(scored)];
    });
  }, []);

  const removeFavorite = useCallback((programId: string) => {
    setFavorites((previous) =>
      previous.filter((entry) => entry.program.id !== programId)
    );
  }, []);

  return {
    favorites,
    favoriteCards: favorites,
    favoriteIds: favorites.map((entry) => entry.program.id),
    isLoaded,
    toggleFavorite,
    removeFavorite,
  };
}
