import { useMemo } from 'react';
import { computeBudgets } from './budgets';
import { useScope } from './scopeContext';
import { useDataset } from './useDataset';

export function useBudgets() {
  const { data: dataset, isPending, error } = useDataset();
  const { scope } = useScope();
  const data = useMemo(
    () => (dataset ? computeBudgets(dataset, scope) : undefined),
    [dataset, scope],
  );
  return { data, isPending, error };
}
