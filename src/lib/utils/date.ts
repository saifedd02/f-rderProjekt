/**
 * Always-fresh ISO date (YYYY-MM-DD).
 *
 * Use this in server hot paths so the pipeline never evaluates programs against
 * a stale, module-load-time "today".
 */
export function getTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Today at local midnight, for day-granular deadline comparisons. */
export function getTodayDate(): Date {
  return new Date(`${getTodayIso()}T00:00:00`);
}

/** Whole days from `reference` to `target`, rounded up. */
export function diffInDays(target: Date, reference: Date): number {
  return Math.ceil((target.getTime() - reference.getTime()) / (1000 * 60 * 60 * 24));
}

/** Parse "YYYY-MM-DD"; undefined if the shape or the date is invalid. */
export function parseIsoDate(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** Parse the first "DD.MM.YYYY" found in a free-text string. */
export function parseGermanDate(value: string): Date | undefined {
  const match = value.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (!match) return undefined;

  const date = new Date(
    Number.parseInt(match[3], 10),
    Number.parseInt(match[2], 10) - 1,
    Number.parseInt(match[1], 10)
  );

  const day = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const year = Number.parseInt(match[3], 10);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined;
  }
  return date;
}

/** Today as an ISO date, computed at module load.
 *  Fine for client-side display defaults; prefer `getTodayIso()` on the server. */
export const TODAY = getTodayIso();
