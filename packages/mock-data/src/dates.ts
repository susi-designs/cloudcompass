const DAY_MS = 86_400_000;

/** Parse `YYYY-MM-DD` as UTC midnight. */
export function parseDay(day: string): Date {
  const date = new Date(`${day}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date: ${day}`);
  return date;
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/** Inclusive list of UTC days ending at `end`. */
export function dayRange(end: Date, days: number): Date[] {
  return Array.from({ length: days }, (_, i) => addDays(end, i - days + 1));
}

export function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function startOfNextMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
}

export const iso = (date: Date): string => date.toISOString();
