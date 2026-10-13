import { useEffect, useMemo } from 'react';
import { computeAppSnapshot, type AppSnapshot } from './myCloudCompass';
import { useMyCloudCompass } from './myCloudCompassContext';
import { useScope } from './scopeContext';
import {
  advanceVisit,
  buildSignals,
  composeLayout,
  recordSeen,
  type AdaptiveLayout,
  type Signal,
} from './signals';
import { useEffectiveAnomalies } from './useAnomalies';
import { useDataset } from './useDataset';
import { useEffectiveRecommendations } from './useOptimization';

/**
 * Everything My CloudCompass shows for one application, plus its scored signals.
 * Uses the effective recommendations and anomalies, so workflow and triage changes made on the
 * pillar pages show here too.
 */
export function useAppSnapshot(appId: string | null): {
  snapshot: AppSnapshot | undefined;
  signals: Signal[] | undefined;
  isPending: boolean;
  error: Error | null;
} {
  const { data: dataset, isPending, error } = useDataset();
  const { scope } = useScope();
  const recommendations = useEffectiveRecommendations();
  const anomalies = useEffectiveAnomalies();
  const snapshot = useMemo(
    () =>
      dataset && recommendations && anomalies && appId
        ? computeAppSnapshot(dataset, recommendations, anomalies, appId, scope)
        : undefined,
    [dataset, recommendations, anomalies, appId, scope],
  );
  const signals = useMemo(() => (snapshot ? buildSignals(snapshot) : undefined), [snapshot]);
  return { snapshot, signals, isPending, error };
}

/**
 * Compose the adaptive layout for this visit and remember what the band showed.
 * The visit memory is read once per application view, so "New" / "Resolved" tags stay put while
 * the user reads; it advances to a new visit after 30 minutes away (PRODUCT.md §5.1).
 */
export function useAdaptiveLayout(
  appId: string | null,
  signals: Signal[] | undefined,
  titleOf: (signal: Signal) => string,
): AdaptiveLayout | undefined {
  const { prefsFor, readVisit, writeVisit } = useMyCloudCompass();
  const prefs = appId ? prefsFor(appId) : undefined;
  // Read once per application view (`readVisit` is stable).
  const memory = useMemo(
    () => (appId ? advanceVisit(readVisit(appId), Date.now()) : undefined),
    [appId, readVisit],
  );
  const layout = useMemo(
    () => (signals && prefs ? composeLayout(signals, prefs, memory) : undefined),
    [signals, prefs, memory],
  );

  useEffect(() => {
    if (!appId || !memory || !layout) return;
    const shown = layout.band.map(({ signal }) => ({
      id: signal.id,
      kind: signal.kind,
      title: titleOf(signal),
    }));
    writeVisit(appId, recordSeen(memory, shown, Date.now()));
  }, [appId, memory, layout, titleOf, writeVisit]);

  return layout;
}
