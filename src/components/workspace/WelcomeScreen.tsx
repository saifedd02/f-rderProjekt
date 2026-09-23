"use client";

import React from "react";
import { SUGGESTED_PROMPTS } from "@/config/app";

interface WelcomeScreenProps {
  onSelectPrompt: (prompt: string) => void;
}

/** Empty state: explains the two ways in and offers ready-made starting points. */
export default function WelcomeScreen({ onSelectPrompt }: WelcomeScreenProps) {
  return (
    <div className="text-center py-16 animate-fade-in">
      <div className="w-12 h-12 mx-auto mb-4 bg-blue-50 rounded-2xl flex items-center justify-center">
        <svg
          className="w-6 h-6 text-blue-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      <h2 className="text-base font-semibold text-gray-800 mb-1">
        Willkommen beim Förderprogramm-Finder
      </h2>
      <p className="text-sm text-gray-400 max-w-sm mx-auto mb-6">
        Beschreiben Sie einfach Ihr Vorhaben oder setzen Sie Filter. Der Finder kombiniert
        Ihre Angaben mit der Förderlogik und erklärt die besten Treffer.
      </p>

      <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onSelectPrompt(prompt)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
