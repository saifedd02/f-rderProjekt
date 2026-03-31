"use client";

import React, { useState, useEffect } from "react";

const searchSteps = [
  { text: "Analysiere Ihr Unternehmensprofil", icon: "profile" },
  { text: "Durchsuche Förderdatenbanken", icon: "search" },
  { text: "Prüfe Förderkriterien & Fristen", icon: "check" },
  { text: "Bewerte Relevanz für Ihr Vorhaben", icon: "score" },
  { text: "Erstelle Ihre Ergebnisse", icon: "result" },
];

function StepIcon({ type, active }: { type: string; active: boolean }) {
  const cls = `w-4 h-4 transition-colors duration-300 ${active ? "text-blue-600" : "text-gray-300"}`;
  switch (type) {
    case "profile":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      );
    case "search":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      );
    case "check":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "score":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      );
    case "result":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      );
    default:
      return null;
  }
}

export default function TypingIndicator() {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < searchSteps.length - 1) return prev + 1;
        return prev;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-start gap-3 py-4 px-1 animate-fade-in">
      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-1">
        <svg className="w-4 h-4 text-blue-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </div>
      <div className="bg-white rounded-xl px-5 py-4 border border-gray-100 shadow-sm min-w-[280px]">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full typing-dot" />
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full typing-dot" />
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full typing-dot" />
          </div>
          <span className="text-xs font-medium text-blue-600">KI arbeitet</span>
        </div>
        <div className="space-y-2">
          {searchSteps.map((step, i) => {
            const isActive = i === currentStep;
            const isDone = i < currentStep;
            const isPending = i > currentStep;
            return (
              <div
                key={i}
                className={`flex items-center gap-2.5 transition-all duration-500 ${
                  isPending ? "opacity-30" : "opacity-100"
                }`}
              >
                {isDone ? (
                  <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <StepIcon type={step.icon} active={isActive} />
                )}
                <span
                  className={`text-xs transition-colors duration-300 ${
                    isDone
                      ? "text-emerald-600 line-through"
                      : isActive
                      ? "text-gray-800 font-medium"
                      : "text-gray-400"
                  }`}
                >
                  {step.text}
                  {isActive && (
                    <span className="inline-block ml-1 text-blue-500 animate-pulse">...</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
