import { DEFAULT_OPTIONS, generateDataset, type MockDataset } from '@cloudcompass/mock-data';

/**
 * The single seam between the UI and its data source (CLAUDE.md §7).
 * Today it returns deterministic mock data; in phase 2 swap this file for API calls.
 */
let cache: MockDataset | undefined;

export function loadDataset(): Promise<MockDataset> {
  cache ??= generateDataset();
  return Promise.resolve(cache);
}

/** First and last day with data, and how many days that covers. */
export const DATA_BOUNDS = {
  end: DEFAULT_OPTIONS.endDate,
  days: DEFAULT_OPTIONS.days,
} as const;

export type { MockDataset };
