import { StackedBarChart } from '@carbon/charts-react';
import { ScaleTypes, type ChartTabularData, type StackedBarChartOptions } from '@carbon/charts';
import { useMemo } from 'react';
import { ChartCard } from '../../../components/ChartCard';
import type { AiSpendData } from '../../../data/aiSpend';
import { formatCurrency, formatDate } from '../../../lib/format';
import { useThemePreference } from '../../../shell/themeContext';

export function AiSpendTrendChart({
  data,
  loading,
}: {
  data: AiSpendData | undefined;
  loading: boolean;
}) {
  const { theme } = useThemePreference();
  const c = data?.currency ?? 'USD';
  const series = useMemo(() => data?.spendSeries ?? [], [data]);
  const daily = data?.granularity === 'day';
  const options = useMemo<StackedBarChartOptions>(
    () => ({
      axes: {
        left: {
          mapsTo: 'value',
          stacked: true,
          scaleType: ScaleTypes.LINEAR,
          ticks: { formatter: (t: number | Date) => formatCurrency(Number(t), c, 'compact') },
        },
        bottom: daily
          ? { mapsTo: 'date', scaleType: ScaleTypes.TIME }
          : {
              mapsTo: 'key',
              scaleType: ScaleTypes.LABELS,
              truncation: { threshold: 30, numCharacter: 30 },
            },
      },
      height: '20rem',
      theme,
      bars: { maxWidth: 40 },
      toolbar: { enabled: false },
      legend: { alignment: 'left' },
      tooltip: { showTotal: true, valueFormatter: (v: unknown) => formatCurrency(Number(v), c) },
    }),
    [theme, c, daily],
  );
  const table = useMemo(() => {
    const groups = [...new Set(series.map((s) => s.group))];
    const byKey = new Map<string, Record<string, string | number>>();
    for (const s of series) {
      const row = byKey.get(s.date) ?? { period: s.key };
      row[s.group] = formatCurrency(s.value, c);
      byKey.set(s.date, row);
    }
    return {
      columns: [
        { key: 'period', header: 'Period', kind: 'date' as const },
        ...groups.map((g) => ({ key: g, header: g, kind: 'currency' as const })),
      ],
      rows: [...byKey.values()].reverse(),
    };
  }, [series, c]);
  const summary = data
    ? `${formatCurrency(data.kpis.total, c, 'compact')} on LLM APIs and GPU clusters from ${formatDate(data.period.start)} to ${formatDate(data.period.end)}, by provider.`
    : 'Loading…';
  return (
    <ChartCard
      title="AI spend by provider"
      summary={summary}
      loading={loading}
      table={table}
      chart={<StackedBarChart data={series as unknown as ChartTabularData} options={options} />}
    />
  );
}
