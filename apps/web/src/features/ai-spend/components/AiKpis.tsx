import { CostDelta } from '../../../components/CostDelta';
import { KpiTile } from '../../../components/KpiTile';
import type { AiSpendData } from '../../../data/aiSpend';
import { formatCompactNumber, formatCurrency } from '../../../lib/format';

export function AiKpis({ data, loading }: { data: AiSpendData | undefined; loading: boolean }) {
  const c = data?.currency ?? 'USD';
  const k = data?.kpis;
  const pct = (v: number | null | undefined) => (v == null ? '—' : `${Math.round(v)}%`);
  return (
    <section className="cc-kpi-row" aria-label="AI spend summary">
      <KpiTile
        label="AI spend · selected period"
        value={formatCurrency(k?.total ?? 0, c, 'compact')}
        loading={loading}
        footer={
          k && (
            <CostDelta
              change={k.change}
              changePercent={k.changePercent}
              comparisonLabel="vs. previous period"
            />
          )
        }
        helper={k ? `Previous: ${formatCurrency(k.previous, c, 'compact')}` : undefined}
      />
      <KpiTile
        label="LLM APIs"
        value={formatCurrency(k?.llmCost ?? 0, c, 'compact')}
        loading={loading}
        helper={
          k?.costPerMillionTokens != null
            ? `${formatCurrency(k.costPerMillionTokens, c)} per 1M tokens (blended)`
            : undefined
        }
      />
      <KpiTile
        label="GPU clusters"
        value={formatCurrency(k?.gpuCost ?? 0, c, 'compact')}
        loading={loading}
        helper={k ? `${pct(k.gpuUtilization)} average GPU utilization` : undefined}
      />
      <KpiTile
        label="Tokens processed"
        value={formatCompactNumber(k?.tokens ?? 0)}
        loading={loading}
        helper={k ? `${formatCompactNumber(k.requests)} requests` : undefined}
      />
      <KpiTile
        label="Prompt cache hit rate"
        value={pct(k?.cacheHitPercent)}
        loading={loading}
        helper="Share of input tokens served from cache (billed at a discount)"
      />
    </section>
  );
}
