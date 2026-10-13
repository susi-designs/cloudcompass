import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { applyTriage, type AnomalyOverrideMap, type TriageAction } from './anomalies';
import { AnomalyTriageContext } from './anomalyTriageContext';
import { useDataset } from './useDataset';

/**
 * Until there is an API, triage changes (acknowledge, mark expected, resolve, reopen) are
 * kept in this browser's storage and layered over the mock data.
 */
export const TRIAGE_STORAGE_KEY = 'cloudcompass.anomalies.v1';

function readOverrides(): AnomalyOverrideMap {
  try {
    const raw = window.localStorage.getItem(TRIAGE_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed))
      return parsed as AnomalyOverrideMap;
  } catch {
    // Unavailable or corrupt storage: start clean.
  }
  return {};
}

function writeOverrides(value: AnomalyOverrideMap): void {
  try {
    if (Object.keys(value).length === 0) window.localStorage.removeItem(TRIAGE_STORAGE_KEY);
    else window.localStorage.setItem(TRIAGE_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Non-fatal: changes last for this session only.
  }
}

export function AnomalyTriageProvider({ children }: { children: ReactNode }) {
  const { data: dataset } = useDataset();
  const [overrides, setOverrides] = useState<AnomalyOverrideMap>(readOverrides);

  const apply = useCallback(
    (ids: readonly string[], action: TriageAction) => {
      if (!dataset) return { updated: 0, skipped: ids.length };
      // Work from the effective status so chained actions (acknowledge → resolve) validate.
      const effective = dataset.anomalies.map((a) => ({ ...a, ...overrides[a.id] }));
      const result = applyTriage(effective, overrides, ids, action);
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

  return <AnomalyTriageContext.Provider value={value}>{children}</AnomalyTriageContext.Provider>;
}
