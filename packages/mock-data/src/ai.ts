import type { AiUsageRecord, GpuUsageRecord } from '@cloudcompass/types';
import { AI_APPS, AI_MODELS, CURRENCY, GPU_CLUSTERS, applicationById } from './catalog';
import { dayRange, iso, parseDay } from './dates';
import { createRng, round2 } from './random';

export function generateAiUsage(seed: number, endDate: string, days: number): AiUsageRecord[] {
  const rng = createRng(seed);
  // Each app/feature uses 1–2 models with a fixed traffic profile.
  const streams = AI_APPS.flatMap((app) =>
    app.features.flatMap((feature) => {
      const models = rng.shuffle(AI_MODELS).slice(0, rng.int(1, 2));
      return models.map((model) => ({
        app: applicationById(app.applicationId),
        feature,
        model,
        baseRequests: rng.int(2_000, 60_000),
        inputPerReq: rng.int(600, 3_500),
        outputPerReq: rng.int(150, 900),
        cachedShare: rng.range(0, 0.45),
        // AI usage grows faster than cloud: 2–6x over the year.
        growth: rng.range(2, 6),
      }));
    }),
  );

  const dates = dayRange(parseDay(endDate), days);
  const records: AiUsageRecord[] = [];
  dates.forEach((date, dayIndex) => {
    const t = dayIndex / Math.max(1, days - 1);
    const weekday = date.getUTCDay();
    const weekly = weekday === 0 || weekday === 6 ? 0.7 : 1;
    streams.forEach((s, i) => {
      const requests = Math.round(
        s.baseRequests * (1 + (s.growth - 1) * t) * weekly * Math.max(0.4, 1 + rng.gaussian(0.08)),
      );
      const totalInput = requests * s.inputPerReq;
      const cachedTokens = Math.round(totalInput * s.cachedShare);
      const inputTokens = totalInput - cachedTokens;
      const outputTokens = requests * s.outputPerReq;
      const cost =
        (inputTokens * s.model.inputPrice +
          outputTokens * s.model.outputPrice +
          cachedTokens * s.model.cachedPrice) /
        1_000_000;
      records.push({
        id: `ai-${i}-${dayIndex}`,
        date: iso(date),
        provider: s.model.provider,
        model: s.model.model,
        lobId: s.app.lobId,
        applicationId: s.app.id,
        environment: 'PROD',
        feature: s.feature,
        requests,
        inputTokens,
        outputTokens,
        cachedTokens,
        cost: round2(cost),
        currency: CURRENCY,
      });
    });
  });
  return records;
}

export function generateGpuUsage(seed: number, endDate: string, days: number): GpuUsageRecord[] {
  const rng = createRng(seed);
  const dates = dayRange(parseDay(endDate), days);
  const records: GpuUsageRecord[] = [];
  dates.forEach((date, dayIndex) => {
    GPU_CLUSTERS.forEach((c, i) => {
      const runningShare = c.workload === 'Training' ? rng.range(0.4, 1) : rng.range(0.85, 1);
      const gpuHours = round2(c.gpus * 24 * runningShare);
      records.push({
        id: `gpu-${i}-${dayIndex}`,
        date: iso(date),
        clusterName: c.clusterName,
        gpuType: c.gpuType,
        lobId: applicationById(c.applicationId).lobId,
        applicationId: c.applicationId,
        workload: c.workload,
        gpuHours,
        utilizationPercent: round2(
          Math.min(99, Math.max(5, (c.workload === 'Training' ? 72 : 48) + rng.gaussian(12))),
        ),
        cost: round2(gpuHours * c.hourlyRate),
        currency: CURRENCY,
      });
    });
  });
  return records;
}
