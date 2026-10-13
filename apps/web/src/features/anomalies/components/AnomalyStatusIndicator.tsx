import { preview__IconIndicator as IconIndicator } from '@carbon/react';
import type { AnomalyStatus } from '@cloudcompass/types';

const KIND = {
  Open: 'not-started',
  Acknowledged: 'in-progress',
  Expected: 'undefined',
  Resolved: 'succeeded',
} as const;

export function AnomalyStatusIndicator({ status }: { status: AnomalyStatus }) {
  return <IconIndicator kind={KIND[status]} label={status} size={16} />;
}
