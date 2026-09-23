import type { ScoredProgram } from "./program";

export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  programs?: ScoredProgram[];
  /** Short result line shown above the program cards. */
  filterSummary?: string;
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
}

/** One turn as it is sent to the API — no ids, no timestamps. */
export interface ChatHistoryEntry {
  role: string;
  content: string;
}
