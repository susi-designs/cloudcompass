import { createContext, useContext } from 'react';
import type { MyCloudCompassStore } from './myCloudCompassStore';
import type { PagePrefs, SignalKind, VisitMemory } from './signals';

export interface MyCloudCompassValue {
  /** My applications, in the order the user added them. */
  apps: readonly string[];
  defaultApp: string | null;
  prefsFor: (appId: string) => PagePrefs;
  addApp: (appId: string) => void;
  removeApp: (appId: string) => void;
  setDefaultApp: (appId: string) => void;
  toggleMute: (appId: string, kind: SignalKind) => void;
  /** Visit memory as stored (read once per visit; see useAppVisit). */
  readVisit: (appId: string) => VisitMemory | undefined;
  writeVisit: (appId: string, memory: VisitMemory) => void;
}

export const MyCloudCompassContext = createContext<MyCloudCompassValue | null>(null);

export function useMyCloudCompass(): MyCloudCompassValue {
  const ctx = useContext(MyCloudCompassContext);
  if (!ctx) throw new Error('useMyCloudCompass must be used inside <MyCloudCompassProvider>');
  return ctx;
}

export type { MyCloudCompassStore };
