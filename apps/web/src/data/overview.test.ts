import { generateDataset } from '@cloudcompass/mock-data';
import { computeOverview } from './overview';
import { defaultScope, EMPTY_DIMENSIONS, type Scope } from './scope';

const ds = generateDataset();
const base = defaultScope();

describe('computeOverview', () => {
  const all = computeOverview(ds, base);

  it('reports as-of date and month-to-date window from the data', () => {
    expect(all.asOf).toBe('2026-10-09');
    expect(all.mtd.value).toBeGreaterThan(0);
    expect(all.mtd.previous).toBeGreaterThan(0);
  });

  it('forecasts at least the month-to-date spend', () => {
    expect(all.forecast.value).toBeGreaterThan(all.mtd.value);
  });

  it('sums budgets for all 20 applications when unscoped', () => {
    const total = ds.applications.reduce((s, a) => s + a.monthlyBudget, 0);
    expect(all.budget.budget).toBe(total);
    expect(all.budget.partialScope).toBe(false);
  });

  it('splits daily spend into PROD, TEST and DEV for every day in range', () => {
    const groups = new Set(all.dailyByEnvironment.map((r) => r.group));
    expect(groups).toEqual(new Set(['PROD', 'TEST', 'DEV']));
    expect(all.dailyByEnvironment.filter((r) => r.group === 'PROD')).toHaveLength(90);
    const sum = all.dailyByEnvironment.reduce((s, r) => s + r.value, 0);
    expect(sum).toBeCloseTo(all.period.total, -1);
  });

  it('shows all 5 LOBs, largest first', () => {
    expect(all.spendByLob).toHaveLength(5);
    const values = all.spendByLob.map((l) => l.value);
    expect([...values].sort((a, b) => b - a)).toEqual(values);
  });

  it('ranks top movers by absolute change', () => {
    expect(all.topMovers).toHaveLength(10);
    const changes = all.topMovers.map((m) => Math.abs(m.change));
    expect([...changes].sort((a, b) => b - a)).toEqual(changes);
  });

  it('narrows everything to a single LOB', () => {
    const lob = ds.lobs[0]!;
    const scoped = computeOverview(ds, { ...base, lobIds: [lob.id] });
    expect(scoped.spendByLob.map((l) => l.group)).toEqual([lob.name]);
    expect(scoped.mtd.value).toBeLessThan(all.mtd.value);
    expect(scoped.topMovers.length).toBeLessThanOrEqual(4);
  });

  it('flags budgets as partial when filtering by environment', () => {
    const prodOnly: Scope = { ...base, ...EMPTY_DIMENSIONS, environments: ['PROD'] };
    const scoped = computeOverview(ds, prodOnly);
    expect(scoped.budget.partialScope).toBe(true);
    expect(new Set(scoped.dailyByEnvironment.map((r) => r.group))).toEqual(new Set(['PROD']));
  });

  it('scopes to one account', () => {
    const account = ds.accounts.find((a) => a.environment === 'DEV')!;
    const scoped = computeOverview(ds, { ...base, accountIds: [account.id] });
    expect(scoped.topMovers).toHaveLength(1);
    expect(scoped.topMovers[0]?.applicationId).toBe(account.applicationId);
  });
});
