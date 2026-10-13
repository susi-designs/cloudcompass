import { Tag } from '@carbon/react';
import { CostDelta } from '../../../components/CostDelta';
import { KpiTile } from '../../../components/KpiTile';
import type { OverviewData } from '../../../data/overview';
import { formatCurrency, formatDate, formatNumber, formatPercentChange } from '../../../lib/format';

interface Props {
  data: OverviewData | undefined;
  loading: boolean;
}

export function KpiRow({ data, loading }: Props) {
  const c = data?.currency ?? 'USD';
  const money = (v: number | undefined) => formatCurrency(v ?? 0, c, 'compact');
  const monthLabel = data
    ? new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' }).format(
        new Date(`${data.asOf}T00:00:00Z`),
      )
    : '';

  return (
    <section className="cc-kpi-row" aria-label="Key metrics">
      <KpiTile
        label="Month-to-date spend"
        value={money(data?.mtd.value)}
        loading={loading}
        footer={
          data && (
            <CostDelta
              change={data.mtd.value - data.mtd.previous}
              changePercent={data.mtd.changePercent}
              comparisonLabel="vs. same days last month"
            />
          )
        }
        helper={
          data
            ? `${monthLabel} 1–${Number(data.asOf.slice(8))} vs. same days last month`
            : undefined
        }
      />
      <KpiTile
        label="Forecast (month end)"
        value={money(data?.forecast.value)}
        loading={loading}
        footer={
          data && (
            <CostDelta
              change={data.forecast.value - data.forecast.previous}
              changePercent={data.forecast.changePercent}
              comparisonLabel="vs. last month"
            />
          )
        }
        helper={data ? `vs. last month's ${money(data.forecast.previous)} · Est.` : undefined}
      />
      <KpiTile
        label="Budget variance"
        value={data ? `${data.budget.variance > 0 ? '+' : ''}${money(data.budget.variance)}` : ''}
        loading={loading}
        footer={
          data &&
          (data.budget.variance > 0 ? (
            <Tag type="red" size="sm">
              Over budget{' '}
              {data.budget.variancePercent != null &&
                formatPercentChange(data.budget.variancePercent)}
            </Tag>
          ) : (
            <Tag type="green" size="sm">
              Under budget{' '}
              {data.budget.variancePercent != null &&
                formatPercentChange(data.budget.variancePercent)}
            </Tag>
          ))
        }
        helper={
          data
            ? `Forecast vs. ${money(data.budget.budget)} budget${data.budget.partialScope ? ' (budgets cover all environments)' : ''}`
            : undefined
        }
      />
      <KpiTile
        label="Realized savings"
        value={data ? `${money(data.savings.realizedMonthly)}/mo` : ''}
        loading={loading}
        footer={
          data && (
            <span>{formatNumber(data.savings.implementedCount)} recommendations implemented</span>
          )
        }
        helper={
          data
            ? `${money(data.savings.openMonthly)}/mo more available in open recommendations`
            : undefined
        }
      />
      <KpiTile
        label="Open anomalies"
        value={data ? formatNumber(data.anomalies.open) : ''}
        loading={loading}
        footer={
          data && (
            <span className="cc-tag-row">
              {data.anomalies.bySeverity.Critical > 0 && (
                <Tag type="red" size="sm">
                  {data.anomalies.bySeverity.Critical} Critical
                </Tag>
              )}
              {data.anomalies.bySeverity.High > 0 && (
                <Tag type="magenta" size="sm">
                  {data.anomalies.bySeverity.High} High
                </Tag>
              )}
              {data.anomalies.open === 0 && (
                <Tag type="green" size="sm">
                  None open
                </Tag>
              )}
            </span>
          )
        }
        helper={data ? `As of ${formatDate(data.asOf)}` : undefined}
      />
    </section>
  );
}
