import {
  DataTable,
  DataTableSkeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from '@carbon/react';
import { useMemo } from 'react';
import { CostDelta } from '../../../components/CostDelta';
import type { OverviewData } from '../../../data/overview';
import { alignClass, type ColumnKind } from '../../../lib/columns';
import { formatCurrency, formatDate } from '../../../lib/format';

interface Props {
  data: OverviewData | undefined;
  loading: boolean;
}

const COLUMNS: { key: string; header: string; kind: ColumnKind }[] = [
  { key: 'application', header: 'Application', kind: 'text' },
  { key: 'lob', header: 'Line of business', kind: 'text' },
  { key: 'previous', header: 'Previous period', kind: 'currency' },
  { key: 'current', header: 'Selected period', kind: 'currency' },
  { key: 'change', header: 'Change', kind: 'currency' },
];
const HEADERS = COLUMNS.map(({ key, header }) => ({ key, header }));
const KIND = new Map(COLUMNS.map((c) => [c.key, c.kind]));
const align = (key: string) => alignClass(KIND.get(key) ?? 'text');

/** Applications whose spend changed the most vs. the previous period of equal length. */
export function TopMoversTable({ data, loading }: Props) {
  const currency = data?.currency ?? 'USD';
  const byId = useMemo(
    () => new Map((data?.topMovers ?? []).map((m) => [m.applicationId, m])),
    [data],
  );
  const rows = useMemo(
    () =>
      (data?.topMovers ?? []).map((m) => ({
        id: m.applicationId,
        application: m.application,
        lob: m.lob,
        previous: m.previous,
        current: m.current,
        change: m.change,
      })),
    [data],
  );

  if (loading || !data) {
    return (
      <DataTableSkeleton
        headers={HEADERS}
        columnCount={HEADERS.length}
        rowCount={5}
        showToolbar={false}
      />
    );
  }

  const description = `${formatDate(data.period.start)} – ${formatDate(data.period.end)} compared with the previous ${rows.length ? 'period of the same length' : 'period'}. Sorted by size of change.`;

  return (
    <DataTable
      rows={rows}
      headers={HEADERS}
      isSortable
      size="md"
      sortRow={(a, b, { sortDirection, sortStates, locale }) => {
        const dir = sortDirection === sortStates.DESC ? -1 : 1;
        if (typeof a === 'number' && typeof b === 'number') return (a - b) * dir;
        return String(a).localeCompare(String(b), locale) * dir;
      }}
    >
      {({
        rows: tableRows,
        headers,
        getTableProps,
        getHeaderProps,
        getRowProps,
        getTableContainerProps,
      }) => (
        <TableContainer title="Top movers" description={description} {...getTableContainerProps()}>
          <Table {...getTableProps()} aria-label="Top movers">
            <TableHead>
              <TableRow>
                {headers.map((header) => {
                  const { key, ...headerProps } = getHeaderProps({ header });
                  return (
                    <TableHeader key={key} {...headerProps} className={align(header.key)}>
                      {header.header}
                    </TableHeader>
                  );
                })}
              </TableRow>
            </TableHead>
            <TableBody>
              {tableRows.map((row) => {
                const { key, ...rowProps } = getRowProps({ row });
                const mover = byId.get(row.id);
                return (
                  <TableRow key={key} {...rowProps}>
                    {row.cells.map((cell) => {
                      const col = cell.info.header;
                      const value = cell.value as string | number;
                      return (
                        <TableCell key={cell.id} className={align(col)}>
                          {col === 'change' ? (
                            <CostDelta
                              change={Number(value)}
                              changePercent={mover?.changePercent}
                              showAmount
                              currency={currency}
                              comparisonLabel="vs. previous period"
                            />
                          ) : typeof value === 'number' ? (
                            formatCurrency(value, currency)
                          ) : (
                            value
                          )}
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
  );
}
