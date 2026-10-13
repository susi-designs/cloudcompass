# CloudCompass

Enterprise FinOps portal: **Cost & Usage · Utilization · AI Spend · Optimization · Anomalies**.

- Product brief: [`PRODUCT.md`](PRODUCT.md)
- Design system (Carbon): [`DESIGN.md`](DESIGN.md)
- Engineering conventions: [`CLAUDE.md`](CLAUDE.md) · [`AGENTS.md`](AGENTS.md)

## Prerequisites

- **Node.js 22** (see `.nvmrc`; `nvm use` if you use nvm). Node ≥ 20.19 works.
- **pnpm 10** via Corepack (ships with Node): `corepack enable`

## Getting started

```bash
corepack enable                 # once per machine; provides the pinned pnpm version
pnpm install                    # install all workspaces
pnpm dev                        # http://localhost:5173
```

First time running end-to-end tests:

```bash
pnpm --filter @cloudcompass/web exec playwright install chromium
pnpm test:e2e
```

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Run the web app (Vite) |
| `pnpm build` | Type-check and build all workspaces |
| `pnpm test` | Unit and component tests (Vitest) |
| `pnpm test:e2e` | End-to-end smoke tests (Playwright) |
| `pnpm lint` | ESLint + Stylelint (blocks raw hex/px and non-Carbon libraries) |
| `pnpm typecheck` | `tsc --noEmit` across workspaces |
| `pnpm format` | Prettier |

## Workspace layout

| Path | Purpose |
|---|---|
| `apps/web` | React 18 + Vite + Carbon front end |
| `packages/types` | Shared domain types (FOCUS cost records, AI usage, recommendations, anomalies…) |
| `packages/mock-data` | Deterministic, seeded mock data for every pillar |
| `packages/config` | Shared TypeScript, ESLint and Stylelint presets |

## Mock data

The organization is modelled as **LOB → Application → Environment → Account**:

| Level | Count | Notes |
|---|---|---|
| Lines of business | 5 | Retail Banking, Wealth Management, Commercial Banking, Payments, Corporate Technology |
| Applications | 20 | 4 per LOB; each runs on one cloud (AWS, Azure or GCP) and has a monthly budget |
| Environments | 3 per app | `DEV`, `TEST`, `PROD` |
| Accounts | 60 | Exactly one per application environment |

`generateDataset({ seed, endDate, days })` returns 12 months of daily FOCUS cost records for
every account, plus utilization, commitments, AI/LLM and GPU usage, recommendations and
anomalies tied to the same hierarchy. Defaults (`seed: 42`, `endDate: 2026-10-09`, `days: 365`)
are fixed so tests and screenshots are stable. The web app reads it only through
`apps/web/src/data/` — swap `source.ts` for an API later.

A CSV snapshot lives in [`data/sample/`](data/sample):

- `hierarchy.csv` — LOB, application, cloud, environment, account and budget (60 rows)
- `monthly-cost-by-account-service.csv` — billed and effective cost per month, account and service
- `daily-cost-by-account.csv` — billed cost per day and account

Regenerate it with `pnpm --filter @cloudcompass/mock-data export:sample`.
