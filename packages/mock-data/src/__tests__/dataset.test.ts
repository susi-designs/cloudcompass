import { describe, expect, it } from 'vitest';
import { createRng, generateDataset } from '../index';

const small = { days: 60 } as const;

describe('createRng', () => {
  it('is deterministic for a given seed', () => {
    const a = createRng(7);
    const b = createRng(7);
    expect(Array.from({ length: 5 }, () => a.next())).toEqual(
      Array.from({ length: 5 }, () => b.next()),
    );
  });

  it('shuffle keeps every element', () => {
    const items = [1, 2, 3, 4, 5, 6];
    expect(createRng(1).shuffle(items).sort()).toEqual(items);
  });
});

describe('organizational hierarchy', () => {
  const ds = generateDataset(small);

  it('has 5 LOBs with 4 applications each', () => {
    expect(ds.lobs).toHaveLength(5);
    expect(ds.applications).toHaveLength(20);
    for (const lob of ds.lobs) {
      expect(ds.applications.filter((a) => a.lobId === lob.id)).toHaveLength(4);
    }
  });

  it('has exactly one account per application environment (DEV, TEST, PROD)', () => {
    expect(ds.accounts).toHaveLength(60);
    expect(new Set(ds.accounts.map((a) => a.id)).size).toBe(60);
    for (const app of ds.applications) {
      const envs = ds.accounts.filter((a) => a.applicationId === app.id).map((a) => a.environment);
      expect(envs.sort()).toEqual(['DEV', 'PROD', 'TEST']);
    }
  });

  it('keeps every account on its application cloud and LOB', () => {
    for (const account of ds.accounts) {
      const app = ds.applications.find((a) => a.id === account.applicationId);
      expect(app?.provider).toBe(account.provider);
      expect(app?.lobId).toBe(account.lobId);
    }
  });

  it('bills cost to all 60 accounts, tagged with the hierarchy', () => {
    expect(new Set(ds.costs.map((c) => c.BillingAccountId)).size).toBe(60);
    const accountById = new Map(ds.accounts.map((a) => [a.id, a]));
    for (const c of ds.costs.slice(0, 500)) {
      const account = accountById.get(c.BillingAccountId);
      expect(c.Tags.application).toBe(account?.applicationId);
      expect(c.Tags.lob).toBe(account?.lobId);
      expect(c.Tags.env).toBe(account?.environment);
    }
  });

  it('spends most in PROD', () => {
    const byEnv = { PROD: 0, TEST: 0, DEV: 0 } as Record<string, number>;
    for (const c of ds.costs) byEnv[c.Tags.env as string]! += c.BilledCost;
    expect(byEnv.PROD).toBeGreaterThan(byEnv.TEST!);
    expect(byEnv.TEST).toBeGreaterThan(byEnv.DEV!);
  });
});

