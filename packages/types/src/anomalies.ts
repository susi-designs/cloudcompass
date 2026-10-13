import type { CloudProvider, Environment, CurrencyCode, IsoDateTime } from './common';

export type AnomalySeverity = 'Critical' | 'High' | 'Medium' | 'Low';

export type AnomalyStatus = 'Open' | 'Acknowledged' | 'Expected' | 'Resolved';

export interface Anomaly {
  id: string;
  detectedAt: IsoDateTime;
  /** Dimension the anomaly was detected on, e.g. `ServiceName`. */
  dimension: string;
  /** Dimension value, e.g. `Amazon EC2`. */
  dimensionValue: string;
  lobId: string;
  applicationId: string;
  environment: Environment;
  accountId: string;
  provider: CloudProvider;
  expectedCost: number;
  actualCost: number;
  /** actualCost − expectedCost. */
  impact: number;
  /** impact ÷ expectedCost × 100. */
  impactPercent: number;
  currency: CurrencyCode;
  severity: AnomalySeverity;
  status: AnomalyStatus;
  rootCauseHint: string;
}
