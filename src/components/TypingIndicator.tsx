"use client";

import React, { useEffect, useState } from "react";

// Steps shown while the KI searches. The backend call is a single request with
// no streaming progress, so we advance through these on a timer to give users a
// sense of what is happening (and keep them from getting bored). The last step
// keeps spinning until the response arrives and this component unmounts.
const SEARCH_STEPS = [
  "Anfrage und Profil werden analysiert …",
  "Durchsuche offizielle Förderdatenbanken …",
  "Prüfe Bund-, Länder- und EU-Programme …",
  "Gleiche mit Ihren Filtern ab …",
  "Validiere Links und Fristen …",
  "Stelle die besten Treffer zusammen …",
];

const STEP_INTERVAL_MS = 1800;

export default function TypingIndicator() {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      // Stop at the last step and keep it spinning until the response arrives.
      setCurrentStep((step) => Math.min(step + 1, SEARCH_STEPS.length - 1));
    }, STEP_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-start gap-3 py-4 px-1 animate-fade-in">
      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>

      <div className="bg-white rounded-xl px-4 py-3 border border-gray-100 shadow-sm min-w-[260px]">
        <div className="flex items-center gap-2 mb-2.5">
          <span className="text-xs font-medium text-gray-500">
            KI durchsucht Förderprogramme
          </span>
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full typing-dot" />
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full typing-dot" />
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full typing-dot" />
          </div>
        </div>

        <ul className="space-y-1.5">
          {SEARCH_STEPS.map((label, index) => {
            const isDone = index < currentStep;
            const isActive = index === currentStep;
            return (
              <li
                key={label}
                className={`flex items-center gap-2 text-xs transition-colors duration-300 ${
                  isDone
                    ? "text-gray-400"
                    : isActive
                    ? "text-gray-700 font-medium"
                    : "text-gray-300"
                }`}
              >
                <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                  {isDone ? (
                    <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : isActive ? (
                    <svg className="w-3.5 h-3.5 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-200" />
                  )}
                </span>
                {label}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
