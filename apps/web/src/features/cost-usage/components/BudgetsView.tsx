import { DataTableSkeleton, InlineNotification, ProgressBar, Tag } from '@carbon/react';
import { useMemo } from 'react';
import { CostDelta } from '../../../components/CostDelta';
import { KpiTile } from '../../../components/KpiTile';
import { SortableDataTable, type TableColumn } from '../../../components/SortableDataTable';
import { AT_RISK_THRESHOLD, type BudgetRow } from '../../../data/budgets';
import { useBudgets } from '../../../data/useBudgets';
import { formatCurrency, formatDate, formatNumber } from '../../../lib/format';
import { BudgetHistoryChart } from './BudgetHistoryChart';
import { BudgetStatusIndicator } from './BudgetStatusIndicator';

/** Budgets (PRODUCT.md §4.1): per-application monthly budget vs. month-to-date and forecast. */
export function BudgetsView() {
  const { data, isPending, error } = useBudgets();
  const loading = isPending || !data;
  const c = data?.currency ?? 'USD';

  const columns = useMemo<TableColumn<BudgetRow>[]>(
    () => [
      { key: 'application', header: 'Application', kind: 'text', value: (r) => r.application },
      { key: 'lob', header: 'Line of business', kind: 'text', value: (r) => r.lob },
      { key: 'provider', header: 'Cloud', kind: 'text', value: (r) => r.provider },
      {
        key: 'budget',
        header: 'Monthly budget',
        kind: 'currency',
        value: (r) => r.budget,
        render: (r) => formatCurrency(r.budget, c),
      },
      {
        key: 'mtd',
        header: 'Month to date',
        kind: 'currency',
        value: (r) => r.mtd,
        render: (r) => formatCurrency(r.mtd, c),
      },
      {
        key: 'forecast',
        header: 'Forecast',
        kind: 'currency',
        value: (r) => r.forecast,
        render: (r) => formatCurrency(r.forecast, c),
      },
      {
        key: 'variance',
        header: 'Forecast vs. budget',
        kind: 'currency',
        value: (r) => r.variance,
        render: (r) => (
          <CostDelta change={r.variance} showAmount currency={c} comparisonLabel="vs. budget" />
        ),
      },
      {
        key: 'forecastPercent',
        header: '% of budget',
        kind: 'percent',
        value: (r) => r.forecastPercent,
        render: (r) => (
          <div className="cc-budget-meter">
            <ProgressBar
              label={`${r.application} forecast is ${r.forecastPercent.toFixed(0)}% of budget`}
              hideLabel
              size="small"
              max={100}
              value={Math.min(r.forecastPercent, 100)}
              status={r.forecastPercent > 100 ? 'error' : 'active'}
            />
            <span>{r.forecastPercent.toFixed(0)}%</span>
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        kind: 'text',
        value: (r) => r.status,
        render: (r) => <BudgetStatusIndicator status={r.status} />,
      },
    ],
    [c],
  );

  return (
    <div className="cc-stack">
      {error && (
        <InlineNotification
          kind="error"
          title="Couldn't load budgets"
          subtitle={error.message}
          hideCloseButton
        />
      )}
      {data?.partialScope && (
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title="Budgets cover all environments"
          subtitle="You've filtered by environment or account, so only that slice of spend is compared with each application's full budget."
        />
      )}
      <section className="cc-kpi-row" aria-label="Budget summary">
        <KpiTile
          label="Monthly budget"
          value={formatCurrency(data?.totals.budget ?? 0, c, 'compact')}
          loading={loading}
          helper={data ? `${formatNumber(data.rows.length)} applications` : undefined}
        />
        <KpiTile
          label="Forecast (month end)"
          value={formatCurrency(data?.totals.forecast ?? 0, c, 'compact')}
          loading={loading}
          footer={
            data && (
              <CostDelta
                change={data.totals.variance}
                changePercent={data.totals.variancePercent}
                comparisonLabel="vs. budget"
              />
            )
          }
          helper={data ? `vs. budget · as of ${formatDate(data.asOf)}` : undefined}
        />
        <KpiTile
          label="Over budget"
          value={formatNumber(data?.totals.counts['Over budget'] ?? 0)}
          loading={loading}
          footer={
            data && (
              <Tag type="red" size="sm">
                Forecast &gt; 100%
              </Tag>
            )
          }
          helper="Applications forecast to exceed budget"
        />
        <KpiTile
          label="At risk"
          value={formatNumber(data?.totals.counts['At risk'] ?? 0)}
          loading={loading}
          footer={
            data && (
              <Tag type="warm-gray" size="sm">
                Forecast {AT_RISK_THRESHOLD}–100%
              </Tag>
            )
          }
          helper={`Alert threshold: ${AT_RISK_THRESHOLD}% of budget`}
        />
      </section>
      <BudgetHistoryChart data={data} loading={loading} />
      {loading ? (
        <DataTableSkeleton columnCount={9} rowCount={8} showToolbar />
      ) : (
        <SortableDataTable
          title="Application budgets"
          description={`Month to date through ${formatDate(data.asOf)}; forecast uses the trailing 7-day run-rate. Sorted by % of budget.`}
          columns={columns}
          rows={data.rows}
          rowId={(r) => r.applicationId}
          initialSort={{ key: 'forecastPercent', direction: 'DESC' }}
          searchable
        />
      )}
    </div>
  );
}
