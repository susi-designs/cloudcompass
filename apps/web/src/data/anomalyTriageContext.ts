import { createContext, useContext } from 'react';
import type { AnomalyOverrideMap, TriageAction } from './anomalies';

export interface AnomalyTriageValue {
  /** Triage changes people made in this browser, keyed by anomaly id. */
  overrides: AnomalyOverrideMap;
  /** Apply an action to the given ids; returns how many changed and how many were skipped. */
  apply: (ids: readonly string[], action: TriageAction) => { updated: number; skipped: number };
  /** Discard all local changes. */
  reset: () => void;
  changeCount: number;
}

export const AnomalyTriageContext = createContext<AnomalyTriageValue | null>(null);

export function useAnomalyTriage(): AnomalyTriageValue {
  const ctx = useContext(AnomalyTriageContext);
  if (!ctx) throw new Error('useAnomalyTriage must be used inside <AnomalyTriageProvider>');
  return ctx;
}
