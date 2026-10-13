import { DataTableSkeleton, ProgressBar } from '@carbon/react';
import { useMemo } from 'react';
import { SortableDataTable, type TableColumn } from '../../../components/SortableDataTable';
import type { AiSpendData, GpuRow } from '../../../data/aiSpend';
import { formatCurrency, formatNumber } from '../../../lib/format';

export function GpuClustersTable({
  data,
  loading,
}: {
  data: AiSpendData | undefined;
  loading: boolean;
}) {
  const c = data?.currency ?? 'USD';
  const columns = useMemo<TableColumn<GpuRow>[]>(
    () => [
      {
        key: 'clusterName',
        header: 'Cluster',
        kind: 'id',
        value: (r) => r.clusterName,
        render: (r) => <code className="cc-code cc-nowrap">{r.clusterName}</code>,
      },
      { key: 'gpuType', header: 'GPU', kind: 'text', value: (r) => r.gpuType },
      { key: 'application', header: 'Application', kind: 'text', value: (r) => r.application },
      { key: 'workload', header: 'Workload', kind: 'text', value: (r) => r.workload },
      {
        key: 'gpuHours',
        header: 'GPU hours',
        kind: 'number',
        value: (r) => r.gpuHours,
        render: (r) => formatNumber(Math.round(r.gpuHours)),
      },
      {
        key: 'utilizationPercent',
        header: 'Utilization',
        kind: 'percent',
        value: (r) => r.utilizationPercent,
        render: (r) => (
          <div className="cc-budget-meter">
            <ProgressBar
              label={`${r.clusterName} utilization ${r.utilizationPercent.toFixed(0)}%`}
              hideLabel
              size="small"
              max={100}
              value={r.utilizationPercent}
            />
            <span>{r.utilizationPercent.toFixed(0)}%</span>
          </div>
        ),
      },
      {
        key: 'cost',
        header: 'Cost',
        kind: 'currency',
        value: (r) => r.cost,
        render: (r) => formatCurrency(r.cost, c),
      },
      {
        key: 'idleCost',
        header: 'Unused GPU cost',
        kind: 'currency',
        value: (r) => r.idleCost,
        render: (r) => formatCurrency(r.idleCost, c),
      },
    ],
    [c],
  );
  if (loading || !data) return <DataTableSkeleton columnCount={8} rowCount={4} />;
  return (
    <SortableDataTable
      title="GPU clusters"
      description="Training and inference clusters. Unused GPU cost = cost × (1 − utilization)."
      columns={columns}
      rows={data.gpu}
      rowId={(r) => r.clusterName}
      initialSort={{ key: 'cost', direction: 'DESC' }}
      emptyMessage="No GPU clusters in the selected scope."
    />
  );
}
