import { generateDataset } from '@cloudcompass/mock-data';
import { budgetStatus, computeBudgets } from './budgets';
import { computeOverview } from './overview';
import { defaultScope } from './scope';

const ds = generateDataset();
const base = defaultScope();

describe('budgetStatus', () => {
  it('classifies by forecast % of budget', () => {
    expect(budgetStatus(80)).toBe('On track');
    expect(budgetStatus(90)).toBe('At risk');
    expect(budgetStatus(100)).toBe('At risk');
    expect(budgetStatus(100.1)).toBe('Over budget');
  });
});

describe('computeBudgets', () => {
  const data = computeBudgets(ds, base);

  it('has one row per application, worst first', () => {
    expect(data.rows).toHaveLength(20);
    const pcts = data.rows.map((r) => r.forecastPercent);
    expect([...pcts].sort((a, b) => b - a)).toEqual(pcts);
  });

  it('matches the Overview forecast and budget totals', () => {
    const overview = computeOverview(ds, base);
    expect(data.totals.forecast).toBeCloseTo(overview.forecast.value, 2);
    expect(data.totals.budget).toBe(overview.budget.budget);
  });

  it('counts every application in exactly one status', () => {
    const { counts } = data.totals;
    expect(counts['On track'] + counts['At risk'] + counts['Over budget']).toBe(20);
  });

  it('shows 6 months of history plus the current-month forecast', () => {
    expect(data.history).toHaveLength(7);
    expect(data.history.at(-1)?.isForecast).toBe(true);
    expect(data.history.at(-1)?.label).toBe('Oct 2026 (forecast)');
  });

  it('narrows to one LOB', () => {
    const scoped = computeBudgets(ds, { ...base, lobIds: ['lob-payments'] });
    expect(scoped.rows).toHaveLength(4);
    expect(new Set(scoped.rows.map((r) => r.lob))).toEqual(new Set(['Payments']));
  });

  it('flags partial scope when filtering by environment', () => {
    expect(computeBudgets(ds, { ...base, environments: ['DEV'] }).partialScope).toBe(true);
  });
});
