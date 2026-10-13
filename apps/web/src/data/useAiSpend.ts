import { useMemo } from 'react';
import { computeAiSpend } from './aiSpend';
import { useScope } from './scopeContext';
import { useDataset } from './useDataset';

export function useAiSpend() {
  const { data: dataset, isPending, error } = useDataset();
  const { scope } = useScope();
  const data = useMemo(
    () => (dataset ? computeAiSpend(dataset, scope) : undefined),
    [dataset, scope],
  );
  return { data, isPending, error };
}
