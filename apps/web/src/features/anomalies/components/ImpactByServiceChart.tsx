import { SimpleBarChart } from '@carbon/charts-react';
import { ScaleTypes, type BarChartOptions, type ChartTabularData } from '@carbon/charts';
import { useMemo } from 'react';
import { ChartCard } from '../../../components/ChartCard';
import type { AnomaliesData } from '../../../data/anomalies';
import { formatCurrency, formatNumber } from '../../../lib/format';
import { useThemePreference } from '../../../shell/themeContext';

const MAX_BARS = 8;

/** Horizontal bars of unexpected spend by service over the selected period. */
export function ImpactByServiceChart({
  data,
  loading,
}: {
  data: AnomaliesData | undefined;
  loading: boolean;
}) {
  const { theme } = useThemePreference();
  const currency = data?.currency ?? 'USD';
  const groups = useMemo(() => data?.impactByService ?? [], [data]);
  const rows = useMemo(
    () => groups.slice(0, MAX_BARS).map((g) => ({ group: g.label, value: Math.round(g.impact) })),
    [groups],
  );
  const options = useMemo<BarChartOptions>(
    () => ({
      axes: {
        left: {
          mapsTo: 'group',
          scaleType: ScaleTypes.LABELS,
          truncation: { threshold: 22, numCharacter: 22 },
        },
        bottom: {
          mapsTo: 'value',
          scaleType: ScaleTypes.LINEAR,
          ticks: {
            formatter: (t: number | Date) => formatCurrency(Number(t), currency, 'compact'),
          },
        },
      },
      height: '20rem',
      bars: { maxWidth: 32 },
      theme,
      legend: { enabled: false },
      toolbar: { enabled: false },
      tooltip: { valueFormatter: (v: unknown) => formatCurrency(Number(v), currency) },
    }),
    [theme, currency],
  );
  const total = groups.reduce((s, g) => s + g.impact, 0);
  const top = groups[0];
  const summary = top
    ? `${top.label} drove the most unexpected spend: ${formatCurrency(top.impact, currency, 'compact')}, ${Math.round((top.impact / total) * 100)}% of the period's total.${groups.length > MAX_BARS ? ` Top ${MAX_BARS} of ${groups.length} services shown.` : ''}`
    : 'No unexpected spend in this period.';
  return (
    <ChartCard
      title="Unexpected spend by service"
      summary={summary}
      loading={loading}
      table={{
        columns: [
          { key: 'group', header: 'Service', kind: 'text' },
          { key: 'count', header: 'Anomalies', kind: 'number' },
          { key: 'impact', header: 'Impact', kind: 'currency' },
        ],
        rows: groups.map((g) => ({
          group: g.label,
          count: formatNumber(g.count),
          impact: formatCurrency(g.impact, currency),
        })),
      }}
      chart={<SimpleBarChart data={rows as unknown as ChartTabularData} options={options} />}
    />
  );
}
