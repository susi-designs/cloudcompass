import type {
  AnomalySeverity,
  AnomalyStatus,
  Environment,
  Level,
  RecommendationType,
} from '@cloudcompass/types';
import type { BudgetStatus } from './budgets';
import { DATA_END } from './scope';
import { daysBetween, type DayKey } from './dates';
import { NEEDS_TRIAGE } from './anomalies';
import { SECTION_IDS, type AppSnapshot, type SectionId } from './myCloudCompass';

/*
 * Adaptive layout for My CloudCompass (PRODUCT.md §5.1 "Adaptive layout").
 * Each data set becomes scored signals (0–100); a rule-based composer picks what the page
 * brings forward. Pure functions: no React, no formatting, no storage.
 */

/* ------------------------------------------------------------------ */
/* Signals                                                             */
/* ------------------------------------------------------------------ */

export type SignalKind =
  'anomaly' | 'budget' | 'spend-growth' | 'recommendation' | 'idle' | 'commitment' | 'ai-growth';

export const SIGNAL_KINDS: readonly SignalKind[] = [
  'anomaly',
  'budget',
  'spend-growth',
  'recommendation',
  'idle',
  'commitment',
  'ai-growth',
];

export const SIGNAL_SECTION: Record<SignalKind, SectionId> = {
  anomaly: 'anomalies',
  budget: 'cost',
  'spend-growth': 'cost',
  recommendation: 'optimization',
  idle: 'utilization',
  commitment: 'utilization',
  'ai-growth': 'ai',
};

/** A signal enters the "Needs attention" band at this score… */
export const ENTER_SCORE = 40;
/** …and, once shown, stays until it drops below this one (hysteresis). */
export const STAY_SCORE = 30;
/** Most signal cards in the band; the rest show as "+ N more". */
export const BAND_MAX = 5;
/** A visit ends after this long away from the page. */
export const VISIT_GAP_MS = 30 * 60 * 1000;

/** Thresholds that make a signal fire (see the PRODUCT.md signal table). */
export const THRESHOLDS = {
  budgetAtRiskPercent: 90,
  spendGrowthPercent: 10,
  idleShareOfBudget: 2,
  commitmentCoveragePercent: 50,
  aiGrowthPercent: 20,
} as const;

interface SignalBase {
  /** Stable across visits, e.g. `anomaly:anom-17`, `budget`. */
  id: string;
  section: SectionId;
  /** 0–100. Higher means it needs attention sooner. */
  score: number;
}

export interface AnomalySignal extends SignalBase {
  kind: 'anomaly';
  anomalyId: string;
  severity: AnomalySeverity;
  status: AnomalyStatus;
  service: string;
  environment: Environment;
  impact: number;
  impactPercent: number;
  detectedAt: DayKey;
  /** Whole days since detection (0 = detected on the as-of day). */
  daysAgo: number;
}

export interface BudgetSignal extends SignalBase {
  kind: 'budget';
  status: Exclude<BudgetStatus, 'On track'>;
  forecastPercent: number;
  forecast: number;
  budget: number;
}

export interface SpendGrowthSignal extends SignalBase {
  kind: 'spend-growth';
  changePercent: number;
  change: number;
}

export interface RecommendationSignal extends SignalBase {
  kind: 'recommendation';
  recommendationId: string;
  title: string;
  type: RecommendationType;
  savings: number;
  owner: string | null;
  effort: Level;
  risk: Level;
  quickWin: boolean;
}

export interface IdleSignal extends SignalBase {
  kind: 'idle';
  count: number;
  monthlyCost: number;
  /** Idle cost as % of the monthly budget. */
  shareOfBudget: number;
}

export interface CommitmentSignal extends SignalBase {
  kind: 'commitment';
  coveragePercent: number;
}

export interface AiGrowthSignal extends SignalBase {
  kind: 'ai-growth';
  changePercent: number;
  change: number;
  total: number;
}

export type Signal =
  | AnomalySignal
  | BudgetSignal
  | SpendGrowthSignal
  | RecommendationSignal
  | IdleSignal
  | CommitmentSignal
  | AiGrowthSignal;

