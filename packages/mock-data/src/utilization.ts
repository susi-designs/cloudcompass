import type {
  Commitment,
  HourlyUtilizationProfile,
  IdleReason,
  ResourceUtilization,
  UtilizationSample,
} from '@cloudcompass/types';
import type { Workload } from './cost';
import { addDays, dayRange, iso, parseDay } from './dates';
import { createRng, round2, type Rng } from './random';

const STORAGE_IDLE: readonly IdleReason[] = ['Unattached volume', 'Stale snapshot'];
/** Window the resource-level averages describe. */
export const UTILIZATION_WINDOW_DAYS = 30;
const HOURS_PER_WEEK = 168;

export interface UtilizationData {
  resources: ResourceUtilization[];
  samples: UtilizationSample[];
  hourly: HourlyUtilizationProfile[];
}

const clamp = (v: number, min = 0, max = 100) => Math.min(max, Math.max(min, v));

const isMeasured = (w: Workload) =>
  w.service.category === 'Compute' || w.service.category === 'Databases';

/** Relative load for one hour of the week (Mon 00:00 = 0). PROD is diurnal; non-prod is business hours only. */
function hourShape(w: Workload, hourOfWeek: number): number {
  const day = Math.floor(hourOfWeek / 24); // 0 = Mon
  const hour = hourOfWeek % 24;
  const weekend = day >= 5;
  if (w.environment === 'PROD') {
    const diurnal = 0.65 + 0.55 * Math.max(0, Math.sin(((hour - 6) / 16) * Math.PI));
    return diurnal * (weekend ? 0.75 : 1);
  }
  const business = !weekend && hour >= 8 && hour < 19;
  return business ? 2.2 : 0.15;
}

function profileFor(rng: Rng, w: Workload, level: number): number[] {
  const raw = Array.from(
    { length: HOURS_PER_WEEK },
    (_, h) => hourShape(w, h) * (1 + rng.gaussian(0.06)),
  );
  const mean = raw.reduce((a, b) => a + b, 0) / HOURS_PER_WEEK;
  return raw.map((v) => Math.round(clamp((v / mean) * level) * 10) / 10);
}

/**
 * Resource utilization plus daily and hour-of-week time series. Resource-level averages are
 * the mean of the last 30 days of samples, so tables and charts always agree.
 */
export function generateUtilization(
  seed: number,
  workloads: readonly Workload[],
  endDate: string,
  days: number,
): UtilizationData {
  const rng = createRng(seed);
  const dates = dayRange(parseDay(endDate), days);
  const samples: UtilizationSample[] = [];
  const hourly: HourlyUtilizationProfile[] = [];

  const resources = workloads.map((w): ResourceUtilization => {
    const base = {
      resourceId: w.resourceId,
      resourceName: w.resourceName,
      resourceType: w.service.resourceType,
      provider: w.application.provider,
      lobId: w.lob.id,
      applicationId: w.application.id,
      accountId: w.account.id,
      environment: w.environment,
      region: w.regionId,
      monthlyCost: round2(w.dailyBase * (1 + w.growth) * 30),
    };

    if (!isMeasured(w)) {
      let idleReason: IdleReason | null = null;
      if (w.service.category === 'Storage' && rng.chance(0.3)) idleReason = rng.pick(STORAGE_IDLE);
      else if (w.service.category === 'Networking' && rng.chance(0.15))
        idleReason = 'Idle load balancer';
      return { ...base, avgCpuPercent: 0, avgMemoryPercent: 0, idleReason };
    }

    // Skewed: many under-utilized resources, as in real fleets. Non-prod idles more.
    const skew = w.environment === 'PROD' ? 1.3 : 2.2;
    const level = Math.pow(rng.next(), skew) * 88 + 2;
    const memGap = rng.range(5, 30);
    // Utilization drifts over the year toward today's level.
    const drift = rng.range(-0.25, 0.25);
    let recentCpu = 0;
    let recentMem = 0;
    dates.forEach((date, i) => {
      const weekday = date.getUTCDay();
      const weekend = weekday === 0 || weekday === 6;
      const weekly = w.environment === 'PROD' ? (weekend ? 0.8 : 1.05) : weekend ? 0.25 : 1.3;
      const t = i / Math.max(1, days - 1);
      const cpu = clamp(level * weekly * (1 - drift * (1 - t)) * (1 + rng.gaussian(0.08)), 0.5, 99);
      const mem = clamp(cpu + memGap + rng.gaussian(3), 1, 99);
      samples.push({
        resourceId: w.resourceId,
        date: iso(date).slice(0, 10),
        cpuPercent: Math.round(cpu * 10) / 10,
        memoryPercent: Math.round(mem * 10) / 10,
      });
      if (i >= days - UTILIZATION_WINDOW_DAYS) {
        recentCpu += cpu;
        recentMem += mem;
      }
    });
    const window = Math.min(UTILIZATION_WINDOW_DAYS, days);
    const avgCpu = round2(recentCpu / window);
    const avgMem = round2(recentMem / window);
    hourly.push({ resourceId: w.resourceId, cpuByHourOfWeek: profileFor(rng, w, avgCpu) });

    const idleReason: IdleReason | null =
      avgCpu < 8 ? (w.environment === 'PROD' ? 'Low CPU utilization' : 'Stopped instance') : null;
    return { ...base, avgCpuPercent: avgCpu, avgMemoryPercent: avgMem, idleReason };
  });

  return { resources, samples, hourly };
}

export function generateCommitments(seed: number, endDate: string): Commitment[] {
  const rng = createRng(seed);
  const end = parseDay(endDate);
  const defs = [
    { provider: 'AWS', type: 'Savings Plan' },
    { provider: 'AWS', type: 'Reserved Instance' },
    { provider: 'Azure', type: 'Reserved Instance' },
    { provider: 'Azure', type: 'Savings Plan' },
    { provider: 'GCP', type: 'Committed Use Discount' },
  ] as const;
  return defs.map((d, i) => ({
    id: `commit-${i + 1}`,
    provider: d.provider,
    type: d.type,
    utilizationPercent: round2(rng.range(68, 99)),
    coveragePercent: round2(rng.range(35, 80)),
    monthlyCommitment: round2(rng.range(8_000, 60_000)),
    expiresAt: iso(addDays(end, rng.int(20, 700))),
  }));
}
