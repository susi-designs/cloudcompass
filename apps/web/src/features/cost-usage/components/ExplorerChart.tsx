import { StackedBarChart } from '@carbon/charts-react';
import { ScaleTypes, type ChartTabularData, type StackedBarChartOptions } from '@carbon/charts';
import { useMemo } from 'react';
import { ChartCard } from '../../../components/ChartCard';
import {
  GRANULARITY_OPTIONS,
  GROUP_BY_OPTIONS,
  type ExplorerData,
  type ExplorerSettings,
} from '../../../data/explorer';
import { formatCurrency, formatDate } from '../../../lib/format';
import { useThemePreference } from '../../../shell/themeContext';

interface Props {
  data: ExplorerData | undefined;
  settings: ExplorerSettings;
  loading: boolean;
}

export function ExplorerChart({ data, settings, loading }: Props) {
  const { theme } = useThemePreference();
  const currency = data?.currency ?? 'USD';
  const groupLabel = GROUP_BY_OPTIONS.find((g) => g.id === settings.groupBy)?.label ?? '';
  const granularity = GRANULARITY_OPTIONS.find((g) => g.id === settings.granularity)?.label ?? '';
  const series = useMemo(() => data?.series ?? [], [data]);

  const options = useMemo<StackedBarChartOptions>(
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
        // Daily uses a time axis; weekly / monthly use evenly spaced labelled buckets.
        bottom:
          settings.granularity === 'day'
            ? { mapsTo: 'date', scaleType: ScaleTypes.TIME }
            : {
                mapsTo: 'key',
                scaleType: ScaleTypes.LABELS,
                truncation: { threshold: 30, numCharacter: 30 },
              },
      },
      height: '22rem',
      bars: { maxWidth: 48 },
      theme,
      toolbar: { enabled: false },
      legend: { alignment: 'left', truncation: { threshold: 28, numCharacter: 28 } },
      tooltip: {
        showTotal: true,
        valueFormatter: (value: unknown) => formatCurrency(Number(value), currency),
      },
    }),
    [theme, currency, settings.granularity],
  );

  const top = data?.rows[0];
  const summary = data
    ? `${granularity} ${groupLabel.toLowerCase()} spend from ${formatDate(data.period.start)} to ${formatDate(data.period.end)}${top ? `; ${top.label} is the largest at ${formatCurrency(top.total, currency, 'compact')}` : ''}.`
    : 'Loading…';

  const table = useMemo(() => {
    const groups = [...new Set(series.map((s) => s.group))];
    const byDate = new Map<string, Record<string, string | number>>();
    for (const s of series) {
      const row = byDate.get(s.date) ?? { date: s.key };
      row[s.group] = formatCurrency(s.value, currency);
      byDate.set(s.date, row);
    }
    return {
      columns: [
        { key: 'date', header: 'Period', kind: 'date' as const },
        ...groups.map((g) => ({ key: g, header: g, kind: 'currency' as const })),
      ],
      rows: [...byDate.values()].reverse(),
    };
  }, [series, currency]);

  return (
    <ChartCard
      title={`Spend by ${groupLabel.toLowerCase()}`}
      summary={summary}
      loading={loading}
      table={table}
      chart={<StackedBarChart data={series as unknown as ChartTabularData} options={options} />}
    />
  );
}
