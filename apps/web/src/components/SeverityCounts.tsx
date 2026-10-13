import type { AnomalySeverity } from '@cloudcompass/types';
import { SeverityIndicator } from './SeverityIndicator';

const ORDER: readonly AnomalySeverity[] = ['Critical', 'High', 'Medium', 'Low'];

/** Count per severity (non-zero only), e.g. "3 ● Critical  4 ▲ High". */
export function SeverityCounts({ counts }: { counts: Record<AnomalySeverity, number> }) {
  return (
    <span className="cc-severity-row">
      {ORDER.filter((s) => counts[s] > 0).map((s) => (
        <span key={s} className="cc-severity-count">
          <span className="cds--type-heading-compact-01 cc-severity-count__value">{counts[s]}</span>
          <SeverityIndicator severity={s} />
        </span>
      ))}
    </span>
  );
}
