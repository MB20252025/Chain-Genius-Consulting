# Stage 3B – Visual Intelligence: implementation blueprint (planning only)

- **Prepared by:** Claude, 22 Nov 2026, under the owner's Stage 3B readiness authorisation, section 12.
- **Planning only.** No interface, CSS, navigation or chart code was changed, and no dependency was installed. Everything here is a recommendation until the owner approves Stage 3B.

## A. The 17 existing analytical areas

**Method.** Each tab was audited by running the engine headlessly on Northstar and reading what every tab actually renders: headings, cards, table columns and notes. The results are calculated once by `analyse()` (`calculations.js` and `forecasting.js`) into the result object `R`, and `app.js` draws HTML from `R`. `CGEngine.runEngine()` (`js/engine/engine-api.js`) already provides a single, frozen-result entry point.

| # | Area (tab) | What it shows today | Business question | Data and calculations (main `R` fields) | Decisions it supports | Overlaps | Proposed home |
|---|---|---|---|---|---|---|---|
| 1 | Overview | Inventory value, value split, top risk items with cover and reason, top-10 concentration, turnover | "Where do we stand, and what is most urgent?" | `tot`, `fgV`, `rmV`, `top10`, `top`, `exV`, `shV`, `cogsF`, `cogsR`, `cov` | Where to look first | Summary, Health | **Overview** |
| 2 | Health | Health score (100 minus penalty points) per item; category counts (Excellent to Critical) | "How healthy is each item's stock position?" | Item risk, cover, lead time, ROP and SS from `fg` and `rm` | Triage of items | Finished goods, Materials (same risk inputs) | **Overview** (score) and **Inventory** (item list) |
| 3 | Finished goods | Per-SKU risk, available stock, position, cover, lead time and its source, SS/ROP (workbook and recommended), ABC/XYZ, confidence, reasons | "Which products will run short or are over-stocked?" | `fg[]`, policy `CFG.pol`, `alt` | Reorder or expedite FG; check the policy | Reorder policy, Policy comparison | **Inventory** |
| 4 | Materials | As FG, plus estimated usage (BOM × sales × (1 + scrap)), products affected, exposed £/month, risk-adjusted lead time | "Which raw materials threaten production?" | `rm[]`, `bom`, `bomS`, `fgm`, supplier lateness | Material reordering; supplier follow-up | MRP, Production feasibility | **Inventory** (stock view) and **Procurement** (supply view) |
| 5 | MRP | Order now / net requirement per material, receipts from POs, MOQ, suggested quantity, stock-out and order-by dates | "What must we buy, how much and by when?" | MRP calculation over `rm`, `po`, `sched` | Raise POs | Materials | **Procurement & Suppliers** |
| 6 | Production feasibility | Feasibility of open or simulated production orders against shared stock and receipts; blocking materials | "Can we build what is planned?" | `prRows`, `sched`, `rm`, `po` | Re-sequence orders; expedite materials | MRP | **Production** (optional) |
| 7 | Excess & dead stock | Items classed excess, slow, obsolete, no-demand or Not Assessed; uncommitted, physical, usable and allocated stock; potential excess value | "What capital is tied up in stock we do not need?" | `exV`, `exF`, `exR`, item classes, A2/B1 rules, `cov` | Write-down, sell-off, stop buying | Health, Overview | **Inventory** |
| 8 | Policy comparison | Risk class under the workbook policy vs the calculated policy; PO-verified vs recorded on-order | "Is our safety stock and reorder policy right?" | `fg`, `rm`, `alt`, `po` | Change policy parameters | Reorder policy | **Demand & Planning** (merged with 9) |
| 9 | Reorder policy | d/day, σ, LT, σLT, SS and ROP (workbook vs calculated), Δ%, verdict | Same as 8, at item level | Safety-stock formula (z, LT, σd, σLT) | Same as 8 | Policy comparison | **Demand & Planning** |
| 10 | Forecast accuracy | Historical forecast vs actual: accuracy, WAPE, bias, verdict, data quality, confidence (level shift, MAD = 0) | "Can we trust our existing forecasts?" | `forecasting.js` credibility (`cred`) | Fix the forecasting process | Demand forecast | **Demand & Planning** |
| 11 | Demand forecast | Statistical forecasts with back-test WAPE, 3/6/12-month totals, 80% range, method, the only chart (SVG) | "What demand should we plan for?" | `forecasting.js` (`fc`), `months` | Plan purchasing and production | Forecast accuracy | **Demand & Planning** |
| 12 | Suppliers | Score (on-time 50% / LT stability 20% / fill 15% …), risk class, evidence, eligibility ("Not Assessed — Insufficient Evidence"), production attainment | "Which suppliers put supply at risk?" | `sup`, `supRisk`, `pr` | Supplier reviews; dual sourcing | Materials (lateness feeds LT) | **Procurement & Suppliers** (attainment → **Production**) |
| 13 | Data quality | Errors and warnings by sheet; on-order reconciliation | "Can the data be relied on, and what must be fixed?" | `dq`, `recon`, `po` | Fix source data | Data confidence | **Settings & Data** |
| 14 | Client questions | Questions generated from discrepancies, with evidence | "What must we ask the business?" | `dq`, `recon` and others | Consultant follow-up | Data quality | **Settings & Data** (and the report) |
| 15 | Data confidence | Rating per area, with what would raise it | "How much weight can each result bear?" | Confidence areas, `cov` | How far to rely on results | Data quality | **Shown everywhere** as a provenance badge, with detail in **Settings & Data** |
| 16 | Summary | Management summary: prioritised recommendations, financial effect, confidence | "What should management do?" | Aggregates of the above | Executive action | Overview | **Scenarios & Recommendations** (and the export/report) |
| 17 | Settings | Every threshold with its default, reason and effect; fixed rules | "How was this calculated?" | `CFG` | Adjust assumptions | none | **Settings & Data** |

