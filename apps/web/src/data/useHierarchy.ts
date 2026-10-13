import { useMemo } from 'react';
import { useDataset } from './useDataset';

/** Org hierarchy (LOB → Application → Environment → Account) for filters and search. */
export function useHierarchy() {
  const { data } = useDataset();
  return useMemo(
    () => ({
      lobs: data?.lobs ?? [],
      applications: data?.applications ?? [],
      accounts: data?.accounts ?? [],
    }),
    [data],
  );
}
