import type {
  DismissReason,
  Level,
  Recommendation,
  RecommendationStatus,
  RecommendationType,
} from '@cloudcompass/types';
import { addDays, daysBetween, daysInMonth, startOfMonth, type DayKey } from './dates';
import { bucketLabel } from './explorer';
import { DATA_END, inScope, type Scope } from './scope';
import type { MockDataset } from './source';

export const DISMISS_REASONS: readonly DismissReason[] = [
  'Not applicable',
  'Risk too high',
  'Already planned',
  'Incorrect data',
];

export const SNOOZE_OPTIONS_DAYS = [30, 60, 90] as const;

/** Central team that owns commitment purchases. */
export const FINOPS_TEAM = 'Cloud FinOps team';

/* ------------------------------------------------------------------ */
/* Workflow: assign → accept / snooze / dismiss → implemented          */
/* ------------------------------------------------------------------ */

export type WorkflowAction =
  | { type: 'assign'; owner: string }
  | { type: 'accept' }
  | { type: 'snooze'; days: number }
  | { type: 'dismiss'; reason: DismissReason }
  | { type: 'implement' }
  | { type: 'reopen' };

export type WorkflowActionType = WorkflowAction['type'];

/** Which statuses each action can be applied to. Implemented is final. */
const ALLOWED_FROM: Record<WorkflowActionType, readonly RecommendationStatus[]> = {
  assign: ['Open', 'Accepted', 'Snoozed'],
  accept: ['Open', 'Snoozed'],
  snooze: ['Open', 'Accepted'],
  dismiss: ['Open', 'Accepted', 'Snoozed'],
  implement: ['Accepted'],
  reopen: ['Snoozed', 'Dismissed'],
};

export function canApply(action: WorkflowActionType, status: RecommendationStatus): boolean {
  return ALLOWED_FROM[action].includes(status);
}

/** Fields a user action can change; stored per recommendation id. */
export type RecommendationOverride = Partial<
  Pick<
    Recommendation,
    | 'status'
    | 'owner'
    | 'implementedAt'
    | 'realizedMonthlySavings'
    | 'snoozedUntil'
    | 'dismissReason'
  >
>;

export type OverrideMap = Record<string, RecommendationOverride>;

const isoDay = (day: DayKey) => `${day}T00:00:00.000Z`;

/**
 * The change an action makes to a recommendation, or null if it can't be applied in its
 * current status. `today` is the data's "as of" day so the ledger stays consistent.
 */
export function actionChanges(
  rec: Recommendation,
  action: WorkflowAction,
  today: DayKey = DATA_END,
): RecommendationOverride | null {
  if (!canApply(action.type, rec.status)) return null;
  switch (action.type) {
    case 'assign':
      return { owner: action.owner };
    case 'accept':
      return { status: 'Accepted', snoozedUntil: null };
    case 'snooze':
      return { status: 'Snoozed', snoozedUntil: isoDay(addDays(today, action.days)) };
    case 'dismiss':
      return { status: 'Dismissed', dismissReason: action.reason, snoozedUntil: null };
    case 'implement':
      // Realized savings start at the estimate until billing data confirms them.
      return {
        status: 'Implemented',
        implementedAt: isoDay(today),
        realizedMonthlySavings: rec.estimatedMonthlySavings,
      };
    case 'reopen':
      return { status: 'Open', snoozedUntil: null, dismissReason: null };
  }
}

/** Apply an action to many recommendations; returns the new override map and what changed. */
export function applyAction(
  recs: readonly Recommendation[],
  overrides: OverrideMap,
  ids: readonly string[],
  action: WorkflowAction,
  today: DayKey = DATA_END,
): { overrides: OverrideMap; updated: number; skipped: number } {
  const byId = new Map(recs.map((r) => [r.id, r]));
  const next: OverrideMap = { ...overrides };
  let updated = 0;
  let skipped = 0;
  for (const id of ids) {
    const rec = byId.get(id);
    const changes = rec ? actionChanges(rec, action, today) : null;
    if (!changes) {
      skipped += 1;
      continue;
    }
    next[id] = { ...next[id], ...changes };
    updated += 1;
  }
  return { overrides: next, updated, skipped };
}

export function applyOverrides(
  recs: readonly Recommendation[],
  overrides: OverrideMap,
): Recommendation[] {
  return recs.map((r) => {
    const o = overrides[r.id];
    return o ? { ...r, ...o } : r;
  });
}

/* ------------------------------------------------------------------ */
/* Inbox                                                               */
/* ------------------------------------------------------------------ */

export interface RecommendationRow {
  id: string;
  title: string;
  description: string;
  type: RecommendationType;
  provider: Recommendation['provider'];
  resourceId: string;
  applicationId: string;
  application: string;
  lob: string;
  environment: Recommendation['environment'];
  accountId: string;
  owner: string | null;
  effort: Level;
  risk: Level;
  status: RecommendationStatus;
  createdAt: DayKey;
  estimatedMonthlySavings: number;
  realizedMonthlySavings: number | null;
  implementedAt: DayKey | null;
  snoozedUntil: DayKey | null;
  dismissReason: DismissReason | null;
}

