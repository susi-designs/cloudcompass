import { useMemo } from 'react';
import { useScope } from './scopeContext';
import { useDataset } from './useDataset';
import { computeUtilization } from './utilization';

export function useUtilization() {
  const { data: dataset, isPending, error } = useDataset();
  const { scope } = useScope();
  const data = useMemo(
    () => (dataset ? computeUtilization(dataset, scope) : undefined),
    [dataset, scope],
  );
  return { data, isPending, error };
}
