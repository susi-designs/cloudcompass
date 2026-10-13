import type { CloudProvider, Environment } from '@cloudcompass/types';
import { addDays, type DayKey } from './dates';
import { DATA_BOUNDS } from './source';

/**
 * The global scope chosen in the filter bar. Empty arrays mean "all".
 * Applies to every page; the date range applies to time-series views.
 */
export interface Scope {
  dateRange: { start: DayKey; end: DayKey };
  providers: CloudProvider[];
  lobIds: string[];
  applicationIds: string[];
  environments: Environment[];
  accountIds: string[];
}

export type ScopeDimensions = Omit<Scope, 'dateRange'>;

export const EMPTY_DIMENSIONS: ScopeDimensions = {
  providers: [],
  lobIds: [],
  applicationIds: [],
  environments: [],
  accountIds: [],
};

/** Anything that can be placed in the org hierarchy. */
export interface ScopedItem {
  provider: CloudProvider | 'AI';
  lobId: string;
  applicationId: string;
  environment: Environment;
  accountId: string;
}

const passes = <T>(selected: readonly T[], value: T): boolean =>
  selected.length === 0 || selected.includes(value);

export function inScope(item: ScopedItem, scope: ScopeDimensions): boolean {
  return (
    (scope.providers.length === 0 ||
      (item.provider !== 'AI' && scope.providers.includes(item.provider))) &&
    passes(scope.lobIds, item.lobId) &&
    passes(scope.applicationIds, item.applicationId) &&
    passes(scope.environments, item.environment) &&
    passes(scope.accountIds, item.accountId)
  );
}

export function hasDimensionFilters(scope: ScopeDimensions): boolean {
  return Object.values(scope).some((v: readonly unknown[]) => v.length > 0);
}

/** Data bounds. Today these come from the mock dataset; with an API they'd come from metadata. */
export const DATA_END: DayKey = DATA_BOUNDS.end;
export const DATA_START: DayKey = addDays(DATA_END, -(DATA_BOUNDS.days - 1));
export const DEFAULT_RANGE_DAYS = 90;

export function defaultScope(): Scope {
  return {
    dateRange: { start: addDays(DATA_END, -(DEFAULT_RANGE_DAYS - 1)), end: DATA_END },
    ...EMPTY_DIMENSIONS,
  };
}
