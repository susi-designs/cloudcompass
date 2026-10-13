import { ActionableNotification, InlineNotification } from '@carbon/react';
import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageLayout } from '../../../components/PageLayout';
import { canTriage, type TriageAction, type TriageActionType } from '../../../data/anomalies';
import { useAnomalyTriage } from '../../../data/anomalyTriageContext';
import { useAnomalies } from '../../../data/useAnomalies';
import { formatDate } from '../../../lib/format';
import { AnomalyDetailPanel } from '../components/AnomalyDetailPanel';
import { AnomalyFeed } from '../components/AnomalyFeed';
import { AnomalyKpis } from '../components/AnomalyKpis';
import { AnomalyTimelineChart } from '../components/AnomalyTimelineChart';
import { ImpactByServiceChart } from '../components/ImpactByServiceChart';
import { TRIAGE_PAST_TENSE, pluralAnomalies } from '../components/triageActions';
import { TriageModal, type TriageModalAction } from '../components/TriageModal';

interface PendingTriage {
  action: TriageModalAction;
  /** Ids the action can apply to. */
  ids: string[];
  /** How many anomalies were selected (to report skipped ones). */
  selectedCount: number;
  done?: () => void;
}

export function AnomaliesPage() {
  const { data, isPending, error } = useAnomalies();
  const { apply, reset, changeCount } = useAnomalyTriage();
  const [params, setParams] = useSearchParams();
  const [pending, setPending] = useState<PendingTriage | null>(null);
  const [notice, setNotice] = useState<{ title: string; subtitle?: string } | null>(null);
  const loading = isPending || !data;
  const c = data?.currency ?? 'USD';

  const activeId = params.get('anomaly');
  const activeRow = (activeId && data?.rows.find((r) => r.id === activeId)) || null;

  const setActive = useCallback(
    (id: string | null) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (id) next.set('anomaly', id);
          else next.delete('anomaly');
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );

  const run = (action: TriageAction, ids: string[], selectedCount: number, done?: () => void) => {
    const { updated } = apply(ids, action);
    const skipped = selectedCount - updated;
    setNotice({
      title: `${pluralAnomalies(updated)} ${TRIAGE_PAST_TENSE[action.type]}`,
      subtitle:
        skipped > 0
          ? `${pluralAnomalies(skipped)} skipped because ${skipped === 1 ? 'its' : 'their'} status doesn't allow it.`
          : undefined,
    });
    setPending(null);
    done?.();
  };

  const requestTriage = (selectedIds: string[], type: TriageActionType, done?: () => void) => {
    const statusById = new Map(data?.rows.map((r) => [r.id, r.status]));
    const ids = selectedIds.filter((id) => {
      const status = statusById.get(id);
      return status !== undefined && canTriage(type, status);
    });
    if (type === 'expect' || type === 'resolve') {
      setPending({ action: type, ids, selectedCount: selectedIds.length, done });
    } else {
      run({ type }, ids, selectedIds.length, done);
    }
  };

  return (
    <PageLayout
      title="Anomalies"
      description={
        data
          ? `Cost spikes detected on daily spend, with severity, likely cause and triage status · as of ${formatDate(data.asOf)}`
          : 'Cost spikes detected on daily spend, with severity, likely cause and triage status'
      }
    >
      {error && (
        <InlineNotification
          kind="error"
          title="Couldn't load anomalies"
          subtitle={error.message}
          hideCloseButton
        />
      )}
      <AnomalyKpis data={data} loading={loading} />
      <div className="cc-chart-grid">
        <AnomalyTimelineChart data={data} loading={loading} />
        <ImpactByServiceChart data={data} loading={loading} />
      </div>
      <div className="cc-stack cc-stack--tight">
        {changeCount > 0 && (
          <ActionableNotification
            kind="info"
            inline
            lowContrast
            hideCloseButton
            title="Triage changes are saved in this browser only."
            subtitle={`${pluralAnomalies(changeCount)} changed. They will sync to your team once the CloudCompass API is connected.`}
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
        <AnomalyFeed
          data={data}
          loading={loading}
          activeId={activeRow?.id ?? null}
          onOpen={setActive}
          onTriage={requestTriage}
        />
      </div>
      {activeRow && (
        <AnomalyDetailPanel
          key={activeRow.id}
          row={activeRow}
          currency={c}
          onClose={() => setActive(null)}
          onTriage={(type) => requestTriage([activeRow.id], type)}
        />
      )}
      {pending && (
        <TriageModal
          action={pending.action}
          count={pending.ids.length}
          onSubmit={(action) => run(action, pending.ids, pending.selectedCount, pending.done)}
          onClose={() => setPending(null)}
        />
      )}
    </PageLayout>
  );
}
