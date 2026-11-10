import {
  ContentSwitcher,
  DataTable,
  IconSwitch,
  SkeletonPlaceholder,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tile,
} from '@carbon/react';
import { ChartLineData, DataTable as DataTableIcon } from '@carbon/icons-react';
import { useId, useState, type ReactNode } from 'react';
import { alignClass, type ColumnKind } from '../lib/columns';

export interface ChartTableColumn {
  key: string;
  header: string;
  /** Drives alignment: amounts right, text/IDs/dates left (DESIGN.md §4.1). */
  kind: ColumnKind;
}

export interface ChartView {
  name: string;
  /** Accessible label of the switch, e.g. "View as stacked area". */
  text: string;
  icon: ReactNode;
  chart: ReactNode;
}

interface ChartCardProps {
  title: string;
  /** One-sentence text summary of what the chart shows (accessibility, DESIGN.md §6). */
  summary: string;
  /** A single chart, or several alternate views of the same data (first is the default). */
  chart: ReactNode | ChartView[];
  table: { columns: ChartTableColumn[]; rows: Record<string, string | number>[] };
  loading?: boolean;
}

/**
 * Card wrapper for every chart: title, text summary, and a "View as table" switch
 * so the data is available without the visualization (CLAUDE.md §7, DESIGN.md §6).
 */
export function ChartCard({ title, summary, chart, table, loading = false }: ChartCardProps) {
  const views: ChartView[] = Array.isArray(chart)
    ? chart
    : [{ name: 'chart', text: 'View as chart', icon: <ChartLineData />, chart }];
  const [view, setView] = useState<string>(views[0]?.name ?? 'table');
  const headingId = useId();
  const active = views.find((v) => v.name === view);
  const selectedIndex = active ? views.indexOf(active) : views.length;

  return (
    <Tile className="cc-chart-card" aria-labelledby={headingId}>
      <div className="cc-chart-card__header">
        <div>
          <h2 id={headingId} className="cds--type-heading-compact-02">
            {title}
          </h2>
          <p className="cds--type-helper-text-01 cc-text-secondary">{summary}</p>
        </div>
        <ContentSwitcher
          size="sm"
          selectedIndex={selectedIndex}
          onChange={({ name }) => setView(String(name ?? 'table'))}
          className="cc-chart-card__switcher"
        >
          {[
            ...views.map((v) => (
              <IconSwitch key={v.name} name={v.name} text={v.text}>
                {v.icon}
              </IconSwitch>
            )),
            <IconSwitch key="table" name="table" text="View as table">
              <DataTableIcon />
            </IconSwitch>,
          ]}
        </ContentSwitcher>
      </div>
      {loading ? (
        <SkeletonPlaceholder className="cc-chart-card__skeleton" />
      ) : active ? (
        <div className="cc-chart-card__chart">{active.chart}</div>
      ) : (
        <DataTable
          rows={table.rows.map((r, i) => ({ id: String(i), ...r }))}
          headers={table.columns.map((c) => ({ key: c.key, header: c.header }))}
          size="sm"
        >
          {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
            <TableContainer className="cc-chart-card__table">
              <Table {...getTableProps()} aria-label={`${title} data`}>
                <TableHead>
                  <TableRow>
                    {headers.map((header) => {
                      const col = table.columns.find((c) => c.key === header.key);
                      const { key, ...headerProps } = getHeaderProps({ header });
                      return (
                        <TableHeader
                          key={key}
                          {...headerProps}
                          className={alignClass(col?.kind ?? 'text')}
                        >
                          {header.header}
                        </TableHeader>
                      );
                    })}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => {
                    const { key, ...rowProps } = getRowProps({ row });
                    return (
                      <TableRow key={key} {...rowProps}>
                        {row.cells.map((cell) => {
                          const col = table.columns.find((c) => c.key === cell.info.header);
                          return (
                            <TableCell key={cell.id} className={alignClass(col?.kind ?? 'text')}>
                              {cell.value as ReactNode}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DataTable>
      )}
    </Tile>
  );
}
