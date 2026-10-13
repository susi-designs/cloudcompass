import { KpiTile } from '../../../components/KpiTile';
import type { OptimizationData } from '../../../data/optimization';
import { formatCurrency, formatNumber } from '../../../lib/format';

export function OptimizationKpis({
  data,
  loading,
}: {
  data: OptimizationData | undefined;
  loading: boolean;
}) {
  const c = data?.currency ?? 'USD';
  const k = data?.kpis;
  const money = (v: number | undefined) => formatCurrency(v ?? 0, c, 'compact');
  return (
    <section className="cc-kpi-row" aria-label="Optimization summary">
      <KpiTile
        label="Open savings · per month"
        value={money(k?.openSavings)}
        loading={loading}
        helper={
          k
            ? `${formatNumber(k.openCount)} open recommendations · ${formatNumber(k.unassignedCount)} unassigned`
            : undefined
        }
      />
      <KpiTile
        label="Quick wins · per month"
        value={money(k?.quickWinSavings)}
        loading={loading}
        helper={
          k ? `${formatNumber(k.quickWinCount)} open with low effort and low risk` : undefined
        }
      />
      <KpiTile
        label="In progress · per month"
        value={money(k?.acceptedSavings)}
        loading={loading}
        helper={k ? `${formatNumber(k.acceptedCount)} accepted, not yet implemented` : undefined}
      />
      <KpiTile
        label="Realized savings · per month"
        value={money(k?.realizedRunRate)}
        loading={loading}
        helper={
          k
            ? `${formatNumber(k.implementedCount)} implemented · ${money(k.realizedRunRate * 12)} a year`
            : undefined
        }
      />
    </section>
  );
}
