import { SimpleBarChart } from '@carbon/charts-react';
import { ScaleTypes, type BarChartOptions, type ChartTabularData } from '@carbon/charts';
import { useMemo } from 'react';
import { ChartCard } from '../../../components/ChartCard';
import type { OverviewData } from '../../../data/overview';
import { formatCurrency } from '../../../lib/format';
import { useThemePreference } from '../../../shell/themeContext';

interface Props {
  data: OverviewData | undefined;
  loading: boolean;
}

export function SpendByLobChart({ data, loading }: Props) {
  const { theme } = useThemePreference();
  const currency = data?.currency ?? 'USD';
  const rows = data?.spendByLob ?? [];

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
            formatter: (tick: number | Date) => formatCurrency(Number(tick), currency, 'compact'),
          },
        },
      },
      height: '20rem',
      theme,
      legend: { enabled: false },
      toolbar: { enabled: false },
      tooltip: { valueFormatter: (value: unknown) => formatCurrency(Number(value), currency) },
    }),
    [theme, currency],
  );

  const top = rows[0];
  const summary = top
    ? `${top.group} is the largest line of business at ${formatCurrency(top.value, currency, 'compact')} in the selected period.`
    : 'No spend in the selected scope.';

  return (
    <ChartCard
      title="Spend by line of business"
      summary={summary}
      loading={loading}
      table={{
        columns: [
          { key: 'group', header: 'Line of business', kind: 'text' },
          { key: 'value', header: 'Billed cost', kind: 'currency' },
        ],
        rows: rows.map((r) => ({ group: r.group, value: formatCurrency(r.value, currency) })),
      }}
      chart={<SimpleBarChart data={rows as unknown as ChartTabularData} options={options} />}
    />
  );
}
