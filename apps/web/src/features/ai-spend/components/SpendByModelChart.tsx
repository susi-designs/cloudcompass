import { SimpleBarChart } from '@carbon/charts-react';
import { ScaleTypes, type BarChartOptions, type ChartTabularData } from '@carbon/charts';
import { useMemo } from 'react';
import { ChartCard } from '../../../components/ChartCard';
import type { AiSpendData } from '../../../data/aiSpend';
import { formatCompactNumber, formatCurrency } from '../../../lib/format';
import { useThemePreference } from '../../../shell/themeContext';

export function SpendByModelChart({
  data,
  loading,
}: {
  data: AiSpendData | undefined;
  loading: boolean;
}) {
  const { theme } = useThemePreference();
  const c = data?.currency ?? 'USD';
  const rows = useMemo(
    () => (data?.byModel ?? []).map((m) => ({ group: m.model, value: Math.round(m.cost) })),
    [data],
  );
  const options = useMemo<BarChartOptions>(
    () => ({
      axes: {
        left: {
          mapsTo: 'group',
          scaleType: ScaleTypes.LABELS,
          truncation: { threshold: 24, numCharacter: 24 },
        },
        bottom: {
          mapsTo: 'value',
          scaleType: ScaleTypes.LINEAR,
          ticks: { formatter: (t: number | Date) => formatCurrency(Number(t), c, 'compact') },
        },
      },
      height: '20rem',
      theme,
      legend: { enabled: false },
      toolbar: { enabled: false },
      tooltip: { valueFormatter: (v: unknown) => formatCurrency(Number(v), c) },
    }),
    [theme, c],
  );
  const top = data?.byModel[0];
  const share = top && data ? (top.cost / data.kpis.llmCost) * 100 : 0;
  return (
    <ChartCard
      title="LLM spend by model"
      summary={
        top
          ? `${top.model} accounts for ${share.toFixed(0)}% of LLM API spend.`
          : 'No LLM usage in scope.'
      }
      loading={loading}
      table={{
        columns: [
          { key: 'model', header: 'Model', kind: 'text' },
          { key: 'provider', header: 'Provider', kind: 'text' },
          { key: 'requests', header: 'Requests', kind: 'number' },
          { key: 'tokens', header: 'Tokens', kind: 'number' },
          { key: 'cost', header: 'Cost', kind: 'currency' },
        ],
        rows: (data?.byModel ?? []).map((m) => ({
          model: m.model,
          provider: m.provider,
          requests: formatCompactNumber(m.requests),
          tokens: formatCompactNumber(m.tokens),
          cost: formatCurrency(m.cost, c),
        })),
      }}
      chart={<SimpleBarChart data={rows as unknown as ChartTabularData} options={options} />}
    />
  );
}
