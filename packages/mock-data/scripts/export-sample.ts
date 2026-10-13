/**
 * Export the deterministic mock dataset as CSV files for review in a spreadsheet.
 *
 *   pnpm --filter @cloudcompass/mock-data export:sample
 *
 * Writes to <repo>/data/sample/. The generator in src/ is the source of truth;
 * these files are a convenience snapshot.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateDataset } from '../src/index';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '../../../data/sample');
mkdirSync(outDir, { recursive: true });

const ds = generateDataset();
const lobName = new Map(ds.lobs.map((l) => [l.id, l.name]));
const appById = new Map(ds.applications.map((a) => [a.id, a]));

function csv(rows: readonly (readonly (string | number)[])[]): string {
  const cell = (v: string | number): string => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(cell).join(',')).join('\n') + '\n';
}

function write(name: string, rows: readonly (readonly (string | number)[])[]): void {
  writeFileSync(join(outDir, name), csv(rows));
  console.log(`${name}: ${rows.length - 1} rows`);
}

// 1. Hierarchy: LOB → Application → Environment → Account
write('hierarchy.csv', [
  [
    'lob_id',
    'lob',
    'application_id',
    'application',
    'cloud',
    'environment',
    'account_id',
    'account_name',
    'app_monthly_budget_usd',
  ],
  ...ds.accounts.map((a) => {
    const app = appById.get(a.applicationId);
    return [
      a.lobId,
      lobName.get(a.lobId) ?? '',
      a.applicationId,
      app?.name ?? '',
      a.provider,
      a.environment,
      a.id,
      a.name,
      app?.monthlyBudget ?? 0,
    ];
  }),
]);

// 2. Monthly cost by account and service
const monthly = new Map<string, { billed: number; effective: number; row: (string | number)[] }>();
for (const c of ds.costs) {
  const month = c.ChargePeriodStart.slice(0, 7);
  const key = `${month}|${c.BillingAccountId}|${c.ServiceName}`;
  let entry = monthly.get(key);
  if (!entry) {
    const app = appById.get(c.Tags.application ?? '');
    entry = {
      billed: 0,
      effective: 0,
      row: [
        month,
        lobName.get(c.Tags.lob ?? '') ?? '',
        app?.name ?? '',
        c.Tags.env ?? '',
        c.BillingAccountId,
        c.BillingAccountName,
        c.ProviderName,
        c.ServiceCategory,
        c.ServiceName,
      ],
    };
    monthly.set(key, entry);
  }
  entry.billed += c.BilledCost;
  entry.effective += c.EffectiveCost;
}
write('monthly-cost-by-account-service.csv', [
  [
    'month',
    'lob',
    'application',
    'environment',
    'account_id',
    'account_name',
    'cloud',
    'service_category',
    'service',
    'billed_cost_usd',
    'effective_cost_usd',
  ],
  ...[...monthly.values()].map((e) => [...e.row, e.billed.toFixed(2), e.effective.toFixed(2)]),
]);

// 3. Daily cost by account (rolled up across services)
const daily = new Map<string, number>();
for (const c of ds.costs) {
  const key = `${c.ChargePeriodStart.slice(0, 10)}|${c.BillingAccountId}`;
  daily.set(key, (daily.get(key) ?? 0) + c.BilledCost);
}
const accountById = new Map(ds.accounts.map((a) => [a.id, a]));
write('daily-cost-by-account.csv', [
  ['date', 'lob', 'application', 'environment', 'account_id', 'cloud', 'billed_cost_usd'],
  ...[...daily.entries()].map(([key, cost]) => {
    const [date = '', accountId = ''] = key.split('|');
    const a = accountById.get(accountId);
    return [
      date,
      lobName.get(a?.lobId ?? '') ?? '',
      appById.get(a?.applicationId ?? '')?.name ?? '',
      a?.environment ?? '',
      accountId,
      a?.provider ?? '',
      cost.toFixed(2),
    ];
  }),
]);
