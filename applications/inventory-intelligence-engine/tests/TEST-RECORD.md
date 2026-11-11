# Test record: v0.6 candidate (final verification pass)

> **Correction (v0.7 A1 review, 11 Nov 2026): test7 has 118 checks, all passing.** test7 prints its summary line ("summary 111 pass 0 fail") before its last 7 checks (forecast checks added in v0.4), so the summary understates the total. Counted from its output: 118 PASS lines, 0 FAIL lines, in UTC and Europe/London (`tests/logs/a1-review/test7-count.txt`). Every "111" for test7 below is that summary line; the actual count is 118. Note also that test7, test8, domtest and domtest2 do not set an exit code, so `run-regression.sh` would not fail on their FAIL lines; a fix is proposed in `A1-DEVIATIONS.md` (D4) and needs approval. No test was changed.


Run 20261109T154834Z. Node-based suites were run in both UTC and Europe/London (identical results). Logs: tests/logs/*-20261109T154834Z*. Machine: 2 CPU, 8 GB RAM, Node v22.23.4, headless Chromium (desktop emulation, not a phone).

## Results (second verification pass, run 20261109T170043Z; Node suites in UTC and Europe/London, identical)
| Suite | Result |
|---|---|
| test9 / test7 / test8 / domtest / domtest2 / verify.py | 57 / 118 / 47 / 30 / 18 / 17 pass = **287 pass, 0 fail** |
| test-failed-import 18, test-export-nohistory 19, test-structure 34, test-timezones 15 | 86 pass |
| test-po-edge (duplicates, multi-line POs, split delivery, PO with two suppliers, received over ordered) | 35 pass (was 20; 15 added) |
| test-paging (jsdom: nothing dropped, results and export identical) | 23 pass |
| **New regression tests, total** | **144 pass, 0 fail** |
| Real Chrome browser-chrome.js (visual checks included) | 53 pass, 0 fail, 0 excluded |
| Real Chrome test-paging-chrome.js (412 px phone-sized screen, touch) | 11 pass, 0 fail |
| **Counted checks, all suites** | **287 + 144 + 53 + 11 = 495 pass, 0 fail** |
| Supplier scenarios: six original | 6 of 6 PASS |
| Supplier scenarios: dupexact, dupkey, overrec, multiline, splitline, posupconflict, willow (independent pandas verifier) | 7 of 7 PASS |
| v0.5 golden snapshot | 10 of 10 sections IDENTICAL (UTC, London; five timezones via test-timezones) |
| v0.6 baseline snapshot | ALL SECTIONS IDENTICAL |
| Snapshot integrity | both files unmodified (identical SHA-256 7f38bc56..., as both describe the same results) |
New tests shown to fail on the old code: test-po-edge failed 9 checks on the previous PO-number rule. One early failure in test-paging-chrome.js was a test mistake (Playwright "$eval" with a function written as a string); fixed and rerun 4 times, all pass.

## Performance after paging, exact datasets (targets: analyse() under 2 s, tab switch under 300 ms)
Datasets built by tests/gen-large-workbook.js --items=N. Machine: 2 CPU, 8 GB RAM, Node, desktop Chromium. "4x" = Chrome CPU throttling, a rough phone proxy, NOT a real device. Log: tests/logs/perf-paging-*.log.
| Dataset | Finished goods | Materials | BOM | Demand rows | Inventory | POs | Prod. orders | File |
|---|---|---|---|---|---|---|---|---|
| 5,000 items | 1,667 | 3,333 | 6,631 | 20,004 | 5,000 | 9,999 | 5,001 | 5.4 MB |
| 15,000 items | 5,000 | 10,000 | 20,000 | 60,000 | 15,000 | 30,000 | 15,000 | 16.3 MB |
| Measure | 5,000 before | 5,000 after | 15,000 before | 15,000 after |
|---|---|---|---|---|
| analyse() median (Node) | 893 ms | 950 ms (PASS) | 2,574 ms | 2,587 ms (FAIL) |
| Import to ready, desktop Chrome | 2.8 s | 2.9 s | 8.2 s | 8.3 s |
| Tabs over 300 ms, desktop Chrome | 9 of 17 (slowest 3,398 ms) | **0 of 17 (slowest 229 ms) PASS** | page crashed on Reorder policy | **3 of 17 (slowest 821 ms; 591 ms in a rerun) FAIL** |
| Tabs over 300 ms, 4x slowdown | 11 of 17 (slowest 14.3 s) | 10 of 17 (slowest 1.0 s) | 13 of 17 (slowest 44.3 s) | 10 of 17 (slowest 3.0 s) |
| "Show 200 more" repaint on Materials | n/a | 325 ms (4x: 1,565 ms) | n/a | 379 ms (4x: 1,562 ms) |
Tabs still over 300 ms at 15,000 items on desktop: Summary (588 ms, 25 cells: pure computation), MRP (425 ms), Forecast accuracy (301 ms). On the 4x proxy at 5,000 items: MRP 1,073, Summary 995, Forecast accuracy 833, Materials 710, Finished goods 645, Demand forecast 540, Policy comparison 477, Production feasibility 442, Reorder policy 431, Suppliers 359 ms. Measured with a 50-row page on the 4x proxy (throwaway copy, not in the project): 4 of 17 tabs over 300 ms; the remaining ones are the three computation tabs plus one.
Earlier measurements (before paging, other dataset sizes) are in the earlier logs (perf-20261109T154834Z.log) and remain valid for the before-paging code.

## Over-received quantities: current rule, effect and recommendation (nothing changed)
Current rule: supplier fill % = total received / total ordered over that supplier's received POs, so extra units on one PO offset a shortage on another. The score uses min(100, fill) with a 15% weight. "POs received short" is counted per PO and is not offset, so the Suppliers tab can show fill 100% and several short POs at once. Received above ordered is flagged High "Impossible quantities". It does not change PO classification, outstanding quantities or stock. Extra received units are not added to stock by the engine (stock comes from the Inventory sheet).
Numbers: Northstar, 0 of 15 suppliers differ between the current and a per-PO-capped rule. Over-received scenario (4 POs): SUP006 shows 104.1% now against 99.5% capped, score 53.78 vs 53.70; SUP014 100.0% vs 98.7%; SUP008 99.7% vs 98.6%; SUP015 99.9% vs 99.6%; no risk class changes. Worst case: the fill term is 15% of the score, so fully masked shortages inflate a score by up to 0.15 x (100 - true fill) points (1.5 at 90%, 3.0 at 80%, 4.5 at 70%).
Recommendation (needs approval): count at most the ordered quantity on each PO, fill = sum(min(received, ordered)) / sum(ordered), and show over-delivered units as a separate figure. Optionally treat small over-receipts (for example up to 10%) as Medium instead of High; that would need a new setting and is not recommended without your decision.

## Reconciliation of every previously unverified item
| Item from the earlier report | Status |
|---|---|
| Visual contrast checks (2.85:1 light, 2.73:1 dark) | PASSED after text-colour fix; sampled minimum 4.97 light / 5.68 dark; full scan left only two chart-legend swatches (non-text) below 4.5 |
| Physical Android device | STILL UNVERIFIED (emulation only; ANDROID-TESTING.md and a 1,500-item test workbook provided) |
| Second structurally different workbook | PASSED (34 checks, independent verifier PASS) |
| Duplicate-PO scenario | PASSED; defects fixed: confidence cap (pass 1), multi-line PO numbers wrongly flagged as duplicates (pass 2) |
| Received quantity above ordered | PASSED with limitations (see CHANGELOG) |
| 5,000-SKU performance, analyse() under 2 s | PASSED at 5,000 items (950 ms); FAILED at 15,000 items (2,587 ms) |
| 5,000-SKU performance, tab switching under 300 ms | After paging: PASSED on desktop Chrome at 5,000 items; FAILED at 15,000 items (3 tabs) and on the 4x phone proxy at both sizes. Before paging it failed from 1,500 items upward |
| Original seven Git commits | NOT RECOVERABLE (documented as a historical limitation) |
| Failed-import state (WB/WBNAME) | PASSED (fixed earlier, regression test) |
| Timezone dependence of dates and results | PASSED (fixed earlier, five-timezone test) |
| test7 count 111 vs 118 | RECONCILED: 118 checks run and pass; 111 is the summary line printed before the last 7 checks (corrected 11 Nov 2026; earlier wording "111 was a miscount" was inaccurate) |
| Colour/theme/styling work | Only the contrast text colours above were changed; no layout or palette redesign |
| Currency, units of measure, data contracts, SME demonstration dataset | Not part of v0.6, not claimed |
| Over-received quantity rule | INVESTIGATED, recommendation made, NOT changed (awaiting approval) |
| Phone-speed performance | STILL UNVERIFIED on a real device; 4x CPU throttling is only a proxy |

## Rerun
From tests/: node test7.js ... test9.js domtest.js domtest2.js test-*.js; bash run-supplier-scenarios.sh <ts>; bash run-edge-scenarios.sh <ts>; node regress.js .. out.json then node compare-snapshots.js snapshots/v0.5-golden-20261105T101953Z.json out.json; node browser-chrome.js. Needs NODE_PATH with xlsx, jsdom, puppeteer-core, @sparticuz/chromium, pdf-parse and Python with pandas/openpyxl.


# Candidate 3 verification (run 20261109T180000Z; log tests/logs/regression-20261109T180000Z.log)
Candidate 2 is preserved unchanged (inventory-intelligence-engine-v0.6-candidate-2.zip). Snapshots untouched: both still SHA-256 7f38bc56...; nothing overwritten.

## Results
| Suite | Result |
|---|---|
| test7 / test8 / test9 / domtest / domtest2 (UTC and Europe/London) | 118 (summary line shows 111) / 47 / 57 / 30 / 18 passed, 0 failed, identical in both zones |
| test-failed-import, test-export-nohistory, test-timezones, test-po-edge, test-structure, test-paging | 18, 19, 15, 35, 34, 23 passed, 0 failed |
| NEW test-fillcap (partial, shortage, over-receipt, combined, duplicates, multi-line, split lines, Northstar; fill/excess recomputed from raw rows) | 276 passed |
| NEW test-export-repeat | 24 passed (6 of these fail on candidate 2: the mutation defect) |
| NEW test-cache | 15 passed |
| NEW check-globals | 101 passed |
| verify.py (independent pandas, Northstar) | 17 passed |
| Supplier scenarios, independent verify_sup.py: 6 original + 7 edge/structure + 3 new (partial, overshort, combined) | 16 of 16 PASS; independently verified scores, classes, evidence, rank |
| v0.5 golden and v0.6 baseline, all 10 sections (items, sup, mrp, feas, fc, pr, tot, fga, po, dq), UTC, London, New York, Kolkata, Auckland | ALL SECTIONS IDENTICAL, 10 of 10 comparisons |
| test-paging-chrome (real Chrome, 5 widths: 360, 412, 600, 601, 1280 px) | 59 passed |
| browser-chrome (real Chrome desktop/mobile, contrast, offline, PDF, bad files) | 53 passed |
| Dead-view removal: MD5 of every tab render before/after (51 renders) | identical |

Total this pass: 118 (summary line 111)+47+57+30+18 (x2 zones) plus the single-run suites above. Chrome tests are desktop Chrome emulating a phone: NOT a physical Android test.

## Supplier-score differences caused by the per-line cap (expected, documented)
Only scenario overrec changed (new expected file stored after verify_sup.py, which applies the cap independently, passed): SUP008 60.55->60.39, SUP015 65.50->65.45, SUP014 74.22->74.03, SUP006 53.78->53.70; no class change. Fill examples where an excess and a shortage coexist (netted before -> capped now): overrec SUP014 100 -> 98.67, SUP006 104.08 -> 99.48; overshort SUP008 97.29 -> 94.58, SUP014 97.61 -> 94.25; combined SUP008 97.02 -> 95.39.

## Performance (log tests/logs/perf-c3-20261109T181500Z.log; 2 CPU, 8 GB, Node 22, Chromium; datasets: 150 items, 5,000 items = 1,667 FG + 3,333 RM, 15,000 items = 5,000 FG + 10,000 RM)
| | 150 | 5,000 | 15,000 |
|---|---|---|---|
| analyse(), Node median | 29 ms | **995 ms (target < 2 s: MET)** | 2,912 ms (not met; not a target size) |
| Full import-to-ready (parse + analyse x3 + render), desktop Chrome | 0.3 s | 3.1 s | 9.1 s |
| Tabs over 300 ms, DESKTOP 1280 px | 0 of 17 (slowest 84) | 0 of 17 (slowest 238 ms) | 2 of 17 (slowest 492 ms) |
| Desktop, Summary opened first (cold cache) | 0 (93 ms) | 1 of 17 (335 ms) | 2 of 17 (535 ms) |
| Tabs over 300 ms, SIMULATED PHONE 412 px, no throttle | 0 (47) | 0 (234 ms) | 2 (629 ms) |
| SIMULATED PHONE, 4x CPU slowdown (a proxy only) | 1 (318) | 3 of 17 (slowest 832 ms) | 5 of 17 (slowest 1,961 ms) |
| Import-to-ready, simulated phone 4x | 1.2 s | 13.4 s | 38.9 s |
| "Show more" repaint (Materials) desktop / phone 4x | 95 / 563 ms | 398 / 367 ms | 431 / 420 ms |
Before candidate 3 (candidate 1, no paging): 5,000 items had 8 tabs over 300 ms (slowest 2,996 ms) and 15,000 crashed the page on the Reorder policy tab. The 4x throttle is a proxy on a desktop-class machine, not a physical Android measurement; real-phone speed remains UNVERIFIED. Remaining slow tabs: MRP and Forecast accuracy on first visit (first calculation is not cached); the 15,000-item import itself (the engine runs three times: main plus two comparisons).

## Still unverified
Real Android Chrome (touch, scroll, speed, file picker, memory); workbooks above 15,000 items on a phone; B4/B5 proposals (not applied); the lost seven-commit Git history (unrecoverable).


# Candidate 4, Phase 1 verification (regression run 20261109T192000Z; log tests/logs/regression-20261109T192000Z.log)
Base: tag v0.6-candidate-3 (5a376d8). Candidate 3 was verified before starting: tag and HEAD identical, ZIP intact (`unzip -t` clean, sha256 0630f061...), non-image tracked files identical to the candidate 4 base. Note: 8 test screenshot PNGs in candidate 3's working tree (tests/logs/screens-20261109T174334Z) differ from the tagged commit; no source file does. Candidate 3 left untouched.

## Tests for the four changes
Per-check results: tests/logs/test-phase1-20261109T193900Z.log and tests/logs/test-responsive-chrome-20261109T193900Z.log. Each check below states what was expected and what was measured.
| # | Test (script: check id) | Expected | Actual | Result |
|---|---|---|---|---|
| 1 | test-phase1: 1a, 1b | exactly one `views['Forecast accuracy']` assignment, no object-literal version | 1 and none | PASS |
| 1 | test-phase1: 1c | Suppliers, Data quality, Settings, MRP, Overview each defined once | 1 each | PASS |
| 1 | test-phase1: 1d | same 17 tab names as candidate 3, on 4 workbooks | 17 on each | PASS |
| 1 | test-phase1: 1e | every tab except Suppliers renders byte-identical (MD5) to candidate 3 on Northstar, overshort, combined, multiline | 64 of 64 identical | PASS |
| 2 | test-phase1: 2a (9 workbooks) | fill between 0 and 100 on valid data | max 100.00 on every workbook | PASS |
| 2 | test-phase1: 2b | impossible quantities (ordered -10, received -30) push fill above 100 (so the guard is needed) | fill 300% for 15 suppliers | PASS (guard kept) |
| 2 | test-phase1: 2c | with the guard, scores stay within 0-100 | all within 0-100 | PASS |
| 2 | test-phase1: 2d, 2e | same data raises High "Impossible quantities"; guard still in code | both true | PASS |
| 2 | probe (not a kept test): negative received everywhere / blank quantities | documented | negative fill -102 to -108%; blank gives NaN score (existing behaviour, see Remaining issues) | recorded |
| 3 | test-phase1: 3a-3c (4 workbooks) | table has "Over-delivered units" and "Over-delivered lines" straight after "Fill %" | present, positions 17 and 18 | PASS |
| 3 | test-phase1: 3d-3f | one row per supplier; displayed units and lines equal the engine | equal on all rows | PASS |
| 3 | test-phase1: 3g, 3h | export ENG_Suppliers has OverDeliveredUnits and OverDeliveredLines and each row equals its table row | equal | PASS |
| 3 | test-phase1: 3i, 3j | no script errors; overshort total excess positive | 0 errors; positive | PASS |
| 4 | test-responsive-chrome: A1-A4 | 1280 px: 200 rows; 600 px: 50; 601 px: 200; one redraw per crossing | 200 / 50 / 200; 1 redraw | PASS |
| 4 | test-responsive-chrome: B1, B2 | resizing inside a band causes no redraw | 0 redraws | PASS |
| 4 | test-responsive-chrome: C1-C3 | a burst of 6 resizes: no redraw during, exactly one after, final width honoured; non-changing resize event does nothing | 0 during, 1 after, 50 rows at 560 px | PASS |
| 4 | test-responsive-chrome: D1-D4 | "Show all" (1,000 rows) kept narrow and wide | 1,000 rows each time | PASS |
| 4 | test-responsive-chrome: E1-E6 | "Show more" count kept; scroll position kept both directions | scroll 1500 -> 1500 (+/-2 px), 1200 -> 1200 | PASS |
| 4 | test-responsive-chrome: F1-F6 | Demand forecast SKU selector and tab kept after crossing both ways | selected SKU unchanged | PASS |
| 4 | test-responsive-chrome: G1-G4 | Settings (unapplied value 1.9) and Overview not redrawn | 0 redraws, value kept | PASS |
| 4 | test-responsive-chrome: H1, H2, I1, I2 | engine holds 500 FG / 1,000 RM; no sideways scroll; new tab uses new size | true; 50 then 200 rows | PASS |
| 4 | negative control: test-responsive-chrome run against candidate 3 code | should FAIL without the feature | 5 checks fail (A2, A3, C2, E5, I2) | as expected |

## Existing functionality (regression run 20261109T192000Z)
| Suite | Expected | Actual | Result |
|---|---|---|---|
| test7, test8, test9, domtest, domtest2 (UTC and Europe/London) | 118 (summary line 111), 47, 57, 30, 18 pass, 0 fail | same, both zones | PASS |
| test-failed-import, test-export-nohistory, test-timezones, test-po-edge, test-structure, test-paging | 18, 19, 15, 35, 34, 23 pass | same | PASS |
| test-fillcap, test-export-repeat, test-cache | 276, 24, 15 pass | same | PASS |
| test-phase1 (new) | 125 pass | 125 pass | PASS |
| check-globals | 105 pass | 105 pass | PASS |
| verify.py (independent, Northstar) | 17 pass | 17 pass | PASS |
| 16 supplier scenarios (verify_sup.py) | all PASS | 16 of 16 | PASS |
| v0.5 golden and v0.6 baseline, 10 sections, UTC / London / New York / Kolkata / Auckland | ALL SECTIONS IDENTICAL | 10 of 10 comparisons identical | PASS |
| test-paging-chrome (real Chrome, 5 widths) | 59 pass | 59 pass | PASS |
| test-responsive-chrome (new) | 35 pass | 35 pass | PASS |
| browser-chrome (desktop and mobile, contrast, offline, PDF, bad files) | 53 pass | 53 pass | PASS |
Snapshots untouched (both SHA-256 7f38bc567da528f1...). Chrome tests are desktop Chrome resized or emulating a phone: NOT a physical Android test.

## Performance spot check (log tests/logs/perf-c4-phase1-20261109T193500Z.log; 5,000 items = 1,667 FG + 3,333 RM)
analyse() median 820 ms (target under 2 s: met). Desktop 1280 px: 1 of 17 tabs over 300 ms (slowest 317 ms; candidate 3 measured 0 of 17, slowest 238 ms, so this is run-to-run variation on the first MRP visit, no code in that path changed). Simulated phone 412 px, no throttle: 0 of 17 (slowest 159 ms). The 4x-throttle and 15,000-item runs were not repeated in Phase 1; candidate 3 figures stand.

## Remaining issues (not fixed, for your decision)
- Impossible quantities (negative or zero ordered or received) are flagged High but still scored. The guard keeps scores in range, but fill can show above 100 or below 0 for such rows. Proposal (needs approval, it is a rule change): ignore lines with ordered quantity of zero or less, or negative received quantity, in the fill and score.
- Blank Ordered_Qty or Received_Qty on scored PO lines gives a fill and score of NaN for that supplier (probe, existing behaviour). Proposal: treat a blank as a data fault and exclude the line.
- The B4 and B5 proposals in tests/CODE-REVIEW-FINDINGS.md are still unapplied.
- Real Android Chrome testing is still unverified.


# Candidate 4, Phase 1 FINAL verification (regression run 20261109T183500Z; log tests/logs/regression-20261109T183500Z.log)
Preserved versions: candidate 3 = tag v0.6-candidate-3 / commit 5a376d829834af047576e59c09ed1529649583aa / inventory-intelligence-engine-v0.6-candidate-3.zip (sha256 0630f061d20f...), folder untouched. Candidate 4 Phase 1 (first delivery) = tag v0.6-candidate-4-phase1 / commit 61d6c0e37a70748d6a3e3a7fad4d9c9254feb459 / inventory-intelligence-engine-v0.6-candidate-4-phase1.zip. Snapshots untouched (both SHA-256 7f38bc567da528f1...).

| Test | Expected | Actual | Result |
|---|---|---|---|
| check-standalone (run in the project and again on an unzipped copy in a different folder, no node_modules, requests outside localhost blocked, served from a sub-folder URL) | 40 checks: all referenced files present and relative, no external URLs, no require/import, no absolute local paths, loads, Northstar analysed, 17 tabs render, no errors | 40 passed, 0 failed (both copies; see report) | PASS |
| test-suppliers-export-chrome (desktop 1280, phone 412, phone 360; Northstar and over/short scenario) | columns straight after Fill %, values equal the engine on every row, headers have width, no sideways page scroll, table scrolls inside its own box on phones and the new columns can be scrolled fully on screen; real downloads: original sheets unchanged, 9+ ENG_ sheets, ENG_Suppliers equals the engine, ENG_FG/ENG_RM complete, second and post-Recalculate downloads identical, no duplicate sheets | 72 passed, 0 failed; screenshots in tests/logs/screens-suppliers-* | PASS |
| test-export-repeat (uploaded workbook, results and later exports unchanged by repeated exports, incl. re-imported exported file) | 24 pass | 24 pass | PASS |
| test-blank-qty (characterisation of blank PO quantities) | documents current behaviour: NaN score, High risk, dash on screen, NaN in export, flag hidden when blank is in row 1, open-line blank has no scoring effect | 18 passed, 0 failed | PASS (behaviour documented, NOT endorsed) |
| Everything else (test7/8/9, domtest, domtest2 in UTC and London, import, export, timezone, po-edge, structure, paging, fillcap, cache, phase1, check-globals, verify.py, 16 supplier scenarios, 10-section golden v0.5 and v0.6 baseline in 5 time zones, test-paging-chrome 59, test-responsive-chrome 35, browser-chrome 53) | as in Phase 1 | all identical to Phase 1 | PASS |

## Blank-quantity NaN behaviour: impact (probe on Northstar, one PO line edited in memory; documented only)
- Blank Received_Qty or Ordered_Qty on a received (scored) line of SUP008: fill and score NaN; class Medium -> High risk; assessment "Performance problem" with Adequate evidence (21 POs); High-risk suppliers 6 -> 7; the supplier's at-risk material count (4) is shown as before. Screen shows a dash. Export ENG_Suppliers shows NaN in Score and Fill%. No item risk class or recommended action changed.
- The same blank in every received line: all 15 assessed suppliers become NaN and High risk.
- Text such as "n/a" in Received_Qty behaves the same as a blank.
- Blank Ordered_Qty on an open (unreceived) line: no effect on supplier scoring; "Missing values in Ordered_Qty" (Medium) is raised.
- The "Missing values" check reads its column list from the first data row, so a blank in the first data row of a sheet hides that column from the check (no flag at all) although the supplier still turns NaN.
- Proposal (not applied; needs approval): treat a line with a blank or non-numeric quantity as a data fault, exclude it from fill and score, and raise a flag naming the PO; take the column list for the missing-value check from the union of all rows.


# Candidate 4, Phase 2 verification: UOM corrections (regression run 20261109T191500Z; log tests/logs/regression-20261109T191500Z.log)
Versions preserved and recoverable: candidate 3 = tag v0.6-candidate-3, commit 5a376d829834af047576e59c09ed1529649583aa, inventory-intelligence-engine-v0.6-candidate-3.zip. Phase 1 final = tag v0.6-candidate-4-phase1-final, commit 7664564a192cc298763ab9b0a593995219e13639, inventory-intelligence-engine-v0.6-candidate-4-phase1-final.zip (and the earlier inventory-intelligence-engine-v0.6-candidate-4-phase1.zip, commit 61d6c0e37a70748d6a3e3a7fad4d9c9254feb459). Phase 2 = branch candidate-4-phase2 in its own folder; its commit hash is in the tag v0.6-candidate-4-phase2 and in the delivery report. Snapshots untouched (both SHA-256 7f38bc567da528f1...).

## Investigation (baseline, Phase 1 final code; tests/logs/uom-matrix-BEFORE-20261109T185500Z.txt)
Every one of 40 spellings was written to all materials and products of Northstar. Findings: " each", "each ", tabs, NBSP, " kg", "kg ", " pcs " and "EA" in any case were wrongly flagged "Unrecognised unit of measure"; "Each" and "EACH" passed that check but were skipped by the fractional-BOM check (0 lines flagged, against 197 for "each"). "pack", "pc", "lb" and the other unknowns were flagged, which is correct for ambiguous units.

## Tests (script: check id; expected; actual; result). Per-check detail: run `VERBOSE=1 node test-uom.js`.
| Test | Expected | Actual | Result |
|---|---|---|---|
| test-uom U1 case (20 spellings of each, kg, pcs, box, set, m, l, g) | no unit flag | none flagged | PASS |
| U2 spacing (leading, trailing, several, tab, NBSP, newline) | no unit flag | none flagged | PASS |
| U3 alias (EA, ea, Ea, eA, " EA ", tab, NBSP) | no flag and fractional count equal to "each" (197) | 197 each | PASS |
| U4 fractional (Each, EACH, " each ", NBSP, EA, ea; and kg, pcs, set, box, m, l, g; mixed EA and "Kg ") | each-family: 197 = count recomputed from raw rows; other units: 0; mixed: equals raw recomputation and is below 197 | as expected | PASS |
| U5 unknown or ambiguous (19 spellings incl. pack, Pack, pc, lb, kgs, ea., each., eaches, e a, zzz, empty, blanks, zero-width each, each/EA, cs, tub) | still flagged; 0 fractional lines (not treated as each) | all flagged, 0 | PASS |
| U5 no conversion / no rewriting (pack stays pack; " kg\t" accepted but cell text unchanged, also after an export) | uploaded cells unchanged | unchanged | PASS |
| U6 genuinely different units (three materials in pack; kg/each/m mix) | flag lists exactly the three; mix: no flag, fractional only on each materials | as expected | PASS |
| U7 no unit column; number 5 in the cell | no flags; 5 still flagged | as expected | PASS |
| U8 calculations (Northstar with each-materials written as " each", Each, EA, "ea ", plus " kg") | items, classes, actions, safety stock, ROP, cover, value, suppliers, totals identical to Northstar | identical | PASS |
| U9 Northstar itself | no unit flag; 131 fractional lines | no flag; 131 | PASS |
| U10 screens and export (EA workbook, pack workbook) | EA: no unit row, fractional row present in Data quality tab and ENG_DataQuality; pack: unit row still present in both | as expected | PASS |
| U11 versus Phase 1 final on all 17 fixtures | identical results, findings and export sheets | identical (51 checks) | PASS |
| U11 EA-variant workbook versus Phase 1 final | calculated results identical; false unit flag gone; fractional flag now present | as expected | PASS |
| test-uom total | 164 | 164 passed, 0 failed | PASS |
| negative control: test-uom U1-U10 against Phase 1 final code | should fail where the fix matters | 28 of 110 fail (U2 9, U3 7, U4 8, U5 1, U10 3) | as expected |
| compare-trees (Phase 1 final vs Phase 2, 23 workbooks) | only data-quality findings and their screens change | 18 identical; 5 differ only in dq, Data quality, Client questions, Summary tabs and ENG_DataQuality | PASS (no unexpected difference) |

## Full regression
| Suite | Expected | Actual | Result |
|---|---|---|---|
| test7, test8, test9, domtest, domtest2 (UTC and Europe/London) | 118 (summary line 111), 47, 57, 30, 18 pass | same, both zones | PASS |
| test-failed-import, test-export-nohistory, test-timezones, test-po-edge, test-structure, test-paging | 18, 19, 15, 35, 34, 23 | same | PASS |
| test-fillcap, test-export-repeat, test-cache, test-phase1, test-blank-qty | 276, 24, 15, 125, 18 | same | PASS |
| check-globals | 108 | 108 passed (85 top-level names; the three new names UOM_KNOWN, UOM_ALIAS and canonUom are unique) | PASS |
| verify.py (independent pandas) | 17 | 17 | PASS |
| 16 supplier scenarios (verify_sup.py + stored output) | all PASS | 16 of 16 | PASS |
| v0.5 golden and v0.6 baseline, 10 sections, UTC, London, New York, Kolkata, Auckland | identical | 10 of 10 comparisons ALL SECTIONS IDENTICAL | PASS |
| test-paging-chrome / test-responsive-chrome / test-suppliers-export-chrome / browser-chrome / check-standalone | 59 / 35 / 72 / 53 / 40 | same | PASS |
Chrome tests are desktop Chrome resized or emulating a phone; none is a physical Android test.

## Remaining issues and unverified items
- "pack" (and pc, lb, kgs ...) is still flagged: unit sizes cannot be known, so it needs your decision whether to add them (each would be a new alias).
- A unit in a Products or Materials cell is checked, but units are never compared between Materials, BOM and purchase orders (no such data exists in the workbook).
- Zero-width and other invisible characters inside a unit are not trimmed, so such a unit stays flagged (deliberately).
- Still open from Phase 1: blank-quantity NaN behaviour (documented, not changed); impossible-quantity lines still scored; real Android device testing unverified.

# Candidate 4, Phase 3 (base: tag v0.6-candidate-4-phase2)
Individual results are in tests/logs/regression-p3b-20261109T194924Z.log (Node, UTC and Europe/London, node v22.23.4) and tests/logs/chrome-standalone-20261109T195415Z.log. Nothing below is a physical Android test.

## Pre-Phase 3 check
| Test | Expected | Actual | Result |
|---|---|---|---|
| B.1 one live views['Forecast accuracy'] (test-prephase3 B.1a-c) | exactly one, line 112 | one | PASS |
| B.2 Math.min(100,fill) retained (B.2a-c) | present, line 109 | present | PASS |
| B.4 static (B.4a-g) | 200/50 rows, matchMedia 600px, 150 ms debounce, state outside redraw | present | PASS |
| B.4 real Chrome rotation 412x915 and 360x800 | one redraw, 50<->200 rows, scroll, Show all, SKU kept | initially scroll lost; fixed; now all kept | PASS after fix |
| test-prephase3 total | 41 | 41 passed, 0 failed | PASS |

## Item 2: missing-value detection (test-missing-values, 63 checks)
| Test | Expected | Actual | Result |
|---|---|---|---|
| M0 Northstar unchanged | no missing-value finding | none | PASS |
| M1/M2/M3 five representations (empty cell, empty string, spaces, tab+nbsp, formula "") in first row, later row, three rows | "Missing values in Country" with true rows 2 / 6 / "2, 6, 9" | as expected, 15 checks | PASS |
| M4 same five, every row | "Column Country contains no values" (Medium) | as expected, 5 checks | PASS |
| M5 zero, column of zeros, zero Allocated_Qty, FALSE, "0" | not flagged | not flagged | PASS |
| M6 text TBC, n/a, unknown, - | not flagged as missing | not flagged | PASS |
| M7 Excel error cell | reported as missing row 4 | as expected | PASS |
| M8 header with no cells | blank-column finding | as expected | PASS |
| M9 column removed completely | no finding | none | PASS |
| M10 one value in blank column | "Missing values", 6 example rows | as expected | PASS |
| M11/M12 eight sheets: whole column blank / first-row blank | finding against the right sheet | as expected, 16 checks | PASS |
| M13 duplicate header names | Notes missing; Notes_1 blank | as expected | PASS |
| M14 calculations untouched | items, classes, suppliers, totals identical | identical | PASS |
| S1-S5 Data quality, Client questions, Summary screens | three findings listed, count +3, no NaN, Summary unchanged | as expected | PASS |
| E1-E3 ENG_DataQuality export | rows = findings, row 2 example, no NaN | 8 rows = 8 findings | PASS |
| D1 four existing fixtures | findings well formed | PASS | PASS |
| negative control: same test on Phase 2 code | should fail | 42 of 63 fail, 21 pass | as expected |

## Item 4: finished-goods note (test-fglt-note, 105 checks over 23 workbooks x 2 policies)
| Test | Expected | Actual | Result |
|---|---|---|---|
| C1 calculated values vs Phase 2 | identical | identical in all | PASS |
| C2 every screen except Data quality vs Phase 2 after removing the three sentences | identical | identical in all | PASS |
| C3 data-quality findings vs Phase 2 | identical except willow missing-value change | as expected | PASS |
| N1-N3 note present on Reorder policy, Finished goods, Settings | present | present | PASS |

## Updated tests (expected-change assertions only)
test-phase1 125/125 (1e tolerates only the three Phase 3 sentences); test-blank-qty 18/18 (first-row blank now flagged); test-uom 164/164 (U11 willow exemption). The first regression run (p3-20261109T194317Z) failed these exact assertions (12 + 1 + 2) before they were updated; the clean rerun is p3b.

## Full regression (UTC and Europe/London, identical both zones)
test7 118 (summary line 111), test8 47, test9 57, domtest 30, domtest2 18, test-failed-import 18, test-export-nohistory 19, test-timezones 15, test-po-edge 35, test-structure 34, test-paging 23, test-fillcap 276, test-export-repeat 24, test-cache 15, test-phase1 125, test-blank-qty 18, test-uom 164, test-missing-values 63, test-fglt-note 105: all 0 failed. check-globals 111 passed. verify.py 17 pass. 16 of 16 supplier scenarios PASS.
Golden: v0.5 golden, v0.6 baseline and Phase 2 (primary), 10 sections, UTC, London, New York, Kolkata, Auckland: ALL SECTIONS IDENTICAL (15 of 15). Data-quality differences in golden workbooks: none (Northstar has no blank columns).
compare-trees Phase 2 vs Phase 3 (23 workbooks): no calculated result differs. Differences: Finished goods, Reorder policy and Settings tabs (new note) in all 23 [reporting]; structure/willow also dq, Data quality tab and ENG_DataQuality [data-quality, expected, caused by item 2]. Unexpected differences: none.
Chrome (desktop Chrome, emulated narrow screens): test-prephase3 41, test-paging-chrome 59, test-responsive-chrome 35, test-suppliers-export-chrome 72, browser-chrome 53: all pass. check-standalone 40 pass. verify-protected.sh: all protected candidates, ZIPs and snapshots unchanged.
Investigation scripts (not pass/fail tests): investigate-blank-qty.js, investigate-forecast-credibility.js (accuracy matched an independent recomputation in 44 of 44 runs).

## Open
Real Android device testing unverified. Blank-quantity treatment, forecast-confidence changes and any FG production variability await your decisions (see investigation reports).

# Candidate 4, Phase 3B (base: tag v0.6-candidate-4-phase3)
Full regression log: tests/logs/regression-20261109T2230Z.log (Node, UTC and Europe/London, node v22.23.4; exit 0). Chrome runs are headless Chrome with emulated narrow screens, NOT a physical Android device. Earlier runs 20261109T2100Z (aborted when the shell ended), 20261109T2110Z (stopped by me) and 20261109T2130Z (failed, see below) are kept in logs/ or were superseded.

## Targeted supplier tests: test-supplier-eligibility.js, 301 checks, PASS
Independent re-derivation of every score. Groups: A representations of a bad quantity (blank, spaces, text "120", negative, error cell); B zero and extreme values; C all lines bad for one metric -> null score, exact state string, other metrics kept; D invalid/missing Promised_Date (quantity evidence kept); E partial damage (one bad line does not make the supplier unassessable); F genuine poor performance still High risk; G blast radius (other suppliers unchanged); H open and future-due orders not failures; I no-history suppliers; J exports (blank not NaN, repeated exports, workbook not mutated); K Northstar identical to Phase 3.
Negative control: the same file run against the Phase 3 code fails (recorded when written). test-blank-qty 19 PASS (rewritten from "characterise the defect" to "assert the corrected behaviour").
## Targeted forecast tests: test-forecast-conf.js, 206 checks, PASS
Two consecutive, three consecutive, separated, mixed, MAD=0 and normal demand; confidence drops exactly one level where shift>0; label, Why text and warning agree; accuracy, bias, verdict, finding, dq and outlier counts identical to Phase 3 in every case; no High label beside a level-shift warning.
## Full regression results (each in both time zones)
test7 118 (summary line 111), test8 47, test9 57, domtest 30, domtest2 18, test-failed-import 18, test-export-nohistory 19, test-timezones 15, test-po-edge 35, test-structure 34, test-paging 23, test-fillcap 276, test-export-repeat 24, test-cache 15, test-phase1 101, test-blank-qty 19, test-uom 164, test-missing-values 63, test-fglt-note 105, test-forecast-conf 206, test-supplier-eligibility 301: all pass. check-globals 113. verify.py (independent, Northstar) 17/17. Supplier scenarios s0, nopo, allfuture, three, unknown, nohist: PASS (independent verify_sup.py); edge scenarios (dupexact ... willow): PASS.
Golden snapshots v0.5, v0.6 baseline, Phase 2 (primary): ALL SECTIONS IDENTICAL in UTC, London, New York, Kolkata, Auckland (15 of 15). Note: snapshot sections do not include forecast confidence text; that change is covered by test-forecast-conf and compare-trees.
Chrome: test-prephase3 41, test-paging-chrome 59, test-responsive-chrome 35, test-suppliers-export-chrome 72, browser-chrome 53: pass. check-standalone 40 pass (also on the unzipped ZIP, below). verify-protected.sh: all protected items OK.
## Failures found during Phase 3B and how they were resolved (no assertion weakened to hide a defect)
The first full run (…2130Z) failed: verify.py FG003 confidence (verifier lacked the approved rule: +1 point for shift>0 added to the verifier), test-timezones (same verifier), test-phase1 1e (Forecast accuracy and Settings tabs now differ by design: skipped, 24 fewer assertions, 125 -> 101), test-uom U11 (20: ENG_Suppliers compared on shared columns with the label normalised; the Confidence columns are excluded; everything else still exact), supplier-scenario stored outputs for nopo/allfuture/nohist (only the label/assessment strings differ: verified 0 other diff lines before replacing), test-prephase3 B.2b/B.2c (regex now expects the same cap and weights inside the new eligibility wrapper). test-fglt-note no longer compares suppliers or the changed tabs with Phase 2 (they are covered by compare-trees against Phase 3).
## Phase 3 -> Phase 3B comparison (compare-trees, 23 workbooks; logs/compare-trees-phase3-vs-3b.txt, logs/supplier-fields-phase3-vs-3b.txt)
Calculation: items, risk classes, reorder points, totals, DQ findings and PO reconciliation identical in all 23. Supplier: 246 rows; only change on these workbooks is 7 new fields and "Not assessed" -> "Not Assessed — Insufficient Evidence" (+ assessment text) for suppliers with no delivery history; all scores, classes and evidence otherwise identical. Forecast confidence: ENG_ForecastCredibility/Forecast accuracy differ where shift>0 (explained by decision 5). Interface: Overview, Suppliers, Data confidence, Settings (+ Summary and Client questions in the 3 supplier scenarios). Export: ENG_Suppliers (new columns/label), ENG_Confidence (wording), ENG_ForecastCredibility (confidence). Damaged-data scenarios: tests/INVESTIGATION-SUPPLIER-IMPACT.txt (e.g. one blank Received_Qty: SUP008 NaN/High risk -> 60.4/Medium risk; every Received_Qty blank: 15 High risk -> 0 High risk, 15 Not Assessed — Insufficient Evidence [Data problem], OTD kept). Summary weak-supplier list: SUMMARY-WEAK-SUPPLIER-IMPACT.txt (Northstar identical; the SUP008 blank case drops SUP008 from the list, the all-blank case empties it and states 15 are not assessed; all intentional).
## Open
Overdue-at-snapshot orders (decision needed), numeric-text parsing (v0.7), physical Android testing not done.

# Candidate 4, Phase 4 (final verification gate) - candidate v0.6-candidate-4-rc
Base: tag v0.6-candidate-4-phase3b, commit e265f8b268302ae0c6eea5743b5c84a9acace4d9, ZIP SHA-256 27e928dbb0acd52d4a59643a2883aa06aecbcd85576480d928200bfb967058a2 (verified unchanged at the start). Machine: 2 CPU, 8 GB, Node v22.23.4, Playwright Chromium / puppeteer-core Chrome. **All browser results are headless desktop Chrome (resized window, CPU throttle); nothing was tested on a physical Android device.**
Evidence kept: tests/logs/regression-p4-20261109T2200Z.log (run-regression.sh, totals per suite, both time zones, golden, scenarios), tests/logs/p4-verbose/{UTC,Europe_London}/<suite>.log (EVERY individual assertion, PASS or FAIL line, for 22 Node suites x 2 zones), tests/logs/p4-chrome/*.verbose.log (every assertion of the Chrome suites), tests/logs/p4-chrome/verify-py-northstar.log, tests/logs/p4-golden/, tests/logs/p4-compare-*.txt, tests/logs/perf-p4-*.log.
Order note: the regression above ran first; afterwards ten test files gained a logging-only VERBOSE line (no assertion changed) and were re-run in both zones (all counts identical); the run-verbose.sh logs are those re-runs.
## Section 2 architecture and constraint check
| Constraint | Test | Expected | Actual | Result |
|---|---|---|---|---|
| 1 materials of Not Assessed suppliers stay in supplier-risk and material-risk analysis | test-na-constraints (5 scenarios) | all present; counts equal independent counts | as expected | PASS |
| 2 null scores sort, filter and render | same + all 17 tabs | no crash, no NaN text, unscored after scored, no High risk from null | as expected | PASS |
| 3 not silently removed from other calculations | same | item counts and classes unchanged, totals finite | as expected | PASS |
Total 88 checks, 0 failed; no negative control was run for this test.
## A. Node regression, UTC then Europe/London (identical)
Each row below is one suite in one zone; individual assertions are in logs/p4-verbose.
| Suite | Result | Reported |
|---|---|---|
| **TZ=UTC** | | |
| test7 | PASS | summary 111 pass 0 fail (118 checks; the last 7 run after the summary line) |
| test8 | PASS | summary 47 pass 0 fail |
| test9 | PASS | summary 57 pass 0 fail |
| domtest | PASS | summary 30 pass 0 fail |
| domtest2 | PASS | summary 18 pass 0 fail |
| test-failed-import | PASS | test-failed-import: 18 passed, 0 failed |
| test-export-nohistory | PASS | test-export-nohistory: 19 passed, 0 failed |
| test-timezones | PASS | test-timezones: 15 passed, 0 failed |
| test-po-edge | PASS | test-po-edge: 35 passed, 0 failed |
| test-structure | PASS | test-structure: 34 passed, 0 failed |
| test-paging | PASS | test-paging: 23 passed, 0 failed |
| test-fillcap | PASS | test-fillcap: 276 passed, 0 failed |
| test-export-repeat | PASS | test-export-repeat: 24 passed, 0 failed |
| test-cache | PASS | test-cache: 15 passed, 0 failed |
| test-phase1 | PASS | test-phase1: 101 passed, 0 failed |
| test-blank-qty | PASS | test-blank-qty: 19 passed, 0 failed |
| test-uom | PASS | test-uom: 164 passed, 0 failed |
| test-missing-values | PASS | test-missing-values: 63 passed, 0 failed |
| test-fglt-note | PASS | test-fglt-note: 105 passed, 0 failed |
| test-forecast-conf | PASS | test-forecast-conf: 206 passed, 0 failed |
| test-supplier-eligibility | PASS | test-supplier-eligibility: 301 passed, 0 failed |
| test-na-constraints | PASS | test-na-constraints: 88 passed, 0 failed |
| **TZ=Europe/London** | | |
| test7 | PASS | summary 111 pass 0 fail (118 checks; the last 7 run after the summary line) |
| test8 | PASS | summary 47 pass 0 fail |
| test9 | PASS | summary 57 pass 0 fail |
| domtest | PASS | summary 30 pass 0 fail |
| domtest2 | PASS | summary 18 pass 0 fail |
| test-failed-import | PASS | test-failed-import: 18 passed, 0 failed |
| test-export-nohistory | PASS | test-export-nohistory: 19 passed, 0 failed |
| test-timezones | PASS | test-timezones: 15 passed, 0 failed |
| test-po-edge | PASS | test-po-edge: 35 passed, 0 failed |
| test-structure | PASS | test-structure: 34 passed, 0 failed |
| test-paging | PASS | test-paging: 23 passed, 0 failed |
| test-fillcap | PASS | test-fillcap: 276 passed, 0 failed |
| test-export-repeat | PASS | test-export-repeat: 24 passed, 0 failed |
| test-cache | PASS | test-cache: 15 passed, 0 failed |
| test-phase1 | PASS | test-phase1: 101 passed, 0 failed |
| test-blank-qty | PASS | test-blank-qty: 19 passed, 0 failed |
| test-uom | PASS | test-uom: 164 passed, 0 failed |
| test-missing-values | PASS | test-missing-values: 63 passed, 0 failed |
| test-fglt-note | PASS | test-fglt-note: 105 passed, 0 failed |
| test-forecast-conf | PASS | test-forecast-conf: 206 passed, 0 failed |
| test-supplier-eligibility | PASS | test-supplier-eligibility: 301 passed, 0 failed |
| test-na-constraints | PASS | test-na-constraints: 88 passed, 0 failed |

Other: check-globals 113/113 PASS; verify.py (independent Python, Northstar) 17 pass 0 fail; supplier scenarios s0, nopo, allfuture, three, unknown, nohist PASS (verify_sup.py + stored output identical); edge scenarios dupexact, dupkey, overrec, multiline, splitline, posupconflict, partial, overshort, combined, willow PASS.
## B. Golden comparisons
15 of 15 Northstar snapshot comparisons ALL SECTIONS IDENTICAL (v0.5, v0.6 baseline, Phase 2 x UTC, London, New York, Kolkata, Auckland). Phase 2 vs Phase 4 over 17 fixture files: 14 identical, 3 differ by supplier class label only. compare-trees: Phase 3B vs Phase 4 0 of 23 differ; Phase 2 vs Phase 4 23 of 23 differ for explained, expected reasons. See PHASE4-GOLDEN-COMPARISON-REPORT.md. Forecast-confidence golden coverage limitation retained.
## C. Browser (headless Chrome; not Android)
| Suite | Expected | Actual | Result |
|---|---|---|---|
| test-prephase3 (rotation 412x915 and 360x800, pagination 200/50, redraw, scroll) | 41 | 41 passed | PASS |
| test-paging-chrome (1,500 items, 50/200 rows, Show more/all, touch targets, no sideways scroll) | 59 | 59 passed | PASS |
| test-responsive-chrome (resize crossings, Show all, scroll, SKU selector and unapplied Settings kept across resize) | 35 | 35 passed | PASS |
| test-suppliers-export-chrome (supplier table columns, over-delivery fields, export agrees with display) | 72 | 72 passed | PASS |
| browser-chrome (desktop 1280 and Pixel 5 emulation, all tabs) | 53 | 53 passed | PASS |
| test-p4-chrome (17 tabs x desktop/412/360 x Northstar, nohist, one-blank-quantity workbook; overflow, tables scroll in own container, NaN text, Not Assessed display, SUP008 row, rotation, errors, unapplied Settings across tab switch) | 81 | 71 passed, 10 failed | **FAIL x10: 9 = Issue 1 (Settings lost on tab switch), 1 = Issue 2 (360 px Summary overflow)** |
test-p4-chrome was added in Phase 4 to close a coverage gap and is not part of run-regression.sh; its first run also showed a mistake in my own test (blanked all of SUP008's quantities, so Not Assessed was correct), fixed and re-run. The same two behaviours exist in Phase 2, Phase 3 and candidate 3.
## D. Performance: PHASE4-PERFORMANCE-REPORT.md. analyse() 5,000 items about 1.05 s PASS (target 2 s); about 20% slower than Phase 2; tab switching desktop 0 of 17 over 300 ms, simulated mobile 4x cold 3 of 17 over; 15,000 items informational.
## E. Code and architecture review: PHASE4-CODE-REVIEW-FINDINGS.md (lint 0 errors, 8 warnings; check-globals pass; 2 low issues, 2 informational).
## F. Standalone ZIP and source match
The ZIP's own SHA-256 cannot be written inside the ZIP. It, the tag, the commit and the source-match and standalone results are recorded in PHASE4-ZIP-VERIFICATION.txt, delivered beside the ZIP (copy also at /mnt/user-data/outputs/). The ZIP is built with git archive from tag v0.6-candidate-4-rc, so the commit is the one that tag names.
## Tests not run
Physical Android device; analyse() isolated under CPU throttle; network throttling (file:// load); negative control for test-na-constraints and test-p4-chrome; Edge/Firefox/Safari.
## Verified facts versus assumptions
Verified by execution: everything marked PASS/FAIL above. Assumption: the 20% analyse() slowdown is caused by the Phase 3 missing-value check (shown by interleaved A/B between tags, not by profiling the function).

# v0.6 candidate 4, FINAL HARDENING (tag v0.6-candidate-4-final)
Starting point (verified before any work): tag v0.6-candidate-4-rc = commit 555e448df9730b9116acbb73921efd38862416bb; RC ZIP SHA-256 48cff40d0395e745addeda6cc66b6af65f4d1399b36922c2755293e303b508d0 matched; earlier tags unchanged (c4-base ba034fd, phase1 61d6c0e, phase1-final 7664564, phase2 f663295, phase3 9a6656b, phase3b e265f8b, rc 555e448); 12 of 12 protected-item checks OK; Phase 3B ZIP hash 27e928db… unchanged. Work folder inventory-intelligence-engine-c4-final, branch candidate-4-final-hardening. All browser results are headless Chrome (resized windows / CPU throttle); **no physical Android testing was done.**
## 1. Investigation (before any fix)
**Settings (gate): the defect is genuine and exactly as reported.** Unapplied text exists only in the on-screen input boxes. views.Settings (js/app.js) is rebuilt from the applied configuration CFG on every show(), and no draft existed anywhere, so the value is truly discarded (not just visually reset). Measured in Chrome on the RC: z 1.9 and supMinPO 8 typed; CFG stayed 1.65 and 10 throughout (typing and navigating never touch the engine); after returning, the boxes showed 1.65 and 10; Recalculate then applied the old values; applying on the Settings screen worked; Reset worked. All 29 inputs share this path. The only other control that is redrawn, the Demand forecast SKU selector, already persisted in fsku. Impact: someone adjusting several assumptions and checking other tabs before applying lost every unapplied edit silently; no wrong calculation was ever produced because nothing unapplied was used. Because the finding matched the report, the authorised draft-state fix was applied.
**Summary overflow:** cause confirmed (the heading "Management summary – <file name>" is a single unbreakable word at 360 px; hiding it removed the 12 px overflow; the same in Phase 2/3). It is the only place the file name is shown in a heading; the status line with a long name does not overflow (checked at 360 and 412).
## 2. The 10 failed assertions of test-p4-chrome (RC run) and their resolution
All 10 map to the two known defects; none was a separate issue. No test was changed.
| # | Assertion (test-p4-chrome) | Checks | Expected | Actual on RC | Defect | After fix |
|---|---|---|---|---|---|---|
| 1 | [Northstar @ desktop 1280x800] unapplied Settings value | z typed 1.9, Overview, back | "1.9" | "1.65" | Settings | PASS |
| 2 | [Northstar @ 412x915] same | same | "1.9" | "1.65" | Settings | PASS |
| 3 | [Northstar @ 360x800] no horizontal PAGE overflow on any tab | scrollWidth vs width on 17 tabs | none | Summary 372>360 | Overflow | PASS |
| 4 | [Northstar @ 360x800] unapplied Settings value | same | "1.9" | "1.65" | Settings | PASS |
| 5 | [nohist fixture @ desktop] same | same | "1.9" | "1.65" | Settings | PASS |
| 6 | [nohist fixture @ 412x915] same | same | "1.9" | "1.65" | Settings | PASS |
| 7 | [nohist fixture @ 360x800] same | same | "1.9" | "1.65" | Settings | PASS |
| 8 | [one SUP008 quantity blank @ desktop] same | same | "1.9" | "1.65" | Settings | PASS |
| 9 | [one SUP008 quantity blank @ 412x915] same | same | "1.9" | "1.65" | Settings | PASS |
| 10 | [one SUP008 quantity blank @ 360x800] same | same | "1.9" | "1.65" | Settings | PASS |
Re-run on the final code: test-p4-chrome **81 passed, 0 failed** (logs/final-chrome/test-p4-chrome.verbose.log lists all 81).
## 3. The two fixes and their exact scope
Fix 1 (js/app.js, +5 lines): const setDraft={} (unapplied text keyed by setting, separate from CFG); an 'input' listener stores edits of [data-k] inputs; views.Settings shows the draft if present else CFG (HTML-escaped); applySettings (Recalculate) and Reset clear the draft. No storage, no calculation, validation, threshold or default touched; navigating only redraws.
Fix 2 (css/styles.css, 1 property): h2{...;overflow-wrap:anywhere}. File name kept whole and wrapped; no truncation; no scrolling added.
Nothing else changed: js/calculations.js, js/forecasting.js, js/excel-import.js, index.html, assets/ are byte-identical to the RC.
## 4. New test for the fixes: tests/test-final-chrome.js (76 checks; headless Chrome; desktop, 412, 360)
F1 per width (x3): 7 values (z, supMinPO, outZ, abcA, ltMinSup, supMed, basis) survive 3 rounds through the 16 other tabs; CFG unchanged by typing and navigating; zero analyse() and zero run() calls while switching tabs; untouched setting shows its applied value; rotation keeps the draft; Apply applies all 7 and clears the draft; Settings then shows applied values; out-of-range draft (z=99) kept as typed then clamped by Apply exactly as before; Reset restores defaults and clears the draft; no console errors. F1 equivalence: after changing z and supMinPO and applying, items, risk classes, suppliers, DQ count and totals identical to the RC. F2 per width x (normal, 141-character file name): no horizontal page overflow on any of 17 tabs, heading keeps the whole name, heading fits its box, no console errors; layout (position and size of every element) of all 17 tabs identical to the RC at desktop, 412 and 360 (360: only Summary may differ). Negative control: run against the RC, the F1 assertions FAIL (4 assertions FAIL: draft lost, Apply, rotation; the run then ended without a summary line, probably because the RC has no setDraft variable; not investigated further). Result on final code: 76 passed, 0 failed.
## 5. Full regression on the final code
Evidence: tests/logs/regression-final-20261109T2300Z.log (totals) and tests/logs/final-verbose/{UTC,Europe_London}/ (every assertion: 3,552 PASS lines, 0 FAIL, 22 suites x 2 zones) and tests/logs/final-chrome/.
| Suite | Result | Reported |
|---|---|---|
| **TZ=UTC** | | |
| test7 | PASS | summary 111 pass 0 fail (118 checks; the last 7 run after the summary line) |
| test8 | PASS | summary 47 pass 0 fail |
| test9 | PASS | summary 57 pass 0 fail |
| domtest | PASS | summary 30 pass 0 fail |
| domtest2 | PASS | summary 18 pass 0 fail |
| test-failed-import | PASS | test-failed-import: 18 passed, 0 failed |
| test-export-nohistory | PASS | test-export-nohistory: 19 passed, 0 failed |
| test-timezones | PASS | test-timezones: 15 passed, 0 failed |
| test-po-edge | PASS | test-po-edge: 35 passed, 0 failed |
| test-structure | PASS | test-structure: 34 passed, 0 failed |
| test-paging | PASS | test-paging: 23 passed, 0 failed |
| test-fillcap | PASS | test-fillcap: 276 passed, 0 failed |
| test-export-repeat | PASS | test-export-repeat: 24 passed, 0 failed |
| test-cache | PASS | test-cache: 15 passed, 0 failed |
| test-phase1 | PASS | test-phase1: 101 passed, 0 failed |
| test-blank-qty | PASS | test-blank-qty: 19 passed, 0 failed |
| test-uom | PASS | test-uom: 164 passed, 0 failed |
| test-missing-values | PASS | test-missing-values: 63 passed, 0 failed |
| test-fglt-note | PASS | test-fglt-note: 105 passed, 0 failed |
| test-forecast-conf | PASS | test-forecast-conf: 206 passed, 0 failed |
| test-supplier-eligibility | PASS | test-supplier-eligibility: 301 passed, 0 failed |
| test-na-constraints | PASS | test-na-constraints: 88 passed, 0 failed |
| **TZ=Europe/London** | | |
| test7 | PASS | summary 111 pass 0 fail (118 checks; the last 7 run after the summary line) |
| test8 | PASS | summary 47 pass 0 fail |
| test9 | PASS | summary 57 pass 0 fail |
| domtest | PASS | summary 30 pass 0 fail |
| domtest2 | PASS | summary 18 pass 0 fail |
| test-failed-import | PASS | test-failed-import: 18 passed, 0 failed |
| test-export-nohistory | PASS | test-export-nohistory: 19 passed, 0 failed |
| test-timezones | PASS | test-timezones: 15 passed, 0 failed |
| test-po-edge | PASS | test-po-edge: 35 passed, 0 failed |
| test-structure | PASS | test-structure: 34 passed, 0 failed |
| test-paging | PASS | test-paging: 23 passed, 0 failed |
| test-fillcap | PASS | test-fillcap: 276 passed, 0 failed |
| test-export-repeat | PASS | test-export-repeat: 24 passed, 0 failed |
| test-cache | PASS | test-cache: 15 passed, 0 failed |
| test-phase1 | PASS | test-phase1: 101 passed, 0 failed |
| test-blank-qty | PASS | test-blank-qty: 19 passed, 0 failed |
| test-uom | PASS | test-uom: 164 passed, 0 failed |
| test-missing-values | PASS | test-missing-values: 63 passed, 0 failed |
| test-fglt-note | PASS | test-fglt-note: 105 passed, 0 failed |
| test-forecast-conf | PASS | test-forecast-conf: 206 passed, 0 failed |
| test-supplier-eligibility | PASS | test-supplier-eligibility: 301 passed, 0 failed |
| test-na-constraints | PASS | test-na-constraints: 88 passed, 0 failed |

Static and verifiers: check-globals 114/114 PASS (one more top-level name, setDraft); verify.py (independent Python) 17/17; supplier scenarios s0, nopo, allfuture, three, unknown, nohist PASS; edge scenarios PASS; regression exit 0.
Chrome (existing suites, final code): test-prephase3 41, test-paging-chrome 59, test-responsive-chrome 35, test-suppliers-export-chrome 72, browser-chrome 53: all PASS; test-p4-chrome 81 PASS; test-final-chrome 76 PASS.
## 6. Golden comparisons (primary baseline: Phase 4 RC)
RC vs final: Northstar snapshot (10 sections) ALL SECTIONS IDENTICAL in UTC, London, New York, Kolkata, Auckland; all 17 fixture workbooks ALL SECTIONS IDENTICAL; compare-trees (23 workbooks: 17 files + 6 unit variants; all 17 screens, export sheets, confidence areas, result objects): 0 of 23 differ. Phase 3B vs final: identical (5 zones; 0 of 23). Historical (regression log): v0.5, v0.6 baseline and Phase 2 x 5 zones = 15 of 15 ALL SECTIONS IDENTICAL. Calculations, supplier classes, forecasts and exports are therefore unchanged. Limitation retained: forecast-confidence changes are covered by dedicated tests but are not fully represented in the historical golden snapshots.
## 7. Performance (tests/PHASE4-PERFORMANCE-REPORT.md, final section)
analyse() 5,000 items, RC vs final interleaved: 1,085/1,086/1,081 vs 1,106/1,028/1,119 ms (target 2,000 ms: met). Tab timings: no material regression (see report). The approximately 20% slowdown versus Phase 2 is ACCEPTED and documented.
## 8. Not run
Physical Android; Edge, Firefox, Safari; analyse() isolated under CPU throttle; network throttling.
