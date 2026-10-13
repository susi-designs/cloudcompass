import {
  Pagination,
  Table,
  TableBatchActions,
  TableExpandHeader,
  TableExpandRow,
  TableExpandedRow,
  TableSelectAll,
  TableSelectRow,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TableToolbar,
  TableToolbarContent,
  TableToolbarSearch,
} from '@carbon/react';
import { Fragment, useId, useMemo, useState, type ReactNode } from 'react';
import { alignClass, type ColumnKind } from '../lib/columns';

export interface TableColumn<Row> {
  key: string;
  header: string;
  /** Required: drives alignment (DESIGN.md §4.2) and default sorting. */
  kind: ColumnKind;
  /** Value used for sorting and search. */
  value: (row: Row) => string | number | null;
  /** Custom cell content; defaults to the value. */
  render?: (row: Row) => ReactNode;
  sortable?: boolean;
}

type SortDirection = 'ASC' | 'DESC' | 'NONE';

interface SortableDataTableProps<Row> {
  title: string;
  description?: ReactNode;
  columns: TableColumn<Row>[];
  rows: Row[];
  rowId: (row: Row) => string;
  /** Initial sort; defaults to unsorted (input order). */
  initialSort?: { key: string; direction: Exclude<SortDirection, 'NONE'> };
  /** Show a search box filtering on text / ID columns. */
  searchable?: boolean;
  /** Extra toolbar actions (buttons). */
  toolbarActions?: ReactNode;
  /** Rows per page; pagination appears when there are more rows than this. */
  pageSize?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  emptyMessage?: string;
  /**
   * Row selection with a batch action bar (DESIGN.md §4.1). "Select all" selects every row
   * matching the current search, across pages. Selection clears when the search changes.
   */
  selection?: {
    selectedIds: ReadonlySet<string>;
    onChange: (ids: Set<string>) => void;
    /** `TableBatchAction` buttons; they act on `selectedIds`. */
    batchActions: ReactNode;
    /** Accessible label for a row checkbox. */
    rowLabel?: (row: Row) => string;
  };
  /** Content for an expandable details row. */
  expandedContent?: (row: Row) => ReactNode;
}

const PAGE_SIZES = [10, 25, 50, 100];

/**
 * Carbon table with controlled sorting, search and pagination that work across all rows
 * (Carbon's built-in DataTable sort only sees the current page). Alignment comes from each
 * column's `kind`, so every table follows DESIGN.md §4.2.
 */
