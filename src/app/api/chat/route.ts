import { NextResponse, type NextRequest } from "next/server";
import { runProgramSearch } from "@/server/search/service";
import { createLogger } from "@/lib/utils/logger";
import type { ChatHistoryEntry, SearchFilters } from "@/types";

/**
 * POST /api/chat — search for Förderprogramme.
 *
 * Thin by design: validate the request, delegate to the search service, shape
 * the response. All search logic lives in `server/search`.
 */

const log = createLogger("API:chat");

interface ChatRequestBody {
  message?: unknown;
  filters?: Partial<SearchFilters>;
  history?: ChatHistoryEntry[];
  shownPrograms?: unknown;
}

/** Non-empty strings only — the client may send anything. */
function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry): entry is string => typeof entry === "string" && entry.trim().length > 0
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatRequestBody;

    if (typeof body.message !== "string" || !body.message.trim()) {
      return NextResponse.json({ error: "Nachricht ist erforderlich" }, { status: 400 });
    }

    const result = await runProgramSearch({
      message: body.message,
      filters: body.filters,
      history: Array.isArray(body.history) ? body.history : [],
      shownPrograms: toStringList(body.shownPrograms),
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    log.error("request failed:", error);
    const detail = error instanceof Error ? error.message : "Unbekannter Fehler";
    return NextResponse.json(
      { error: `Fehler bei der Verarbeitung: ${detail}` },
      { status: 500 }
    );
  }
}
