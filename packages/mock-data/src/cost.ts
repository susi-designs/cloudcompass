import type {
  Application,
  BillingAccount,
  Environment,
  FocusCostRecord,
  LineOfBusiness,
  PricingCategory,
} from '@cloudcompass/types';
import {
  APPLICATIONS,
  CURRENCY,
  ENVIRONMENTS,
  ENVIRONMENT_WEIGHT,
  LOBS,
  REGIONS,
  SERVICES,
  accountFor,
  type ServiceDef,
} from './catalog';
import { addDays, dayRange, iso, parseDay, startOfMonth, startOfNextMonth } from './dates';
import { createRng, round2, type Rng } from './random';

/** One service running in one application environment — one cost line per day. */
export interface Workload {
  id: string;
  lob: LineOfBusiness;
  application: Application;
  environment: Environment;
  account: BillingAccount;
  service: ServiceDef;
  regionId: string;
  regionName: string;
  resourceId: string;
  resourceName: string;
  dailyBase: number;
  /** Change in run-rate over the year for this application (e.g. 0.3 = +30%). */
  growth: number;
  pricing: PricingCategory;
}

/** A deliberate cost spike, used to seed the Anomalies pillar. */
export interface Spike {
  workloadId: string;
  startIndex: number;
  durationDays: number;
  multiplier: number;
}

const COMMITTED_DISCOUNT = 0.28;
const LIST_PREMIUM = 0.18;
/** Yearly run-rate change per application: most grow, a few shrink after optimization work. */
const GROWTH_RANGE: readonly [number, number] = [-0.2, 0.6];

function lobById(id: string): LineOfBusiness {
  const lob = LOBS.find((l) => l.id === id);
  if (!lob) throw new Error(`Unknown LOB ${id}`);
  return lob;
}

function pickServices(rng: Rng, app: Application): ServiceDef[] {
  const available = SERVICES.filter((s) => s.provider === app.provider);
  const compute = available.filter((s) => s.category === 'Compute');
  const anchor = rng.pick(compute);
  const others = rng.shuffle(available.filter((s) => s !== anchor)).slice(0, rng.int(2, 4));
  return [anchor, ...others];
}

