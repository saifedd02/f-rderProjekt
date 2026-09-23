import { createLogger } from "@/lib/utils/logger";
import { ensureSchema, hasDatabase, withClient } from "@/server/catalog/db";

/**
 * Raw model responses, stored as they came back.
 *
 * Needed twice: to debug a bad card ("what did the model actually say?") and
 * as the evidence base of the provider benchmark. Fire-and-forget — a failed
 * write never slows down or breaks a search. Set STORE_MODEL_RESPONSES=off to
 * disable.
 */

const log = createLogger("Search:RawLog");

export interface ModelResponseRecord {
  provider: string;
  model: string;
  prompt: string;
  raw: unknown;
  programs: number;
  latencyMs: number;
}

function enabled(): boolean {
  return hasDatabase() && process.env.STORE_MODEL_RESPONSES !== "off";
}

export function recordModelResponse(record: ModelResponseRecord): void {
  if (!enabled()) return;

  void ensureSchema()
    .then(() =>
      withClient((client) =>
        client.query(
          `INSERT INTO model_responses (provider, model, prompt, raw, programs, latency_ms)
           VALUES ($1, $2, $3, $4::jsonb, $5, $6)`,
          [
            record.provider,
            record.model,
            record.prompt,
            JSON.stringify(record.raw ?? null),
            record.programs,
            record.latencyMs,
          ]
        )
      )
    )
    .catch((error) => log.warn("Rohantwort konnte nicht gespeichert werden:", error));
}
