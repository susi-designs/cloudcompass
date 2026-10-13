# CloudCompass — Product Brief

> **CloudCompass** is an enterprise FinOps portal that gives engineering, finance, and leadership one trusted view of cloud and AI spend, and helps them act on it.

| | |
|---|---|
| **Product** | CloudCompass (FinOps Portal) |
| **Status** | Draft v0.3 |
| **Last updated** | 2026-10-12 |
| **Owner** | Product (CloudCompass) |

---

## 1. Problem

Cloud and AI spend is now one of the largest and fastest-growing lines in an enterprise budget, and it is hard to govern:

- **Fragmented data.** Billing exports from AWS, Azure, GCP, Kubernetes, SaaS, and AI providers (OpenAI, Anthropic, Bedrock, Vertex, Azure OpenAI) use different schemas, currencies, and granularity.
- **No shared accountability.** Finance sees invoices, while engineering sees resources. Neither can easily tie spend to a team, product, or customer.
- **AI spend is opaque.** Token-based and GPU-based costs scale non-linearly with usage. Budgets get blown before anyone notices.
- **Waste is invisible.** Idle resources, over-provisioned instances, and unused commitments (RIs or Savings Plans) quietly add 20–35% to the bill.
- **Surprises arrive late.** Teams find cost spikes at month-end close, weeks after they could have been fixed.

## 2. Vision

> *Every dollar of cloud and AI spend is visible, owned, and justified.*

CloudCompass is the "compass" for cloud economics. It shows where money is going (**Cost & Usage**), how well it is used (**Utilization**), what AI is costing (**AI Spend**), how to spend less (**Optimization**), and when something goes wrong (**Anomalies**).

## 3. Target Users & Personas

| Persona | Role | Primary Jobs-to-be-Done |
|---|---|---|
| **FinOps Lead / Practitioner** | Runs the FinOps practice | Allocate costs, run showback/chargeback, manage commitments, report savings |
| **Engineering Manager / Platform Engineer** | Owns services and infrastructure | Understand team spend, right-size resources, act on recommendations |
| **Finance / FP&A Analyst** | Budgets and forecasts | Track spend against budget, forecast, reconcile invoices |
| **ML / AI Platform Lead** | Owns AI and LLM workloads | Track token and GPU costs, cost per model/feature, set guardrails |
| **Executive (CIO / CFO / CTO)** | Sets strategy | High-level trends, unit economics, savings realized, risk |

## 4. Product Pillars & Scope

**Organizational hierarchy.** All spend is allocated through **Line of business (LOB) → Application → Environment (DEV / TEST / PROD) → Account**, with exactly one cloud account per application environment. Budgets are owned at the application level. Every page can be scoped to any level of this hierarchy. The sample dataset has 5 LOBs, 20 applications (4 per LOB) and 60 accounts.

### 4.1 Cost & Usage
A single, normalized view of spend across all providers.
- Multi-cloud ingestion (AWS CUR, Azure Cost Exports, GCP Billing Export, Kubernetes via OpenCost) normalized to the **FOCUS** specification
- Flexible grouping and filtering by account, service, region, tag, team, product, and environment
- Cost allocation rules, virtual tagging, and shared-cost splitting (e.g., support fees, shared clusters)
- Showback/chargeback reports by business unit
- Budgets with threshold alerts, plus 3/6/12-month forecasts
- Unit economics (e.g., cost per customer, per transaction, per 1K requests)

### 4.2 Utilization
How efficiently provisioned resources are used.
- CPU, memory, storage, and network utilization for compute, databases, and containers
- Kubernetes efficiency: requested vs. used, idle capacity per namespace/workload
- Commitment coverage and utilization (RIs, Savings Plans, CUDs)
- Idle and orphaned resource detection (unattached volumes, stopped instances, stale snapshots)

### 4.3 AI Spend
First-class visibility into AI and LLM costs.
- Ingest usage from LLM APIs (OpenAI, Anthropic, Google, AWS Bedrock, Azure OpenAI) and GPU infrastructure
- Breakdown by model, team, application, feature, and API key
- Token analytics: input/output/cached tokens, cost per request, cost per 1K tokens
- GPU utilization and cost for training and inference clusters
- AI budgets and guardrails with alerts when usage or cost exceeds thresholds
- Model cost comparison ("what would this workload cost on model X?")
- AI usage is allocated to the application's PROD account, so it follows the LOB → Application → Environment → Account hierarchy

