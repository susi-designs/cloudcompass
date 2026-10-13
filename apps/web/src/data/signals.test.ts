import { generateDataset } from '@cloudcompass/mock-data';
import { computeAppSnapshot } from './myCloudCompass';
import { defaultScope } from './scope';
import {
  BAND_MAX,
  ENTER_SCORE,
  STAY_SCORE,
  VISIT_GAP_MS,
  advanceVisit,
  aiGrowthScore,
  anomalyScore,
  budgetScore,
  buildSignals,
  commitmentScore,
  composeLayout,
  idleScore,
  recommendationScore,
  recordSeen,
  spendGrowthScore,
  type Signal,
  type VisitMemory,
} from './signals';

const ds = generateDataset();
const snapshotFor = (appId: string, anomalies = ds.anomalies) =>
  computeAppSnapshot(ds, ds.recommendations, anomalies, appId, defaultScope())!;

/** Minimal signal for composer tests. */
const sig = (id: string, score: number, kind: Signal['kind'] = 'budget'): Signal =>
  ({
    id,
    kind,
    score,
    section: kind === 'anomaly' ? 'anomalies' : kind === 'recommendation' ? 'optimization' : 'cost',
  }) as Signal;

describe('signal scores (PRODUCT.md §5.1 signal table)', () => {
  it('ranks anomalies by severity, impact, recency and acknowledgement', () => {
    const base = { status: 'Open' as const, impact: 0, daysAgo: 30 };
    expect(anomalyScore({ ...base, severity: 'Critical' }, 100_000)).toBe(60);
    expect(anomalyScore({ ...base, severity: 'Low' }, 100_000)).toBe(15);
    // 5% of the monthly budget earns the full 25 impact points; new ones get +10.
    expect(anomalyScore({ ...base, severity: 'High', impact: 5_000, daysAgo: 1 }, 100_000)).toBe(
      80,
    );
    expect(
      anomalyScore({ ...base, severity: 'High', status: 'Acknowledged', impact: 5_000 }, 100_000),
    ).toBe(60);
    // Handled anomalies never signal.
    expect(anomalyScore({ ...base, severity: 'Critical', status: 'Resolved' }, 100_000)).toBe(0);
  });

  it('fires budget, growth, idle, coverage and AI signals only past their thresholds', () => {
    expect(budgetScore(89.9)).toBe(0);
    expect(budgetScore(95)).toBe(40);
    expect(budgetScore(103)).toBe(70);
    expect(budgetScore(150)).toBe(80);
    expect(spendGrowthScore(9.9)).toBe(0);
    expect(spendGrowthScore(15)).toBe(40);
    expect(spendGrowthScore(null)).toBe(0);
    expect(idleScore(1_000, 100_000)).toBe(0); // 1% < 2%
    expect(idleScore(10_000, 100_000)).toBe(55); // full points at 10%
    expect(commitmentScore(60)).toBe(0);
    expect(commitmentScore(0)).toBe(50);
    expect(aiGrowthScore(25, 1_000)).toBe(35);
    expect(aiGrowthScore(25, 0)).toBe(0);
  });

  it('gives recommendations points for savings, no owner and quick wins', () => {
    expect(recommendationScore({ savings: 0, owner: 'x', quickWin: false }, 100_000)).toBe(20);
    expect(recommendationScore({ savings: 5_000, owner: null, quickWin: true }, 100_000)).toBe(80);
  });
});

describe('buildSignals', () => {
  it('puts the critical anomalies first for Trading Platform', () => {
    const signals = buildSignals(snapshotFor('app-trading-platform'));
    const anomalies = signals.filter((s) => s.kind === 'anomaly');
    expect(anomalies).toHaveLength(2);
    expect(anomalies.every((s) => s.kind === 'anomaly' && s.severity === 'Critical')).toBe(true);
    expect(signals[0]?.kind).toBe('anomaly');
    expect(signals.map((s) => s.score)).toEqual(
      [...signals.map((s) => s.score)].sort((a, b) => b - a),
    );
  });

  it('drops an anomaly signal once it is resolved on the Anomalies page', () => {
    const before = buildSignals(snapshotFor('app-trading-platform'));
    const target = before.find((s) => s.kind === 'anomaly');
    expect(target?.kind).toBe('anomaly');
    const id = target?.kind === 'anomaly' ? target.anomalyId : '';
    const triaged = ds.anomalies.map((a) =>
      a.id === id ? { ...a, status: 'Resolved' as const } : a,
    );
    const after = buildSignals(snapshotFor('app-trading-platform', triaged));
    expect(after.find((s) => s.id === target?.id)).toBeUndefined();
  });

  it('only signals open recommendations of the application', () => {
    const snap = snapshotFor('app-data-platform');
    const recs = buildSignals(snap).filter((s) => s.kind === 'recommendation');
    expect(recs).toHaveLength(snap.optimization.kpis.openCount);
  });
});