const clamp = (v: number, min = 0, max = 100) => Math.min(max, Math.max(min, v));
/** Up to `max` points, reaching it when `share` (% of budget) hits `fullAt`. */
const sharePoints = (amount: number, budget: number, fullAt: number, max: number) =>
  budget > 0 ? clamp(((amount / budget) * 100 * max) / fullAt, 0, max) : 0;
const round1 = (v: number) => Math.round(v * 10) / 10;

const SEVERITY_BASE: Record<AnomalySeverity, number> = {
  Critical: 60,
  High: 45,
  Medium: 30,
  Low: 15,
};

export function anomalyScore(
  a: { severity: AnomalySeverity; status: AnomalyStatus; impact: number; daysAgo: number },
  monthlyBudget: number,
): number {
  if (!NEEDS_TRIAGE.includes(a.status)) return 0;
  const recency = a.daysAgo <= 3 ? 10 : a.daysAgo <= 7 ? 5 : 0;
  const acknowledged = a.status === 'Acknowledged' ? -10 : 0;
  return round1(
    clamp(
      SEVERITY_BASE[a.severity] +
        sharePoints(a.impact, monthlyBudget, 5, 25) +
        recency +
        acknowledged,
    ),
  );
}

export function budgetScore(forecastPercent: number): number {
  if (forecastPercent > 100) return round1(clamp(55 + (forecastPercent - 100) * 5, 0, 80));
  if (forecastPercent >= THRESHOLDS.budgetAtRiskPercent)
    return round1(30 + (forecastPercent - THRESHOLDS.budgetAtRiskPercent) * 2);
  return 0;
}

export function spendGrowthScore(changePercent: number | null): number {
  if (changePercent == null || changePercent < THRESHOLDS.spendGrowthPercent) return 0;
  return round1(clamp(30 + (changePercent - THRESHOLDS.spendGrowthPercent) * 2, 0, 60));
}

export function recommendationScore(
  r: { savings: number; owner: string | null; quickWin: boolean },
  monthlyBudget: number,
): number {
  return round1(
    clamp(
      20 +
        sharePoints(r.savings, monthlyBudget, 5, 40) +
        (r.owner === null ? 10 : 0) +
        (r.quickWin ? 10 : 0),
    ),
  );
}

export function idleScore(idleMonthlyCost: number, monthlyBudget: number): number {
  if (monthlyBudget <= 0) return 0;
  const share = (idleMonthlyCost / monthlyBudget) * 100;
  if (share < THRESHOLDS.idleShareOfBudget) return 0;
  return round1(25 + sharePoints(idleMonthlyCost, monthlyBudget, 10, 30));
}

export function commitmentScore(coveragePercent: number | null): number {
  if (coveragePercent == null || coveragePercent >= THRESHOLDS.commitmentCoveragePercent) return 0;
  return round1(clamp(25 + (THRESHOLDS.commitmentCoveragePercent - coveragePercent) / 2, 0, 50));
}

export function aiGrowthScore(changePercent: number | null, total: number): number {
  if (total <= 0 || changePercent == null || changePercent < THRESHOLDS.aiGrowthPercent) return 0;
  return round1(clamp(30 + (changePercent - THRESHOLDS.aiGrowthPercent), 0, 60));
}

/**
 * Turn an application snapshot into scored signals. Handled items (resolved, expected,
 * accepted, dismissed, implemented…) produce none, so workflow on the pillar pages moves the page.
 */
