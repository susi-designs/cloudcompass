import { GroupedBarChart } from '@carbon/charts-react';
import { ScaleTypes, type BarChartOptions, type ChartTabularData } from '@carbon/charts';
import { useMemo } from 'react';
import { ChartCard } from '../../../components/ChartCard';
import type { LedgerData } from '../../../data/optimization';
import { formatCurrency } from '../../../lib/format';
import { useThemePreference } from '../../../shell/themeContext';

export function LedgerChart({ data, loading }: { data: LedgerData | undefined; loading: boolean }) {
  const { theme } = useThemePreference();
  const c = data?.currency ?? 'USD';
  const months = useMemo(() => data?.months ?? [], [data]);
  const chartData = useMemo(
    () =>
      months.flatMap((m) => [
        { group: 'Projected', key: m.label, value: Math.round(m.projected) },
        { group: 'Realized', key: m.label, value: Math.round(m.realized) },
      ]),
    [months],
  );
  const options = useMemo<BarChartOptions>(
    () => ({
      axes: {
        left: {
          mapsTo: 'value',
          scaleType: ScaleTypes.LINEAR,
          ticks: { formatter: (t: number | Date) => formatCurrency(Number(t), c, 'compact') },
        },
        bottom: {
          mapsTo: 'key',
          scaleType: ScaleTypes.LABELS,
          truncation: { threshold: 30, numCharacter: 30 },
        },
      },
      height: '20rem',
      bars: { maxWidth: 32 },
      theme,
      toolbar: { enabled: false },
      legend: { alignment: 'left' },
      tooltip: { valueFormatter: (v: unknown) => formatCurrency(Number(v), c) },
    }),
    [theme, c],
  );
  const k = data?.kpis;
  const summary = !data
    ? 'Loading…'
    : k && k.projectedInPeriod > 0
      ? `${formatCurrency(k.realizedInPeriod, c, 'compact')} realized against ${formatCurrency(k.projectedInPeriod, c, 'compact')} projected for implemented recommendations in the selected period.`
      : 'No implemented recommendations saved money in the selected period.';
  return (
    <ChartCard
      title="Projected vs. realized savings by month"
      summary={summary}
      loading={loading}
      table={{
        columns: [
          { key: 'month', header: 'Month', kind: 'date' },
          { key: 'projected', header: 'Projected', kind: 'currency' },
          { key: 'realized', header: 'Realized', kind: 'currency' },
          { key: 'gap', header: 'Realized − projected', kind: 'currency' },
        ],
        rows: months.map((m) => ({
          month: m.label,
          projected: formatCurrency(m.projected, c),
          realized: formatCurrency(m.realized, c),
          gap: formatCurrency(m.realized - m.projected, c),
        })),
      }}
      chart={<GroupedBarChart data={chartData as unknown as ChartTabularData} options={options} />}
    />
  );
}
