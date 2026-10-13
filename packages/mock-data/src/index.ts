import type {
  AiModelPrice,
  AiUsageRecord,
  Anomaly,
  Application,
  BillingAccount,
  Commitment,
  FocusCostRecord,
  GpuUsageRecord,
  HourlyUtilizationProfile,
  Recommendation,
  LineOfBusiness,
  ResourceUtilization,
  UtilizationSample,
} from '@cloudcompass/types';
import { generateAiUsage, generateGpuUsage } from './ai';
import { generateAnomalies } from './anomalies';
import { ACCOUNTS, AI_MODELS, APPLICATIONS, LOBS } from './catalog';
import { generateCostRecords } from './cost';
import { resolveOptions, type MockDataOptions } from './options';
import { generateRecommendations } from './recommendations';
import { generateCommitments, generateUtilization } from './utilization';

export interface MockDataset {
  meta: Required<MockDataOptions>;
  lobs: readonly LineOfBusiness[];
  applications: readonly Application[];
  accounts: readonly BillingAccount[];
  costs: FocusCostRecord[];
  utilization: ResourceUtilization[];
  /** Daily CPU / memory for compute and database resources. */
  utilizationSamples: UtilizationSample[];
  /** Typical hour-of-week CPU profile per compute / database resource. */
  utilizationHourly: HourlyUtilizationProfile[];
  commitments: Commitment[];
  aiUsage: AiUsageRecord[];
  /** Illustrative LLM prices (USD per 1M tokens) for model cost comparison. */
  aiModels: readonly AiModelPrice[];
  gpuUsage: GpuUsageRecord[];
  recommendations: Recommendation[];
  anomalies: Anomaly[];
}

/**
 * Generate a complete, deterministic CloudCompass dataset.
 * Each pillar uses its own seed offset so changing one generator doesn't shift the others.
 */
export function generateDataset(options?: MockDataOptions): MockDataset {
  const meta = resolveOptions(options);
  const { seed, endDate, days } = meta;
  const { records, workloads, spikes } = generateCostRecords(seed, endDate, days);
  const utilization = generateUtilization(seed + 1, workloads, endDate, days);
  return {
    meta,
    lobs: LOBS,
    applications: APPLICATIONS,
    accounts: ACCOUNTS,
    costs: records,
    utilization: utilization.resources,
    utilizationSamples: utilization.samples,
    utilizationHourly: utilization.hourly,
    commitments: generateCommitments(seed + 2, endDate),
    aiUsage: generateAiUsage(seed + 3, endDate, days),
    aiModels: AI_MODELS,
    gpuUsage: generateGpuUsage(seed + 4, endDate, days),
    recommendations: generateRecommendations(seed + 5, endDate, workloads, utilization.resources),
    anomalies: generateAnomalies(seed + 6, endDate, days, workloads, spikes),
  };
}

export { createRng, type Rng } from './random';
export { UTILIZATION_WINDOW_DAYS } from './utilization';
export { DEFAULT_OPTIONS, type MockDataOptions } from './options';
export { LOBS, APPLICATIONS, ACCOUNTS, ENVIRONMENTS, SERVICES, AI_MODELS } from './catalog';
