import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SECTION_IDS, type SectionId } from '../../../data/myCloudCompass';

export type TabId = 'overview' | SectionId;

/** Tabs of My CloudCompass, in their fixed order: Overview, then one per pillar. */
export const TAB_IDS: readonly TabId[] = ['overview', ...SECTION_IDS];

/**
 * Which tab the page shows: `?tab=` in the URL, so links and Back land on the same tab
 * (PRODUCT.md §5.1). Overview is the default and leaves the parameter out.
 */
export function useSelectedTab() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab = TAB_IDS.find((id) => id === raw) ?? 'overview';

  const selectTab = useCallback(
    (id: TabId) => {
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        if (id === 'overview') next.delete('tab');
        else next.set('tab', id);
        return next;
      });
    },
    [setParams],
  );

  return { tab, selectTab };
}
