import { IconButton, Layer } from '@carbon/react';
import { Close } from '@carbon/icons-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';

interface SidePanelProps {
  title: string;
  /** Small label above the title, e.g. the object type and id. */
  label?: string;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  /** Buttons pinned to the bottom of the panel. */
  actions?: ReactNode;
}

/**
 * Non-modal panel that slides over the right edge of the page for object details
 * (DESIGN.md §4, §9). The page behind it stays usable.
 * Focus moves to the title on open and returns to the opener on close; Escape closes.
 */
export function SidePanel({ title, label, subtitle, onClose, children, actions }: SidePanelProps) {
  const headingId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    headingRef.current?.focus();
    return () => {
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  return (
    <aside
      className="cc-side-panel"
      role="dialog"
      aria-modal="false"
      aria-labelledby={headingId}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <header className="cc-side-panel__header">
        <div className="cc-side-panel__titles">
          {label && <p className="cds--type-label-01 cc-text-secondary">{label}</p>}
          <h2 id={headingId} ref={headingRef} tabIndex={-1} className="cds--type-heading-03">
            {title}
          </h2>
          {subtitle && <p className="cds--type-body-compact-01 cc-text-secondary">{subtitle}</p>}
        </div>
        <IconButton kind="ghost" size="md" label="Close" align="left" onClick={onClose}>
          <Close />
        </IconButton>
      </header>
      <Layer className="cc-side-panel__body">{children}</Layer>
      {actions && <footer className="cc-side-panel__actions">{actions}</footer>}
    </aside>
  );
}
