import { Button, DataTableSkeleton, Link } from '@carbon/react';
import { Download } from '@carbon/icons-react';
import { useMemo } from 'react';
import { CostDelta } from '../../../components/CostDelta';
import { SortableDataTable, type TableColumn } from '../../../components/SortableDataTable';
import {
  explorerCsv,
  GROUP_BY_OPTIONS,
  type ExplorerData,
  type ExplorerRow,
  type ExplorerSettings,
} from '../../../data/explorer';
import { downloadText } from '../../../lib/download';
import { formatCurrency, formatDate, formatNumber } from '../../../lib/format';

interface Props {
  data: ExplorerData | undefined;
  settings: ExplorerSettings;
  loading: boolean;
  onDrill: (row: ExplorerRow) => void;
}

export function ExplorerTable({ data, settings, loading, onDrill }: Props) {
  const groupLabel = GROUP_BY_OPTIONS.find((g) => g.id === settings.groupBy)?.label ?? 'Group';
  const nextLabel = GROUP_BY_OPTIONS.find((g) => g.id === data?.drillTo)?.label;
  const currency = data?.currency ?? 'USD';
  const hasDetail = data?.rows.some((r) => r.detail) ?? false;

  const columns = useMemo<TableColumn<ExplorerRow>[]>(() => {
    const cols: TableColumn<ExplorerRow>[] = [
      {
        key: 'label',
        header: groupLabel,
        kind: 'text',
        value: (r) => r.label,
        render: (r) =>
          data?.drillTo ? (
            <Link
              href="#"
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                onDrill(r);
              }}
              aria-label={`${r.label}: drill down to ${nextLabel?.toLowerCase() ?? 'details'}`}
            >
              {r.label}
            </Link>
          ) : (
            r.label
          ),
      },
    ];
    if (hasDetail) {
      cols.push({
        key: 'detail',
        header: settings.groupBy === 'region' ? 'Region code' : 'Account ID',
        kind: 'id',
        value: (r) => r.detail,
        render: (r) => <code className="cc-code">{r.detail}</code>,
      });
    }
    cols.push(
      {
        key: 'total',
        header: 'Selected period',
        kind: 'currency',
        value: (r) => r.total,
        render: (r) => formatCurrency(r.total, currency),
      },
      {
        key: 'previous',
        header: 'Previous period',
        kind: 'currency',
        value: (r) => r.previous,
        render: (r) => formatCurrency(r.previous, currency),
      },
      {
        key: 'change',
        header: 'Change',
        kind: 'currency',
        value: (r) => r.change,
        render: (r) => (
          <CostDelta
            change={r.change}
            changePercent={r.changePercent}
            showAmount
            currency={currency}
            comparisonLabel="vs. previous period"
          />
        ),
      },
      {
        key: 'share',
        header: 'Share of total',
        kind: 'percent',
        value: (r) => r.share,
        render: (r) => `${r.share.toFixed(1)}%`,
      },
    );
    return cols;
  }, [data?.drillTo, groupLabel, nextLabel, hasDetail, settings.groupBy, currency, onDrill]);

  if (loading || !data) {
    return <DataTableSkeleton columnCount={6} rowCount={6} showToolbar showHeader />;
  }

  const description = `${formatNumber(data.rows.length)} ${groupLabel.toLowerCase()} values · ${formatDate(data.period.start)} – ${formatDate(data.period.end)} vs. the previous ${data.period.days} days${data.drillTo ? ` · Select a name to drill into its ${nextLabel?.toLowerCase()}.` : ''}`;

  return (
    <SortableDataTable
      title={`Cost by ${groupLabel.toLowerCase()}`}
      description={description}
      columns={columns}
      rows={data.rows}
      rowId={(r) => r.id}
      initialSort={{ key: 'total', direction: 'DESC' }}
      searchable
      toolbarActions={
        <Button
          kind="ghost"
          renderIcon={Download}
          onClick={() =>
            downloadText(
              `cloudcompass-cost-by-${settings.groupBy}-${data.period.start}-to-${data.period.end}.csv`,
              explorerCsv(data, groupLabel),
            )
          }
        >
          Download CSV
        </Button>
      }
    />
  );
}
