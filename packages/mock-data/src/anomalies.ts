import type {
  Anomaly,
  AnomalyExpectedReason,
  AnomalySeverity,
  AnomalyStatus,
  AnomalyUsageDriver,
  ServiceCategory,
} from '@cloudcompass/types';
import { CURRENCY } from './catalog';
import { expectedDailyCost, type Spike, type Workload } from './cost';
import { addDays, iso, parseDay } from './dates';
import { createRng, round2, type Rng } from './random';

function severityFor(impact: number, impactPercent: number): AnomalySeverity {
  if (impact >= 5_000 || impactPercent >= 250) return 'Critical';
  if (impact >= 2_000 || impactPercent >= 150) return 'High';
  if (impact >= 500) return 'Medium';
  return 'Low';
}

/** Root-cause hints by service category; the first matches the top usage driver. */
const HINTS: Record<ServiceCategory, readonly string[]> = {
  Compute: [
    'New instances launched by an autoscaling event',
    'Instances resized to a larger family after a release',
    'Scheduled shutdown skipped for non-business hours',
    'Spot capacity unavailable; workload fell back to on-demand',
    'Increased request volume after a release',
  ],
  Storage: [
    'Backfill job wrote a large volume of new objects',
    'Lifecycle rule disabled; objects not moved to a colder tier',
    'Request volume increased after a client retry storm',
    'Snapshot retention extended beyond the policy',
    'Replication enabled to a second region',
  ],
  Databases: [
    'Instance scaled up during a long-running migration',
    'Provisioned IOPS raised and not reverted',
    'Backup retention increased after an audit',
    'Read replica added for a reporting workload',
    'Backfill job ran longer than usual',
  ],
  Networking: [
    'Data transfer increase between regions',
    'NAT gateway processing a new outbound integration',
    'Internet egress grew after a CDN cache was bypassed',
    'Cross-zone traffic from a misconfigured load balancer',
    'Backfill job copied data across regions',
  ],
  'AI and Machine Learning': [
    'Training job ran on more GPUs than planned',
    'Inference endpoint scaled out and did not scale back',
    'Batch scoring job re-ran after a failure',
    'New model version deployed alongside the old one',
    'Increased request volume after a release',
  ],
  Analytics: [
    'Unpartitioned query scanned the full table repeatedly',
    'Cluster resized for month-end reporting',
    'Scheduled pipeline ran several times due to a retry loop',
    'New dashboard refreshing every minute',
    'Backfill job ran longer than usual',
  ],
  'Management and Governance': [
    'Debug logging left enabled after an incident',
    'Log ingestion grew after a new service was onboarded',
    'Metric cardinality grew from a new label',
    'Untagged resources created in a new account',
    'Retention period extended for audit',
  ],
  Security: [
    'Rule evaluations spiked during a traffic surge',
    'New managed rule group enabled',
    'Bot traffic increased request inspection volume',
    'Untagged resources created in a new account',
    'Logging enabled for every request',
  ],
};

/** Usage types (FOCUS SKU-level detail) that make up each category's cost. */
const USAGE_TYPES: Record<ServiceCategory, readonly string[]> = {
  Compute: ['On-demand instance hours', 'Attached block storage', 'Data transfer out'],
  Storage: ['Storage (GB-month)', 'PUT and GET requests', 'Data retrieval'],
  Databases: ['Instance hours', 'Provisioned IOPS', 'Backup storage'],
  Networking: ['Inter-region data transfer', 'NAT gateway processing', 'Internet egress'],
  'AI and Machine Learning': ['GPU instance hours', 'Inference requests', 'Model storage'],
  Analytics: ['Data scanned', 'Compute slot hours', 'Managed storage'],
  'Management and Governance': ['Log ingestion', 'Metrics and alarms', 'API requests'],
  Security: ['Rule evaluations', 'Request inspection', 'Logging'],
};

const EXPECTED_REASONS: readonly AnomalyExpectedReason[] = [
  'Planned launch or migration',
  'Seasonal or business peak',
  'Load or performance test',
  'Known pricing change',
];

