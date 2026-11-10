# Changelog

## v0.6 (candidate, awaiting owner acceptance)
Added: supplier completeness and "Not assessed" handling for suppliers with no delivery history; Confidence tab with plain-language reasons; Settings with 28 documented thresholds (default, why, what changes); clear fallback messages when a file cannot be read; sticky first column on mobile tables; snapshot-aware PO classification and supply-source modes.

Fixed in the final v0.6 pass:
1. **Failed import left the app inconsistent.** A rejected, unreadable or wrong-structure file replaced the stored workbook and file name while the screen still showed the earlier analysis; Recalculate then failed and Export mixed a wrong workbook ("Sheet1") with the old results. The previous workbook and name are now kept unless the new file is read and analysed, and the message says the previous analysis is unchanged. (js/excel-import.js)
2. **Dates depended on the computer's timezone.** SheetJS returns date cells at local midnight but the engine reads them as UTC. In UK summer time, displayed dates were a day early; in New York, Kolkata and Auckland some calculated outputs also differed from v0.5. Dates are now normalised to the same calendar date at UTC midnight when rows are read. Results for UTC and London are unchanged. (js/excel-import.js, rows())
3. **Two Settings descriptions said "As above".** Now self-contained wording (text only). (js/app.js)

Unchanged: all calculations, scoring formulas, colours, themes, styling and contrast (colour work deferred by the owner).

Not in v0.6: currency handling, units of measure, data contracts, SME demonstration dataset, modularisation (Stages C and D).

## v0.6 final verification pass (candidate, still awaiting owner approval)
Fixed:
4. **Contrast.** Measured every visible text element on all 17 tabs in light and dark. Failures were the small risk labels (Watch 2.38, High 2.85, OK 4.25 in light; Critical 2.97, OK 3.81 in dark) and white text on the dark-mode accent colour (header, active tab, Recalculate/Export/Reset buttons, 2.73). Only text colours were changed, in css/styles.css (appended block): light .s2 #e67e22 to #b45309, .s1 #d4a017 to #8a6500, .s0 #2e8b57 to #267a4d; dark .s3 to #ff7b6b, .s0 to #4cc38a, and dark text on the accent to #0b1220. Chart/line colours and layout are unchanged. Real-Chrome sampled minimum is now 4.97 (light) and 5.68 (dark). Two chart-legend line swatches (the dashed and dotted glyphs) stay below 4.5 because they mirror the chart line colours; they are non-text graphics and were left alone.
5. **Supplier-performance confidence ignored definite PO data faults.** With duplicate PO numbers or impossible quantities (High severity, Purchase Orders) the rating stayed High. It is now capped at Medium and the reason says so. Northstar is unaffected (still High). (js/app.js, confAreas)

Test-side change: tests/verify_sup.py now classifies raw materials by Materials-sheet membership, as the app does, instead of the Northstar label Item_Type == "Raw_Material" (labels vary between workbooks). All six original supplier scenarios still pass.

Added tests and tools: test-po-edge.js, test-structure.js, mkedge.js, mkstructure.js, verify_structure.py, run-edge-scenarios.sh, gen-large-workbook.js, perf-node.js, perf-chrome.js; fixtures/edge, fixtures/structure; ANDROID-TESTING.md.

Documented limitations (behaviour confirmed by test, not changed):
- Duplicate PO rows are flagged but not removed: exact duplicate PO numbers (High flag) and re-keyed duplicates (Medium "possible duplicate", may be a genuine repeat order) are still counted in supplier scores and outstanding quantities. Only the High case lowers confidence.
- Received above ordered is flagged High. (Candidate 3: fill is now capped per PO line and excess is reported separately.)
- The importer needs the eight sheet names and the documented column names. Sheet order, extra sheets, extra columns, column order, ID format, the Item_Type label and a missing Forecast_Units column are tolerated. Currency is assumed to be GBP (column names), units of measure are not converted.
- **Performance targets are NOT met at large sizes** (see tests/TEST-RECORD.md): time grows in line with item count; every row of the big tables is drawn at once.

