import { NextResponse, type NextRequest } from "next/server";
import { runPriorityAlert } from "@/server/alerts/priority";
import { hasDatabase } from "@/server/catalog/db";
import { isAuthorizedCron } from "@/server/cron/auth";
import { createLogger } from "@/lib/utils/logger";

/**
 * GET /api/cron/priority-alert — send pending priority alerts.
 *
 * The regular path is the ingest route, which alerts right after its run.
 * This endpoint is the safety net: scheduled after the ingest, it retries a
 * failed send, finishes a delivery whose function was cut off, and can be
 * called by hand. Every call is idempotent — repeated or parallel calls never
 * mail the same program twice.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const log = createLogger("API:cron/priority-alert");

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }
  if (!hasDatabase()) {
    return NextResponse.json({ error: "DATABASE_URL fehlt" }, { status: 503 });
  }

  try {
    const result = await runPriorityAlert();
    // A failed send is an error for the cron log, even though nothing is lost.
    return NextResponse.json(result, { status: result.error ? 502 : 200 });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unbekannter Fehler";
    log.error("Prioritätsalarm fehlgeschlagen:", error);
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
