import { generateDataset } from '@cloudcompass/mock-data';
import { computeBudgets } from './budgets';
import { appScope, computeAppSnapshot, topServices } from './myCloudCompass';
import { computeOverview } from './overview';
import { defaultScope } from './scope';

const ds = generateDataset();
const page = { ...defaultScope(), lobIds: ['lob-retail'], providers: ['GCP' as const] };

describe('My CloudCompass snapshot', () => {
  it('fixes the hierarchy to the application but keeps date range and environments', () => {
    const scope = appScope('app-trading-platform', { ...page, environments: ['PROD'] });
    expect(scope.applicationIds).toEqual(['app-trading-platform']);
    expect(scope.lobIds).toEqual([]);
    expect(scope.providers).toEqual([]);
    expect(scope.environments).toEqual(['PROD']);
    expect(scope.dateRange).toEqual(page.dateRange);
  });

  it('matches the pillar calculations for the same application scope', () => {
    const snap = computeAppSnapshot(
      ds,
      ds.recommendations,
      ds.anomalies,
      'app-trading-platform',
      page,
    )!;
    const scope = appScope('app-trading-platform', page);
    expect(snap.overview.mtd.value).toBeCloseTo(computeOverview(ds, scope).mtd.value, 6);
    expect(snap.budget?.forecast).toBeCloseTo(computeBudgets(ds, scope).rows[0]!.forecast, 6);
    expect(snap.accounts.map((a) => a.environment)).toEqual(['PROD', 'TEST', 'DEV']);
    expect(snap.lob).toBe('Wealth Management');
  });

  it('returns undefined for an unknown application', () => {
    expect(computeAppSnapshot(ds, ds.recommendations, ds.anomalies, 'nope', page)).toBeUndefined();
  });

  it('lists the top services largest first with change vs. the previous period', () => {
    const rows = topServices(ds, appScope('app-trading-platform', page), 5);
    expect(rows).toHaveLength(5);
    expect(rows.map((r) => r.current)).toEqual(
      [...rows.map((r) => r.current)].sort((a, b) => b - a),
    );
    for (const r of rows) expect(r.change).toBeCloseTo(r.current - r.previous, 6);
  });
});
