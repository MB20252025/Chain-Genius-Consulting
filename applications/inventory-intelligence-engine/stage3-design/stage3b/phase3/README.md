# Stage 3B Phase 3 – duplicate months, missing months and the global forecast boundary

Owner authorisation: "SCIE — Stage 3B Phase 3: Fresh Implementation, Verification and Completion" (25 Nov 2026),
rules A–F. Implemented from `bd61ae7` on `development/v0.7`. Not a release; no tag.

## 1. The rules as implemented

| Rule | What the engine does now | Where |
| --- | --- | --- |
| A Duplicates | Every row is kept. Rows for the same product and month form a group. The month uses the customer's valid decision, otherwise the **first row in import order** (a temporary default, stated as such). Rows are never summed, deleted or overwritten. | `calculations.js` `prepDemand` |
| B Resolution | Data Management › **Duplicates & gaps**: one card per group, every record side by side (differing columns first), the record in use marked, and three choices: *Use first row*, *Use this row*, *Exclude this month*. There are no bulk actions or notes. *Clear my decision* returns a month to review. | `areas.js` section, `screens.js` `duplicates`, `shell.js` |
| C Persistence | Browser storage key `scie.duplicateDecisions.v2` (the 25 Nov `…v1` is still read). Decisions are keyed by the **dataset identity** (the product, material and supplier *identifiers*; names are excluded since 27 Nov, so renames keep decisions), then `product|YYYY-MM`. Each decision stores the group fingerprint (product, month, the sorted fingerprints of every record's contents) and, for a chosen record, that record's own fingerprint. Decisions can be downloaded and loaded as a file (§5). | `engine-api.js` `duplicates`, `prepDemand` |
| D Missing months | The calendar runs from the first to the last month anywhere in the workbook, with **no month skipped** (also months no product records). A missing month is `null`, never 0; a recorded 0 stays 0. Charts and Data Management show gaps. | `prepDemand`, `analyse` |
| E Boundary | The last month with data anywhere is the global boundary (`R.boundary`). Every forecast starts at boundary + 1 (`F.start`). | `prepDemand`, `forecasting.js` `fcast` |
| F Trailing gaps | A gap never refuses a forecast. Missing months at the end are counted (`F.trail`), stated in a reliability warning, widen the band and lower confidence one level. Each method has its own minimum and every result states its reliability level (§4). | `fcast` |

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
| Forecast: back-test | ADAPTED | The compared methods are tested on the same months (the last observations, as before). If fewer than 3 shared test months remain (gaps, or 6–8 months of history), the method with the fewest testable months is left out of the comparison, repeatedly: it is calculated but untested and never chosen over a tested method. Gap-free series of 9+ months are unchanged. |
| Band, uncertainty, confidence, `act12`, trend t-test | ADAPTED | The band grows with the distance from the last recorded month. `act12` and `mu` use the last 12 calendar months. Confidence is one level lower with missing months at the end. |
| Forecast credibility `fcCred`: missing count | SAFE | Expected = the continuous calendar, so a month missing from the whole workbook is now counted as missing (correct). |
| Forecast credibility outlier / level-shift adjacency | **UNSUITABLE (narrow)** | "Consecutive extreme months" means consecutive *recorded* months, so two extremes either side of a gap count as adjacent. Not changed: this is the protected level-shift rule (`test-h2-level-shift-spec`). Recommended for Stage 3C. |
| CGShared S1–S15 | SAFE | Proven unchanged: S1–S10 3,334 values, S11 240, S12–S15 17,168; 0 failures. |
| Original chart, new timeline | ADAPTED | History by month (gaps visible); forecast after the boundary; a duplicate's default is stated on the chart. |
| Croston, SBA, TSB, Holt-Winters, LightGBM, MASE | NOT PRESENT | Stage 3C (not started). |

## 4. Minimum history per method (owner decision 27 Nov 2026; supersedes the single 6-month gate)

Each method has its own minimum, so no method is held back by another's needs. The strict windows (3 and 6 consecutive recorded calendar months for the moving averages; no partial-window averages) were confirmed by the owner on 27 Nov 2026 (AD-21).

**Gap warning.** It states the missing months, then names exactly the methods whose months just before the forecast start include a missing month ("… is/are not used, because …"), or says that no method is left out because of the gap. A product is forecast when at least one
method can calculate (3 usable months). Every result carries one of four levels, per method (`F.levels`) and for the
method used (`F.tier`, explained in plain English in `F.tierWhy`):

| Level | Meaning | Rule |
| --- | --- | --- |
| insufficient | cannot calculate | fewer usable months than the method needs (or its window includes a missing month) |
| calculable | calculated, accuracy unknown | no earlier month could be used to test it |
| limited | tested, too few months to judge | 1–2 back-test months |
| tested | meaningful back-test | 3–5 back-test months |
| comparable | reliable comparison between methods | 6+ back-test months, the same months for 2+ methods |

| Method | Calculate | Tested from (gap-free) | Comparable from (gap-free) | Why this minimum |
| --- | --- | --- | --- | --- |
| mean (average of all months) | 3 | 4 | 12 | With 2 months one unusual month is half the estimate; 3 is the smallest window the engine already treats as an average (ma3). |
| ma3 / wma3 | 3, and the 3 calendar months before the forecast start recorded | 4 | 12 | The method is defined on exactly those months; averaging across a gap would be a different method. |
| ma6 | 6, and the 6 months before the start recorded | 9 (at 6–8 it is calculated but left out of the comparison) | 12 | As above, for 6 months. |
| trend (straight line) | 6 | 9 (as ma6) | 12 | Two parameters plus residual error; below 6 points the fitted slope is usually less certain than the demand change it claims. Its 12-month extrapolation is the most exposed. The significance label needs 8. |
| seasonal (experimental) | 24 and a detected pattern | 27 (24–26: left out of the comparison) | 30 | Two full cycles to estimate 12 month-of-year indices. |

Back-test test months: the last min(6, n − largest minimum among the compared methods). With gap-free history:

| Usable months | Methods calculated | Compared (test months) | Level of the method used |
| --- | --- | --- | --- |
| 1–2 | none | – | not forecast ("fewer than 3 usable months") |
| 3 | mean, ma3, wma3 | 0 | calculable (the plain average is used) |
| 4–5 | mean, ma3, wma3 | 1–2 | limited |
| 6–8 | + ma6, trend (calculated, untested) | mean, ma3, wma3 on 3–5 | tested |
| 9–11 | all five | all five on 3–5 | tested |
| 12+ | all five (+ seasonal from 24) | 6 | comparable |

The results are unchanged from bd61ae7 for 9+ gap-free months (proven), except 24–26 months with a detected seasonal
pattern: there, seasonal used to leave every method with 0–2 test months, and it now sits out of the comparison instead.
For 3–8 months they change by design:
- 3–5 months are now forecast, at Low confidence, with an "only N usable months" warning.
- 6–8 months: the short methods are now tested instead of nobody being tested.

Confidence (High/Medium/Low) is unchanged: Low under 12 months, one level lower with missing months at the end.

## 5. Saved decisions: reliability (owner decision 27 Nov 2026)

**Essential improvements (implemented):**

| Concern | What happens now |
| --- | --- |
| Stable identification | Dataset identity = the sorted product, material and supplier identifiers. A decision is keyed by product identifier and calendar month, and validated by record fingerprints; never by row position. |
| Product / material / supplier renames | Names are not part of any identity or fingerprint used for decisions, so renaming keeps every decision (tested: product, material and supplier renamed together). |
| Changed workbooks | Adding or removing a product, material or supplier makes a different dataset: nothing is applied automatically (rule C isolation). The screen lists earlier decisions whose records match **exactly** ("Use them here"); adopting copies only those. |
| Changed records | Any changed value, added or removed record, or unidentifiable chosen record returns the month for review with the reason. A filled-in new column changes the records too (review). |
| Record fingerprints | Dates are compared by calendar day, so the fingerprint is the same in every time zone and browser (tested at ±5 h and ±11 h). Text ignores surrounding spaces, and an empty cell equals an absent column (tested). |
| Row reordering | Records are found by fingerprint, so reordering keeps decisions (tested). |
| Recovery after storage is cleared | "Download my decisions" produces a JSON decisions file (every dataset). "Load a decisions file" merges it back; the later date wins per decision. Malformed files are refused and change nothing; malformed entries are ignored. Imported decisions apply only where the records match exactly. |
| Earlier format | Decisions saved on 25 Nov (v1: names in the identity, timestamp fingerprints) are still recognised. The next save writes v2 and removes v1. |

**Limits that remain:**
- Decisions live in the browser until downloaded.
- Changing a product's *identifier* makes it a different product.
- Two identical records cannot be told apart (either gives the same value).
- When storage is blocked, decisions last only until the page closes (the screen says so).

**Future enhancements (designed, not implemented):**
1. **Decisions in the Engine output workbook.** *Recommended, Stage 3C or the next export change.*
   - Add a sheet "Duplicate decisions" with one row per duplicate month:
     - product, month, status (needs review / first row confirmed / other row chosen / excluded / decision no longer applies), the reason;
     - the value used and the sheet rows involved;
     - the decision date.
   - Add a final hidden cell holding the decisions file (JSON) for that dataset.
   - Re-loading the output workbook would then offer to restore decisions from it.
   - *Why not now:* the output workbook's sheets are covered by protected export tests (sheet lists, golden outputs, the repeat-export test). A new sheet is an expected-results change needing owner approval and, under the guard, a new baseline tag.
2. **Shared storage** (account or server-side) so decisions follow the user across devices. Needs an architecture decision (the tool is client-only today).
3. **Identifier changes:** an explicit "this product was renamed from X" mapping, so decisions follow an identifier change.

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

## 7. Stage 3C carry-forwards (recorded so they are not lost)

- **Level-shift adjacency (UNSUITABLE, narrow).**
  - *Problem:* forecast credibility (`fcCred`) treats "consecutive extreme months" as consecutive *recorded* months. Two extremes either side of a missing month therefore count as adjacent (a level shift instead of two outliers).
  - *Effect:* only forecast-assessment confidence, by at most one level. Accuracy and verdict are unaffected.
  - *Why not now:* it is the protected level-shift rule (`test-h2-level-shift-spec`), so changing it changes approved expected results. No evidence found of material harm meanwhile. Scheduled for Stage 3C with a gap case added to the spec test.
  - *Also recorded in:* KNOWN-LIMITATIONS 23 and backlog P-009.
- **Existing methods and gap safety, for Stage 3C:**
  - mean: SAFE.
  - ma3, wma3, ma6: windowed; not used where the window includes a gap.
  - trend and seasonal: calendar positions.
  - Back-test: common months, with the comparison-set rule.
  - Croston, SBA and TSB (intermittent demand) would need zero vs missing kept apart, which the calendar now provides (`hc` null vs 0).
  - Holt-Winters would need complete seasonal cycles, or explicit gap handling.
- **Comparison size at 27–29 seasonal months.**
  - *Behaviour:* when seasonal first qualifies for the back-test (27 months), every method is compared on 3 months rather than 6, the same as bd61ae7. One month earlier, without seasonal, they had 6.
  - *Proposal for Stage 3C:* compare on the larger shared set and test seasonal separately until it has 6 months.
  - *Status:* not changed now, because it would alter approved results for those lengths.
- **test7 line 124** (the superseded 6-month gate): replaced on 27 Nov 2026 by the owner-approved three-boundary test (2, 3 and 4 months, with method selection); test7 118 → 120.

