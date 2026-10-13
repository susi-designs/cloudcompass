import { GroupedBarChart } from '@carbon/charts-react';
import { ScaleTypes, type BarChartOptions, type ChartTabularData } from '@carbon/charts';
import { useMemo } from 'react';
import { ChartCard } from '../../../components/ChartCard';
import type { BudgetsData } from '../../../data/budgets';
import { formatCurrency } from '../../../lib/format';
import { useThemePreference } from '../../../shell/themeContext';

interface Props {
  data: BudgetsData | undefined;
  loading: boolean;
}

export function BudgetHistoryChart({ data, loading }: Props) {
  const { theme } = useThemePreference();
  const currency = data?.currency ?? 'USD';
  const history = useMemo(() => data?.history ?? [], [data]);
  const chartData = useMemo(
    () =>
      history.flatMap((m) => [
        { group: 'Actual / forecast', key: m.label, value: Math.round(m.actual) },
        { group: 'Budget', key: m.label, value: Math.round(m.budget) },
      ]),
    [history],
  );

  const options = useMemo<BarChartOptions>(
    () => ({
      axes: {
        left: {
          mapsTo: 'value',
          scaleType: ScaleTypes.LINEAR,
          ticks: {
            formatter: (tick: number | Date) => formatCurrency(Number(tick), currency, 'compact'),
          },
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
      legend: { alignment: 'left', truncation: { threshold: 30, numCharacter: 30 } },
      tooltip: { valueFormatter: (value: unknown) => formatCurrency(Number(value), currency) },
    }),
    [theme, currency],
  );

  const over = history.filter((m) => m.actual > m.budget).length;
  const summary = data
    ? `Monthly spend vs. a ${formatCurrency(data.totals.budget, currency, 'compact')} monthly budget for the applications in scope; ${over} of ${history.length} months over budget (current month is a forecast).`
    : 'Loading…';

  return (
    <ChartCard
      title="Budget vs. actual by month"
      summary={summary}
      loading={loading}
      table={{
        columns: [
          { key: 'month', header: 'Month', kind: 'date' },
          { key: 'actual', header: 'Actual / forecast', kind: 'currency' },
          { key: 'budget', header: 'Budget', kind: 'currency' },
          { key: 'variance', header: 'Variance', kind: 'currency' },
        ],
        rows: history.map((m) => ({
          month: m.label,
          actual: formatCurrency(m.actual, currency),
          budget: formatCurrency(m.budget, currency),
          variance: `${m.actual - m.budget > 0 ? '+' : ''}${formatCurrency(m.actual - m.budget, currency)}`,
        })),
      }}
      chart={<GroupedBarChart data={chartData as unknown as ChartTabularData} options={options} />}
    />
  );
}
