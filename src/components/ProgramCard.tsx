"use client";

import React, { useState } from "react";
import { ScoredProgram } from "@/lib/types";

interface ProgramCardProps {
  scoredProgram: ScoredProgram;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onOpenChat?: (sp: ScoredProgram) => void;
  rank?: number;
  showChatHint?: boolean;
  onDismissChatHint?: () => void;
}

function getScoreStyle(score: number) {
  if (score >= 85) return { text: "Top-Empfehlung", color: "#16a34a", bg: "bg-emerald-50", border: "border-emerald-200", badge: "bg-emerald-100 text-emerald-700" };
  if (score >= 65) return { text: "Gut passend", color: "#2563eb", bg: "bg-blue-50", border: "border-blue-200", badge: "bg-blue-100 text-blue-700" };
  if (score >= 45) return { text: "Teilweise passend", color: "#d97706", bg: "bg-amber-50", border: "border-amber-200", badge: "bg-amber-100 text-amber-700" };
  return { text: "Prüfen", color: "#94a3b8", bg: "bg-gray-50", border: "border-gray-200", badge: "bg-gray-100 text-gray-600" };
}

function getDeadlineBadge(deadlineStatus: ScoredProgram["deadlineStatus"]) {
  if (deadlineStatus === "active") {
    return { text: "Aktiv", className: "bg-emerald-100 text-emerald-700" };
  }
  if (deadlineStatus === "expiring_soon") {
    return { text: "Frist bald", className: "bg-amber-100 text-amber-700" };
  }
  if (deadlineStatus === "expired") {
    return { text: "Inaktiv", className: "bg-rose-100 text-rose-700" };
  }
  return { text: "Frist unklar", className: "bg-gray-100 text-gray-600" };
}

function getSourceLabel(source: ScoredProgram["source"]) {
  if (source === "datenbank") return "Lokale DB";
  if (source === "websuche") return "Web verifiziert";
  return "Hybrid";
}

function getConfidenceLabel(confidence: ScoredProgram["confidence"]) {
  if (confidence === "high") return "hoch";
  if (confidence === "medium") return "mittel";
  return "niedrig";
}

