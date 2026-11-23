# SCIE – proposed navigation and screen structure (for review)

- **Status:** a proposal for the owner to review. It is not implemented, and no code has been changed.
- **Prepared:** 23 Nov 2026, against `development/v0.7` at `e0b261f`.
- **Source of truth:** every KPI, chart and table below names a figure that the current engine or a current tab already produces. Northstar values are quoted as examples. The few figures that are worked out inside tab code today are marked ◆ (see section 6). Anything not available today is in section 7, labelled as missing.

---

## 1. The structure at a glance

```
PRIMARY (six areas, in this order)
1 Overview
    1.1 Executive dashboard                 ← Overview tab
2 Inventory
    2.1 Stock position (products | materials) ← Finished goods tab, Materials tab
    2.2 Stock health & ABC                  ← Health tab
    2.3 Excess & dead stock                 ← Excess & dead stock tab
3 Demand & Planning
    3.1 Demand forecast                     ← Demand forecast tab
    3.2 Forecast accuracy                   ← Forecast accuracy tab
    3.3 Safety stock & reorder points       ← Reorder policy tab
4 Procurement & Suppliers
    4.1 What to buy (MRP)                   ← MRP tab
    4.2 Supplier performance                ← Suppliers tab (supplier part)
    4.3 On-order reconciliation             ← section of the Data quality tab (see 2.2)
5 Production   (shown only when the business has production: BOM, production history or production orders)
    5.1 Production feasibility              ← Production feasibility tab
    5.2 Schedule attainment                 ← section of the Suppliers tab (see 2.2)
6 Scenarios & Recommendations
    6.1 Recommendations & management summary ← Summary tab
    6.2 Policy & supply-source comparison   ← Policy comparison tab

UTILITY (outside the six areas: top bar or menu)
Reports           R.1 Management report (print / PDF)   R.2 Engine output workbook (Excel)
Data Management   D.1 Load workbook   D.2 Data quality ← Data quality tab   D.3 Client questions ← Client questions tab
                  D.4 Data confidence ← Data confidence tab
Settings          S.1 Thresholds & assumptions ← Settings tab
Advanced view     all 17 original tabs, unchanged
```

**Each of the 17 tabs has exactly one home:**
- Overview 1;
- Inventory 4;
- Demand & Planning 3;
- Procurement & Suppliers 2;
- Production 1;
- Scenarios & Recommendations 2;
- Data Management 3;
- Settings 1.

Total: 17.

## 2. Mapping and the reasons for it

### 2.1 Every tab

| # | Existing tab | New home | Why there |
|---|---|---|---|
| 1 | Overview | Overview › Executive dashboard | Same question ("where do we stand?") |
| 2 | Finished goods | Inventory › Stock position (products) | One item explorer with a products/materials switch. The two tabs share 18 of their columns |
| 3 | Materials | Inventory › Stock position (materials) | As above. The material-only columns (estimated use, products affected, exposed £/month) appear when "materials" is selected |
| 4 | Health | Inventory › Stock health & ABC | Item-level health and ABC are inventory analysis. The overall score also appears as one Overview KPI (a reference, not a second screen) |
| 5 | Excess & dead stock | Inventory › Excess & dead stock | Capital tied up in stock |
| 6 | Demand forecast | Demand & Planning › Demand forecast | |
| 7 | Forecast accuracy | Demand & Planning › Forecast accuracy | Kept separate from the forecast. One asks "is our old forecast any good?", the other "what will we sell?" They have different audiences, and both tables are wide |
| 8 | Reorder policy | Demand & Planning › Safety stock & reorder points | The policy is set from demand and lead time |
| 9 | Policy comparison | **Scenarios & Recommendations › Policy & supply-source comparison** | **A change from the Phase 0 map**, which put it under Demand & Planning. The tab re-runs the analysis under alternative assumptions: workbook vs calculated policy, and PO-verified vs recorded on-order. That is the one scenario-style capability the engine has today. It stays well short of the M5 scenario system (D-7) |
| 10 | MRP | Procurement & Suppliers › What to buy | "What, how much, by when" is a buying decision |
| 11 | Suppliers | Procurement & Suppliers › Supplier performance | |
| 12 | Production feasibility | Production › Production feasibility | Conditional area |
| 13 | Summary | Scenarios & Recommendations › Recommendations | Its prioritised recommendations are the area's core. Reports prints this same content and does not duplicate it |
| 14 | Data quality | Data Management › Data quality | |
| 15 | Client questions | Data Management › Client questions | Generated from data discrepancies, each with its evidence |
| 16 | Data confidence | Data Management › Data confidence | Its ratings also appear as a confidence badge on every screen |
| 17 | Settings | Settings › Thresholds & assumptions | |

