import { Link } from '@carbon/react';
import { useMemo } from 'react';
import { SortableDataTable, type TableColumn } from '../../../components/SortableDataTable';
import type { AppSnapshot } from '../../../data/myCloudCompass';
import type { RecommendationRow } from '../../../data/optimization';
import { formatCurrency } from '../../../lib/format';
import { LedgerChart } from '../../optimization/components/LedgerChart';
import { RecommendationStatusIndicator } from '../../optimization/components/RecommendationStatusIndicator';

interface Props {
  snapshot: AppSnapshot;
  onOpen: (pathname: string, search?: string) => void;
}

/** Optimization snapshot: top open recommendations and projected vs. realized savings. */
export function OptimizationSection({ snapshot, onOpen }: Props) {
  const c = snapshot.optimization.currency;
  const top = useMemo(
    () =>
      snapshot.optimization.rows
        .filter((r) => r.status === 'Open')
        .sort((a, b) => b.estimatedMonthlySavings - a.estimatedMonthlySavings)
        .slice(0, 5),
    [snapshot.optimization.rows],
  );
  const columns = useMemo<TableColumn<RecommendationRow>[]>(
    () => [
      {
        key: 'title',
        header: 'Recommendation',
        kind: 'text',
        value: (r) => r.title,
        render: (r) => (
          <span className="cc-cell-stack cc-rec-title">
            <Link
              href="/optimization"
              onClick={(e) => {
                e.preventDefault();
                onOpen('/optimization');
              }}
            >
              {r.title}
            </Link>
            <span className="cds--type-helper-text-01 cc-text-secondary">
              {r.type} · {r.environment}
            </span>
          </span>
        ),
      },
      {
        key: 'savings',
        header: 'Est. savings / mo',
        kind: 'currency',
        value: (r) => r.estimatedMonthlySavings,
        render: (r) => formatCurrency(r.estimatedMonthlySavings, c),
      },
      { key: 'effort', header: 'Effort', kind: 'text', value: (r) => r.effort },
      { key: 'risk', header: 'Risk', kind: 'text', value: (r) => r.risk },
      { key: 'owner', header: 'Owner', kind: 'text', value: (r) => r.owner ?? 'Unassigned' },
      {
        key: 'status',
        header: 'Status',
        kind: 'text',
        value: (r) => r.status,
        render: (r) => <RecommendationStatusIndicator status={r.status} />,
      },
    ],
    [c, onOpen],
  );

  return (
    <div className="cc-stack cc-stack--tight">
      <SortableDataTable
        title="Top open recommendations"
        description={`${snapshot.optimization.kpis.openCount} open, worth ${formatCurrency(snapshot.optimization.kpis.openSavings, c, 'compact')}/mo · act on them in the Optimization inbox`}
        columns={columns}
        rows={top}
        rowId={(r) => r.id}
        initialSort={{ key: 'savings', direction: 'DESC' }}
        size="sm"
        emptyMessage="No open recommendations."
      />
      <LedgerChart data={snapshot.ledger} loading={false} />
    </div>
  );
}
