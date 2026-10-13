import type { AiProvider, CurrencyCode, Environment, IsoDateTime } from './common';

/** Daily AI / LLM API usage for one model, team and feature. */
export interface AiUsageRecord {
  id: string;
  date: IsoDateTime;
  provider: AiProvider;
  model: string;
  lobId: string;
  applicationId: string;
  environment: Environment;
  feature: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  cost: number;
  currency: CurrencyCode;
}

/** Daily GPU cluster usage. */
export interface GpuUsageRecord {
  id: string;
  date: IsoDateTime;
  clusterName: string;
  gpuType: string;
  lobId: string;
  applicationId: string;
  workload: 'Training' | 'Inference';
  gpuHours: number;
  /** 0–100 (%). */
  utilizationPercent: number;
  cost: number;
  currency: CurrencyCode;
}

/** List price for an LLM, used for cost comparisons. USD per 1M tokens. */
export interface AiModelPrice {
  provider: AiProvider;
  model: string;
  inputPrice: number;
  outputPrice: number;
  cachedPrice: number;
}
