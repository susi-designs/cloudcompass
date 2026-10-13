import type {
  Anomaly,
  AnomalyExpectedReason,
  AnomalySeverity,
  AnomalyStatus,
  AnomalyUsageDriver,
  CloudProvider,
  Environment,
} from '@cloudcompass/types';
import { addDays, daysBetween, type DayKey } from './dates';
import { DATA_END, inScope, type Scope } from './scope';
import type { MockDataset } from './source';

export const SEVERITIES: readonly AnomalySeverity[] = ['Critical', 'High', 'Medium', 'Low'];

export const ANOMALY_STATUSES: readonly AnomalyStatus[] = [
  'Open',
  'Acknowledged',
  'Expected',
  'Resolved',
];

/** Statuses that still need someone to act. */
export const NEEDS_TRIAGE: readonly AnomalyStatus[] = ['Open', 'Acknowledged'];

export const EXPECTED_REASONS: readonly AnomalyExpectedReason[] = [
  'Planned launch or migration',
  'Seasonal or business peak',
  'Load or performance test',
  'Known pricing change',
];

/** Product target for mean time to resolve (PRODUCT.md §7). */
export const MTTR_TARGET_DAYS = 3;

/** Days of history shown either side of an anomaly in the detail chart. */
export const DETAIL_CONTEXT_DAYS = 14;

const SEVERITY_RANK: Record<AnomalySeverity, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };

export function severityRank(severity: AnomalySeverity): number {
  return SEVERITY_RANK[severity];
}

export type AlertChannel = 'Email' | 'Slack' | 'Webhook';

/**
 * Alert routing by severity. Until the API exists this is a fixed rule; routing settings
 * (channels per team, webhooks) come with the API.
 */
export function alertChannels(severity: AnomalySeverity): AlertChannel[] {
  if (severity === 'Critical') return ['Email', 'Slack', 'Webhook'];
  if (severity === 'High') return ['Email', 'Slack'];
  return ['Email'];
}

/* ------------------------------------------------------------------ */
/* Triage: acknowledge → mark expected / resolve → reopen              */
/* ------------------------------------------------------------------ */

export type TriageAction =
  | { type: 'acknowledge' }
  | { type: 'expect'; reason: AnomalyExpectedReason }
  | { type: 'resolve'; note: string | null }
  | { type: 'reopen' };

export type TriageActionType = TriageAction['type'];

const ALLOWED_FROM: Record<TriageActionType, readonly AnomalyStatus[]> = {
  acknowledge: ['Open'],
  expect: ['Open', 'Acknowledged'],
  resolve: ['Open', 'Acknowledged'],
  reopen: ['Expected', 'Resolved'],
};

export function canTriage(action: TriageActionType, status: AnomalyStatus): boolean {
  return ALLOWED_FROM[action].includes(status);
}

/** Fields a triage action can change; stored per anomaly id. */
export type AnomalyOverride = Partial<
  Pick<Anomaly, 'status' | 'acknowledgedAt' | 'resolvedAt' | 'expectedReason' | 'resolutionNote'>
>;

export type AnomalyOverrideMap = Record<string, AnomalyOverride>;

const isoDay = (day: DayKey) => `${day}T00:00:00.000Z`;

/**
 * The change a triage action makes, or null if the anomaly's status doesn't allow it.
 * `today` is the data's "as of" day so time-to-resolve stays consistent.
 */
export function triageChanges(
  anomaly: Anomaly,
  action: TriageAction,
  today: DayKey = DATA_END,
): AnomalyOverride | null {
  if (!canTriage(action.type, anomaly.status)) return null;
  const acknowledgedAt = anomaly.acknowledgedAt ?? isoDay(today);
  switch (action.type) {
    case 'acknowledge':
      return { status: 'Acknowledged', acknowledgedAt };
    case 'expect':
      return {
        status: 'Expected',
        acknowledgedAt,
        resolvedAt: isoDay(today),
        expectedReason: action.reason,
        resolutionNote: null,
      };
    case 'resolve':
      return {
        status: 'Resolved',
        acknowledgedAt,
        resolvedAt: isoDay(today),
        expectedReason: null,
        resolutionNote: action.note?.trim() || null,
      };
    case 'reopen':
      return {
        status: 'Open',
        acknowledgedAt: null,
        resolvedAt: null,
        expectedReason: null,
        resolutionNote: null,
      };
  }
}