describe('generateDataset', () => {
  it('produces identical data for the same seed', () => {
    expect(generateDataset(small)).toEqual(generateDataset(small));
  });

  it('produces different data for a different seed', () => {
    const a = generateDataset({ ...small, seed: 1 });
    const b = generateDataset({ ...small, seed: 2 });
    expect(a.costs[0]?.BilledCost).not.toEqual(b.costs[0]?.BilledCost);
  });

  it('covers 12 months of daily data across all three clouds by default', () => {
    const ds = generateDataset();
    expect(new Set(ds.costs.map((c) => c.ChargePeriodStart)).size).toBe(365);
    expect(new Set(ds.costs.map((c) => c.ProviderName))).toEqual(new Set(['AWS', 'Azure', 'GCP']));
    expect(ds.costs.at(-1)?.ChargePeriodStart).toBe('2026-10-09T00:00:00.000Z');
  });

  it('keeps cost fields consistent', () => {
    const ds = generateDataset(small);
    for (const c of ds.costs) {
      expect(c.BilledCost).toBeGreaterThanOrEqual(0);
      expect(c.EffectiveCost).toBeLessThanOrEqual(c.BilledCost);
      expect(c.ListCost).toBeGreaterThanOrEqual(c.BilledCost);
    }
  });

  it('generates data for every pillar, linked to real accounts', () => {
    const ds = generateDataset(small);
    const accountIds = new Set(ds.accounts.map((a) => a.id));
    expect(ds.utilization.length).toBeGreaterThan(0);
    expect(ds.commitments.length).toBeGreaterThan(0);
    expect(ds.aiUsage.length).toBeGreaterThan(0);
    expect(new Set(ds.aiUsage.map((a) => a.provider)).size).toBeGreaterThan(2);
    expect(ds.gpuUsage.length).toBe(60 * 4);
    expect(ds.recommendations.length).toBeGreaterThan(10);
    expect(ds.anomalies.length).toBeGreaterThan(0);
    for (const r of ds.recommendations) expect(accountIds.has(r.accountId)).toBe(true);
    for (const a of ds.anomalies) {
      expect(accountIds.has(a.accountId)).toBe(true);
      expect(a.actualCost).toBeGreaterThan(a.expectedCost);
    }
  });

  it('gives Data Platform a few anomalies, some still to triage', () => {
    const dp = generateDataset().anomalies.filter((a) => a.applicationId === 'app-data-platform');
    expect(dp).toHaveLength(5);
    expect(dp.filter((a) => a.status === 'Open' || a.status === 'Acknowledged')).toHaveLength(3);
  });

  it('gives anomalies root-cause details and triage fields that match their status', () => {
    const ds = generateDataset();
    const end = `${ds.meta.endDate}T23:59:59.999Z`;
    expect(ds.anomalies.length).toBeGreaterThan(20);
    expect(ds.anomalies.filter((a) => a.status === 'Open').length).toBeGreaterThan(3);
    for (const a of ds.anomalies) {
      expect(a.endedAt >= a.detectedAt).toBe(true);
      expect(a.endedAt <= end).toBe(true);
      expect(a.durationDays).toBeGreaterThanOrEqual(1);
      expect(a.impact).toBeCloseTo(a.actualCost - a.expectedCost, 1);
      expect(a.usageDrivers.reduce((s, d) => s + d.impact, 0)).toBeCloseTo(a.impact, 0);
      expect(a.usageDrivers.reduce((s, d) => s + d.share, 0)).toBeCloseTo(100, 0);
      expect(a.acknowledgedAt !== null).toBe(a.status !== 'Open');
      const closed = a.status === 'Resolved' || a.status === 'Expected';
      expect(a.resolvedAt !== null).toBe(closed);
      expect(a.expectedReason !== null).toBe(a.status === 'Expected');
      if (a.resolvedAt) {
        expect(a.resolvedAt >= a.endedAt).toBe(true);
        expect(a.resolvedAt <= end).toBe(true);
      }
      // The spike is visible in the billed cost of the resource that drove it.
      const billed = ds.costs
        .filter((c) => c.ResourceId === a.resourceId && c.ChargePeriodStart === a.detectedAt)
        .reduce((s, c) => s + c.BilledCost, 0);
      expect(billed).toBeGreaterThan(a.expectedCost / a.durationDays);
    }
  });

  it('gives recommendations workflow details that match their status', () => {
    const ds = generateDataset();
    const end = `${ds.meta.endDate}T23:59:59.999Z`;
    const statuses = new Set(ds.recommendations.map((r) => r.status));
    expect(statuses.size).toBe(5);
    for (const r of ds.recommendations) {
      expect(r.createdAt <= end).toBe(true);
      expect(r.implementedAt !== null).toBe(r.status === 'Implemented');
      expect(r.realizedMonthlySavings !== null).toBe(r.status === 'Implemented');
      expect(r.snoozedUntil !== null).toBe(r.status === 'Snoozed');
      expect(r.dismissReason !== null).toBe(r.status === 'Dismissed');
      if (r.status !== 'Open') expect(r.owner).not.toBeNull();
      if (r.implementedAt) {
        expect(r.implementedAt >= r.createdAt).toBe(true);
        expect(r.implementedAt <= end).toBe(true);
      }
      if (r.snoozedUntil) expect(r.snoozedUntil > end).toBe(true);
    }
  });

  it('generates daily and hourly utilization that agree with resource averages', () => {
    const ds = generateDataset(small);
    const measured = ds.utilization.filter((u) => u.avgCpuPercent > 0);
    expect(measured.length).toBeGreaterThan(20);
    expect(ds.utilizationSamples).toHaveLength(measured.length * 60);
    expect(ds.utilizationHourly).toHaveLength(measured.length);
    const r = measured[0]!;
    const last30 = ds.utilizationSamples.filter((s) => s.resourceId === r.resourceId).slice(-30);
    const mean = last30.reduce((s, x) => s + x.cpuPercent, 0) / 30;
    expect(mean).toBeCloseTo(r.avgCpuPercent, 0);
    const profile = ds.utilizationHourly.find((h) => h.resourceId === r.resourceId)!;
    expect(profile.cpuByHourOfWeek).toHaveLength(168);
    for (const s of ds.utilizationSamples) {
      expect(s.cpuPercent).toBeGreaterThanOrEqual(0);
      expect(s.cpuPercent).toBeLessThanOrEqual(100);
    }
  });

  it('rejects invalid options', () => {
    expect(() => generateDataset({ days: 0 })).toThrow();
  });
});
