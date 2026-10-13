import { LineChart } from '@carbon/charts-react';
import { ScaleTypes, type ChartTabularData, type LineChartOptions } from '@carbon/charts';
import { useMemo } from 'react';
import { ChartCard } from '../../../components/ChartCard';
import type { AnomalyDetail, AnomalyRow } from '../../../data/anomalies';
import { formatCurrency, formatDate } from '../../../lib/format';
import { useThemePreference } from '../../../shell/themeContext';

interface Props {
  row: AnomalyRow;
  detail: AnomalyDetail | undefined;
  currency: string;
}

/** Daily cost of the resource behind an anomaly, with the expected level and detection day. */
export function AnomalyCostChart({ row, detail, currency }: Props) {
  const { theme } = useThemePreference();
  const series = useMemo(
    () =>
      (detail?.daily ?? []).map((d) => ({
        group: 'Daily cost',
        date: `${d.date}T00:00:00.000Z`,
        value: d.cost,
      })),
    [detail],
  );
  const options = useMemo<LineChartOptions>(
    () => ({
      axes: {
        bottom: {
          mapsTo: 'date',
          scaleType: ScaleTypes.TIME,
          thresholds: [
            {
              value: new Date(`${row.detectedAt}T00:00:00.000Z`),
              label: 'Detected',
              valueFormatter: () => formatDate(row.detectedAt),
            },
          ],
        },
        left: {
          mapsTo: 'value',
          scaleType: ScaleTypes.LINEAR,
          ticks: {
            formatter: (t: number | Date) => formatCurrency(Number(t), currency, 'compact'),
          },
          thresholds: detail
            ? [
                {
                  value: detail.expectedDaily,
                  label: 'Expected per day',
                  valueFormatter: (v: unknown) => formatCurrency(Number(v), currency),
                },
              ]
            : [],
        },
      },
      curve: 'curveMonotoneX',
      height: '14rem',
      theme,
      legend: { enabled: false },
      toolbar: { enabled: false },
      tooltip: { valueFormatter: (v: unknown) => formatCurrency(Number(v), currency) },
    }),
    [theme, currency, row.detectedAt, detail],
  );

  const summary = detail
    ? `${formatCurrency(detail.actualDaily, currency)} a day during the anomaly vs. ${formatCurrency(detail.expectedDaily, currency)} expected (dashed line).`
    : 'Loading…';

  return (
    <ChartCard
      title="Daily cost of the resource"
      summary={summary}
      loading={!detail}
      table={{
        columns: [
          { key: 'date', header: 'Date', kind: 'date' },
          { key: 'window', header: 'Anomaly window', kind: 'text' },
          { key: 'cost', header: 'Billed cost', kind: 'currency' },
        ],
        rows: [...(detail?.daily ?? [])].reverse().map((d) => ({
          date: formatDate(d.date),
          window: d.anomalous ? 'Yes' : '',
          cost: formatCurrency(d.cost, currency),
        })),
      }}
      chart={<LineChart data={series as unknown as ChartTabularData} options={options} />}
    />
  );
}