### 2.2 Two sections that sit inside a tab but belong elsewhere (for review)

Each of these tabs has one home. One self-contained section inside it is proposed to move. The section is shown in one place only, not two.

| Section today | Inside tab | Proposed place | Reason | If not agreed |
|---|---|---|---|---|
| "Production schedule adherence and attainment (by SKU)" | Suppliers | Production › Schedule attainment | It measures the business's own production against plan, not suppliers. Hidden with Production for businesses without production | Stays in Supplier performance |
| "On-order reconciliation" and "Per-material reconciliation" | Data quality | Procurement › On-order reconciliation | It compares inventory "on order" with open POs (gap in units and £), which is a purchasing control. Data quality keeps a one-line link to it | Stays in Data quality |

The Advanced view keeps both sections exactly where they are today.

## 3. Cross-cutting behaviour (applies to every screen)

- **Provenance badges.** Every KPI, chart and table header shows:
  - its **source**: calculated, workbook, estimated (for example material usage, "ESTIMATED from BOM × units sold × (1 + scrap)"), or **simulated** (for example production feasibility when the workbook has no open orders);
  - its **completeness**: "partial: 144 of 150 items", using the X1 wording; "unavailable" with a reason; never a zero;
  - the **confidence rating** of the matching Data confidence area.
- **Item detail panel.** Clicking any item (in any table, top-risk list or chart bar) opens one panel with that item's figures from every screen:
  - stock position;
  - policy;
  - forecast and accuracy, for products;
  - supplier and MRP line, for materials;
  - excess class;
  - confidence and "why flagged".

  It only presents existing fields; it is not a new screen. It replaces jumping between 4–5 tabs.
- **Drill-down.** Every KPI opens the table behind it, already filtered. For example, "26 to order now" opens What to buy filtered to ORDER NOW.
- **Common filters**, all on fields that exist today:
  - risk class (`sev`);
  - item type (products/materials);
  - product family or material group (`grp`);
  - ABC/XYZ;
  - supplier;
  - confidence;
  - text search on item code or name.

  Filters persist while moving between subsections of the same area.
- **Dropdown behaviour.** On desktop and tablet, each area is a navigation entry with a dropdown of its subsections; the area name opens its first subsection. On phones (≤ 600 px), a bottom or menu sheet lists the areas, and the subsections appear as a horizontal tab strip at the top of the screen. There is one chart per screen width on phones.
- **Tables** keep today's 50-row paging on phones, with "Show more" and "Show all".
- **Advanced view link** on every screen: "See the original tab", which opens the matching Advanced tab.

---

## 4. The six areas in detail

KPI values are Northstar examples.

### 1. Overview

#### 1.1 Executive dashboard (← Overview tab)

- **Purpose:** a one-screen answer to "where do we stand and what is most urgent?"
- **KPIs:**
  - inventory value (`R.tot`, £2,533,596, partial status when items cannot be valued);
  - items analysed (150);
  - high or critical risk items;
  - potential excess value (`R.exV`);
  - shortage value (`R.shV`);
  - materials to order now (MRP);
  - high-risk suppliers;
  - high-severity data issues;
  - overall health ◆ (87.7);
  - data-confidence summary.
