import type { BillingAccount, FocusCostRecord } from '@cloudcompass/types';
import { addDays, daysBetween, fromDayKey, type DayKey } from './dates';
import { percentChange } from './forecast';
import { inScope, type Scope, type ScopeDimensions } from './scope';
import type { MockDataset } from './source';

export const GROUP_BY_OPTIONS = [
  { id: 'lob', label: 'Line of business' },
  { id: 'application', label: 'Application' },
  { id: 'environment', label: 'Environment' },
  { id: 'account', label: 'Account' },
  { id: 'provider', label: 'Cloud' },
  { id: 'serviceCategory', label: 'Service category' },
  { id: 'service', label: 'Service' },
  { id: 'region', label: 'Region' },
] as const;
export type GroupBy = (typeof GROUP_BY_OPTIONS)[number]['id'];

export const GRANULARITY_OPTIONS = [
  { id: 'day', label: 'Daily' },
  { id: 'week', label: 'Weekly' },
  { id: 'month', label: 'Monthly' },
] as const;
export type Granularity = (typeof GRANULARITY_OPTIONS)[number]['id'];

export const METRIC_OPTIONS = [
  { id: 'billed', label: 'Billed cost', help: 'What the invoice says.' },
  { id: 'effective', label: 'Effective cost', help: 'Amortized, after commitment discounts.' },
  { id: 'list', label: 'List cost', help: 'At public on-demand prices.' },
] as const;
export type Metric = (typeof METRIC_OPTIONS)[number]['id'];

export interface ExplorerSettings {
  groupBy: GroupBy;
  granularity: Granularity;
  metric: Metric;
}

export const DEFAULT_EXPLORER: ExplorerSettings = {
  groupBy: 'lob',
  granularity: 'week',
  metric: 'billed',
};

/** Drill path through the org hierarchy, then into services (CLAUDE.md §6 M2). */
export const DRILL_NEXT: Partial<Record<GroupBy, GroupBy>> = {
  lob: 'application',
  application: 'environment',
  environment: 'account',
  account: 'service',
};

export interface ExplorerRow {
  id: string;
  label: string;
  /** Extra identifier shown in its own column, e.g. the cloud account ID. */
  detail: string | null;
  total: number;
  previous: number;
  change: number;
  changePercent: number | null;
  /** Share of the period total, 0–100. */
  share: number;
}

export interface ExplorerData {
  currency: string;
  period: { start: DayKey; end: DayKey; days: number };
  totals: {
    total: number;
    previous: number;
    change: number;
    changePercent: number | null;
    dailyAverage: number;
    /** Billed − effective: what commitment discounts saved in the period. */
    commitmentSavings: number;
  };
  rows: ExplorerRow[];
  /** Chart rows: top series plus "Other", one value per time bucket. */
  series: { group: string; date: DayKey; key: string; value: number }[];
  /** Can rows be drilled into? Only along the org hierarchy. */
  drillTo: GroupBy | null;
}

export const OTHER_LABEL = 'Other';

const metricValue = (c: FocusCostRecord, metric: Metric): number =>
  metric === 'billed' ? c.BilledCost : metric === 'effective' ? c.EffectiveCost : c.ListCost;

/**
 * Start of the time bucket containing `day`. Weeks are 7-day blocks counted from the
 * period start (`anchor`), so the first week is never a stub; months are calendar months.
 */
export function bucketStart(day: DayKey, granularity: Granularity, anchor: DayKey): DayKey {
  if (granularity === 'day') return day;
  if (granularity === 'month') return `${day.slice(0, 7)}-01`;
  const offset = daysBetween(anchor, day) - 1;
  return addDays(anchor, offset - (offset % 7));
}

/** Axis / table label for a bucket. */
export function bucketLabel(bucket: DayKey, granularity: Granularity): string {
  const d = fromDayKey(bucket);
  const fmt = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('en-US', { ...opts, timeZone: 'UTC' }).format(d);
  if (granularity === 'month') return fmt({ month: 'short', year: 'numeric' });
  if (granularity === 'week') return `Week of ${fmt({ month: 'short', day: 'numeric' })}`;
  return fmt({ month: 'short', day: 'numeric' });
}

