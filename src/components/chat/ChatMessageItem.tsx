"use client";

import React from "react";
import type { ChatMessage, ScoredProgram } from "@/types";
import ProgramCard from "@/components/programs/ProgramCard";

/** One turn in the transcript: the user's own text, or the assistant's answer
 *  together with the program cards it produced. */
interface ChatMessageItemProps {
  message: ChatMessage;
  favoriteIds: string[];
  onToggleFavorite: (sp: ScoredProgram) => void;
  onOpenProgramChat?: (sp: ScoredProgram) => void;
}

export default function ChatMessageItem({
  message,
  favoriteIds,
  onToggleFavorite,
  onOpenProgramChat,
}: ChatMessageItemProps) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end mb-4 animate-fade-in-up">
        <div className="max-w-[75%] bg-blue-600 text-white rounded-2xl rounded-br-sm px-4 py-2.5 text-sm leading-relaxed">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 animate-fade-in-up">
      {/* AI response text */}
      {message.content && (
        <div className="mb-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
              <svg
                className="w-3.5 h-3.5 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <span className="text-xs font-medium text-gray-400">mpool Assistent</span>
          </div>
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
            {message.content}
          </div>
        </div>
      )}

      {/* Stats summary */}
      {message.filterSummary && (
        <div className="mb-4 flex items-center justify-center">
          <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            {message.filterSummary}
          </span>
        </div>
      )}

      {/* Program cards */}
      {message.programs && message.programs.length > 0 && (
        <div className="space-y-3">
          {message.programs.map((sp) => (
            <ProgramCard
              key={sp.program.id}
              scoredProgram={sp}
              isFavorite={favoriteIds.includes(sp.program.id)}
              onToggleFavorite={() => onToggleFavorite(sp)}
              onOpenChat={onOpenProgramChat}
            />
          ))}
        </div>
      )}
    </div>
  );
}