/** Apply a triage action to many anomalies; returns the new override map and what changed. */
export function applyTriage(
  anomalies: readonly Anomaly[],
  overrides: AnomalyOverrideMap,
  ids: readonly string[],
  action: TriageAction,
  today: DayKey = DATA_END,
): { overrides: AnomalyOverrideMap; updated: number; skipped: number } {
  const byId = new Map(anomalies.map((a) => [a.id, a]));
  const next: AnomalyOverrideMap = { ...overrides };
  let updated = 0;
  let skipped = 0;
  for (const id of ids) {
    const anomaly = byId.get(id);
    const changes = anomaly ? triageChanges(anomaly, action, today) : null;
    if (!changes) {
      skipped += 1;
      continue;
    }
    next[id] = { ...next[id], ...changes };
    updated += 1;
  }
  return { overrides: next, updated, skipped };
}

export function applyAnomalyOverrides(
  anomalies: readonly Anomaly[],
  overrides: AnomalyOverrideMap,
): Anomaly[] {
  return anomalies.map((a) => {
    const o = overrides[a.id];
    return o ? { ...a, ...o } : a;
  });
}

/* ------------------------------------------------------------------ */
/* Feed                                                                */
/* ------------------------------------------------------------------ */

export interface AnomalyRow {
  id: string;
  detectedAt: DayKey;
  endedAt: DayKey;
  durationDays: number;
  severity: AnomalySeverity;
  status: AnomalyStatus;
  service: string;
  provider: CloudProvider;
  applicationId: string;
  application: string;
  lob: string;
  environment: Environment;
  accountId: string;
  accountName: string;
  resourceId: string;
  resourceName: string;
  region: string;
  regionName: string;
  expectedCost: number;
  actualCost: number;
  impact: number;
  impactPercent: number;
  rootCauseHint: string;
  usageDrivers: AnomalyUsageDriver[];
  owner: string;
  alertChannels: AlertChannel[];
  acknowledgedAt: DayKey | null;
  resolvedAt: DayKey | null;
  expectedReason: AnomalyExpectedReason | null;
  resolutionNote: string | null;
}

export interface TimelinePoint {
  id: string;
  date: DayKey;
  severity: AnomalySeverity;
  impact: number;
  label: string;
}

export interface ImpactGroup {
  label: string;
  count: number;
  impact: number;
}

export interface AnomaliesData {
  asOf: DayKey;
  currency: string;
  start: DayKey;
  end: DayKey;
  /** Anomalies detected in the date range, plus any still needing triage. Newest first. */
  rows: AnomalyRow[];
  counts: Record<AnomalyStatus, number>;
  kpis: {
    /** Open + acknowledged, in scope, whatever the date range. */
    needsTriage: number;
    unacknowledged: number;
    needsTriageBySeverity: Record<AnomalySeverity, number>;
    needsTriageImpact: number;
    detected: number;
    /** Impact of anomalies detected in range that weren't marked expected. */
    unexpectedImpact: number;
    expectedCount: number;
    /** Mean days from detection to resolution, for anomalies resolved in range. */
    mttrDays: number | null;
    resolvedCount: number;
    /** Mean days from detection to acknowledgement. */
    mttaDays: number | null;
  };
  /** Anomalies detected in range, oldest first. */
  timeline: TimelinePoint[];
  /** Unexpected impact in range by service, largest first. */
  impactByService: ImpactGroup[];
}

