export interface MockDataOptions {
  /** PRNG seed. Same seed → identical dataset. */
  seed?: number;
  /** Last day of data (inclusive), `YYYY-MM-DD`. Fixed by default so data is stable over time. */
  endDate?: string;
  /** Number of days of history. */
  days?: number;
}

export const DEFAULT_OPTIONS: Required<MockDataOptions> = {
  seed: 42,
  endDate: '2026-10-09',
  days: 365,
};

export function resolveOptions(options: MockDataOptions = {}): Required<MockDataOptions> {
  const resolved = { ...DEFAULT_OPTIONS, ...options };
  if (!Number.isInteger(resolved.days) || resolved.days < 1) {
    throw new Error(`days must be a positive integer, got ${resolved.days}`);
  }
  return resolved;
}