export interface SavingsGroup {
  label: string;
  count: number;
  savings: number;
}

export interface OptimizationData {
  asOf: DayKey;
  currency: string;
  rows: RecommendationRow[];
  counts: Record<RecommendationStatus, number>;
  kpis: {
    openSavings: number;
    openCount: number;
    unassignedCount: number;
    quickWinSavings: number;
    quickWinCount: number;
    acceptedSavings: number;
    acceptedCount: number;
    realizedRunRate: number;
    implementedCount: number;
  };
  /** Open savings, largest first. */
  openByType: SavingsGroup[];
  openByLob: SavingsGroup[];
  /** Teams that can own recommendations in scope (for assigning). */
  owners: string[];
}

const day = (iso: string | null): DayKey | null => (iso ? iso.slice(0, 10) : null);

const STATUSES: readonly RecommendationStatus[] = [
  'Open',
  'Accepted',
  'Snoozed',
  'Dismissed',
  'Implemented',
];

function groupSavings(rows: RecommendationRow[], key: (r: RecommendationRow) => string) {
  const map = new Map<string, SavingsGroup>();
  for (const r of rows) {
    const label = key(r);
    const g = map.get(label) ?? { label, count: 0, savings: 0 };
    g.count += 1;
    g.savings += r.estimatedMonthlySavings;
    map.set(label, g);
  }
  return [...map.values()].sort((a, b) => b.savings - a.savings);
}

/** Recommendation rows in scope. The inbox shows current status, so the date range doesn't apply. */
export function recommendationRows(
  ds: MockDataset,
  recs: readonly Recommendation[],
  scope: Scope,
): RecommendationRow[] {
  const appById = new Map(ds.applications.map((a) => [a.id, a]));
  const lobName = new Map(ds.lobs.map((l) => [l.id, l.name]));
  return recs
    .filter((r) => inScope(r, scope))
    .map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      type: r.type,
      provider: r.provider,
      resourceId: r.resourceId,
      applicationId: r.applicationId,
      application: appById.get(r.applicationId)?.name ?? r.applicationId,
      lob: lobName.get(r.lobId) ?? r.lobId,
      environment: r.environment,
      accountId: r.accountId,
      owner: r.owner,
      effort: r.effort,
      risk: r.risk,
      status: r.status,
      createdAt: r.createdAt.slice(0, 10),
      estimatedMonthlySavings: r.estimatedMonthlySavings,
      realizedMonthlySavings: r.realizedMonthlySavings,
      implementedAt: day(r.implementedAt),
      snoozedUntil: day(r.snoozedUntil),
      dismissReason: r.dismissReason,
    }));
}

export function computeOptimization(
  ds: MockDataset,
  recs: readonly Recommendation[],
  scope: Scope,
): OptimizationData {
  const rows = recommendationRows(ds, recs, scope);
  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<
    RecommendationStatus,
    number
  >;
  for (const r of rows) counts[r.status] += 1;

  const open = rows.filter((r) => r.status === 'Open');
  const quickWins = open.filter((r) => r.effort === 'Low' && r.risk === 'Low');
  const accepted = rows.filter((r) => r.status === 'Accepted');
  const implemented = rows.filter((r) => r.status === 'Implemented');
  const sum = (list: RecommendationRow[], f: (r: RecommendationRow) => number) =>
    list.reduce((s, r) => s + f(r), 0);

  const appTeams = [...new Set(rows.map((r) => `${r.application} team`))].sort();
  return {
    asOf: DATA_END,
    currency: ds.recommendations[0]?.currency ?? 'USD',
    rows,
    counts,
    kpis: {
      openSavings: sum(open, (r) => r.estimatedMonthlySavings),
      openCount: open.length,
      unassignedCount: open.filter((r) => r.owner === null).length,
      quickWinSavings: sum(quickWins, (r) => r.estimatedMonthlySavings),
      quickWinCount: quickWins.length,
      acceptedSavings: sum(accepted, (r) => r.estimatedMonthlySavings),
      acceptedCount: accepted.length,
      realizedRunRate: sum(implemented, (r) => r.realizedMonthlySavings ?? 0),
      implementedCount: implemented.length,
    },
    openByType: groupSavings(open, (r) => r.type),
    openByLob: groupSavings(open, (r) => r.lob),
    owners: [FINOPS_TEAM, ...appTeams],
  };
}

/* ------------------------------------------------------------------ */
/* Savings ledger: projected vs. realized                              */
/* ------------------------------------------------------------------ */

export interface LedgerMonth {
  /** First day of the month. */
  month: DayKey;
  /** Chart / table label; "(partial)" when the date range cuts the month. */
  label: string;
  projected: number;
  realized: number;
}

export interface LedgerRow {
  id: string;
  title: string;
  type: RecommendationType;
  application: string;
  lob: string;
  environment: Recommendation['environment'];
  owner: string | null;
  implementedAt: DayKey;
  estimatedMonthlySavings: number;
  realizedMonthlySavings: number;
  /** realized ÷ estimated − 1, as a percentage. */
  variancePercent: number;
  /** Savings realized inside the selected date range. */
  realizedInPeriod: number;
}

