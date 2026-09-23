"use client";

import { useCallback, useState } from "react";
import { searchPrograms } from "@/lib/api-client";
import { generateId } from "@/lib/utils/id";
import type { ChatMessage, ChatSession, ScoredProgram, SearchFilters } from "@/types";

/**
 * Chat sessions and the search round-trip.
 *
 * Sessions are in-memory only: a search reflects today's funding landscape, so
 * replaying an old transcript later would show results that may no longer hold.
 * Programs worth keeping are bookmarked instead (see `useFavorites`).
 */

const NEW_SESSION_TITLE = "Neue Suche";
const TITLE_MAX_LENGTH = 30;

/** First user message becomes the session title, truncated. */
function toTitle(message: string): string {
  return message.length > TITLE_MAX_LENGTH
    ? `${message.substring(0, TITLE_MAX_LENGTH)}...`
    : message;
}

/** The result line shown above the cards — a count, no "% Match". */
function buildResultSummary(programs: ScoredProgram[]): string {
  if (programs.length === 0) return "Keine passenden Programme gefunden";
  return programs.length === 1
    ? "1 Programm gefunden"
    : `${programs.length} Programme gefunden`;
}

function createMessage(
  role: ChatMessage["role"],
  content: string,
  extra: Partial<ChatMessage> = {}
): ChatMessage {
  return { id: generateId(), role, content, timestamp: new Date(), ...extra };
}

export interface UseChatSessions {
  sessions: ChatSession[];
  activeSession: ChatSession | null;
  activeSessionId: string | null;
  isLoading: boolean;
  selectSession: (id: string | null) => void;
  startNewSession: () => void;
  deleteSession: (id: string) => void;
  /** Append the user's message and run the search. */
  sendMessage: (content: string, filters: SearchFilters) => void;
}

export function useChatSessions(): UseChatSessions {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const appendMessage = useCallback((sessionId: string, message: ChatMessage) => {
    setSessions((previous) =>
      previous.map((session) =>
        session.id === sessionId
          ? { ...session, messages: [...session.messages, message] }
          : session
      )
    );
  }, []);

  const startNewSession = useCallback(() => {
    const session: ChatSession = {
      id: generateId(),
      title: NEW_SESSION_TITLE,
      messages: [],
      createdAt: new Date(),
    };
    setSessions((previous) => [session, ...previous]);
    setActiveSessionId(session.id);
  }, []);

  const deleteSession = useCallback((id: string) => {
    setSessions((previous) => previous.filter((session) => session.id !== id));
    setActiveSessionId((current) => (current === id ? null : current));
  }, []);

  const runSearch = useCallback(
    async (
      sessionId: string,
      content: string,
      filters: SearchFilters,
      priorMessages: ChatMessage[]
    ) => {
      setIsLoading(true);

      try {
        const history = priorMessages
          .filter((message) => message.role !== "system")
          .map((message) => ({ role: message.role, content: message.content }));

        // Every program already shown, so a follow-up search returns new ones.
        const shownPrograms = Array.from(
          new Set(
            priorMessages
              .flatMap((message) => message.programs ?? [])
              .map((scored) => scored.program.name)
              .filter(Boolean)
          )
        );

        const { reply, programs } = await searchPrograms({
          message: content,
          filters,
          history,
          shownPrograms,
        });

        appendMessage(
          sessionId,
          createMessage("assistant", reply, {
            programs,
            filterSummary: buildResultSummary(programs),
          })
        );
      } catch (error) {
        appendMessage(
          sessionId,
          createMessage(
            "assistant",
            error instanceof Error
              ? `Fehler: ${error.message}`
              : "Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut."
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [appendMessage]
  );

  const sendMessage = useCallback(
    (content: string, filters: SearchFilters) => {
      const userMessage = createMessage("user", content);
      const existing = sessions.find((session) => session.id === activeSessionId);

      // The turns that existed BEFORE this message — the context the search runs
      // with. Read here rather than inside the state updater, which React may
      // invoke more than once.
      const priorMessages = existing?.messages ?? [];
      const sessionId = existing?.id ?? generateId();

      if (existing) {
        setSessions((previous) =>
          previous.map((session) =>
            session.id !== sessionId
              ? session
              : {
                  ...session,
                  title:
                    session.title === NEW_SESSION_TITLE
                      ? toTitle(content)
                      : session.title,
                  messages: [...session.messages, userMessage],
                }
          )
        );
      } else {
        setSessions((previous) => [
          {
            id: sessionId,
            title: toTitle(content),
            messages: [userMessage],
            createdAt: new Date(),
          },
          ...previous,
        ]);
      }

      setActiveSessionId(sessionId);
      void runSearch(sessionId, content, filters, priorMessages);
    },
    [sessions, activeSessionId, runSearch]
  );

  return {
    sessions,
    activeSession: sessions.find((session) => session.id === activeSessionId) || null,
    activeSessionId,
    isLoading,
    selectSession: setActiveSessionId,
    startNewSession,
    deleteSession,
    sendMessage,
  };
}
