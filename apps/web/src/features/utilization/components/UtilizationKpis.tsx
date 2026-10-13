import { KpiTile } from '../../../components/KpiTile';
import { formatCurrency, formatNumber } from '../../../lib/format';
import type { UtilizationData } from '../../../data/utilization';
import { UNDERUTILIZED_CPU } from '../../../data/utilization';

interface Props {
  data: UtilizationData | undefined;
  loading: boolean;
}

const pct = (v: number | null | undefined) => (v == null ? '—' : `${Math.round(v)}%`);

export function UtilizationKpis({ data, loading }: Props) {
  const c = data?.currency ?? 'USD';
  const k = data?.kpis;
  return (
    <section className="cc-kpi-row" aria-label="Utilization summary">
      <KpiTile
        label="Average CPU"
        value={pct(k?.avgCpu)}
        loading={loading}
        helper={
          k
            ? `Cost-weighted across ${formatNumber(k.measuredCount)} compute & database resources · last 30 days`
            : undefined
        }
      />
      <KpiTile
        label="Average memory"
        value={pct(k?.avgMemory)}
        loading={loading}
        helper="Cost-weighted · last 30 days"
      />
      <KpiTile
        label="Idle resources"
        value={formatNumber(k?.idleCount ?? 0)}
        loading={loading}
        footer={k && <span>{formatCurrency(k.idleMonthlyCost, c, 'compact')}/mo wasted</span>}
        helper="Low CPU, stopped, unattached or stale"
      />
      <KpiTile
        label="Under-utilized"
        value={formatNumber(k?.underutilizedCount ?? 0)}
        loading={loading}
        footer={
          k && (
            <span>~{formatCurrency(k.underutilizedSavings, c, 'compact')}/mo by rightsizing</span>
          )
        }
        helper={`Average CPU below ${UNDERUTILIZED_CPU}%`}
      />
      <KpiTile
        label="Commitment coverage"
        value={pct(k?.commitmentCoverage)}
        loading={loading}
        helper="Share of commitment-eligible spend covered by RIs, Savings Plans or CUDs in the selected period"
      />
    </section>
  );
}
