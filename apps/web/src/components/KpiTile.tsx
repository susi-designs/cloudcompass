import { SkeletonText, Tile } from '@carbon/react';
import type { ReactNode } from 'react';

interface KpiTileProps {
  label: string;
  value: string;
  /** Delta / status line under the value. */
  footer?: ReactNode;
  /** Extra context, e.g. what the comparison is. */
  helper?: string;
  loading?: boolean;
}

export function KpiTile({ label, value, footer, helper, loading = false }: KpiTileProps) {
  return (
    <Tile className="cc-kpi" aria-busy={loading}>
      <p className="cds--type-label-01 cc-text-secondary cc-kpi__label">{label}</p>
      {loading ? (
        <SkeletonText heading width="60%" />
      ) : (
        <p className="cds--type-heading-05 cc-kpi__value">{value}</p>
      )}
      {!loading && footer && (
        <div className="cds--type-body-compact-01 cc-kpi__footer">{footer}</div>
      )}
      {!loading && helper && <p className="cds--type-helper-text-01 cc-text-secondary">{helper}</p>}
    </Tile>
  );
}
