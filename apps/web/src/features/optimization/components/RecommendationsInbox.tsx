import {
  ActionableNotification,
  Button,
  ContentSwitcher,
  DataTableSkeleton,
  InlineNotification,
  Switch,
  TableBatchAction,
} from '@carbon/react';
import {
  Checkmark,
  CloseOutline,
  Download,
  TaskComplete,
  Time,
  Undo,
  UserFollow,
} from '@carbon/icons-react';
import type { CarbonIconType } from '@carbon/icons-react';
import type { RecommendationStatus } from '@cloudcompass/types';
import { useMemo, useState, type ReactNode } from 'react';
import { SortableDataTable, type TableColumn } from '../../../components/SortableDataTable';
import {
  canApply,
  recommendationsCsv,
  type OptimizationData,
  type RecommendationRow,
  type WorkflowAction,
  type WorkflowActionType,
} from '../../../data/optimization';
import { useRecommendationWorkflow } from '../../../data/recommendationWorkflowContext';
import { downloadText } from '../../../lib/download';
import { formatCurrency, formatDate } from '../../../lib/format';
import { RecommendationStatusIndicator } from './RecommendationStatusIndicator';
import { WorkflowModal, type ModalAction } from './WorkflowModal';

type View = RecommendationStatus | 'All';
const VIEWS: readonly View[] = ['Open', 'Accepted', 'Snoozed', 'Dismissed', 'Implemented', 'All'];

const BATCH_ACTIONS: { type: WorkflowActionType; label: string; icon: CarbonIconType }[] = [
  { type: 'assign', label: 'Assign', icon: UserFollow },
  { type: 'accept', label: 'Accept', icon: Checkmark },
  { type: 'snooze', label: 'Snooze', icon: Time },
  { type: 'dismiss', label: 'Dismiss', icon: CloseOutline },
  { type: 'implement', label: 'Mark implemented', icon: TaskComplete },
  { type: 'reopen', label: 'Reopen', icon: Undo },
];

const PAST_TENSE: Record<WorkflowActionType, string> = {
  assign: 'assigned',
  accept: 'accepted',
  snooze: 'snoozed',
  dismiss: 'dismissed',
  implement: 'marked implemented',
  reopen: 'reopened',
};

const plural = (n: number) => `${n} recommendation${n === 1 ? '' : 's'}`;

function statusDetail(r: RecommendationRow): string | null {
  if (r.status === 'Snoozed' && r.snoozedUntil) return `Until ${formatDate(r.snoozedUntil)}`;
  if (r.status === 'Dismissed' && r.dismissReason) return r.dismissReason;
  if (r.status === 'Implemented' && r.implementedAt) return formatDate(r.implementedAt);
  return null;
}

