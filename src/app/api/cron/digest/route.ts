import { NextResponse, type NextRequest } from "next/server";
import { runDigest } from "@/server/alerts/digest";
import { hasDatabase } from "@/server/catalog/db";
import { isAuthorizedCron } from "@/server/cron/auth";
import { createLogger } from "@/lib/utils/logger";

/**
 * GET /api/cron/digest — the weekly alert mail.
 *
 * Runs after the Monday ingest so the digest includes that morning's changes.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const log = createLogger("API:cron/digest");

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }
  if (!hasDatabase()) {
    return NextResponse.json({ error: "DATABASE_URL fehlt" }, { status: 503 });
  }

  // Vercel's Hobby plan only runs crons once a day, so the weekly digest is
  // scheduled daily and gated here instead. `?force=1` sends regardless.
  const sendWeekday = Number(process.env.DIGEST_WEEKDAY ?? "1");
  const force = request.nextUrl.searchParams.get("force") === "1";
  if (!force && Number.isFinite(sendWeekday) && new Date().getDay() !== sendWeekday) {
    return NextResponse.json({ sent: false, reason: "heute ist kein Versandtag" });
  }

  try {
    return NextResponse.json(await runDigest());
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unbekannter Fehler";
    log.error("Versand fehlgeschlagen:", error);
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
