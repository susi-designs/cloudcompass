import { useMemo } from 'react';
import { computeOverview, type OverviewData } from './overview';
import { useScope } from './scopeContext';
import { useDataset } from './useDataset';
import { useEffectiveAnomalies } from './useAnomalies';
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
  // Open anomalies reflect triage on the Anomalies page.
  const anomalies = useEffectiveAnomalies();
  const data = useMemo(
    () =>
      dataset && recommendations && anomalies
        ? computeOverview({ ...dataset, recommendations, anomalies }, scope)
        : undefined,
    [dataset, recommendations, anomalies, scope],
  );
  return { data, isPending, error };
}
