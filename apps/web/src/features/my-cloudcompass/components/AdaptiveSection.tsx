import { Button, IconButton, Tag, Tile } from '@carbon/react';
import { ArrowRight, ChevronDown, ChevronUp, Pin, PinFilled } from '@carbon/icons-react';
import { useId, useState, type ReactNode } from 'react';
import type { SectionLayout } from '../../../data/signals';
import { SECTION_LABELS, SECTION_PATHS, type SectionId } from '../../../data/myCloudCompass';

interface Props {
  id: SectionId;
  layout: SectionLayout | undefined;
  /** One line with the section's key number, shown when the section is quiet. */
  quietSummary: string;
  /** Tag tone when the section needs attention: red for risks, blue for savings opportunities. */
  attentionTone?: 'red' | 'blue';
  onTogglePin: () => void;
  onOpen: (pathname: string) => void;
  children: ReactNode;
}

/**
 * A pillar section on My CloudCompass. Its order is fixed; its emphasis adapts (PRODUCT.md §5.1):
 * "Needs attention" (expanded, tagged), "Steady" (expanded) or "Quiet" (one-line summary with
 * "Show details"). Pinning keeps it expanded whatever the signals say.
 */
export function AdaptiveSection({
  id,
  layout,
  quietSummary,
  attentionTone = 'red',
  onTogglePin,
  onOpen,
  children,
}: Props) {
  const headingId = useId();
  const contentId = useId();
  const [showQuiet, setShowQuiet] = useState(false);
  const label = SECTION_LABELS[id];
  const state = layout?.state ?? 'steady';
  const pinned = layout?.pinned ?? false;
  const quiet = state === 'quiet';
  const expanded = !quiet || showQuiet;

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
            <Tag type={attentionTone} size="sm">
              Needs attention ({layout.bandCount})
            </Tag>
          )}
          {quiet && (
            <Tag type="green" size="sm">
              All clear
            </Tag>
          )}
          {pinned && (
            <Tag type="cool-gray" size="sm">
              Pinned
            </Tag>
          )}
        </div>
        <div className="cc-app-section__actions">
          <IconButton
            kind="ghost"
            size="md"
            align="left"
            label={pinned ? `Unpin ${label}` : `Pin ${label} open`}
            onClick={onTogglePin}
            aria-pressed={pinned}
          >
            {pinned ? <PinFilled /> : <Pin />}
          </IconButton>
          <Button
            kind="ghost"
            size="md"
            renderIcon={ArrowRight}
            onClick={() => onOpen(SECTION_PATHS[id])}
          >
            View in {label}
          </Button>
        </div>
      </div>

      {quiet && (
        <Tile className="cc-app-section__quiet">
          <p className="cds--type-body-compact-01">{quietSummary}</p>
          <Button
            kind="ghost"
            size="sm"
            renderIcon={showQuiet ? ChevronUp : ChevronDown}
            aria-expanded={showQuiet}
            aria-controls={contentId}
            onClick={() => setShowQuiet((v) => !v)}
          >
            {showQuiet ? 'Hide details' : 'Show details'}
          </Button>
        </Tile>
      )}
      <div id={contentId} className="cc-app-section__content" hidden={!expanded}>
        {expanded && children}
      </div>
    </section>
  );
}
