import type {
  AiModelPrice,
  Application,
  BillingAccount,
  CloudProvider,
  Environment,
  LineOfBusiness,
  ServiceCategory,
} from '@cloudcompass/types';

export const CURRENCY = 'USD';

export const LOBS: readonly LineOfBusiness[] = [
  { id: 'lob-retail', name: 'Retail Banking' },
  { id: 'lob-wealth', name: 'Wealth Management' },
  { id: 'lob-commercial', name: 'Commercial Banking' },
  { id: 'lob-payments', name: 'Payments' },
  { id: 'lob-corporate', name: 'Corporate Technology' },
];

interface ApplicationSeed {
  slug: string;
  name: string;
  lobId: string;
  provider: CloudProvider;
  monthlyBudget: number;
}

/** 20 applications — 4 per LOB. Budgets are monthly, across all three environments. */
const APPLICATION_SEEDS: readonly ApplicationSeed[] = [
  {
    slug: 'mobile-banking',
    name: 'Mobile Banking',
    lobId: 'lob-retail',
    provider: 'AWS',
    monthlyBudget: 140_000,
  },
  {
    slug: 'online-banking',
    name: 'Online Banking',
    lobId: 'lob-retail',
    provider: 'AWS',
    monthlyBudget: 110_000,
  },
  {
    slug: 'card-services',
    name: 'Card Services',
    lobId: 'lob-retail',
    provider: 'Azure',
    monthlyBudget: 85_000,
  },
  {
    slug: 'loan-origination',
    name: 'Loan Origination',
    lobId: 'lob-retail',
    provider: 'GCP',
    monthlyBudget: 60_000,
  },
  {
    slug: 'advisor-portal',
    name: 'Advisor Portal',
    lobId: 'lob-wealth',
    provider: 'Azure',
    monthlyBudget: 70_000,
  },
  {
    slug: 'portfolio-analytics',
    name: 'Portfolio Analytics',
    lobId: 'lob-wealth',
    provider: 'GCP',
    monthlyBudget: 120_000,
  },
  {
    slug: 'trading-platform',
    name: 'Trading Platform',
    lobId: 'lob-wealth',
    provider: 'AWS',
    monthlyBudget: 160_000,
  },
  {
    slug: 'client-reporting',
    name: 'Client Reporting',
    lobId: 'lob-wealth',
    provider: 'Azure',
    monthlyBudget: 40_000,
  },
  {
    slug: 'treasury-management',
    name: 'Treasury Management',
    lobId: 'lob-commercial',
    provider: 'AWS',
    monthlyBudget: 75_000,
  },
  {
    slug: 'commercial-lending',
    name: 'Commercial Lending',
    lobId: 'lob-commercial',
    provider: 'Azure',
    monthlyBudget: 65_000,
  },
  {
    slug: 'trade-finance',
    name: 'Trade Finance',
    lobId: 'lob-commercial',
    provider: 'GCP',
    monthlyBudget: 45_000,
  },
  {
    slug: 'cash-management',
    name: 'Cash Management',
    lobId: 'lob-commercial',
    provider: 'AWS',
    monthlyBudget: 55_000,
  },
  {
    slug: 'payment-gateway',
    name: 'Payment Gateway',
    lobId: 'lob-payments',
    provider: 'AWS',
    monthlyBudget: 150_000,
  },
  {
    slug: 'fraud-detection',
    name: 'Fraud Detection',
    lobId: 'lob-payments',
    provider: 'GCP',
    monthlyBudget: 130_000,
  },
  {
    slug: 'real-time-payments',
    name: 'Real-time Payments',
    lobId: 'lob-payments',
    provider: 'AWS',
    monthlyBudget: 95_000,
  },
  {
    slug: 'merchant-services',
    name: 'Merchant Services',
    lobId: 'lob-payments',
    provider: 'Azure',
    monthlyBudget: 50_000,
  },
  {
    slug: 'data-platform',
    name: 'Data Platform',
    lobId: 'lob-corporate',
    provider: 'GCP',
    monthlyBudget: 180_000,
  },
  {
    slug: 'hr-systems',
    name: 'HR Systems',
    lobId: 'lob-corporate',
    provider: 'Azure',
    monthlyBudget: 30_000,
  },
  {
    slug: 'finance-erp',
    name: 'Finance & ERP',
    lobId: 'lob-corporate',
    provider: 'Azure',
    monthlyBudget: 55_000,
  },
  {
    slug: 'security-operations',
    name: 'Security Operations',
    lobId: 'lob-corporate',
    provider: 'AWS',
    monthlyBudget: 65_000,
  },
];

