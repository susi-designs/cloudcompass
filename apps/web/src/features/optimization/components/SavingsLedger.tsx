import { DataTableSkeleton, InlineNotification } from '@carbon/react';
import { useMemo } from 'react';
import { SortableDataTable, type TableColumn } from '../../../components/SortableDataTable';
import type { LedgerRow } from '../../../data/optimization';
import { useSavingsLedger } from '../../../data/useOptimization';
import { formatCurrency, formatDate, formatPercentChange } from '../../../lib/format';

export function SavingsLedger() {
  const { data, isPending, error } = useSavingsLedger();
  const loading = isPending || !data;
  const c = data?.currency ?? 'USD';

  const columns = useMemo<TableColumn<LedgerRow>[]>(
    () => [
      {
        key: 'title',
        header: 'Recommendation',
        kind: 'text',
        value: (r) => `${r.title} ${r.type}`,
        render: (r) => (
          <span className="cc-cell-stack">
            <span>{r.title}</span>
            <span className="cds--type-helper-text-01 cc-text-secondary">{r.type}</span>
          </span>
        ),
      },
      {
        key: 'application',
        header: 'Application',
        kind: 'text',
        value: (r) => `${r.application} ${r.lob} ${r.environment}`,
        render: (r) => (
          <span className="cc-cell-stack">
            <span className="cc-nowrap">{r.application}</span>
            <span className="cds--type-helper-text-01 cc-text-secondary cc-nowrap">
              {r.lob} · {r.environment}
            </span>
          </span>
        ),
      },
      {
        key: 'implementedAt',
        header: 'Implemented',
        kind: 'date',
        value: (r) => r.implementedAt,
        render: (r) => <span className="cc-nowrap">{formatDate(r.implementedAt)}</span>,
      },
      {
        key: 'estimatedMonthlySavings',
        header: 'Projected/mo',
        kind: 'currency',
        value: (r) => r.estimatedMonthlySavings,
        render: (r) => formatCurrency(r.estimatedMonthlySavings, c),
      },
      {
        key: 'realizedMonthlySavings',
        header: 'Realized/mo',
        kind: 'currency',
        value: (r) => r.realizedMonthlySavings,
        render: (r) => formatCurrency(r.realizedMonthlySavings, c),
      },
      {
        key: 'variancePercent',
        header: 'Variance',
        kind: 'percent',
        value: (r) => r.variancePercent,
        render: (r) => formatPercentChange(r.variancePercent),
      },
      {
        key: 'realizedInPeriod',
        header: 'Saved',
        kind: 'currency',
        value: (r) => r.realizedInPeriod,
        render: (r) => formatCurrency(r.realizedInPeriod, c),
      },
    ],
    [c],
  );

  return (
    <div className="cc-stack">
      {error && (
        <InlineNotification
          kind="error"
          title="Couldn't load the savings ledger"
          subtitle={error.message}
          hideCloseButton
        />
      )}
      {loading ? (
        <DataTableSkeleton columnCount={8} rowCount={6} showToolbar />
      ) : (
        <SortableDataTable
          title="Implemented recommendations"
          description={`Implemented on or before ${formatDate(data.end)}. "Saved" is what each saved in the selected period, prorated by day from the implementation date.`}
          columns={columns}
          rows={data.rows}
          rowId={(r) => r.id}
          initialSort={{ key: 'implementedAt', direction: 'DESC' }}
          searchable
          size="md"
          emptyMessage="No implemented recommendations in scope."
        />
      )}
    </div>
  );
}
