/**
 * Table column alignment rule (DESIGN.md §4.1 "Column alignment"):
 * - Dollar amounts and other numbers → right-aligned (end), tabular figures.
 * - Text and alphanumeric values (names, IDs, account numbers, dates, statuses) → left-aligned (start).
 * Every table column must declare a `kind`; never hand-pick alignment classes.
 */
export type ColumnKind =
  /** Dollar / currency amounts, including cost deltas. */
  | 'currency'
  /** Counts and other plain numbers. */
  | 'number'
  /** Percentages. */
  | 'percent'
  /** Free text: names, LOBs, descriptions, statuses. */
  | 'text'
  /** Alphanumeric identifiers: account IDs, resource IDs, SKUs. Left-aligned even if all digits. */
  | 'id'
  /** Dates and periods. */
  | 'date';

const END_ALIGNED: ReadonlySet<ColumnKind> = new Set(['currency', 'number', 'percent']);

export function isEndAligned(kind: ColumnKind): boolean {
  return END_ALIGNED.has(kind);
}

/** Class for both the header (`TableHeader`) and body cells (`TableCell`) of a column. */
export function alignClass(kind: ColumnKind): 'cc-cell--end' | 'cc-cell--start' {
  return isEndAligned(kind) ? 'cc-cell--end' : 'cc-cell--start';
}
