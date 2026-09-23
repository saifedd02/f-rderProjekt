import { createHash, randomUUID } from "node:crypto";
import {
  PRIORITY_ALERT_LEASE_MINUTES,
  PRIORITY_ALERT_RETRY_MINUTES,
  PRIORITY_ALERT_WINDOW_HOURS,
} from "@/config/catalog";
import type { DigestContent } from "@/lib/alerts/digest-email";
import {
  parsePriorityAlertConfig,
  type PriorityAlertConfig,
} from "@/lib/alerts/priority-config";
import { renderPriorityAlert } from "@/lib/alerts/priority-email";
import { createLogger } from "@/lib/utils/logger";
import { ensureSchema } from "@/server/catalog/db";
import {
  abandonPriorityDelivery,
  claimPriorityChanges,
  completePriorityDelivery,
  createPriorityDelivery,
  discardPriorityDelivery,
  failPriorityDelivery,
  openPriorityDelivery,
  previewPriorityChanges,
  priorityDeliveryChanges,
  recentChanges,
  takeOverPriorityDelivery,
  type OpenPriorityDelivery,
  type PriorityDelivery,
} from "@/server/catalog/repository";
import type { CatalogChange, IngestReport } from "@/types/catalog";
import { hasMailer, recipients, sendAlertMail, type SendMailOptions } from "./mailer";

/**
 * The priority alert: new, strongly matching programs, mailed right after the
 * daily ingest instead of waiting for Monday.
 *
 * The order of operations is the whole design:
 *
 *   claim (DB)  →  send (Resend, idempotency key)  →  mark sent (DB, lease check)
 *
 * A failure before "send" leaves the claim to be retried; a failure between
 * "send" and "mark" repeats the send with the same key, which Resend drops as
 * a duplicate. Nothing is marked before the provider accepted it.
 */

const log = createLogger("Alerts:Priority");

export type SendMail = (
  content: DigestContent,
  options: SendMailOptions
) => Promise<string>;

export interface PriorityAlertDeps {
  /** Defaults to `process.env`. */
  env?: Record<string, string | undefined>;
  /** Defaults to the Resend mailer — tests pass a fake. */
  send?: SendMail;
  /** Defaults to checking the Resend variables and `ALERT_RECIPIENTS`. */
  isMailerConfigured?: () => boolean;
}

export interface PriorityDeliveryOutcome {
  deliveryId: number;
  entries: number;
  deferred: number;
  /** Continued a delivery an earlier run had started. */
  resumed: boolean;
  attempts: number;
  subject?: string;
  messageId?: string;
  error?: string;
  /** Too old for a priority mail; its entries went to the weekly digest. */
  abandoned?: boolean;
}

export interface PriorityAlertResult {
  sent: boolean;
  /** Entries mailed in this run. */
  entries: number;
  /** Why nothing (more) was sent. */
  reason?: string;
  error?: string;
  deliveries: PriorityDeliveryOutcome[];
  config: PriorityAlertConfig;
}

function defaultMailerConfigured(): boolean {
  return hasMailer() && recipients().length > 0;
}

/**
 * Same delivery, same entries → same key. Resend then accepts a retried send
 * once. A changed composition gets a new key, because Resend rejects a reused
 * key with a different payload.
 */
