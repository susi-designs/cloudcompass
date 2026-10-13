import { generateDataset } from '@cloudcompass/mock-data';
import { computeAiSpend, costOnModel, GPU_GROUP } from './aiSpend';
import { defaultScope } from './scope';

const ds = generateDataset();
const base = defaultScope();

describe('computeAiSpend', () => {
  const data = computeAiSpend(ds, base);

  it('splits total AI spend into LLM APIs and GPU clusters', () => {
    expect(data.kpis.llmCost).toBeGreaterThan(0);
    expect(data.kpis.gpuCost).toBeGreaterThan(0);
    expect(data.kpis.total).toBeCloseTo(data.kpis.llmCost + data.kpis.gpuCost, 2);
  });

  it('spend series adds up to the total and includes GPU clusters', () => {
    const sum = data.spendSeries.reduce((s, r) => s + r.value, 0);
    expect(sum).toBeCloseTo(data.kpis.total, -1);
    expect(new Set(data.spendSeries.map((r) => r.group)).has(GPU_GROUP)).toBe(true);
  });

  it('uses weekly buckets for a 90-day period', () => {
    expect(data.granularity).toBe('week');
    expect(new Set(data.tokenSeries.map((r) => r.date)).size).toBe(13);
  });

  it('feature costs add up to LLM spend, largest first', () => {
    expect(data.features.reduce((s, f) => s + f.cost, 0)).toBeCloseTo(data.kpis.llmCost, 2);
    const costs = data.features.map((f) => f.cost);
    expect([...costs].sort((a, b) => b - a)).toEqual(costs);
    for (const f of data.features) {
      expect(f.cacheHitPercent).toBeGreaterThanOrEqual(0);
      expect(f.cacheHitPercent).toBeLessThan(100);
    }
  });

  it('weights GPU utilization by hours', () => {
    expect(data.gpu).toHaveLength(4);
    expect(data.kpis.gpuUtilization).toBeGreaterThan(20);
    expect(data.kpis.gpuUtilization).toBeLessThan(90);
    for (const g of data.gpu) expect(g.idleCost).toBeLessThan(g.cost);
  });

  it('scopes to one LOB', () => {
    const payments = computeAiSpend(ds, { ...base, lobIds: ['lob-payments'] });
    expect(payments.features.every((f) => f.lob === 'Payments')).toBe(true);
    expect(payments.gpu.every((g) => g.application === 'Fraud Detection')).toBe(true);
    expect(payments.kpis.total).toBeLessThan(data.kpis.total);
  });

  it('has no AI spend in DEV (AI runs in PROD)', () => {
    const dev = computeAiSpend(ds, { ...base, environments: ['DEV'] });
    expect(dev.kpis.total).toBe(0);
    expect(dev.features).toHaveLength(0);
  });
});

describe('model comparison', () => {
  const data = computeAiSpend(ds, base);
  it('reproduces the current cost when priced on the model actually used', () => {
    const single = data.comparison.find((c) => c.currentModels.length === 1)!;
    const model = ds.aiModels.find((m) => m.model === single.currentModels[0])!;
    expect(costOnModel(single, model)).toBeCloseTo(single.currentCost, 0);
  });

  it('is cheaper on a smaller model', () => {
    const c = data.comparison[0]!;
    const big = ds.aiModels.find((m) => m.model === 'claude-sonnet')!;
    const small = ds.aiModels.find((m) => m.model === 'claude-haiku')!;
    expect(costOnModel(c, small)).toBeLessThan(costOnModel(c, big));
  });
});
