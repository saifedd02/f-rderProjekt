import { NextRequest, NextResponse } from "next/server";
import { generateGeminiText } from "@/lib/gemini";
import { Foerderprogramm } from "@/lib/types";

function buildProgramPrompt(
  message: string,
  program: Foerderprogramm,
  history?: Array<{ role: string; content: string }>
) {
  const historyText =
    history && history.length > 0
      ? history
          .slice(-8)
          .map((entry) =>
            `${entry.role === "assistant" ? "Assistent" : "Nutzer"}: ${entry.content}`
          )
          .join("\n")
      : "Keine vorherige Konversation.";

  return `Du bist ein präziser Förderprogramm-Experte. Recherchiere bei Bedarf im Web nach aktuellen Details zu diesem Programm und beantworte die Frage des Nutzers auf Deutsch.

REGELN:
- Nutze den bekannten Programmkontekt als Ausgangspunkt
- Prüfe aktuelle Informationen über Websuche, wenn es um Fristen, Förderhöhe, Antragstellung oder Voraussetzungen geht
- Wenn etwas unklar ist, sage das offen
- Antworte kurz, konkret und ohne Floskeln

PROGRAMMKONTEXT:
- Name: ${program.name}
${program.beschreibung ? `- Beschreibung: ${program.beschreibung}` : ""}
${program.foerderhoehe ? `- Förderhöhe: ${program.foerderhoehe}` : ""}
${program.zielgruppe ? `- Zielgruppe: ${program.zielgruppe}` : ""}
${program.region ? `- Region: ${program.region}` : ""}
${program.frist ? `- Frist: ${program.frist}` : ""}
${program.foerderbereich ? `- Förderbereich: ${program.foerderbereich}` : ""}
${program.foerderart ? `- Förderart: ${program.foerderart}` : ""}
${program.link ? `- Bekannter Link: ${program.link}` : ""}
${program.quelle ? `- Bekannte Quelle: ${program.quelle}` : ""}

BISHERIGE KONVERSATION:
${historyText}

AKTUELLE FRAGE:
${message}`;
}

export async function POST(request: NextRequest) {
  try {
    const { message, program, history } = await request.json();

    if (!message || !program) {
      return NextResponse.json(
        { error: "Nachricht und Programm sind erforderlich" },
        { status: 400 }
      );
    }

    const { text } = await generateGeminiText(
      buildProgramPrompt(message, program, history),
      {
        grounded: true,
        temperature: 0.2,
        maxOutputTokens: 1200,
      }
    );

    return NextResponse.json({
      reply:
        text ||
        "Ich konnte leider keine Antwort generieren. Bitte versuchen Sie es erneut.",
    });
  } catch (error: unknown) {
    console.error("Program chat error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unbekannter Fehler";
    return NextResponse.json(
      { error: "Fehler: " + errorMessage },
      { status: 500 }
    );
  }
}
