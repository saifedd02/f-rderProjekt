"use client";

import React, { useState } from "react";
import { CompanyProfile as CompanyProfileType } from "@/lib/types";
import {
  branchen,
  regionen,
  unternehmensgroessen,
  unternehmensgroessenInfo,
} from "@/data/foerderprogramme";

interface CompanyProfileProps {
  onComplete: (profile: CompanyProfileType) => void;
  existingProfile?: CompanyProfileType | null;
}

export default function CompanyProfile({
  onComplete,
  existingProfile,
}: CompanyProfileProps) {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<CompanyProfileType>(
    existingProfile || {
      name: "",
      branche: "",
      region: "",
      groesse: "",
      mitarbeiter: "",
      umsatz: "",
      vorhaben: "",
    }
  );

  const update = (key: keyof CompanyProfileType, value: string) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  const canProceed = () => {
    switch (step) {
      case 0:
        return profile.branche && profile.region;
      case 1:
        return profile.groesse;
      case 2:
        return profile.vorhaben.trim().length > 5;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step < 2) {
      setStep(step + 1);
    } else {
      onComplete(profile);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && canProceed()) {
      handleNext();
    }
  };

  const regionOptions = regionen.filter((entry) => entry !== "Alle Regionen");
  const branchenOptions = branchen.filter((entry) => entry !== "Alle auswählen");
  const groessenOptions = unternehmensgroessen.filter(
    (entry) => entry !== "Alle auswählen"
  );

  return (
    <div className="min-h-screen flex items-center justify-center main-bg px-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-baseline justify-center gap-0 mb-4">
            <span className="text-2xl font-bold tracking-tight">
              <span className="text-blue-600">m</span>
              <span className="text-gray-900">pool</span>
            </span>
            <span className="text-xs text-gray-400 ml-1.5">consulting</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-800 mb-1">
            Förderprogramm-Finder
          </h1>
          <p className="text-sm text-gray-400">
            Erzählen Sie uns von Ihrem Unternehmen — wir finden die passenden
            Programme.
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i <= step
                  ? "bg-blue-600 w-10"
                  : "bg-gray-200 w-6"
              }`}
            />
          ))}
        </div>

        {/* Card */}
        <div
          className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-8 animate-fade-in-up"
          onKeyDown={handleKeyDown}
        >
          {/* Step 0: Branche + Region */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-semibold text-gray-800 mb-1">
                  Über Ihr Unternehmen
                </h2>
                <p className="text-xs text-gray-400 mb-5">
                  Diese Angaben helfen uns, die relevantesten Programme zu finden.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Unternehmensname <span className="text-gray-300">(optional)</span>
                </label>
                <input
                  type="text"
                  value={profile.name || ""}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="Ihr Unternehmensname"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Branche *
                </label>
                <select
                  value={profile.branche}
                  onChange={(e) => update("branche", e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors ${
                    profile.branche
                      ? "bg-white border-blue-200 text-gray-800"
                      : "bg-gray-50 border-gray-200 text-gray-400"
                  }`}
                >
                  <option value="">Branche auswählen...</option>
                  {branchenOptions.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Standort / Region *
                </label>
                <select
                  value={profile.region}
                  onChange={(e) => update("region", e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors ${
                    profile.region
                      ? "bg-white border-blue-200 text-gray-800"
                      : "bg-gray-50 border-gray-200 text-gray-400"
                  }`}
                >
                  <option value="">Bundesland auswählen...</option>
                  {regionOptions.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Step 1: Größe + Details */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-semibold text-gray-800 mb-1">
                  Unternehmensgröße
                </h2>
                <p className="text-xs text-gray-400 mb-5">
                  Viele Programme sind an die Unternehmensgröße gebunden.
                </p>
              </div>

              <div className="space-y-2">
                {groessenOptions.map((g) => (
                  <button
                    key={g}
                    onClick={() => update("groesse", g)}
                    className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                      profile.groesse === g
                        ? "bg-blue-50 border-blue-300 text-blue-800 font-medium"
                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
                    }`}
                  >
                    <div className="font-medium">{g}</div>
                    {unternehmensgroessenInfo[g] && (
                      <div className="text-xs text-gray-400 mt-0.5">
                        {unternehmensgroessenInfo[g]}
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Mitarbeiteranzahl <span className="text-gray-300">(ca.)</span>
                  </label>
                  <input
                    type="text"
                    value={profile.mitarbeiter || ""}
                    onChange={(e) => update("mitarbeiter", e.target.value)}
                    placeholder="z.B. 25"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Jahresumsatz <span className="text-gray-300">(ca.)</span>
                  </label>
                  <input
                    type="text"
                    value={profile.umsatz || ""}
                    onChange={(e) => update("umsatz", e.target.value)}
                    placeholder="z.B. 2 Mio. €"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Vorhaben */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-semibold text-gray-800 mb-1">
                  Was möchten Sie fördern lassen?
                </h2>
                <p className="text-xs text-gray-400 mb-5">
                  Beschreiben Sie Ihr Vorhaben in eigenen Worten. Je genauer,
                  desto besser die Ergebnisse.
                </p>
              </div>

              <textarea
                value={profile.vorhaben}
                onChange={(e) => update("vorhaben", e.target.value)}
                placeholder="z.B. Wir möchten unsere Geschäftsprozesse digitalisieren, eine neue ERP-Software einführen und unsere Mitarbeiter schulen..."
                rows={4}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors resize-none leading-relaxed"
              />

              <div>
                <p className="text-xs text-gray-400 mb-2">Oder wählen Sie ein Thema:</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Digitalisierung",
                    "Energieeffizienz",
                    "Beratung & Coaching",
                    "Klimaschutz",
                    "Innovation & F&E",
                    "Nachhaltigkeit",
                    "Existenzgründung",
                  ].map((topic) => (
                    <button
                      key={topic}
                      onClick={() =>
                        update(
                          "vorhaben",
                          profile.vorhaben
                            ? `${profile.vorhaben}, ${topic}`
                            : topic
                        )
                      }
                      className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all"
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-5 border-t border-gray-100">
            {step > 0 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Zurück
              </button>
            ) : (
              <div />
            )}

            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {step === 2 ? "Programme finden" : "Weiter"}
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Skip option */}
        {!existingProfile && (
          <p className="text-center mt-4">
            <button
              onClick={() =>
                onComplete({
                  branche: "",
                  region: "",
                  groesse: "",
                  vorhaben: "",
                })
              }
              className="text-xs text-gray-300 hover:text-gray-500 transition-colors"
            >
              Überspringen und direkt suchen
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
