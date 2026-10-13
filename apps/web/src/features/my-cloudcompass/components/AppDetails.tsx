import { SkeletonText } from '@carbon/react';
import type { AppSnapshot } from '../../../data/myCloudCompass';
import { formatCurrency } from '../../../lib/format';

/** Application header facts: LOB, cloud, budget and the three accounts (PRODUCT.md §5.1 row 1). */
export function AppDetails({ snapshot }: { snapshot: AppSnapshot | undefined }) {
  if (!snapshot) return <SkeletonText paragraph lineCount={2} />;
  const { application: app, lob, accounts } = snapshot;
  return (
    <dl className="cc-details cc-app-details" aria-label="Application details">
      <div className="cc-details__item">
        <dt className="cds--type-label-01 cc-text-secondary">Line of business</dt>
        <dd className="cds--type-body-compact-01">{lob}</dd>
      </div>
      <div className="cc-details__item">
        <dt className="cds--type-label-01 cc-text-secondary">Cloud</dt>
        <dd className="cds--type-body-compact-01">{app.provider}</dd>
      </div>
      <div className="cc-details__item">
        <dt className="cds--type-label-01 cc-text-secondary">Monthly budget</dt>
        <dd className="cds--type-body-compact-01">
          {formatCurrency(app.monthlyBudget, app.currency)}
          <span className="cds--type-helper-text-01 cc-text-secondary"> all environments</span>
        </dd>
      </div>
      {accounts.map((a) => (
        <div key={a.id} className="cc-details__item">
          <dt className="cds--type-label-01 cc-text-secondary">{a.environment} account</dt>
          <dd className="cds--type-body-compact-01">
            <span className="cc-cell-stack">
              <span className="cc-break">{a.name}</span>
              <code className="cc-code cc-text-secondary cc-break">{a.id}</code>
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
