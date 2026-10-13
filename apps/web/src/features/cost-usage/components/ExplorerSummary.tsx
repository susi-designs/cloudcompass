import { CostDelta } from '../../../components/CostDelta';
import { KpiTile } from '../../../components/KpiTile';
import { METRIC_OPTIONS, type ExplorerData, type ExplorerSettings } from '../../../data/explorer';
import { formatCurrency } from '../../../lib/format';

interface Props {
  data: ExplorerData | undefined;
  settings: ExplorerSettings;
  loading: boolean;
}

export function ExplorerSummary({ data, settings, loading }: Props) {
  const c = data?.currency ?? 'USD';
  const metric = METRIC_OPTIONS.find((m) => m.id === settings.metric)?.label ?? 'Cost';
  return (
    <section className="cc-kpi-row" aria-label="Period summary">
      <KpiTile
        label={`${metric} · selected period`}
        value={formatCurrency(data?.totals.total ?? 0, c, 'compact')}
        loading={loading}
        helper={data ? `${data.period.days} days` : undefined}
      />
      <KpiTile
        label="Change vs. previous period"
        value={
          data
            ? `${data.totals.change > 0 ? '+' : ''}${formatCurrency(data.totals.change, c, 'compact')}`
            : ''
        }
        loading={loading}
        footer={
          data && (
            <CostDelta
              change={data.totals.change}
              changePercent={data.totals.changePercent}
              comparisonLabel="vs. previous period"
            />
          )
        }
        helper={
          data ? `Previous: ${formatCurrency(data.totals.previous, c, 'compact')}` : undefined
        }
      />
      <KpiTile
        label="Daily average"
        value={formatCurrency(data?.totals.dailyAverage ?? 0, c, 'compact')}
        loading={loading}
        helper="Across the selected period"
      />
      <KpiTile
        label="Commitment discounts"
        value={formatCurrency(data?.totals.commitmentSavings ?? 0, c, 'compact')}
        loading={loading}
        helper="Billed − effective cost from RIs, Savings Plans and CUDs"
      />
    </section>
  );
}
