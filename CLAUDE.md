# CLAUDE.md — CloudCompass

This file gives Claude the context and rules for working in this repository. Read it at the start of every session.

@AGENTS.md

---

## 1. What we're building

**CloudCompass** is an enterprise FinOps portal with five pillars:
**Cost & Usage · Utilization · AI Spend · Optimization · Anomalies**.

The product is data-first: tables, charts, KPIs, and dashboards are the core experience.

## 2. Source-of-truth documents

Read the relevant file **before** starting work. Don't guess what's already decided.

| File | Purpose | Read when |
|---|---|---|
| `PRODUCT.md` | Product brief: problem, personas, pillar scope, success metrics, release plan | Planning features, naming things, deciding scope |
| `DESIGN.md` | Design system spec: Carbon Design System via the Carbon MCP connector, themes, tokens, component mapping, chart rules, FinOps visual conventions | **Any** UI work |
| `AGENTS.md` | General rules for AI agents (imported above) | Always |
| `CLAUDE.md` | This file: stack, structure, commands, workflow | Always |

If these documents conflict: `DESIGN.md` wins for UI, `PRODUCT.md` wins for scope and behavior, and this file wins for engineering conventions. Flag the conflict to the user and don't silently pick one.

## 3. Tech stack

> These are the **default choices** for bootstrapping. Change them here (and in `AGENTS.md` → Tech Stack) if the team decides otherwise.

| Layer | Choice |
|---|---|
| Monorepo | **pnpm workspaces** + **Turborepo** |
| Language | **TypeScript** (strict mode) everywhere |
| Web app | **React 18** + **Vite** |
| Design system | **Carbon v11**: `@carbon/react`, `@carbon/icons-react`, `@ibm/plex` (fonts), `sass` |
| Charts | **Carbon Charts**: `@carbon/charts-react` + `@carbon/charts` (no other chart libraries) |
| Routing | **React Router** |
| Server state / data fetching | **TanStack Query** |
| API (phase 2) | **Node.js + Fastify** + TypeScript, OpenAPI schema |
| Data model | **FOCUS** (FinOps Open Cost & Usage Specification) normalized cost records |
| Mock data (MVP) | Seeded, deterministic generator in `packages/mock-data` |
| Unit / component tests | **Vitest** + **React Testing Library** |
| End-to-end tests | **Playwright** |
| Lint / format | **ESLint** + **Prettier** + **Stylelint** (blocks hardcoded hex/px) |

Not allowed: other UI kits (MUI, Chakra, Ant, shadcn), Tailwind, other chart libraries (Recharts, Chart.js, D3 for standard charts), CSS-in-JS. See `DESIGN.md` §8.

## 4. Repository structure (target)

```
cloudcompass/
├── CLAUDE.md  AGENTS.md  PRODUCT.md  DESIGN.md
├── package.json  pnpm-workspace.yaml  turbo.json  tsconfig.base.json
├── apps/
│   ├── web/                      # React + Vite + Carbon front end
│   │   └── src/
│   │       ├── app/              # App root, <Theme>, router, providers
│   │       ├── shell/            # Carbon UI Shell: Header, SideNav, theme switch
│   │       ├── features/         # One folder per pillar
│   │       │   ├── overview/
│   │       │   ├── cost-usage/
│   │       │   ├── utilization/
│   │       │   ├── ai-spend/
│   │       │   ├── optimization/
│   │       │   └── anomalies/
│   │       ├── components/       # Shared composites built from Carbon (KpiTile, CostDelta, ScopeFilterBar, ChartCard…)
│   │       ├── data/             # Data-access layer (hooks + query keys); hides mock vs. API
│   │       ├── lib/              # Formatters (currency, %, dates), utils
│   │       └── styles/           # Global SCSS entry (@use '@carbon/react')
│   └── api/                      # Phase 2: Fastify API (do not create until asked)
└── packages/
    ├── types/                    # Shared domain types (FOCUS cost record, Recommendation, Anomaly, AiUsage…)
    ├── mock-data/                # Deterministic seeded generators for every pillar
    └── config/                   # Shared eslint / tsconfig / stylelint presets
```

