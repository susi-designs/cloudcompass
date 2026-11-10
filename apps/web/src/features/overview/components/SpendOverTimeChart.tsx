import { LineChart, StackedAreaChart } from '@carbon/charts-react';
import {
  ScaleTypes,
  type ChartTabularData,
  type LineChartOptions,
  type StackedAreaChartOptions,
} from '@carbon/charts';
import { ChartArea, ChartMultiLine } from '@carbon/icons-react';
import { useCallback, useMemo } from 'react';
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

  // The tooltip header row is the date ("x-value"); every other row is an amount.
  const tooltipValue = useCallback(
    (value: unknown, label: string) =>
      label === 'x-value'
        ? formatDate(new Date(value as Date).toISOString().slice(0, 10))
        : formatCurrency(Number(value), currency),
    [currency],
  );

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
        valueFormatter: tooltipValue,
      },
    }),
    [theme, currency, tooltipValue],
  );

  // Same data, unstacked: each line is one environment's actual daily spend, for side-by-side comparison.
  const compareOptions = useMemo<LineChartOptions>(
    () => ({
      axes: {
        left: {
          mapsTo: 'value',
          scaleType: ScaleTypes.LINEAR,
          ticks: {
            formatter: (tick: number | Date) => formatCurrency(Number(tick), currency, 'compact'),
          },
        },
        bottom: { mapsTo: 'date', scaleType: ScaleTypes.TIME },
      },
      curve: 'curveMonotoneX',
      points: { enabled: false },
      timeScale: { addSpaceOnEdges: 0 },
      height: '20rem',
      theme,
      toolbar: { enabled: false },
      legend: { alignment: 'left' },
      tooltip: {
        showTotal: false,
        valueFormatter: tooltipValue,
      },
    }),
    [theme, currency, tooltipValue],
  );

  const rows = useMemo(() => data?.dailyByEnvironment ?? [], [data]);

  // Period total per environment, largest first, so the summary states the actual values.
  const totals = useMemo(() => {
    const byEnv = new Map<string, number>();
    for (const r of rows) byEnv.set(r.group, (byEnv.get(r.group) ?? 0) + r.value);
    return [...byEnv.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const summary = data
    ? `${formatCurrency(data.period.total, currency, 'compact')} billed from ${formatDate(data.period.start)} to ${formatDate(data.period.end)}: ${totals
        .map(([env, total]) => `${env} ${formatCurrency(total, currency, 'compact')}`)
        .join(', ')}.`
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
      chart={[
        {
          name: 'compare',
          text: 'Compare environments (actual values)',
          icon: <ChartMultiLine />,
          chart: <LineChart data={rows as unknown as ChartTabularData} options={compareOptions} />,
        },
        {
          name: 'stacked',
          text: 'View as stacked area (total spend)',
          icon: <ChartArea />,
          chart: <StackedAreaChart data={rows as unknown as ChartTabularData} options={options} />,
        },
      ]}
    />
  );
}