Historical limitation (accepted only if the owner agrees): the Git repository from earlier sessions, with seven checkpoint commits, is not recoverable. No .git directory, bundle or pack exists in the project, either backup or the sandbox. The session transcript recorded the hashes and messages below; they are listed for reference only and no history was recreated. The current repository starts from one new commit.
2b8c913 Checkpoint 0: v0.6 pre-acceptance state; 2ad7f33 Fix tests/browser-chrome.js missing parenthesis, add APP_ROOT override; d5a5907 load @sparticuz/chromium with require; e45796f PDF check parses the real PDF; 4b38f8e Settings validation message box; 28f1024 performance step no longer overwrites global R, require 17 distinct tabs; 65791c6 contrast check flagged as visual check, --non-visual flag.

## v0.6 second verification pass (candidate 2, awaiting owner approval)
Changed (calculations, snapshots and exports are unchanged; all 10 v0.5 golden sections still identical):
6. **Paged tables.** Tables draw 200 rows at a time. Below the table: "Showing the first 200 of N rows. All N rows are used in the calculations and are included in the Excel export." with "Show 200 more" and "Show all N rows" buttons; the scroll position is kept. Nothing is dropped: R, every calculation, recommendation and the Excel export hold every record. Tables of 200 rows or fewer (all of Northstar) look exactly as before. (js/app.js, tbl())
7. **PO numbers are no longer wrongly called duplicates.** The importer treats the Purchase Orders sheet as line-level. One PO number may carry several lines. Now: whole-row copies are High "Duplicate records"; same PO number and material with different details is Medium (split delivery or entry error); one PO number with two suppliers is Medium; a PO number with lines for several materials is a Low information note. The "possible duplicate (same supplier, material, date, qty)" check now skips matches inside one PO number. Before this, a legitimate multi-line PO was flagged High and lowered supplier-performance confidence. (js/calculations.js)

Added: tests/test-paging.js, test-paging-chrome.js; scenarios edge/multiline, splitline, posupconflict; gen-large-workbook.js --items=N (exact item counts); perf-chrome.js "Show more" timing; Android-paging-test-1500-items.xlsx (outside the project, for phone testing).

Test-side change: in test-po-edge.js one assertion changed on purpose: an exact duplicate (same PO number) is no longer additionally listed as "possible duplicate"; the High flag covers it.

Proposed, NOT implemented (need owner approval):
- Over-received quantities: change the supplier fill rate to count at most the ordered quantity on each PO (details and numbers in tests/TEST-RECORD.md). Northstar results would not change.
- Smaller page on narrow screens (50 rows).
- Cache the Summary, MRP and Forecast accuracy results per analysis so revisiting a tab is instant.
- Label supplier counts as order lines.

Performance after paging is in tests/TEST-RECORD.md. The analyse() target is met at 5,000 items and missed at 15,000; the tab-switch target is met on desktop Chrome at 5,000 items and missed at 15,000 (3 tabs) and on the phone-speed proxy.

## v0.6 candidate 3 (awaiting owner approval; candidate 2 is preserved unchanged)
Approved changes:
1. **200-row pagination** (carried from candidate 2): every record stays in the calculations, recommendations and Excel export; the screen shows a page at a time with "Show more" and "Show all".
2. **Duplicate PO detection** (carried from candidate 2): a PO number repeated across lines for different materials is a normal multi-line PO (Low note), not a duplicate.
3. **Supplier fill capped per PO line.** Each line now counts at most its ordered quantity, so excess on one line can no longer cancel a shortage on another. Excess is reported separately: new Suppliers-tab column "Over-delivered units" (with line count) and new export columns `OverDeliveredUnits` and `OverDeliveredLines` in ENG_Suppliers. Fill % can no longer exceed 100. The score formula and weights are unchanged. (js/calculations.js, js/app.js, js/excel-import.js)
4. **Safe caching.** `mrp()` and `feas()` (which feed MRP, Production feasibility and Summary) are cached on the analysis result, keyed on the current settings; a new analysis starts empty. Forecast accuracy was already cached. The MRP view sorts a copy so the cache is never reordered.
5. **50-row first page on narrow screens** (600 px wide or less); 200 elsewhere. "Show more" adds one page (50 or 200); "Show all" unchanged.

