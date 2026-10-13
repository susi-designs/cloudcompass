import { StackedAreaChart } from '@carbon/charts-react';
import { ScaleTypes, type ChartTabularData, type StackedAreaChartOptions } from '@carbon/charts';
import { useMemo } from 'react';
import { ChartCard } from '../../../components/ChartCard';
import type { OverviewData } from '../../../data/overview';
import { formatCurrency, formatDate } from '../../../lib/format';
import { useThemePreference } from '../../../shell/themeContext';

interface Props {
  data: OverviewData | undefined;
  loading: boolean;
}

export function SpendOverTimeChart({ data, loading }: Props) {
  const { theme } = useThemePreference();
  const currency = data?.currency ?? 'USD';

  const options = useMemo<StackedAreaChartOptions>(
    () => ({
      axes: {
        left: {
          mapsTo: 'value',
          stacked: true,
          scaleType: ScaleTypes.LINEAR,
          ticks: {
            formatter: (tick: number | Date) => formatCurrency(Number(tick), currency, 'compact'),
          },
        },
        bottom: { mapsTo: 'date', scaleType: ScaleTypes.TIME },
      },
      curve: 'curveMonotoneX',
      height: '20rem',
      theme,
      toolbar: { enabled: false },
      legend: { alignment: 'left' },
      tooltip: {
        showTotal: true,
        valueFormatter: (value: unknown) => formatCurrency(Number(value), currency),
      },
    }),
    [theme, currency],
  );

  const rows = useMemo(() => data?.dailyByEnvironment ?? [], [data]);
  const summary = data
    ? `${formatCurrency(data.period.total, currency, 'compact')} billed from ${formatDate(data.period.start)} to ${formatDate(data.period.end)}, split by environment.`
    : 'Loading…';

  // Table view: one row per day with a column per environment.
  const table = useMemo(() => {
    const byDay = new Map<string, Record<string, string | number>>();
    for (const r of rows) {
      const row = byDay.get(r.date) ?? { date: r.date };
      row[r.group] = formatCurrency(r.value, currency);
      byDay.set(r.date, row);
    }
    return {
      columns: [
        { key: 'date', header: 'Date', kind: 'date' as const },
        { key: 'PROD', header: 'PROD', kind: 'currency' as const },
        { key: 'TEST', header: 'TEST', kind: 'currency' as const },
        { key: 'DEV', header: 'DEV', kind: 'currency' as const },
      ],
      rows: [...byDay.values()].reverse(),
    };
  }, [rows, currency]);

  return (
    <ChartCard
      title="Daily spend by environment"
      summary={summary}
      loading={loading}
      table={table}
      chart={<StackedAreaChart data={rows as unknown as ChartTabularData} options={options} />}
    />
  );
}
