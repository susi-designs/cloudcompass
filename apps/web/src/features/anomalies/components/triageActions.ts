import { Checkmark, CheckmarkOutline, Undo, View, type CarbonIconType } from '@carbon/icons-react';
import type { TriageActionType } from '../../../data/anomalies';

export const TRIAGE_ACTIONS: { type: TriageActionType; label: string; icon: CarbonIconType }[] = [
  { type: 'acknowledge', label: 'Acknowledge', icon: View },
  { type: 'expect', label: 'Mark expected', icon: Checkmark },
  { type: 'resolve', label: 'Resolve', icon: CheckmarkOutline },
  { type: 'reopen', label: 'Reopen', icon: Undo },
];

export const TRIAGE_PAST_TENSE: Record<TriageActionType, string> = {
  acknowledge: 'acknowledged',
  expect: 'marked expected',
  resolve: 'resolved',
  reopen: 'reopened',
};

export const pluralAnomalies = (n: number) => `${n} anomal${n === 1 ? 'y' : 'ies'}`;