**Findings:**
- The 17 tabs follow the calculation modules, not decisions. Four pairs overlap heavily: Finished goods/Materials, Policy comparison/Reorder policy, Forecast accuracy/Demand forecast, and Data quality/Data confidence/Client questions.
- Provenance and data-quality caveats are rich but scattered. Each tab carries its own notes, for example the FG production-time caveat and the X1 partial-total notes.
- Only one chart exists: a custom inline SVG in Demand forecast. Everything else is a table or a card.

## B. Recommended navigation

The proposed six areas are sound, with three adjustments.

1. **Overview**: health score, value, top risks, top-five actions, data-confidence summary.
2. **Inventory**: FG and materials in **one** item explorer with a type filter (merges tabs 3 and 4 and the item list of 2); a stock-health view; Excess & dead stock.
3. **Demand & Planning**: Demand forecast and Forecast accuracy as two views of one SKU; Reorder policy and Policy comparison merged into "Stock policy".
4. **Procurement & Suppliers**: MRP ("what to buy"), open POs/reconciliation, supplier scorecards.
5. **Production** (shown only when the workbook has production orders or a BOM): feasibility and attainment.
6. **Scenarios & Recommendations**: the Summary's prioritised actions now; the M5 scenario comparison later. Stage 3B builds only the recommendations view; scenarios stay M5 scope.
7. **Settings & Data** (secondary, in the menu or a gear icon): settings and thresholds, data quality, client questions and data-confidence detail; import later.

Exports and the report stay available from each area and from Settings & Data.

**Why this suits smaller businesses:**
- Six or seven entries instead of 17. Each answers one question.
- **Production hides itself** for distributors and wholesalers. This matches the roadmap's support order: manufacturers first, distributors second.
- A non-manufacturer then sees five areas.
- Terms are business language: "What to buy", not "MRP".

## C. Visualisation architecture

The layering rule is that **charts never calculate**.

```
workbook ─► excel-import / Universal Import ─► analyse() (calculations.js, forecasting.js)  [UNCHANGED, tested]
                                                   │ frozen result via CGEngine.runEngine()
                                                   ▼
                                  view-models  (js/views/*.js)  — pure functions: result → data contract
                                                   │ (selection, sorting, labelling, unit formatting ONLY)
                                                   ▼
                               components (js/ui/*.js) — KPI card, chart, table, alert, recommendation
                                                   ▼
                                            DOM (index.html shell)
```

**Rules:**
- **View-models select, they do not compute.** They may filter, sort, group for display and format numbers. They may **not** derive a business metric. If a needed figure does not exist in the engine result, it is added to the engine under the calculation-layer rules (tested, reconciled), never in a view-model or a chart.
  - Allowed: counting items in a class, and summing values the engine already provides, **only** when the result is shown with the engine's X1 partial-total status.
  - Recommended: even those sums come from the engine, so totals match the existing tabs exactly.
