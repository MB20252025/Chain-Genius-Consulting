# Stage 3B Phase 3 – duplicate months, missing months and the global forecast boundary

Owner authorisation: "SCIE — Stage 3B Phase 3: Fresh Implementation, Verification and Completion" (25 Nov 2026),
rules A–F. Implemented from `bd61ae7` on `development/v0.7`. Not a release; no tag.

## 1. The rules as implemented

| Rule | What the engine does now | Where |
| --- | --- | --- |
| A Duplicates | Every row is kept. Rows for the same product and month form a group. The month uses the customer's valid decision, otherwise the **first row in import order** (a temporary default, stated as such). Rows are never summed, deleted or overwritten. | `calculations.js` `prepDemand` |
| B Resolution | Data Management › **Duplicates & gaps**: one card per group, every record side by side (differing columns first), the record in use marked, and three choices: *Use first row*, *Use this row*, *Exclude this month*. There are no bulk actions or notes. *Clear my decision* returns a month to review. | `areas.js` section, `screens.js` `duplicates`, `shell.js` |
| C Persistence | Browser storage key `scie.duplicateDecisions.v1`, keyed by **dataset fingerprint** (products, materials, suppliers: id and name) then `product|YYYY-MM`. Each decision stores the group fingerprint (product, month, the sorted fingerprints of every record's full contents) and, for a chosen record, that record's own fingerprint. | `engine-api.js` `duplicates`, `prepDemand` |
| D Missing months | The calendar runs from the first to the last month anywhere in the workbook, with **no month skipped** (also months no product records). A missing month is `null`, never 0; a recorded 0 stays 0. Charts and Data Management show gaps. | `prepDemand`, `analyse` |
| E Boundary | The last month with data anywhere is the global boundary (`R.boundary`). Every forecast starts at boundary + 1 (`F.start`). | `prepDemand`, `forecasting.js` `fcast` |
| F Trailing gaps | A gap never refuses a forecast. Missing months at the end are counted (`F.trail`), stated in a reliability warning, widen the band and lower confidence one level. A method is unavailable only when its own needs are not met, and the reason is given (`F.na`). | `fcast` |

**When a decision stops applying.** A decision applies while the group still holds exactly the same records, in any
order (reordering keeps it). The month returns for review, with the reason shown, when:

- a value in the records changes;
- a record is added or removed ("2 when you decided, 3 now");
- the chosen record cannot be found.

If the rows move to another product or month, they form a different group: it is reviewed afresh and the old
decision does not follow. **No decision is ever applied by row position.**

**Months and dates.** A `Month_Start` is read as the month of its nearest UTC day. A spreadsheet date read as local
midnight, up to ±12 hours from UTC (e.g. 1 Oct in UK summer time = 30 Sep 23:00 UTC), stays in its month. A day
other than the 1st is read as its month and reported (Low). A row without a valid date is not placed and is
reported (High).

## 2. Implementation map (one shared construction)

```
Demand History rows ──► prepDemand (calculations.js)
   months (continuous calendar), bySku (one row per product-month, decision applied), groups (R.dups), dsId, boundary
        │
        ├─► analyse(): FG h / hc / hd / fc, m, sg, cv, tr, accuracy pairs, gap info ──► ABC, safety stock, ROP, health,
        │                                                                           dead stock, Overview, Summary
        ├─► materials: BOM-exploded calendar usage (use[k]) ──► RM m, mPart, sg ──► MRP, cover, policy
        ├─► forecasting.js fcast (x.hc on calendar positions) ──► fcAll ──► Demand forecast, accuracy, CGShared fcSum
        └─► charts: app.js chart(), contract.js timeline (history by month, forecast after the boundary)
```

No screen or later calculation interprets the demand rows again: every consumer reads `prepDemand`'s output.

## 3. Calculation audit

| Site | Verdict | Note |
| --- | --- | --- |
| FG history `h`, `hc`, `hd`, `fc` | ADAPTED | One row per month (decision or first row); calendar from `prepDemand`. Duplicates no longer double-count. |
| FG recent demand `m` | ADAPTED | Mean of the usable months in the last `CFG.basis` **calendar** months. If none are usable, it is null and a DQ note is added (older months are not used as recent). Gap-free data is unchanged. |
| FG trend ratio `tr` (slow-moving rule) | ADAPTED | Last 3 calendar months against the months before them (usable ones only). |
| FG `sg`, `cv`, `annual` | SAFE | Order-free over observed months; a missing month is not a zero. |
| FG accuracy `bias`, `mae`, `wape`, `fcu` | SAFE | Row-paired (forecast and actual on the same row); duplicates resolved first. |
| Dead stock `msl` | SAFE | Counts recorded months after the last sale; missing months are unknown, not counted as no-sale. |
| Material usage `use[k]`, RM `hc`, `m`, `mPart` | ADAPTED | Inherit the resolved product months; recent average on the calendar window, as for FG. |
| ABC, safety stock, ROP, cover, MRP, health | SAFE | Consume `m`, `sg`, `annual` above; no own reading of demand rows. |
| Forecast: mean | SAFE | Order-free. |
| Forecast: ma3, wma3, ma6 | ADAPTED | Need the 3 or 6 calendar months before the target all recorded; otherwise unavailable, with the reason. |
| Forecast: trend | ADAPTED | Least squares on calendar positions. |
| Forecast: seasonal (experimental) | ADAPTED | Month of year from the calendar. |
| Forecast: back-test | ADAPTED | Targets are the last observations, as before. A target is skipped when a method cannot be tested there, so every method is scored on the same months; skips are stated. |
| Band, uncertainty, confidence, `act12`, trend t-test | ADAPTED | The band grows with the distance from the last recorded month. `act12` and `mu` use the last 12 calendar months. Confidence is one level lower with missing months at the end. |
| Forecast credibility `fcCred`: missing count | SAFE | Expected = the continuous calendar, so a month missing from the whole workbook is now counted as missing (correct). |
| Forecast credibility outlier / level-shift adjacency | **UNSUITABLE (narrow)** | "Consecutive extreme months" means consecutive *recorded* months, so two extremes either side of a gap count as adjacent. Not changed: this is the protected level-shift rule (`test-h2-level-shift-spec`). Recommended for Stage 3C. |
| CGShared S1–S15 | SAFE | Proven unchanged: S1–S10 3,334 values, S11 240, S12–S15 17,168; 0 failures. |
| Original chart, new timeline | ADAPTED | History by month (gaps visible); forecast after the boundary; a duplicate's default is stated on the chart. |
| Croston, SBA, TSB, Holt-Winters, LightGBM, MASE | NOT PRESENT | Stage 3C (not started). |

## 4. Minimum history per method (what each actually needs)

| Method | Minimum | Why |
| --- | --- | --- |
| mean | 3 usable months | An average of fewer is not a level estimate. Unchanged from bd61ae7 (`FMIN`). |
| ma3 / wma3 | 3 usable months **and** the 3 calendar months before the forecast start recorded | The method is defined on those exact months. Averaging across a gap would be a different method. |
| ma6 | 6 usable months **and** the 6 months before the start recorded | As above. |
| trend | 6 usable months | Two parameters plus enough residual degrees of freedom; unchanged. |
| seasonal | 24 usable months and a detected pattern | Two cycles to estimate 12 indices; unchanged. |
| any forecast | 6 usable months (the existing product gate, kept) | It leaves at least one back-test month. **Owner question:** rule F says no arbitrary cut-off. This gate is pre-existing and was kept unchanged; lowering it is a separate decision. |

## 5. Persistence limits (documented, not hidden)

- Decisions live in this browser only. They are not shared across browsers or devices, and clearing the site
  data loses them.
- When storage is blocked, decisions last until the page closes, and the screen says so (`storageOK()`).
- The dataset fingerprint changes whenever a product, material or supplier id or name changes. All decisions for that
  workbook then return to review; this is conservative by design.
- Two records with identical contents cannot be told apart. Either choice gives the same value.

## 6. Evidence

- Tests:
  - `tests/test-phase3-demand-calendar.js` (89 checks) builds its expected results independently: hand-written
    calendars, workbooks keeping only the chosen row, and trend/mean/band recomputed.
  - `tests/browser-phase3-chrome.js` (34 checks, desktop and Pixel 5 emulation).
  - `tests/test-view-contract.js` §9 rewritten.
- Fixture: `tests/fixtures/phase3/` (synthetic, derived from Northstar).
- Gap-free proof: `baseline-bd61ae7/` holds byte-identical copies of the bd61ae7 engine. Every gap-free workbook
  gives identical product, material and forecast values (Northstar, ns-x1-faults, the library fixtures). The
  5,000-item workbook was checked separately with `/tmp/cmp-engine.js` (session evidence).
- Proof outputs `s1-s10.json`, `s11.json`, `s12-s15.json` (this folder).
