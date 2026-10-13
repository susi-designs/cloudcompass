import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { EMPTY_DIMENSIONS } from '../../../data/scope';
import { useScope } from '../../../data/scopeContext';

/**
 * Open a pillar page scoped to this application: the global scope becomes this application
 * (same date range and environments), then we navigate (PRODUCT.md §5.1 "View in <pillar>").
 */
export function useOpenInPillar(appId: string | null) {
  const { scope, setScope } = useScope();
  const navigate = useNavigate();
  return useCallback(
    (pathname: string, search = '') => {
      if (appId)
        setScope({
          ...EMPTY_DIMENSIONS,
          environments: scope.environments,
          applicationIds: [appId],
        });
      navigate({ pathname, search });
    },
    [appId, scope.environments, setScope, navigate],
  );
}
