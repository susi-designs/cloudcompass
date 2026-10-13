import { useMemo } from 'react';
import {
  anomalyDetail,
  applyAnomalyOverrides,
  computeAnomalies,
  type AnomalyRow,
} from './anomalies';
import { useAnomalyTriage } from './anomalyTriageContext';
import { useScope } from './scopeContext';
import { useDataset } from './useDataset';

/** Anomalies with this browser's triage changes applied. */
export function useEffectiveAnomalies() {
  const { data: dataset } = useDataset();
  const { overrides } = useAnomalyTriage();
  return useMemo(
    () => (dataset ? applyAnomalyOverrides(dataset.anomalies, overrides) : undefined),
    [dataset, overrides],
  );
}

export function useAnomalies() {
  const { data: dataset, isPending, error } = useDataset();
  const anomalies = useEffectiveAnomalies();
  const { scope } = useScope();
  const data = useMemo(
    () => (dataset && anomalies ? computeAnomalies(dataset, anomalies, scope) : undefined),
    [dataset, anomalies, scope],
  );
  return { data, isPending, error };
}

/** Daily cost of the anomaly's resource around the anomaly window. */
export function useAnomalyDetail(row: AnomalyRow | null) {
  const { data: dataset } = useDataset();
  return useMemo(() => (dataset && row ? anomalyDetail(dataset, row) : undefined), [dataset, row]);
}
