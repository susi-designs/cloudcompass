import { Link } from '@carbon/react';
import { useMemo } from 'react';
import { SeverityIndicator } from '../../../components/SeverityIndicator';
import { SortableDataTable, type TableColumn } from '../../../components/SortableDataTable';
import { NEEDS_TRIAGE, type AnomalyRow } from '../../../data/anomalies';
import type { AppSnapshot } from '../../../data/myCloudCompass';
import { formatCurrency, formatDate } from '../../../lib/format';
import { AnomalyStatusIndicator } from '../../anomalies/components/AnomalyStatusIndicator';

interface Props {
  snapshot: AppSnapshot;
  onOpen: (pathname: string, search?: string) => void;
}

/** Anomalies snapshot: what needs triage, newest first, and recent resolutions. */
export function AnomaliesSection({ snapshot, onOpen }: Props) {
  const c = snapshot.anomalies.currency;
  const rows = useMemo(
    () => snapshot.anomalies.rows.filter((r) => NEEDS_TRIAGE.includes(r.status)),
    [snapshot.anomalies.rows],
  );
  const columns = useMemo<TableColumn<AnomalyRow>[]>(
    () => [
      {
        key: 'detectedAt',
        header: 'Detected',
        kind: 'date',
        value: (r) => r.detectedAt,
        render: (r) => formatDate(r.detectedAt),
      },
      {
        key: 'severity',
        header: 'Severity',
        kind: 'text',
        value: (r) => r.severity,
        render: (r) => <SeverityIndicator severity={r.severity} />,
      },
      {
        key: 'service',
        header: 'Anomaly',
        kind: 'text',
        value: (r) => `${r.service} ${r.environment}`,
        render: (r) => (
          <span className="cc-cell-stack">
            <Link
              href={`/anomalies?anomaly=${r.id}`}
              onClick={(e) => {
                e.preventDefault();
                onOpen('/anomalies', `?anomaly=${encodeURIComponent(r.id)}`);
              }}
            >
              {r.service}
            </Link>
            <span className="cds--type-helper-text-01 cc-text-secondary">
              {r.environment} · {r.resourceName}
            </span>
          </span>
        ),
      },
      {
        key: 'impact',
        header: 'Above expected',
        kind: 'currency',
        value: (r) => r.impact,
        render: (r) => formatCurrency(r.impact, c),
      },
      {
        key: 'status',
        header: 'Status',
        kind: 'text',
        value: (r) => r.status,
        render: (r) => <AnomalyStatusIndicator status={r.status} />,
      },
    ],
    [c, onOpen],
  );

  return (
    <SortableDataTable
      title="Anomalies that need triage"
      description={`Open or acknowledged, newest first · ${snapshot.resolvedLast30Days} resolved in the last 30 days`}
      columns={columns}
      rows={rows}
      rowId={(r) => r.id}
      initialSort={{ key: 'detectedAt', direction: 'DESC' }}
      size="sm"
      emptyMessage="No anomalies need triage."
    />
  );
}