Code review:
- B1 four dead duplicate views removed (rendered HTML of all 17 tabs identical before and after).
- B2 **defect fixed**: the Excel export no longer adds sheets to the uploaded workbook (it works on a copy).
- B3 no cross-file defects; permanent check added (tests/check-globals.js).
- B4, B5 findings and proposals only, nothing changed: see tests/CODE-REVIEW-FINDINGS.md.

Expected supplier-scoring difference from the per-line cap: only suppliers with an over-delivered line AND a different line with a shortage, or an over-delivery that previously pushed fill above 100, score differently, and only by the 15% fill component. Across all 16 supplier scenarios only the over-receipt scenario changed: SUP008 60.55 -> 60.39, SUP015 65.50 -> 65.45, SUP014 74.22 -> 74.03, SUP006 53.78 -> 53.70. No risk class changed. Northstar is unchanged (no over-receipts). Old expected output kept as tests/fixtures/edge/supplier-output-overrec.pre-cap-candidate2.json.

Test-side changes (deliberate): test-po-edge.js assertion for the over-receipt scenario now expects a capped fill with excess reported separately; verify_sup.py applies the cap and checks it independently; test-paging-chrome.js now covers five screen widths.

Added: test-fillcap.js, test-export-repeat.js, test-cache.js, check-globals.js, run-regression.sh, run-perf-c3.sh; scenarios partial, overshort, combined (fixtures/edge); perf-chrome.js accepts VW (width) and FIRST (cold tab).

Unchanged: all other calculations, colours, themes and contrast; the v0.5 golden and v0.6 baseline snapshots (same SHA-256).

## v0.6 candidate 4, Phase 1 (awaiting owner approval; Phase 2 onward NOT started; v0.6 NOT frozen)
Base: the exact tree of Git tag `v0.6-candidate-3` (commit 5a376d829834af047576e59c09ed1529649583aa). Candidate 3 (ZIP, folder, Git state) was not modified. Candidate 4 lives in its own folder and Git repository (branch candidate-4; base tag c4-base = candidate 3 tree).

1. **Forecast accuracy duplicate: nothing to remove.** Candidate 3 already deleted the dead duplicate (change B1). Verified: exactly one `views['Forecast accuracy']` definition remains and every tab renders identically to candidate 3.
2. **Math.min(100, fill): KEPT, not removed.** Verification shows the guard is not redundant. Fill cannot exceed 100% on valid data (checked on 9 workbooks), but impossible quantities that the app already flags High (for example ordered -10 and received -30) give fill 300% and, without the guard, a score above 100. Negative received quantities give negative fill. Removing it would change scores for such data. Left as is; see "Remaining issues".
3. **Over-delivered columns added to the live Suppliers table** (js/app.js): "Over-delivered units" and "Over-delivered lines", straight after "Fill %", equal to the export fields `OverDeliveredUnits` and `OverDeliveredLines`. **This corrects a candidate 3 defect:** candidate 3's changelog said the column had been added, but the edit went into a duplicate view that was later deleted, so the screen never showed it (the engine value, the export columns and the score note were correct). The first version of the new column also showed raw HTML text; caught by the new test and fixed (wrapped in `H()`).
4. **Responsive pagination** (js/app.js): 200 rows above 600 px, 50 rows at or below 600 px. When the screen crosses the line, the current tab is redrawn once, 150 ms after resizing stops (a burst of resizes gives one redraw). "Show all" and "Show more" choices, the scroll position, the Demand forecast SKU selector, the policy filter and the production-order toggle are kept. The redraw happens only when the tab holds a table longer than 50 rows, so other tabs, including unapplied Settings inputs, are left alone. A resize that does not change the page size does nothing.
Also: check-globals.js now compares character positions, not line numbers, so same-line declarations are judged correctly (it caught the new `pgSize` ordering as a false positive); the resize listener is guarded so the Node test harnesses, which have no `window`, still load app.js.

Not changed: forecasting, confidence rules, safety-stock calculations, supplier scoring weights and formula, all other business rules; snapshots (both still SHA-256 7f38bc56...).

Added tests: tests/test-phase1.js (125 checks), tests/test-responsive-chrome.js (35 checks); both write one line per check with VERBOSE=1.

