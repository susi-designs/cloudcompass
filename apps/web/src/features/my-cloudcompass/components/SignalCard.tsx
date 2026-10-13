import {
  IconButton,
  Link,
  Tag,
  Tile,
  preview__IconIndicator as IconIndicator,
} from '@carbon/react';
import { NotificationOff } from '@carbon/icons-react';
import { SeverityIndicator } from '../../../components/SeverityIndicator';
import type { Signal } from '../../../data/signals';
import {
  SIGNAL_KIND_LABELS,
  signalDetail,
  signalIndicator,
  signalReasons,
  signalTarget,
  signalTitle,
} from './signalCopy';

interface Props {
  signal: Signal;
  isNew: boolean;
  currency: string;
  onOpen: (pathname: string, search: string) => void;
  onMute: (signal: Signal) => void;
}

/**
 * One item in the "Needs attention" band: status indicator, title (link to the item on its
 * pillar page), key numbers and why it is shown (DESIGN.md §9).
 */
export function SignalCard({ signal, isNew, currency, onOpen, onMute }: Props) {
  const indicator = signalIndicator(signal);
  const target = signalTarget(signal);
  const href = `${target.pathname}${target.search}`;
  return (
    <Tile className="cc-signal" data-signal={signal.id}>
      <div className="cc-signal__top">
        {'severity' in indicator ? (
          <SeverityIndicator severity={indicator.severity} />
        ) : (
          <IconIndicator kind={indicator.kind} label={indicator.label} size={16} />
        )}
        {isNew && (
          <Tag type="blue" size="sm">
            New
          </Tag>
        )}
        <span className="cc-signal__mute">
          <IconButton
            kind="ghost"
            size="sm"
            align="left"
            label={`Mute ${SIGNAL_KIND_LABELS[signal.kind].toLowerCase()} for this application`}
            onClick={() => onMute(signal)}
          >
            <NotificationOff />
          </IconButton>
        </span>
      </div>
      <h3 className="cds--type-heading-compact-01">
        <Link
          href={href}
          onClick={(e) => {
            e.preventDefault();
            onOpen(target.pathname, target.search);
          }}
        >
          {signalTitle(signal)}
        </Link>
      </h3>
      <p className="cds--type-body-compact-01">{signalDetail(signal, currency)}</p>
      <p className="cds--type-helper-text-01 cc-text-secondary">
        <span className="cc-signal__why">Why: </span>
        {signalReasons(signal, currency).join(' · ')}
      </p>
    </Tile>
  );
}
