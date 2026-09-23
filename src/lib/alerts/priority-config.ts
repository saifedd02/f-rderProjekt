import { PRIORITY_ALERT_DEFAULTS, PRIORITY_ALERT_LIMITS } from "@/config/catalog";

/**
 * Settings of the priority alert, read from env — validated, never trusted.
 *
 * A typo in a Vercel env var must neither crash the cron nor silently widen
 * the alert: an unparseable switch turns the alert OFF, an unparseable number
 * falls back to its default. Every fallback is reported as a warning so it
 * shows up in the logs and in the preview.
 */

export interface PriorityAlertConfig {
  enabled: boolean;
  /** Minimum top topic score (0–100) for an entry. */
  threshold: number;
  /** Most entries in one priority mail. */
  maxEntries: number;
  /** Human-readable notes about env values that were rejected. */
  warnings: string[];
}

type Env = Record<string, string | undefined>;

const TRUE_VALUES = ["1", "true", "yes", "on", "ja"];
const FALSE_VALUES = ["0", "false", "no", "off", "nein"];

function parseEnabled(raw: string | undefined, warnings: string[]): boolean {
  if (raw === undefined || raw.trim() === "") return PRIORITY_ALERT_DEFAULTS.enabled;

  const value = raw.trim().toLowerCase();
  if (TRUE_VALUES.includes(value)) return true;
  if (FALSE_VALUES.includes(value)) return false;

  warnings.push(
    `PRIORITY_ALERT_ENABLED="${raw}" ist ungültig (erwartet true oder false) — der Prioritätsalarm bleibt sicherheitshalber aus.`
  );
  return false;
}

function parseInteger(
  name: string,
  raw: string | undefined,
  limits: { min: number; max: number },
  fallback: number,
  warnings: string[]
): number {
  if (raw === undefined || raw.trim() === "") return fallback;

  const value = raw.trim();
  if (!/^-?\d+$/.test(value)) {
    warnings.push(
      `${name}="${raw}" ist keine ganze Zahl — Standardwert ${fallback} wird verwendet.`
    );
    return fallback;
  }

  const parsed = Number(value);
  if (parsed < limits.min || parsed > limits.max) {
    warnings.push(
      `${name}=${value} liegt außerhalb von ${limits.min}–${limits.max} — Standardwert ${fallback} wird verwendet.`
    );
    return fallback;
  }
  return parsed;
}

export function parsePriorityAlertConfig(env: Env): PriorityAlertConfig {
  const warnings: string[] = [];

  return {
    enabled: parseEnabled(env.PRIORITY_ALERT_ENABLED, warnings),
    threshold: parseInteger(
      "PRIORITY_ALERT_THRESHOLD",
      env.PRIORITY_ALERT_THRESHOLD,
      PRIORITY_ALERT_LIMITS.threshold,
      PRIORITY_ALERT_DEFAULTS.threshold,
      warnings
    ),
    maxEntries: parseInteger(
      "PRIORITY_ALERT_MAX_ENTRIES",
      env.PRIORITY_ALERT_MAX_ENTRIES,
      PRIORITY_ALERT_LIMITS.maxEntries,
      PRIORITY_ALERT_DEFAULTS.maxEntries,
      warnings
    ),
    warnings,
  };
}
