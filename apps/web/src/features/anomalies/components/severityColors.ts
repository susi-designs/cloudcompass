import type { AnomalySeverity } from '@cloudcompass/types';

/**
 * Chart colors for severity (DESIGN.md §5.2): the same Carbon status tokens the severity
 * indicator uses, as CSS custom properties so they follow g10 / g100. Carbon Charts applies
 * them as inline `fill` styles, where `var()` resolves.
 */
export const SEVERITY_CHART_COLORS: Record<AnomalySeverity, string> = {
  Critical: 'var(--cds-status-red)',
  High: 'var(--cds-status-orange)',
  Medium: 'var(--cds-status-yellow)',
  Low: 'var(--cds-status-blue)',
};
