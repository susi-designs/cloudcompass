/** Date helpers on `YYYY-MM-DD` day keys (UTC). */

const DAY_MS = 86_400_000;

export type DayKey = string;

export function toDayKey(date: Date): DayKey {
  return date.toISOString().slice(0, 10);
}

export function fromDayKey(day: DayKey): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

export function addDays(day: DayKey, days: number): DayKey {
  return toDayKey(new Date(fromDayKey(day).getTime() + days * DAY_MS));
}

/** Inclusive number of days between two day keys. */
export function daysBetween(start: DayKey, end: DayKey): number {
  return Math.round((fromDayKey(end).getTime() - fromDayKey(start).getTime()) / DAY_MS) + 1;
}

export function startOfMonth(day: DayKey): DayKey {
  return `${day.slice(0, 7)}-01`;
}

export function daysInMonth(day: DayKey): number {
  const d = fromDayKey(day);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
}

/** Same day-of-month in the previous month, clamped to that month's length. */
export function sameDayPreviousMonth(day: DayKey): DayKey {
  const d = fromDayKey(day);
  const prev = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1));
  const clamped = Math.min(d.getUTCDate(), daysInMonth(toDayKey(prev)));
  return toDayKey(new Date(Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth(), clamped)));
}
