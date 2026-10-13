import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { loadDataset } from './source';

/** The full dataset. Prefer the scoped hooks (e.g. `useOverview`) in components. */
export function useDataset() {
  return useQuery({ queryKey: queryKeys.dataset, queryFn: loadDataset });
}