### 4.4 Optimization
Actionable, prioritized savings.
- Recommendations: rightsizing, idle cleanup, storage tiering, commitment purchases, spot/preemptible adoption, AI model downgrade or caching opportunities
- Each recommendation shows estimated monthly savings, effort, risk, and owner
- Workflow: assign → accept/snooze/dismiss → track to realized savings
- Integrations to push actions to Jira, ServiceNow, and Slack/Teams
- Savings ledger: projected vs. realized savings over time
- Until the API exists, workflow changes are stored in the user's browser only; Jira/ServiceNow/Slack integrations come with the API

### 4.5 Anomalies
Catch cost surprises early.
- ML-based anomaly detection on daily/hourly spend at service, account, tag, and AI-model level
- Severity scoring based on absolute and relative impact
- Root-cause hints (which resource, region, or usage type drove the change)
- Alert routing to owners via email, Slack/Teams, and webhooks
- Triage workflow: acknowledge, mark expected, resolve, with feedback that tunes the model
- Until the API exists, triage changes are stored in the user's browser only, and alerts are routed by a fixed rule (Critical: email, Slack and webhook; High: email and Slack; Medium/Low: email). Routing settings and model tuning come with the API

## 5. Key Experiences

1. **Executive Overview dashboard.** Total spend, month-to-date vs. budget, forecast, top movers, savings realized, open anomalies.
2. **Cost Explorer.** Interactive charts and pivot-style tables with drill-down from organization → team → service → resource.
3. **AI Spend dashboard.** Spend by model/provider, token trends, cost per feature, GPU utilization.
4. **Recommendations inbox.** Sorted by savings and effort, with bulk actions and ownership.
5. **Anomaly feed.** Timeline of detected spikes with impact, root cause, and status.
6. **Reports & exports.** Scheduled PDF/CSV reports and an API for BI tools.
7. **My CloudCompass.** A landing page for one application, with a snapshot of every data set (cost, budget, utilization, AI, recommendations, anomalies) on one screen. See §5.1.

### 5.1 My CloudCompass (application landing page)

**What it is.** A landing page focused on **one application**. It shows a snapshot of every CloudCompass data set for that application on one screen, so an application owner can see "how is my app doing?" without visiting five pillar pages and setting filters on each. The page is **adaptive**: it brings forward what needs attention for that application right now (see *Adaptive layout* below).

**Primary personas.** Engineering Manager / Platform Engineer (application owner). Also useful for the FinOps Lead and Finance when reviewing a single application.

**Route and navigation.**
- My CloudCompass is the **default landing page**: `/` opens it for every user. The Executive Overview moves to `/overview`.
- First item in the SideNav, above Overview.
- Deep link: `/?app=<application_id>` opens the page for that application, so a link can be shared.

**Choosing and switching applications.**
- Users keep a list of **My applications** (up to 10). One of them is the **default application**, which opens on landing.
- An application switcher sits in the page header. It shows My applications first, then all 20 applications (searchable, grouped by LOB). Selecting an application switches the page to it immediately.
- From the switcher the user can add or remove the current application from My applications and set it as the default.
- Until the API exists, the list, the default and the page preferences below are stored in the user's browser only (`cloudcompass.myCloudCompass.v1`), like the other workflow state.
- Precedence: `?app=` in the URL, then the default application. Opening a deep link or switching applications does not change the default.
- First visit with nothing saved: an empty state asks the user to pick an application. No data is shown until one is picked. The first application picked becomes the default.

**Scope and filters.**
- The page is always scoped to the chosen application. The global scope filter bar shows **date range** and **environment** (DEV / TEST / PROD, default all). LOB, application, account and cloud filters are not shown, because the application fixes them.
- Changing the application on this page does not change the global scope used by the pillar pages.
- Date range and environment stay the same when the user switches applications.

**Page layout (top to bottom, fixed order).**

| # | Section | Contents | Source pillar |
|---|---|---|---|
| 1 | **Application header** | Application name, LOB, cloud provider, the 3 accounts (DEV / TEST / PROD, with IDs), monthly budget, and "as of" date | Hierarchy |
| 2 | **KPI strip** | MTD spend (vs. same point last month), month-end forecast, budget status (On track / At risk / Over budget, forecast as % of budget), AI spend for the selected period (vs. the previous period, as on the AI Spend page), open savings (sum of open recommendations, per month), open anomalies (count by severity) | All |
| 2a | **Needs attention** | Adaptive band: a one-sentence summary and up to 5 ranked signal cards (see *Adaptive layout*) | All |
| 3 | **Cost & Usage** | Daily spend trend for the selected date range, stacked by environment; top 5 services by spend with change vs. prior period; 6-month budget vs. actual | Cost & Usage |
| 4 | **Utilization** | Average CPU and memory utilization, idle and orphaned resources (count and monthly cost), commitment coverage and utilization meters | Utilization |
| 5 | **AI Spend** | AI spend trend, spend by model/provider, input/output/cached tokens, top features by cost. AI usage sits in the application's PROD account (§4.3) | AI Spend |
| 6 | **Optimization** | Top 5 open recommendations by estimated monthly savings (type, savings, effort, owner, status); projected vs. realized savings | Optimization |
| 7 | **Anomalies** | Open and acknowledged anomalies, newest first (date, severity, impact, service, status); count of anomalies resolved in the last 30 days | Anomalies |

