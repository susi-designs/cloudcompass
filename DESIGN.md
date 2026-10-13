# CloudCompass — Design System Specification

> **CloudCompass uses the [Carbon Design System](https://carbondesignsystem.com) (v11) as its design system.**
> Carbon is the single source of truth for colors, typography, spacing, layout, motion, iconography, components, and data visualization.
> Guidance and code **must be retrieved through the Carbon Design System MCP connector (`Carbon_MCP`)** rather than invented, recalled from memory, or copied from elsewhere.

| | |
|---|---|
| **Design system** | Carbon Design System v11 (IBM) |
| **Access method** | Carbon MCP connector (`Carbon_MCP`) |
| **Framework** | React (`@carbon/react`) |
| **Charts** | Carbon Charts (`@carbon/charts-react` + `@carbon/charts`) |
| **Themes** | Gray 10 (`g10`, light) and Gray 100 (`g100`, dark) |
| **Last updated** | 2026-10-10 |

---

## 1. Principles

1. **Carbon first, custom last.** Compose existing Carbon components and tokens. Build custom UI only when Carbon has no fit, and build it from Carbon tokens.
2. **Retrieve, don't recall.** Before designing or coding any UI, query the Carbon MCP connector for the current guidance and examples. Carbon evolves; memory goes stale.
3. **Data first.** CloudCompass is a data-dense FinOps product. Tables, charts, and KPIs are the primary content. Follow Carbon's productive (not expressive) style and high-density layout models.
4. **Tokens only.** Never hardcode hex colors, px sizes, font stacks, or shadows. Use Carbon tokens (`$text-primary`, `$spacing-05`, `$heading-03`, etc.) so theming and dark mode work automatically.
5. **Accessible by default.** Meet WCAG 2.1 AA. Carbon components are accessible out of the box; don't break that with overrides.

---

## 2. Using the Carbon MCP Connector

All agents and contributors working on UI must use the `Carbon_MCP` tools. Every tool returns JSON as a string; parse it before use.

### 2.1 Tool routing (choose one, never cross over)

| Need | Tool | Notes |
|---|---|---|
| Charts (line, bar, donut, area, combo, treemap, heatmap, gauge, meter…) | `get_charts` | Only authoritative source for Carbon Charts. Never use `code_search` for charts. |
| Component examples, variants, props, icons, pictograms | `code_search` | Set `filters.component_type: "React"`. Use `filters.component_id` once known. |
| Design, usage, style, accessibility, content guidance | `docs_search` | Use `filters.component_id` / `topic_id` / `page_type` to narrow. |
| `@carbon-labs/*` experimental components | `labs_search` | **Do not use** unless explicitly approved (see §2.4). |

### 2.2 Query strategy

1. **Discover:** one or two broad queries using a specific component name (e.g., `"data table"`, `"structured list"`, `"tile"`). Avoid generic words like "example" or "implementation".
2. **Canonicalize:** read the `component_id` from the results.
3. **Target:** one or two filtered queries with `component_id` (and `variant_id` if needed).
4. If a result has `example_omitted: true`, re-query with its `requery_hint` and `size: 1`.

### 2.3 Charts workflow

1. `get_charts` with `framework: "react"`, `chart_type`, `mode: "schema"` → see variants and data/options shape.
2. `get_charts` with `mode: "full"` and the chosen `variant` → use these fields **verbatim**:
   - `install_command`: run in terminal
   - `styles_import`: top-level import in the app entry module (never inside SCSS)
   - `chosen_variant.import_hint` and `usage_hint`: component import and usage
3. For option details, use `include_interfaces: true`, then `interface_names: [...]` until `follow_up_interface_names` is absent. Do not use `docs_search` for chart interfaces.

### 2.4 Framework discipline

- **React only.** Discard any Web Components results. Never mix React and Web Components.
- **No Carbon Labs** (`@carbon-labs/*`) unless the team approves and records it in §9.
- **No IBM-internal-only assets** (e.g., Carbon for IBM Products components marked IBMers-only) unless licensed.

---

## 3. Foundations

All values come from Carbon tokens. The tables below say **which tokens to use where**. For exact values, query `docs_search` (e.g., `topic_id: "color"`, `"spacing"`, `"typography"`).

### 3.1 Themes

| Mode | Carbon theme | Usage |
|---|---|---|
| Light (default) | **Gray 10 (`g10`)** | Default app shell and dashboards; gives data tiles contrast against the page |
| Dark | **Gray 100 (`g100`)** | User-selected dark mode; respects `prefers-color-scheme` on first load |

- Wrap the app in Carbon's `<Theme>` component; switch theme via a user setting (Light / Dark / System).
- Use Carbon's **layering model** (`$background` → `$layer-01` → `$layer-02` → `$layer-03`) and the `<Layer>` component for nested surfaces. Max three layers deep.

### 3.2 Color tokens (semantic usage)

| Purpose | Tokens |
|---|---|
| Page background | `$background` |
| Cards / tiles / panels | `$layer-01`, `$layer-02` (nested), via `<Layer>` |
| Primary text / secondary / helper | `$text-primary`, `$text-secondary`, `$text-helper` |
| Borders and dividers | `$border-subtle-01`, `$border-strong-01` |
| Primary action / links | `$button-primary`, `$interactive`, `$link-primary` |
| Focus | `$focus` (required on all interactive elements, 3:1 contrast) |
| Status | `$support-error`, `$support-warning`, `$support-caution-major`, `$support-success`, `$support-info` |
| Hover / active / selected | `-hover`, `-active`, `-selected` variants of the base token (e.g., `$layer-hover-01`, `$layer-selected-01`) |

### 3.3 Typography

- Typeface: **IBM Plex Sans** for UI and **IBM Plex Mono** for code, IDs, ARNs, and resource names (both provided through Carbon).
- Use Carbon's **productive** type set:

| Element | Token |
|---|---|
| Page title | `$heading-05` |
| Section title | `$heading-03` |
| Card / tile title | `$heading-compact-02` |
| Body text | `$body-01` / `$body-compact-01` |
| Table cell text | `$body-compact-01` |
| Labels, column headers | `$label-01` / `$heading-compact-01` |
| Helper text | `$helper-text-01` |
| KPI hero number | `$heading-06` or `$heading-07` (tabular figures) |
| Code / resource IDs | `$code-01`, `$code-02` |

### 3.4 Spacing & layout

- Use the Carbon **spacing scale** tokens `$spacing-01` … `$spacing-13`. No raw px or rem values.
  - Inside components: `$spacing-02`–`$spacing-05`
  - Between components: `$spacing-05`–`$spacing-07`
  - Between page sections: `$spacing-07`–`$spacing-10`
- Use the **Carbon 2x Grid** (`<Grid>`, `<Column>`) with 16 columns at `lg` and above.
  - Dashboards use the **high-density interface model** with **narrow** or **condensed** gutter mode for KPI and chart grids.
  - Breakpoints: `sm`, `md`, `lg`, `xlg`, `max` (Carbon defaults).

### 3.5 Shape & elevation

- **Corner radius:** Carbon default (square corners). Do not add rounded corners to Carbon components.
- **Elevation:** express depth with **layer tokens**, not shadows. Shadows appear only where Carbon applies them (menus, popovers, modals, toasts).

### 3.6 Iconography & motion

- Icons from **`@carbon/icons-react`** only (find with `code_search`, `asset_type: "icon"`). 16px inline, 20px in toolbars and actions.
- Pictograms (`asset_type: "pictogram"`) only for empty states and onboarding.
- Motion uses Carbon's **productive** motion tokens and easing curves. Respect `prefers-reduced-motion`.

---

## 4. Components: CloudCompass mapping

Before using a component, retrieve its usage guidance (`docs_search`) and React example (`code_search`) through the connector.

| CloudCompass need | Carbon component(s) |
|---|---|
| App shell, top bar, left navigation | `UI Shell` (`Header`, `SideNav`, `HeaderGlobalAction`) |
| Page header and breadcrumbs | `Breadcrumb`, heading tokens |
| Scope / filter bar (date range, account, team, tag) | `DatePicker`, `Dropdown`, `MultiSelect`, `ComboBox`, `FilterableMultiSelect`, `Tag` (dismissible) |
| KPI tiles (spend, forecast, savings) | `Tile` / `ClickableTile` with heading tokens |
| Cost & resource tables | `DataTable` with `TableToolbar`, sorting, `TableBatchActions`, `Pagination` |
| Detail views | `Tabs`, `StructuredList`, `Accordion` |
| Side detail panel (resource, anomaly, recommendation) | Side panel pattern / `Modal` (passive) as fallback |
| Recommendation actions | `Button` (primary / secondary / ghost), `OverflowMenu` |
| Status (anomaly severity, recommendation state) | `Tag` with status colors, `InlineNotification` |
| Alerts and confirmations | `ToastNotification`, `ActionableNotification`, `Modal` |
| Loading | `DataTableSkeleton`, `SkeletonText`, `SkeletonPlaceholder`, `InlineLoading` |
| Empty states | Carbon empty-state pattern + pictogram |
| Settings / forms (budgets, alerts, allocation rules) | `Form`, `TextInput`, `NumberInput`, `Select`, `Toggle`, `RadioButtonGroup` |

### 4.1 Data table rules

- **Default row size:** `md` (Carbon's default). Offer `sm` / `xs` via a density setting for power users.
- **Toolbar size matches row size:** large (48px) toolbar with `lg`/`xl` rows; small toolbar with `sm`/`xs` rows.
- Column alignment follows the **Column alignment rule** below. It is mandatory for every table.
- Always enable sorting on cost columns. Default sort: cost descending.
- Use **batch actions** for bulk recommendation workflows (assign, snooze, dismiss).
- Use **expandable rows** for line-item breakdowns rather than navigating away.
- Paginate tables over 50 rows with Carbon `Pagination` (or virtualize in very large tables).

### 4.2 Column alignment rule (mandatory)

Every table in CloudCompass (`DataTable`, chart "View as table" views, `StructuredList` used as a table, exports rendered on screen) aligns columns by the **kind of value**, never by taste:

| Column kind (`ColumnKind`) | Examples | Alignment |
|---|---|---|
| `currency` | Billed cost, budget, savings, cost change (`CostDelta`) | **Right** |
| `number` | Counts, quantities, token counts, GPU hours | **Right** |
| `percent` | Utilization %, change % | **Right** |
| `text` | Application, LOB, service, status, description | **Left** |
| `id` | Account IDs, resource IDs, SKUs, ARNs: left even when all digits | **Left** |
| `date` | Dates, months, periods | **Left** |

**How to apply it:**
1. Declare a `kind` for every column. Import `ColumnKind` and `alignClass` from `apps/web/src/lib/columns.ts`.
2. Put `className={alignClass(kind)}` on **both** the `TableHeader` and every `TableCell` in that column, so the header sits over its values. Sortable headers are handled in `index.scss`, with the sort icon on the inner edge.
3. Right-aligned columns use tabular figures (applied automatically by `.cc-cell--end`).
4. Never hard-code `text-align`, Carbon's `align` attribute, or ad-hoc classes for table alignment.
5. Add or extend a test that asserts the `cc-cell--start` / `cc-cell--end` classes for any new table.

Mixed cells follow the value they emphasize: a cell showing `$1,200 · +4.2%` is `currency` (right).

---

## 5. Data Visualization

All charts use **Carbon Charts (`@carbon/charts-react`)**, retrieved via `get_charts` (§2.3).

| Use case | Chart type |
|---|---|
| Spend over time, forecast vs. actual | `line` or `area` (forecast as dashed line) |
| Spend by service / team / account | `bar` (horizontal for long labels), `stacked bar` for composition over time |
| Share of spend | `donut` (≤ 6 slices; otherwise use bar) |
| Hierarchical cost breakdown | `treemap` |
| Utilization heatmaps (hour × day, resource × metric) | `heatmap` |
| Budget consumption, commitment coverage | `meter` or `gauge` |
| Spend vs. utilization correlation | `scatter` / `bubble` |
| Spend + unit metric on one view | `combo` (dual axis) |
| KPI tile sparkline | `line` / `area` with axes, legend, and toolbar hidden |

### 5.1 Color in charts

- Use Carbon's **categorical palette in its documented sequence** for discrete series. Don't reorder or hand-pick.
- Use **sequential (monochromatic)** palettes for magnitude (heatmaps) and **diverging** palettes for variance around a baseline (budget vs. actual).
- Use the **alert palette** only for status: red = error/critical, orange = serious warning, yellow = warning, green = success/normal.
- Charts must follow the active theme (g10 / g100) through the Charts `theme` option.

### 5.2 FinOps-specific conventions

- **Cost direction semantics:** a cost *increase* is negative for the user. Show increases with `$support-error` (or the alert red) and decreases or savings with `$support-success`. Always pair color with an arrow icon and a +/- sign; never rely on color alone.
- **Anomaly severity:** Critical → red, High → orange, Medium → yellow, Low → `$support-info` / gray. Use Carbon `Tag` for severity labels.
- **Currency formatting:** locale-aware via `Intl.NumberFormat`. Compact notation on KPIs and axes (`$1.2M`), full precision in tables and tooltips (`$1,234,567.89`).
- **Percentages:** one decimal place for change (`+12.4%`), whole numbers for utilization (`73%`).
- **Forecasts and estimates** are visually distinct (dashed lines, lighter fills, "Est." label).

---

## 6. Content & Accessibility

- Follow Carbon content guidelines (sentence case for titles, buttons, and labels; concise, action-led button text).
- WCAG 2.1 AA minimum: 4.5:1 text contrast, 3:1 for UI and focus indicators, full keyboard support.
- Every chart needs a text alternative: an accessible title, a summary, and a "View as table" option.
- Never convey meaning by color alone (status, cost direction, severity).

---

## 7. Implementation

```bash
pnpm --filter @cloudcompass/web add @carbon/react @carbon/icons-react @carbon/charts-react @carbon/charts @ibm/plex
```

- Global styles: `@use '@carbon/react';` in the root SCSS entry (`apps/web/src/styles/index.scss`).
- Chart styles: `import '@carbon/charts/styles.css'` as a top-level import in `apps/web/src/main.tsx`. This is the `styles_import` returned by `get_charts` (confirmed 2026-10-10, Carbon Charts 1.27). `@carbon/charts` is a required peer of `@carbon/charts-react`.
- Fonts: `@ibm/plex` is a direct dependency so Carbon's IBM Plex `@font-face` URLs resolve under pnpm. `vite.config.ts` aliases Carbon's webpack-style `~@ibm/plex` paths.
- Theme: wrap the app in `<Theme theme="g10">` / `<Theme theme="g100">` from `@carbon/react`.
- Tokens in SCSS: `@use '@carbon/react/scss/theme' as *;` and `@use '@carbon/react/scss/spacing' as *;` etc. In CSS, use the generated `var(--cds-*)` custom properties.
- Exact install commands and imports should be confirmed with the Carbon MCP connector at implementation time.

---

## 8. Rules for Agents & Contributors

**Do**
- Query the Carbon MCP connector before creating or changing any UI.
- Use Carbon React components and Carbon tokens exclusively.
- Use `get_charts` for every chart; follow its `install_command`, `styles_import`, `import_hint`, and `usage_hint` verbatim.
- Keep both themes (g10, g100) working; test every screen in both.

**Don't**
- Hardcode hex colors, px/rem values, font families, radii, or shadows.
- Use non-Carbon UI libraries (MUI, Chakra, Tailwind components, etc.) or non-Carbon chart libraries.
- Mix React and Web Components, or use Carbon Labs without approval.
- Override Carbon component internals with custom CSS to change their look.

**When Carbon doesn't cover a need:** search the connector first (`docs_search` + `code_search`). If nothing fits, ask before creating a new pattern. Then build it from Carbon tokens and record it in §9 so this file stays the source of truth.

---

## 9. CloudCompass Extensions & Decisions Log

Custom patterns built on Carbon tokens, plus approved deviations. Add an entry for every exception.

| Date | Pattern / decision | Rationale | Built from |
|---|---|---|---|
| 2026-10-10 | Adopted Carbon Design System v11 via Carbon MCP connector as the design source of truth | Enterprise-grade, accessible, data-dense components and charts | — |
| 2026-10-10 | Default themes: g10 (light), g100 (dark) | Tile/table contrast on dashboards; full dark-mode support | Carbon themes |
| 2026-10-10 | Cost-direction color semantics (increase = error, decrease = success) | FinOps convention: spend growth is a risk signal | `$support-error`, `$support-success` |
| 2026-10-10 | `CostDelta`: only the arrow icon is colored; the value text stays `$text-primary` | `$support-success` text fails 4.5:1 contrast on light layers; arrow + sign still carry the meaning | `ArrowUp`/`ArrowDown` icons, `$support-error`, `$support-success` |
| 2026-10-10 | `KpiTile`: `Tile` + `$label-01` label + `$heading-05` value + delta/helper lines; laid out in an auto-fit grid | Executive Overview KPI row | `Tile`, `SkeletonText`, type tokens |
| 2026-10-10 | `ChartCard`: `Tile` with title, one-line text summary and a `ContentSwitcher` (icon switches) toggling chart ↔ `DataTable` | "View as table" accessibility requirement (§6) | `Tile`, `ContentSwitcher`, `IconSwitch`, `DataTable` |
| 2026-10-10 | Scope filter bar: `DatePicker` (range) + `MultiSelect` / `FilterableMultiSelect` per hierarchy level on a `$layer-01` band, auto-fill grid | Global LOB → Application → Environment → Account scoping | Carbon form components, spacing tokens |
| 2026-10-10 | Global search: `ComboBox` inside a `HeaderPanel`; picking a LOB, application or account sets the global scope | Fast jump to any level of the hierarchy | `HeaderPanel`, `ComboBox` |
| 2026-10-10 | App frame: Carbon type utility classes enabled (`@include type.type-classes`); content offset by the 16rem side-nav width from `lg` | Carbon v11 doesn't emit `.cds--type-*` classes by default | `@carbon/react/scss/type` |
| 2026-10-10 | Column alignment rule: currency / number / percent right; text / ID / date left, via `alignClass(kind)` | Readable, comparable amounts; consistent tables across pillars (user rule) | `lib/columns.ts`, `.cc-cell--start` / `.cc-cell--end` |
| 2026-10-10 | `SortableDataTable`: Carbon table primitives (`TableContainer`, `TableToolbarSearch`, `TableHeader` sort, `Pagination`) with sorting/search/paging over *all* rows; amounts sort largest-first on first click | Carbon `DataTable`'s built-in sort only sees the current page | Carbon DataTable primitives, `Pagination` |
| 2026-10-10 | Drill-down breadcrumb: `Breadcrumb` showing All › LOB › Application › Environment › Account; each crumb resets lower levels | Cost Explorer drill path (M2) | `Breadcrumb`, `BreadcrumbItem` |
| 2026-10-10 | Budget status uses Carbon's preview `IconIndicator` (`succeeded` / `caution-major` / `failed`) with a text label; % of budget uses a small `ProgressBar` (`error` status when over 100%) | Status needs icon + text, not color alone; Carbon `Tag` has no yellow/orange | `preview__IconIndicator`, `ProgressBar` |
| 2026-10-10 | Time-series bar charts: daily uses a time axis; weekly/monthly use labelled buckets (`Week of Jul 12`, `Aug 2026`) with `(partial)` on buckets cut off by the date range; bars capped at 48px wide | Evenly spaced bars; a short partial bucket isn't misread as a drop | Carbon Charts `ScaleTypes.LABELS`, `bars.maxWidth` |
| 2026-10-10 | Amount cells never wrap (`white-space: nowrap` on `.cc-cell--end`) | Keeps numbers readable and aligned | `.cc-cell--end` |
| 2026-10-10 | Utilization heatmaps use a fixed 0–100% color domain (legend "Average CPU %") so views stay comparable; >45-day ranges switch to weekly columns | Consistent reading of CPU across scopes | Carbon Charts `HeatmapChart`, `colorDomain` |
| 2026-10-10 | Commitment utilization meters use reversed alert ranges: <70% danger, 70–85% warning, ≥85% success (low utilization = paying for unused capacity) | FinOps semantics for RIs / Savings Plans / CUDs | Carbon Charts `MeterChart` `meter.status.ranges` |
| 2026-10-10 | Resource status via `IconIndicator`: Idle = failed, Under-utilized = caution-minor, Healthy = succeeded, Hot = caution-major, Not measured = undefined | Icon + text status, consistent with budget status | `preview__IconIndicator` |
| 2026-10-10 | Two-line table cells (`.cc-cell-stack`): primary value plus a `$helper-text-01` secondary line (e.g. resource name + type, status + finding) | Fits wide resource tables without extra columns | Type tokens, spacing tokens |
| 2026-10-10 | Model names shown as `cool-gray` `Tag`s in tables; the model in use is marked with a `blue` "Current" tag in the model comparison | Scannable model lists; clear baseline for what-if pricing | `Tag` |
| 2026-10-10 | Large counts (tokens, requests) use compact notation (`350.8B`, `141.3M`) in KPIs, axes and tables; full precision stays for currency in tables | Token volumes span many orders of magnitude | `formatCompactNumber` in `lib/format.ts` |
| 2026-10-10 | Recommendations inbox: `ContentSwitcher` status filter with counts above a selectable, expandable table; `TableBatchActions` shows only the actions valid for the selected rows; actions needing input (assign, snooze, dismiss) or that are final (mark implemented) open a small `Modal` | Bulk workflow per §4.1; invalid transitions are never offered | `ContentSwitcher`, `TableBatchActions`, `TableBatchAction`, `TableSelectAll/Row`, `TableExpandRow`, `Modal`, `Dropdown`, `RadioButtonGroup` |
| 2026-10-10 | Recommendation status uses `IconIndicator`: Open = not-started, Accepted = in-progress, Snoozed = pending, Dismissed = undefined, Implemented = succeeded; a helper line shows the snooze date, dismiss reason or implementation date | Consistent with resource/budget status indicators | `IconIndicator` |
| 2026-10-10 | Expanded-row details as a responsive definition list (`.cc-details`): label-01 term over body-compact-01 value | Shows description and IDs without widening the table | Type and spacing tokens |
| 2026-10-10 | Action feedback: success `InlineNotification` after a batch action (with a skipped count); a low-contrast info `ActionableNotification` with "Discard changes" while workflow changes are only stored locally | Clear outcome of bulk actions; honest about local-only persistence | `InlineNotification`, `ActionableNotification` |
| 2026-10-10 | Savings ledger: grouped bars of projected vs. realized savings by month ("(partial)" months), savings prorated by day from the implementation date | Shows estimate accuracy over time | `GroupedBarChart` |
| 2026-10-10 | Light theme (g10) shell: header and side nav use a `$layer-01` fill (side nav gets a `$border-subtle-01` edge) so they stand apart from the `$background` page; dark (g100) keeps Carbon's default shell fill | Shell blended into the page in light mode (user request) | `$layer-01`, `$border-subtle-01`, scoped to `.cc-app.cds--g10` |
| 2026-10-10 | Brand mark: compass-star logo (`#2A55FC`, brand asset, not a UI token) at `$spacing-06` before the "CloudCompass" name in the header, rendered inline (`shell/BrandMark.tsx`, `aria-hidden`) so the stroke follows the theme: brand blue in g10, `$interactive` (Blue 50) in g100. Masters in `apps/web/src/assets/brand/` (`logo.svg` faithful trace, `logo-mark.svg` heavier strokes for ≤ 48px); favicons in `apps/web/public/` (`favicon.svg` with a solid center for 16px, `favicon.ico` 16+32, `apple-touch-icon.png` 180) | Product identity in the shell and browser tab (user-supplied logo) | `HeaderName`, spacing tokens |

---

## 10. References

- Carbon Design System: https://carbondesignsystem.com
- Carbon data visualization color palettes: https://carbondesignsystem.com/building-blocks/data-visualization/color-palettes/
- Carbon color: https://carbondesignsystem.com/building-blocks/foundations/color/overview/
- Carbon data table: https://carbondesignsystem.com/building-blocks/core/components/data-table/guidelines/
- `PRODUCT.md`: product brief
- `AGENTS.md`: development guide for AI agents