export function buildSignals(snap: AppSnapshot, asOf: DayKey = DATA_END): Signal[] {
  const budget = snap.application.monthlyBudget;
  const signals: Signal[] = [];

  for (const a of snap.anomalies.rows) {
    if (!NEEDS_TRIAGE.includes(a.status)) continue;
    const daysAgo = Math.max(0, daysBetween(a.detectedAt, asOf) - 1);
    signals.push({
      id: `anomaly:${a.id}`,
      kind: 'anomaly',
      section: 'anomalies',
      score: anomalyScore({ ...a, daysAgo }, budget),
      anomalyId: a.id,
      severity: a.severity,
      status: a.status,
      service: a.service,
      environment: a.environment,
      impact: a.impact,
      impactPercent: a.impactPercent,
      detectedAt: a.detectedAt,
      daysAgo,
    });
  }

  const b = snap.budget;
  if (b && b.status !== 'On track') {
    signals.push({
      id: 'budget',
      kind: 'budget',
      section: 'cost',
      score: budgetScore(b.forecastPercent),
      status: b.status,
      forecastPercent: b.forecastPercent,
      forecast: b.forecast,
      budget: b.budget,
    });
  }

  const mtd = snap.overview.mtd;
  const growth = spendGrowthScore(mtd.changePercent);
  if (growth > 0 && mtd.changePercent != null) {
    signals.push({
      id: 'spend-growth',
      kind: 'spend-growth',
      section: 'cost',
      score: growth,
      changePercent: mtd.changePercent,
      change: mtd.value - mtd.previous,
    });
  }

  for (const r of snap.optimization.rows) {
    if (r.status !== 'Open') continue;
    const quickWin = r.effort === 'Low' && r.risk === 'Low';
    signals.push({
      id: `recommendation:${r.id}`,
      kind: 'recommendation',
      section: 'optimization',
      score: recommendationScore(
        { savings: r.estimatedMonthlySavings, owner: r.owner, quickWin },
        budget,
      ),
      recommendationId: r.id,
      title: r.title,
      type: r.type,
      savings: r.estimatedMonthlySavings,
      owner: r.owner,
      effort: r.effort,
      risk: r.risk,
      quickWin,
    });
  }

  const u = snap.utilization.kpis;
  const idle = idleScore(u.idleMonthlyCost, budget);
  if (idle > 0) {
    signals.push({
      id: 'idle',
      kind: 'idle',
      section: 'utilization',
      score: idle,
      count: u.idleCount,
      monthlyCost: u.idleMonthlyCost,
      shareOfBudget: budget > 0 ? (u.idleMonthlyCost / budget) * 100 : 0,
    });
  }
  const coverage = commitmentScore(u.commitmentCoverage);
  if (coverage > 0 && u.commitmentCoverage != null) {
    signals.push({
      id: 'commitment',
      kind: 'commitment',
      section: 'utilization',
      score: coverage,
      coveragePercent: u.commitmentCoverage,
    });
  }

  const ai = snap.aiSpend.kpis;
  const aiScore = aiGrowthScore(ai.changePercent, ai.total);
  if (aiScore > 0 && ai.changePercent != null) {
    signals.push({
      id: 'ai-growth',
      kind: 'ai-growth',
      section: 'ai',
      score: aiScore,
      changePercent: ai.changePercent,
      change: ai.change,
      total: ai.total,
    });
  }

  return signals.sort((x, y) => y.score - x.score || x.id.localeCompare(y.id));
}

/* ------------------------------------------------------------------ */
/* Visit memory ("since your last visit")                             */
/* ------------------------------------------------------------------ */

/** A signal that was shown in the band, remembered by id with the title it had. */
export interface SeenSignal {
  id: string;
  kind: SignalKind;
  title: string;
}

export interface VisitRecord {
  /** Epoch ms of the last activity in this visit. */
  at: number;
  /** Signals shown in the band during the visit. */
  seen: SeenSignal[];
}

export interface VisitMemory {
  /** The previous visit, compared against to tag New / Resolved. */
  baseline?: VisitRecord;
  current: VisitRecord;
}

/** Start or continue a visit: after VISIT_GAP_MS away, the last visit becomes the baseline. */
export function advanceVisit(prev: VisitMemory | undefined, now: number): VisitMemory {
  if (!prev) return { current: { at: now, seen: [] } };
  if (now - prev.current.at > VISIT_GAP_MS)
    return { baseline: prev.current, current: { at: now, seen: [] } };
  return { ...prev, current: { ...prev.current, at: now } };
}

