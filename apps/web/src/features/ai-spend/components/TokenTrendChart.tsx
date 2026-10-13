import { LineChart } from '@carbon/charts-react';
import { ScaleTypes, type ChartTabularData, type LineChartOptions } from '@carbon/charts';
import { useMemo } from 'react';
import { ChartCard } from '../../../components/ChartCard';
import type { AiSpendData } from '../../../data/aiSpend';
import { formatCompactNumber } from '../../../lib/format';
import { useThemePreference } from '../../../shell/themeContext';

export function TokenTrendChart({
  data,
  loading,
}: {
  data: AiSpendData | undefined;
  loading: boolean;
}) {
  const { theme } = useThemePreference();
  const series = useMemo(() => data?.tokenSeries ?? [], [data]);
  const daily = data?.granularity === 'day';
  const options = useMemo<LineChartOptions>(
    () => ({
      axes: {
        left: {
          mapsTo: 'value',
          scaleType: ScaleTypes.LINEAR,
          title: 'Tokens',
          ticks: { formatter: (t: number | Date) => formatCompactNumber(Number(t)) },
        },
        bottom: daily
          ? { mapsTo: 'date', scaleType: ScaleTypes.TIME }
          : {
              mapsTo: 'key',
              scaleType: ScaleTypes.LABELS,
              truncation: { threshold: 30, numCharacter: 30 },
            },
      },
      curve: 'curveMonotoneX',
      height: '20rem',
      theme,
      toolbar: { enabled: false },
      legend: { alignment: 'left' },
      tooltip: { valueFormatter: (v: unknown) => formatCompactNumber(Number(v)) },
    }),
    [theme, daily],
  );
  const first = series.filter((s) => s.group === 'Input').at(0)?.value ?? 0;
  const last = series.filter((s) => s.group === 'Input').at(-2)?.value ?? 0;
  const growth = first > 0 ? ((last - first) / first) * 100 : 0;
  const table = useMemo(() => {
    const byKey = new Map<string, Record<string, string | number>>();
    for (const s of series) {
      const row = byKey.get(s.date) ?? { period: s.key };
      row[s.group] = formatCompactNumber(s.value);
      byKey.set(s.date, row);
    }
    return {
      columns: [
        { key: 'period', header: 'Period', kind: 'date' as const },
        { key: 'Input', header: 'Input', kind: 'number' as const },
        { key: 'Output', header: 'Output', kind: 'number' as const },
        { key: 'Cached input', header: 'Cached input', kind: 'number' as const },
      ],
      rows: [...byKey.values()].reverse(),
    };
  }, [series]);
  return (
    <ChartCard
      title="Token volume"
      summary={
        data
          ? `Input tokens ${growth >= 0 ? 'grew' : 'fell'} ${Math.abs(growth).toFixed(0)}% across the period (last full bucket vs. first).`
          : 'Loading…'
      }
      loading={loading}
      table={table}
      chart={<LineChart data={series as unknown as ChartTabularData} options={options} />}
    />
  );
}
