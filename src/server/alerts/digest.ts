import {
  DEFAULT_TOPIC_THRESHOLD,
  MAX_DIGEST_ENTRIES,
  PRIORITY_ALERT_WINDOW_HOURS,
} from "@/config/catalog";
import { renderDigest, type DigestContent } from "@/lib/alerts/digest-email";
import { parsePriorityAlertConfig } from "@/lib/alerts/priority-config";
import { createLogger } from "@/lib/utils/logger";
import {
  markNotified,
  pendingChanges,
  recentChanges,
  type PriorityCriteria,
} from "@/server/catalog/repository";
import { hasMailer, recipients, sendAlertMail } from "./mailer";

/**
 * The weekly digest run.
 *
 * Sends what the daily ingest has collected since the last mail, then marks
 * those changes as notified — in that order, so a provider failure repeats a
 * digest rather than silently swallowing a week of alerts.
 */

const log = createLogger("Alerts:Digest");

export interface DigestResult {
  sent: boolean;
  entries: number;
  subject: string;
  messageId?: string;
  /** Why nothing was sent, when nothing was sent. */
  reason?: string;
}

function appUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_BASE_URL || undefined;
}

/**
 * Which new programs the priority alert owns right now — the digest leaves
 * those alone so a program is never announced as new twice.
 */
function priorityCriteria(): PriorityCriteria | undefined {
  const config = parsePriorityAlertConfig(process.env);
  return config.enabled
    ? { threshold: config.threshold, windowHours: PRIORITY_ALERT_WINDOW_HOURS }
    : undefined;
}

/** Build the digest without sending it — used by the preview endpoint. */
export async function buildDigestPreview(): Promise<DigestContent> {
  const changes = await recentChanges(DEFAULT_TOPIC_THRESHOLD, MAX_DIGEST_ENTRIES);
  return renderDigest({ changes, date: new Date(), appUrl: appUrl() });
}

/**
 * Send this week's digest.
 *
 * An empty week sends nothing at all: a mail that says "no news" every Monday
 * is the fastest way to teach people to filter the sender.
 */
export async function runDigest(): Promise<DigestResult> {
  const changes = await pendingChanges(
    DEFAULT_TOPIC_THRESHOLD,
    MAX_DIGEST_ENTRIES,
    priorityCriteria()
  );
  const content = renderDigest({ changes, date: new Date(), appUrl: appUrl() });

  if (changes.length === 0) {
    log.info("keine offenen Treffer — kein Versand");
    return { sent: false, entries: 0, subject: content.subject, reason: "keine Treffer" };
  }

  if (!hasMailer() || recipients().length === 0) {
    log.info("Mailversand nicht konfiguriert — Treffer bleiben offen");
    return {
      sent: false,
      entries: changes.length,
      subject: content.subject,
      reason: "Mailversand nicht konfiguriert",
    };
  }

  const messageId = await sendAlertMail(content);
  await markNotified(changes.map((change) => change.id));

  return { sent: true, entries: changes.length, subject: content.subject, messageId };
}
