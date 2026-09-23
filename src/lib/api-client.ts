import type { ChatHistoryEntry, ScoredProgram, SearchFilters } from "@/types";

/**
 * Typed browser client for the app's own API routes.
 *
 * Keeps fetch details and error shaping in one place so components deal with
 * values and exceptions, never with response plumbing.
 */

export interface ChatSearchRequest {
  message: string;
  filters: SearchFilters;
  history: ChatHistoryEntry[];
  /** Programs already shown in this session, so the search returns new ones. */
  shownPrograms: string[];
}

export interface ChatSearchResponse {
  reply: string;
  programs: ScoredProgram[];
}

/** POST a JSON body and unwrap the response, turning API errors into exceptions. */
async function postJson<TResponse>(url: string, body: unknown): Promise<TResponse> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = (data as { error?: string })?.error;
    throw new Error(message || "Fehler bei der Anfrage");
  }

  return data as TResponse;
}

/** Search for Förderprogramme. */
export async function searchPrograms(
  request: ChatSearchRequest
): Promise<ChatSearchResponse> {
  const data = await postJson<Partial<ChatSearchResponse>>("/api/chat", request);
  return {
    reply: data.reply || "",
    programs: data.programs || [],
  };
}

/** Ask a follow-up question about one specific program. */
export async function askAboutProgram(request: {
  message: string;
  program: ScoredProgram["program"];
  history: ChatHistoryEntry[];
}): Promise<string> {
  const data = await postJson<{ reply?: string }>("/api/program-chat", request);
  return data.reply || "";
}
