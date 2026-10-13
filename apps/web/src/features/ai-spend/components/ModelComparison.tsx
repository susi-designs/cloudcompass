import { Dropdown, Tag, Tile } from '@carbon/react';
import { useMemo, useState } from 'react';
import { CostDelta } from '../../../components/CostDelta';
import { SortableDataTable, type TableColumn } from '../../../components/SortableDataTable';
import {
  COMPARISON_WINDOW_DAYS,
  costOnModel,
  type AiSpendData,
  type FeatureTokens,
} from '../../../data/aiSpend';
import { formatCompactNumber, formatCurrency } from '../../../lib/format';

interface Row {
  model: string;
  provider: string;
  cost: number;
  change: number;
  changePercent: number | null;
  current: boolean;
}

/** "What would this feature cost on another model?" (PRODUCT.md §4.3). */
export function ModelComparison({ data }: { data: AiSpendData | undefined }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const c = data?.currency ?? 'USD';
  const options = data?.comparison ?? [];
  const selected = options.find((o) => o.featureId === selectedId) ?? options[0];

  const rows = useMemo<Row[]>(() => {
    if (!selected || !data) return [];
    return data.models.map((m) => {
      const cost = costOnModel(selected, m);
      // Round to cents so the current model shows no change rather than float noise.
      const change = Math.round((cost - selected.currentCost) * 100) / 100;
      return {
        model: m.model,
        provider: m.provider,
        cost,
        change,
        changePercent: selected.currentCost === 0 ? null : (change / selected.currentCost) * 100,
        current: selected.currentModels.includes(m.model),
      };
    });
  }, [selected, data]);

  const columns = useMemo<TableColumn<Row>[]>(
    () => [
      {
        key: 'model',
        header: 'Model',
        kind: 'text',
        value: (r) => r.model,
        render: (r) => (
          <span className="cc-tag-row">
            {r.model}
            {r.current && (
              <Tag type="blue" size="sm">
                Current
              </Tag>
            )}
          </span>
        ),
      },
      { key: 'provider', header: 'Provider', kind: 'text', value: (r) => r.provider },
      {
        key: 'cost',
        header: `Cost for the same tokens (${COMPARISON_WINDOW_DAYS} days)`,
        kind: 'currency',
        value: (r) => r.cost,
        render: (r) => formatCurrency(r.cost, c),
      },
      {
        key: 'change',
        header: 'vs. current',
        kind: 'currency',
        value: (r) => r.change,
        render: (r) => (
          <CostDelta
            change={r.change}
            changePercent={r.changePercent}
            showAmount
            currency={c}
            comparisonLabel="vs. current cost"
          />
        ),
      },
    ],
    [c],
  );

  if (!data || options.length === 0) return null;

  return (
    <Tile className="cc-stack cc-stack--tight">
      <div>
        <h2 className="cds--type-heading-03">Model cost comparison</h2>
        <p className="cds--type-body-01 cc-text-secondary">
          Prices the last {COMPARISON_WINDOW_DAYS} days of a feature&apos;s tokens on every model.
          Uses illustrative list prices and assumes the same token counts; check quality before
          switching.
        </p>
      </div>
      <Dropdown<FeatureTokens>
        id="model-comparison-feature"
        titleText="Feature"
        label="Choose a feature"
        items={options}
        itemToString={(i) => i?.label ?? ''}
        selectedItem={selected}
        onChange={({ selectedItem }) => selectedItem && setSelectedId(selectedItem.featureId)}
        size="md"
        className="cc-comparison-dropdown"
      />
      {selected && (
        <p className="cds--type-helper-text-01 cc-text-secondary">
          Current: {formatCurrency(selected.currentCost, c)} on {selected.currentModels.join(', ')}{' '}
          · {formatCompactNumber(selected.inputTokens)} input,{' '}
          {formatCompactNumber(selected.outputTokens)} output,{' '}
          {formatCompactNumber(selected.cachedTokens)} cached tokens
        </p>
      )}
      <SortableDataTable
        key={selected?.featureId}
        title="Projected cost by model"
        columns={columns}
        rows={rows}
        rowId={(r) => r.model}
        initialSort={{ key: 'cost', direction: 'ASC' }}
        size="sm"
      />
    </Tile>
  );
}
