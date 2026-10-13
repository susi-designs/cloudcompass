import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMyCloudCompass } from '../../../data/myCloudCompassContext';
import { useHierarchy } from '../../../data/useHierarchy';

/**
 * Which application the page shows: `?app=` in the URL wins, then the default application
 * (PRODUCT.md §5.1). Switching sets `?app=` and never changes the default; the first application
 * a user ever picks becomes their default.
 */
export function useSelectedApp() {
  const [params, setParams] = useSearchParams();
  const { applications } = useHierarchy();
  const { apps, defaultApp, addApp } = useMyCloudCompass();

  const fromUrl = params.get('app');
  const known = (id: string | null) => !!id && applications.some((a) => a.id === id);
  // Until the hierarchy loads, trust the URL so the page doesn't flash the empty state.
  const appId =
    fromUrl && (applications.length === 0 || known(fromUrl))
      ? fromUrl
      : known(defaultApp) || applications.length === 0
        ? defaultApp
        : null;
  const unknownApp = !!fromUrl && applications.length > 0 && !known(fromUrl);

  const selectApp = useCallback(
    (id: string) => {
      if (apps.length === 0) addApp(id); // first pick becomes the default
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('app', id);
          return next;
        },
        { replace: false },
      );
    },
    [apps.length, addApp, setParams],
  );

  return { appId, selectApp, unknownApp };
}