describe('composeLayout', () => {
  it('fills the band with the top signals at or above the enter score', () => {
    const signals = [
      sig('a', 90, 'anomaly'),
      sig('b', ENTER_SCORE),
      sig('c', ENTER_SCORE - 1, 'recommendation'),
    ];
    const layout = composeLayout(signals);
    expect(layout.band.map((b) => b.signal.id)).toEqual(['a', 'b']);
    expect(layout.sections.anomalies.state).toBe('attention');
    expect(layout.sections.cost.state).toBe('attention');
    expect(layout.sections.optimization.state).toBe('steady');
    expect(layout.sections.ai.state).toBe('quiet');
  });

  it(`caps the band at ${BAND_MAX} and reports the overflow`, () => {
    const signals = Array.from({ length: 8 }, (_, i) => sig(`s${i}`, 90 - i));
    const layout = composeLayout(signals);
    expect(layout.band).toHaveLength(BAND_MAX);
    expect(layout.overflow).toBe(3);
  });

  it('keeps a signal shown last visit until it drops below the stay score (hysteresis)', () => {
    const memory: VisitMemory = {
      baseline: { at: 0, seen: [{ id: 'b', kind: 'budget', title: 'Budget' }] },
      current: { at: 1, seen: [] },
    };
    expect(composeLayout([sig('b', STAY_SCORE + 1)], undefined, memory).band).toHaveLength(1);
    expect(composeLayout([sig('b', STAY_SCORE + 1)]).band).toHaveLength(0);
    expect(composeLayout([sig('b', STAY_SCORE - 1)], undefined, memory).band).toHaveLength(0);
  });

  it('tags new signals and lists handled ones since the last visit', () => {
    const memory: VisitMemory = {
      baseline: {
        at: 0,
        seen: [
          { id: 'old', kind: 'budget', title: 'Budget at risk' },
          { id: 'gone', kind: 'anomaly', title: 'Critical anomaly on Amazon EBS' },
        ],
      },
      current: { at: 1, seen: [] },
    };
    const layout = composeLayout([sig('old', 70), sig('fresh', 70)], undefined, memory);
    expect(layout.band.find((b) => b.signal.id === 'old')?.isNew).toBe(false);
    expect(layout.band.find((b) => b.signal.id === 'fresh')?.isNew).toBe(true);
    expect(layout.resolved.map((r) => r.title)).toEqual(['Critical anomaly on Amazon EBS']);
    // First visit ever: nothing is "new".
    expect(composeLayout([sig('fresh', 70)]).band[0]?.isNew).toBe(false);
  });

  it('lets mutes and pins win over scores', () => {
    const signals = [sig('budget', 80), sig('anom', 70, 'anomaly')];
    const layout = composeLayout(signals, { pinned: ['ai'], muted: ['budget'] });
    expect(layout.band.map((b) => b.signal.id)).toEqual(['anom']);
    expect(layout.sections.cost.state).toBe('quiet');
    expect(layout.sections.ai.state).toBe('steady');
    expect(layout.sections.ai.pinned).toBe(true);
    expect(layout.muted).toEqual([{ kind: 'budget', hidden: 1 }]);
  });
});

describe('visit memory', () => {
  it('continues the visit within 30 minutes and starts a new one after', () => {
    const start = advanceVisit(undefined, 1_000);
    expect(start.baseline).toBeUndefined();
    const seen = recordSeen(start, [{ id: 'x', kind: 'budget', title: 'Budget' }], 2_000);
    const same = advanceVisit(seen, 2_000 + VISIT_GAP_MS - 1);
    expect(same.baseline).toBeUndefined();
    expect(same.current.seen).toHaveLength(1);
    const next = advanceVisit(same, 2_000 + 2 * VISIT_GAP_MS);
    expect(next.baseline?.seen.map((s) => s.id)).toEqual(['x']);
    expect(next.current.seen).toEqual([]);
  });

  it('records what the band showed as a union by id', () => {
    const m = recordSeen(
      recordSeen(advanceVisit(undefined, 0), [{ id: 'a', kind: 'budget', title: 'A' }], 1),
      [
        { id: 'a', kind: 'budget', title: 'A2' },
        { id: 'b', kind: 'idle', title: 'B' },
      ],
      2,
    );
    expect(m.current.seen.map((s) => `${s.id}:${s.title}`)).toEqual(['a:A2', 'b:B']);
  });
});
