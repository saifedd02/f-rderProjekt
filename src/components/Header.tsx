"use client";

import React from "react";
import { CompanyProfile } from "@/lib/types";

interface HeaderProps {
  favoriteCount: number;
  onFavorites: () => void;
  showFavorites: boolean;
  onHome: () => void;
  profile: CompanyProfile | null;
  onEditProfile: () => void;
}

export default function Header({
  favoriteCount,
  onFavorites,
  showFavorites,
  onHome,
  profile,
  onEditProfile,
}: HeaderProps) {
  return (
    <header className="bg-white/95 backdrop-blur-sm border-b border-gray-200/80 px-5 py-2.5 flex items-center justify-between sticky top-0 z-50">
      <button
        onClick={onHome}
        className="flex items-center gap-3 hover:opacity-80 transition-opacity"
      >
        <span className="text-xl font-bold tracking-tight text-blue-600">m</span>
        <div className="h-5 w-px bg-gray-200" />
        <span className="text-sm font-medium text-gray-600">
          Förderprogramm-Finder
        </span>
      </button>

      <div className="flex items-center gap-2">
        {/* Company profile indicator */}
        {profile && profile.branche && (
          <button
            onClick={onEditProfile}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
            title="Unternehmensprofil bearbeiten"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span className="hidden sm:inline max-w-[120px] truncate">
              {profile.name || profile.groesse || "Profil"}
            </span>
          </button>
        )}

        {/* Favorites */}
        <button
          onClick={onFavorites}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all ${
            showFavorites
              ? "bg-red-50 text-red-600 font-medium"
              : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
          }`}
        >
          <svg className="w-3.5 h-3.5" fill={showFavorites ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          {favoriteCount > 0 && (
            <span className={`rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold ${
              showFavorites ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-600"
            }`}>
              {favoriteCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