- **Charts:**
  - value by item type (`R.fgV`/`R.rmV`), bar;
  - value by product family (`R.fam`) and by material group (`R.rg`), horizontal bars, from the same data the tab draws as text bars today;
  - stock cover distribution (the tab's "Stock cover (available ÷ daily demand)" bands), column chart;
  - risk class mix (Critical/High/Medium/Low/Not Assessed), stacked bar.
- **Tables:** highest-risk products; highest-risk materials; supplier risk ranked by at-risk materials. These are the tab's three lists, each capped at its current length.
- **Notes kept:** top-10 concentration (`R.top10`, %); turnover ◆ (FG and materials); the "Measure | £ | Status" financial position table.
- **Interactions:** every KPI drills down; list rows open the item detail panel; supplier rows open Supplier performance filtered to that supplier.
- **Sub-sections:** none. A single page, with no dropdown.

### 2. Inventory

#### 2.1 Stock position (← Finished goods, Materials)

- **Purpose:** what each product or material holds, its cover, and whether it will run short.
- **KPIs:**
  - products or materials analysed (50 / 100);
  - items at high or critical risk;
  - value (`R.fgV` / `R.rmV`);
  - items with lead time from a fallback source (from the "LT source" column);
  - for materials, total exposed £/month.
- **Charts:**
  - cover in days by item against its reorder point, as a sorted bar of the 20 lowest-cover items (cover and ROP are both engine fields);
  - risk class by product family or material group, stacked bar.
- **Table:** the existing columns, in two groups.
  - **Core** (shown by default): item, risk, available, position, cover d, LT d, ROP (workbook), ROP (recommended), policy check, value.
  - **"More columns":** position cover, LT source and basis, safety stock (both policies), ROP Δ%, ABC/XYZ, confidence, why flagged, confidence basis.
  - For materials, add: estimated use per month (labelled *estimated*), products affected, exposed £/month.
- **Filters:** type switch (products/materials), risk, family/group, ABC/XYZ, policy check, LT source, confidence, search.
- **Interactions:** row → item detail panel; "Products affected" (materials) → the products list.
- **Kept note:** "Risk is driven by the WORKBOOK policy; both are shown", and the finished-goods production-time caveat. That caveat is protected by `test-h1-fglt-note-current`.

#### 2.2 Stock health & ABC (← Health)

- **Purpose:** how healthy the stock position is, and where the value concentrates.
- **KPIs:** overall health ◆ (simple average, with "of N scored items" when items are Not Assessed); counts per category (Excellent / Healthy / Monitor / At risk / Critical); items without a score.
- **Charts:**
  - health category distribution, bar;
  - ABC Pareto: % of annual value by class, with the cumulative % line (both already in the tab's ABC table) and the A ≤ 80% and B ≤ 95% thresholds as reference lines from `CFG`.
- **Tables:** lowest scores and highest scores (item, score, category, points lost); the ABC table, with its existing provisional-class note when items are Not Assessed.
- **Filters:** category, type, family/group, ABC class.
- **Interactions:** category bar → the filtered item list; row → item detail panel.

#### 2.3 Excess & dead stock (← Excess & dead stock)

- **Purpose:** capital tied up in stock the business does not need, and what to do about it.
- **KPIs:**
  - items listed (32);
  - uncommitted stock value;
  - physical stock value (negative on-hand items excluded);
  - potential excess value.

  These are the tab's own four cards, built on X1 partial totals.
- **Charts:** value by class (Excess / Slow-moving / Obsolete / No demand / Not Assessed), bar; months since last demand vs value, scatter, which shows "old and expensive" at a glance.
- **Table:** item, description, uncommitted, stock detail (physical · allocated · usable), value, months since demand, cover d, class, potential excess, action.
- **Filters:** class, type, family/group, action.
- **Kept rules:** A2 (Not Assessed when the allocation is unknown), B1 (the stock-detail wording), the "negative on-hand recorded" flag.

### 3. Demand & Planning

#### 3.1 Demand forecast (← Demand forecast)

- **Purpose:** what demand to plan for, per product, and how sure that is.
- **KPIs:** units sold in the last 12 months ◆ (76,691); forecast for the next 3, 6 and 12 months ◆; products forecast (of 50); products with fewer than 6 months of history (not forecast).
- **Charts:**
  - **product forecast chart:** history (calendar months, with unknown months as gaps under D6), forecast, and the 80% range band. This is the tab's only chart today, moved to Chart.js;
  - **method comparison:** back-test WAPE by method, bar, with the chosen method marked.
- **Table:** all products, with SKU, method, last 12m, next 3/6/12m, trend, 3m range, uncertainty, existing forecast WAPE, best method WAPE, confidence, recommendation, basis.
- **Filters:** product (the existing selector), method, trend, confidence, family.
- **Interactions:** table row → loads that product into the chart; "recommendation" → the item detail panel.
- **Kept notes:** "Not guaranteed; accuracy is measured only by back-testing"; the under-24-months seasonality note.

#### 3.2 Forecast accuracy (← Forecast accuracy)

- **Purpose:** whether the business's existing forecasts can be trusted, and where they are biased.
- **KPIs:** the tab's four cards:
  - average accuracy ◆ (90.9%, 50 assessable products);
  - over / under / balanced bias, ±10% band (2/3/45);
  - data quality adequate / limited / insufficient (47/3/0);
  - confidence high / medium / low (0/17/33).

  When the workbook has no Forecast_Units, the screen shows "unavailable" and nothing is inferred (Willow).
- **Charts:** WAPE by product, sorted bar, coloured by verdict; bias in units, a diverging bar (over vs under).
- **Tables:** the product assessment table (forecast performance, data quality, confidence, assessment) and the detailed table (accuracy, WAPE, bias %, units, £ at cost, existing vs best method, verdict, periods, gaps, outliers, confidence, why, finding, workbook note).
- **Filters:** verdict, bias direction, data quality, confidence.
- **Kept rules:** the confidence explanation (level shift; MAD = 0 note, protected by the restored tests); "Workbook notes are read, not used in any calculation".

#### 3.3 Safety stock & reorder points (← Reorder policy)

- **Purpose:** whether each item's reorder point and safety stock are right.
- **KPIs:** items whose ROP is insufficient, possibly excessive or aligned (the tab's filter groups); items with no verdict.
- **Charts:** workbook ROP vs calculated ROP, a paired bar for the 20 largest Δ%; verdict mix, bar.
- **Table:** item, d/day, σ monthly, LT d, LT source, σLT d, SS workbook, SS calculated, ROP workbook, ROP calculated, Δ%, verdict, why.
- **Filters:** the existing All / Insufficient / Possibly excessive / Aligned buttons, plus type, family and LT source.
- **Kept note:** the formula basis (z, LT, σd, σLT) and the service-level setting, linked to Settings.

### 4. Procurement & Suppliers

#### 4.1 What to buy (← MRP)

- **Purpose:** what must be ordered, how much and by when.
- **KPIs:** order now (26, PO-verified supply); materials with a net requirement (96); total suggested order value ◆; Not Assessed lines.
- **Charts:** materials by status (Not Assessed / ORDER NOW / Order soon / Plan / Covered), bar; suggested order value by supplier, bar (`sup` on each material).
- **Table:** material, status, available, receipts (POs), gross requirement, safety, net requirement, MOQ, suggested quantity, £, stock-out, order by, net with the other supply source, affects.
- **Filters:** status, supplier, material group, "order by" within 7, 14 or 30 days (a comparison of existing dates, not a calculation).
- **Interactions:** "Affects" → the products using that material; row → item detail panel.

#### 4.2 Supplier performance (← Suppliers, supplier part)

- **Purpose:** which suppliers put supply at risk, and on what evidence.
- **KPIs:** high-risk suppliers; suppliers Not Assessed (Insufficient Evidence); POs scored; materials at risk via suppliers.
- **Charts:** score by supplier, sorted bar, coloured by risk class; on-time % against fill %, scatter (one dot per supplier); stated vs observed lead time, paired bar.
- **Table:** the existing scorecard: risk rank, score rank, supplier, score, risk class, evidence, assessment, POs scored, on-time %, delayed, short, outstanding, average days late, stated/observed LT, LT σ, fill %, over-delivered units/lines, materials, at-risk materials.
- **Filters:** risk class, assessment (Not Assessed), supplier-score mode (the existing setting, linked to Settings).
- **Kept rules:** the score formula note; "Not Assessed — Insufficient Evidence" (protected by `test-h3-supplier-eligibility-current`).

#### 4.3 On-order reconciliation (← section of Data quality; see 2.2)

- **Purpose:** whether the "on order" quantities in inventory are backed by real purchase orders.
- **KPIs:** the measures in the tab's reconciliation table (inventory on-order vs PO outstanding at the snapshot, gap in units and £, materials with no PO on file).
- **Chart:** gap £ by material, the largest 15, diverging bar.
- **Table:** material, inventory on-order, PO outstanding at the snapshot, gap, gap £, POs on file.
- **Filters:** gap sign (over/under), materials with no PO.

### 5. Production (conditional)

The area is shown when the workbook has a BOM, production history or production orders. Every current test workbook has these. A real business without production becomes possible once B14 (wholesale/resale) is decided.

#### 5.1 Production feasibility (← Production feasibility)

- **Purpose:** whether the planned production can be built, and what is blocking it.
- **KPIs:** orders by status (Feasible / Feasible with incoming materials / At risk / Material shortage / Insufficient information); orders materially delayed.
- **The SIMULATED banner** stays prominent when the workbook has no open orders, as it does on Northstar today.
- **Charts:** orders by status, bar; blocking materials ranked by the number of orders they block, bar.
- **Table:** order, SKU, quantity, start, status, materially delayed, blocking materials (short quantity, available), confidence, basis.
- **Filters:** status, SKU, blocking material.
- **Interactions:** blocking material → its MRP line in What to buy.

#### 5.2 Schedule attainment (← section of Suppliers; see 2.2)

- **Purpose:** how reliably the business produces to plan.
- **KPIs:** the tab's cards: production orders (150, all with valid quantities); total planned quantity (17,225); total actual quantity (16,643); average order attainment (96.6%); overall weighted attainment (96.6%).
- **Charts:** attainment % by SKU (the top 12, as the tab shows today, with "show all"), bar; average slip in days, bar.
- **Table:** SKU, orders, orders used, planned, actual, average order attainment %, weighted attainment %, excluded, late orders, late %, evidence, average slip d.

### 6. Scenarios & Recommendations

#### 6.1 Recommendations & management summary (← Summary)

- **Purpose:** what management should do first, the financial effect, and how confident the advice is.
- **KPIs:** the four Summary cards: inventory value (workbook data); critical items (16, calculated); materials to order now (26, estimated, PO-verified supply); potential excess (£106,934, "estimated, not a saving").
- **Recommendation cards** (the tab's table, as cards): priority, recommendation, reason and financial effect ◆, suggested action, confidence. Each card links to the screen that holds its evidence.
- **Limitations** block, kept as today.
- **Interactions:** "Print / save as PDF" moves to Reports › Management report. The same content is printed, not a second copy.

#### 6.2 Policy & supply-source comparison (← Policy comparison)

- **Purpose:** how much the risk picture depends on two assumptions: the safety-stock policy (workbook vs calculated) and the on-order source (PO-verified vs recorded).
- **KPIs:** items whose risk class changes between the two policies; items whose class changes with the supply source.
- **Charts:** risk class under each policy, a paired stacked bar; class changes, a "from → to" matrix of counts.
- **Tables:** policy comparison (item, workbook policy, calculated policy, effect, safety wb→calc, ROP wb→calc, available cover, lead time) and supply-source comparison (item, PO-verified, inventory on-order, verified→recorded, position cover).
- **Filters:** effect (worse / better / unchanged), type.
- **Not in scope (D-7):** saving, naming or comparing user-defined scenarios, which is M5. The screen says so in one line.

---

## 5. Utility areas (outside the six)

### Reports

| Sub-section | Purpose | Content (all existing) |
|---|---|---|
| R.1 Management report | A printable report for management or a client | The Summary content (6.1), printed through the browser ("Print / save as PDF"), with the SIMULATED/demonstration labelling. The Settings tab's "Print report" button points here |
| R.2 Engine output workbook | Results for spreadsheet users | "Export to Excel": `Chain_Genius_Engine_Output.xlsx` with the ten `ENG_` sheets (Assumptions, Attainment, Confidence, DataQuality, FG, Forecast, ForecastCredibility, POReconciliation, RM, Suppliers). Unknown values are written as empty cells (Tag-6 defect A fix) |

### Data Management

| Sub-section | Purpose | Content |
|---|---|---|
| D.1 Load workbook | Load or replace the workbook | The existing file picker and its status line. The list of required sheets is kept. Data stays on the device |
| D.2 Data quality (← Data quality tab) | What must be fixed in the source data | Errors / warnings / sheets-affected KPIs; issues by severity (bar); the issues table (severity, kind, sheet, issue, examples, suggested action), filtered by severity and sheet. The reconciliation section moves to 4.3 if agreed |
| D.3 Client questions (← Client questions tab) | What to ask the business | Priority, question, why we are asking, evidence; filter by priority |
| D.4 Data confidence (← Data confidence tab) | How much weight each result can bear | Rating meanings; confidence by area (area, rating, why, what would raise it). These ratings feed the badge on every screen |

### Settings

| Sub-section | Purpose | Content |
|---|---|---|
| S.1 Thresholds & assumptions (← Settings tab) | How results were calculated, and changing assumptions | The seven setting groups (Stock and demand; Safety stock and policy; Supply and lead times; Planning; Suppliers; Forecasting; Forecast credibility), each setting with its default, reason and effect; the fixed rules; Recalculate and Reset to defaults. Export and Print move to Reports, with links kept here |

### Advanced view

- All 17 tabs exactly as today, in today's order, with today's tab bar. This is also what the protected browser tests use.
- Each new screen links to its original tab, and each original tab links back to its new home.

---

## 6. ◆ Figures worked out inside tab code today

The approved architecture says charts and view-models never calculate. These figures are calculated inside the existing tab code:

| Figure | Tab |
|---|---|
| Overall health (simple average) | Health |
| Turnover (FG and materials) | Overview |
| Average forecast accuracy | Forecast accuracy |
| Units sold last 12 months; forecast for the next 3, 6 and 12 months | Demand forecast |
| One MRP total | MRP |
| The financial-effect totals | Summary |

**Proposal:** before the screens that show them, move each calculation unchanged into a shared, named function. The old tab and the new view-model then both call that function.
- Each move is proven by the old tab's HTML staying byte-identical (already checked by `test-view-contract`) and by the full tier.
- `calculations.js` and `forecasting.js` are not touched, and no result changes.

This is a refactor of presentation code, not a calculation change. It is flagged here because it touches `app.js`.

## 7. Genuinely missing (not available today)

| # | Missing | Why it matters | Needs | Proposal |
|---|---|---|---|---|
| M-1 | A per-purchase-order list (open POs, due dates, days late) | Buyers chase orders, not suppliers | The engine exposes only a PO summary and the reconciliation. Per-PO lateness is worked out inside supplier scoring but not returned | **Defer.** It needs a new engine output under the calculation-layer rules. It is not needed for Stage 3B |
| M-2 | Calendar month labels for the forecast horizon | A readable chart | An engine-provided label list (no date arithmetic in the view layer) | Phase 4, as already recorded (blueprint amendment A-3) |
| M-3 | The six ◆ figures available to view-models | The new screens need them | The refactor in section 6 | Do it before the screens that use them |
| M-4 | Saved, named and compared scenarios | Real what-if work | The M5 scenario engine | M5 (D-7). Not proposed for Stage 3B |
| M-5 | Column-mapping and import screens for other businesses' exports | Loading SAP/Sage/other exports without hand-made mapping files | The Universal Import UI (the core exists in `js/import/`; the screens were deferred) | Its own stage. Data Management D.1 leaves room for it |
| M-6 | A real non-production business to prove Production hiding | Distributors and wholesalers | The B14 decision (wholesale/resale items) | Hiding is already designed and tested synthetically |

**Deliberately not proposed:**
- Inventory or KPI trends over time. The workbook is a single snapshot, so there is no history to chart.
- A separate ABC/XYZ screen. It lives in Stock health & ABC and in the filters.
- A separate "products affected" screen. That is a link from materials.
- Per-supplier detail pages. The item detail panel and the filters cover that.

## 8. Changes this makes to earlier decisions and the Phase 0 code (for approval)

1. **"Settings & Data" becomes three utility areas: Reports, Data Management and Settings.** This matches your instruction. Phase 0's map has one secondary "Settings & Data" area, so the map and its test are updated in Phase 1.
2. **Policy comparison moves from Demand & Planning to Scenarios & Recommendations › 6.2.**
3. **Two sections move:** schedule attainment (Suppliers → Production 5.2) and on-order reconciliation (Data quality → Procurement 4.3). The Advanced view is unchanged in both cases.
4. **The ◆ figures move into shared functions** (section 6) before the screens that show them.

## 9. Decisions requested

| # | Question | Recommendation |
|---|---|---|
| N-1 | Approve the structure in section 1 and the mapping in section 2.1? | Yes |
| N-2 | Move Policy comparison into Scenarios & Recommendations (6.2)? | Yes: it is today's only assumption-comparison capability, and it gives that area real content without starting M5 |
| N-3 | Move the two embedded sections (2.2)? | Yes for both |
| N-4 | Approve the ◆ refactor approach (section 6)? | Yes: same results, proven byte-identical |
| N-5 | Keep Demand forecast and Forecast accuracy as separate sub-sections? | Yes |
| N-6 | Keep M-1 (a per-PO list) out of Stage 3B? | Yes |
