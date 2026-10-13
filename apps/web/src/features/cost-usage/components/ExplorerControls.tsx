import { ContentSwitcher, Dropdown, Switch } from '@carbon/react';
import {
  GRANULARITY_OPTIONS,
  GROUP_BY_OPTIONS,
  METRIC_OPTIONS,
  type ExplorerSettings,
} from '../../../data/explorer';

interface Props {
  settings: ExplorerSettings;
  onChange: (change: Partial<ExplorerSettings>) => void;
}

type Option = { id: string; label: string };

export function ExplorerControls({ settings, onChange }: Props) {
  const metric = METRIC_OPTIONS.find((m) => m.id === settings.metric);
  return (
    <div className="cc-explorer-controls">
      <Dropdown<Option>
        id="explorer-group-by"
        titleText="Group by"
        label="Group by"
        items={[...GROUP_BY_OPTIONS]}
        itemToString={(i) => i?.label ?? ''}
        selectedItem={GROUP_BY_OPTIONS.find((o) => o.id === settings.groupBy)}
        onChange={({ selectedItem }) =>
          selectedItem && onChange({ groupBy: selectedItem.id as ExplorerSettings['groupBy'] })
        }
        size="md"
      />
      <Dropdown<Option>
        id="explorer-metric"
        titleText="Cost metric"
        label="Cost metric"
        helperText={metric?.help}
        items={[...METRIC_OPTIONS]}
        itemToString={(i) => i?.label ?? ''}
        selectedItem={metric}
        onChange={({ selectedItem }) =>
          selectedItem && onChange({ metric: selectedItem.id as ExplorerSettings['metric'] })
        }
        size="md"
      />
      <div className="cc-explorer-controls__granularity">
        <span className="cds--label" id="explorer-granularity-label">
          Granularity
        </span>
        <ContentSwitcher
          aria-labelledby="explorer-granularity-label"
          size="md"
          selectedIndex={GRANULARITY_OPTIONS.findIndex((g) => g.id === settings.granularity)}
          onChange={({ name }) =>
            onChange({ granularity: name as ExplorerSettings['granularity'] })
          }
        >
          {GRANULARITY_OPTIONS.map((g) => (
            <Switch key={g.id} name={g.id} text={g.label} />
          ))}
        </ContentSwitcher>
      </div>
    </div>
  );
}