export default function ProgramCard({
  scoredProgram,
  isFavorite,
  onToggleFavorite,
  onOpenChat,
  rank,
  showChatHint,
  onDismissChatHint,
}: ProgramCardProps) {
  const [expanded, setExpanded] = useState(false);
  const {
    program,
    score,
    reasons,
    linkWarning,
    source,
    checkedAt,
    deadlineStatus,
    confidence,
    sourceUrls = [],
  } = scoredProgram;
  const style = getScoreStyle(score);
  const deadlineBadge = getDeadlineBadge(deadlineStatus);

  const matchedReasons = reasons.filter((r) => r.matched);
  const unmatchedReasons = reasons.filter((r) => !r.matched);

  // Circle progress
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div
      className={`bg-white rounded-xl border transition-all duration-200 hover:shadow-md animate-fade-in-up overflow-hidden ${
        score >= 85
          ? "border-emerald-200 ring-1 ring-emerald-100"
          : "border-gray-200/80 hover:border-gray-300"
      }`}
    >
      {/* Header row */}
      <div className="flex items-start gap-3 p-4 pb-2">
        {/* Score circle */}
        <div className="flex-shrink-0 relative w-12 h-12">
          <svg width="48" height="48" className="-rotate-90">
            <circle cx="24" cy="24" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="3" />
            <circle
              cx="24" cy="24" r={radius}
              fill="none" stroke={style.color} strokeWidth="3" strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={offset}
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold" style={{ color: style.color }}>{score}%</span>
          </div>
        </div>

        {/* Title area */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            {rank && rank <= 3 && (
              <span className="text-[10px] font-bold text-white bg-blue-600 px-1.5 py-0.5 rounded">
                #{rank}
              </span>
            )}
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${style.badge}`}>
              {style.text}
            </span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${deadlineBadge.className}`}>
              {deadlineBadge.text}
            </span>
            {program.quelle && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                {getSourceLabel(source)} · {program.quelle}
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-gray-900 leading-snug pr-8">
            {program.name}
          </h3>
        </div>

        {/* Action buttons */}
        <div className="flex-shrink-0 flex items-center gap-1">
          {/* Chat button */}
          {onOpenChat && (
            <div className="relative">
              <button
                onClick={() => onOpenChat(scoredProgram)}
                className={`p-1.5 rounded-md transition-all ${
                  showChatHint
                    ? "text-blue-600 bg-blue-50 ring-2 ring-blue-300 animate-pulse"
                    : "text-gray-300 hover:text-blue-500 hover:bg-blue-50"
                }`}
                title="Chat mit diesem Programm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>

              {/* Hint tooltip */}
              {showChatHint && (
                <div className="absolute top-full right-0 mt-2 w-60 z-30 animate-fade-in-up">
                  <div className="absolute -top-1.5 right-3 w-3 h-3 bg-white border-l border-t border-blue-200 rotate-45" />
                  <div className="relative bg-white border border-blue-200 shadow-lg rounded-xl px-3 py-2.5 pr-7">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDismissChatHint?.();
                      }}
                      className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center text-gray-300 hover:text-gray-600 transition-colors"
                      aria-label="Hinweis ausblenden"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <p className="text-xs font-semibold text-gray-800 mb-0.5">
                      Hast du Fragen zu diesem Programm?
                    </p>
                    <p className="text-[11px] text-gray-500 leading-snug">
                      Klick hier, um gezielt mit der KI über dieses Förderprogramm zu chatten.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
          {/* Favorite button */}
          <button
            onClick={() => onToggleFavorite(program.id)}
            className={`p-1.5 rounded-md transition-all ${
              isFavorite ? "text-red-500" : "text-gray-300 hover:text-red-400"
            }`}
          >
            <svg className="w-4 h-4" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Description */}
      {program.beschreibung && (
        <p className="px-4 pb-2 text-xs text-gray-500 leading-relaxed">
          {program.beschreibung}
        </p>
      )}

      {/* Quick match tags */}
      {matchedReasons.length > 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1">
          {matchedReasons.map((r, i) => (
            <span key={i} className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
              {r.label}
            </span>
          ))}
        </div>
      )}

      {/* Key info — only show fields that exist */}
      <div className="px-4 pb-2 grid grid-cols-2 gap-x-3 gap-y-1">
        {program.foerderhoehe && <InfoLine label="Förderhöhe" value={program.foerderhoehe} bold />}
        {program.region && <InfoLine label="Region" value={program.region} />}
        {program.foerderart && <InfoLine label="Förderart" value={program.foerderart} />}
        {program.frist && <InfoLine label="Frist" value={program.frist} />}
      </div>

      {/* Expand for details */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2 text-[10px] text-gray-400 hover:text-blue-600 hover:bg-blue-50/30 transition-colors flex items-center justify-center gap-1"
      >
        <svg className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        {expanded ? "Weniger anzeigen" : "Details & Analyse"}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 animate-fade-in space-y-3">
          {/* Zielgruppe */}
          {program.zielgruppe && (
            <div>
              <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Zielgruppe</span>
              <p className="text-xs text-gray-600 mt-0.5">{program.zielgruppe}</p>
            </div>
          )}

          {/* Förderbereich */}
          {program.foerderbereich && (
            <div>
              <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Förderbereich</span>
              <p className="text-xs text-gray-600 mt-0.5">{program.foerderbereich}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Geprüft am</span>
              <p className="text-xs text-gray-600 mt-0.5">{checkedAt}</p>
            </div>
            <div>
              <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Vertrauen</span>
              <p className="text-xs text-gray-600 mt-0.5">{getConfidenceLabel(confidence)}</p>
            </div>
          </div>

          {/* Non-matching reasons (warnings) */}
          {unmatchedReasons.length > 0 && (
            <div>
              <span className="text-[10px] font-medium text-amber-600 uppercase tracking-wider">Einschränkungen</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {unmatchedReasons.map((r, i) => (
                  <span key={i} className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
                    </svg>
                    {r.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Link warning */}
          {linkWarning && (
            <div className="p-2 bg-amber-50 rounded-lg border border-amber-200/60">
              <p className="text-[10px] text-amber-700 flex items-start gap-1">
                <svg className="w-3 h-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                {linkWarning}
              </p>
            </div>
          )}

          {/* Company sizes if available */}
          {program.unternehmensgroesse && program.unternehmensgroesse.length > 0 && (
            <div>
              <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Unternehmensgrößen</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {program.unternehmensgroesse.map((g) => (
                  <span key={g} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}

          {sourceUrls.length > 0 && (
            <div>
              <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Quellen</span>
              <div className="mt-1 flex flex-col gap-1">
                {sourceUrls.slice(0, 3).map((url) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-700 truncate"
                  >
                    {url}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-2.5 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
        <span className="text-[10px] text-gray-400">
          {program.foerderbereich || getSourceLabel(source) || "Förderprogramm"}
        </span>
        <div className="flex items-center gap-3">
          {onOpenChat && (
            <button
              onClick={() => onOpenChat(scoredProgram)}
              className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-blue-600 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Fragen stellen
            </button>
          )}
          {program.link && (
            <a
              href={program.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              {(() => { try { return new URL(program.link).hostname.replace("www.", ""); } catch { return "Zum Fördergeber"; } })()}
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoLine({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-baseline gap-1">
      <span className="text-[10px] text-gray-400 flex-shrink-0">{label}:</span>
      <span className={`text-xs leading-snug truncate ${bold ? "text-gray-900 font-medium" : "text-gray-600"}`}>
        {value}
      </span>
    </div>
  );
}
