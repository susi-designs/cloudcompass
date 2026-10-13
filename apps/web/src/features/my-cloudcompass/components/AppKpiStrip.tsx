import { ProgressBar, Tag } from '@carbon/react';
import { CostDelta } from '../../../components/CostDelta';
import { KpiTile } from '../../../components/KpiTile';
import { SeverityCounts } from '../../../components/SeverityCounts';
import type { AppSnapshot } from '../../../data/myCloudCompass';
import { formatCurrency, formatDate, formatNumber, formatPercent } from '../../../lib/format';
import { BudgetStatusIndicator } from '../../cost-usage/components/BudgetStatusIndicator';

interface Props {
  snapshot: AppSnapshot | undefined;
  loading: boolean;
}

/** KPI strip for one application (PRODUCT.md §5.1 row 2). Same numbers as the pillar pages. */
export function AppKpiStrip({ snapshot, loading }: Props) {
  const c = snapshot?.overview.currency ?? 'USD';
  const money = (v: number | undefined) => formatCurrency(v ?? 0, c, 'compact');
  const o = snapshot?.overview;
  const b = snapshot?.budget;
  const ai = snapshot?.aiSpend.kpis;
  const opt = snapshot?.optimization.kpis;
  const an = snapshot?.anomalies.kpis;

  return (
    <section className="cc-kpi-row cc-kpi-row--six" aria-label="Application key metrics">
      <KpiTile
        label="Month-to-date spend"
        value={money(o?.mtd.value)}
        loading={loading}
        footer={
          o && (
            <CostDelta
              change={o.mtd.value - o.mtd.previous}
              changePercent={o.mtd.changePercent}
              comparisonLabel="vs. same days last month"
            />
          )
        }
        helper="vs. same days last month"
      />
      <KpiTile
        label="Forecast (month end)"
        value={money(o?.forecast.value)}
        loading={loading}
        footer={
          o && (
            <CostDelta
              change={o.forecast.value - o.forecast.previous}
              changePercent={o.forecast.changePercent}
              comparisonLabel="vs. last month"
            />
          )
        }
        helper={o ? `vs. last month's ${money(o.forecast.previous)} · Est.` : undefined}
      />
      <KpiTile
        label="Budget status"
        value={b ? formatPercent(b.forecastPercent) : ''}
        loading={loading}
        footer={
          b && (
            <span className="cc-kpi-budget">
              <BudgetStatusIndicator status={b.status} />
              <ProgressBar
                label="Forecast as share of budget"
                hideLabel
                size="small"
                max={100}
                value={Math.min(100, b.forecastPercent)}
                status={b.forecastPercent > 100 ? 'error' : 'active'}
              />
            </span>
          )
        }
        helper={b ? `Forecast vs. ${money(b.budget)} monthly budget` : undefined}
      />
      <KpiTile
        label="AI spend"
        value={money(ai?.total)}
        loading={loading}
        footer={
          ai &&
          (ai.total > 0 ? (
            <CostDelta
              change={ai.change}
              changePercent={ai.changePercent}
              comparisonLabel="vs. previous period"
            />
          ) : (
            <Tag type="gray" size="sm">
              No AI usage
            </Tag>
          ))
        }
        helper="Selected period vs. previous period"
      />
      <KpiTile
        label="Open savings / mo"
        value={opt ? money(opt.openSavings) : ''}
        loading={loading}
        footer={
          opt && (
            <span>
              {formatNumber(opt.openCount)} open · {formatNumber(opt.unassignedCount)} unassigned
            </span>
          )
        }
        helper="Estimated, from open recommendations"
      />
      <KpiTile
        label="Open anomalies"
        value={an ? formatNumber(an.needsTriage) : ''}
        loading={loading}
        footer={
          an &&
          (an.needsTriage > 0 ? (
            <SeverityCounts counts={an.needsTriageBySeverity} />
          ) : (
            <Tag type="green" size="sm">
              None open
            </Tag>
          ))
        }
        helper={
          snapshot
            ? `Open or acknowledged · as of ${formatDate(snapshot.anomalies.asOf)}`
            : undefined
        }
      />
    </section>
  );
}
