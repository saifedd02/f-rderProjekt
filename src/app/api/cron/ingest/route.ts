import { NextResponse, type NextRequest } from "next/server";
import { alertAfterIngest } from "@/server/alerts/priority";
import { hasDatabase } from "@/server/catalog/db";
import { IngestInProgressError, runIngest } from "@/server/catalog/ingest";
import { isAuthorizedCron } from "@/server/cron/auth";
import { createLogger } from "@/lib/utils/logger";

/**
 * GET /api/cron/ingest — the daily catalogue run, followed by the priority alert.
 *
 * Thin by design, like the other routes: authorise, delegate, shape the answer.
 * The work itself lives in `server/catalog/ingest.ts` and
 * `server/alerts/priority.ts` and is callable without HTTP
 * (see `npm run catalog:ingest`).
 *
 * The alert runs in the same invocation because that is the earliest moment
 * the new programs are known. If it fails or the function runs out of time,
 * `/api/cron/priority-alert` picks the claimed entries up later.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Downloading and parsing ~28 MB needs more than the default 10 s. */
export const maxDuration = 300;

const log = createLogger("API:cron/ingest");

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }
  if (!hasDatabase()) {
    return NextResponse.json({ error: "DATABASE_URL fehlt" }, { status: 503 });
  }

  try {
    const report = await runIngest();
    const priorityAlert = await alertAfterIngest(report);
    return NextResponse.json({ ...report, priorityAlert });
  } catch (error) {
    if (error instanceof IngestInProgressError) {
      return NextResponse.json({ skipped: true, reason: error.message }, { status: 409 });
    }
    const detail = error instanceof Error ? error.message : "Unbekannter Fehler";
    log.error("Lauf fehlgeschlagen:", error);
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