export const APPLICATIONS: readonly Application[] = APPLICATION_SEEDS.map((a) => ({
  id: `app-${a.slug}`,
  name: a.name,
  lobId: a.lobId,
  provider: a.provider,
  monthlyBudget: a.monthlyBudget,
  currency: CURRENCY,
}));

export const ENVIRONMENTS: readonly Environment[] = ['PROD', 'TEST', 'DEV'];

/** Share of an application's spend by environment (PROD-heavy, as in real estates). */
export const ENVIRONMENT_WEIGHT: Readonly<Record<Environment, number>> = {
  PROD: 1,
  TEST: 0.3,
  DEV: 0.18,
};

function accountIdFor(
  provider: CloudProvider,
  appIndex: number,
  envIndex: number,
  slug: string,
  env: Environment,
): string {
  const n = appIndex * 3 + envIndex + 1;
  switch (provider) {
    case 'AWS':
      // 12-digit AWS account id.
      return String(400_000_000_000 + n * 7_919_113).padStart(12, '0');
    case 'Azure': {
      // Subscription GUID.
      const hex = (n * 2_654_435_761).toString(16).padStart(8, '0').slice(-8);
      return `${hex}-0000-4000-8000-${String(n).padStart(12, '0')}`;
    }
    case 'GCP':
      return `cc-${slug}-${env.toLowerCase()}`;
  }
}

/** Exactly one account per application environment: 20 apps × 3 envs = 60 accounts. */
export const ACCOUNTS: readonly BillingAccount[] = APPLICATION_SEEDS.flatMap((a, appIndex) =>
  ENVIRONMENTS.map((env, envIndex) => ({
    id: accountIdFor(a.provider, appIndex, envIndex, a.slug, env),
    name: `${a.slug}-${env.toLowerCase()}`,
    provider: a.provider,
    lobId: a.lobId,
    applicationId: `app-${a.slug}`,
    environment: env,
  })),
);

export const REGIONS: Readonly<Record<CloudProvider, readonly { id: string; name: string }[]>> = {
  AWS: [
    { id: 'us-east-1', name: 'US East (N. Virginia)' },
    { id: 'us-west-2', name: 'US West (Oregon)' },
    { id: 'eu-west-1', name: 'Europe (Ireland)' },
  ],
  Azure: [
    { id: 'eastus', name: 'East US' },
    { id: 'westeurope', name: 'West Europe' },
  ],
  GCP: [
    { id: 'us-central1', name: 'Iowa' },
    { id: 'europe-west4', name: 'Netherlands' },
  ],
};

export interface ServiceDef {
  name: string;
  provider: CloudProvider;
  category: ServiceCategory;
  resourceType: string;
  unit: string;
  /** Typical daily PROD cost per application using it, in USD. */
  baseDailyCost: number;
  /** Price per unit, used to derive ConsumedQuantity. */
  unitPrice: number;
  /** Eligible for commitment discounts. */
  committable: boolean;
}