/** Remember what the band showed in this visit (union by id). */
export function recordSeen(
  memory: VisitMemory,
  shown: readonly SeenSignal[],
  now: number,
): VisitMemory {
  const seen = new Map(memory.current.seen.map((s) => [s.id, s]));
  for (const s of shown) seen.set(s.id, s);
  return { ...memory, current: { at: now, seen: [...seen.values()] } };
}

/* ------------------------------------------------------------------ */
/* Composer                                                            */
/* ------------------------------------------------------------------ */

export type SectionState = 'attention' | 'steady' | 'quiet';

export interface SectionLayout {
  id: SectionId;
  state: SectionState;
  /** Active, unmuted signals in this section. */
  signalCount: number;
  /** Of those, how many are in the band. */
  bandCount: number;
  /** Highest unmuted signal score in the section (0 when none). */
  topScore: number;
}

export interface BandItem {
  signal: Signal;
  /** Not in the band during the previous visit. */
  isNew: boolean;
}

export interface MutedKind {
  kind: SignalKind;
  /** Active signals currently hidden by the mute. */
  hidden: number;
}

export interface PagePrefs {
  muted: readonly SignalKind[];
}

export const EMPTY_PREFS: PagePrefs = { muted: [] };

export interface AdaptiveLayout {
  band: BandItem[];
  /** Signals that qualify for the band but didn't fit. */
  overflow: number;
  /** Shown in the band this visit or the last one, now handled. */
  resolved: SeenSignal[];
  sections: Record<SectionId, SectionLayout>;
  muted: MutedKind[];
}

/**
 * Pick what the page brings forward. Rules (PRODUCT.md §5.1):
 * - band: unmuted signals ≥ ENTER_SCORE, or ≥ STAY_SCORE if shown last visit, top BAND_MAX;
 * - section: "attention" if it has a band signal, "steady" if it has any other signal,
 *   otherwise "quiet";
 * - mutes always win over scores.
 */
export function composeLayout(
  signals: readonly Signal[],
  prefs: PagePrefs = EMPTY_PREFS,
  memory?: VisitMemory,
): AdaptiveLayout {
  const muted = new Set(prefs.muted);
  const visible = signals.filter((s) => !muted.has(s.kind));
  const previously = new Set(
    [...(memory?.baseline?.seen ?? []), ...(memory?.current.seen ?? [])].map((s) => s.id),
  );
  const baselineIds = memory?.baseline ? new Set(memory.baseline.seen.map((s) => s.id)) : null;

  const qualifying = visible
    .filter((s) => s.score >= ENTER_SCORE || (s.score >= STAY_SCORE && previously.has(s.id)))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const band = qualifying.slice(0, BAND_MAX).map((signal) => ({
    signal,
    isNew: baselineIds !== null && !baselineIds.has(signal.id),
  }));
  const bandIds = new Set(band.map((b) => b.signal.id));

  const activeIds = new Set(signals.map((s) => s.id));
  const resolvedMap = new Map<string, SeenSignal>();
  for (const s of [...(memory?.baseline?.seen ?? []), ...(memory?.current.seen ?? [])]) {
    if (!activeIds.has(s.id) && !muted.has(s.kind)) resolvedMap.set(s.id, s);
  }

  const sections = Object.fromEntries(
    SECTION_IDS.map((id) => {
      const inSection = visible.filter((s) => s.section === id);
      const bandCount = inSection.filter((s) => bandIds.has(s.id)).length;
      const state: SectionState =
        bandCount > 0 ? 'attention' : inSection.length > 0 ? 'steady' : 'quiet';
      return [
        id,
        {
          id,
          state,
          signalCount: inSection.length,
          bandCount,
          topScore: inSection.reduce((m, s) => Math.max(m, s.score), 0),
        },
      ];
    }),
  ) as Record<SectionId, SectionLayout>;

  return {
    band,
    overflow: Math.max(0, qualifying.length - band.length),
    resolved: [...resolvedMap.values()],
    sections,
    muted: prefs.muted.map((kind) => ({
      kind,
      hidden: signals.filter((s) => s.kind === kind).length,
    })),
  };
}
