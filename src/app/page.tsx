"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import FilterPanel from "@/components/FilterPanel";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import ProgramCard from "@/components/ProgramCard";
import TypingIndicator from "@/components/TypingIndicator";
import CompanyProfile from "@/components/CompanyProfile";
import ProgramChatModal from "@/components/ProgramChatModal";
import {
  ChatMessage as ChatMessageType,
  ChatSession,
  CompanyProfile as CompanyProfileType,
  SearchFilters,
  ScoredProgram,
  StoredFavorite,
  TODAY,
  defaultFilters,
} from "@/lib/types";

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

const PROFILE_KEY = "mpool-company-profile";
const FAVORITES_KEY = "mpool-favorites-v2";
const SESSIONS_KEY = "mpool-chat-sessions";

function normalizeStoredFavorite(value: Partial<StoredFavorite> | null): StoredFavorite | null {
  if (!value?.program?.id || !value.program.name) return null;

  return {
    program: value.program,
    score: typeof value.score === "number" ? value.score : 50,
    reasons: Array.isArray(value.reasons) ? value.reasons : [],
    savedAt: value.savedAt || new Date().toISOString(),
    linkWarning: typeof value.linkWarning === "string" ? value.linkWarning : undefined,
    source:
      value.source === "websuche" || value.source === "hybrid"
        ? value.source
        : "datenbank",
    checkedAt: value.checkedAt || TODAY,
    deadlineStatus:
      value.deadlineStatus === "active" ||
      value.deadlineStatus === "expiring_soon" ||
      value.deadlineStatus === "expired"
        ? value.deadlineStatus
        : "unknown",
    confidence:
      value.confidence === "high" || value.confidence === "medium"
        ? value.confidence
        : "low",
    sourceUrls: Array.isArray(value.sourceUrls) ? value.sourceUrls : [],
  };
}