## v0.6 candidate 4, Phase 1 FINAL (awaiting owner approval; v0.6 NOT frozen)
No application code changed after Phase 1 (only tests and records were added). Added: tests/check-standalone.js, tests/test-suppliers-export-chrome.js, tests/test-blank-qty.js; test-blank-qty added to run-regression.sh.
Kept, as instructed: the `Math.min(100, fill)` guard; supplier scoring unchanged; zero and negative quantity lines are NOT excluded.
Blank-quantity behaviour (documented, not changed; see tests/TEST-RECORD.md and tests/test-blank-qty.js): one blank Received_Qty or Ordered_Qty on a scored PO line makes that supplier's fill and score NaN; NaN fails every cut-off so the supplier is classed High risk ("Performance problem") despite adequate evidence; the screen shows a dash, the Excel export carries NaN; the "Missing values" flag does not fire if the blank is in the first data row.
The exact Git commit of Phase 1 final is in the annotated tag `v0.6-candidate-4-phase1-final` and in the Phase 2 records.

## v0.6 candidate 4, Phase 2: unit-of-measure corrections (awaiting owner approval; v0.6 NOT frozen)
Base: Git tag `v0.6-candidate-4-phase1-final`, commit 7664564a192cc298763ab9b0a593995219e13639 (itself based on `v0.6-candidate-3`, commit 5a376d829834af047576e59c09ed1529649583aa). Candidate 3 and Phase 1 final are unchanged and recoverable by tag and by ZIP.
Approved corrections only (js/calculations.js, two lines plus a small helper):
1. **Units are compared after trimming spaces and ignoring case.** " each", "each ", tabs, non-breaking spaces, " kg", " pcs " are no longer falsely flagged as "Unrecognised unit of measure".
2. **EA is treated as each.** It is the only alias added. EA, ea, Ea and " EA " are recognised.
3. **The fractional-BOM check now uses the same normalised unit.** Before, only the exact lower-case text "each" was checked, so "Each", "EACH", " each " and "EA" materials were never flagged for fractional BOM quantities (Northstar with every unit written "Each": 0 flagged, now 197, the same as "each").
Deliberately NOT changed: no other aliases. "pack", "pc", "PC", "lb", "kgs", "ea.", "each.", "eaches", "e a", "cs", empty or blank units and zero-width-space variants stay flagged as unrecognised and are never converted or counted as "each", because their meaning is unknown or ambiguous (a "pack" has no stated size). The uploaded unit text is never rewritten. The accepted list is unchanged: each, kg, m, l, g, pcs, set, box.
Changed results (compare-trees.js, Phase 1 final vs Phase 2, 23 workbooks): 18 identical in every analysis result, every tab and every export sheet (Northstar, all 6 supplier scenarios, all 9 edge scenarios, the structure workbook, Northstar with units written "pack"). 5 differ, only in data-quality findings and the three tabs that display them (Data quality, Client questions, Summary) plus the ENG_DataQuality export sheet: items, risk classes, actions, safety stock, reorder points, MRP, feasibility, suppliers, forecasts, confidence areas and totals are identical in all 23. No unexpected difference.
Added tests: tests/test-uom.js (164 checks), tests/compare-trees.js (reporting tool); run-regression.sh runs test-uom against the Phase 1 final code for comparison. Evidence: tests/logs/uom-matrix-BEFORE-20261109T185500Z.txt and uom-matrix-AFTER-20261109T185500Z.txt (40 unit spellings), tests/logs/compare-phase1final-vs-phase2-20261109T190500Z.txt.
Not touched, as instructed: forecast credibility and finished-goods lead-time assumptions; supplier scoring; the `Math.min(100, fill)` guard; zero and negative quantity lines; blank-quantity behaviour.

