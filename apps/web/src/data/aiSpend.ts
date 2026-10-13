import type { AiModelPrice } from '@cloudcompass/types';
import { addDays, daysBetween, type DayKey } from './dates';
import { bucketLabel, bucketStart, type Granularity } from './explorer';
import { percentChange } from './forecast';
import { inScope, type Scope } from './scope';
import type { MockDataset } from './source';

/** Charts switch from daily to weekly buckets beyond this many days. */
export const AI_DAILY_MAX_DAYS = 45;
export const GPU_GROUP = 'GPU clusters';
/** Window for "what would this cost on another model" (most recent days of the period). */
export const COMPARISON_WINDOW_DAYS = 30;

export interface FeatureRow {
  id: string;
  applicationId: string;
  application: string;
  lob: string;
  feature: string;
  models: string[];
  requests: number;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  cost: number;
  previousCost: number;
  change: number;
  changePercent: number | null;
  costPer1kRequests: number;
  /** cached ÷ (input + cached), 0–100. */
  cacheHitPercent: number;
}

export interface GpuRow {
  clusterName: string;
  gpuType: string;
  application: string;
  workload: 'Training' | 'Inference';
  gpuHours: number;
  /** GPU-hour weighted, 0–100. */
  utilizationPercent: number;
  cost: number;
  /** Cost of the unused share of GPU hours. */
  idleCost: number;
}

export interface ModelUsage {
  provider: string;
  model: string;
  requests: number;
  tokens: number;
  cost: number;
}

/** Token volumes for a feature over the comparison window. */
export interface FeatureTokens {
  featureId: string;
  label: string;
  currentModels: string[];
  currentCost: number;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
}

export interface AiSpendData {
  currency: string;
  period: { start: DayKey; end: DayKey; days: number };
  granularity: Granularity;
  kpis: {
    total: number;
    previous: number;
    change: number;
    changePercent: number | null;
    llmCost: number;
    gpuCost: number;
    tokens: number;
    requests: number;
    /** Blended LLM cost per 1M tokens. */
    costPerMillionTokens: number | null;
    cacheHitPercent: number | null;
    gpuUtilization: number | null;
  };
  /** Spend over time by provider, plus GPU clusters. */
  spendSeries: { group: string; date: DayKey; key: string; value: number }[];
  /** Tokens over time: input, output, cached. */
  tokenSeries: { group: string; date: DayKey; key: string; value: number }[];
  byModel: ModelUsage[];
  features: FeatureRow[];
  gpu: GpuRow[];
  comparison: FeatureTokens[];
  models: readonly AiModelPrice[];
}

/** Cost of a token volume on a given model (USD). */
export function costOnModel(
  t: Pick<FeatureTokens, 'inputTokens' | 'outputTokens' | 'cachedTokens'>,
  m: AiModelPrice,
): number {
  return (
    (t.inputTokens * m.inputPrice +
      t.outputTokens * m.outputPrice +
      t.cachedTokens * m.cachedPrice) /
    1_000_000
  );
}

