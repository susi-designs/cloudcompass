import { preview__IconIndicator as IconIndicator } from '@carbon/react';
import type { AnomalySeverity } from '@cloudcompass/types';

/**
 * Severity colors follow DESIGN.md §5.2 (Critical red, High orange, Medium yellow, Low blue),
 * each with its own icon and a text label so color is never the only cue.
 */
const KIND = {
  Critical: 'failed',
  High: 'caution-major',
  Medium: 'caution-minor',
  Low: 'informative',
} as const;

export function SeverityIndicator({ severity }: { severity: AnomalySeverity }) {
  return <IconIndicator kind={KIND[severity]} label={severity} size={16} />;
}
