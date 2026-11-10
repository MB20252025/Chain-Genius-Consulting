# Inventory Intelligence Engine v0.5 – QA report

Test data: Chain_Genius_Project_001_Northstar_Dataset_1.xlsx (fictional, self-declared synthetic).

## Starting state (audited before any change)
None of the five improvements existed. Baseline was healthy: 108/108 unit checks, 29/29 DOM checks.

## The five improvements
| # | Improvement | Status | What it does |
|---|---|---|---|
| 1 | Production attainment | Done | Shows average order attainment (mean of each order's actual ÷ planned) and overall weighted attainment (total actual ÷ total planned), with order counts, total planned, total actual and an Excluded count. Zero or missing planned quantity, or missing completed quantity, is excluded and counted, never treated as zero. A genuine 0 completed is counted. "Show all SKUs" toggle. |
| 2 | Supplier risk ranking | Done | Overview panel and Suppliers tab rank by at-risk materials (desc), then supplier score (asc), then id. Shows class, score, at-risk, materials supplied, share at risk. Score formula and classes unchanged. |
| 3 | Lead-time transparency | Done | Every lead time carries a source label: Supplied / Calculated / Estimated (limited sample) / Assumed (default setting), plus a basis text (method, number of orders or POs, date range, exclusions). A Products lead-time column is detected generically and labelled Supplied. |
| 4 | Forecast credibility | Done | Forecast accuracy tab separates forecast performance, data quality and confidence in the information. Flags unusually high accuracy (threshold in Settings, default 95%) without calling it a problem; dataset-level warning when 50%+ of products exceed it. Bias shown with direction, size, units and £; consistent vs inconsistent bias. Data-quality checks: periods, missing periods, zero demand, isolated outliers (separate from level shifts), forecast gaps. Workbook self-description and notes are read from the file, shown, and not used in any calculation. |
| 5 | PO reconciliation | Done | Snapshot-aware classification of every PO: open, future-dated receipt, received (excluded), ordered after snapshot, cancelled, unclassifiable. Six outputs plus status and a neutral explanation. |

## Files modified
js/calculations.js, js/forecasting.js, js/app.js, js/excel-import.js, index.html (version label and cache-busting), README.md. css/styles.css and assets unchanged. Export adds sheets ENG_Attainment, ENG_POReconciliation, ENG_ForecastCredibility and extra columns.

## Calculations changed (with evidence)
- Attainment: new second measure. FG048: 3 orders, 398 of 425 units; average of orders 92.8%, weighted 93.6%.
- Forecast accuracy/bias: missing forecasts were previously treated as zero (`fc[i]||0`). Now only periods with both values are used. Test: removing 3 forecasts changes WAPE by more than 5 points under the old method. Northstar numbers are unchanged (no missing values).
- FG lead time: orders with missing or invalid dates are excluded (previously could produce NaN). Northstar values unchanged.
- Material lead time: fallback chain if Materials lead time is missing (supplier standard, then supplier PO history, then default setting), each labelled.
- PO outstanding: cancelled POs excluded; "Received" with no date treated as received and counted as undated. Northstar outputs unchanged.
- Not changed (verified identical before and after on Northstar): inventory valuation, safety stock, reorder points, MRP net requirements and MOQ rounding, supplier scores, forecasts, feasibility, ABC/XYZ, health scores, confidence.

## Tests performed and results
| Suite | Result |
|---|---|
| New edge cases for all five tasks (zero/missing quantities, statuses, missing dates, missing forecasts, renamed IDs, no notes sheets, HTML injection, empty sheets) | 47/47 |
| Original unit suite | 108/108 |
| Independent Python recalculation from the raw workbook | 17/17 |
| DOM test of new screens (real clicks, settings, toggle, export contents) | 18/18 |
| Original DOM suite | 29/29 |
| Regression snapshot vs pre-change (150 items, 100 MRP rows, 50 forecasts, 15 suppliers, 50 feasibility rows) | all 10 sections identical |
| Hardcode scan (SKU, material, supplier, PO ids, company name) in app code | 0 matches |
| Speed | about 35 ms per full analysis on Northstar |

Independently verified from the source workbook: attainment for all 50 SKUs; supplier scores, at-risk counts and ranking for all 15 suppliers (SUP008: 4 at-risk, score 60.4, rank 1 by risk, rank 8 by score); FG lead times, order counts and date ranges for all 50 SKUs; forecast accuracy, bias, direction, outliers, data quality, confidence and finding for all 50 SKUs (45 of 50 within 94–98% accuracy; 31 of 50 at 95% or more); PO categories and the 32,334-unit gap (inventory 32,634; verified supply 300 in 4 future-dated POs; 296 POs received before the snapshot).

Defects found by testing and fixed during this work: zero-demand products were labelled "Poor" instead of "Cannot assess"; reconciliation status gave a wrong label when POs exceeded inventory or totals matched with offsetting material differences; the SIMULATED label was briefly softened; the outlier rule flagged a genuine demand level shift as bad data.

## Found outside the five tasks
Fixed (text only, no calculation): hardcoded company name in the Summary heading; hardcoded "all 150 are complete"; hardcoded "every item sells every month"; stale "no forecast yet" limitation text.
Not fixed: suppliers with no PO received by the snapshot are omitted from supplier tables and their materials are not counted in at-risk (not triggered by Northstar).

## Limitations and outstanding
- Not tested in real Chrome or on Android. Browser tests used a simulated DOM (jsdom).
- Not tested on large workbooks, .xls files, or any real client data. Only Northstar and in-memory variants of it.
- The independent Python check implements the same definitions as the app. It proves the code does what the specification says, not that the definitions are right.
- Heuristics are judgement calls: 95% high-accuracy threshold, ±10% bias band, outlier rule (robust z above 3.5), 75% bias consistency, confidence points, 5 and 30 sample sizes for lead times.
- At-risk materials depend on the policy and supply-source settings.
- Open POs: partial-receipt dates are unknown, so ordered quantity is treated as outstanding at the snapshot.
- MRP still holds demand flat; forecasts are not fed into it.
- The Northstar reconciliation gap is shown as a difference between two records. The data cannot say why.

## Installation (GitHub Pages)
1. Unzip. Replace the folder `applications/inventory-intelligence-engine/` in your repository with the new folder contents.
2. Entry point: `index.html`. Keep this structure: `css/styles.css`, `js/` (4 files), `assets/xlsx.mini.min.js`.
3. Commit. Wait about a minute, then hard-refresh. Script links carry `?v=0.5` so old cached files are not reused.
4. Open `https://<your-user>.github.io/<repo>/applications/inventory-intelligence-engine/`.

## Readiness
- Internal testing: ready.
- Portfolio demonstrations: ready, with the simulated labelling kept visible.
- Prospective client demonstrations: usable as a guided diagnostic walkthrough, if the heuristics and the on-order question are explained and it is first tried on a phone.
- Real business use: not ready. Untested on real data and real devices, with judgement-based thresholds and one known omission (suppliers with no received POs).