Each `features/<pillar>/` folder contains `routes.tsx`, `pages/`, `components/`, `hooks/`, and `__tests__/`.

## 5. Commands

Prerequisites: Node 22 (`.nvmrc`) and pnpm via Corepack (`corepack enable`). First e2e run: `pnpm --filter @cloudcompass/web exec playwright install chromium`.

```bash
pnpm install          # install all workspaces
pnpm dev              # run web app (Vite) at http://localhost:5173
pnpm build            # build all packages/apps via Turborepo
pnpm test             # Vitest unit/component tests
pnpm test:e2e         # Playwright end-to-end tests
pnpm lint             # ESLint + Stylelint
pnpm typecheck        # tsc --noEmit across workspaces
pnpm format           # Prettier write
```

Before saying a task is done, run `pnpm lint && pnpm typecheck && pnpm test` and fix any failures.

## 6. Getting started: bootstrap plan

If the repo has no `package.json` yet, bootstrap in this order. Finish and verify each milestone before starting the next. Ask the user before skipping ahead.

### M0: Scaffold ✅ (done 2026-10-10)
1. Initialize pnpm workspace, Turborepo, `tsconfig.base.json` (strict), shared ESLint/Prettier/Stylelint config.
2. Create `apps/web` with Vite (React + TS). Install Carbon packages: **confirm current package names and imports with the Carbon MCP connector** (`code_search`, and `get_charts` for `install_command` / `styles_import`).
3. Add global SCSS entry with `@use '@carbon/react';` and the Carbon Charts `styles_import` in the app entry module.
4. Create `packages/types` and `packages/mock-data` with a seeded generator producing FOCUS-shaped records (12 months daily, 3 clouds, 5 LOBs → 20 applications → DEV/TEST/PROD → 60 accounts, 30 services, plus AI usage by provider/model).
5. Set up Vitest, Playwright, and a CI-ready `pnpm` script set.

### M1: App shell & Overview ✅ (done 2026-10-10)
1. Carbon **UI Shell**: Header (product name "CloudCompass", global search, theme switch, user menu) + SideNav with the five pillars + Overview.
2. Theme switching: g10 (light) / g100 (dark) / System, persisted per user.
3. Global **scope filter bar**: date range, cloud provider, LOB, application, environment, account (cascading: lower levels only offer options inside the levels above).
4. **Executive Overview** dashboard: KPI tiles (MTD spend, forecast, budget variance, realized savings, open anomalies), spend-over-time line chart, top movers table.

### M2–M6: Pillars (one per milestone, in this order)
- **M2 Cost & Usage** ✅ (done 2026-10-10): Cost Explorer (group-by, drill-down, stacked bar + DataTable), budgets.
- **M3 Utilization** ✅ (done 2026-10-10): utilization heatmaps, idle resources table, commitment coverage meters.
- **M4 AI Spend** ✅ (done 2026-10-10): spend by provider/model, token trends, cost per feature, GPU utilization, model cost comparison.
- **M5 Optimization** ✅ (done 2026-10-10): recommendations inbox (DataTable with batch actions), savings ledger.
- **M6 Anomalies**: anomaly feed, severity tags, detail side panel with root-cause hints.

Scope details for each pillar are in `PRODUCT.md` §4–5.

## 7. How to work in this repo

### Before any UI change
1. Re-read the relevant section of `DESIGN.md`.
2. **Query the Carbon MCP connector** (`Carbon_MCP`). Follow the routing rules in `DESIGN.md` §2:
   - Charts → `get_charts` only (schema first, then full).
   - Components, icons → `code_search` with `component_type: "React"`.
   - Usage, accessibility, content guidance → `docs_search`.
3. Compose Carbon components; use Carbon tokens only. No hex, px, custom radii, or custom shadows.
4. If Carbon doesn't cover the need, **ask the user first**, then record the new pattern in `DESIGN.md` §9.

