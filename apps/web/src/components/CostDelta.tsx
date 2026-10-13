import { ArrowDown, ArrowUp, Subtract } from '@carbon/icons-react';
import { costDirection, formatCurrency, formatPercentChange } from '../lib/format';

interface CostDeltaProps {
  /** Absolute change in cost (current − previous). */
  change: number;
  /** Percentage change, 0–100 scale. Omit or null to hide. */
  changePercent?: number | null;
  /** Show the absolute amount as well as the percentage. */
  showAmount?: boolean;
  currency?: string;
  /** For screen readers, e.g. "vs. same period last month". */
  comparisonLabel?: string;
}

/**
 * Cost change indicator (DESIGN.md §5.2): increases are bad (error color, up arrow),
 * decreases are good (success color, down arrow). Never color alone — always arrow + sign.
 */
export function CostDelta({
  change,
  changePercent,
  showAmount = false,
  currency = 'USD',
  comparisonLabel,
}: CostDeltaProps) {
  const direction = costDirection(change);
  const Icon = direction === 'increase' ? ArrowUp : direction === 'decrease' ? ArrowDown : Subtract;
  const sign = change > 0 ? '+' : '';
  const parts = [
    showAmount ? `${sign}${formatCurrency(change, currency)}` : null,
    changePercent != null ? formatPercentChange(changePercent) : null,
  ].filter(Boolean);
  const verb = direction === 'increase' ? 'Up' : direction === 'decrease' ? 'Down' : 'No change';

  return (
    <span className={`cc-delta cc-delta--${direction}`}>
      <Icon size={16} aria-hidden="true" className="cc-delta__icon" />
      <span className="cds--visually-hidden">{verb} </span>
      <span className="cc-delta__value">{parts.join(' · ') || '—'}</span>
      {comparisonLabel && <span className="cds--visually-hidden"> {comparisonLabel}</span>}
    </span>
  );
}
