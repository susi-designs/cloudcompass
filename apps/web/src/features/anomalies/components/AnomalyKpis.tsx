import { KpiTile } from '../../../components/KpiTile';
import { MTTR_TARGET_DAYS, type AnomaliesData } from '../../../data/anomalies';
import { formatCurrency, formatNumber } from '../../../lib/format';
import { SeverityCounts } from '../../../components/SeverityCounts';

const days = (n: number) => `${n.toFixed(1)} day${n.toFixed(1) === '1.0' ? '' : 's'}`;

export function AnomalyKpis({
  data,
  loading,
}: {
  data: AnomaliesData | undefined;
  loading: boolean;
}) {
  const c = data?.currency ?? 'USD';
  const k = data?.kpis;
  const money = (v: number | undefined) => formatCurrency(v ?? 0, c, 'compact');
  return (
    <section className="cc-kpi-row" aria-label="Anomalies summary">
      <KpiTile
        label="Needs triage"
        value={k ? formatNumber(k.needsTriage) : ''}
        loading={loading}
        footer={k && k.needsTriage > 0 && <SeverityCounts counts={k.needsTriageBySeverity} />}
        helper={
          k
            ? k.needsTriage === 0
              ? 'Nothing waiting for triage'
              : `${formatNumber(k.unacknowledged)} not yet acknowledged`
            : undefined
        }
      />
      <KpiTile
        label="Impact waiting for triage"
        value={money(k?.needsTriageImpact)}
        loading={loading}
        helper={k ? 'Unplanned spend above expected, open and acknowledged' : undefined}
      />
      <KpiTile
        label="Unexpected spend · selected period"
        value={money(k?.unexpectedImpact)}
        loading={loading}
        helper={
          k
            ? `${formatNumber(k.detected)} detected · ${formatNumber(k.expectedCount)} marked expected`
            : undefined
        }
      />
      <KpiTile
        label="Mean time to resolve"
        value={k ? (k.mttrDays === null ? '—' : days(k.mttrDays)) : ''}
        loading={loading}
        helper={
          k
            ? k.mttrDays === null
              ? 'No anomalies resolved in this period'
              : `Target under ${MTTR_TARGET_DAYS} days · ${formatNumber(k.resolvedCount)} resolved${
                  k.mttaDays === null ? '' : ` · acknowledged in ${days(k.mttaDays)}`
                }`
            : undefined
        }
      />
    </section>
  );
}
