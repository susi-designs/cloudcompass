/** ISO-8601 date-time string (UTC), e.g. `2026-10-01T00:00:00.000Z`. */
export type IsoDateTime = string;

/** ISO-4217 currency code, e.g. `USD`. */
export type CurrencyCode = string;

export type CloudProvider = 'AWS' | 'Azure' | 'GCP';

export type AiProvider = 'OpenAI' | 'Anthropic' | 'Google' | 'AWS Bedrock' | 'Azure OpenAI';

/** Deployment environment. Every application has exactly one account per environment. */
export type Environment = 'PROD' | 'TEST' | 'DEV';

/**
 * Organizational hierarchy used for allocation, showback and filtering:
 * Line of business (LOB) → Application → Environment → Account.
 */
export interface LineOfBusiness {
  id: string;
  name: string;
}

export interface Application {
  id: string;
  name: string;
  lobId: string;
  /** Cloud the application runs on; all of its accounts are on this provider. */
  provider: CloudProvider;
  /** Monthly budget across all environments. */
  monthlyBudget: number;
  currency: CurrencyCode;
}

/** A cloud billing account / subscription / project. One per application environment. */
export interface BillingAccount {
  id: string;
  name: string;
  provider: CloudProvider;
  lobId: string;
  applicationId: string;
  environment: Environment;
}
