# CloudCompass — Product Brief

> **CloudCompass** is an enterprise FinOps portal that gives engineering, finance, and leadership one trusted view of cloud and AI spend, and helps them act on it.

| | |
|---|---|
| **Product** | CloudCompass (FinOps Portal) |
| **Status** | Draft v0.1 |
| **Last updated** | 2026-10-10 |
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

## 5. Key Experiences

1. **Executive Overview dashboard.** Total spend, month-to-date vs. budget, forecast, top movers, savings realized, open anomalies.
2. **Cost Explorer.** Interactive charts and pivot-style tables with drill-down from organization → team → service → resource.
3. **AI Spend dashboard.** Spend by model/provider, token trends, cost per feature, GPU utilization.
4. **Recommendations inbox.** Sorted by savings and effort, with bulk actions and ownership.
5. **Anomaly feed.** Timeline of detected spikes with impact, root cause, and status.
6. **Reports & exports.** Scheduled PDF/CSV reports and an API for BI tools.

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

## 8. Release Plan (Proposed)

| Phase | Focus | Highlights |
|---|---|---|
| **MVP** | Visibility | AWS/Azure/GCP ingestion, FOCUS normalization, Executive Overview, Cost Explorer, budgets, basic allocation |
| **v1** | Action | Utilization views, Optimization recommendations and workflow, anomaly detection with alerting |
| **v1.5** | AI | AI Spend pillar (LLM APIs and GPU), AI budgets and guardrails, model cost comparison |
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

## 11. Related Documents

- `DESIGN.md`: design system (colors, typography, spacing, components)
- `AGENTS.md`: development guide for AI agents
