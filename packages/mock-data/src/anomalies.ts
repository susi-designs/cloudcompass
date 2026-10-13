import type { Anomaly, AnomalySeverity, AnomalyStatus } from '@cloudcompass/types';
import { CURRENCY } from './catalog';
import { expectedDailyCost, type Spike, type Workload } from './cost';
import { addDays, iso, parseDay } from './dates';
import { createRng, round2 } from './random';

function severityFor(impact: number, impactPercent: number): AnomalySeverity {
  if (impact >= 5_000 || impactPercent >= 250) return 'Critical';
  if (impact >= 2_000 || impactPercent >= 150) return 'High';
  if (impact >= 500) return 'Medium';
  return 'Low';
}

const HINTS = [
  'New instances launched by an autoscaling event',
  'Data transfer increase between regions',
  'Untagged resources created in a new account',
  'Increased request volume after a release',
  'Backfill job ran longer than usual',
];

export function generateAnomalies(
  seed: number,
  endDate: string,
  days: number,
  workloads: readonly Workload[],
  spikes: readonly Spike[],
): Anomaly[] {
  const rng = createRng(seed);
  const end = parseDay(endDate);
  const byId = new Map(workloads.map((w) => [w.id, w]));

  return spikes
    .map((spike, i): Anomaly | null => {
      const w = byId.get(spike.workloadId);
      if (!w) return null;
      const date = addDays(end, spike.startIndex - days + 1);
      const expected = expectedDailyCost(w, date, spike.startIndex, days) * spike.durationDays;
      const actual = expected * spike.multiplier;
      const impact = actual - expected;
      const impactPercent = (impact / expected) * 100;
      const daysAgo = days - 1 - spike.startIndex;
      const status: AnomalyStatus =
        daysAgo < 14
          ? rng.pick<AnomalyStatus>(['Open', 'Open', 'Acknowledged'])
          : rng.pick<AnomalyStatus>(['Resolved', 'Resolved', 'Expected']);
      return {
        id: `anom-${i + 1}`,
        detectedAt: iso(date),
        dimension: 'ServiceName',
        dimensionValue: w.service.name,
        lobId: w.lob.id,
        applicationId: w.application.id,
        environment: w.environment,
        accountId: w.account.id,
        provider: w.application.provider,
        expectedCost: round2(expected),
        actualCost: round2(actual),
        impact: round2(impact),
        impactPercent: round2(impactPercent),
        currency: CURRENCY,
        severity: severityFor(impact, impactPercent),
        status,
        rootCauseHint: `${rng.pick(HINTS)} (${w.resourceName}, ${w.regionId})`,
      };
    })
    .filter((a): a is Anomaly => a !== null)
    .sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));
}
