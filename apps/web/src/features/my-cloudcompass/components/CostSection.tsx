import { useMemo } from 'react';
import { CostDelta } from '../../../components/CostDelta';
import { SortableDataTable, type TableColumn } from '../../../components/SortableDataTable';
import type { AppSnapshot, ServiceSpendRow } from '../../../data/myCloudCompass';
import { formatCurrency } from '../../../lib/format';
import { BudgetHistoryChart } from '../../cost-usage/components/BudgetHistoryChart';
import { SpendOverTimeChart } from '../../overview/components/SpendOverTimeChart';

/** Cost & Usage snapshot: daily spend by environment, budget vs. actual, top services. */
export function CostSection({ snapshot }: { snapshot: AppSnapshot }) {
  const c = snapshot.overview.currency;
  const columns = useMemo<TableColumn<ServiceSpendRow>[]>(
    () => [
      { key: 'service', header: 'Service', kind: 'text', value: (r) => r.service },
      {
        key: 'current',
        header: 'Spend',
        kind: 'currency',
        value: (r) => r.current,
        render: (r) => formatCurrency(r.current, c),
      },
      {
        key: 'previous',
        header: 'Previous period',
        kind: 'currency',
        value: (r) => r.previous,
        render: (r) => formatCurrency(r.previous, c),
      },
      {
        key: 'change',
        header: 'Change',
        kind: 'currency',
        value: (r) => r.change,
        render: (r) => (
          <CostDelta change={r.change} changePercent={r.changePercent} showAmount currency={c} />
        ),
      },
    ],
    [c],
  );

  return (
    <div className="cc-stack cc-stack--tight">
      <div className="cc-chart-grid">
        <SpendOverTimeChart data={snapshot.overview} loading={false} />
        <BudgetHistoryChart data={snapshot.budgets} loading={false} />
      </div>
      <SortableDataTable
        title="Top 5 services"
        description="Spend in the selected period vs. the previous period of the same length"
        columns={columns}
        rows={snapshot.topServices}
        rowId={(r) => r.service}
        initialSort={{ key: 'current', direction: 'DESC' }}
        size="sm"
        emptyMessage="No spend in the selected period."
      />
    </div>
  );
}