function Details({ row, currency }: { row: RecommendationRow; currency: string }) {
  const items: [string, ReactNode][] = [
    ['Why', row.description],
    ['Resource ID', <code className="cc-code">{row.resourceId}</code>],
    ['Account ID', <code className="cc-code">{row.accountId}</code>],
    ['Cloud', row.provider === 'AI' ? 'AI provider' : row.provider],
    ['Created', formatDate(row.createdAt)],
  ];
  if (row.realizedMonthlySavings !== null)
    items.push(['Realized savings / mo', formatCurrency(row.realizedMonthlySavings, currency)]);
  return (
    <dl className="cc-details">
      {items.map(([term, value]) => (
        <div key={term} className="cc-details__item">
          <dt className="cds--type-label-01 cc-text-secondary">{term}</dt>
          <dd className="cds--type-body-compact-01">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function RecommendationsInbox({
  data,
  loading,
}: {
  data: OptimizationData | undefined;
  loading: boolean;
}) {
  const { apply, reset, changeCount } = useRecommendationWorkflow();
  const [view, setView] = useState<View>('Open');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<ModalAction | null>(null);
  const [notice, setNotice] = useState<{ title: string; subtitle?: string } | null>(null);
  const c = data?.currency ?? 'USD';

  const rows = useMemo(
    () => (data?.rows ?? []).filter((r) => view === 'All' || r.status === view),
    [data, view],
  );
  const selectedRows = useMemo(() => rows.filter((r) => selected.has(r.id)), [rows, selected]);
  const eligible = (type: WorkflowActionType) =>
    selectedRows.filter((r) => canApply(type, r.status));

  const run = (action: WorkflowAction) => {
    const ids = eligible(action.type).map((r) => r.id);
    const { updated } = apply(ids, action);
    const skipped = selectedRows.length - updated;
    setNotice({
      title: `${plural(updated)} ${PAST_TENSE[action.type]}`,
      subtitle:
        skipped > 0
          ? `${plural(skipped)} skipped because ${skipped === 1 ? 'its' : 'their'} status doesn't allow it.`
          : undefined,
    });
    setSelected(new Set());
    setModal(null);
  };

  const columns = useMemo<TableColumn<RecommendationRow>[]>(
    () => [
      {
        key: 'title',
        header: 'Recommendation',
        kind: 'text',
        value: (r) => `${r.title} ${r.type}`,
        render: (r) => (
          <span className="cc-cell-stack cc-rec-title">
            <span>{r.title}</span>
            <span className="cds--type-helper-text-01 cc-text-secondary">{r.type}</span>
          </span>
        ),
      },
      {
        key: 'application',
        header: 'Application',
        kind: 'text',
        value: (r) => `${r.application} ${r.lob} ${r.environment}`,
        render: (r) => (
          <span className="cc-cell-stack">
            <span className="cc-nowrap">{r.application}</span>
            <span className="cds--type-helper-text-01 cc-text-secondary cc-nowrap">
              {r.lob} · {r.environment}
            </span>
          </span>
        ),
      },
      {
        key: 'owner',
        header: 'Owner',
        kind: 'text',
        value: (r) => r.owner ?? 'Unassigned',
        render: (r) => r.owner ?? <span className="cc-text-secondary">Unassigned</span>,
      },
      { key: 'effort', header: 'Effort', kind: 'text', value: (r) => r.effort },
      { key: 'risk', header: 'Risk', kind: 'text', value: (r) => r.risk },
      {
        key: 'status',
        header: 'Status',
        kind: 'text',
        value: (r) => r.status,
        render: (r) => {
          const detail = statusDetail(r);
          return (
            <span className="cc-cell-stack">
              <RecommendationStatusIndicator status={r.status} />
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
        key: 'estimatedMonthlySavings',
        header: 'Savings/mo',
        kind: 'currency',
        value: (r) => r.estimatedMonthlySavings,
        render: (r) => formatCurrency(r.estimatedMonthlySavings, c),
      },
    ],
    [c],
  );

  if (loading || !data) return <DataTableSkeleton columnCount={8} rowCount={8} showToolbar />;

  const counts: Record<View, number> = { ...data.counts, All: data.rows.length };
  const available = BATCH_ACTIONS.filter((a) => eligible(a.type).length > 0);
  const modalRows = modal ? eligible(modal) : [];

  return (
    <div className="cc-stack cc-stack--tight">
      {changeCount > 0 && (
        <ActionableNotification
          kind="info"
          inline
          lowContrast
          hideCloseButton
          title="Changes are saved in this browser only."
          subtitle={`${plural(changeCount)} changed. They will sync to your team once the CloudCompass API is connected.`}
          actionButtonLabel="Discard changes"
          onActionButtonClick={() => {
            reset();
            setNotice(null);
          }}
        />
      )}
      {notice && (
        <InlineNotification
          kind="success"
          lowContrast
          title={notice.title}
          subtitle={notice.subtitle}
          onClose={() => setNotice(null)}
        />
      )}
      <ContentSwitcher
        size="md"
        selectedIndex={VIEWS.indexOf(view)}
        onChange={({ name }) => {
          setView(name as View);
          setSelected(new Set());
        }}
        className="cc-resource-switcher"
        aria-label="Recommendation status"
      >
        {VIEWS.map((v) => (
          <Switch key={v} name={v} text={`${v} (${counts[v]})`} />
        ))}
      </ContentSwitcher>
      <SortableDataTable
        key={view}
        title="Recommendations"
        description="Select recommendations to assign, accept, snooze, dismiss or mark them implemented. Expand a row for details."
        columns={columns}
        rows={rows}
        rowId={(r) => r.id}
        initialSort={{ key: 'estimatedMonthlySavings', direction: 'DESC' }}
        searchable
        size="md"
        emptyMessage={`No ${view === 'All' ? '' : `${view.toLowerCase()} `}recommendations in scope.`}
        expandedContent={(r) => <Details row={r} currency={c} />}
        selection={{
          selectedIds: selected,
          onChange: setSelected,
          rowLabel: (r) => `Select ${r.title}`,
          batchActions: available.map((a) => (
            <TableBatchAction
              key={a.type}
              renderIcon={a.icon}
              onClick={() =>
                a.type === 'accept' || a.type === 'reopen'
                  ? run({ type: a.type })
                  : setModal(a.type)
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
                `cloudcompass-recommendations-${view.toLowerCase()}-${data.asOf}.csv`,
                recommendationsCsv(rows),
              )
            }
          >
            Download CSV
          </Button>
        }
      />
      {modal && (
        <WorkflowModal
          action={modal}
          count={modalRows.length}
          savings={modalRows.reduce((s, r) => s + r.estimatedMonthlySavings, 0)}
          currency={c}
          owners={data.owners}
          onSubmit={run}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