## Candidate 4, Phase 3 (candidate, awaiting owner review; base: tag v0.6-candidate-4-phase2)
Implemented (reporting and interface only; no calculation, scoring, forecasting or rule changed):
1. **Missing-value detection (js/calculations.js, js/excel-import.js).** A blank in the first data row no longer hides a column. Every column is inspected (header row plus all rows). Blank = empty cell, empty string, whitespace-only text, formula returning "", or an Excel error cell. Zero, FALSE and text such as "TBC" are not blanks. An entirely blank column is now reported as "Column X contains no values (every cell in the column is empty)" (Medium), distinct from an absent column (no finding) and from scattered gaps ("Missing values in X"). Example rows are now the true spreadsheet row numbers (before: a sequence number that did not match the sheet). Expected data-quality change: only workbooks with blank columns or first-row blanks (of the 23 test workbooks, structure/willow only: "Missing values in Notes" becomes "Column Notes contains no values").
2. **Finished-goods lead-time note (js/app.js).** Three explanatory sentences (Reorder policy, Finished goods, Settings "Fixed rules") state that finished-goods safety stock assumes a fixed production time and excludes production-time variability. Text only; every calculated value is identical to Phase 2.
3. **Scroll position kept across rotation (js/app.js).** Pre-Phase 3 check found the debounced redraw could lose the scroll position because the browser clamps it before the redraw. The position is now remembered from scroll events before the resize.
Investigation only (no change): blank/invalid supplier quantities (tests/INVESTIGATION-1-BLANK-QUANTITIES.md); forecast credibility (tests/INVESTIGATION-3-FORECAST-CREDIBILITY.md). Pre-check: tests/PRE-PHASE3-CHECK.md.
Test changes: three tests that pin earlier-candidate output were updated for the intended changes above (test-phase1 1e tolerates only the three Phase 3 sentences; test-blank-qty now expects the first-row blank to be flagged; test-uom U11 exempts only the willow missing-value reclassification). New: test-missing-values (63), test-fglt-note (105), test-prephase3 (41), investigation scripts.
Unchanged: all calculations, supplier scoring (Math.min(100, fill) kept), forecasting, thresholds, colours and themes.

## v0.6 candidate 4, Phase 3B: minimum safe supplier fix and forecast confidence (awaiting owner review; base: tag v0.6-candidate-4-phase3; Phase 4 NOT started; v0.6 NOT frozen)
Implements approved decisions 1-7 of the Phase 3B brief. Supplier score formula, weights (50/20/15/15), `Math.min(100,fill)` cap, per-line `Math.min(Received,Ordered)`, risk cut-offs (75/60), `supMinPO` and evidence thresholds are unchanged. Weights are not renormalised.

**Calculation changes (suppliers).** Each metric now uses only the lines that can support it: on-time and lateness use lines with a valid Promised_Date; fill and over-delivery use lines with numeric Ordered_Qty > 0 and Received_Qty >= 0. Blank, text (including "120"), negative and otherwise invalid quantities no longer enter the sums (before: a blank gave NaN and High risk; a text value was concatenated; a negative could lift fill above 100). If a required metric has no valid line the score is null and the state is the exact string "Not Assessed — Insufficient Evidence" (reason "Data problem" when lines exist but are unusable, "No delivery history" otherwise); valid metrics such as on-time % stay visible. Evidence (Adequate/Limited/None) is judged on the smallest count of valid lines across the metrics. New supplier fields: nOtd, nLt, nFill, invQ, invD, reason, dpNote.
**Data quality.** New High finding "Non-numeric quantity…" (text in Ordered_Qty/Received_Qty) and a Medium finding for missing/invalid Promised_Date. Confidence for supplier performance treats these like the existing definite PO faults.
**Forecast confidence (decision 5).** Two or more consecutive extreme months (the existing level-shift warning, `shift>0`) add one point to the existing confidence counter, i.e. confidence falls by one level. Accuracy, bias, verdict, finding, data-quality class and outlier counts are unchanged. Wording (decision 6): the Why text now says confidence is lowered by one level, and the level-shift sentence is no longer appended separately. MAD = 0 (decision 7): an informational note says outlier detection was not applied; no scoring rule.
**Interface / wording.** Suppliers table and Overview show "Evidence (n POs, m with valid quantities)" and a data-problem note; Summary "Manage weak suppliers" counts only scored suppliers, states how many are Not Assessed — Insufficient Evidence and "not counted as problems"; Settings fixed-rules text updated. If no supplier can be assessed the Summary says so instead of "at least 0 PO(s)".
**Exports.** ENG_Suppliers: new columns Assessment, InvalidQuantityLines, InvalidDateLines; Score is blank (null) when not assessed, Risk shows the exact state string; no NaN anywhere.
**Unchanged on valid data:** all item results, all 15 Northstar supplier scores/classes/evidence/rank, all golden snapshots.
**Not implemented (needs your decision):** counting orders overdue at the snapshot but not yet received as late (changes valid-data scores; see tests/quantify-overdue-open.js: Northstar affects only SUP011, OTD 31.3% to 27.8%, already High risk); safe parsing of numeric text (v0.7).
**Tests.** New: test-forecast-conf.js (206), test-supplier-eligibility.js (301). Updated for intended changes only: test-blank-qty (now asserts the corrected behaviour), test9, test-export-nohistory, test-phase1, test-uom, test-fglt-note, test-prephase3 (formula regexes), verify.py (adds the level-shift point), verify_sup.py and 3 stored supplier outputs (label only). Reports: tests/PHASE3B-ARCHITECTURE-CHECK.md, INVESTIGATION-SUPPLIER-IMPACT.txt, SUMMARY-WEAK-SUPPLIER-IMPACT.txt.

