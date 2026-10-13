import type { AnomalySeverity, Environment } from '@cloudcompass/types';
import { addDays, daysBetween, sameDayPreviousMonth, startOfMonth, type DayKey } from './dates';
import { FORECAST_TRAILING_DAYS, monthEndForecast, percentChange as pct } from './forecast';
import { inScope, type Scope } from './scope';
import type { MockDataset } from './source';

export interface Kpi {
  value: number;
  /** Comparison value, e.g. the same period last month. */
  previous: number;
  /** (value − previous) ÷ previous × 100; null when previous is 0. */
  changePercent: number | null;
}

export interface TopMover {
  applicationId: string;
  application: string;
  lob: string;
  previous: number;
  current: number;
  change: number;
  changePercent: number | null;
}

export interface OverviewData {
  asOf: DayKey;
  currency: string;
  mtd: Kpi;
  forecast: Kpi;
  budget: {
    budget: number;
    forecast: number;
    /** forecast − budget (positive = over budget). */
    variance: number;
    variancePercent: number | null;
    /** Budgets are set per application across all environments. */
    partialScope: boolean;
  };
  savings: { realizedMonthly: number; openMonthly: number; implementedCount: number };
  anomalies: { open: number; bySeverity: Record<AnomalySeverity, number> };
  period: { start: DayKey; end: DayKey; total: number; previousTotal: number };
  dailyByEnvironment: { group: Environment; date: DayKey; value: number }[];
  spendByLob: { group: string; value: number }[];
  topMovers: TopMover[];
}

const ENVIRONMENT_ORDER: readonly Environment[] = ['PROD', 'TEST', 'DEV'];

/**
 * Compute everything the Executive Overview needs in one pass over the cost data.
 * Pure function — unit tested without React.
 */
export function computeOverview(ds: MockDataset, scope: Scope, topMoverCount = 10): OverviewData {
  const asOf = ds.costs.at(-1)?.ChargePeriodStart.slice(0, 10) ?? scope.dateRange.end;
  const currency = ds.costs[0]?.BillingCurrency ?? 'USD';

  // Every hierarchy level hangs off the account, so scope resolves to a set of accounts.
  const accounts = ds.accounts.filter((a) => inScope({ ...a, accountId: a.id }, scope));
  const accountIds = new Set(accounts.map((a) => a.id));
  const lobName = new Map(ds.lobs.map((l) => [l.id, l.name]));
  const appById = new Map(ds.applications.map((a) => [a.id, a]));

  // Windows
  const monthStart = startOfMonth(asOf);
  const prevMonthSameDay = sameDayPreviousMonth(asOf);
  const prevMonthStart = startOfMonth(prevMonthSameDay);
  const prevMonthEnd = addDays(monthStart, -1);
  const trailingStart = addDays(asOf, -(FORECAST_TRAILING_DAYS - 1));
  const { start, end } = scope.dateRange;
  const periodDays = daysBetween(start, end);
  const prevStart = addDays(start, -periodDays);
  const prevEnd = addDays(start, -1);

  let mtd = 0;
  let mtdPrev = 0;
  let prevMonthTotal = 0;
  let trailing = 0;
  let periodTotal = 0;
  let previousTotal = 0;
  const daily = new Map<string, number>();
  const byLob = new Map<string, number>();
  const appCurrent = new Map<string, number>();
  const appPrevious = new Map<string, number>();

  for (const c of ds.costs) {
    if (!accountIds.has(c.BillingAccountId)) continue;
    const day = c.ChargePeriodStart.slice(0, 10);
    const cost = c.BilledCost;
    if (day >= monthStart && day <= asOf) mtd += cost;
    if (day >= prevMonthStart && day <= prevMonthEnd) {
      prevMonthTotal += cost;
      if (day <= prevMonthSameDay) mtdPrev += cost;
    }
    if (day >= trailingStart && day <= asOf) trailing += cost;

    const app = c.Tags.application ?? '';
    if (day >= start && day <= end) {
      periodTotal += cost;
      const env = (c.Tags.env ?? 'PROD') as Environment;
      const key = `${env}|${day}`;
      daily.set(key, (daily.get(key) ?? 0) + cost);
      const lob = c.Tags.lob ?? '';
      byLob.set(lob, (byLob.get(lob) ?? 0) + cost);
      appCurrent.set(app, (appCurrent.get(app) ?? 0) + cost);
    } else if (day >= prevStart && day <= prevEnd) {
      previousTotal += cost;
      appPrevious.set(app, (appPrevious.get(app) ?? 0) + cost);
    }
  }

  // Forecast: month-to-date plus the trailing 7-day run-rate for the rest of the month.
  const forecast = monthEndForecast(mtd, trailing, asOf);

  const appIds = new Set(accounts.map((a) => a.applicationId));
  const budget = [...appIds].reduce((sum, id) => sum + (appById.get(id)?.monthlyBudget ?? 0), 0);
  const partialScope = scope.environments.length > 0 || scope.accountIds.length > 0;

  const scopedRecs = ds.recommendations.filter((r) => accountIds.has(r.accountId));
  const implemented = scopedRecs.filter((r) => r.status === 'Implemented');
  const openAnomalies = ds.anomalies.filter(
    (a) => accountIds.has(a.accountId) && (a.status === 'Open' || a.status === 'Acknowledged'),
  );
  const bySeverity: Record<AnomalySeverity, number> = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  for (const a of openAnomalies) bySeverity[a.severity] += 1;

  const topMovers: TopMover[] = [...appIds]
    .map((id) => {
      const current = appCurrent.get(id) ?? 0;
      const previous = appPrevious.get(id) ?? 0;
      const app = appById.get(id);
      return {
        applicationId: id,
        application: app?.name ?? id,
        lob: lobName.get(app?.lobId ?? '') ?? '',
        previous,
        current,
        change: current - previous,
        changePercent: pct(current, previous),
      };
    })
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
    .slice(0, topMoverCount);

  const dailyByEnvironment = ENVIRONMENT_ORDER.flatMap((env) => {
    const rows: OverviewData['dailyByEnvironment'] = [];
    for (let day = start; day <= end; day = addDays(day, 1)) {
      const value = daily.get(`${env}|${day}`);
      if (value !== undefined)
        rows.push({ group: env, date: day, value: Math.round(value * 100) / 100 });
    }
    return rows;
  });

  return {
    asOf,
    currency,
    mtd: { value: mtd, previous: mtdPrev, changePercent: pct(mtd, mtdPrev) },
    forecast: {
      value: forecast,
      previous: prevMonthTotal,
      changePercent: pct(forecast, prevMonthTotal),
    },
    budget: {
      budget,
      forecast,
      variance: forecast - budget,
      variancePercent: pct(forecast, budget),
      partialScope,
    },
    savings: {
      realizedMonthly: implemented.reduce((s, r) => s + (r.realizedMonthlySavings ?? 0), 0),
      openMonthly: scopedRecs
        .filter((r) => r.status === 'Open')
        .reduce((s, r) => s + r.estimatedMonthlySavings, 0),
      implementedCount: implemented.length,
    },
    anomalies: { open: openAnomalies.length, bySeverity },
    period: { start, end, total: periodTotal, previousTotal },
    dailyByEnvironment,
    spendByLob: [...byLob.entries()]
      .map(([id, value]) => ({ group: lobName.get(id) ?? id, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value),
    topMovers,
  };
}