**Behavior.**
- Every section has a **"View in <pillar>"** link that opens that pillar page with the global scope set to this application (and the same date range and environment).
- Numbers match the pillar pages exactly. The page reuses the existing data hooks and formulas (for example `data/forecast.ts`, `useEffectiveRecommendations()`, `useEffectiveAnomalies()`), so recommendation and triage state changed elsewhere shows here too.
- The page is a **read-only snapshot**. Workflow actions (accept, snooze, acknowledge, resolve, and so on) happen on the pillar pages. Clicking an anomaly opens it on the Anomalies page with its detail panel open; clicking a recommendation opens the Optimization inbox scoped to the application.
- A section with no data for the application (for example, no AI usage) shows a short empty state instead of an empty chart.
- Every chart follows the standard rules: title, text summary, and "View as table" (`DESIGN.md`).

**Adaptive layout (generative UI).**

The page composes itself from the application's current state instead of showing the same layout every day. Anomalies and recommendations come and go; the page should bring forward what matters now and stay calm when nothing does.

*How it works:*
1. **Signals.** Each data set is turned into scored signals (0–100) for the application. Anything already handled (resolved, marked expected, dismissed, accepted, implemented) produces no signal, so triage and workflow changes on the pillar pages move the page.
2. **Composer.** Rules pick the layout from a fixed catalog of Carbon components (signal card, KPI tile, chart card, table, one-line summary). The composer never invents UI and never invents numbers: every figure comes from the same calculations as the pillar pages.
3. **Rule-based, not AI-generated.** No AI model is involved in v1, so the page does not carry the Carbon AI label. A written summary from an LLM is a later phase (see below).

*Signals:*

| Signal | Section | Fires when | Score |
|---|---|---|---|
| Anomaly | Anomalies | Each open or acknowledged anomaly | Critical 60, High 45, Medium 30, Low 15; + up to 25 for impact (full at 5% of the monthly budget); + 10 if detected in the last 3 days (+ 5 in the last 7); − 10 once acknowledged |
| Budget | Cost & Usage | Month-end forecast ≥ 90% of budget | At risk: 30 + 2 per point above 90%; Over budget: 55 + 5 per point above 100% (max 80) |
| Spend growth | Cost & Usage | MTD spend ≥ 10% above the same days last month | 30 + 2 per point above 10% (max 60) |
| Recommendation | Optimization | Each open recommendation | 20 + up to 40 for savings (full at 5% of the monthly budget); + 10 if unassigned; + 10 if a quick win (low effort, low risk) |
| Idle resources | Utilization | Idle resources cost ≥ 2% of the monthly budget | 25 + up to 30 (full at 10% of the budget) |
| Commitment coverage | Utilization | Coverage of commitment-eligible spend < 50% | 25 + half the points below 50% (max 50) |
| AI spend growth | AI Spend | AI spend ≥ 20% above the previous period | 30 + 1 per point above 20% (max 60) |

*Needs attention band* (under the KPI strip):
- A one-sentence summary built from the top signals, e.g. "Trading Platform needs attention: 2 critical anomalies (+$5.8K) and the budget forecast is at 100%." When nothing qualifies: "All clear for Payment Gateway. Nothing needs attention right now."
- Up to **5 signal cards**, highest score first. Each card shows a status indicator, a title, the key numbers, **why it is shown** (e.g. "Critical · $5.8K above expected · detected 4 days ago"), and a link to the item on its pillar page. More qualifying signals show as "+ N more" and still affect the sections below.

*Section emphasis* (order never changes):
- **Needs attention:** the section has a signal in the band. It is expanded and its header shows a "Needs attention" tag with the count.
- **Steady:** the section has signals below the band threshold. It is expanded.
- **Quiet:** the section has no signals. It collapses to a one-line "All clear" summary with its key number and a "Show details" button.

*Stability (avoid a page that jumps around):*
- **Hysteresis.** A signal enters the band at score ≥ 40 and only leaves when it drops below 30.
- **Daily cadence.** Signals come from daily billing data and are recomputed when the page loads, never while the user is reading.
- **Since your last visit.** A visit ends after 30 minutes away. Signals that weren't in the band last visit are tagged **New**. Signals that were in the band and are now handled stay for the rest of the visit and the next one, tagged **Resolved**, then drop off, so nothing silently disappears.

