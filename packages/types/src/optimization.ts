import type { CloudProvider, Environment, CurrencyCode, IsoDateTime } from './common';

export type RecommendationType =
  | 'Rightsize'
  | 'Idle cleanup'
  | 'Storage tiering'
  | 'Commitment purchase'
  | 'Spot adoption'
  | 'AI model downgrade'
  | 'AI prompt caching';

export type RecommendationStatus = 'Open' | 'Accepted' | 'Snoozed' | 'Dismissed' | 'Implemented';

export type Level = 'Low' | 'Medium' | 'High';

export interface Recommendation {
  id: string;
  type: RecommendationType;
  title: string;
  description: string;
  provider: CloudProvider | 'AI';
  resourceId: string;
  lobId: string;
  applicationId: string;
  environment: Environment;
  accountId: string;
  estimatedMonthlySavings: number;
  currency: CurrencyCode;
  effort: Level;
  risk: Level;
  status: RecommendationStatus;
  createdAt: IsoDateTime;
  /** Team accountable for acting on the recommendation; null while unassigned. */
  owner: string | null;
  /** Set once implemented. */
  implementedAt: IsoDateTime | null;
  /** Set once implemented: measured monthly savings. */
  realizedMonthlySavings: number | null;
  /** Set while snoozed: when the recommendation returns to the inbox. */
  snoozedUntil: IsoDateTime | null;
  /** Set when dismissed. */
  dismissReason: DismissReason | null;
}

export type DismissReason =
  'Not applicable' | 'Risk too high' | 'Already planned' | 'Incorrect data';
