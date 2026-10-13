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

interface ChartCardProps {
  title: string;
  /** One-sentence text summary of what the chart shows (accessibility, DESIGN.md §6). */
  summary: string;
  chart: ReactNode;
  table: { columns: ChartTableColumn[]; rows: Record<string, string | number>[] };
  loading?: boolean;
}

/**
 * Card wrapper for every chart: title, text summary, and a "View as table" switch
 * so the data is available without the visualization (CLAUDE.md §7, DESIGN.md §6).
 */
export function ChartCard({ title, summary, chart, table, loading = false }: ChartCardProps) {
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const headingId = useId();

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
          selectedIndex={view === 'chart' ? 0 : 1}
          onChange={({ name }) => setView(name === 'table' ? 'table' : 'chart')}
          className="cc-chart-card__switcher"
        >
          <IconSwitch name="chart" text="View as chart">
            <ChartLineData />
          </IconSwitch>
          <IconSwitch name="table" text="View as table">
            <DataTableIcon />
          </IconSwitch>
        </ContentSwitcher>
      </div>
      {loading ? (
        <SkeletonPlaceholder className="cc-chart-card__skeleton" />
      ) : view === 'chart' ? (
        <div className="cc-chart-card__chart">{chart}</div>
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
