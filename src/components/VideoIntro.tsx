"use client";

import { useEffect, useState } from "react";

// ── HIER VIDEO-URL EINFÜGEN wenn Synthesia fertig ist ──────────────────────
// Möglichkeiten:
//   1. Direkter MP4-Link:    "https://..."
//   2. Synthesia Share-URL:  "https://share.synthesia.io/embeds/videos/xxx"
//   3. YouTube Embed-URL:    "https://www.youtube.com/embed/VIDEO_ID"
const VIDEO_URL = "https://share.synthesia.io/embeds/videos/d91549a6-dbbd-4abb-9358-44003fbec0fb";
// ──────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "mpool-intro-seen";

export default function VideoIntro() {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!VIDEO_URL) return;
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) setVisible(true);
  }, []);

  const dismiss = (markSeen: boolean) => {
    setClosing(true);
    setTimeout(() => {
      setVisible(false);
      setClosing(false);
      if (markSeen) localStorage.setItem(STORAGE_KEY, "1");
    }, 400);
  };

  if (!visible || !VIDEO_URL) return null;

  const isEmbed =
    VIDEO_URL.includes("youtube.com/embed") ||
    VIDEO_URL.includes("synthesia.io");

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm transition-opacity duration-400 ${
        closing ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="relative w-full max-w-2xl mx-4 rounded-2xl overflow-hidden shadow-2xl bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-gray-900">
          <div className="flex items-center gap-2">
            <img
              src="/mpool-logo.png"
              alt="mpool"
              className="h-5 opacity-80"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
            <span className="text-sm text-gray-300 font-medium">
              Willkommen beim Förderprogramm-Finder
            </span>
          </div>
          <button
            onClick={() => dismiss(true)}
            className="text-gray-500 hover:text-white transition-colors p-1 rounded"
            aria-label="Schließen"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Video */}
        <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
          {isEmbed ? (
            <iframe
              src={VIDEO_URL}
              className="absolute inset-0 w-full h-full"
              allow="autoplay; fullscreen"
              allowFullScreen
              title="Einführungsvideo"
            />
          ) : (
            <video
              className="absolute inset-0 w-full h-full object-cover"
              src={VIDEO_URL}
              autoPlay
              controls
              playsInline
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 bg-gray-900">
          <button
            onClick={() => dismiss(false)}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors underline underline-offset-2"
          >
            Später ansehen
          </button>
          <button
            onClick={() => dismiss(true)}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Überspringen & direkt starten →
          </button>
        </div>
      </div>
    </div>
  );
}
