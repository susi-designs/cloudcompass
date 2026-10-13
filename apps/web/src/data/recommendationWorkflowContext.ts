import { createContext, useContext } from 'react';
import type { OverrideMap, WorkflowAction } from './optimization';

export interface RecommendationWorkflowValue {
  /** Changes people made in this browser, keyed by recommendation id. */
  overrides: OverrideMap;
  /** Apply an action to the given ids; returns how many changed and how many were skipped. */
  apply: (ids: readonly string[], action: WorkflowAction) => { updated: number; skipped: number };
  /** Discard all local changes. */
  reset: () => void;
  changeCount: number;
}

export const RecommendationWorkflowContext = createContext<RecommendationWorkflowValue | null>(
  null,
);

export function useRecommendationWorkflow(): RecommendationWorkflowValue {
  const ctx = useContext(RecommendationWorkflowContext);
  if (!ctx)
    throw new Error(
      'useRecommendationWorkflow must be used inside <RecommendationWorkflowProvider>',
    );
  return ctx;
}
