import { preview__IconIndicator as IconIndicator } from '@carbon/react';
import type { RecommendationStatus } from '@cloudcompass/types';

const KIND = {
  Open: 'not-started',
  Accepted: 'in-progress',
  Snoozed: 'pending',
  Dismissed: 'undefined',
  Implemented: 'succeeded',
} as const;

export function RecommendationStatusIndicator({ status }: { status: RecommendationStatus }) {
  return <IconIndicator kind={KIND[status]} label={status} size={16} />;
}
