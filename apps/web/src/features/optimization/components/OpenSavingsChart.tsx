import { SimpleBarChart } from '@carbon/charts-react';
import { ScaleTypes, type BarChartOptions, type ChartTabularData } from '@carbon/charts';
import { useMemo } from 'react';
import { ChartCard } from '../../../components/ChartCard';
import type { SavingsGroup } from '../../../data/optimization';
import { formatCurrency, formatNumber } from '../../../lib/format';
import { useThemePreference } from '../../../shell/themeContext';

interface Props {
  title: string;
  /** Header for the grouping column in the table view. */
  groupHeader: string;
  groups: SavingsGroup[];
  currency: string;
  loading: boolean;
}

/** Horizontal bars of open monthly savings by a grouping (type, LOB). */
export function OpenSavingsChart({ title, groupHeader, groups, currency, loading }: Props) {
  const { theme } = useThemePreference();
  const rows = useMemo(
    () => groups.map((g) => ({ group: g.label, value: Math.round(g.savings) })),
    [groups],
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
      tooltip: { valueFormatter: (v: unknown) => `${formatCurrency(Number(v), currency)} / mo` },
    }),
    [theme, currency],
  );
  const total = groups.reduce((s, g) => s + g.savings, 0);
  const top = groups[0];
  const summary = top
    ? `${top.label} is the largest opportunity at ${formatCurrency(top.savings, currency, 'compact')} a month, ${Math.round((top.savings / total) * 100)}% of open savings.`
    : 'No open recommendations in scope.';
  return (
    <ChartCard
      title={title}
      summary={summary}
      loading={loading}
      table={{
        columns: [
          { key: 'group', header: groupHeader, kind: 'text' },
          { key: 'count', header: 'Recommendations', kind: 'number' },
          { key: 'savings', header: 'Est. savings / mo', kind: 'currency' },
        ],
        rows: groups.map((g) => ({
          group: g.label,
          count: formatNumber(g.count),
          savings: formatCurrency(g.savings, currency),
        })),
      }}
      chart={<SimpleBarChart data={rows as unknown as ChartTabularData} options={options} />}
    />
  );
}
