import type { CloudProvider, Environment, CurrencyCode, IsoDateTime } from './common';

export type AnomalySeverity = 'Critical' | 'High' | 'Medium' | 'Low';

export type AnomalyStatus = 'Open' | 'Acknowledged' | 'Expected' | 'Resolved';

/** Why an anomaly was marked expected (feedback that tunes detection). */
export type AnomalyExpectedReason =
  | 'Planned launch or migration'
  | 'Seasonal or business peak'
  | 'Load or performance test'
  | 'Known pricing change';

/** Share of an anomaly's impact driven by one usage type (root-cause hint). */
export interface AnomalyUsageDriver {
  usageType: string;
  /** Part of `impact` attributed to this usage type. */
  impact: number;
  /** impact ÷ total impact × 100. */
  share: number;
}

export interface Anomaly {
  id: string;
  /** First day of the anomaly window (detection runs on daily spend). */
  detectedAt: IsoDateTime;
  /** Last day of the anomaly window (inclusive); the data end for ongoing anomalies. */
  endedAt: IsoDateTime;
  durationDays: number;
  /** Dimension the anomaly was detected on, e.g. `ServiceName`. */
  dimension: string;
  /** Dimension value, e.g. `Amazon EC2`. */
  dimensionValue: string;
  lobId: string;
  applicationId: string;
  environment: Environment;
  accountId: string;
  provider: CloudProvider;
  /** Resource and region that drove the change (FOCUS `ResourceId`, `RegionId`). */
  resourceId: string;
  resourceName: string;
  regionId: string;
  regionName: string;
  /** Cost over the anomaly window. */
  expectedCost: number;
  actualCost: number;
  /** actualCost − expectedCost. */
  impact: number;
  /** impact ÷ expectedCost × 100. */
  impactPercent: number;
  currency: CurrencyCode;
  severity: AnomalySeverity;
  status: AnomalyStatus;
  /** One-line explanation of the most likely cause. */
  rootCauseHint: string;
  /** Impact split by usage type, largest first. */
  usageDrivers: AnomalyUsageDriver[];
  /** Team the alert was routed to. */
  owner: string;
  acknowledgedAt: IsoDateTime | null;
  /** Set when the anomaly was resolved or marked expected. */
  resolvedAt: IsoDateTime | null;
  expectedReason: AnomalyExpectedReason | null;
  resolutionNote: string | null;
}
