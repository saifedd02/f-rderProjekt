import type { NextRequest } from "next/server";

/**
 * Guard for the scheduled endpoints.
 *
 * Vercel Cron calls them with `Authorization: Bearer $CRON_SECRET`. The same
 * secret works as a `?secret=` query parameter so a run can be triggered by
 * hand from a terminal without a deploy.
 *
 * With no secret configured the endpoints are refused rather than left open —
 * an unauthenticated ingest route is a free way for anyone to make us download
 * 28 MB in a loop.
 */
export function isAuthorizedCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;

  return request.nextUrl.searchParams.get("secret") === secret;
}
