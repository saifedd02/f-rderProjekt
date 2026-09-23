import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { buildDigestPreview } from "@/server/alerts/digest";
import { buildPriorityAlertPreview } from "@/server/alerts/priority";
import { hasDatabase } from "@/server/catalog/db";
import { isAuthorizedCron } from "@/server/cron/auth";

/**
 * GET /api/alerts/preview — an alert mail as it would look, rendered in a browser.
 *
 *   ?type=digest     the weekly digest (default)
 *   ?type=priority   the next priority alert
 *   &format=json     metadata instead of HTML (priority only)
 *
 * Same secret as the cron endpoints: the preview exposes the same data. Read
 * only — nothing is sent, nothing is marked as notified.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }
  if (!hasDatabase()) {
    return NextResponse.json({ error: "DATABASE_URL fehlt" }, { status: 503 });
  }

  const type = request.nextUrl.searchParams.get("type") ?? "digest";

  if (type === "priority") {
    const preview = await buildPriorityAlertPreview();
    if (request.nextUrl.searchParams.get("format") === "json") {
      return NextResponse.json(
        {
          subject: preview.content.subject,
          entries: preview.entries,
          deferred: preview.deferred,
          sample: preview.sample,
          config: preview.config,
        },
        { headers: NO_STORE }
      );
    }
    return new NextResponse(preview.content.html, {
      headers: { "Content-Type": "text/html; charset=utf-8", ...NO_STORE },
    });
  }

  if (type !== "digest") {
    return NextResponse.json(
      { error: 'Unbekannter Typ. Erwartet: "digest" oder "priority"' },
      { status: 400 }
    );
  }

  const digest = await buildDigestPreview();
  return new NextResponse(digest.html, {
    headers: { "Content-Type": "text/html; charset=utf-8", ...NO_STORE },
  });
}
