import { ActionableNotification, Button, FeatureFlags, Tag } from '@carbon/react';
import { ArrowRight } from '@carbon/icons-react';
import { useId, type ReactNode } from 'react';
import type { SectionLayout, Signal } from '../../../data/signals';
import { SECTION_LABELS, SECTION_PATHS, type SectionId } from '../../../data/myCloudCompass';
import {
  SECTION_ATTENTION_TONE,
  signalDetail,
  signalIndicator,
  signalNotificationKind,
  signalTarget,
  signalTitle,
} from './signalCopy';

interface Props {
  id: SectionId;
  layout: SectionLayout | undefined;
  /** This section's signals in the "Needs attention" band, most urgent first. */
  attention: readonly Signal[];
  currency: string;
  /** One line with the section's key number, shown when the section is quiet. */
  quietSummary: string;
  onOpen: (pathname: string, search?: string) => void;
  children: ReactNode;
}

/**
 * A pillar tab's content on My CloudCompass. Its emphasis adapts (PRODUCT.md §5.1):
 * "Needs attention" (tagged, flagged on the tab, and a banner per signal under the header),
 * "Steady", or "Quiet" ("All clear" with a one-line summary above the details).
 */
export function AdaptiveSection({
  id,
  layout,
  attention,
  currency,
  quietSummary,
  onOpen,
  children,
}: Props) {
  const headingId = useId();
  const label = SECTION_LABELS[id];
  const state = layout?.state ?? 'steady';

  return (
    <section
      className={`cc-app-section cc-app-section--${state}`}
      aria-labelledby={headingId}
      data-section={id}
      data-state={state}
    >
      <div className="cc-app-section__header">
        <div className="cc-app-section__title">
          <h2 id={headingId} className="cds--type-heading-03">
            {label}
          </h2>
          {state === 'attention' && layout && (
            <Tag type={SECTION_ATTENTION_TONE[id]} size="sm">
              Needs attention ({layout.bandCount})
            </Tag>
          )}
          {state === 'quiet' && (
            <Tag type="green" size="sm">
              All clear
            </Tag>
          )}
        </div>
        <Button
          kind="ghost"
          size="md"
          renderIcon={ArrowRight}
          onClick={() => onOpen(SECTION_PATHS[id])}
        >
          View in {label}
        </Button>
      </div>
      {state === 'attention' && attention.length > 0 && (
        // Without sentinels the notification adds no empty tab stops around its button.
        <FeatureFlags enableFocusWrapWithoutSentinels>
          <ul className="cc-app-section__attention" aria-label={`${label}: needs attention`}>
            {attention.map((signal) => {
              const target = signalTarget(signal);
              const indicator = signalIndicator(signal);
              return (
                <li key={signal.id}>
                  {/* Page content, not an alert: no alertdialog role (focus trap) or focus on mount. */}
                  <ActionableNotification
                    inline
                    lowContrast
                    hideCloseButton
                    hasFocus={false}
                    role="group"
                    kind={signalNotificationKind(signal)}
                    statusIconDescription={
                      'severity' in indicator ? indicator.severity : indicator.label
                    }
                    title={signalTitle(signal)}
                    subtitle={signalDetail(signal, currency)}
                    actionButtonLabel={target.label}
                    onActionButtonClick={() => onOpen(target.pathname, target.search)}
                  />
                </li>
              );
            })}
          </ul>
        </FeatureFlags>
      )}
      {state === 'quiet' && <p className="cds--type-body-01 cc-text-secondary">{quietSummary}</p>}
      {children}
    </section>
  );
}
