"use client";

import React, { useMemo, useState } from "react";
import {
  branchen,
  foerderarten,
  foerderbereiche,
  regionen,
  unternehmensgroessen,
  unternehmensgroessenInfo,
} from "@/data/foerderprogramme";
import { SearchFilters, defaultFilters } from "@/lib/types";

interface FilterPanelProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onSearch: () => void;
}

export default function FilterPanel({
  filters,
  onFiltersChange,
  onSearch,
}: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showSizeInfo, setShowSizeInfo] = useState(false);

  const activeCount = useMemo(
    () =>
      [
        filters.region !== defaultFilters.region,
        filters.foerderbereich !== defaultFilters.foerderbereich,
        filters.unternehmensbranche !== defaultFilters.unternehmensbranche,
        filters.foerderart !== defaultFilters.foerderart,
        filters.unternehmensgroesse !== defaultFilters.unternehmensgroesse,
      ].filter(Boolean).length,
    [filters]
  );

  const updateFilter = (key: keyof SearchFilters, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200/80 mb-5 overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full px-5 py-3 flex items-center justify-between hover:bg-gray-50/60 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4h18M6 12h12M10 20h4"
            />
          </svg>
          <span className="text-sm font-medium text-gray-700">Präzise Filter</span>
          {activeCount > 0 && (
            <span className="bg-blue-100 text-blue-700 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
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
      </button>

      {isOpen && (
        <div className="px-5 pb-5 border-t border-gray-100 animate-fade-in">
          <p className="text-xs text-gray-400 mt-4">
            Diese Filter wirken jetzt als echte Einschränkung auf die Ergebnisse,
            nicht nur als Freitext.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            <FilterSelect
              label="Region"
              value={filters.region}
              options={regionen}
              onChange={(value) => updateFilter("region", value)}
            />
            <FilterSelect
              label="Förderbereich"
              value={filters.foerderbereich}
              options={foerderbereiche}
              onChange={(value) => updateFilter("foerderbereich", value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <FilterSelect
              label="Förderart"
              value={filters.foerderart}
              options={foerderarten}
              onChange={(value) => updateFilter("foerderart", value)}
            />
            <FilterSelect
              label="Unternehmensbranche"
              value={filters.unternehmensbranche}
              options={branchen}
              onChange={(value) => updateFilter("unternehmensbranche", value)}
            />
          </div>

          <div className="mt-3">
            <div className="flex items-center gap-1 mb-1">
              <label className="block text-xs font-medium text-gray-500">
                Unternehmensgröße
              </label>
              <button
                type="button"
                onClick={() => setShowSizeInfo((prev) => !prev)}
                className="w-3.5 h-3.5 text-[10px] bg-gray-200 text-gray-500 rounded-full hover:bg-blue-100 hover:text-blue-600 flex items-center justify-center transition-colors"
              >
                ?
              </button>
            </div>
            <select
              value={filters.unternehmensgroesse}
              onChange={(event) =>
                updateFilter("unternehmensgroesse", event.target.value)
              }
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors ${
                filters.unternehmensgroesse !== defaultFilters.unternehmensgroesse
                  ? "bg-blue-50 border-blue-200 text-blue-800"
                  : "bg-gray-50 border-gray-200 text-gray-700"
              }`}
            >
              {unternehmensgroessen.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {showSizeInfo && (
            <div className="mt-3 p-3 bg-blue-50/70 rounded-lg text-xs animate-fade-in">
              <div className="space-y-1.5">
                {Object.entries(unternehmensgroessenInfo).map(([name, description]) => (
                  <div key={name}>
                    <span className="font-semibold text-blue-800">{name}:</span>{" "}
                    <span className="text-blue-700/80">{description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => onFiltersChange(defaultFilters)}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Filter zurücksetzen
            </button>
            <button
              type="button"
              onClick={onSearch}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
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
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              Filter anwenden
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const isActive = !value.startsWith("Alle");

  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">
        {label}
      </label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors ${
          isActive
            ? "bg-blue-50 border-blue-200 text-blue-800"
            : "bg-gray-50 border-gray-200 text-gray-700"
        }`}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