export function computeAiSpend(ds: MockDataset, scope: Scope): AiSpendData {
  // AI usage is allocated to each application's account for the environment it runs in.
  const accountKey = new Map(ds.accounts.map((a) => [`${a.applicationId}|${a.environment}`, a]));
  const allowed = new Set(
    ds.accounts
      .filter((a) => inScope({ ...a, accountId: a.id }, scope))
      .map((a) => `${a.applicationId}|${a.environment}`),
  );
  const appById = new Map(ds.applications.map((a) => [a.id, a]));
  const lobName = new Map(ds.lobs.map((l) => [l.id, l.name]));

  const { start, end } = scope.dateRange;
  const days = daysBetween(start, end);
  const prevStart = addDays(start, -days);
  const prevEnd = addDays(start, -1);
  const granularity: Granularity = days > AI_DAILY_MAX_DAYS ? 'week' : 'day';
  const bucket = (d: DayKey) => bucketStart(d, granularity, start);
  const cmpStart = addDays(end, -(Math.min(COMPARISON_WINDOW_DAYS, days) - 1));

  const spend = new Map<string, number>(); // group|bucket
  const tokens = new Map<string, number>();
  const models = new Map<string, ModelUsage>();
  const features = new Map<string, FeatureRow>();
  const cmp = new Map<string, FeatureTokens>();
  let llmCost = 0;
  let prevTotal = 0;
  let totalTokens = 0;
  let requests = 0;
  let inputAll = 0;
  let cachedAll = 0;

  const add = (m: Map<string, number>, k: string, v: number) => m.set(k, (m.get(k) ?? 0) + v);

  for (const r of ds.aiUsage) {
    if (
      !allowed.has(`${r.applicationId}|${r.environment}`) ||
      !accountKey.has(`${r.applicationId}|${r.environment}`)
    )
      continue;
    const day = r.date.slice(0, 10);
    const featureId = `${r.applicationId}|${r.feature}`;
    if (day >= prevStart && day <= prevEnd) {
      prevTotal += r.cost;
      const f = features.get(featureId);
      if (f) f.previousCost += r.cost;
      else features.set(featureId, newFeature(featureId, r.applicationId, r.feature, r.cost));
      continue;
    }
    if (day < start || day > end) continue;

    const b = bucket(day);
    const tok = r.inputTokens + r.outputTokens + r.cachedTokens;
    llmCost += r.cost;
    totalTokens += tok;
    requests += r.requests;
    inputAll += r.inputTokens;
    cachedAll += r.cachedTokens;
    add(spend, `${r.provider}|${b}`, r.cost);
    add(tokens, `Input|${b}`, r.inputTokens);
    add(tokens, `Output|${b}`, r.outputTokens);
    add(tokens, `Cached input|${b}`, r.cachedTokens);

    const mu = models.get(r.model) ?? {
      provider: r.provider,
      model: r.model,
      requests: 0,
      tokens: 0,
      cost: 0,
    };
    mu.requests += r.requests;
    mu.tokens += tok;
    mu.cost += r.cost;
    models.set(r.model, mu);

    const f = features.get(featureId) ?? newFeature(featureId, r.applicationId, r.feature, 0);
    if (!f.models.includes(r.model)) f.models.push(r.model);
    f.requests += r.requests;
    f.inputTokens += r.inputTokens;
    f.outputTokens += r.outputTokens;
    f.cachedTokens += r.cachedTokens;
    f.cost += r.cost;
    features.set(featureId, f);

    if (day >= cmpStart) {
      const c = cmp.get(featureId) ?? {
        featureId,
        label: `${appById.get(r.applicationId)?.name ?? r.applicationId} — ${r.feature}`,
        currentModels: [],
        currentCost: 0,
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
      };
      if (!c.currentModels.includes(r.model)) c.currentModels.push(r.model);
      c.currentCost += r.cost;
      c.inputTokens += r.inputTokens;
      c.outputTokens += r.outputTokens;
      c.cachedTokens += r.cachedTokens;
      cmp.set(featureId, c);
    }
  }

  function newFeature(
    id: string,
    applicationId: string,
    feature: string,
    previousCost: number,
  ): FeatureRow {
    const app = appById.get(applicationId);
    return {
      id,
      applicationId,
      application: app?.name ?? applicationId,
      lob: lobName.get(app?.lobId ?? '') ?? '',
      feature,
      models: [],
      requests: 0,
      inputTokens: 0,
      outputTokens: 0,
      cachedTokens: 0,
      cost: 0,
      previousCost,
      change: 0,
      changePercent: null,
      costPer1kRequests: 0,
      cacheHitPercent: 0,
    };
  }

  // GPU clusters (allocated to the application's PROD account).
  const gpu = new Map<string, GpuRow & { utilHours: number }>();
  let gpuCost = 0;
  let gpuHours = 0;
  let gpuUtilHours = 0;
  for (const g of ds.gpuUsage) {
    if (!allowed.has(`${g.applicationId}|PROD`)) continue;
    const day = g.date.slice(0, 10);
    if (day >= prevStart && day <= prevEnd) {
      prevTotal += g.cost;
      continue;
    }
    if (day < start || day > end) continue;
    gpuCost += g.cost;
    gpuHours += g.gpuHours;
    gpuUtilHours += g.gpuHours * g.utilizationPercent;
    add(spend, `${GPU_GROUP}|${bucket(day)}`, g.cost);
    const row = gpu.get(g.clusterName) ?? {
      clusterName: g.clusterName,
      gpuType: g.gpuType,
      application: appById.get(g.applicationId)?.name ?? g.applicationId,
      workload: g.workload,
      gpuHours: 0,
      utilizationPercent: 0,
      cost: 0,
      idleCost: 0,
      utilHours: 0,
    };
    row.gpuHours += g.gpuHours;
    row.utilHours += g.gpuHours * g.utilizationPercent;
    row.cost += g.cost;
    row.idleCost += g.cost * (1 - g.utilizationPercent / 100);
    gpu.set(g.clusterName, row);
  }

  // Buckets present in the period, for complete series.
  const buckets: DayKey[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const b = bucket(d);
    if (buckets[buckets.length - 1] !== b) buckets.push(b);
  }
  // A last week cut off by the period end is flagged so its short bar isn't read as a drop.
  const keyFor = (b: DayKey) =>
    granularity === 'week' && addDays(b, 6) > end
      ? `${bucketLabel(b, granularity)} (partial)`
      : bucketLabel(b, granularity);
  const series = (map: Map<string, number>, groups: string[]) =>
    groups.flatMap((g) =>
      buckets.map((b) => ({
        group: g,
        date: b,
        key: keyFor(b),
        value: Math.round((map.get(`${g}|${b}`) ?? 0) * 100) / 100,
      })),
    );
  const providerTotals = new Map<string, number>();
  for (const [k, v] of spend) {
    const g = k.split('|')[0] ?? '';
    providerTotals.set(g, (providerTotals.get(g) ?? 0) + v);
  }
  const spendGroups = [...providerTotals.entries()]
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([g]) => g);

  const total = llmCost + gpuCost;
  const featureRows = [...features.values()]
    .filter((f) => f.cost > 0 || f.previousCost > 0)
    .map((f) => ({
      ...f,
      change: f.cost - f.previousCost,
      changePercent: percentChange(f.cost, f.previousCost),
      costPer1kRequests: f.requests === 0 ? 0 : (f.cost / f.requests) * 1000,
      cacheHitPercent:
        f.inputTokens + f.cachedTokens === 0
          ? 0
          : (f.cachedTokens / (f.inputTokens + f.cachedTokens)) * 100,
    }))
    .sort((a, b) => b.cost - a.cost);

  return {
    currency: ds.costs[0]?.BillingCurrency ?? 'USD',
    period: { start, end, days },
    granularity,
    kpis: {
      total,
      previous: prevTotal,
      change: total - prevTotal,
      changePercent: percentChange(total, prevTotal),
      llmCost,
      gpuCost,
      tokens: totalTokens,
      requests,
      costPerMillionTokens: totalTokens === 0 ? null : (llmCost / totalTokens) * 1_000_000,
      cacheHitPercent:
        inputAll + cachedAll === 0 ? null : (cachedAll / (inputAll + cachedAll)) * 100,
      gpuUtilization: gpuHours === 0 ? null : gpuUtilHours / gpuHours,
    },
    spendSeries: series(spend, spendGroups),
    tokenSeries: series(tokens, ['Input', 'Output', 'Cached input']),
    byModel: [...models.values()].sort((a, b) => b.cost - a.cost),
    features: featureRows,
    gpu: [...gpu.values()]
      .map(({ utilHours, ...r }) => ({
        ...r,
        utilizationPercent: r.gpuHours === 0 ? 0 : utilHours / r.gpuHours,
      }))
      .sort((a, b) => b.cost - a.cost),
    comparison: [...cmp.values()].sort((a, b) => b.currentCost - a.currentCost),
    models: ds.aiModels,
  };
}
