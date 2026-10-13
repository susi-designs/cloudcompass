import { ComboBox, HeaderPanel } from '@carbon/react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScope } from '../data/scopeContext';
import { EMPTY_DIMENSIONS } from '../data/scope';
import { useHierarchy } from '../data/useHierarchy';

interface SearchItem {
  kind: 'LOB' | 'Application' | 'Account';
  id: string;
  label: string;
  detail: string;
}

const itemText = (item: SearchItem | null | undefined): string =>
  item ? `${item.label} — ${item.kind}` : '';

/** Search the org hierarchy; picking a result scopes the whole app to it. */
export function GlobalSearchPanel({
  expanded,
  onClose,
}: {
  expanded: boolean;
  onClose: () => void;
}) {
  const { lobs, applications, accounts } = useHierarchy();
  const { setScope } = useScope();
  const navigate = useNavigate();

  const items = useMemo<SearchItem[]>(() => {
    const lobName = new Map(lobs.map((l) => [l.id, l.name]));
    const appName = new Map(applications.map((a) => [a.id, a.name]));
    return [
      ...lobs.map((l) => ({
        kind: 'LOB' as const,
        id: l.id,
        label: l.name,
        detail: 'Line of business',
      })),
      ...applications.map((a) => ({
        kind: 'Application' as const,
        id: a.id,
        label: a.name,
        detail: `${lobName.get(a.lobId) ?? ''} · ${a.provider}`,
      })),
      ...accounts.map((a) => ({
        kind: 'Account' as const,
        id: a.id,
        label: a.name,
        detail: `${appName.get(a.applicationId) ?? ''} · ${a.environment} · ${a.id}`,
      })),
    ];
  }, [lobs, applications, accounts]);

  const select = (item: SearchItem | null | undefined) => {
    if (!item) return;
    setScope({
      ...EMPTY_DIMENSIONS,
      ...(item.kind === 'LOB' && { lobIds: [item.id] }),
      ...(item.kind === 'Application' && { applicationIds: [item.id] }),
      ...(item.kind === 'Account' && { accountIds: [item.id] }),
    });
    onClose();
    // The Executive Overview reflects the global scope; My CloudCompass is fixed to one app.
    navigate('/overview');
  };

  return (
    <HeaderPanel
      expanded={expanded}
      aria-label="Search"
      className="cc-header-panel cc-search-panel"
    >
      {expanded && (
        <div className="cc-header-panel__body">
          <ComboBox<SearchItem>
            id="global-search"
            titleText="Search"
            helperText="Pick a LOB, application or account to scope every page to it."
            placeholder="Search LOBs, applications, accounts"
            items={items}
            itemToString={itemText}
            itemToElement={(item) => (
              <span className="cc-search-option">
                <span>{itemText(item)}</span>
                <span className="cds--type-helper-text-01 cc-text-secondary">{item.detail}</span>
              </span>
            )}
            shouldFilterItem={({ item, inputValue }) =>
              !inputValue ||
              `${item.label} ${item.id} ${item.detail}`
                .toLowerCase()
                .includes(inputValue.toLowerCase())
            }
            onChange={({ selectedItem }) => select(selectedItem)}
            autoAlign
          />
        </div>
      )}
    </HeaderPanel>
  );
}
