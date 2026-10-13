import { DataTableSkeleton, InlineNotification } from '@carbon/react';
import { useMemo } from 'react';
import { KpiTile } from '../../../components/KpiTile';
import { SortableDataTable, type TableColumn } from '../../../components/SortableDataTable';
import type { LedgerRow } from '../../../data/optimization';
import { useSavingsLedger } from '../../../data/useOptimization';
import {
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercent,
  formatPercentChange,
} from '../../../lib/format';
import { LedgerChart } from './LedgerChart';

export function SavingsLedger() {
  const { data, isPending, error } = useSavingsLedger();
  const loading = isPending || !data;
  const c = data?.currency ?? 'USD';
  const k = data?.kpis;
  const money = (v: number | undefined) => formatCurrency(v ?? 0, c, 'compact');

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
      <section className="cc-kpi-row" aria-label="Savings ledger summary">
        <KpiTile
          label="Realized savings · selected period"
          value={money(k?.realizedInPeriod)}
          loading={loading}
          helper={k ? `vs. ${money(k.projectedInPeriod)} projected` : undefined}
        />
        <KpiTile
          label="Realization rate"
          value={k?.realizationPercent == null ? '—' : formatPercent(k.realizationPercent)}
          loading={loading}
          helper="Realized ÷ projected savings of implemented recommendations"
        />
        <KpiTile
          label="Savings run-rate · per month"
          value={money(k?.runRate)}
          loading={loading}
          helper={
            k ? `${money(k.runRate * 12)} a year from implemented recommendations` : undefined
          }
        />
        <KpiTile
          label="Pipeline · per month"
          value={money(k?.pipeline)}
          loading={loading}
          helper={
            k
              ? `${formatNumber(k.pipelineCount)} accepted recommendations not yet implemented`
              : undefined
          }
        />
      </section>
      <LedgerChart data={data} loading={loading} />
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