### Data & domain rules
- **Organizational hierarchy:** Line of business (LOB) → Application → Environment (`DEV`/`TEST`/`PROD`) → Account. Exactly one account per application environment; every application runs on one cloud. Budgets are set per application across all environments. Cost records carry `Tags.lob`, `Tags.application`, `Tags.env`.
- Scope filtering resolves to a set of accounts (`apps/web/src/data/scope.ts`), since every level hangs off the account.
- Mock data is anchored to `endDate: 2026-10-09` (`packages/mock-data/src/options.ts`). Pages show "as of" this date, not today's date.
- `pnpm --filter @cloudcompass/mock-data export:sample` regenerates the CSV snapshot in `data/sample/`.
- All data access goes through hooks in `apps/web/src/data/`. Components never import `mock-data` directly. This keeps the mock → API swap a one-file change.
- Domain types live in `packages/types` and follow FOCUS column names (e.g., `BilledCost`, `EffectiveCost`, `ServiceName`, `ChargePeriodStart`).
- Money is handled as numbers in the billing currency with an explicit `currency` field. Format only at the edge, using `lib/format` (`Intl.NumberFormat`; compact for KPIs and axes, full precision in tables and tooltips).
- Cost increases render as negative/red and savings as positive/green, always with an arrow and a sign (`DESIGN.md` §5.2).
- Mock data must be **deterministic** (seeded) so tests and screenshots are stable.

### Reusable building blocks (use these before writing new ones)
- `components/SortableDataTable.tsx`: Carbon table with sorting, search and pagination across all rows. Every column declares a `kind`, which also enforces the alignment rule (DESIGN.md §4.2). Optional `selection` (checkboxes + `TableBatchActions`) and `expandedContent` (expandable details row).
- `data/RecommendationWorkflowProvider.tsx` + `data/optimization.ts`: recommendation workflow (assign, accept, snooze, dismiss, implement, reopen) with allowed transitions in `canApply`. Until the API exists, changes are stored in this browser (`cloudcompass.recommendations.v1`) and layered over the mock data; read recommendations through `useEffectiveRecommendations()` so every page sees the same state.
- `components/ChartCard.tsx`: chart + text summary + "View as table".
- `components/KpiTile.tsx`, `components/CostDelta.tsx`, `components/PageLayout.tsx` (header + global filters).
- `data/forecast.ts`: the single month-end forecast formula (MTD + trailing 7-day run-rate). Don't re-implement it.
- Pages are lazy-loaded in `app/App.tsx`; add new pillar pages the same way.

### Code conventions
- TypeScript strict; no `any` without a comment explaining why.
- Function components + hooks only. Named exports. One component per file.
- File names: `PascalCase.tsx` for components, `camelCase.ts` for hooks and utils, `kebab-case/` for folders.
- Co-locate tests: `Component.test.tsx` beside the component, or in the feature's `__tests__/`.
- Keep components presentational; put data fetching and transformation in hooks.
- Accessibility: every chart has a title, a text summary, and a "View as table" option. Every interactive element is keyboard reachable.

### Testing expectations
- New shared components and formatters: unit tests.
- New pages: at least one component test rendering with mock data, plus one Playwright smoke test per pillar route.
- Verify UI in **both** g10 and g100 themes.

### Definition of done
- [ ] Follows `DESIGN.md` (Carbon components and tokens only; verified via Carbon MCP)
- [ ] Matches scope in `PRODUCT.md`
- [ ] `pnpm lint && pnpm typecheck && pnpm test` pass
- [ ] Works in light and dark themes and at `md` and `lg` breakpoints
- [ ] Tables follow the column alignment rule: $ amounts and numbers right, text / IDs / dates left (`DESIGN.md` §4.2)
- [ ] No hardcoded colors, sizes, or copy that should be shared
- [ ] Docs updated if behavior, structure, or patterns changed (`DESIGN.md` §9 for new UI patterns)

## 8. Guardrails

- **Ask before:** adding a new dependency, changing the tech stack, creating `apps/api`, adding a design pattern Carbon doesn't cover, or changing scope beyond `PRODUCT.md`.
- **Never:** commit secrets or real cloud credentials, use real customer billing data in fixtures, or disable lint/type rules to make a build pass.
- **Git:** small, focused commits with conventional messages (`feat(cost-usage): …`, `fix(shell): …`). Don't push or open PRs unless asked.
- Keep `PRODUCT.md`, `DESIGN.md`, `AGENTS.md`, and this file current when decisions change.