export function SortableDataTable<Row>({
  title,
  description,
  columns,
  rows,
  rowId,
  initialSort,
  searchable = false,
  toolbarActions,
  pageSize: initialPageSize = 25,
  size = 'md',
  emptyMessage = 'No data for the selected scope.',
  selection,
  expandedContent,
}: SortableDataTableProps<Row>) {
  const tableId = useId();
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const [sort, setSort] = useState<{ key: string; direction: SortDirection }>(
    initialSort ?? { key: '', direction: 'NONE' },
  );
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    const textCols = columns.filter((c) => c.kind === 'text' || c.kind === 'id');
    return rows.filter((r) =>
      textCols.some((c) =>
        String(c.value(r) ?? '')
          .toLowerCase()
          .includes(q),
      ),
    );
  }, [rows, columns, query]);

  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sort.key);
    if (!col || sort.direction === 'NONE') return filtered;
    const dir = sort.direction === 'ASC' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const va = col.value(a);
      const vb = col.value(b);
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
  }, [filtered, columns, sort]);

  const paginated = sorted.length > pageSize;
  const lastPage = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, lastPage);
  const visible = paginated
    ? sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : sorted;

  const onSort = (key: string) => {
    setSort((prev) => {
      if (prev.key !== key) {
        const col = columns.find((c) => c.key === key);
        // Amounts sort largest-first on the first click; text A→Z.
        const firstDir: SortDirection =
          col && col.kind !== 'text' && col.kind !== 'id' && col.kind !== 'date' ? 'DESC' : 'ASC';
        return { key, direction: firstDir };
      }
      const next: Record<SortDirection, SortDirection> = { ASC: 'DESC', DESC: 'NONE', NONE: 'ASC' };
      return { key, direction: next[prev.direction] };
    });
    setPage(1);
  };

  const selectedCount = selection
    ? sorted.filter((r) => selection.selectedIds.has(rowId(r))).length
    : 0;
  const batchMode = selectedCount > 0;
  const allSelected = sorted.length > 0 && selectedCount === sorted.length;
  const setAll = (on: boolean) => selection?.onChange(on ? new Set(sorted.map(rowId)) : new Set());
  const toggleRow = (id: string) => {
    if (!selection) return;
    const next = new Set(selection.selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    selection.onChange(next);
  };
  const toggleExpanded = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const columnCount = columns.length + (selection ? 1 : 0) + (expandedContent ? 1 : 0);

  return (
    <TableContainer title={title} description={description} className="cc-table">
      {(searchable || toolbarActions || selection) && (
        <TableToolbar aria-label={`${title} toolbar`}>
          {selection && (
            <TableBatchActions
              shouldShowBatchActions={batchMode}
              totalSelected={selectedCount}
              totalCount={sorted.length}
              onCancel={() => setAll(false)}
              onSelectAll={allSelected ? undefined : () => setAll(true)}
            >
              {selection.batchActions}
            </TableBatchActions>
          )}
          <TableToolbarContent aria-hidden={batchMode}>
            {searchable && (
              <TableToolbarSearch
                persistent
                placeholder="Search"
                labelText={`Search ${title}`}
                tabIndex={batchMode ? -1 : 0}
                onChange={(e, value) => {
                  setQuery(value ?? (typeof e === 'object' ? e.target.value : ''));
                  setPage(1);
                  if (selection && selection.selectedIds.size > 0) selection.onChange(new Set());
                }}
              />
            )}
            {toolbarActions}
          </TableToolbarContent>
        </TableToolbar>
      )}
      <Table aria-label={title} size={size}>
        <TableHead>
          <TableRow>
            {expandedContent && <TableExpandHeader aria-label="Expand row" />}
            {selection && (
              <TableSelectAll
                id={`${tableId}-all`}
                name={`${tableId}-all`}
                ariaLabel="Select all rows"
                checked={allSelected}
                indeterminate={batchMode && !allSelected}
                onSelect={() => setAll(!allSelected)}
              />
            )}
            {columns.map((col) => {
              const sortable = col.sortable !== false;
              const isSortHeader = sort.key === col.key;
              return (
                <TableHeader
                  key={col.key}
                  className={alignClass(col.kind)}
                  isSortable={sortable}
                  isSortHeader={isSortHeader}
                  sortDirection={isSortHeader ? sort.direction : 'NONE'}
                  onClick={sortable ? () => onSort(col.key) : undefined}
                >
                  {col.header}
                </TableHeader>
              );
            })}
          </TableRow>
        </TableHead>
        <TableBody>
          {visible.length === 0 && (
            <TableRow>
              <TableCell colSpan={columnCount} className="cc-cell--start cc-text-secondary">
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
          {visible.map((row) => {
            const id = rowId(row);
            const selected = selection?.selectedIds.has(id) ?? false;
            const cells = (
              <>
                {selection && (
                  <TableSelectRow
                    id={`${tableId}-${id}`}
                    name={`${tableId}-row`}
                    ariaLabel={selection.rowLabel?.(row) ?? `Select row ${id}`}
                    checked={selected}
                    onSelect={() => toggleRow(id)}
                  />
                )}
                {columns.map((col) => (
                  <TableCell key={col.key} className={alignClass(col.kind)}>
                    {col.render ? col.render(row) : (col.value(row) ?? '—')}
                  </TableCell>
                ))}
              </>
            );
            if (!expandedContent) {
              return (
                <TableRow key={id} isSelected={selected}>
                  {cells}
                </TableRow>
              );
            }
            const isExpanded = expanded.has(id);
            return (
              <Fragment key={id}>
                <TableExpandRow
                  isExpanded={isExpanded}
                  isSelected={selected}
                  onExpand={() => toggleExpanded(id)}
                  aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
                >
                  {cells}
                </TableExpandRow>
                {isExpanded && (
                  <TableExpandedRow colSpan={columnCount}>{expandedContent(row)}</TableExpandedRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
      {paginated && (
        <Pagination
          page={currentPage}
          pageSize={pageSize}
          pageSizes={PAGE_SIZES}
          totalItems={sorted.length}
          onChange={({ page: p, pageSize: ps }) => {
            setPage(p);
            setPageSize(ps);
          }}
        />
      )}
    </TableContainer>
  );
}
