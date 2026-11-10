import type { Anomaly, Application, BillingAccount, Recommendation } from '@cloudcompass/types';
import { computeAiSpend, type AiSpendData } from './aiSpend';
import { computeAnomalies, type AnomaliesData } from './anomalies';
import { computeBudgets, type BudgetRow, type BudgetsData } from './budgets';
import { addDays, daysBetween } from './dates';
import { percentChange } from './forecast';
import {
  computeLedger,
  computeOptimization,
  type LedgerData,
  type OptimizationData,
} from './optimization';
import { computeOverview, type OverviewData } from './overview';
import { EMPTY_DIMENSIONS, inScope, type Scope } from './scope';
import type { MockDataset } from './source';
import { computeUtilization, type UtilizationData } from './utilization';

/** Sections of My CloudCompass, in their fixed tab order (PRODUCT.md §5.1). */
export const SECTION_IDS = ['cost', 'utilization', 'optimization', 'ai', 'anomalies'] as const;
export type SectionId = (typeof SECTION_IDS)[number];

export const SECTION_LABELS: Record<SectionId, string> = {
  cost: 'Cost & Usage',
  utilization: 'Utilization',
  ai: 'AI Spend',
  optimization: 'Optimization',
  anomalies: 'Anomalies',
};

/** Pillar page each section links to with "View in …". */
export const SECTION_PATHS: Record<SectionId, string> = {
  cost: '/cost-usage',
  utilization: '/utilization',
  ai: '/ai-spend',
  optimization: '/optimization',
  anomalies: '/anomalies',
};

export interface ServiceSpendRow {
  service: string;
  current: number;
  previous: number;
  change: number;
  changePercent: number | null;
}

export interface AppSnapshot {
  application: Application;
  lob: string;
  /** PROD, TEST, DEV order. */
  accounts: BillingAccount[];
  /** The scope every pillar calculation used: this application + page date range / environments. */
  scope: Scope;
  overview: OverviewData;
  budgets: BudgetsData;
  /** This application's budget row (budgets cover all environments). */
  budget: BudgetRow | undefined;
  topServices: ServiceSpendRow[];
  utilization: UtilizationData;
  aiSpend: AiSpendData;
  optimization: OptimizationData;
  ledger: LedgerData;
  anomalies: AnomaliesData;
  /** Anomalies resolved in the last 30 days of data. */
  resolvedLast30Days: number;
}

const ENV_ORDER = ['PROD', 'TEST', 'DEV'] as const;

/**
 * The scope My CloudCompass uses for an application: the page's date range and environment
 * filter, with the rest of the hierarchy fixed by the application.
 */
export function appScope(applicationId: string, page: Scope): Scope {
  return {
    ...EMPTY_DIMENSIONS,
    dateRange: page.dateRange,
    environments: page.environments,
    applicationIds: [applicationId],
  };
}

/** Spend by service in the date range vs. the previous period of the same length. */
export function topServices(ds: MockDataset, scope: Scope, count = 5): ServiceSpendRow[] {
  const accountIds = new Set(
    ds.accounts.filter((a) => inScope({ ...a, accountId: a.id }, scope)).map((a) => a.id),
  );
  const { start, end } = scope.dateRange;
  const days = daysBetween(start, end);
  const prevStart = addDays(start, -days);
  const prevEnd = addDays(start, -1);
  const current = new Map<string, number>();
  const previous = new Map<string, number>();
  for (const c of ds.costs) {
    if (!accountIds.has(c.BillingAccountId)) continue;
    const day = c.ChargePeriodStart.slice(0, 10);
    if (day >= start && day <= end)
      current.set(c.ServiceName, (current.get(c.ServiceName) ?? 0) + c.BilledCost);
    else if (day >= prevStart && day <= prevEnd)
      previous.set(c.ServiceName, (previous.get(c.ServiceName) ?? 0) + c.BilledCost);
  }
  return [...current.entries()]
    .map(([service, value]) => {
      const prev = previous.get(service) ?? 0;
      return {
        service,
        current: value,
        previous: prev,
        change: value - prev,
        changePercent: percentChange(value, prev),
      };
    })
    .sort((a, b) => b.current - a.current)
    .slice(0, count);
}

/**
 * Everything My CloudCompass shows for one application, computed with the same functions the
 * pillar pages use so the numbers always match (PRODUCT.md §5.1).
 * `recommendations` and `anomalies` must already include this browser's workflow changes.
 */
export function computeAppSnapshot(
  ds: MockDataset,
  recommendations: readonly Recommendation[],
  anomalies: readonly Anomaly[],
  applicationId: string,
  page: Scope,
): AppSnapshot | undefined {
  const application = ds.applications.find((a) => a.id === applicationId);
  if (!application) return undefined;
  const scope = appScope(applicationId, page);
  const effective = { ...ds, recommendations: [...recommendations], anomalies: [...anomalies] };
  const budgets = computeBudgets(ds, scope);
  const anomalyData = computeAnomalies(ds, anomalies, scope);
  const asOf = anomalyData.asOf;
  const recentStart = addDays(asOf, -29);

  return {
    application,
    lob: ds.lobs.find((l) => l.id === application.lobId)?.name ?? application.lobId,
    accounts: ENV_ORDER.flatMap((env) =>
      ds.accounts.filter((a) => a.applicationId === applicationId && a.environment === env),
    ),
    scope,
    overview: computeOverview(effective, scope),
    budgets,
    budget: budgets.rows.find((r) => r.applicationId === applicationId),
    topServices: topServices(ds, scope),
    utilization: computeUtilization(ds, scope),
    aiSpend: computeAiSpend(ds, scope),
    optimization: computeOptimization(ds, recommendations, scope),
    ledger: computeLedger(ds, recommendations, scope),
    anomalies: anomalyData,
    resolvedLast30Days: anomalies.filter(
      (a) =>
        a.applicationId === applicationId &&
        inScope(a, scope) &&
        a.status === 'Resolved' &&
        a.resolvedAt !== null &&
        a.resolvedAt.slice(0, 10) >= recentStart,
    ).length,
  };
}
