import { Button, Layer, SkeletonPlaceholder, Tag, Tile } from '@carbon/react';
import type { AppSnapshot } from '../../../data/myCloudCompass';
import type { AdaptiveLayout, SeenSignal, Signal, SignalKind } from '../../../data/signals';
import { SignalCard } from './SignalCard';
import { OPPORTUNITY_KINDS, SIGNAL_KIND_LABELS, bandSummary } from './signalCopy';

interface Props {
  snapshot: AppSnapshot | undefined;
  layout: AdaptiveLayout | undefined;
  onOpen: (pathname: string, search: string) => void;
  onToggleMute: (kind: SignalKind) => void;
}

/** What happened to a signal that left the band, from the current data ("Cleared" for totals). */
function resolvedStatus(seen: SeenSignal, snapshot: AppSnapshot): string {
  const [kind, id] = seen.id.split(':');
  if (kind === 'anomaly') {
    const row = snapshot.anomalies.rows.find((r) => r.id === id);
    if (row?.status === 'Expected') return 'Marked expected';
    if (row?.status === 'Resolved') return 'Resolved';
  }
  if (kind === 'recommendation') {
    const row = snapshot.optimization.rows.find((r) => r.id === id);
    if (row && row.status !== 'Open') return row.status;
  }
  return 'Cleared';
}

/**
 * The adaptive "Needs attention" band (PRODUCT.md §5.1): a rule-based one-sentence summary,
 * up to five ranked signal cards, what was handled since the last visit, and muted alert types.
 */
export function NeedsAttention({ snapshot, layout, onOpen, onToggleMute }: Props) {
  if (!snapshot || !layout) {
    return <SkeletonPlaceholder className="cc-attention__skeleton" />;
  }
  const currency = snapshot.overview.currency;
  const band: Signal[] = layout.band.map((b) => b.signal);
  const clear = band.length === 0;
  // Red when something is at risk; blue when the band only holds savings opportunities.
  const risky = band.some((s) => !OPPORTUNITY_KINDS.includes(s.kind));

  return (
    <Tile className="cc-attention" aria-labelledby="needs-attention-heading">
      <div className="cc-attention__header">
        <h2 id="needs-attention-heading" className="cds--type-heading-compact-02">
          Needs attention
        </h2>
        {clear ? (
          <Tag type="green" size="sm">
            All clear
          </Tag>
        ) : (
          <Tag type={risky ? 'red' : 'blue'} size="sm">
            {band.length + layout.overflow} {band.length + layout.overflow === 1 ? 'item' : 'items'}
          </Tag>
        )}
      </div>
      <p className="cds--type-body-01" aria-live="polite">
        {bandSummary(snapshot.application.name, band, currency)}
      </p>

      {!clear && (
        <Layer>
          <ul className="cc-attention__cards" aria-label="Signals, most urgent first">
            {layout.band.map(({ signal, isNew }) => (
              <li key={signal.id}>
                <SignalCard
                  signal={signal}
                  isNew={isNew}
                  currency={currency}
                  onOpen={onOpen}
                  onMute={(s) => onToggleMute(s.kind)}
                />
              </li>
            ))}
          </ul>
        </Layer>
      )}
      {layout.overflow > 0 && (
        <p className="cds--type-helper-text-01 cc-text-secondary">
          + {layout.overflow} more {layout.overflow === 1 ? 'signal' : 'signals'} below the top{' '}
          {band.length}; see the sections below.
        </p>
      )}

      {layout.resolved.length > 0 && (
        <div className="cc-attention__resolved">
          <h3 className="cds--type-label-01 cc-text-secondary">Recently handled</h3>
          <ul>
            {layout.resolved.map((s) => (
              <li key={s.id} className="cc-attention__resolved-item">
                <Tag type="green" size="sm">
                  {resolvedStatus(s, snapshot)}
                </Tag>
                <span className="cds--type-body-compact-01">{s.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {layout.muted.length > 0 && (
        <div className="cc-attention__muted">
          <span className="cds--type-label-01 cc-text-secondary">Muted for this application:</span>
          {layout.muted.map((m) => (
            <span key={m.kind} className="cc-attention__muted-item">
              <span className="cds--type-body-compact-01">
                {SIGNAL_KIND_LABELS[m.kind]}
                {m.hidden > 0 && ` (${m.hidden} hidden)`}
              </span>
              <Button kind="ghost" size="sm" onClick={() => onToggleMute(m.kind)}>
                Unmute
              </Button>
            </span>
          ))}
        </div>
      )}
      <p className="cds--type-helper-text-01 cc-text-secondary">
        Ranked by rules from today&apos;s data, not by AI. Updated daily with billing data.
      </p>
    </Tile>
  );
}