function groupKey(c: FocusCostRecord, groupBy: GroupBy, account: BillingAccount): string {
  switch (groupBy) {
    case 'lob':
      return account.lobId;
    case 'application':
      return account.applicationId;
    case 'environment':
      return account.environment;
    case 'account':
      return account.id;
    case 'provider':
      return c.ProviderName;
    case 'serviceCategory':
      return c.ServiceCategory;
    case 'service':
      return c.ServiceName;
    case 'region':
      return c.RegionId;
  }
}

export function computeExplorer(
  ds: MockDataset,
  scope: Scope,
  settings: ExplorerSettings,
  maxSeries = 8,
): ExplorerData {
  const { groupBy, granularity, metric } = settings;
  const accounts = ds.accounts.filter((a) => inScope({ ...a, accountId: a.id }, scope));
  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const lobName = new Map(ds.lobs.map((l) => [l.id, l.name]));
  const appName = new Map(ds.applications.map((a) => [a.id, a.name]));
  const allAccounts = new Map(ds.accounts.map((a) => [a.id, a]));

  const { start, end } = scope.dateRange;
  const days = daysBetween(start, end);
  const prevStart = addDays(start, -days);
  const prevEnd = addDays(start, -1);

  const totals = new Map<string, number>();
  const previous = new Map<string, number>();
  const regionNames = new Map<string, string>();
  const byBucket = new Map<string, Map<DayKey, number>>();
  let total = 0;
  let previousTotal = 0;
  let commitmentSavings = 0;

  for (const c of ds.costs) {
    const account = accountById.get(c.BillingAccountId);
    if (!account) continue;
    const day = c.ChargePeriodStart.slice(0, 10);
    const inPeriod = day >= start && day <= end;
    const inPrevious = !inPeriod && day >= prevStart && day <= prevEnd;
    if (!inPeriod && !inPrevious) continue;

    const key = groupKey(c, groupBy, account);
    const value = metricValue(c, metric);
    if (groupBy === 'region') regionNames.set(c.RegionId, c.RegionName);

    if (inPrevious) {
      previous.set(key, (previous.get(key) ?? 0) + value);
      previousTotal += value;
      continue;
    }
    total += value;
    commitmentSavings += c.BilledCost - c.EffectiveCost;
    totals.set(key, (totals.get(key) ?? 0) + value);
    const bucket = bucketStart(day, granularity, start);
    let buckets = byBucket.get(key);
    if (!buckets) {
      buckets = new Map();
      byBucket.set(key, buckets);
    }
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + value);
  }

  const labelFor = (key: string): { label: string; detail: string | null } => {
    switch (groupBy) {
      case 'lob':
        return { label: lobName.get(key) ?? key, detail: null };
      case 'application':
        return { label: appName.get(key) ?? key, detail: null };
      case 'account': {
        const a = allAccounts.get(key);
        return { label: a?.name ?? key, detail: key };
      }
      case 'region':
        return { label: regionNames.get(key) ?? key, detail: key };
      default:
        return { label: key, detail: null };
    }
  };

  const keys = new Set([...totals.keys(), ...previous.keys()]);
  const rows: ExplorerRow[] = [...keys]
    .map((id) => {
      const t = totals.get(id) ?? 0;
      const p = previous.get(id) ?? 0;
      return {
        id,
        ...labelFor(id),
        total: t,
        previous: p,
        change: t - p,
        changePercent: percentChange(t, p),
        share: total === 0 ? 0 : (t / total) * 100,
      };
    })
    .sort((a, b) => b.total - a.total);

  // Chart: top N series by total; the rest folded into "Other" so the palette stays readable.
  const top = rows.slice(0, maxSeries).filter((r) => r.total > 0);
  const topIds = new Set(top.map((r) => r.id));
  const bucketDays = new Set<DayKey>();
  for (let d = start; d <= end; d = addDays(d, 1))
    bucketDays.add(bucketStart(d, granularity, start));
  const sortedBuckets = [...bucketDays].sort();
  // Buckets cut off by the selected range are flagged so a short bar isn't read as a drop.
  const keyFor = (b: DayKey): string => {
    const label = bucketLabel(b, granularity);
    if (granularity === 'day') return label;
    const bucketEnd =
      granularity === 'week' ? addDays(b, 6) : addDays(`${addDays(b, 31).slice(0, 7)}-01`, -1);
    return b < start || bucketEnd > end ? `${label} (partial)` : label;
  };
  const series: ExplorerData['series'] = [];
  for (const r of top) {
    const buckets = byBucket.get(r.id);
    for (const b of sortedBuckets) {
      series.push({ group: r.label, date: b, key: keyFor(b), value: round2(buckets?.get(b) ?? 0) });
    }
  }
  const otherIds = rows.filter((r) => !topIds.has(r.id) && r.total > 0).map((r) => r.id);
  if (otherIds.length > 0) {
    for (const b of sortedBuckets) {
      const value = otherIds.reduce((s, id) => s + (byBucket.get(id)?.get(b) ?? 0), 0);
      series.push({ group: OTHER_LABEL, date: b, key: keyFor(b), value: round2(value) });
    }
  }

  return {
    currency: ds.costs[0]?.BillingCurrency ?? 'USD',
    period: { start, end, days },
    totals: {
      total,
      previous: previousTotal,
      change: total - previousTotal,
      changePercent: percentChange(total, previousTotal),
      dailyAverage: total / days,
      commitmentSavings,
    },
    rows,
    series,
    drillTo: DRILL_NEXT[groupBy] ?? null,
  };
}

