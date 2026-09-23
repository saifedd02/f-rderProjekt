"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import ChatInput from "@/components/chat/ChatInput";
import ChatMessageItem from "@/components/chat/ChatMessageItem";
import ProgramChatModal from "@/components/chat/ProgramChatModal";
import TypingIndicator from "@/components/chat/TypingIndicator";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import FavoritesPanel from "@/components/programs/FavoritesPanel";
import FilterPanel from "@/components/programs/FilterPanel";
import WelcomeScreen from "@/components/workspace/WelcomeScreen";
import { useChatSessions } from "@/hooks/useChatSessions";
import { useFavorites } from "@/hooks/useFavorites";
import { selectedFilterValues } from "@/lib/filters";
import { defaultFilters, type ScoredProgram, type SearchFilters } from "@/types";

/**
 * The application shell.
 *
 * Owns only what is genuinely shared across panes — filters, which pane is
 * visible, the open program modal. Sessions and favorites live in their own
 * hooks, and every pane below is presentational.
 */
export default function FinderWorkspace() {
  const [filters, setFilters] = useState<SearchFilters>(defaultFilters);
  const [showFavorites, setShowFavorites] = useState(false);
  const [programInChat, setProgramInChat] = useState<ScoredProgram | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const chat = useChatSessions();
  const {
    favorites,
    favoriteCards,
    favoriteIds,
    isLoaded,
    toggleFavorite,
    removeFavorite,
  } = useFavorites();

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.sessions, chat.activeSessionId]);

  const handleSend = useCallback(
    (content: string) => {
      setShowFavorites(false);
      chat.sendMessage(content, filters);
    },
    [chat, filters]
  );

  /** "Filter anwenden" — turn the current selection into a search query. */
  const handleFilterSearch = useCallback(() => {
    const active = selectedFilterValues(filters).map((value) =>
      // Branche values carry their CPA code, which is noise in a chat message.
      value.replace(/\(CPA.*?\)\s*/, "")
    );

    handleSend(
      `Finde Förderprogramme für: ${
        active.length > 0 ? active.join(", ") : "alle verfügbaren Förderprogramme"
      }`
    );
  }, [filters, handleSend]);

  // Favorites are read from localStorage on mount; rendering before that would
  // flash an empty list.
  if (!isLoaded) return null;

  const showTranscript = !showFavorites && chat.activeSession;
  const showWelcome = !showFavorites && !chat.activeSession;

  return (
    <div className="h-screen flex flex-col">
      <Header
        favoriteCount={favorites.length}
        showFavorites={showFavorites}
        onFavorites={() => setShowFavorites((previous) => !previous)}
        onHome={() => {
          chat.selectSession(null);
          setShowFavorites(false);
        }}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          sessions={chat.sessions}
          activeSessionId={chat.activeSessionId}
          onSelectSession={(id) => {
            chat.selectSession(id);
            setShowFavorites(false);
          }}
          onNewChat={() => {
            chat.startNewSession();
            setShowFavorites(false);
          }}
          onDeleteSession={chat.deleteSession}
        />

        <main className="flex-1 flex flex-col overflow-hidden main-bg">
          <div className="flex-1 overflow-y-auto px-4 py-5">
            <div className="max-w-3xl mx-auto">
              <FilterPanel
                filters={filters}
                onFiltersChange={setFilters}
                onSearch={handleFilterSearch}
              />

              {showFavorites && (
                <FavoritesPanel
                  favorites={favorites}
                  favoriteCards={favoriteCards}
                  onRemove={removeFavorite}
                  onOpenChat={setProgramInChat}
                />
              )}

              {showTranscript && (
                <div className="space-y-2">
                  {chat.activeSession?.messages.map((message) => (
                    <ChatMessageItem
                      key={message.id}
                      message={message}
                      favoriteIds={favoriteIds}
                      onToggleFavorite={toggleFavorite}
                      onOpenProgramChat={setProgramInChat}
                    />
                  ))}
                  {chat.isLoading && <TypingIndicator />}
                </div>
              )}

              {showWelcome && <WelcomeScreen onSelectPrompt={handleSend} />}

              <div ref={transcriptEndRef} />
            </div>
          </div>

          <ChatInput onSend={handleSend} isLoading={chat.isLoading} />
        </main>
      </div>

      {programInChat && (
        <ProgramChatModal
          scoredProgram={programInChat}
          onClose={() => setProgramInChat(null)}
        />
      )}
    </div>
  );
}
