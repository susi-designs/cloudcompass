import {
  Button,
  ContentSwitcher,
  DataTableSkeleton,
  Link,
  Switch,
  TableBatchAction,
} from '@carbon/react';
import { Download } from '@carbon/icons-react';
import type { AnomalyStatus } from '@cloudcompass/types';
import { useMemo, useState } from 'react';
import { CostDelta } from '../../../components/CostDelta';
import { SortableDataTable, type TableColumn } from '../../../components/SortableDataTable';
import {
  NEEDS_TRIAGE,
  anomaliesCsv,
  canTriage,
  severityRank,
  type AnomaliesData,
  type AnomalyRow,
  type TriageActionType,
} from '../../../data/anomalies';
import { downloadText } from '../../../lib/download';
import { formatCurrency, formatDate } from '../../../lib/format';
import { durationLabel, statusDetail } from './anomalyLabels';
import { AnomalyStatusIndicator } from './AnomalyStatusIndicator';
import { SeverityIndicator } from '../../../components/SeverityIndicator';
import { TRIAGE_ACTIONS } from './triageActions';

type View = 'Needs triage' | AnomalyStatus | 'All';
const VIEWS: readonly View[] = [
  'Needs triage',
  'Open',
  'Acknowledged',
  'Expected',
  'Resolved',
  'All',
];

const matches = (view: View, r: AnomalyRow) =>
  view === 'All' || (view === 'Needs triage' ? NEEDS_TRIAGE.includes(r.status) : r.status === view);

interface Props {
  data: AnomaliesData | undefined;
  loading: boolean;
  /** Id of the anomaly open in the side panel. */
  activeId: string | null;
  onOpen: (id: string) => void;
  /**
   * Request a triage action for the selected ids (the page skips those whose status doesn't
   * allow it); `done` clears the selection once the action has been applied.
   */
  onTriage: (ids: string[], type: TriageActionType, done: () => void) => void;
}

