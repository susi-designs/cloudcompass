import { daysInMonth, type DayKey } from './dates';

/** Days of run-rate used to project the rest of the month. */
export const FORECAST_TRAILING_DAYS = 7;

/**
 * Month-end forecast = month-to-date actuals + trailing 7-day average × days left.
 * Shared by the Overview and Budgets so both show the same number.
 */
export function monthEndForecast(mtd: number, trailingSum: number, asOf: DayKey): number {
  const remainingDays = daysInMonth(asOf) - Number(asOf.slice(8, 10));
  return mtd + (trailingSum / FORECAST_TRAILING_DAYS) * remainingDays;
}

export const percentChange = (value: number, previous: number): number | null =>
  previous === 0 ? null : ((value - previous) / previous) * 100;
