import { addDays, sameDayPreviousMonth, startOfMonth, type DayKey } from './dates';
import { FORECAST_TRAILING_DAYS, monthEndForecast, percentChange } from './forecast';
import { inScope, type Scope } from './scope';
import type { MockDataset } from './source';

export type BudgetStatus = 'On track' | 'At risk' | 'Over budget';

/** Forecast ≥ this % of budget is "At risk" (PRODUCT.md §4.1 threshold alerts). */
export const AT_RISK_THRESHOLD = 90;

export interface BudgetRow {
  applicationId: string;
  application: string;
  lob: string;
  provider: string;
  budget: number;
  mtd: number;
  forecast: number;
  lastMonth: number;
  /** forecast − budget (positive = over). */
  variance: number;
  /** forecast ÷ budget × 100. */
  forecastPercent: number;
  /** mtd ÷ budget × 100. */
  consumedPercent: number;
  status: BudgetStatus;
}

export interface BudgetMonth {
  month: string;
  /** e.g. "Oct 2026". */
  label: string;
  actual: number;
  budget: number;
  isForecast: boolean;
}

export interface BudgetsData {
  asOf: DayKey;
  currency: string;
  partialScope: boolean;
  totals: {
    budget: number;
    mtd: number;
    forecast: number;
    variance: number;
    variancePercent: number | null;
    counts: Record<BudgetStatus, number>;
  };
  rows: BudgetRow[];
  history: BudgetMonth[];
}

export function budgetStatus(forecastPercent: number): BudgetStatus {
  if (forecastPercent > 100) return 'Over budget';
  if (forecastPercent >= AT_RISK_THRESHOLD) return 'At risk';
  return 'On track';
}

const monthLabel = (month: string) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${month}-01T00:00:00Z`),
  );

/**
 * Budget vs. actual for every application in scope. Budgets are monthly and set per
 * application across all environments; with an environment/account filter only that
 * slice of spend is compared, which `partialScope` flags.
 */
export function computeBudgets(ds: MockDataset, scope: Scope, historyMonths = 6): BudgetsData {
  const asOf = ds.costs.at(-1)?.ChargePeriodStart.slice(0, 10) ?? scope.dateRange.end;
  const accounts = ds.accounts.filter((a) => inScope({ ...a, accountId: a.id }, scope));
  const accountApp = new Map(accounts.map((a) => [a.id, a.applicationId]));
  const appIds = [...new Set(accounts.map((a) => a.applicationId))];
  const lobName = new Map(ds.lobs.map((l) => [l.id, l.name]));

  const monthStart = startOfMonth(asOf);
  const prevMonthStart = startOfMonth(sameDayPreviousMonth(asOf));
  const trailingStart = addDays(asOf, -(FORECAST_TRAILING_DAYS - 1));
  const currentMonth = asOf.slice(0, 7);

  const mtd = new Map<string, number>();
  const trailing = new Map<string, number>();
  const lastMonth = new Map<string, number>();
  const monthly = new Map<string, number>();

  for (const c of ds.costs) {
    const app = accountApp.get(c.BillingAccountId);
    if (!app) continue;
    const day = c.ChargePeriodStart.slice(0, 10);
    const cost = c.BilledCost;
    const month = day.slice(0, 7);
    monthly.set(month, (monthly.get(month) ?? 0) + cost);
    if (day >= monthStart) mtd.set(app, (mtd.get(app) ?? 0) + cost);
    else if (day >= prevMonthStart) lastMonth.set(app, (lastMonth.get(app) ?? 0) + cost);
    if (day >= trailingStart) trailing.set(app, (trailing.get(app) ?? 0) + cost);
  }

  const rows: BudgetRow[] = appIds
    .map((id) => {
      const app = ds.applications.find((a) => a.id === id);
      const budget = app?.monthlyBudget ?? 0;
      const m = mtd.get(id) ?? 0;
      const forecast = monthEndForecast(m, trailing.get(id) ?? 0, asOf);
      const forecastPercent = budget === 0 ? 0 : (forecast / budget) * 100;
      return {
        applicationId: id,
        application: app?.name ?? id,
        lob: lobName.get(app?.lobId ?? '') ?? '',
        provider: app?.provider ?? '',
        budget,
        mtd: m,
        forecast,
        lastMonth: lastMonth.get(id) ?? 0,
        variance: forecast - budget,
        forecastPercent,
        consumedPercent: budget === 0 ? 0 : (m / budget) * 100,
        status: budgetStatus(forecastPercent),
      };
    })
    .sort((a, b) => b.forecastPercent - a.forecastPercent);

  const budget = rows.reduce((s, r) => s + r.budget, 0);
  const forecast = rows.reduce((s, r) => s + r.forecast, 0);
  const counts: Record<BudgetStatus, number> = { 'On track': 0, 'At risk': 0, 'Over budget': 0 };
  for (const r of rows) counts[r.status] += 1;

  // History: last N full months of actuals plus the current month's forecast.
  const months = [...monthly.keys()]
    .filter((m) => m < currentMonth)
    .sort()
    .slice(-historyMonths);
  const history: BudgetMonth[] = [
    ...months.map((m) => ({
      month: m,
      label: monthLabel(m),
      actual: monthly.get(m) ?? 0,
      budget,
      isForecast: false,
    })),
    {
      month: currentMonth,
      label: `${monthLabel(currentMonth)} (forecast)`,
      actual: forecast,
      budget,
      isForecast: true,
    },
  ];

  return {
    asOf,
    currency: ds.costs[0]?.BillingCurrency ?? 'USD',
    partialScope: scope.environments.length > 0 || scope.accountIds.length > 0,
    totals: {
      budget,
      mtd: rows.reduce((s, r) => s + r.mtd, 0),
      forecast,
      variance: forecast - budget,
      variancePercent: percentChange(forecast, budget),
      counts,
    },
    rows,
    history,
  };
}