export interface LedgerData {
  asOf: DayKey;
  currency: string;
  start: DayKey;
  end: DayKey;
  months: LedgerMonth[];
  rows: LedgerRow[];
  kpis: {
    realizedInPeriod: number;
    projectedInPeriod: number;
    /** realized ÷ projected over the period, 0–100+; null without implemented savings. */
    realizationPercent: number | null;
    runRate: number;
    pipeline: number;
    pipelineCount: number;
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Savings from implemented recommendations, prorated by day: each one saves
 * `monthly ÷ days in month` per day from its implementation day. Projected uses the estimate,
 * realized uses the measured savings, so the gap shows how accurate estimates were.
 */
export function computeLedger(
  ds: MockDataset,
  recs: readonly Recommendation[],
  scope: Scope,
): LedgerData {
  const { start, end } = scope.dateRange;
  const rows = recommendationRows(ds, recs, scope);
  const implemented = rows.filter(
    (r): r is RecommendationRow & { implementedAt: DayKey; realizedMonthlySavings: number } =>
      r.status === 'Implemented' &&
      r.implementedAt !== null &&
      r.realizedMonthlySavings !== null &&
      r.implementedAt <= end,
  );

  const months: LedgerMonth[] = [];
  const realizedByRec = new Map<string, number>();
  for (let m = startOfMonth(start); m <= end; m = addDays(m, daysInMonth(m))) {
    const monthEnd = addDays(m, daysInMonth(m) - 1);
    const segStart = m < start ? start : m;
    const segEnd = monthEnd > end ? end : monthEnd;
    const perDay = 1 / daysInMonth(m);
    let projected = 0;
    let realized = 0;
    for (const r of implemented) {
      const from = r.implementedAt > segStart ? r.implementedAt : segStart;
      if (from > segEnd) continue;
      const days = daysBetween(from, segEnd);
      projected += r.estimatedMonthlySavings * perDay * days;
      const saved = r.realizedMonthlySavings * perDay * days;
      realized += saved;
      realizedByRec.set(r.id, (realizedByRec.get(r.id) ?? 0) + saved);
    }
    const label = bucketLabel(m, 'month');
    months.push({
      month: m,
      label: segStart !== m || segEnd !== monthEnd ? `${label} (partial)` : label,
      projected: round2(projected),
      realized: round2(realized),
    });
  }

  const ledgerRows: LedgerRow[] = implemented
    .map((r) => ({
      id: r.id,
      title: r.title,
      type: r.type,
      application: r.application,
      lob: r.lob,
      environment: r.environment,
      owner: r.owner,
      implementedAt: r.implementedAt,
      estimatedMonthlySavings: r.estimatedMonthlySavings,
      realizedMonthlySavings: r.realizedMonthlySavings,
      variancePercent:
        r.estimatedMonthlySavings > 0
          ? (r.realizedMonthlySavings / r.estimatedMonthlySavings - 1) * 100
          : 0,
      realizedInPeriod: round2(realizedByRec.get(r.id) ?? 0),
    }))
    .sort((a, b) => b.implementedAt.localeCompare(a.implementedAt));

  const realizedInPeriod = months.reduce((s, m) => s + m.realized, 0);
  const projectedInPeriod = months.reduce((s, m) => s + m.projected, 0);
  const accepted = rows.filter((r) => r.status === 'Accepted');
  return {
    asOf: DATA_END,
    currency: ds.recommendations[0]?.currency ?? 'USD',
    start,
    end,
    months,
    rows: ledgerRows,
    kpis: {
      realizedInPeriod,
      projectedInPeriod,
      realizationPercent:
        projectedInPeriod > 0 ? (realizedInPeriod / projectedInPeriod) * 100 : null,
      runRate: implemented.reduce((s, r) => s + r.realizedMonthlySavings, 0),
      pipeline: accepted.reduce((s, r) => s + r.estimatedMonthlySavings, 0),
      pipelineCount: accepted.length,
    },
  };
}

export function recommendationsCsv(rows: readonly RecommendationRow[]): string {
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const header = [
    'ID',
    'Recommendation',
    'Type',
    'Application',
    'LOB',
    'Environment',
    'Account ID',
    'Resource ID',
    'Owner',
    'Effort',
    'Risk',
    'Status',
    'Created',
    'Est. savings / mo (USD)',
    'Realized savings / mo (USD)',
  ];
  const lines = rows.map((r) =>
    [
      r.id,
      r.title,
      r.type,
      r.application,
      r.lob,
      r.environment,
      r.accountId,
      r.resourceId,
      r.owner ?? '',
      r.effort,
      r.risk,
      r.status,
      r.createdAt,
      r.estimatedMonthlySavings.toFixed(2),
      r.realizedMonthlySavings?.toFixed(2) ?? '',
    ]
      .map((v) => esc(String(v)))
      .join(','),
  );
  return [header.join(','), ...lines].join('\n') + '\n';
}
