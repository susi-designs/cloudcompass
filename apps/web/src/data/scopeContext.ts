import { createContext, useContext } from 'react';
import type { Scope } from './scope';

export interface ScopeContextValue {
  scope: Scope;
  setScope: (update: Partial<Scope>) => void;
  resetScope: () => void;
}

export const ScopeContext = createContext<ScopeContextValue | null>(null);

export function useScope(): ScopeContextValue {
  const ctx = useContext(ScopeContext);
  if (!ctx) throw new Error('useScope must be used inside <ScopeProvider>');
  return ctx;
}
