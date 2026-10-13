import { preview__IconIndicator as IconIndicator } from '@carbon/react';
import type { BudgetStatus } from '../../../data/budgets';

const KIND = {
  'On track': 'succeeded',
  'At risk': 'caution-major',
  'Over budget': 'failed',
} as const;

/** Carbon status indicator: icon + label, never color alone (DESIGN.md §6). */
export function BudgetStatusIndicator({ status }: { status: BudgetStatus }) {
  return <IconIndicator kind={KIND[status]} label={status} size={16} />;
}
