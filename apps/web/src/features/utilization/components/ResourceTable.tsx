import { Button, ContentSwitcher, DataTableSkeleton, Switch } from '@carbon/react';
import { Download } from '@carbon/icons-react';
import { useMemo, useState } from 'react';
import { SortableDataTable, type TableColumn } from '../../../components/SortableDataTable';
import type { ResourceRow, UtilizationData } from '../../../data/utilization';
import { downloadText } from '../../../lib/download';
import { formatCurrency } from '../../../lib/format';
import { ResourceStatusIndicator } from './ResourceStatusIndicator';

type View = 'waste' | 'idle' | 'underutilized' | 'all';

const VIEWS: { id: View; label: string; match: (r: ResourceRow) => boolean }[] = [
  {
    id: 'waste',
    label: 'Idle + under-utilized',
    match: (r) => r.status === 'Idle' || r.status === 'Underutilized',
  },
  { id: 'idle', label: 'Idle', match: (r) => r.status === 'Idle' },
  { id: 'underutilized', label: 'Under-utilized', match: (r) => r.status === 'Underutilized' },
  { id: 'all', label: 'All resources', match: () => true },
];

const pct = (v: number | null) => (v == null ? '—' : `${v.toFixed(1)}%`);

function toCsv(rows: ResourceRow[]): string {
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const header = [
    'Resource',
    'Resource ID',
    'Type',
    'Application',
    'LOB',
    'Environment',
    'Account ID',
    'Cloud',
    'Region',
    'Avg CPU %',
    'Avg memory %',
    'Status',
    'Idle reason',
    'Monthly cost (USD)',
    'Est. savings / mo (USD)',
  ];
  const lines = rows.map((r) =>
    [
      r.resourceName,
      r.resourceId,
      r.resourceType,
      r.application,
      r.lob,
      r.environment,
      r.accountId,
      r.provider,
      r.region,
      r.avgCpuPercent?.toFixed(1) ?? '',
      r.avgMemoryPercent?.toFixed(1) ?? '',
      r.status,
      r.idleReason ?? '',
      r.monthlyCost.toFixed(2),
      r.estimatedMonthlySavings.toFixed(2),
    ]
      .map((v) => esc(String(v)))
      .join(','),
  );
  return [header.join(','), ...lines].join('\n') + '\n';
}

export function ResourceTable({
  data,
  loading,
}: {
  data: UtilizationData | undefined;
  loading: boolean;
}) {
  const [view, setView] = useState<View>('waste');
  const c = data?.currency ?? 'USD';
  const active = VIEWS.find((v) => v.id === view) ?? VIEWS[0]!;
  const rows = useMemo(() => (data?.resources ?? []).filter(active.match), [data, active]);

  const columns = useMemo<TableColumn<ResourceRow>[]>(
    () => [
      {
        key: 'resourceName',
        header: 'Resource',
        kind: 'id',
        value: (r) => r.resourceName,
        render: (r) => (
          <span className="cc-cell-stack">
            <code className="cc-code cc-nowrap">{r.resourceName}</code>
            <span className="cds--type-helper-text-01 cc-text-secondary">{r.resourceType}</span>
          </span>
        ),
      },
      { key: 'application', header: 'Application', kind: 'text', value: (r) => r.application },
      { key: 'environment', header: 'Env', kind: 'text', value: (r) => r.environment },
      {
        key: 'accountId',
        header: 'Account ID',
        kind: 'id',
        value: (r) => r.accountId,
        render: (r) => <code className="cc-code cc-nowrap">{r.accountId}</code>,
      },
      {
        key: 'avgCpuPercent',
        header: 'Avg CPU',
        kind: 'percent',
        value: (r) => r.avgCpuPercent,
        render: (r) => pct(r.avgCpuPercent),
      },
      {
        key: 'avgMemoryPercent',
        header: 'Avg memory',
        kind: 'percent',
        value: (r) => r.avgMemoryPercent,
        render: (r) => pct(r.avgMemoryPercent),
      },
      {
        key: 'status',
        header: 'Status',
        kind: 'text',
        value: (r) => r.status,
        render: (r) => (
          <span className="cc-cell-stack">
            <ResourceStatusIndicator status={r.status} />
            {(r.idleReason ??
              (r.status === 'Underutilized' ? 'Rightsize one size down' : null)) && (
              <span className="cds--type-helper-text-01 cc-text-secondary">
                {r.idleReason ?? 'Rightsize one size down'}
              </span>
            )}
          </span>
        ),
      },
      {
        key: 'monthlyCost',
        header: 'Monthly cost',
        kind: 'currency',
        value: (r) => r.monthlyCost,
        render: (r) => formatCurrency(r.monthlyCost, c),
      },
      {
        key: 'estimatedMonthlySavings',
        header: 'Est. savings / mo',
        kind: 'currency',
        value: (r) => r.estimatedMonthlySavings,
        render: (r) => formatCurrency(r.estimatedMonthlySavings, c),
      },
    ],
    [c],
  );

  if (loading || !data) return <DataTableSkeleton columnCount={9} rowCount={8} showToolbar />;

  const counts = Object.fromEntries(
    VIEWS.map((v) => [v.id, data.resources.filter(v.match).length]),
  );

  return (
    <div className="cc-stack cc-stack--tight">
      <ContentSwitcher
        size="md"
        selectedIndex={VIEWS.findIndex((v) => v.id === view)}
        onChange={({ name }) => setView(name as View)}
        className="cc-resource-switcher"
        aria-label="Resource filter"
      >
        {VIEWS.map((v) => (
          <Switch key={v.id} name={v.id} text={`${v.label} (${counts[v.id]})`} />
        ))}
      </ContentSwitcher>
      <SortableDataTable
        key={view}
        title="Resources"
        description="Averages over the last 30 days. Savings: idle resources at full monthly cost; under-utilized at ~40% from rightsizing one size down."
        columns={columns}
        rows={rows}
        rowId={(r) => r.resourceId}
        initialSort={{ key: 'estimatedMonthlySavings', direction: 'DESC' }}
        searchable
        size="sm"
        toolbarActions={
          <Button
            kind="ghost"
            renderIcon={Download}
            onClick={() =>
              downloadText(`cloudcompass-resources-${view}-${data.asOf}.csv`, toCsv(rows))
            }
          >
            Download CSV
          </Button>
        }
      />
    </div>
  );
}
