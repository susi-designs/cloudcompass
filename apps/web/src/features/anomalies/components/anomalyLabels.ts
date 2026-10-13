import { NEEDS_TRIAGE, type AnomalyRow } from '../../../data/anomalies';
import { DATA_END } from '../../../data/scope';
import { formatDate } from '../../../lib/format';

export function statusDetail(r: AnomalyRow): string | null {
  if (r.status === 'Acknowledged' && r.acknowledgedAt) return formatDate(r.acknowledgedAt);
  if (r.status === 'Expected' && r.expectedReason) return r.expectedReason;
  if (r.status === 'Resolved' && r.resolvedAt) return formatDate(r.resolvedAt);
  return null;
}

/** "Ongoing" while an anomaly still runs at the end of the data and nobody has closed it. */
export function durationLabel(r: AnomalyRow): string {
  if (r.endedAt === DATA_END && NEEDS_TRIAGE.includes(r.status)) return 'Ongoing';
  return `${r.durationDays} day${r.durationDays === 1 ? '' : 's'}`;
}