## v0.6 candidate 4, Phase 4: final verification and release-candidate gate (tag v0.6-candidate-4-rc; NOT final; v0.6 NOT frozen or released)
**No application code changed**: js/, css/, index.html and assets/ are byte-identical to tag v0.6-candidate-4-phase3b (commit e265f8b268302ae0c6eea5743b5c84a9acace4d9). Phase 4 adds tests, logs and reports only. Verdict: CONDITIONAL PASS (see tests/TEST-RECORD.md and OUTSTANDING-DECISIONS.md).
Added: tests/test-na-constraints.js (88 checks; the three Not Assessed constraints), tests/test-p4-chrome.js (81 checks; 17 tabs at desktop, 412 and 360 px for 3 workbooks: found 2 pre-existing low-severity issues, which are reported, not fixed), tests/perf-chrome-p4.js (copy of perf-chrome.js plus a warm pass), tests/run-verbose.sh (keeps every individual assertion), reports PHASE4-GOLDEN-COMPARISON-REPORT.md, PHASE4-PERFORMANCE-REPORT.md, PHASE4-CODE-REVIEW-FINDINGS.md, root KNOWN-LIMITATIONS.md and OUTSTANDING-DECISIONS.md. Nine existing suites and test-paging-chrome gained a logging-only VERBOSE line so every assertion can be recorded (no assertion changed). run-regression.sh now includes test-na-constraints.
Documentation retained from Phase 3B: supplier OTD is measured on received deliveries and overdue open POs are not counted; forecast-confidence changes are covered by dedicated tests but are not fully represented in the historical golden snapshots (both in KNOWN-LIMITATIONS.md and the golden report).
Issues reported and awaiting your decision: (1) unapplied Settings values lost on tab switch (pre-existing); (2) 12 px sideways scroll at 360 px on Summary with a long file name (pre-existing). Informational: analyse() about 20% slower than Phase 2 since Phase 3 (still about 1.05 s at 5,000 items; target 2 s).

## v0.6 candidate 4 FINAL (tag v0.6-candidate-4-final; from RC 555e448; verdict in tests/TEST-RECORD.md)
Two UI-only fixes, nothing else (calculations.js, forecasting.js, excel-import.js, index.html and assets are byte-identical to the RC):
1. **Settings drafts survive tab switches.** Unapplied Settings text is kept in an in-memory draft (js/app.js setDraft, separate from the applied CFG), restored when Settings is redrawn, cleared by Recalculate (Apply) and Reset. Navigating triggers no calculation. Investigation first confirmed the old behaviour genuinely discarded the value (CFG was never affected).
2. **Summary no longer overflows at 360 px.** css/styles.css: h2 gets overflow-wrap:anywhere so a long file name wraps; the name is shown in full.
Added: tests/test-final-chrome.js (76 checks; negative control run on the RC), run-regression.sh unchanged. Documentation updated: TEST-RECORD (10 failed assertions and resolution, results), golden and performance reports, code-review findings, KNOWN-LIMITATIONS, OUTSTANDING-DECISIONS.
Unchanged by decision: analyse() about 20% slower than Phase 2 (accepted; v0.6.1 optimisation candidate); overdue open POs excluded from supplier OTD; 15,000-item and simulated-mobile performance limits; no physical Android testing.