export function AnomalyFeed({ data, loading, activeId, onOpen, onTriage }: Props) {
  const [view, setView] = useState<View>('Needs triage');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const c = data?.currency ?? 'USD';

  const rows = useMemo(() => (data?.rows ?? []).filter((r) => matches(view, r)), [data, view]);
  const selectedRows = useMemo(() => rows.filter((r) => selected.has(r.id)), [rows, selected]);
  const eligible = (type: TriageActionType) =>
    selectedRows.filter((r) => canTriage(type, r.status)).map((r) => r.id);

  const columns = useMemo<TableColumn<AnomalyRow>[]>(
    () => [
      {
        key: 'detectedAt',
        header: 'Detected',
        kind: 'date',
        value: (r) => r.detectedAt,
        render: (r) => (
          <span className="cc-cell-stack">
            <span className="cc-nowrap">{formatDate(r.detectedAt)}</span>
            <span className="cds--type-helper-text-01 cc-text-secondary cc-nowrap">
              {durationLabel(r)}
            </span>
          </span>
        ),
      },
      {
        key: 'severity',
        header: 'Severity',
        kind: 'text',
        // Lower sorts first, so A→Z puts Critical on top.
        value: (r) => 5 - severityRank(r.severity),
        render: (r) => <SeverityIndicator severity={r.severity} />,
      },
      {
        key: 'service',
        header: 'Anomaly',
        kind: 'text',
        value: (r) => `${r.service} ${r.application} ${r.lob} ${r.environment} ${r.accountName}`,
        render: (r) => (
          <span className="cc-cell-stack">
            <Link
              href={`?anomaly=${r.id}`}
              className="cc-nowrap"
              aria-current={r.id === activeId ? 'true' : undefined}
              onClick={(e) => {
                e.preventDefault();
                onOpen(r.id);
              }}
            >
              {r.service}
            </Link>
            <span className="cds--type-helper-text-01 cc-text-secondary cc-nowrap">
              {r.application} · {r.environment}
            </span>
          </span>
        ),
      },
      {
        key: 'rootCauseHint',
        header: 'Likely cause',
        kind: 'text',
        value: (r) => r.rootCauseHint,
        render: (r) => <span className="cc-anomaly-hint">{r.rootCauseHint}</span>,
      },
      {
        key: 'status',
        header: 'Status',
        kind: 'text',
        value: (r) => r.status,
        render: (r) => {
          const detail = statusDetail(r);
          return (
            <span className="cc-cell-stack">
              <AnomalyStatusIndicator status={r.status} />
              {detail && (
                <span className="cds--type-helper-text-01 cc-text-secondary cc-nowrap">
                  {detail}
                </span>
              )}
            </span>
          );
        },
      },
      {
        key: 'actualCost',
        header: 'Actual',
        kind: 'currency',
        value: (r) => r.actualCost,
        render: (r) => (
          <span className="cc-cell-stack">
            <span>{formatCurrency(r.actualCost, c)}</span>
            <span className="cds--type-helper-text-01 cc-text-secondary">
              Exp. {formatCurrency(r.expectedCost, c)}
            </span>
          </span>
        ),
      },
      {
        key: 'impact',
        header: 'Impact',
        kind: 'currency',
        value: (r) => r.impact,
        render: (r) => (
          <span className="cc-cell-stack">
            <CostDelta change={r.impact} showAmount currency={c} comparisonLabel="above expected" />
            <span className="cds--type-helper-text-01 cc-text-secondary">
              +{r.impactPercent.toFixed(1)}%
            </span>
          </span>
        ),
      },
    ],
    [c, activeId, onOpen],
  );

  if (loading || !data) return <DataTableSkeleton columnCount={8} rowCount={8} showToolbar />;

  const counts: Record<View, number> = {
    ...data.counts,
    'Needs triage': data.counts.Open + data.counts.Acknowledged,
    All: data.rows.length,
  };
  const available = TRIAGE_ACTIONS.filter((a) => eligible(a.type).length > 0);

  return (
    <div className="cc-stack cc-stack--tight">
      <ContentSwitcher
        size="md"
        selectedIndex={VIEWS.indexOf(view)}
        onChange={({ name }) => {
          setView(name as View);
          setSelected(new Set());
        }}
        className="cc-resource-switcher"
        aria-label="Anomaly status"
      >
        {VIEWS.map((v) => (
          <Switch key={v} name={v} text={`${v} (${counts[v]})`} />
        ))}
      </ContentSwitcher>
      <SortableDataTable
        key={view}
        title="Anomaly feed"
        description={`Detected from ${formatDate(data.start)} to ${formatDate(data.end)}, plus anything still waiting for triage. Select anomalies to triage them, or open one for root-cause details.`}
        columns={columns}
        rows={rows}
        rowId={(r) => r.id}
        initialSort={{ key: 'detectedAt', direction: 'DESC' }}
        searchable
        size="md"
        emptyMessage={
          view === 'Needs triage'
            ? 'Nothing waiting for triage in scope.'
            : `No ${view === 'All' ? '' : `${view.toLowerCase()} `}anomalies in scope.`
        }
        selection={{
          selectedIds: selected,
          onChange: setSelected,
          rowLabel: (r) => `Select ${r.service} anomaly in ${r.application} ${r.environment}`,
          batchActions: available.map((a) => (
            <TableBatchAction
              key={a.type}
              renderIcon={a.icon}
              onClick={() =>
                onTriage(
                  selectedRows.map((r) => r.id),
                  a.type,
                  () => setSelected(new Set()),
                )
              }
            >
              {a.label}
            </TableBatchAction>
          )),
        }}
        toolbarActions={
          <Button
            kind="ghost"
            renderIcon={Download}
            onClick={() =>
              downloadText(
                `cloudcompass-anomalies-${view.toLowerCase().replace(/\s+/g, '-')}-${data.asOf}.csv`,
                anomaliesCsv(rows),
              )
            }
          >
            Download CSV
          </Button>
        }
      />
    </div>
  );
}
