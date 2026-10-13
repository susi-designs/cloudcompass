import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { applyAction, type OverrideMap, type WorkflowAction } from './optimization';
import { RecommendationWorkflowContext } from './recommendationWorkflowContext';
import { useDataset } from './useDataset';

/**
 * Until there is an API, workflow changes (assign, accept, snooze, dismiss, implement) are
 * kept in this browser's storage and layered over the mock data.
 */
export const WORKFLOW_STORAGE_KEY = 'cloudcompass.recommendations.v1';

function readOverrides(): OverrideMap {
  try {
    const raw = window.localStorage.getItem(WORKFLOW_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed))
      return parsed as OverrideMap;
  } catch {
    // Unavailable or corrupt storage: start clean.
  }
  return {};
}

function writeOverrides(value: OverrideMap): void {
  try {
    if (Object.keys(value).length === 0) window.localStorage.removeItem(WORKFLOW_STORAGE_KEY);
    else window.localStorage.setItem(WORKFLOW_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Non-fatal: changes last for this session only.
  }
}

export function RecommendationWorkflowProvider({ children }: { children: ReactNode }) {
  const { data: dataset } = useDataset();
  const [overrides, setOverrides] = useState<OverrideMap>(readOverrides);

  const apply = useCallback(
    (ids: readonly string[], action: WorkflowAction) => {
      if (!dataset) return { updated: 0, skipped: ids.length };
      // Work from the effective status so chained actions (accept → implement) validate.
      const effective = dataset.recommendations.map((r) => ({ ...r, ...overrides[r.id] }));
      const result = applyAction(effective, overrides, ids, action);
      setOverrides(result.overrides);
      writeOverrides(result.overrides);
      return { updated: result.updated, skipped: result.skipped };
    },
    [dataset, overrides],
  );

  const reset = useCallback(() => {
    setOverrides({});
    writeOverrides({});
  }, []);

  const value = useMemo(
    () => ({ overrides, apply, reset, changeCount: Object.keys(overrides).length }),
    [overrides, apply, reset],
  );

  return (
    <RecommendationWorkflowContext.Provider value={value}>
      {children}
    </RecommendationWorkflowContext.Provider>
  );
}