const RESOLUTION_NOTES = [
  'Scaled back to the normal baseline.',
  'Configuration reverted; spend back to baseline.',
  'Fixed the job that caused the spike.',
  'Cleaned up the extra resources.',
];

function usageDrivers(rng: Rng, category: ServiceCategory, impact: number): AnomalyUsageDriver[] {
  const types = USAGE_TYPES[category];
  const top = rng.range(0.55, 0.85);
  const second = (1 - top) * rng.range(0.55, 0.85);
  const shares = [top, second, 1 - top - second];
  return types
    .map((usageType, i) => ({
      usageType,
      impact: round2(impact * (shares[i] ?? 0)),
      share: round2((shares[i] ?? 0) * 100),
    }))
    .sort((a, b) => b.impact - a.impact);
}

export function generateAnomalies(
  seed: number,
  endDate: string,
  days: number,
  workloads: readonly Workload[],
  spikes: readonly Spike[],
): Anomaly[] {
  const rng = createRng(seed);
  // Separate stream for the detail fields so statuses stay stable as fields are added.
  const detailRng = createRng(seed + 1_000);
  const end = parseDay(endDate);
  const byId = new Map(workloads.map((w) => [w.id, w]));

  return spikes
    .map((spike, i): Anomaly | null => {
      const w = byId.get(spike.workloadId);
      if (!w) return null;
      const date = addDays(end, spike.startIndex - days + 1);
      // Ongoing anomalies are cut off at the end of the data.
      const durationDays = Math.max(1, Math.min(spike.durationDays, days - spike.startIndex));
      let expected = 0;
      for (let d = 0; d < durationDays; d += 1) {
        expected += expectedDailyCost(w, addDays(date, d), spike.startIndex + d, days);
      }
      const actual = expected * spike.multiplier;
      const impact = actual - expected;
      const impactPercent = (impact / expected) * 100;
      const daysAgo = days - 1 - spike.startIndex;
      const status: AnomalyStatus =
        daysAgo < 14
          ? rng.pick<AnomalyStatus>(['Open', 'Open', 'Acknowledged'])
          : rng.pick<AnomalyStatus>(['Resolved', 'Resolved', 'Expected']);
      const hintIndex = rng.int(0, 4);
      const category = w.service.category;
      const drivers = usageDrivers(detailRng, category, impact);
      const hint = HINTS[category][hintIndex] ?? HINTS[category][0] ?? '';

      const endedAt = addDays(date, durationDays - 1);
      const acknowledged =
        status === 'Open' ? null : addDays(date, Math.min(daysAgo, detailRng.int(0, 1)));
      const closed = status === 'Resolved' || status === 'Expected';
      const resolved = closed
        ? addDays(
            endedAt,
            Math.min(days - 1 - (spike.startIndex + durationDays - 1), detailRng.int(0, 4)),
          )
        : null;
      return {
        id: `anom-${i + 1}`,
        detectedAt: iso(date),
        endedAt: iso(endedAt),
        durationDays,
        dimension: 'ServiceName',
        dimensionValue: w.service.name,
        lobId: w.lob.id,
        applicationId: w.application.id,
        environment: w.environment,
        accountId: w.account.id,
        provider: w.application.provider,
        resourceId: w.resourceId,
        resourceName: w.resourceName,
        regionId: w.regionId,
        regionName: w.regionName,
        expectedCost: round2(expected),
        actualCost: round2(actual),
        impact: round2(impact),
        impactPercent: round2(impactPercent),
        currency: CURRENCY,
        severity: severityFor(impact, impactPercent),
        status,
        rootCauseHint: `${hint} (${w.resourceName}, ${w.regionId})`,
        usageDrivers: drivers,
        owner: `${w.application.name} team`,
        acknowledgedAt: acknowledged ? iso(acknowledged) : null,
        resolvedAt: resolved ? iso(resolved) : null,
        expectedReason: status === 'Expected' ? detailRng.pick(EXPECTED_REASONS) : null,
        resolutionNote: status === 'Resolved' ? detailRng.pick(RESOLUTION_NOTES) : null,
      };
    })
    .filter((a): a is Anomaly => a !== null)
    .sort((a, b) => b.detectedAt.localeCompare(a.detectedAt) || a.id.localeCompare(b.id));
}
