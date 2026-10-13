import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { defaultScope, type Scope } from './scope';
import { ScopeContext } from './scopeContext';

export function ScopeProvider({ children, initial }: { children: ReactNode; initial?: Scope }) {
  const [scope, setScopeState] = useState<Scope>(() => initial ?? defaultScope());
  const setScope = useCallback(
    (update: Partial<Scope>) => setScopeState((prev) => ({ ...prev, ...update })),
    [],
  );
  const resetScope = useCallback(() => setScopeState(defaultScope()), []);
  const value = useMemo(() => ({ scope, setScope, resetScope }), [scope, setScope, resetScope]);
  return <ScopeContext.Provider value={value}>{children}</ScopeContext.Provider>;
}
