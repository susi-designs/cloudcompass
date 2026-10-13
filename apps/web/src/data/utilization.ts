import type { CloudProvider, Commitment, Environment, IdleReason } from '@cloudcompass/types';
import { addDays, daysBetween, fromDayKey, type DayKey } from './dates';
import { inScope, type Scope } from './scope';
import type { MockDataset } from './source';

/** CPU below this (and not idle) counts as under-utilized → rightsizing candidate. */
export const UNDERUTILIZED_CPU = 30;
/** CPU above this counts as hot (risk of saturation). */
export const HOT_CPU = 80;
/** Share of an under-utilized resource's cost typically saved by rightsizing one size down. */
export const RIGHTSIZE_SAVINGS_SHARE = 0.4;
/** Heatmaps switch from daily to weekly columns beyond this many days. */
export const HEATMAP_DAILY_MAX_DAYS = 45;

export type ResourceStatus = 'Idle' | 'Underutilized' | 'Healthy' | 'Hot' | 'Not measured';

export interface ResourceRow {
  resourceId: string;
  resourceName: string;
  resourceType: string;
  provider: CloudProvider;
  lob: string;
  application: string;
  applicationId: string;
  environment: Environment;
  accountId: string;
  region: string;
  /** null for storage / networking, where CPU isn't meaningful. */
  avgCpuPercent: number | null;
  avgMemoryPercent: number | null;
  monthlyCost: number;
  idleReason: IdleReason | null;
  status: ResourceStatus;
  estimatedMonthlySavings: number;
}

export interface CommitmentRow extends Commitment {
  daysToExpiry: number;
}

