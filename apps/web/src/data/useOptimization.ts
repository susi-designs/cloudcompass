import { useMemo } from 'react';
import { applyOverrides, computeLedger, computeOptimization } from './optimization';
import { useRecommendationWorkflow } from './recommendationWorkflowContext';
import { useScope } from './scopeContext';
import { useDataset } from './useDataset';

/** Recommendations with this browser's workflow changes applied. */
export function useEffectiveRecommendations() {
  const { data: dataset } = useDataset();
  const { overrides } = useRecommendationWorkflow();
  return useMemo(
    () => (dataset ? applyOverrides(dataset.recommendations, overrides) : undefined),
    [dataset, overrides],
  );
}

export function useOptimization() {
  const { data: dataset, isPending, error } = useDataset();
  const recs = useEffectiveRecommendations();
  const { scope } = useScope();
  const data = useMemo(
    () => (dataset && recs ? computeOptimization(dataset, recs, scope) : undefined),
    [dataset, recs, scope],
  );
  return { data, isPending, error };
}

export function useSavingsLedger() {
  const { data: dataset, isPending, error } = useDataset();
  const recs = useEffectiveRecommendations();
  const { scope } = useScope();
  const data = useMemo(
    () => (dataset && recs ? computeLedger(dataset, recs, scope) : undefined),
    [dataset, recs, scope],
  );
  return { data, isPending, error };
}
