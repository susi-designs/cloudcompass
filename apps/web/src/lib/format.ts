/**
 * Locale-aware number formatting (DESIGN.md §5.2). Format only at the edge.
 * - KPIs and chart axes: compact (`$1.2M`)
 * - Tables and tooltips: full precision (`$1,234,567.89`)
 */

const DEFAULT_LOCALE = 'en-US';

export type CurrencyStyle = 'full' | 'compact';

export function formatCurrency(
  value: number,
  currency = 'USD',
  style: CurrencyStyle = 'full',
  locale = DEFAULT_LOCALE,
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    ...(style === 'compact'
      ? { notation: 'compact', maximumFractionDigits: 1 }
      : { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  }).format(value);
}

export function formatNumber(value: number, locale = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(locale).format(value);
}

/** Utilization-style percentage: whole numbers (`73%`). Input is 0–100. */
export function formatPercent(value: number, locale = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(
    value / 100,
  );
}

/** Change percentage: signed, one decimal (`+12.4%`, `−3.0%`). Input is 0–100 scale. */
export function formatPercentChange(value: number, locale = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    signDisplay: 'exceptZero',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
}

export type CostDirection = 'increase' | 'decrease' | 'flat';

/**
 * Cost direction semantics (DESIGN.md §5.2): an increase is bad (error),
 * a decrease is good (success). UI must also show an arrow and sign.
 */
export function costDirection(delta: number): CostDirection {
  if (delta > 0) return 'increase';
  if (delta < 0) return 'decrease';
  return 'flat';
}

/** `2026-10-09` → `Oct 9, 2026` (dates are UTC day keys). */
export function formatDate(day: string, locale = DEFAULT_LOCALE): string {
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${day}T00:00:00.000Z`));
}

/** Large counts for KPIs and axes: `1.2B`, `340M`, `12K`. */
export function formatCompactNumber(value: number, locale = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(
    value,
  );
}
