import { useMemo } from 'react';
import { SortableDataTable, type TableColumn } from '../../../components/SortableDataTable';
import type { AppSnapshot } from '../../../data/myCloudCompass';
import type { ResourceRow } from '../../../data/utilization';
import { formatCurrency, formatPercent } from '../../../lib/format';
import { CommitmentsSection } from '../../utilization/components/CommitmentsSection';
import { ResourceStatusIndicator } from '../../utilization/components/ResourceStatusIndicator';
import { UtilizationKpis } from '../../utilization/components/UtilizationKpis';

/** Utilization snapshot: KPIs, the biggest idle / under-utilized resources, commitments. */
export function UtilizationSection({ snapshot }: { snapshot: AppSnapshot }) {
  const data = snapshot.utilization;
  const c = data.currency;
  const waste = useMemo(
    () =>
      data.resources
        .filter((r) => r.estimatedMonthlySavings > 0)
        .sort((a, b) => b.estimatedMonthlySavings - a.estimatedMonthlySavings)
        .slice(0, 5),
    [data.resources],
  );
  const columns = useMemo<TableColumn<ResourceRow>[]>(
    () => [
      {
        key: 'resource',
        header: 'Resource',
        kind: 'text',
        value: (r) => r.resourceName,
        render: (r) => (
          <span className="cc-cell-stack">
            <span>{r.resourceName}</span>
            <span className="cds--type-helper-text-01 cc-text-secondary">
              {r.resourceType} · {r.environment}
            </span>
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        kind: 'text',
        value: (r) => r.status,
        render: (r) => <ResourceStatusIndicator status={r.status} />,
      },
      {
        key: 'cpu',
        header: 'Avg CPU',
        kind: 'percent',
        value: (r) => r.avgCpuPercent,
        render: (r) => (r.avgCpuPercent == null ? '—' : formatPercent(r.avgCpuPercent)),
      },
      {
        key: 'cost',
        header: 'Monthly cost',
        kind: 'currency',
        value: (r) => r.monthlyCost,
        render: (r) => formatCurrency(r.monthlyCost, c),
      },
      {
        key: 'savings',
        header: 'Est. savings / mo',
        kind: 'currency',
        value: (r) => r.estimatedMonthlySavings,
        render: (r) => formatCurrency(r.estimatedMonthlySavings, c),
      },
    ],
    [c],
  );

  return (
    <div className="cc-stack cc-stack--tight">
      <UtilizationKpis data={data} loading={false} />
      <SortableDataTable
        title="Top idle and under-utilized resources"
        description="Largest estimated savings first"
        columns={columns}
        rows={waste}
        rowId={(r) => r.resourceId}
        initialSort={{ key: 'savings', direction: 'DESC' }}
        size="sm"
        emptyMessage="No idle or under-utilized resources."
      />
      <CommitmentsSection data={data} loading={false} />
    </div>
  );
}