const round2 = (v: number) => Math.round(v * 100) / 100;

/** Scope change for drilling into one row of the current grouping. */
export function drillScope(groupBy: GroupBy, rowId: string): Partial<ScopeDimensions> {
  switch (groupBy) {
    case 'lob':
      return { lobIds: [rowId], applicationIds: [], environments: [], accountIds: [] };
    case 'application':
      return { applicationIds: [rowId], environments: [], accountIds: [] };
    case 'environment':
      return { environments: [rowId as ScopeDimensions['environments'][number]], accountIds: [] };
    case 'account':
      return { accountIds: [rowId] };
    default:
      return {};
  }
}

export interface DrillCrumb {
  label: string;
  /** Scope to apply when the crumb is clicked (clears levels below it). */
  scope: Partial<ScopeDimensions>;
  /** Group-by to show after clicking it. */
  groupBy: GroupBy;
}

/** Breadcrumb for the current drill position, derived from single-value scope selections. */
export function drillCrumbs(ds: MockDataset, scope: ScopeDimensions): DrillCrumb[] {
  const crumbs: DrillCrumb[] = [
    {
      label: 'All',
      scope: { lobIds: [], applicationIds: [], environments: [], accountIds: [] },
      groupBy: 'lob',
    },
  ];
  const [lobId] = scope.lobIds;
  const [appId] = scope.applicationIds;
  const [env] = scope.environments;
  const [accountId] = scope.accountIds;
  if (scope.lobIds.length === 1 && lobId) {
    crumbs.push({
      label: ds.lobs.find((l) => l.id === lobId)?.name ?? lobId,
      scope: { lobIds: [lobId], applicationIds: [], environments: [], accountIds: [] },
      groupBy: 'application',
    });
  }
  if (scope.applicationIds.length === 1 && appId) {
    crumbs.push({
      label: ds.applications.find((a) => a.id === appId)?.name ?? appId,
      scope: { applicationIds: [appId], environments: [], accountIds: [] },
      groupBy: 'environment',
    });
  }
  if (scope.environments.length === 1 && env) {
    crumbs.push({ label: env, scope: { environments: [env], accountIds: [] }, groupBy: 'account' });
  }
  if (scope.accountIds.length === 1 && accountId) {
    crumbs.push({
      label: ds.accounts.find((a) => a.id === accountId)?.name ?? accountId,
      scope: { accountIds: [accountId] },
      groupBy: 'service',
    });
  }
  return crumbs;
}

/** CSV for the explorer table (raw numbers, no currency symbols, for spreadsheets). */
export function explorerCsv(data: ExplorerData, groupLabel: string): string {
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const header = [
    groupLabel,
    'ID',
    `Selected period (${data.currency})`,
    `Previous period (${data.currency})`,
    `Change (${data.currency})`,
    'Change %',
    'Share %',
  ];
  const lines = data.rows.map((r) =>
    [
      esc(r.label),
      esc(r.detail ?? ''),
      r.total.toFixed(2),
      r.previous.toFixed(2),
      r.change.toFixed(2),
      r.changePercent == null ? '' : r.changePercent.toFixed(1),
      r.share.toFixed(1),
    ].join(','),
  );
  return [header.join(','), ...lines].join('\n') + '\n';
}
