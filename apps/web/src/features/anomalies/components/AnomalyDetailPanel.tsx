import {
  Button,
  ButtonSet,
  InlineNotification,
  ProgressBar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from '@carbon/react';
import type { ReactNode } from 'react';
import { CostDelta } from '../../../components/CostDelta';
import { SidePanel } from '../../../components/SidePanel';
import { canTriage, type AnomalyRow, type TriageActionType } from '../../../data/anomalies';
import { useAnomalyDetail } from '../../../data/useAnomalies';
import { alignClass } from '../../../lib/columns';
import { formatCurrency, formatDate } from '../../../lib/format';
import { AnomalyCostChart } from './AnomalyCostChart';
import { durationLabel } from './anomalyLabels';
import { AnomalyStatusIndicator } from './AnomalyStatusIndicator';
import { SeverityIndicator } from '../../../components/SeverityIndicator';
import { TRIAGE_ACTIONS } from './triageActions';

interface Props {
  row: AnomalyRow;
  currency: string;
  onClose: () => void;
  onTriage: (type: TriageActionType) => void;
}

function Details({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="cc-details cc-details--panel">
      {items.map(([term, value]) => (
        <div key={term} className="cc-details__item">
          <dt className="cds--type-label-01 cc-text-secondary">{term}</dt>
          <dd className="cds--type-body-compact-01">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function modelFeedback(row: AnomalyRow): string {
  if (row.status === 'Resolved') return 'Confirmed anomaly. Used to tune detection.';
  if (row.status === 'Expected')
    return 'Not an anomaly. Similar changes on this resource will score lower.';
  return 'Waiting for triage. Resolving or marking expected trains detection.';
}

/** The side-panel button order puts the primary (most useful next step) last, per ButtonSet. */
function panelActions(row: AnomalyRow) {
  const valid = TRIAGE_ACTIONS.filter((a) => canTriage(a.type, row.status));
  const primary =
    valid.find((a) => a.type === 'resolve') ?? valid.find((a) => a.type === 'reopen') ?? valid[0];
  return { secondary: valid.filter((a) => a !== primary), primary };
}

export function AnomalyDetailPanel({ row, currency, onClose, onTriage }: Props) {
  const detail = useAnomalyDetail(row);
  const { secondary, primary } = panelActions(row);
  const closedLabel = row.status === 'Expected' ? 'Marked expected' : 'Resolved';

  return (
    <SidePanel
      label={`Anomaly · ${row.id}`}
      title={`${row.service} cost spike`}
      subtitle={`${row.application} · ${row.environment} · ${row.lob}`}
      onClose={onClose}
      actions={
        primary && (
          <ButtonSet className="cc-side-panel__buttons">
            {secondary.map((a) => (
              <Button key={a.type} kind="secondary" onClick={() => onTriage(a.type)}>
                {a.label}
              </Button>
            ))}
            <Button kind="primary" onClick={() => onTriage(primary.type)}>
              {primary.label}
            </Button>
          </ButtonSet>
        )
      }
    >
      <div className="cc-panel-section">
        <div className="cc-panel-status">
          <SeverityIndicator severity={row.severity} />
          <AnomalyStatusIndicator status={row.status} />
          <span className="cds--type-body-compact-01 cc-text-secondary">
            {formatDate(row.detectedAt)}
            {row.endedAt !== row.detectedAt ? ` – ${formatDate(row.endedAt)}` : ''} ·{' '}
            {durationLabel(row)}
          </span>
        </div>
        <Details
          items={[
            ['Expected cost', formatCurrency(row.expectedCost, currency)],
            ['Actual cost', formatCurrency(row.actualCost, currency)],
            [
              'Impact',
              <CostDelta
                change={row.impact}
                changePercent={row.impactPercent}
                showAmount
                currency={currency}
                comparisonLabel="above expected"
              />,
            ],
          ]}
        />
      </div>

      <AnomalyCostChart row={row} detail={detail} currency={currency} />

      <section className="cc-panel-section" aria-labelledby={`${row.id}-cause`}>
        <h3 id={`${row.id}-cause`} className="cds--type-heading-compact-02">
          Root-cause hints
        </h3>
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title="Likely cause:"
          subtitle={row.rootCauseHint}
          className="cc-panel-notification"
        />
        <Details
          items={[
            ['Service', row.service],
            ['Resource', <code className="cc-code cc-break">{row.resourceName}</code>],
            ['Region', `${row.regionName} (${row.region})`],
            ['Account', <code className="cc-code">{row.accountName}</code>],
          ]}
        />
        <TableContainer>
          <p className="cds--type-label-01 cc-text-secondary cc-panel-table-label">
            What changed: impact by usage type
          </p>
          <Table size="sm" aria-label="Impact by usage type">
            <TableHead>
              <TableRow>
                <TableHeader className={alignClass('text')}>Usage type</TableHeader>
                <TableHeader className={alignClass('percent')}>Share</TableHeader>
                <TableHeader className={alignClass('currency')}>Impact</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {row.usageDrivers.map((d) => (
                <TableRow key={d.usageType}>
                  <TableCell className={alignClass('text')}>{d.usageType}</TableCell>
                  <TableCell className={alignClass('percent')}>
                    <span className="cc-budget-meter">
                      <ProgressBar
                        label={`${d.usageType} share`}
                        hideLabel
                        size="small"
                        value={d.share}
                        max={100}
                      />
                      {Math.round(d.share)}%
                    </span>
                  </TableCell>
                  <TableCell className={alignClass('currency')}>
                    {formatCurrency(d.impact, currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </section>

      <section className="cc-panel-section" aria-labelledby={`${row.id}-triage`}>
        <h3 id={`${row.id}-triage`} className="cds--type-heading-compact-02">
          Triage and alerting
        </h3>
        <Details
          items={[
            ['Owner', row.owner],
            ['Alerted via', row.alertChannels.join(', ')],
            ['Detected', formatDate(row.detectedAt)],
            ['Acknowledged', row.acknowledgedAt ? formatDate(row.acknowledgedAt) : '—'],
            [closedLabel, row.resolvedAt ? formatDate(row.resolvedAt) : '—'],
            ...(row.expectedReason
              ? ([['Reason', row.expectedReason]] as [string, ReactNode][])
              : []),
            ...(row.resolutionNote
              ? ([['Resolution note', row.resolutionNote]] as [string, ReactNode][])
              : []),
            ['Model feedback', modelFeedback(row)],
          ]}
        />
      </section>
    </SidePanel>
  );
}
