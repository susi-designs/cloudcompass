import type { CloudProvider, CurrencyCode, IsoDateTime } from './common';

/**
 * FOCUS service categories (subset of the FinOps Open Cost & Usage Specification).
 * https://focus.finops.org
 */
export type ServiceCategory =
  | 'Compute'
  | 'Storage'
  | 'Databases'
  | 'Networking'
  | 'AI and Machine Learning'
  | 'Analytics'
  | 'Management and Governance'
  | 'Security';

export type ChargeCategory = 'Usage' | 'Purchase' | 'Tax' | 'Credit' | 'Adjustment';

export type PricingCategory = 'Standard' | 'Committed' | 'Dynamic';

/**
 * A single normalized cost line item. Field names follow FOCUS column names
 * so the mock → real-data swap needs no remapping (CLAUDE.md §7).
 */
export interface FocusCostRecord {
  /** Stable synthetic row id (not a FOCUS column). */
  id: string;
  BillingAccountId: string;
  BillingAccountName: string;
  SubAccountId: string;
  SubAccountName: string;
  ProviderName: CloudProvider;
  PublisherName: string;
  InvoiceIssuerName: string;
  BillingCurrency: CurrencyCode;
  BillingPeriodStart: IsoDateTime;
  BillingPeriodEnd: IsoDateTime;
  ChargePeriodStart: IsoDateTime;
  ChargePeriodEnd: IsoDateTime;
  ChargeCategory: ChargeCategory;
  PricingCategory: PricingCategory;
  ServiceCategory: ServiceCategory;
  ServiceName: string;
  RegionId: string;
  RegionName: string;
  ResourceId: string;
  ResourceName: string;
  ResourceType: string;
  SkuId: string;
  ConsumedQuantity: number;
  ConsumedUnit: string;
  /** Cost as invoiced. */
  BilledCost: number;
  /** Amortized cost after commitment discounts. */
  EffectiveCost: number;
  /** Cost at public on-demand rates. */
  ListCost: number;
  /** Cost at negotiated rates before commitments. */
  ContractedCost: number;
  /** Key/value tags. CloudCompass uses `lob`, `application`, `env`. */
  Tags: Record<string, string>;
}