- **Data contract.** One shape for every visualisation:

```
{ id, title, question,                       // what business question it answers
  kind: 'kpi'|'bar'|'line'|'table'|'alert'|'recommendation',
  series|rows|value,                         // the numbers, all taken from the engine result
  unit: '£'|'units'|'days'|'%',
  provenance: { source: 'calculated'|'workbook'|'estimated'|'simulated', basis: '<plain text>', fields: ['R.fg[].cov', …] },
  completeness: { status: 'complete'|'partial'|'unavailable', included, excluded, reasons: [...] },   // from X1 (cov, x1Sum)
  confidence: { rating: 'High'|'Medium'|'Low'|'Not assessed', why },                              // from Data confidence
  drill: { target: '<area/view>', filter: {...} } }
```

- **Provenance and quality on screen.** Every KPI, chart and table header carries:
  - a small source badge (calculated / workbook / estimated / simulated);
  - a completeness marker. "Partial: 97 of 100 items" uses the X1 wording. "Unavailable" is shown, never a zero, following X1 and D4.
  - a confidence chip.
  - The SIMULATED / demonstration banner is kept on every page.
- **Drill-down.** Every KPI and chart element opens the filtered item explorer or table behind it. For example: "Potential excess £106,934" opens Inventory, Excess, filtered to classes in excess. The table is the same engine data as the chart, so the two always agree.
- **Consistency.** One component library and one colour/scale system. The risk classes and their order have one definition, taken from the engine strings.
- **Contract tests.**
  - Every view-model has a test proving each number equals the engine field it names, on Northstar, faulty Northstar and Willow.
  - Every chart is tested to render the contract's values (see G, phase acceptance).

## D. Visual design direction

The starting point is the approved Chain Genius identity:
- dark navy navigation rail or top bar;
- white and light-grey workspace;
- forest-green accents;
- clear KPI cards, analytical charts and useful alerts;
- industrial or logistics imagery used sparingly (the hero image on Overview only).

**For smaller and non-manufacturing businesses:**
- Keep imagery optional and light.
- Lead each area with three or four KPIs and **one** chart, with detail behind drill-down.
- Avoid dense multi-chart dashboards on phones.

**Status colours:**
- Status colours must stay distinct from the brand green: green for "good" status needs a different hue or an icon pairing.
- Status is never shown by colour alone; always add a label or icon.
- Keep the existing WCAG AA contrast work, light and dark mode, and print styles.
- The current `--a:#0f4c81` blue accent would move to navy and forest green **in the design-system phase only**.

## E. Development sequence

The proposed order is right, with one change: **the view-model and contract layer comes before any visual work**.

