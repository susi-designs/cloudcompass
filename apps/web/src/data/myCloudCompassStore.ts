import { SIGNAL_KINDS, type PagePrefs, type SignalKind, type VisitMemory } from './signals';

/**
 * Until the API and SSO user profile exist, My CloudCompass preferences live in this browser
 * (PRODUCT.md §5.1): My applications, the default application, per-application mutes
 * and the visit memory used for "New" / "Resolved" tags.
 */
export const MY_CLOUDCOMPASS_STORAGE_KEY = 'cloudcompass.myCloudCompass.v1';

/** Most applications a user can keep in My applications. */
export const MAX_MY_APPS = 10;

export interface MyCloudCompassStore {
  apps: string[];
  defaultApp: string | null;
  prefs: Record<string, PagePrefs>;
  visits: Record<string, VisitMemory>;
}

export const EMPTY_STORE: MyCloudCompassStore = {
  apps: [],
  defaultApp: null,
  prefs: {},
  visits: {},
};

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const strings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

/** Validate whatever is in storage; drop anything malformed rather than failing. */
export function parseStore(raw: unknown): MyCloudCompassStore {
  if (!isObject(raw)) return EMPTY_STORE;
  const apps = [...new Set(strings(raw.apps))].slice(0, MAX_MY_APPS);
  const defaultApp =
    typeof raw.defaultApp === 'string' && apps.includes(raw.defaultApp) ? raw.defaultApp : null;
  const prefs: Record<string, PagePrefs> = {};
  if (isObject(raw.prefs)) {
    for (const [app, p] of Object.entries(raw.prefs)) {
      if (!isObject(p)) continue;
      // Pins from before the tabbed layout (2026-10-25) are dropped.
      prefs[app] = {
        muted: strings(p.muted).filter((s): s is SignalKind =>
          (SIGNAL_KINDS as readonly string[]).includes(s),
        ),
      };
    }
  }
  const visits: Record<string, VisitMemory> = {};
  if (isObject(raw.visits)) {
    for (const [app, v] of Object.entries(raw.visits)) {
      if (isObject(v) && isObject(v.current) && typeof v.current.at === 'number')
        visits[app] = v as unknown as VisitMemory;
    }
  }
  return { apps, defaultApp, prefs, visits };
}

export function readStore(): MyCloudCompassStore {
  try {
    const raw = window.localStorage.getItem(MY_CLOUDCOMPASS_STORAGE_KEY);
    return parseStore(raw ? JSON.parse(raw) : null);
  } catch {
    // Unavailable or corrupt storage: start clean.
    return EMPTY_STORE;
  }
}

export function writeStore(store: MyCloudCompassStore): void {
  try {
    window.localStorage.setItem(MY_CLOUDCOMPASS_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Non-fatal: preferences last for this session only.
  }
}

/* Pure updates, unit tested. */

/** Add an application (most recent first is not needed: keep the user's order). */
export function addApp(store: MyCloudCompassStore, appId: string): MyCloudCompassStore {
  if (store.apps.includes(appId) || store.apps.length >= MAX_MY_APPS) return store;
  const apps = [...store.apps, appId];
  return { ...store, apps, defaultApp: store.defaultApp ?? appId };
}

/** Remove an application; the default moves to the first remaining one. */
export function removeApp(store: MyCloudCompassStore, appId: string): MyCloudCompassStore {
  const apps = store.apps.filter((a) => a !== appId);
  const defaultApp = store.defaultApp === appId ? (apps[0] ?? null) : store.defaultApp;
  return { ...store, apps, defaultApp };
}

/** Make an application the default, adding it to My applications if needed. */
export function setDefaultApp(store: MyCloudCompassStore, appId: string): MyCloudCompassStore {
  const added = addApp(store, appId);
  if (!added.apps.includes(appId)) return store; // list full
  return { ...added, defaultApp: appId };
}

const toggle = <T>(list: readonly T[], value: T): T[] =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

export function toggleMute(
  store: MyCloudCompassStore,
  appId: string,
  kind: SignalKind,
): MyCloudCompassStore {
  const p = store.prefs[appId] ?? { muted: [] };
  return {
    ...store,
    prefs: { ...store.prefs, [appId]: { ...p, muted: toggle(p.muted, kind) } },
  };
}
