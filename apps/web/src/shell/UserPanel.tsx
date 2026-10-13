import { HeaderPanel } from '@carbon/react';

/** Placeholder until SSO is wired up (PRODUCT.md §6). */
export function UserPanel({ expanded }: { expanded: boolean }) {
  return (
    <HeaderPanel expanded={expanded} aria-label="User" className="cc-header-panel">
      {expanded && (
        <div className="cc-header-panel__body">
          <p className="cds--type-heading-compact-01">Demo user</p>
          <p className="cds--type-helper-text-01 cc-text-secondary">
            FinOps Practitioner · mock data
          </p>
        </div>
      )}
    </HeaderPanel>
  );
}