export interface UtilizationData {
  asOf: DayKey;
  currency: string;
  kpis: {
    avgCpu: number | null;
    avgMemory: number | null;
    measuredCount: number;
    idleCount: number;
    idleMonthlyCost: number;
    underutilizedCount: number;
    underutilizedSavings: number;
    /** Committed ÷ commitment-eligible billed cost in the selected period, 0–100. */
    commitmentCoverage: number | null;
  };
  /** Resources by CPU band (0–10 %, 10–20 %, …). */
  distribution: { group: string; value: number }[];
  /** Rows × time-column average CPU. */
  timeHeatmap: { row: string; column: string; value: number }[];
  timeHeatmapRowLabel: 'Application' | 'Resource';
  timeHeatmapColumns: string[];
  timeHeatmapGranularity: 'day' | 'week';
  /** Weekday × hour average CPU. */
  hourHeatmap: { day: string; hour: string; value: number }[];
  resources: ResourceRow[];
  commitments: CommitmentRow[];
}

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export const HOURS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`);

export function resourceStatus(
  avgCpu: number | null,
  idleReason: IdleReason | null,
): ResourceStatus {
  if (idleReason) return 'Idle';
  if (avgCpu == null) return 'Not measured';
  if (avgCpu < UNDERUTILIZED_CPU) return 'Underutilized';
  if (avgCpu > HOT_CPU) return 'Hot';
  return 'Healthy';
}

const shortDate = (day: DayKey) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(
    fromDayKey(day),
  );

const round1 = (v: number) => Math.round(v * 10) / 10;

export function computeUtilization(ds: MockDataset, scope: Scope): UtilizationData {
  const asOf = ds.costs.at(-1)?.ChargePeriodStart.slice(0, 10) ?? scope.dateRange.end;
  const lobName = new Map(ds.lobs.map((l) => [l.id, l.name]));
  const appName = new Map(ds.applications.map((a) => [a.id, a.name]));

  const resources: ResourceRow[] = ds.utilization
    .filter((u) => inScope(u, scope))
    .map((u) => {
      const measured = u.avgCpuPercent > 0;
      const avgCpu = measured ? u.avgCpuPercent : null;
      const status = resourceStatus(avgCpu, u.idleReason);
      return {
        resourceId: u.resourceId,
        resourceName: u.resourceName,
        resourceType: u.resourceType,
        provider: u.provider,
        lob: lobName.get(u.lobId) ?? u.lobId,
        application: appName.get(u.applicationId) ?? u.applicationId,
        applicationId: u.applicationId,
        environment: u.environment,
        accountId: u.accountId,
        region: u.region,
        avgCpuPercent: avgCpu,
        avgMemoryPercent: measured ? u.avgMemoryPercent : null,
        monthlyCost: u.monthlyCost,
        idleReason: u.idleReason,
        status,
        estimatedMonthlySavings:
          status === 'Idle'
            ? u.monthlyCost
            : status === 'Underutilized'
              ? u.monthlyCost * RIGHTSIZE_SAVINGS_SHARE
              : 0,
      };
    });

  const measured = resources.filter((r) => r.avgCpuPercent != null);
  const measuredIds = new Set(measured.map((r) => r.resourceId));
  const costWeighted = (pick: (r: ResourceRow) => number | null): number | null => {
    const weight = measured.reduce((s, r) => s + r.monthlyCost, 0);
    if (weight === 0) return null;
    return measured.reduce((s, r) => s + (pick(r) ?? 0) * r.monthlyCost, 0) / weight;
  };
  const idle = resources.filter((r) => r.status === 'Idle');
  const under = resources.filter((r) => r.status === 'Underutilized');

  // Commitment coverage for the scope, from cost records in the selected period.
  const accountIds = new Set(
    ds.accounts.filter((a) => inScope({ ...a, accountId: a.id }, scope)).map((a) => a.id),
  );
  const { start, end } = scope.dateRange;
  const committableServices = new Set(
    ds.costs.filter((c) => c.PricingCategory === 'Committed').map((c) => c.ServiceName),
  );
  let eligible = 0;
  let committed = 0;
  for (const c of ds.costs) {
    if (!accountIds.has(c.BillingAccountId) || !committableServices.has(c.ServiceName)) continue;
    const day = c.ChargePeriodStart.slice(0, 10);
    if (day < start || day > end) continue;
    eligible += c.BilledCost;
    if (c.PricingCategory === 'Committed') committed += c.BilledCost;
  }

  // CPU distribution in 10-point bands.
  const bands = Array.from({ length: 10 }, (_, i) => ({
    group: `${i * 10}–${i * 10 + 10}%`,
    value: 0,
  }));
  for (const r of measured) {
    const band = bands[Math.min(9, Math.floor((r.avgCpuPercent ?? 0) / 10))];
    if (band) band.value += 1;
  }

  // Time heatmap: applications (or one application's resources) × days / weeks.
  const days = daysBetween(start, end);
  const granularity: 'day' | 'week' = days > HEATMAP_DAILY_MAX_DAYS ? 'week' : 'day';
  const columnFor = (day: DayKey): DayKey => {
    if (granularity === 'day') return day;
    const offset = daysBetween(start, day) - 1;
    return addDays(start, offset - (offset % 7));
  };
  const singleApp = scope.applicationIds.length === 1;
  const rowFor = new Map(
    measured.map((r) => [r.resourceId, singleApp ? r.resourceName : r.application]),
  );
  const cells = new Map<string, { sum: number; n: number }>();
  const columns = new Set<DayKey>();
  for (const s of ds.utilizationSamples) {
    if (!measuredIds.has(s.resourceId) || s.date < start || s.date > end) continue;
    const col = columnFor(s.date);
    columns.add(col);
    const key = `${rowFor.get(s.resourceId)}|${col}`;
    const cell = cells.get(key) ?? { sum: 0, n: 0 };
    cell.sum += s.cpuPercent;
    cell.n += 1;
    cells.set(key, cell);
  }
  const sortedColumns = [...columns].sort();
  const columnLabel = (c: DayKey) => (granularity === 'week' ? `Wk ${shortDate(c)}` : shortDate(c));
  const timeHeatmap = [...cells.entries()].map(([key, { sum, n }]) => {
    const [row = '', col = ''] = key.split('|');
    return { row, column: columnLabel(col), value: round1(sum / n) };
  });

  // Hour-of-week heatmap: mean profile across measured resources in scope.
  const profiles = ds.utilizationHourly.filter((h) => measuredIds.has(h.resourceId));
  const hourHeatmap: UtilizationData['hourHeatmap'] = [];
  if (profiles.length > 0) {
    for (let h = 0; h < 168; h += 1) {
      const mean = profiles.reduce((s, p) => s + (p.cpuByHourOfWeek[h] ?? 0), 0) / profiles.length;
      hourHeatmap.push({
        day: WEEKDAYS[Math.floor(h / 24)] ?? '',
        hour: HOURS[h % 24] ?? '',
        value: round1(mean),
      });
    }
  }

  // Commitments are bought per cloud; show those for clouds in scope.
  const providers = new Set(resources.map((r) => r.provider));
  const asOfDate = fromDayKey(asOf).getTime();
  const commitments = ds.commitments
    .filter((c) => providers.has(c.provider))
    .map((c) => ({
      ...c,
      daysToExpiry: Math.round((new Date(c.expiresAt).getTime() - asOfDate) / 86_400_000),
    }))
    .sort((a, b) => a.utilizationPercent - b.utilizationPercent);

  return {
    asOf,
    currency: ds.costs[0]?.BillingCurrency ?? 'USD',
    kpis: {
      avgCpu: costWeighted((r) => r.avgCpuPercent),
      avgMemory: costWeighted((r) => r.avgMemoryPercent),
      measuredCount: measured.length,
      idleCount: idle.length,
      idleMonthlyCost: idle.reduce((s, r) => s + r.monthlyCost, 0),
      underutilizedCount: under.length,
      underutilizedSavings: under.reduce((s, r) => s + r.estimatedMonthlySavings, 0),
      commitmentCoverage: eligible === 0 ? null : (committed / eligible) * 100,
    },
    distribution: bands,
    timeHeatmap,
    timeHeatmapRowLabel: singleApp ? 'Resource' : 'Application',
    timeHeatmapColumns: sortedColumns.map(columnLabel),
    timeHeatmapGranularity: granularity,
    hourHeatmap,
    resources,
    commitments,
  };
}