export default function Home() {
  const [profile, setProfile] = useState<CompanyProfileType | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [filters, setFilters] = useState<SearchFilters>(defaultFilters);
  const [isLoading, setIsLoading] = useState(false);
  const [favorites, setFavorites] = useState<StoredFavorite[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [programChatTarget, setProgramChatTarget] = useState<ScoredProgram | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load profile + favorites from localStorage
  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem(PROFILE_KEY);
      if (savedProfile) setProfile(JSON.parse(savedProfile));
    } catch { /* ignore */ }

    try {
      const savedFavorites = localStorage.getItem(FAVORITES_KEY);
      if (savedFavorites) {
        const parsed = JSON.parse(savedFavorites);
        if (Array.isArray(parsed)) {
          setFavorites(
            parsed
              .map((entry) => normalizeStoredFavorite(entry))
              .filter((entry): entry is StoredFavorite => Boolean(entry))
          );
        }
      }
    } catch { /* ignore */ }

    try {
      const savedSessions = localStorage.getItem(SESSIONS_KEY);
      if (savedSessions) {
        const parsed = JSON.parse(savedSessions);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSessions(parsed.map((s: ChatSession) => ({
            ...s,
            createdAt: new Date(s.createdAt),
            messages: s.messages.map((m: ChatMessageType) => ({
              ...m,
              timestamp: new Date(m.timestamp),
            })),
          })));
        }
      }
    } catch { /* ignore */ }

    setProfileLoaded(true);
  }, []);

  // Save favorites
  useEffect(() => {
    if (profileLoaded) {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    }
  }, [favorites, profileLoaded]);

  // Save chat sessions
  useEffect(() => {
    if (profileLoaded && sessions.length > 0) {
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    }
  }, [sessions, profileLoaded]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [sessions, activeSessionId, scrollToBottom]);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;

  // Favorite IDs for quick lookup
  const favoriteIds = favorites.map((f) => f.program.id);

  // --- Profile handlers ---
  const handleProfileComplete = (newProfile: CompanyProfileType) => {
    setProfile(newProfile);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(newProfile));
    setShowProfileEdit(false);

    if (newProfile.vorhaben && newProfile.vorhaben.trim().length > 3) {
      handleSendMessage(newProfile.vorhaben);
    }
  };

  // --- Favorite handlers (now stores full program data) ---
  const toggleFavorite = (sp: ScoredProgram) => {
    setFavorites((prev) => {
      const exists = prev.find((f) => f.program.id === sp.program.id);
      if (exists) {
        return prev.filter((f) => f.program.id !== sp.program.id);
      }
      return [
        ...prev,
        {
          program: sp.program,
          score: sp.score,
          reasons: sp.reasons,
          savedAt: new Date().toISOString(),
          linkWarning: sp.linkWarning,
          source: sp.source,
          checkedAt: sp.checkedAt,
          deadlineStatus: sp.deadlineStatus,
          confidence: sp.confidence,
          sourceUrls: sp.sourceUrls,
        },
      ];
    });
  };

  const removeFavorite = (id: string) => {
    setFavorites((prev) => prev.filter((f) => f.program.id !== id));
  };

  // --- Session handlers ---
  const createNewSession = () => {
    const newSession: ChatSession = {
      id: generateId(),
      title: "Neue Suche",
      messages: [],
      createdAt: new Date(),
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setShowFavorites(false);
    setShowProfileEdit(false);
  };

  const deleteSession = (id: string) => {
    setSessions((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      if (updated.length === 0) {
        localStorage.removeItem(SESSIONS_KEY);
      }
      return updated;
    });
    if (activeSessionId === id) setActiveSessionId(null);
  };

  const handleSendMessage = (content: string) => {
    let sessionId = activeSessionId;
    if (!sessionId) {
      const newSession: ChatSession = {
        id: generateId(),
        title: content.substring(0, 30) + (content.length > 30 ? "..." : ""),
        messages: [],
        createdAt: new Date(),
      };
      setSessions((prev) => [newSession, ...prev]);
      sessionId = newSession.id;
      setActiveSessionId(sessionId);
    }

    const userMessage: ChatMessageType = {
      id: generateId(),
      role: "user",
      content,
      timestamp: new Date(),
    };

    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              title:
                s.title === "Neue Suche"
                  ? content.substring(0, 30) + (content.length > 30 ? "..." : "")
                  : s.title,
              messages: [...s.messages, userMessage],
            }
          : s
      )
    );

    setShowFavorites(false);
    setShowProfileEdit(false);
    sendMessage(content, sessionId!, filters);
  };

  const describeActiveFilters = (currentFilters: SearchFilters) => {
    return [
      currentFilters.region !== defaultFilters.region ? currentFilters.region : "",
      currentFilters.foerderbereich !== defaultFilters.foerderbereich
        ? currentFilters.foerderbereich
        : "",
      currentFilters.foerderart !== defaultFilters.foerderart
        ? currentFilters.foerderart
        : "",
      currentFilters.unternehmensbranche !== defaultFilters.unternehmensbranche
        ? currentFilters.unternehmensbranche.replace(/\(CPA.*?\)\s*/, "")
        : "",
      currentFilters.unternehmensgroesse !== defaultFilters.unternehmensgroesse
        ? currentFilters.unternehmensgroesse
        : "",
    ].filter(Boolean);
  };

  const handleFilterSearch = () => {
    const activeFilters = describeActiveFilters(filters);
    const filterText =
      activeFilters.length > 0
        ? activeFilters.join(", ")
        : "alle verfügbaren Förderprogramme";

    handleSendMessage(`Finde Förderprogramme für: ${filterText}`);
  };

  const sendMessage = async (
    content: string,
    sessionId: string,
    currentFilters: SearchFilters
  ) => {
    setIsLoading(true);

    try {
      const currentSession = sessions.find((s) => s.id === sessionId);
      const history = (currentSession?.messages || [])
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role, content: m.content }));

      // Collect all program names already shown in this session
      const shownPrograms: string[] = Array.from(
        new Set(
          (currentSession?.messages || [])
            .flatMap((m) => m.programs ?? [])
            .map((sp) => sp.program.name)
            .filter(Boolean)
        )
      );

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          profile,
          history,
          filters: currentFilters,
          shownPrograms,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        let errorMsg = "Fehler bei der Anfrage";
        try {
          const parsed = JSON.parse(text);
          errorMsg = parsed.error || errorMsg;
        } catch { /* response is not JSON */ }
        throw new Error(errorMsg);
      }

      const data = await res.json();

      const programs: ScoredProgram[] = data.programs || [];
      const topScore = programs.length > 0 ? programs[0].score : 0;

      let statsText: string;
      if (programs.length === 0) {
        statsText = "Keine passenden Programme gefunden";
      } else if (topScore >= 80) {
        statsText = `${programs.length} Programme — Top-Ergebnis: ${topScore}% Match`;
      } else {
        statsText = `${programs.length} Programme gefunden — bestes Ergebnis: ${topScore}%`;
      }

      const assistantMessage: ChatMessageType = {
        id: generateId(),
        role: "assistant",
        content: data.reply,
        programs,
        filterSummary: statsText,
        timestamp: new Date(),
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? { ...s, messages: [...s.messages, assistantMessage] }
            : s
        )
      );
    } catch (error) {
      const errorMsg: ChatMessageType = {
        id: generateId(),
        role: "assistant",
        content:
          error instanceof Error
            ? `Fehler: ${error.message}`
            : "Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.",
        timestamp: new Date(),
      };
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? { ...s, messages: [...s.messages, errorMsg] }
            : s
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  // --- Convert favorites to ScoredProgram for display ---
  const favoriteScoredPrograms: ScoredProgram[] = favorites.map((f) => ({
    program: f.program,
    score: f.score,
    reasons: f.reasons,
    linkWarning: f.linkWarning,
    source: f.source,
    checkedAt: f.checkedAt,
    deadlineStatus: f.deadlineStatus,
    confidence: f.confidence,
    sourceUrls: f.sourceUrls,
  }));

  // --- Excel export ---
  const handleExcelExport = async () => {
    const { exportFavoritesToExcel } = await import("@/lib/excel-export");
    exportFavoritesToExcel(favorites);
  };

  // --- Loading state ---
  if (!profileLoaded) return null;

  // --- Onboarding: no profile yet ---
  if (!profile) {
    return <CompanyProfile onComplete={handleProfileComplete} />;
  }

  // --- Profile edit mode ---
  if (showProfileEdit) {
    return (
      <CompanyProfile
        existingProfile={profile}
        onComplete={handleProfileComplete}
      />
    );
  }

  // --- Main app ---
  return (
    <div className="h-screen flex flex-col">
      <Header
        favoriteCount={favorites.length}
        onFavorites={() => setShowFavorites(!showFavorites)}
        showFavorites={showFavorites}
        onHome={() => {
          setActiveSessionId(null);
          setShowFavorites(false);
        }}
        profile={profile}
        onEditProfile={() => setShowProfileEdit(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={(id) => {
            setActiveSessionId(id);
            setShowFavorites(false);
          }}
          onNewChat={createNewSession}
          onDeleteSession={deleteSession}
        />

        <main className="flex-1 flex flex-col overflow-hidden main-bg">
          <div className="flex-1 overflow-y-auto px-4 py-5">
            <div className="max-w-3xl mx-auto">
              {/* Favorites */}
              <FilterPanel
                filters={filters}
                onFiltersChange={setFilters}
                onSearch={handleFilterSearch}
              />

              {/* Favorites */}
              {showFavorites && (
                <div className="mb-6 animate-fade-in">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-gray-700">
                      Gemerkte Programme ({favorites.length})
                    </h2>
                    {favorites.length > 0 && (
                      <button
                        onClick={handleExcelExport}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium hover:bg-emerald-100 transition-colors border border-emerald-200"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Excel exportieren
                      </button>
                    )}
                  </div>
                  {favorites.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                      <p className="text-sm">Noch keine Programme gemerkt.</p>
                      <p className="text-xs mt-1 text-gray-300">
                        Klicken Sie bei einem Programm auf das Herz.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {favoriteScoredPrograms.map((sp) => (
                        <ProgramCard
                          key={sp.program.id}
                          scoredProgram={sp}
                          isFavorite={true}
                          onToggleFavorite={() => removeFavorite(sp.program.id)}
                          onOpenChat={setProgramChatTarget}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Chat messages */}
              {!showFavorites && activeSession && (
                <div className="space-y-2">
                  {activeSession.messages.map((msg) => (
                    <ChatMessage
                      key={msg.id}
                      message={msg}
                      favoriteIds={favoriteIds}
                      onToggleFavorite={toggleFavorite}
                      onOpenProgramChat={setProgramChatTarget}
                    />
                  ))}
                  {isLoading && <TypingIndicator />}
                </div>
              )}

              {/* Welcome state */}
              {!showFavorites && !activeSession && (
                <div className="text-center py-16 animate-fade-in">
                  <div className="w-12 h-12 mx-auto mb-4 bg-blue-50 rounded-2xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <h2 className="text-base font-semibold text-gray-800 mb-1">
                    {profile.name
                      ? `Hallo ${profile.name}!`
                      : "Willkommen zurück!"}
                  </h2>
                  <p className="text-sm text-gray-400 max-w-sm mx-auto mb-6">
                    Beschreiben Sie Ihr Vorhaben oder setzen Sie Filter. Der
                    Finder kombiniert Profil, Filter und Förderlogik, bevor die
                    KI die besten Treffer erklärt.
                  </p>

                  {/* Profile summary pill */}
                  {profile.branche && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-full text-xs text-blue-700 mb-6">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      {[
                        profile.groesse,
                        profile.region,
                        profile.branche?.replace(/\(CPA.*?\)\s*/, ""),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  )}

                  <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
                    {[
                      "Welche Förderprogramme passen zu uns?",
                      "Digitalisierungsförderung",
                      "Energieeffizienz & Klimaschutz",
                      "Beratungsförderung",
                      "Existenzgründung & Startups",
                    ].map((q) => (
                      <button
                        key={q}
                        onClick={() => handleSendMessage(q)}
                        className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          <ChatInput onSend={handleSendMessage} isLoading={isLoading} />
        </main>
      </div>

      {/* Program Chat Modal */}
      {programChatTarget && (
        <ProgramChatModal
          scoredProgram={programChatTarget}
          onClose={() => setProgramChatTarget(null)}
        />
      )}
    </div>
  );
}
