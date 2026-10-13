import type { CloudProvider, Environment, IsoDateTime } from './common';

export type IdleReason =
  | 'Low CPU utilization'
  | 'Unattached volume'
  | 'Stopped instance'
  | 'Stale snapshot'
  | 'Idle load balancer';

/** Daily average utilization for a compute or database resource. Values are 0–100 (%). */
export interface UtilizationSample {
  resourceId: string;
  /** Day (UTC), `YYYY-MM-DD`. */
  date: string;
  cpuPercent: number;
  memoryPercent: number;
}

/**
 * Typical CPU by hour of the week for a resource (last 30 days), 168 values,
 * Monday 00:00 UTC first. Values are 0–100 (%).
 */
export interface HourlyUtilizationProfile {
  resourceId: string;
  cpuByHourOfWeek: number[];
}

export interface ResourceUtilization {
  resourceId: string;
  resourceName: string;
  resourceType: string;
  provider: CloudProvider;
  lobId: string;
  applicationId: string;
  accountId: string;
  environment: Environment;
  region: string;
  avgCpuPercent: number;
  avgMemoryPercent: number;
  monthlyCost: number;
  idleReason: IdleReason | null;
}

export type CommitmentType = 'Reserved Instance' | 'Savings Plan' | 'Committed Use Discount';

export interface Commitment {
  id: string;
  provider: CloudProvider;
  type: CommitmentType;
  /** 0–100 (%) of commitment consumed. */
  utilizationPercent: number;
  /** 0–100 (%) of eligible spend covered. */
  coveragePercent: number;
  monthlyCommitment: number;
  expiresAt: IsoDateTime;
}
