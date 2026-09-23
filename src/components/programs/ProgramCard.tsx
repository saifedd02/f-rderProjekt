"use client";

import React, { useState } from "react";
import { eligibilityLabel } from "@/lib/facts/eligibility";
import { exclusionLabels } from "@/lib/facts/exclusions";
import { shortAmount, shortText } from "@/lib/format/card";
import type { Foerderprogramm, ScoredProgram } from "@/types";

interface ProgramCardProps {
  scoredProgram: ScoredProgram;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onOpenChat?: (sp: ScoredProgram) => void;
}

/** Shown where a source does not say — never a guess, never a blank. */
const NOT_STATED = "Nicht angegeben";

function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}.${month}.${year}`;
}

/** The deadline line, from the checked status — not from the model's wording. */
function deadlineText(program: Foerderprogramm): string {
  const facts = program.facts;
  const date = facts?.fristDatum ? formatDate(facts.fristDatum) : undefined;

  switch (facts?.antragsstatus) {
    case "OFFEN":
      if (date) return `Bis ${date}`;
      return shortText(program.frist, 90) ?? "Laufendes Programm";
    case "KONTINGENT":
      return date
        ? `Solange Mittel verfügbar, spätestens ${date}`
        : "Solange Mittel verfügbar";
    case "NOCH_NICHT_OFFEN":
      return date ? `Noch nicht geöffnet (Frist ${date})` : "Noch nicht geöffnet";
    default:
      return (
        shortText(program.frist, 90) ??
        `${NOT_STATED} – bitte auf der Programmseite prüfen`
      );
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default function ProgramCard({
  scoredProgram,
  isFavorite,
  onToggleFavorite,
  onOpenChat,
}: ProgramCardProps) {
  const [expanded, setExpanded] = useState(false);
  const {
    program,
    hints = [],
    unchecked = [],
    linkWarning,
    linkIsGeneric,
  } = scoredProgram;

  // Always offer a direct path to the program: the resolved official link,
  // otherwise the first specific source for THIS program.
  const sourceUrls = scoredProgram.sourceUrls ?? [];
  const primaryLink = program.link || sourceUrls[0];
  const ctaLabel = !program.link
    ? "Zur offiziellen Quelle"
    : linkIsGeneric
      ? "Zur offiziellen Förderseite"
      : "Zum Förderprogramm";

  const sources = Array.from(
    new Set([program.link, ...sourceUrls].filter(Boolean))
  ) as string[];
  const areas = (program.foerderbereich ?? "")
    .split(/,\s*/)
    .map((area) => area.trim())
    .filter(Boolean);
  const exclusions = exclusionLabels(program.facts?.branchenausschluesse);
  const audience =
    shortText(program.zielgruppe, 220) ??
    (program.facts ? eligibilityLabel(program.facts.antragsberechtigte) : undefined);

  return (
    <article className="bg-white rounded-2xl border border-gray-200/80 shadow-sm animate-fade-in-up">
      <div className="p-5 sm:p-6">
        {/* Head: name, description, primary action */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 leading-snug">
                {program.name}
              </h3>
              <button
                type="button"
                onClick={() => onToggleFavorite(program.id)}
                aria-label={
                  isFavorite ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"
                }
                className={`sm:hidden p-1 -m-1 flex-shrink-0 ${isFavorite ? "text-red-500" : "text-gray-400"}`}
              >
                <HeartIcon filled={isFavorite} />
              </button>
            </div>
            {program.beschreibung && (
              <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">
                {shortText(program.beschreibung, 240)}
              </p>
            )}
          </div>

          <div className="flex flex-col items-start sm:items-end gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={() => onToggleFavorite(program.id)}
              aria-label={
                isFavorite ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"
              }
              className={`hidden sm:block p-1 -m-1 transition-colors ${
                isFavorite ? "text-red-500" : "text-gray-400 hover:text-red-400"
              }`}
            >
              <HeartIcon filled={isFavorite} />
            </button>
            {primaryLink && (
              <a
                href={primaryLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                {ctaLabel}
                <ExternalIcon className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        {/* Positive hints */}
        {hints.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {hints.map((hint) => (
              <span
                key={hint}
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700"
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
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {hint}
              </span>
            ))}
          </div>
        )}
        {unchecked.length > 0 && (
          <p className="mt-2 text-xs text-gray-500">
            In den Quellen nicht angegeben, bitte auf der Programmseite prüfen:{" "}
            {unchecked.join(", ")}
          </p>
        )}

        {/* Key facts, one per row */}
        <dl className="mt-4 pt-4 border-t border-gray-100 space-y-2 text-sm">
          <FactRow
            label="Förderhöhe"
            value={shortAmount(program.foerderhoehe) ?? NOT_STATED}
          />
          <FactRow label="Förderart" value={program.foerderart ?? NOT_STATED} />
          <FactRow label="Region" value={program.region ?? NOT_STATED} />
          <FactRow label="Frist" value={deadlineText(program)} />
        </dl>
        {linkWarning && <p className="mt-2 text-xs text-amber-700">{linkWarning}</p>}

        {/* Expand */}
        <div className="mt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setExpanded((open) => !open)}
            aria-expanded={expanded}
            className="w-full py-3 inline-flex items-center justify-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            <svg
              className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
            {expanded ? "Weniger anzeigen" : "Mehr anzeigen"}
          </button>
        </div>

        {expanded && (
          <dl className="pt-4 border-t border-gray-100 space-y-4 text-sm animate-fade-in">
            <FactRow label="Zielgruppe" value={audience ?? NOT_STATED} />

            {areas.length > 0 && (
              <FactRow label="Förderbereich">
                <div className="flex flex-wrap gap-2">
                  {areas.map((area) => (
                    <span
                      key={area}
                      className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </FactRow>
            )}

            {exclusions.length > 0 && (
              <FactRow label="Ausgeschlossene Branchen">
                <div className="flex flex-wrap items-center gap-2">
                  <svg
                    className="w-5 h-5 text-amber-500"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M12 2 1 21h22L12 2zm1 15h-2v2h2v-2zm0-7h-2v5h2v-5z" />
                  </svg>
                  {exclusions.map((label) => (
                    <span
                      key={label}
                      className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-800"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </FactRow>
            )}

            {sources.length > 0 && (
              <FactRow label="Quellen">
                <ul className="space-y-1.5">
                  {sources.slice(0, 4).map((url) => (
                    <li key={url}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={hostOf(url)}
                        className="inline-flex items-start gap-2 text-blue-600 hover:text-blue-700 hover:underline break-all"
                      >
                        <ExternalIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        {url}
                      </a>
                    </li>
                  ))}
                </ul>
              </FactRow>
            )}
          </dl>
        )}

        {onOpenChat && (
          <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
            <button
              type="button"
              onClick={() => onOpenChat(scoredProgram)}
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M8 10h8M8 14h5m-9 6 2.5-3H18a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v14z"
                />
              </svg>
              Fragen stellen
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

function FactRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[11rem_1fr] gap-x-6 gap-y-0.5">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-gray-900 leading-relaxed min-w-0">{children ?? value}</dd>
    </div>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      className="w-6 h-6"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
      />
    </svg>
  );
}

function ExternalIcon({ className }: { className: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M14 4h6v6m0-6L10 14M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"
      />
    </svg>
  );
}