0. **Foundations (no visible change):** view-model layer, data contract, contract tests, the "charts never calculate" rule; the X1 completeness and confidence wiring.
1. **Design system and navigation shell:** tokens, components, the six-area navigation. All 17 existing tabs remain reachable, mapped under the new areas, so nothing is lost while dashboards are built.
2. **Inventory dashboard (reference implementation):** item explorer, health and excess views, drill-down, provenance.
3. **Executive Overview**, built from proven components.
4. **Demand & Planning, Procurement & Suppliers, Production** (Production conditional).
5. **Recommendations** (the Summary's actions with drill-down). Scenario comparison stays M5.
6. **Responsive, accessibility and final visual verification;** retire the old tab views only once every one of their facts is reachable in the new UI.

## F. Technical choices

- **Keep the existing modules.** The engine is plain browser JavaScript with no build step, protected by behaviour tests. No rewrite is needed. New `js/views/` and `js/ui/` files sit beside it.
- **Framework or build system:** not needed. Plain ES modules or classic scripts plus template functions (as today) are enough for six areas. A framework would add a build step the owner cannot easily maintain from a phone, and new dependencies.
- **Charting library** (free, licence-checked before adoption; none installed now). Licences and sizes must be re-verified at adoption time:
  - **Chart.js (MIT):** canvas, responsive, about 200 KB minified, mature, works without a build step. **Recommended**, with a thin wrapper so it could be swapped.
  - uPlot (MIT): very small and fast, for long time series; less suited to bar and mixed charts.
  - Apache ECharts (Apache 2.0): very capable but large (around 1 MB without a custom build).
  - Hand-written SVG (as today): no dependency, but slow to build and test for many chart types.
  - Vendor the chosen file into `assets/` with its licence, as is already done for SheetJS: no CDN, so the app keeps working offline and data stays local.
- **Android and mobile:**
  - Phone-first layouts at 360–412 px, with one chart per screen and tables as cards or paged lists (the existing 50-row paging).
  - Canvas charts with decimation for long series.
  - Performance budget: analysis under 2 s on Northstar-scale data, as today; first dashboard paint under 1 s after analysis; no layout shift.
  - Test in Chrome emulation in CI, and **physical testing on the owner's Galaxy S24 at each phase gate**. Emulation is not claimed as device testing.
- **Desktop and tablet:** a two- or three-column grid from 768 px and 1200 px, with persistent navigation on wide screens.
- **Safe preview** (no effect on the live GitHub Pages site, which deploys from `main`):
  - the existing **Cloudflare Pages preview** of `development/v0.7`, restricted by Cloudflare Access to the owner;
  - a feature branch's own Cloudflare preview;
  - a temporary test repository, as used for X1;
  - local `file://` or a simple local server.
  - `main` stays untouched until a separate deployment approval.

## G. Implementation phases, acceptance criteria and effort

Each phase ends with:
- full tier green (0 FAIL, 0 ERROR) and the guard passing against the current baseline;
- new tests for new code;
- **no change to any engine output.** The golden snapshots, confidence snapshot, same-results test and tag6 class hashes stay identical.
- Chrome checks at 412 px and 1280 px with 0 console errors;
- the owner's physical Android check;
- one simple stage record.

| Phase | Deliverable | Acceptance criteria (in addition to the above) | Effort (Claude sessions; owner review time) |
|---|---|---|---|
| 0 Foundations | `js/views/` view-models for all 17 areas; data contract; contract tests | Every view-model number equals its engine field on 3 workbooks; a test fails if a view-model or component file contains an arithmetic aggregate outside the allowed list; old tabs untouched | 2–3 sessions; 1 h |
| 1 Design system and shell | Tokens (navy, forest green, greys, status colours); KPI, chart wrapper, table, alert and recommendation components; six-area navigation with every old tab still reachable | Contrast AA in light and dark; keyboard and screen-reader labels; the chart library vendored with its licence; no CDN; 17/17 old views reachable | 3–4 sessions; 2 h |
| 2 Inventory (reference) | Item explorer (FG and materials), health, excess and dead stock; drill-down; provenance, completeness and confidence badges | Every KPI and chart value equals the old tab's figure; partial totals show the X1 wording; "Not Assessed" never shown as zero; the FG production-time caveat visible | 3–4 sessions; 2 h |
| 3 Overview | Executive dashboard from proven components | Totals identical to the Overview and Summary tabs; drill-down to Inventory works | 2 sessions; 1 h |
| 4 Planning, Procurement, Production | Demand & Planning, Procurement & Suppliers, conditional Production | Forecast chart matches back-test values; Suppliers keep "Not Assessed — Insufficient Evidence"; Production hidden for workbooks without production data | 4–6 sessions; 3 h |
| 5 Recommendations | Prioritised actions with financial effect and confidence, drill-down | Same actions and values as Summary | 1–2 sessions; 1 h |
| 6 Responsive and accessibility | 360–1600 px; print; accessibility audit; retire old tab views | No horizontal scroll at 360 px; every fact from the old 17 tabs reachable (checklist); owner sign-off on device | 2–3 sessions; 2 h |

**Total:** about 17–24 Claude sessions and 12 owner hours. At 4–5 owner hours a week, that is roughly 3–5 weeks of elapsed time, depending on review speed.

## H. Risks, dependencies and unresolved decisions

- **Risk:** charts silently recalculating and disagreeing with the tested tables. *Mitigation:* view-model contract tests and the "no arithmetic" check.
- **Risk:** losing facts or caveats when 17 tabs become six areas. *Mitigation:* a facts checklist generated from today's tabs, and the old views stay until phase 6.
- **Risk:** mobile performance with many charts. *Mitigation:* one chart per screen, canvas, a performance budget in CI.
- **Dependency:** the next baseline tag. New tests from readiness and Stage 3B need acceptance before they are protected (decision register D-2).
- **Owner decisions** (also in the readiness decision register):
  - B-1: the six-area navigation;
  - B-2: the chart library;
  - B-3: whether old tab views stay available permanently (as an "advanced" view) or are retired;
  - B-4: the design tokens (exact navy and green values);
  - B-5: Stage 3B scope versus M5 scenarios.
