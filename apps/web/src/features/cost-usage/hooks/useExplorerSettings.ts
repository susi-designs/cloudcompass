import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  DEFAULT_EXPLORER,
  GRANULARITY_OPTIONS,
  GROUP_BY_OPTIONS,
  METRIC_OPTIONS,
  type ExplorerSettings,
} from '../../../data/explorer';

const valid = <T extends string>(
  value: string | null,
  options: readonly { id: T }[],
  fallback: T,
): T => (options.some((o) => o.id === value) ? (value as T) : fallback);

/** Explorer settings live in the URL so a view can be bookmarked or shared. */
export function useExplorerSettings(): [
  ExplorerSettings,
  (change: Partial<ExplorerSettings>) => void,
] {
  const [params, setParams] = useSearchParams();
  const groupBy = params.get('groupBy');
  const granularity = params.get('granularity');
  const metric = params.get('metric');
  const settings = useMemo<ExplorerSettings>(
    () => ({
      groupBy: valid(groupBy, GROUP_BY_OPTIONS, DEFAULT_EXPLORER.groupBy),
      granularity: valid(granularity, GRANULARITY_OPTIONS, DEFAULT_EXPLORER.granularity),
      metric: valid(metric, METRIC_OPTIONS, DEFAULT_EXPLORER.metric),
    }),
    [groupBy, granularity, metric],
  );
  const update = useCallback(
    (change: Partial<ExplorerSettings>) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(change)) next.set(k, String(v));
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );
  return [settings, update];
}