export const SERVICES: readonly ServiceDef[] = [
  // AWS
  {
    name: 'Amazon EC2',
    provider: 'AWS',
    category: 'Compute',
    resourceType: 'Instance',
    unit: 'Hours',
    baseDailyCost: 1400,
    unitPrice: 0.192,
    committable: true,
  },
  {
    name: 'Amazon EKS',
    provider: 'AWS',
    category: 'Compute',
    resourceType: 'Cluster',
    unit: 'Hours',
    baseDailyCost: 220,
    unitPrice: 0.1,
    committable: false,
  },
  {
    name: 'AWS Lambda',
    provider: 'AWS',
    category: 'Compute',
    resourceType: 'Function',
    unit: 'GB-Seconds',
    baseDailyCost: 160,
    unitPrice: 0.0000166667,
    committable: true,
  },
  {
    name: 'Amazon S3',
    provider: 'AWS',
    category: 'Storage',
    resourceType: 'Bucket',
    unit: 'GB-Month',
    baseDailyCost: 420,
    unitPrice: 0.023,
    committable: false,
  },
  {
    name: 'Amazon EBS',
    provider: 'AWS',
    category: 'Storage',
    resourceType: 'Volume',
    unit: 'GB-Month',
    baseDailyCost: 310,
    unitPrice: 0.08,
    committable: false,
  },
  {
    name: 'Amazon RDS',
    provider: 'AWS',
    category: 'Databases',
    resourceType: 'DB Instance',
    unit: 'Hours',
    baseDailyCost: 780,
    unitPrice: 0.48,
    committable: true,
  },
  {
    name: 'Amazon DynamoDB',
    provider: 'AWS',
    category: 'Databases',
    resourceType: 'Table',
    unit: 'Requests',
    baseDailyCost: 260,
    unitPrice: 0.00000125,
    committable: false,
  },
  {
    name: 'Amazon CloudFront',
    provider: 'AWS',
    category: 'Networking',
    resourceType: 'Distribution',
    unit: 'GB',
    baseDailyCost: 190,
    unitPrice: 0.085,
    committable: false,
  },
  {
    name: 'AWS Data Transfer',
    provider: 'AWS',
    category: 'Networking',
    resourceType: 'Transfer',
    unit: 'GB',
    baseDailyCost: 240,
    unitPrice: 0.09,
    committable: false,
  },
  {
    name: 'Amazon SageMaker',
    provider: 'AWS',
    category: 'AI and Machine Learning',
    resourceType: 'Endpoint',
    unit: 'Hours',
    baseDailyCost: 950,
    unitPrice: 1.21,
    committable: true,
  },
  {
    name: 'Amazon Redshift',
    provider: 'AWS',
    category: 'Analytics',
    resourceType: 'Cluster',
    unit: 'Hours',
    baseDailyCost: 640,
    unitPrice: 1.086,
    committable: true,
  },
  {
    name: 'Amazon CloudWatch',
    provider: 'AWS',
    category: 'Management and Governance',
    resourceType: 'Log Group',
    unit: 'GB',
    baseDailyCost: 130,
    unitPrice: 0.5,
    committable: false,
  },
  {
    name: 'AWS WAF',
    provider: 'AWS',
    category: 'Security',
    resourceType: 'Web ACL',
    unit: 'Requests',
    baseDailyCost: 70,
    unitPrice: 0.0000006,
    committable: false,
  },
  // Azure
  {
    name: 'Virtual Machines',
    provider: 'Azure',
    category: 'Compute',
    resourceType: 'Virtual Machine',
    unit: 'Hours',
    baseDailyCost: 900,
    unitPrice: 0.208,
    committable: true,
  },
  {
    name: 'Azure Kubernetes Service',
    provider: 'Azure',
    category: 'Compute',
    resourceType: 'Cluster',
    unit: 'Hours',
    baseDailyCost: 180,
    unitPrice: 0.1,
    committable: false,
  },
  {
    name: 'Azure Functions',
    provider: 'Azure',
    category: 'Compute',
    resourceType: 'Function App',
    unit: 'GB-Seconds',
    baseDailyCost: 60,
    unitPrice: 0.000016,
    committable: false,
  },
  {
    name: 'Azure Blob Storage',
    provider: 'Azure',
    category: 'Storage',
    resourceType: 'Storage Account',
    unit: 'GB-Month',
    baseDailyCost: 210,
    unitPrice: 0.0184,
    committable: false,
  },
  {
    name: 'Azure SQL Database',
    provider: 'Azure',
    category: 'Databases',
    resourceType: 'Database',
    unit: 'vCore-Hours',
    baseDailyCost: 520,
    unitPrice: 0.5,
    committable: true,
  },
  {
    name: 'Azure Cosmos DB',
    provider: 'Azure',
    category: 'Databases',
    resourceType: 'Account',
    unit: 'RU/s-Hours',
    baseDailyCost: 330,
    unitPrice: 0.008,
    committable: true,
  },
  {
    name: 'Azure OpenAI Service',
    provider: 'Azure',
    category: 'AI and Machine Learning',
    resourceType: 'Deployment',
    unit: 'Tokens',
    baseDailyCost: 480,
    unitPrice: 0.00001,
    committable: false,
  },
  {
    name: 'Azure Monitor',
    provider: 'Azure',
    category: 'Management and Governance',
    resourceType: 'Workspace',
    unit: 'GB',
    baseDailyCost: 90,
    unitPrice: 2.3,
    committable: false,
  },
  {
    name: 'Azure Bandwidth',
    provider: 'Azure',
    category: 'Networking',
    resourceType: 'Transfer',
    unit: 'GB',
    baseDailyCost: 110,
    unitPrice: 0.087,
    committable: false,
  },
  // GCP
  {
    name: 'Compute Engine',
    provider: 'GCP',
    category: 'Compute',
    resourceType: 'VM Instance',
    unit: 'Hours',
    baseDailyCost: 820,
    unitPrice: 0.19,
    committable: true,
  },
  {
    name: 'Google Kubernetes Engine',
    provider: 'GCP',
    category: 'Compute',
    resourceType: 'Cluster',
    unit: 'Hours',
    baseDailyCost: 260,
    unitPrice: 0.1,
    committable: false,
  },
  {
    name: 'Cloud Storage',
    provider: 'GCP',
    category: 'Storage',
    resourceType: 'Bucket',
    unit: 'GB-Month',
    baseDailyCost: 240,
    unitPrice: 0.02,
    committable: false,
  },
  {
    name: 'BigQuery',
    provider: 'GCP',
    category: 'Analytics',
    resourceType: 'Dataset',
    unit: 'TiB Scanned',
    baseDailyCost: 880,
    unitPrice: 6.25,
    committable: true,
  },
  {
    name: 'Cloud SQL',
    provider: 'GCP',
    category: 'Databases',
    resourceType: 'Instance',
    unit: 'vCPU-Hours',
    baseDailyCost: 300,
    unitPrice: 0.0413,
    committable: true,
  },
  {
    name: 'Vertex AI',
    provider: 'GCP',
    category: 'AI and Machine Learning',
    resourceType: 'Endpoint',
    unit: 'Node-Hours',
    baseDailyCost: 1100,
    unitPrice: 2.3,
    committable: false,
  },
  {
    name: 'Cloud Logging',
    provider: 'GCP',
    category: 'Management and Governance',
    resourceType: 'Log Bucket',
    unit: 'GiB',
    baseDailyCost: 80,
    unitPrice: 0.5,
    committable: false,
  },
  {
    name: 'Cloud Load Balancing',
    provider: 'GCP',
    category: 'Networking',
    resourceType: 'Load Balancer',
    unit: 'Hours',
    baseDailyCost: 95,
    unitPrice: 0.025,
    committable: false,
  },
];

