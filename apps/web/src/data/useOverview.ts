import { useMemo } from 'react';
import { computeOverview, type OverviewData } from './overview';
import { useScope } from './scopeContext';
import { useDataset } from './useDataset';
import { useEffectiveRecommendations } from './useOptimization';

export function useOverview(): {
  data: OverviewData | undefined;
  isPending: boolean;
  error: Error | null;
} {
  const { data: dataset, isPending, error } = useDataset();
  const { scope } = useScope();
  // Savings KPIs reflect workflow changes made on the Optimization page.
  const recommendations = useEffectiveRecommendations();
  const data = useMemo(
    () =>
      dataset && recommendations
        ? computeOverview({ ...dataset, recommendations }, scope)
        : undefined,
    [dataset, recommendations, scope],
  );
  return { data, isPending, error };
}
