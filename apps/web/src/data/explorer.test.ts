import { generateDataset } from '@cloudcompass/mock-data';
import {
  bucketLabel,
  bucketStart,
  computeExplorer,
  DEFAULT_EXPLORER,
  drillCrumbs,
  drillScope,
  explorerCsv,
  OTHER_LABEL,
} from './explorer';
import { defaultScope, EMPTY_DIMENSIONS } from './scope';

const ds = generateDataset();
const base = defaultScope();

describe('bucketStart', () => {
  it('buckets weeks as 7-day blocks from the period start, and calendar months', () => {
    expect(bucketStart('2026-10-09', 'day', '2026-07-12')).toBe('2026-10-09');
    expect(bucketStart('2026-07-12', 'week', '2026-07-12')).toBe('2026-07-12');
    expect(bucketStart('2026-07-18', 'week', '2026-07-12')).toBe('2026-07-12');
    expect(bucketStart('2026-07-19', 'week', '2026-07-12')).toBe('2026-07-19');
    expect(bucketStart('2026-10-09', 'month', '2026-07-12')).toBe('2026-10-01');
  });

  it('labels buckets for the axis', () => {
    expect(bucketLabel('2026-07-12', 'week')).toBe('Week of Jul 12');
    expect(bucketLabel('2026-10-01', 'month')).toBe('Oct 2026');
    expect(bucketLabel('2026-10-09', 'day')).toBe('Oct 9');
  });
});

describe('computeExplorer', () => {
  it('groups by LOB with totals that add up', () => {
    const data = computeExplorer(ds, base, DEFAULT_EXPLORER);
    expect(data.rows).toHaveLength(5);
    const sum = data.rows.reduce((s, r) => s + r.total, 0);
    expect(sum).toBeCloseTo(data.totals.total, 2);
    expect(data.rows.reduce((s, r) => s + r.share, 0)).toBeCloseTo(100, 6);
    expect(data.drillTo).toBe('application');
  });

  it('sorts rows by spend, largest first', () => {
    const data = computeExplorer(ds, base, { ...DEFAULT_EXPLORER, groupBy: 'application' });
    const totals = data.rows.map((r) => r.total);
    expect([...totals].sort((a, b) => b - a)).toEqual(totals);
  });

  it('folds groups beyond the top 8 into "Other" in the chart', () => {
    const data = computeExplorer(ds, base, { ...DEFAULT_EXPLORER, groupBy: 'account' });
    expect(data.rows).toHaveLength(60);
    const groups = new Set(data.series.map((s) => s.group));
    expect(groups.size).toBe(9);
    expect(groups.has(OTHER_LABEL)).toBe(true);
    const chartSum = data.series.reduce((s, r) => s + r.value, 0);
    expect(chartSum).toBeCloseTo(data.totals.total, -1);
  });

  it('labels accounts with their name and shows the ID separately', () => {
    const data = computeExplorer(ds, base, { ...DEFAULT_EXPLORER, groupBy: 'account' });
    const row = data.rows[0]!;
    expect(row.detail).toBe(row.id);
    expect(row.label).toMatch(/-(prod|test|dev)$/);
  });

  it('effective cost is never above billed cost, list cost never below', () => {
    const billed = computeExplorer(ds, base, DEFAULT_EXPLORER).totals.total;
    const effective = computeExplorer(ds, base, { ...DEFAULT_EXPLORER, metric: 'effective' }).totals
      .total;
    const list = computeExplorer(ds, base, { ...DEFAULT_EXPLORER, metric: 'list' }).totals.total;
    expect(effective).toBeLessThan(billed);
    expect(list).toBeGreaterThan(billed);
  });

  it('uses fewer chart buckets for coarser granularity', () => {
    const daily = computeExplorer(ds, base, { ...DEFAULT_EXPLORER, granularity: 'day' });
    const monthly = computeExplorer(ds, base, { ...DEFAULT_EXPLORER, granularity: 'month' });
    const buckets = (d: typeof daily) => new Set(d.series.map((s) => s.date)).size;
    expect(buckets(daily)).toBe(90);
    expect(buckets(monthly)).toBe(4);
  });

  it('flags buckets cut off by the selected range as partial', () => {
    const monthly = computeExplorer(ds, base, { ...DEFAULT_EXPLORER, granularity: 'month' });
    const keys = [...new Set(monthly.series.map((s) => s.key))];
    expect(keys).toEqual(['Jul 2026 (partial)', 'Aug 2026', 'Sep 2026', 'Oct 2026 (partial)']);
  });

  it('does not drill from non-hierarchy groupings', () => {
    expect(
      computeExplorer(ds, base, { ...DEFAULT_EXPLORER, groupBy: 'service' }).drillTo,
    ).toBeNull();
  });
});

describe('drill-down', () => {
  it('walks LOB → application → environment → account and builds crumbs', () => {
    const lob = ds.lobs[3]!;
    let scope = { ...base, ...drillScope('lob', lob.id) };
    const apps = computeExplorer(ds, scope, { ...DEFAULT_EXPLORER, groupBy: 'application' });
    expect(apps.rows).toHaveLength(4);

    const app = apps.rows[0]!;
    scope = { ...scope, ...drillScope('application', app.id) };
    const envs = computeExplorer(ds, scope, { ...DEFAULT_EXPLORER, groupBy: 'environment' });
    expect(envs.rows.map((r) => r.id).sort()).toEqual(['DEV', 'PROD', 'TEST']);

    scope = { ...scope, ...drillScope('environment', 'PROD') };
    const accounts = computeExplorer(ds, scope, { ...DEFAULT_EXPLORER, groupBy: 'account' });
    expect(accounts.rows).toHaveLength(1);

    const crumbs = drillCrumbs(ds, scope);
    expect(crumbs.map((c) => c.label)).toEqual(['All', lob.name, app.label, 'PROD']);
    expect(crumbs[1]?.groupBy).toBe('application');
  });

  it('has only the "All" crumb when nothing is drilled', () => {
    expect(drillCrumbs(ds, EMPTY_DIMENSIONS).map((c) => c.label)).toEqual(['All']);
  });
});

describe('explorerCsv', () => {
  it('exports one line per row plus a header, with raw numbers', () => {
    const data = computeExplorer(ds, base, DEFAULT_EXPLORER);
    const lines = explorerCsv(data, 'Line of business').trim().split('\n');
    expect(lines).toHaveLength(6);
    expect(lines[0]).toContain('Selected period (USD)');
    expect(lines[1]).toMatch(/^[A-Za-z ]+,,\d+\.\d{2},/);
  });
});