export function buildWorkloads(rng: Rng): Workload[] {
  const workloads: Workload[] = [];
  const envWeightSum = ENVIRONMENTS.reduce((sum, e) => sum + ENVIRONMENT_WEIGHT[e], 0);
  for (const app of APPLICATIONS) {
    const lob = lobById(app.lobId);
    const services = pickServices(rng, app);
    const region = rng.pick(REGIONS[app.provider]);
    const weights = services.map((s) => s.baseDailyCost * rng.range(0.6, 1.4));
    const weightSum = weights.reduce((a, b) => a + b, 0);
    // Land each app's run-rate near (but not exactly at) its monthly budget.
    const growth = rng.range(...GROWTH_RANGE);
    const monthlyTarget = app.monthlyBudget * rng.range(0.82, 1.04);
    // Target is today's run-rate; the start of the year is lower (or higher) by `growth`.
    const dailyTarget = monthlyTarget / 30 / (1 + growth);
    for (const environment of ENVIRONMENTS) {
      const account = accountFor(app.id, environment);
      services.forEach((service, i) => {
        const share = (weights[i] ?? 0) / weightSum;
        const envShare = ENVIRONMENT_WEIGHT[environment] / envWeightSum;
        const resourceName = `${account.name}-${service.resourceType.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
        workloads.push({
          id: `wl-${account.name}-${i + 1}`,
          lob,
          application: app,
          environment,
          account,
          service,
          regionId: region.id,
          regionName: region.name,
          resourceId: `${app.provider.toLowerCase()}:${region.id}:${account.id}:${resourceName}`,
          resourceName,
          dailyBase: dailyTarget * share * envShare,
          growth,
          pricing:
            service.committable && environment === 'PROD' && rng.chance(0.6)
              ? 'Committed'
              : 'Standard',
        });
      });
    }
  }
  return workloads;
}

export function buildSpikes(rng: Rng, workloads: readonly Workload[], days: number): Spike[] {
  const candidates = workloads.filter((w) => w.environment !== 'DEV');
  const window = Math.min(150, days);
  return Array.from({ length: 14 }, (_, i) => ({
    workloadId: rng.pick(candidates).id,
    // The first few land in the last ~10 days so there are always open anomalies to triage.
    startIndex: days - (i < 3 ? rng.int(2, Math.min(10, days)) : rng.int(2, window)),
    durationDays: rng.int(1, 4),
    multiplier: rng.range(1.8, 4),
  })).filter((s) => s.startIndex >= 0);
}

export function spikeMultiplier(
  spikes: readonly Spike[],
  workloadId: string,
  dayIndex: number,
): number {
  let m = 1;
  for (const s of spikes) {
    if (
      s.workloadId === workloadId &&
      dayIndex >= s.startIndex &&
      dayIndex < s.startIndex + s.durationDays
    ) {
      m *= s.multiplier;
    }
  }
  return m;
}

/** Expected (un-spiked) daily cost — shared with the anomaly generator. */
export function expectedDailyCost(
  workload: Workload,
  date: Date,
  dayIndex: number,
  days: number,
): number {
  const weekday = date.getUTCDay();
  const isWeekend = weekday === 0 || weekday === 6;
  // Non-prod compute is scheduled off at weekends; prod dips slightly.
  const weekly =
    workload.service.category === 'Compute' && isWeekend
      ? workload.environment === 'PROD'
        ? 0.88
        : 0.55
      : 1;
  const trend = 1 + workload.growth * (dayIndex / Math.max(1, days - 1));
  return workload.dailyBase * weekly * trend;
}

export function generateCostRecords(
  seed: number,
  endDate: string,
  days: number,
): { records: FocusCostRecord[]; workloads: Workload[]; spikes: Spike[] } {
  const rng = createRng(seed);
  const workloads = buildWorkloads(rng);
  const spikes = buildSpikes(rng, workloads, days);
  const dates = dayRange(parseDay(endDate), days);
  const records: FocusCostRecord[] = [];

  dates.forEach((date, dayIndex) => {
    const chargeStart = iso(date);
    const chargeEnd = iso(addDays(date, 1));
    const periodStart = iso(startOfMonth(date));
    const periodEnd = iso(startOfNextMonth(date));
    for (const w of workloads) {
      const noise = Math.max(0.5, 1 + rng.gaussian(0.05));
      const cost = round2(
        expectedDailyCost(w, date, dayIndex, days) *
          noise *
          spikeMultiplier(spikes, w.id, dayIndex),
      );
      const effective = round2(w.pricing === 'Committed' ? cost * (1 - COMMITTED_DISCOUNT) : cost);
      records.push({
        id: `${w.id}-${dayIndex}`,
        BillingAccountId: w.account.id,
        BillingAccountName: w.account.name,
        SubAccountId: w.account.id,
        SubAccountName: w.account.name,
        ProviderName: w.application.provider,
        PublisherName: w.application.provider,
        InvoiceIssuerName: w.application.provider,
        BillingCurrency: CURRENCY,
        BillingPeriodStart: periodStart,
        BillingPeriodEnd: periodEnd,
        ChargePeriodStart: chargeStart,
        ChargePeriodEnd: chargeEnd,
        ChargeCategory: 'Usage',
        PricingCategory: w.pricing,
        ServiceCategory: w.service.category,
        ServiceName: w.service.name,
        RegionId: w.regionId,
        RegionName: w.regionName,
        ResourceId: w.resourceId,
        ResourceName: w.resourceName,
        ResourceType: w.service.resourceType,
        SkuId: `${w.service.name.replace(/\s+/g, '')}-${w.service.unit.replace(/\W+/g, '')}`,
        ConsumedQuantity: round2(cost / w.service.unitPrice),
        ConsumedUnit: w.service.unit,
        BilledCost: cost,
        EffectiveCost: effective,
        ListCost: round2(cost * (1 + LIST_PREMIUM)),
        ContractedCost: cost,
        Tags: { lob: w.lob.id, application: w.application.id, env: w.environment },
      });
    }
  });

  return { records, workloads, spikes };
}
