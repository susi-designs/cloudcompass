import { SimpleBarChart } from '@carbon/charts-react';
import { ScaleTypes, type BarChartOptions, type ChartTabularData } from '@carbon/charts';
import { useMemo } from 'react';
import { ChartCard } from '../../../components/ChartCard';
import { UNDERUTILIZED_CPU, type UtilizationData } from '../../../data/utilization';
import { useThemePreference } from '../../../shell/themeContext';

interface Props {
  data: UtilizationData | undefined;
  loading: boolean;
}

export function CpuDistributionChart({ data, loading }: Props) {
  const { theme } = useThemePreference();
  const bands = useMemo(() => data?.distribution ?? [], [data]);
  const options = useMemo<BarChartOptions>(
    () => ({
      axes: {
        left: { mapsTo: 'value', scaleType: ScaleTypes.LINEAR, title: 'Resources' },
        bottom: {
          mapsTo: 'group',
          scaleType: ScaleTypes.LABELS,
          title: 'Average CPU (last 30 days)',
        },
      },
      height: '20rem',
      theme,
      legend: { enabled: false },
      toolbar: { enabled: false },
      bars: { maxWidth: 40 },
    }),
    [theme],
  );
  const low = bands.slice(0, UNDERUTILIZED_CPU / 10).reduce((s, b) => s + b.value, 0);
  const total = bands.reduce((s, b) => s + b.value, 0);
  const summary = data
    ? `${low} of ${total} compute and database resources average under ${UNDERUTILIZED_CPU}% CPU.`
    : 'Loading…';

  return (
    <ChartCard
      title="CPU utilization distribution"
      summary={summary}
      loading={loading}
      table={{
        columns: [
          { key: 'group', header: 'Average CPU', kind: 'text' },
          { key: 'value', header: 'Resources', kind: 'number' },
        ],
        rows: bands,
      }}
      chart={<SimpleBarChart data={bands as unknown as ChartTabularData} options={options} />}
    />
  );
}