const day = (iso: string | null): DayKey | null => (iso ? iso.slice(0, 10) : null);

const mean = (values: number[]) =>
  values.length ? values.reduce((s, v) => s + v, 0) / values.length : null;

/** Whole days between two day keys (same day = 0). */
const elapsed = (from: DayKey, to: DayKey) => daysBetween(from, to) - 1;

export function anomalyRows(
  ds: MockDataset,
  anomalies: readonly Anomaly[],
  scope: Omit<Scope, 'dateRange'>,
): AnomalyRow[] {
  const appById = new Map(ds.applications.map((a) => [a.id, a]));
  const lobName = new Map(ds.lobs.map((l) => [l.id, l.name]));
  const accountName = new Map(ds.accounts.map((a) => [a.id, a.name]));
  return anomalies
    .filter((a) => inScope(a, scope))
    .map((a) => ({
      id: a.id,
      detectedAt: a.detectedAt.slice(0, 10),
      endedAt: a.endedAt.slice(0, 10),
      durationDays: a.durationDays,
      severity: a.severity,
      status: a.status,
      service: a.dimensionValue,
      provider: a.provider,
      applicationId: a.applicationId,
      application: appById.get(a.applicationId)?.name ?? a.applicationId,
      lob: lobName.get(a.lobId) ?? a.lobId,
      environment: a.environment,
      accountId: a.accountId,
      accountName: accountName.get(a.accountId) ?? a.accountId,
      resourceId: a.resourceId,
      resourceName: a.resourceName,
      region: a.regionId,
      regionName: a.regionName,
      expectedCost: a.expectedCost,
      actualCost: a.actualCost,
      impact: a.impact,
      impactPercent: a.impactPercent,
      rootCauseHint: a.rootCauseHint,
      usageDrivers: a.usageDrivers,
      owner: a.owner,
      alertChannels: alertChannels(a.severity),
      acknowledgedAt: day(a.acknowledgedAt),
      resolvedAt: day(a.resolvedAt),
      expectedReason: a.expectedReason,
      resolutionNote: a.resolutionNote,
    }));
}

export function computeAnomalies(
  ds: MockDataset,
  anomalies: readonly Anomaly[],
  scope: Scope,
): AnomaliesData {
  const { start, end } = scope.dateRange;
  const all = anomalyRows(ds, anomalies, scope);
  const triage = all.filter((r) => NEEDS_TRIAGE.includes(r.status));
  const inRange = all.filter((r) => r.detectedAt >= start && r.detectedAt <= end);
  // Anything still needing triage stays in the feed even if it started before the range.
  const rows = all
    .filter(
      (r) => (r.detectedAt >= start && r.detectedAt <= end) || NEEDS_TRIAGE.includes(r.status),
    )
    .sort((a, b) => b.detectedAt.localeCompare(a.detectedAt) || b.impact - a.impact);

  const counts = Object.fromEntries(ANOMALY_STATUSES.map((s) => [s, 0])) as Record<
    AnomalyStatus,
    number
  >;
  for (const r of rows) counts[r.status] += 1;

  const bySeverity = Object.fromEntries(SEVERITIES.map((s) => [s, 0])) as Record<
    AnomalySeverity,
    number
  >;
  for (const r of triage) bySeverity[r.severity] += 1;

  const unexpected = inRange.filter((r) => r.status !== 'Expected');
  const resolved = inRange.filter((r) => r.status === 'Resolved' && r.resolvedAt);
  const acknowledged = inRange.filter((r) => r.acknowledgedAt);

  const services = new Map<string, ImpactGroup>();
  for (const r of unexpected) {
    const g = services.get(r.service) ?? { label: r.service, count: 0, impact: 0 };
    g.count += 1;
    g.impact += r.impact;
    services.set(r.service, g);
  }

  return {
    asOf: DATA_END,
    currency: ds.anomalies[0]?.currency ?? 'USD',
    start,
    end,
    rows,
    counts,
    kpis: {
      needsTriage: triage.length,
      unacknowledged: triage.filter((r) => r.status === 'Open').length,
      needsTriageBySeverity: bySeverity,
      needsTriageImpact: triage.reduce((s, r) => s + r.impact, 0),
      detected: inRange.length,
      unexpectedImpact: unexpected.reduce((s, r) => s + r.impact, 0),
      expectedCount: inRange.length - unexpected.length,
      mttrDays: mean(resolved.map((r) => elapsed(r.detectedAt, r.resolvedAt as DayKey))),
      resolvedCount: resolved.length,
      mttaDays: mean(acknowledged.map((r) => elapsed(r.detectedAt, r.acknowledgedAt as DayKey))),
    },
    timeline: [...inRange]
      .sort((a, b) => a.detectedAt.localeCompare(b.detectedAt))
      .map((r) => ({
        id: r.id,
        date: r.detectedAt,
        severity: r.severity,
        impact: r.impact,
        label: `${r.service} · ${r.application} ${r.environment}`,
      })),
    impactByService: [...services.values()].sort((a, b) => b.impact - a.impact),
  };
}