function idempotencyKey(delivery: PriorityDelivery, changes: CatalogChange[]): string {
  const ids = changes
    .map((change) => change.id)
    .sort((a, b) => a - b)
    .join(",");
  const hash = createHash("sha256")
    .update(`${delivery.createdAt.toISOString()}|${ids}`)
    .digest("hex")
    .slice(0, 32);
  return `foerderradar-priority-${delivery.id}-${hash}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function deliver(
  delivery: PriorityDelivery,
  leaseToken: string,
  config: PriorityAlertConfig,
  env: Record<string, string | undefined>,
  send: SendMail,
  resumed: boolean
): Promise<PriorityDeliveryOutcome> {
  const outcome: PriorityDeliveryOutcome = {
    deliveryId: delivery.id,
    entries: 0,
    deferred: 0,
    resumed,
    attempts: delivery.attempts,
  };

  if (delivery.expired) {
    await abandonPriorityDelivery(delivery.id, leaseToken);
    log.warn(
      `Zustellung ${delivery.id} ist älter als ${PRIORITY_ALERT_WINDOW_HOURS} h — Treffer gehen an den Wochen-Digest.`
    );
    return { ...outcome, abandoned: true };
  }

  const { changes, deferred } = await priorityDeliveryChanges(delivery.id);
  if (changes.length === 0) {
    await abandonPriorityDelivery(delivery.id, leaseToken);
    return { ...outcome, deferred, abandoned: true };
  }

  const content = renderPriorityAlert({
    changes,
    date: delivery.createdAt,
    threshold: config.threshold,
    deferred,
    appUrl: env.NEXT_PUBLIC_BASE_URL || undefined,
  });
  const prepared = {
    ...outcome,
    entries: changes.length,
    deferred,
    subject: content.subject,
  };

  let messageId: string;
  try {
    messageId = await send(content, {
      idempotencyKey: idempotencyKey(delivery, changes),
    });
  } catch (error) {
    const message = errorMessage(error);
    log.error(
      `Zustellung ${delivery.id} fehlgeschlagen (Versuch ${delivery.attempts}):`,
      message
    );
    await failPriorityDelivery(
      delivery.id,
      leaseToken,
      message,
      PRIORITY_ALERT_RETRY_MINUTES
    );
    return { ...prepared, error: message };
  }

  const recorded = await completePriorityDelivery(
    delivery.id,
    leaseToken,
    messageId,
    changes.map((change) => change.id)
  );
  if (recorded) {
    log.info(`Prioritätsalarm ${delivery.id} versendet:`, changes.length, "Treffer");
  } else {
    log.warn(
      `Zustellung ${delivery.id}: Lease abgelaufen, ein anderer Lauf hat übernommen — der Idempotenzschlüssel verhindert eine Doppelmail.`
    );
  }
  return { ...prepared, messageId };
}

function busyReason(open: OpenPriorityDelivery | undefined): string {
  if (open?.status === "failed") {
    const retry = open.leaseUntil
      ? ` Nächster Versuch ab ${open.leaseUntil.toISOString()}.`
      : "";
    return `Letzter Versand fehlgeschlagen: ${open.lastError ?? "unbekannter Fehler"}.${retry}`;
  }
  return "Versand läuft bereits in einem anderen Aufruf";
}

function summarize(result: PriorityAlertResult, reason?: string): PriorityAlertResult {
  const delivered = result.deliveries.filter((delivery) => delivery.messageId);
  const failed = result.deliveries.find((delivery) => delivery.error);

  return {
    ...result,
    sent: delivered.length > 0,
    entries: delivered.reduce((total, delivery) => total + delivery.entries, 0),
    reason: failed
      ? "Versand fehlgeschlagen — die Treffer bleiben vorgemerkt und werden erneut versucht"
      : reason,
    error: failed?.error,
  };
}

/**
 * Send what is owed: first an unfinished delivery of an earlier run, then the
 * new candidates. Safe to call any number of times, also concurrently.
 */
export async function runPriorityAlert(
  deps: PriorityAlertDeps = {}
): Promise<PriorityAlertResult> {
  const env = deps.env ?? process.env;
  const config = parsePriorityAlertConfig(env);
  for (const warning of config.warnings) log.warn(warning);

  const result: PriorityAlertResult = { sent: false, entries: 0, deliveries: [], config };

  if (!config.enabled) {
    return {
      ...result,
      reason: "Prioritätsalarm ist deaktiviert (PRIORITY_ALERT_ENABLED)",
    };
  }
  // Checked BEFORE claiming: without a mailer nothing may be taken out of the queue.
  if (!(deps.isMailerConfigured ?? defaultMailerConfigured)()) {
    log.info("Mailversand nicht konfiguriert — Treffer bleiben offen");
    return {
      ...result,
      reason: "Mailversand nicht konfiguriert — Treffer bleiben offen",
    };
  }

  const send = deps.send ?? sendAlertMail;
  await ensureSchema();

  // 1. An unfinished delivery comes first: its content is frozen and owed.
  const resumeToken = randomUUID();
  const unfinished = await takeOverPriorityDelivery(
    resumeToken,
    PRIORITY_ALERT_LEASE_MINUTES,
    PRIORITY_ALERT_WINDOW_HOURS
  );
  if (unfinished) {
    const outcome = await deliver(unfinished, resumeToken, config, env, send, true);
    result.deliveries.push(outcome);
    // The provider is failing right now — do not open a second delivery.
    if (outcome.error) return summarize(result);
  }

  // 2. Fresh candidates. Creating the delivery IS the mutex: a parallel run
  //    fails here because only one unfinished delivery may exist.
  const leaseToken = randomUUID();
  const delivery = await createPriorityDelivery(leaseToken, PRIORITY_ALERT_LEASE_MINUTES);
  if (!delivery) {
    return summarize(result, busyReason(await openPriorityDelivery()));
  }

  const claim = await claimPriorityChanges(
    delivery.id,
    { threshold: config.threshold, windowHours: PRIORITY_ALERT_WINDOW_HOURS },
    config.maxEntries
  );
  if (claim.claimed === 0) {
    await discardPriorityDelivery(delivery.id, leaseToken);
    return summarize(
      result,
      result.deliveries.length > 0 ? undefined : "keine neuen Treffer über dem Grenzwert"
    );
  }

  result.deliveries.push(await deliver(delivery, leaseToken, config, env, send, false));
  return summarize(result);
}

/**
 * The hook the daily ingest calls once it has committed.
 *
 * Never throws: the ingest has already succeeded and its report must reach the
 * caller. A failure here is reported and retried by `/api/cron/priority-alert`.
 */
export async function alertAfterIngest(
  report: IngestReport,
  deps: PriorityAlertDeps = {}
): Promise<PriorityAlertResult> {
  const config = parsePriorityAlertConfig(deps.env ?? process.env);

  if (report.seeded) {
    return {
      sent: false,
      entries: 0,
      deliveries: [],
      config,
      reason: report.migration
        ? "Migrationslauf: Datenformat aktualisiert, es wird nichts gemeldet"
        : "Erstlauf: Bestand aufgebaut, es wird nichts gemeldet",
    };
  }

  try {
    return await runPriorityAlert(deps);
  } catch (error) {
    const message = errorMessage(error);
    log.error("Prioritätsalarm nach dem Ingest fehlgeschlagen:", error);
    return {
      sent: false,
      entries: 0,
      deliveries: [],
      config,
      reason:
        "Prioritätsalarm fehlgeschlagen — wird über /api/cron/priority-alert erneut versucht",
      error: message,
    };
  }
}

export interface PriorityAlertPreview {
  content: DigestContent;
  entries: number;
  deferred: number;
  /** No open candidates — the preview shows recently detected programs instead. */
  sample: boolean;
  config: PriorityAlertConfig;
}

/** The next priority mail as it would look. Sends nothing, claims nothing. */
export async function buildPriorityAlertPreview(
  env: Record<string, string | undefined> = process.env
): Promise<PriorityAlertPreview> {
  const config = parsePriorityAlertConfig(env);
  await ensureSchema();

  const open = await openPriorityDelivery();
  let { changes, deferred } = open
    ? await priorityDeliveryChanges(open.id)
    : await previewPriorityChanges(
        { threshold: config.threshold, windowHours: PRIORITY_ALERT_WINDOW_HOURS },
        config.maxEntries
      );

  const notes = ["Vorschau — es wird nichts versendet und nichts als gemeldet markiert."];
  if (!config.enabled) {
    notes.push(
      "Der Prioritätsalarm ist deaktiviert; diese Mail würde derzeit nicht verschickt."
    );
  }
  notes.push(...config.warnings);
  if (open) {
    notes.push(`Gezeigt wird die offene Zustellung ${open.id} (Status: ${open.status}).`);
  }

  let sample = false;
  if (changes.length === 0) {
    const recent = await recentChanges(config.threshold, config.maxEntries, "new");
    if (recent.length > 0) {
      changes = recent;
      deferred = 0;
      sample = true;
      notes.push(
        `Beispielansicht: Aktuell gibt es keine offenen Treffer. Gezeigt werden zuletzt erkannte neue Programme ab Score ${config.threshold} — bereits verarbeitet oder älter als ${PRIORITY_ALERT_WINDOW_HOURS} h.`
      );
    }
  }

  return {
    content: renderPriorityAlert({
      changes,
      date: new Date(),
      threshold: config.threshold,
      deferred,
      appUrl: env.NEXT_PUBLIC_BASE_URL || undefined,
      notes,
    }),
    entries: changes.length,
    deferred,
    sample,
    config,
  };
}
