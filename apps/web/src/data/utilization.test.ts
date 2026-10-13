import { generateDataset } from '@cloudcompass/mock-data';
import { defaultScope } from './scope';
import { computeUtilization, resourceStatus } from './utilization';

const ds = generateDataset();
const base = defaultScope();

describe('resourceStatus', () => {
  it('classifies by idle reason first, then CPU bands', () => {
    expect(resourceStatus(50, 'Low CPU utilization')).toBe('Idle');
    expect(resourceStatus(null, null)).toBe('Not measured');
    expect(resourceStatus(12, null)).toBe('Underutilized');
    expect(resourceStatus(55, null)).toBe('Healthy');
    expect(resourceStatus(91, null)).toBe('Hot');
  });
});

describe('computeUtilization', () => {
  const data = computeUtilization(ds, base);

  it('covers every resource and counts idle / under-utilized', () => {
    expect(data.resources).toHaveLength(ds.utilization.length);
    expect(data.kpis.idleCount).toBe(data.resources.filter((r) => r.status === 'Idle').length);
    expect(data.kpis.idleCount).toBeGreaterThan(0);
    expect(data.kpis.underutilizedCount).toBeGreaterThan(0);
  });

  it('cost-weights average CPU into a sensible range', () => {
    expect(data.kpis.avgCpu).toBeGreaterThan(5);
    expect(data.kpis.avgCpu).toBeLessThan(95);
    expect(data.kpis.avgMemory).toBeGreaterThan(data.kpis.avgCpu!);
  });

  it('puts every measured resource in exactly one CPU band', () => {
    expect(data.distribution).toHaveLength(10);
    expect(data.distribution.reduce((s, b) => s + b.value, 0)).toBe(data.kpis.measuredCount);
  });

  it('computes commitment coverage between 0 and 100%', () => {
    expect(data.kpis.commitmentCoverage).toBeGreaterThan(0);
    expect(data.kpis.commitmentCoverage).toBeLessThan(100);
  });

  it('builds a weekly application heatmap for a 90-day range', () => {
    expect(data.timeHeatmapGranularity).toBe('week');
    expect(data.timeHeatmapRowLabel).toBe('Application');
    expect(data.timeHeatmapColumns).toHaveLength(13);
    expect(new Set(data.timeHeatmap.map((c) => c.row)).size).toBe(20);
  });

  it('switches to daily columns and resource rows for one application over 30 days', () => {
    const scoped = computeUtilization(ds, {
      ...base,
      applicationIds: ['app-payment-gateway'],
      dateRange: { start: '2026-09-10', end: '2026-10-09' },
    });
    expect(scoped.timeHeatmapGranularity).toBe('day');
    expect(scoped.timeHeatmapRowLabel).toBe('Resource');
    expect(scoped.timeHeatmapColumns).toHaveLength(30);
    expect(scoped.resources.every((r) => r.applicationId === 'app-payment-gateway')).toBe(true);
  });

  it('has a 7 × 24 hour-of-week heatmap where weekday business hours run hotter than nights', () => {
    expect(data.hourHeatmap).toHaveLength(168);
    const at = (day: string, hour: string) =>
      data.hourHeatmap.find((c) => c.day === day && c.hour === hour)!.value;
    expect(at('Wed', '14:00')).toBeGreaterThan(at('Wed', '03:00'));
  });

  it('only shows commitments for clouds in scope', () => {
    const gcpOnly = computeUtilization(ds, { ...base, providers: ['GCP'] });
    expect(gcpOnly.commitments.every((c) => c.provider === 'GCP')).toBe(true);
    expect(gcpOnly.commitments.length).toBeGreaterThan(0);
  });
});
