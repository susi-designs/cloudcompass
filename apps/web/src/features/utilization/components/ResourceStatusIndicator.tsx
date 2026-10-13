import { preview__IconIndicator as IconIndicator } from '@carbon/react';
import type { ResourceStatus } from '../../../data/utilization';

const KIND = {
  Idle: 'failed',
  Underutilized: 'caution-minor',
  Healthy: 'succeeded',
  Hot: 'caution-major',
  'Not measured': 'undefined',
} as const;

const LABEL: Record<ResourceStatus, string> = {
  Idle: 'Idle',
  Underutilized: 'Under-utilized',
  Healthy: 'Healthy',
  Hot: 'Hot',
  'Not measured': 'Not measured',
};

export function ResourceStatusIndicator({ status }: { status: ResourceStatus }) {
  return <IconIndicator kind={KIND[status]} label={LABEL[status]} size={16} />;
}
