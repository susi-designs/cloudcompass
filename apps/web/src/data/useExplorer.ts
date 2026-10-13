import { useMemo } from 'react';
import { computeExplorer, drillCrumbs, type ExplorerSettings } from './explorer';
import { useScope } from './scopeContext';
import { useDataset } from './useDataset';

export function useExplorer(settings: ExplorerSettings) {
  const { data: dataset, isPending, error } = useDataset();
  const { scope } = useScope();
  const data = useMemo(
    () => (dataset ? computeExplorer(dataset, scope, settings) : undefined),
    [dataset, scope, settings],
  );
  const crumbs = useMemo(() => (dataset ? drillCrumbs(dataset, scope) : []), [dataset, scope]);
  return { data, crumbs, isPending, error };
}
