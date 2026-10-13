import { ScatterChart } from '@carbon/charts-react';
import { ScaleTypes, type ChartTabularData, type ScatterChartOptions } from '@carbon/charts';
import { useMemo } from 'react';
import { ChartCard } from '../../../components/ChartCard';
import { SEVERITIES, severityRank, type AnomaliesData } from '../../../data/anomalies';
import { formatCurrency, formatDate, formatPercent } from '../../../lib/format';
import { useThemePreference } from '../../../shell/themeContext';
import { SEVERITY_CHART_COLORS } from './severityColors';

interface Props {
  data: AnomaliesData | undefined;
  loading: boolean;
}

/** Each detected anomaly as a point: when it started and how much it cost above expected. */
export function AnomalyTimelineChart({ data, loading }: Props) {
  const { theme } = useThemePreference();
  const currency = data?.currency ?? 'USD';
  const points = useMemo(() => data?.timeline ?? [], [data]);

  const chartData = useMemo(
    () =>
      points.map((p) => ({
        group: p.severity,
        date: `${p.date}T00:00:00.000Z`,
        value: Math.round(p.impact),
        label: p.label,
      })),
    [points],
  );

  const options = useMemo<ScatterChartOptions>(
    () => ({
      axes: {
        bottom: {
          mapsTo: 'date',
          scaleType: ScaleTypes.TIME,
        },
        left: {
          mapsTo: 'value',
          scaleType: ScaleTypes.LINEAR,
          title: 'Impact above expected',
          ticks: {
            formatter: (t: number | Date) => formatCurrency(Number(t), currency, 'compact'),
          },
        },
      },
      color: { scale: SEVERITY_CHART_COLORS },
      points: { radius: 5, filled: true, fillOpacity: 0.9 },
      height: '20rem',
      theme,
      toolbar: { enabled: false },
      legend: { alignment: 'left', order: [...SEVERITIES] },
      tooltip: {
        valueFormatter: (v: unknown) =>
          v instanceof Date
            ? formatDate(v.toISOString().slice(0, 10))
            : typeof v === 'number'
              ? formatCurrency(v, currency)
              : String(v),
      },
    }),
    [theme, currency],
  );

  const top = [...points].sort(
    (a, b) => severityRank(b.severity) - severityRank(a.severity) || b.impact - a.impact,
  )[0];
  const summary = data
    ? points.length === 0
      ? `No anomalies detected between ${formatDate(data.start)} and ${formatDate(data.end)}.`
      : `${points.length} anomalies detected between ${formatDate(data.start)} and ${formatDate(data.end)}. Most severe: ${top?.label} on ${formatDate(top?.date ?? data.end)} (${formatCurrency(top?.impact ?? 0, currency, 'compact')} above expected).`
    : 'Loading…';

  const byId = new Map(data?.rows.map((r) => [r.id, r]) ?? []);
  return (
    <ChartCard
      title="Anomaly timeline"
      summary={summary}
      loading={loading}
      table={{
        columns: [
          { key: 'date', header: 'Detected', kind: 'date' },
          { key: 'severity', header: 'Severity', kind: 'text' },
          { key: 'label', header: 'Anomaly', kind: 'text' },
          { key: 'change', header: 'Change', kind: 'percent' },
          { key: 'impact', header: 'Impact', kind: 'currency' },
        ],
        rows: [...points].reverse().map((p) => ({
          date: formatDate(p.date),
          severity: p.severity,
          label: p.label,
          change: `+${formatPercent(byId.get(p.id)?.impactPercent ?? 0)}`,
          impact: `+${formatCurrency(p.impact, currency)}`,
        })),
      }}
      chart={<ScatterChart data={chartData as unknown as ChartTabularData} options={options} />}
    />
  );
}
