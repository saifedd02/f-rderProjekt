import { Resend } from "resend";
import { createLogger } from "@/lib/utils/logger";
import type { DigestContent } from "@/lib/alerts/digest-email";

/**
 * Outbound mail via Resend.
 *
 * Isolated behind one function so the digest logic never touches a provider
 * SDK — swapping Resend for SMTP later means replacing this file only.
 */

const log = createLogger("Alerts:Mail");

export function hasMailer(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.ALERT_FROM);
}

/** Recipients from `ALERT_RECIPIENTS`, comma-separated. */
export function recipients(): string[] {
  return (process.env.ALERT_RECIPIENTS || "")
    .split(",")
    .map((address) => address.trim())
    .filter((address) => address.includes("@"));
}

export interface SendMailOptions {
  /**
   * Resend deduplicates requests with the same key for 24 hours — a retried
   * delivery with identical content is then accepted once, not twice.
   */
  idempotencyKey?: string;
}

/**
 * Send an alert mail (weekly digest or priority alert).
 *
 * Throws on a provider error rather than swallowing it: the caller must not
 * mark changes as notified when nothing was delivered.
 */
export async function sendAlertMail(
  content: DigestContent,
  options: SendMailOptions = {}
): Promise<string> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ALERT_FROM;
  const to = recipients();

  if (!apiKey || !from) {
    throw new Error("RESEND_API_KEY oder ALERT_FROM fehlt.");
  }
  if (to.length === 0) {
    throw new Error("ALERT_RECIPIENTS enthält keine gültige Adresse.");
  }

  const { data, error } = await new Resend(apiKey).emails.send(
    {
      from,
      to,
      subject: content.subject,
      html: content.html,
      text: content.text,
    },
    options.idempotencyKey ? { idempotencyKey: options.idempotencyKey } : undefined
  );

  if (error) {
    throw new Error(`Resend: ${error.message}`);
  }

  log.info("Mail versendet an", to.length, "Empfänger:", data?.id);
  return data?.id ?? "";
}