*User control (always beats the scoring):*
- **Pin** a section open, so it never collapses to its quiet summary.
- **Mute** a signal type for an application (e.g. budget alerts while a planned migration runs). Muted types leave the band and the section emphasis; the band lists what's muted with an "Unmute" action.
- Pins and mutes are per application and stored with My applications.

*Later phase:* an LLM-written narrative summary (needs the API, a new dependency and the Carbon AI label). Numbers in it would still be filled in from data, never written by the model.

**Out of scope for this version.**
- More than one application on the same screen, or comparing applications side by side.
- Freely rearranging, hiding or adding sections (a drag-and-drop widget layout). The adaptive layout and pins cover emphasis.
- Saving the home application on the server or across devices (comes with the API and SSO user profile).
- Automatically choosing the application from the user's identity or team ownership (needs the API and RBAC).

**Decisions (2026-10-12).**
- `/` opens My CloudCompass for every user; Overview moves to `/overview`.
- Section order stays as listed above.
- Users can keep several applications and switch between them.
- The page uses the rule-based adaptive layout above; the LLM narrative is a later phase.

> UI must follow **DESIGN.md**, the design-system source of truth. The product puts data, tables, and data visualization first.

## 6. Non-Functional Requirements

| Area | Requirement |
|---|---|
| **Security** | SSO (SAML/OIDC), RBAC with team/account scoping, read-only cloud access, encryption in transit and at rest, audit log |
| **Compliance** | SOC 2 Type II readiness, GDPR-aware data handling |
| **Scale** | Billions of billing line items per month, with multi-year history |
| **Freshness** | Billing data refreshed at least daily; AI usage near real-time where provider APIs allow |
| **Performance** | Dashboard p95 load < 3s; Cost Explorer queries p95 < 5s |
| **Multi-tenancy** | Isolated tenants; multi-currency with configurable FX |
| **Extensibility** | Public REST API, webhooks, and a connector framework for new data sources |

## 7. Success Metrics

| Category | Metric | Target (12 months) |
|---|---|---|
| Visibility | % of spend allocated to an owner | ≥ 90% |
| Savings | Realized savings as % of addressable spend | 15–25% |
| Speed | Mean time to detect a cost anomaly | < 24 hours |
| Speed | Mean time to resolve a cost anomaly | < 3 days |
| Forecasting | Monthly forecast accuracy | within ±5% |
| AI governance | % of AI spend attributed to a team/feature | ≥ 85% |
| Adoption | Weekly active users across engineering and finance | ≥ 40% of licensed seats |
| Adoption | % of weekly active users with a home application set in My CloudCompass | ≥ 60% |

## 8. Release Plan (Proposed)

| Phase | Focus | Highlights |
|---|---|---|
| **MVP** | Visibility | AWS/Azure/GCP ingestion, FOCUS normalization, Executive Overview, Cost Explorer, budgets, basic allocation |
| **v1** | Action | Utilization views, Optimization recommendations and workflow, anomaly detection with alerting |
| **v1.5** | AI | AI Spend pillar (LLM APIs and GPU), AI budgets and guardrails, model cost comparison |
| **v1.6** | Personalization | My CloudCompass application landing page with the adaptive "Needs attention" layout (§5.1) |
| **v2** | Scale & automation | Kubernetes deep dive, unit economics, commitment planning, automated remediation, Jira/ServiceNow integrations |

## 9. Out of Scope (for now)

- Direct procurement or purchasing of commitments on the user's behalf (we recommend, the user executes)
- Non-cloud IT spend (on-prem hardware, general SaaS licensing beyond AI providers)
- Carbon/sustainability reporting (candidate for a later phase)

## 10. Risks & Open Questions

- **Data access.** Customers may be slow to grant billing-export access; onboarding must be self-serve and well documented.
- **Tagging quality.** Allocation accuracy depends on tags; virtual tagging and rules must cover gaps.
- **AI provider data.** Usage APIs vary in granularity and latency across providers.
- **Recommendation trust.** Engineers ignore noisy recommendations, so precision matters more than volume.
- **Open:** Pricing model (% of spend vs. per seat vs. tiered)?
- **Open:** SaaS-only, or also offer a self-hosted deployment?
- **Open:** Which integrations (Slack, Teams, Jira, ServiceNow) are in MVP?
- **Open:** My CloudCompass: tune signal thresholds and weights with real usage (§5.1).

## 11. Related Documents

- `DESIGN.md`: design system (colors, typography, spacing, components)
- `AGENTS.md`: development guide for AI agents
