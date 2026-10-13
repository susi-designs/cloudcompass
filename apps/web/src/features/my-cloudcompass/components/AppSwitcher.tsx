import { Button, ComboBox, OperationalTag, Tag } from '@carbon/react';
import { Star, StarFilled } from '@carbon/icons-react';
import { useMemo } from 'react';
import { useMyCloudCompass } from '../../../data/myCloudCompassContext';
import { MAX_MY_APPS } from '../../../data/myCloudCompassStore';
import { useHierarchy } from '../../../data/useHierarchy';

interface AppOption {
  id: string;
  text: string;
  lob: string;
  mine: boolean;
}

interface Props {
  appId: string | null;
  onSelect: (id: string) => void;
}

/**
 * Application switcher (PRODUCT.md §5.1): a searchable ComboBox listing My applications first,
 * then every application grouped by LOB; actions to keep the application in My applications or
 * make it the default; and one-click tags to jump between My applications.
 */
export function AppSwitcher({ appId, onSelect }: Props) {
  const { applications, lobs } = useHierarchy();
  const { apps, defaultApp, addApp, removeApp, setDefaultApp } = useMyCloudCompass();

  const options = useMemo<AppOption[]>(() => {
    const lobName = new Map(lobs.map((l) => [l.id, l.name]));
    const all = applications.map((a) => ({
      id: a.id,
      text: a.name,
      lob: lobName.get(a.lobId) ?? a.lobId,
      mine: apps.includes(a.id),
    }));
    const mine = apps.flatMap((id) => all.filter((o) => o.id === id));
    const rest = all
      .filter((o) => !o.mine)
      .sort((a, b) => a.lob.localeCompare(b.lob) || a.text.localeCompare(b.text));
    return [...mine, ...rest];
  }, [applications, lobs, apps]);

  const selected = options.find((o) => o.id === appId) ?? null;
  const isMine = !!appId && apps.includes(appId);
  const isDefault = !!appId && appId === defaultApp;
  const others = options.filter((o) => o.mine && o.id !== appId);

  return (
    <section className="cc-app-switcher" aria-label="Application">
      <div className="cc-app-switcher__row">
        <ComboBox<AppOption>
          id="my-app-switcher"
          className="cc-app-switcher__combo"
          titleText="Application"
          placeholder="Search applications"
          items={options}
          selectedItem={selected}
          itemToString={(item) => item?.text ?? ''}
          itemToElement={(item) => (
            <span className="cc-search-option">
              <span>
                {item.text}
                {item.mine && <span className="cds--visually-hidden"> (in My applications)</span>}
              </span>
              <span className="cds--type-helper-text-01 cc-text-secondary">
                {item.mine ? `My applications · ${item.lob}` : item.lob}
              </span>
            </span>
          )}
          onChange={({ selectedItem }) => {
            // ComboBox also reports the controlled selection on mount; only act on a real switch.
            if (selectedItem && selectedItem.id !== appId) onSelect(selectedItem.id);
          }}
          size="md"
        />
        {appId && (
          <div className="cc-app-switcher__actions">
            <Button
              kind="ghost"
              size="md"
              renderIcon={isMine ? StarFilled : Star}
              disabled={!isMine && apps.length >= MAX_MY_APPS}
              onClick={() => (isMine ? removeApp(appId) : addApp(appId))}
            >
              {isMine ? 'Remove from My applications' : 'Add to My applications'}
            </Button>
            {isDefault ? (
              <Tag type="blue" size="md">
                Default application
              </Tag>
            ) : (
              <Button
                kind="ghost"
                size="md"
                disabled={!isMine && apps.length >= MAX_MY_APPS}
                onClick={() => setDefaultApp(appId)}
              >
                Set as default
              </Button>
            )}
          </div>
        )}
      </div>
      {others.length > 0 && (
        <div
          className="cc-app-switcher__mine"
          role="group"
          aria-label="Switch to one of My applications"
        >
          <span className="cds--type-label-01 cc-text-secondary">My applications</span>
          {others.map((o) => (
            <OperationalTag
              key={o.id}
              type="cool-gray"
              size="md"
              text={o.text}
              onClick={() => onSelect(o.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
