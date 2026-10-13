import { generateDataset } from '@cloudcompass/mock-data';
import {
  alertChannels,
  anomaliesCsv,
  anomalyDetail,
  applyAnomalyOverrides,
  applyTriage,
  canTriage,
  computeAnomalies,
  triageChanges,
} from './anomalies';
import { computeOverview } from './overview';
import { DATA_END, DATA_START, defaultScope } from './scope';

const ds = generateDataset();
const base = defaultScope();
const byStatus = (s: string) => ds.anomalies.filter((a) => a.status === s);
const today = `${DATA_END}T00:00:00.000Z`;

describe('triage transitions', () => {
  it('only allows valid transitions', () => {
    expect(canTriage('acknowledge', 'Open')).toBe(true);
    expect(canTriage('acknowledge', 'Acknowledged')).toBe(false);
    expect(canTriage('resolve', 'Acknowledged')).toBe(true);
    expect(canTriage('expect', 'Resolved')).toBe(false);
    expect(canTriage('reopen', 'Expected')).toBe(true);
    expect(canTriage('reopen', 'Open')).toBe(false);
  });

  it('records triage dates, reason and note; reopen clears them', () => {
    const open = byStatus('Open')[0]!;
    expect(triageChanges(open, { type: 'acknowledge' })).toEqual({
      status: 'Acknowledged',
      acknowledgedAt: today,
    });
    expect(
      triageChanges(open, { type: 'expect', reason: 'Load or performance test' }),
    ).toMatchObject({
      status: 'Expected',
      resolvedAt: today,
      expectedReason: 'Load or performance test',
    });
    const acked = byStatus('Acknowledged')[0]!;
    expect(triageChanges(acked, { type: 'resolve', note: '  Rolled back  ' })).toMatchObject({
      status: 'Resolved',
      acknowledgedAt: acked.acknowledgedAt,
      resolutionNote: 'Rolled back',
    });
    expect(triageChanges(byStatus('Resolved')[0]!, { type: 'reopen' })).toEqual({
      status: 'Open',
      acknowledgedAt: null,
      resolvedAt: null,
      expectedReason: null,
      resolutionNote: null,
    });
  });

  it('applies to many anomalies and skips those whose status does not allow it', () => {
    const ids = [byStatus('Open')[0]!.id, byStatus('Resolved')[0]!.id, 'missing'];
    const result = applyTriage(ds.anomalies, {}, ids, { type: 'acknowledge' });
    expect(result.updated).toBe(1);
    expect(result.skipped).toBe(2);
    const effective = applyAnomalyOverrides(ds.anomalies, result.overrides);
    expect(effective.find((a) => a.id === ids[0])?.status).toBe('Acknowledged');
  });
});

describe('computeAnomalies', () => {
  const data = computeAnomalies(ds, ds.anomalies, base);

  it('keeps anomalies needing triage in the feed whatever the date range', () => {
    const past = computeAnomalies(ds, ds.anomalies, {
      ...base,
      dateRange: { start: DATA_START, end: '2026-06-30' },
    });
    expect(past.rows.filter((r) => r.status === 'Open').length).toBe(data.counts.Open);
    expect(past.kpis.needsTriage).toBe(data.kpis.needsTriage);
    for (const r of past.rows) {
      const inRange = r.detectedAt <= '2026-06-30';
      expect(inRange || r.status === 'Open' || r.status === 'Acknowledged').toBe(true);
    }
  });

  it('sorts the feed newest first and counts every status', () => {
    const dates = data.rows.map((r) => r.detectedAt);
    expect(dates).toEqual([...dates].sort().reverse());
    expect(Object.values(data.counts).reduce((s, n) => s + n, 0)).toBe(data.rows.length);
  });

  it('matches the Overview open-anomalies KPI', () => {
    const overview = computeOverview(ds, base);
    expect(data.kpis.needsTriage).toBe(overview.anomalies.open);
    expect(data.kpis.needsTriageBySeverity).toEqual(overview.anomalies.bySeverity);
  });

  it('excludes expected anomalies from unexpected impact and the service breakdown', () => {
    const byService = data.impactByService.reduce((s, g) => s + g.impact, 0);
    expect(byService).toBeCloseTo(data.kpis.unexpectedImpact, 2);
    expect(data.timeline).toHaveLength(data.kpis.detected);
  });

  it('measures time to resolve from detection', () => {
    expect(data.kpis.mttrDays).not.toBeNull();
    expect(data.kpis.mttrDays!).toBeGreaterThan(0);
  });

  it('respects the hierarchy scope', () => {
    const lobId = ds.lobs[0]!.id;
    const scoped = computeAnomalies(ds, ds.anomalies, { ...base, lobIds: [lobId] });
    const lobName = ds.lobs[0]!.name;
    for (const r of scoped.rows) expect(r.lob).toBe(lobName);
  });
});

describe('anomaly detail', () => {
  it('shows the spike in the resource’s daily cost with context either side', () => {
    const row = computeAnomalies(ds, ds.anomalies, base).rows.find((r) => r.durationDays < 3)!;
    const detail = anomalyDetail(ds, row);
    const inside = detail.daily.filter((d) => d.anomalous);
    const before = detail.daily.filter((d) => d.date < row.detectedAt);
    expect(inside).toHaveLength(row.durationDays);
    expect(before).toHaveLength(14);
    const avgBefore = before.reduce((s, d) => s + d.cost, 0) / before.length;
    const avgInside = inside.reduce((s, d) => s + d.cost, 0) / inside.length;
    expect(avgInside).toBeGreaterThan(avgBefore * 1.3);
    expect(detail.expectedDaily).toBeCloseTo(row.expectedCost / row.durationDays, 6);
  });
});

describe('alerting and export', () => {
  it('routes more severe anomalies to more channels', () => {
    expect(alertChannels('Critical')).toContain('Webhook');
    expect(alertChannels('Low')).toEqual(['Email']);
  });

  it('exports one CSV line per row', () => {
    const data = computeAnomalies(ds, ds.anomalies, base);
    const csv = anomaliesCsv(data.rows);
    expect(csv.trim().split('\n')).toHaveLength(data.rows.length + 1);
    expect(csv.startsWith('ID,Detected,Ended,Severity')).toBe(true);
  });
});
