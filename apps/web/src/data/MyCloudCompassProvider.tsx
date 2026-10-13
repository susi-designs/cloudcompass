import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import type { SectionId } from './myCloudCompass';
import { MyCloudCompassContext } from './myCloudCompassContext';
import {
  addApp,
  readStore,
  removeApp,
  setDefaultApp,
  toggleMute,
  togglePin,
  writeStore,
  type MyCloudCompassStore,
} from './myCloudCompassStore';
import { EMPTY_PREFS, type SignalKind, type VisitMemory } from './signals';

/** My applications, default application, pins / mutes and visit memory (browser storage). */
export function MyCloudCompassProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<MyCloudCompassStore>(readStore);
  // Visit memory changes on every page view; keep it out of render state so recording what
  // was seen never re-renders (or re-composes) the page.
  const visitsRef = useRef(store.visits);

  const update = useCallback((fn: (s: MyCloudCompassStore) => MyCloudCompassStore) => {
    setStore((prev) => {
      const next = fn({ ...prev, visits: visitsRef.current });
      writeStore(next);
      return next;
    });
  }, []);

  const writeVisit = useCallback(
    (appId: string, memory: VisitMemory) => {
      visitsRef.current = { ...visitsRef.current, [appId]: memory };
      writeStore({ ...store, visits: visitsRef.current });
    },
    [store],
  );

  const readVisit = useCallback((appId: string) => visitsRef.current[appId], []);

  const value = useMemo(
    () => ({
      apps: store.apps,
      defaultApp: store.defaultApp,
      prefsFor: (appId: string) => store.prefs[appId] ?? EMPTY_PREFS,
      addApp: (appId: string) => update((s) => addApp(s, appId)),
      removeApp: (appId: string) => update((s) => removeApp(s, appId)),
      setDefaultApp: (appId: string) => update((s) => setDefaultApp(s, appId)),
      togglePin: (appId: string, section: SectionId) => update((s) => togglePin(s, appId, section)),
      toggleMute: (appId: string, kind: SignalKind) => update((s) => toggleMute(s, appId, kind)),
      readVisit,
      writeVisit,
    }),
    [store, update, readVisit, writeVisit],
  );

  return <MyCloudCompassContext.Provider value={value}>{children}</MyCloudCompassContext.Provider>;
}
