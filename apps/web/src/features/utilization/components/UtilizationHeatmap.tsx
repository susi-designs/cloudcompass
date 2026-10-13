import { HeatmapChart } from '@carbon/charts-react';
import { ScaleTypes, type ChartTabularData, type HeatmapChartOptions } from '@carbon/charts';
import { useMemo } from 'react';
import { ChartCard, type ChartTableColumn } from '../../../components/ChartCard';
import { useThemePreference } from '../../../shell/themeContext';

interface Props {
  title: string;
  summary: string;
  loading: boolean;
  data: Record<string, string | number>[];
  rowKey: string;
  rowLabel: string;
  columnKey: string;
  columnLabel: string;
  /** Column order (labels), left to right. */
  columns: string[];
  /** Row order, top to bottom; defaults to data order. */
  rows?: string[];
}

/** Average CPU heatmap on a fixed 0–100 % color domain so views are comparable. */
export function UtilizationHeatmap({
  title,
  summary,
  loading,
  data,
  rowKey,
  rowLabel,
  columnKey,
  columnLabel,
  columns,
  rows,
}: Props) {
  const { theme } = useThemePreference();
  const rowOrder = useMemo(
    () => rows ?? [...new Set(data.map((d) => String(d[rowKey])))],
    [rows, data, rowKey],
  );

  const options = useMemo<HeatmapChartOptions>(
    () => ({
      axes: {
        bottom: {
          title: columnLabel,
          mapsTo: columnKey,
          scaleType: ScaleTypes.LABELS,
          domain: columns,
        },
        left: {
          title: rowLabel,
          mapsTo: rowKey,
          scaleType: ScaleTypes.LABELS,
          domain: rowOrder,
          truncation: { threshold: 30, numCharacter: 30 },
        },
      },
      heatmap: {
        colorLegend: { title: 'Average CPU %' },
        colorDomain: { min: 0, max: 100 },
      },
      height: `${Math.max(14, rowOrder.length * 1.75 + 7)}rem`,
      theme,
      toolbar: { enabled: false },
      tooltip: { valueFormatter: (value: unknown) => `${Number(value).toFixed(1)}%` },
    }),
    [theme, columnLabel, columnKey, columns, rowLabel, rowKey, rowOrder],
  );

  const table = useMemo(() => {
    const byRow = new Map<string, Record<string, string | number>>();
    for (const d of data) {
      const r = String(d[rowKey]);
      const row = byRow.get(r) ?? { [rowKey]: r };
      row[String(d[columnKey])] = `${Number(d.value).toFixed(1)}%`;
      byRow.set(r, row);
    }
    const tableColumns: ChartTableColumn[] = [
      { key: rowKey, header: rowLabel, kind: 'text' },
      ...columns.map((c) => ({ key: c, header: c, kind: 'percent' as const })),
    ];
    return { columns: tableColumns, rows: rowOrder.map((r) => byRow.get(r) ?? { [rowKey]: r }) };
  }, [data, rowKey, rowLabel, columnKey, columns, rowOrder]);

  return (
    <ChartCard
      title={title}
      summary={summary}
      loading={loading}
      table={table}
      chart={<HeatmapChart data={data as unknown as ChartTabularData} options={options} />}
    />
  );
}
