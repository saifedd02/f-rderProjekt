import type { ChatHistoryEntry, Foerderprogramm } from "@/types";

/** How many turns of the per-program conversation the model sees. */
const HISTORY_WINDOW = 8;

/** Only the program fields that are actually set, as prompt lines. */
function formatProgramContext(program: Foerderprogramm): string {
  return [
    `- Name: ${program.name}`,
    program.beschreibung && `- Beschreibung: ${program.beschreibung}`,
    program.foerderhoehe && `- Förderhöhe: ${program.foerderhoehe}`,
    program.zielgruppe && `- Zielgruppe: ${program.zielgruppe}`,
    program.region && `- Region: ${program.region}`,
    program.frist && `- Frist: ${program.frist}`,
    program.foerderbereich && `- Förderbereich: ${program.foerderbereich}`,
    program.foerderart && `- Förderart: ${program.foerderart}`,
    program.link && `- Bekannter Link: ${program.link}`,
    program.quelle && `- Bekannte Quelle: ${program.quelle}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function formatHistory(history: ChatHistoryEntry[] = []): string {
  if (history.length === 0) return "Keine vorherige Konversation.";

  return history
    .slice(-HISTORY_WINDOW)
    .map(
      (entry) =>
        `${entry.role === "assistant" ? "Assistent" : "Nutzer"}: ${entry.content}`
    )
    .join("\n");
}

/** Prompt for a follow-up question about one specific program. */
export function buildProgramChatPrompt(
  message: string,
  program: Foerderprogramm,
  history?: ChatHistoryEntry[]
): string {
  return `Du bist ein präziser Förderprogramm-Experte. Recherchiere bei Bedarf im Web nach aktuellen Details zu diesem Programm und beantworte die Frage des Nutzers auf Deutsch.

REGELN:
- Nutze den bekannten Programmkontext als Ausgangspunkt
- Prüfe aktuelle Informationen über Websuche, wenn es um Fristen, Förderhöhe, Antragstellung oder Voraussetzungen geht
- Wenn etwas unklar ist, sage das offen
- Antworte kurz, konkret und ohne Floskeln

PROGRAMMKONTEXT:
${formatProgramContext(program)}

BISHERIGE KONVERSATION:
${formatHistory(history)}

AKTUELLE FRAGE:
${message}`;
}
