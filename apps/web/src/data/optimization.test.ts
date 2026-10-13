import { generateDataset } from '@cloudcompass/mock-data';
import {
  actionChanges,
  applyAction,
  applyOverrides,
  canApply,
  computeLedger,
  computeOptimization,
} from './optimization';
import { computeOverview } from './overview';
import { DATA_END, DATA_START, defaultScope } from './scope';

const ds = generateDataset();
const base = defaultScope();
const recs = ds.recommendations;
const byStatus = (s: string) => recs.filter((r) => r.status === s);

describe('workflow transitions', () => {
  it('only allows valid transitions; implemented is final', () => {
    expect(canApply('accept', 'Open')).toBe(true);
    expect(canApply('implement', 'Open')).toBe(false);
    expect(canApply('implement', 'Accepted')).toBe(true);
    expect(canApply('reopen', 'Dismissed')).toBe(true);
    for (const a of ['assign', 'accept', 'snooze', 'dismiss', 'implement', 'reopen'] as const)
      expect(canApply(a, 'Implemented')).toBe(false);
  });

  it('snooze sets a return date; implement records realized savings from today', () => {
    const open = byStatus('Open')[0]!;
    expect(actionChanges(open, { type: 'snooze', days: 30 })).toMatchObject({
      status: 'Snoozed',
      snoozedUntil: '2026-11-08T00:00:00.000Z',
    });
    const accepted = byStatus('Accepted')[0]!;
    expect(actionChanges(accepted, { type: 'implement' })).toEqual({
      status: 'Implemented',
      implementedAt: `${DATA_END}T00:00:00.000Z`,
      realizedMonthlySavings: accepted.estimatedMonthlySavings,
    });
  });

  it('applies batches, skipping recommendations whose status does not allow the action', () => {
    const ids = [byStatus('Open')[0]!.id, byStatus('Implemented')[0]!.id, 'missing'];
    const result = applyAction(recs, {}, ids, { type: 'accept' });
    expect(result.updated).toBe(1);
    expect(result.skipped).toBe(2);
    const effective = applyOverrides(recs, result.overrides);
    expect(effective.find((r) => r.id === ids[0])?.status).toBe('Accepted');
  });
});

describe('computeOptimization', () => {
  const data = computeOptimization(ds, recs, base);

  it('counts every recommendation once by status', () => {
    const total = Object.values(data.counts).reduce((a, b) => a + b, 0);
    expect(total).toBe(recs.length);
    expect(data.counts.Open).toBe(byStatus('Open').length);
  });

  it('sums open savings consistently across KPIs and charts', () => {
    const byType = data.openByType.reduce((s, g) => s + g.savings, 0);
    const byLob = data.openByLob.reduce((s, g) => s + g.savings, 0);
    expect(byType).toBeCloseTo(data.kpis.openSavings, 2);
    expect(byLob).toBeCloseTo(data.kpis.openSavings, 2);
    expect(data.kpis.quickWinSavings).toBeLessThanOrEqual(data.kpis.openSavings);
  });

  it('respects the scope filters', () => {
    const lobId = ds.lobs[0]!.id;
    const scoped = computeOptimization(ds, recs, { ...base, lobIds: [lobId] });
    expect(scoped.rows.length).toBeGreaterThan(0);
    expect(scoped.rows.length).toBeLessThan(data.rows.length);
    expect(new Set(scoped.rows.map((r) => r.lob))).toEqual(new Set([ds.lobs[0]!.name]));
  });

  it('feeds workflow changes through to the Overview savings KPIs', () => {
    const open = byStatus('Open')[0]!;
    const before = computeOverview(ds, base).savings;
    const { overrides } = applyAction(recs, {}, [open.id], {
      type: 'dismiss',
      reason: 'Not applicable',
    });
    const after = computeOverview(
      { ...ds, recommendations: applyOverrides(recs, overrides) },
      base,
    ).savings;
    expect(after.openMonthly).toBeCloseTo(before.openMonthly - open.estimatedMonthlySavings, 2);
  });
});

describe('computeLedger', () => {
  const full = { ...base, dateRange: { start: DATA_START, end: DATA_END } };
  const data = computeLedger(ds, recs, full);

  it('has one bucket per month in range, flagging partial months', () => {
    expect(data.months.length).toBeGreaterThanOrEqual(12);
    expect(data.months[0]!.label).toMatch(/\(partial\)$/);
    expect(data.months.at(-1)!.label).toMatch(/\(partial\)$/);
  });

  it('totals the months and the per-recommendation savings the same way', () => {
    const byRow = data.rows.reduce((s, r) => s + r.realizedInPeriod, 0);
    expect(byRow).toBeCloseTo(data.kpis.realizedInPeriod, 0);
    expect(data.kpis.realizedInPeriod).toBeGreaterThan(0);
    expect(data.kpis.realizationPercent).toBeGreaterThan(60);
    expect(data.kpis.realizationPercent).toBeLessThan(110);
  });

  it('prorates by day from the implementation date', () => {
    const accepted = byStatus('Accepted')[0]!;
    const { overrides } = applyAction(recs, {}, [accepted.id], { type: 'implement' });
    const after = computeLedger(ds, applyOverrides(recs, overrides), full);
    const row = after.rows.find((r) => r.id === accepted.id)!;
    // One day (the as-of day) of a 31-day October.
    expect(row.realizedInPeriod).toBeCloseTo(accepted.estimatedMonthlySavings / 31, 1);
    expect(after.kpis.pipeline).toBeCloseTo(
      data.kpis.pipeline - accepted.estimatedMonthlySavings,
      2,
    );
  });
});
