import { DataTableSkeleton, Tag } from '@carbon/react';
import { useMemo } from 'react';
import { CostDelta } from '../../../components/CostDelta';
import { SortableDataTable, type TableColumn } from '../../../components/SortableDataTable';
import type { AiSpendData, FeatureRow } from '../../../data/aiSpend';
import { formatCompactNumber, formatCurrency, formatDate } from '../../../lib/format';

export function FeatureCostTable({
  data,
  loading,
}: {
  data: AiSpendData | undefined;
  loading: boolean;
}) {
  const c = data?.currency ?? 'USD';
  const columns = useMemo<TableColumn<FeatureRow>[]>(
    () => [
      {
        key: 'feature',
        header: 'Feature',
        kind: 'text',
        value: (r) => `${r.application} ${r.feature}`,
        render: (r) => (
          <span className="cc-cell-stack">
            <span>{r.feature}</span>
            <span className="cds--type-helper-text-01 cc-text-secondary">
              {r.application} · {r.lob}
            </span>
          </span>
        ),
      },
      {
        key: 'models',
        header: 'Model',
        kind: 'text',
        value: (r) => r.models.join(', '),
        render: (r) => (
          <span className="cc-tag-row">
            {r.models.map((m) => (
              <Tag key={m} type="cool-gray" size="sm">
                {m}
              </Tag>
            ))}
          </span>
        ),
      },
      {
        key: 'requests',
        header: 'Requests',
        kind: 'number',
        value: (r) => r.requests,
        render: (r) => formatCompactNumber(r.requests),
      },
      {
        key: 'tokens',
        header: 'Tokens',
        kind: 'number',
        value: (r) => r.inputTokens + r.outputTokens + r.cachedTokens,
        render: (r) => formatCompactNumber(r.inputTokens + r.outputTokens + r.cachedTokens),
      },
      {
        key: 'cacheHitPercent',
        header: 'Cache hit',
        kind: 'percent',
        value: (r) => r.cacheHitPercent,
        render: (r) => `${r.cacheHitPercent.toFixed(0)}%`,
      },
      {
        key: 'costPer1kRequests',
        header: 'Cost / 1K requests',
        kind: 'currency',
        value: (r) => r.costPer1kRequests,
        render: (r) => formatCurrency(r.costPer1kRequests, c),
      },
      {
        key: 'cost',
        header: 'Cost',
        kind: 'currency',
        value: (r) => r.cost,
        render: (r) => formatCurrency(r.cost, c),
      },
      {
        key: 'change',
        header: 'Change',
        kind: 'currency',
        value: (r) => r.change,
        render: (r) => (
          <CostDelta
            change={r.change}
            changePercent={r.changePercent}
            showAmount
            currency={c}
            comparisonLabel="vs. previous period"
          />
        ),
      },
    ],
    [c],
  );
  if (loading || !data) return <DataTableSkeleton columnCount={8} rowCount={6} showToolbar />;
  return (
    <SortableDataTable
      title="Cost per feature"
      description={`LLM API usage by application feature, ${formatDate(data.period.start)} – ${formatDate(data.period.end)} vs. the previous ${data.period.days} days.`}
      columns={columns}
      rows={data.features}
      rowId={(r) => r.id}
      initialSort={{ key: 'cost', direction: 'DESC' }}
      searchable
      emptyMessage="No LLM usage in the selected scope. AI features run in PROD accounts."
    />
  );
}
