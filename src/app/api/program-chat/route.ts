import { NextResponse, type NextRequest } from "next/server";
import { generateGeminiText } from "@/lib/ai/gemini";
import { buildProgramChatPrompt } from "@/server/program-chat/prompt";
import { createLogger } from "@/lib/utils/logger";
import type { ChatHistoryEntry, Foerderprogramm } from "@/types";

/**
 * POST /api/program-chat — answer a follow-up question about ONE program.
 *
 * Grounded so the model can check current deadlines and conditions rather than
 * answering from memory.
 */

const log = createLogger("API:program-chat");

interface ProgramChatRequestBody {
  message?: unknown;
  program?: Foerderprogramm;
  history?: ChatHistoryEntry[];
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ProgramChatRequestBody;

    if (typeof body.message !== "string" || !body.message.trim() || !body.program?.name) {
      return NextResponse.json(
        { error: "Nachricht und Programm sind erforderlich" },
        { status: 400 }
      );
    }

    // Gemini 3 counts its thinking tokens against maxOutputTokens (~600–1000
    // here); at 1200 the visible answer was cut off mid-sentence (MAX_TOKENS).
    const { text } = await generateGeminiText(
      buildProgramChatPrompt(body.message, body.program, body.history),
      { grounded: true, temperature: 0.2, maxOutputTokens: 4096 }
    );

    return NextResponse.json({
      reply:
        text ||
        "Ich konnte leider keine Antwort generieren. Bitte versuchen Sie es erneut.",
    });
  } catch (error: unknown) {
    log.error("request failed:", error);
    const detail = error instanceof Error ? error.message : "Unbekannter Fehler";
    return NextResponse.json({ error: `Fehler: ${detail}` }, { status: 500 });
  }
}