/* ------------------------------------------------------------------ */
/* Detail: daily cost of the resource around the anomaly               */
/* ------------------------------------------------------------------ */

export interface AnomalyDailyPoint {
  date: DayKey;
  cost: number;
  /** Inside the anomaly window. */
  anomalous: boolean;
}

export interface AnomalyDetail {
  daily: AnomalyDailyPoint[];
  /** Expected cost per day over the anomaly window. */
  expectedDaily: number;
  /** Actual cost per day over the anomaly window. */
  actualDaily: number;
}

export function anomalyDetail(ds: MockDataset, row: AnomalyRow): AnomalyDetail {
  const from = addDays(row.detectedAt, -DETAIL_CONTEXT_DAYS);
  const lastContext = addDays(row.endedAt, DETAIL_CONTEXT_DAYS);
  const to = lastContext > DATA_END ? DATA_END : lastContext;
  const byDay = new Map<DayKey, number>();
  for (const c of ds.costs) {
    if (c.ResourceId !== row.resourceId) continue;
    const d = c.ChargePeriodStart.slice(0, 10);
    if (d < from || d > to) continue;
    byDay.set(d, (byDay.get(d) ?? 0) + c.BilledCost);
  }
  const daily: AnomalyDailyPoint[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    daily.push({
      date: d,
      cost: Math.round((byDay.get(d) ?? 0) * 100) / 100,
      anomalous: d >= row.detectedAt && d <= row.endedAt,
    });
  }
  return {
    daily,
    expectedDaily: row.expectedCost / row.durationDays,
    actualDaily: row.actualCost / row.durationDays,
  };
}

/* ------------------------------------------------------------------ */
/* Export                                                              */
/* ------------------------------------------------------------------ */

export function anomaliesCsv(rows: readonly AnomalyRow[]): string {
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const header = [
    'ID',
    'Detected',
    'Ended',
    'Severity',
    'Status',
    'Service',
    'Application',
    'LOB',
    'Environment',
    'Account ID',
    'Resource ID',
    'Region',
    'Expected cost (USD)',
    'Actual cost (USD)',
    'Impact (USD)',
    'Impact %',
    'Root-cause hint',
    'Owner',
  ];
  const lines = rows.map((r) =>
    [
      r.id,
      r.detectedAt,
      r.endedAt,
      r.severity,
      r.status,
      r.service,
      r.application,
      r.lob,
      r.environment,
      r.accountId,
      r.resourceId,
      r.region,
      r.expectedCost.toFixed(2),
      r.actualCost.toFixed(2),
      r.impact.toFixed(2),
      r.impactPercent.toFixed(1),
      r.rootCauseHint,
      r.owner,
    ]
      .map((v) => esc(String(v)))
      .join(','),
  );
  return [header.join(','), ...lines].join('\n') + '\n';
}