export type AiModelDef = AiModelPrice;

/** Illustrative prices for mock data only — not real list prices. */
export const AI_MODELS: readonly AiModelDef[] = [
  { provider: 'OpenAI', model: 'gpt-large', inputPrice: 2.5, outputPrice: 10, cachedPrice: 1.25 },
  { provider: 'OpenAI', model: 'gpt-mini', inputPrice: 0.15, outputPrice: 0.6, cachedPrice: 0.075 },
  {
    provider: 'Anthropic',
    model: 'claude-sonnet',
    inputPrice: 3,
    outputPrice: 15,
    cachedPrice: 0.3,
  },
  {
    provider: 'Anthropic',
    model: 'claude-haiku',
    inputPrice: 0.8,
    outputPrice: 4,
    cachedPrice: 0.08,
  },
  { provider: 'Google', model: 'gemini-pro', inputPrice: 1.25, outputPrice: 5, cachedPrice: 0.31 },
  {
    provider: 'AWS Bedrock',
    model: 'titan-text',
    inputPrice: 0.5,
    outputPrice: 1.5,
    cachedPrice: 0.5,
  },
  {
    provider: 'Azure OpenAI',
    model: 'gpt-large (Azure)',
    inputPrice: 2.5,
    outputPrice: 10,
    cachedPrice: 1.25,
  },
];

export interface AiAppDef {
  applicationId: string;
  features: readonly string[];
}

/** Applications that call LLM APIs (from their PROD environment). */
export const AI_APPS: readonly AiAppDef[] = [
  { applicationId: 'app-mobile-banking', features: ['Chat assistant', 'Transaction search'] },
  { applicationId: 'app-advisor-portal', features: ['Meeting summaries', 'Client insights'] },
  { applicationId: 'app-fraud-detection', features: ['Case summaries', 'Risk explanations'] },
  { applicationId: 'app-portfolio-analytics', features: ['Research digests'] },
  { applicationId: 'app-data-platform', features: ['SQL generation', 'Insight narratives'] },
  { applicationId: 'app-card-services', features: ['Dispute triage'] },
  { applicationId: 'app-client-reporting', features: ['Report commentary'] },
];

export const GPU_CLUSTERS = [
  {
    clusterName: 'fraud-train-a100',
    gpuType: 'NVIDIA A100',
    applicationId: 'app-fraud-detection',
    workload: 'Training',
    hourlyRate: 3.67,
    gpus: 16,
  },
  {
    clusterName: 'fraud-infer-l4',
    gpuType: 'NVIDIA L4',
    applicationId: 'app-fraud-detection',
    workload: 'Inference',
    hourlyRate: 0.81,
    gpus: 24,
  },
  {
    clusterName: 'portfolio-infer-t4',
    gpuType: 'NVIDIA T4',
    applicationId: 'app-portfolio-analytics',
    workload: 'Inference',
    hourlyRate: 0.53,
    gpus: 8,
  },
  {
    clusterName: 'data-train-h100',
    gpuType: 'NVIDIA H100',
    applicationId: 'app-data-platform',
    workload: 'Training',
    hourlyRate: 6.98,
    gpus: 8,
  },
] as const;

export function applicationById(id: string): Application {
  const app = APPLICATIONS.find((a) => a.id === id);
  if (!app) throw new Error(`Unknown application ${id}`);
  return app;
}

export function accountFor(applicationId: string, environment: Environment): BillingAccount {
  const account = ACCOUNTS.find(
    (a) => a.applicationId === applicationId && a.environment === environment,
  );
  if (!account) throw new Error(`No account for ${applicationId}/${environment}`);
  return account;
}
