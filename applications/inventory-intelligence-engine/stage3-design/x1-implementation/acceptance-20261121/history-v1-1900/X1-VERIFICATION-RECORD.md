# X1 verification record: tests, calculations, browser, performance, Android (21 Nov 2026)

*Self-verification by Claude, not independent review. Desktop and mobile results are headless Chrome with device emulation, not a
physical phone. Nothing here is labelled "Verified" in the governance sense (v2 §13.2).*

## A. Test register and results (candidate = `cd16dcc` + `js/app.js`)

**Full regression** (throwaway copy of the original working tree, evidence folder excluded, candidate files laid on top; 21 Nov 2026):

| Result | Count | Detail |
|---|---|---|
| Tests passed | **51** (+ pre-flight) | runner header "PASS: 52" includes the pre-flight row |
| FAIL | 1 | `check-control`, the Tag-5 guard. It fails by design until Tag-6: 3 checks over the same 9 approved lines, text identical to the material-integrity final run. Not hidden, not bypassed. Blocks Tag-6, not X1 acceptance (owner §6.5) |
| BLOCKED | 5 | test-fglt-note, test-forecast-conf, test-supplier-eligibility, phase2-comparison (historical trees and tags not available), test-paging-chrome (Playwright browser not installed). All pre-date X1 |
| REDUCED | 2 | test-phase1 57/125, test-uom 110/164 (historical comparison trees not available). Pre-date X1 |
| ERROR | 0 | |

**Key rows (all PASS):**

| Area | Tests |
|---|---|
| Snapshots | golden v0.5 and v0.6.0 (five zones); confidence v0.7 (51) |
| Protection | check-protection 451; check-globals 124; test-a1-sync-path 76 |
| X1 | x1-foundation 40; x1-containment 41; x1-wp5 56; x1-completion 48; x1-material-integrity 42; browser-x1-chrome 334 |
| Import and integrity | import-integrity 396 |
| Independent checks and browser | python-verifier 17; scenarios 16 (each checked by `verify_sup.py`); browser-chrome 53 |

**Not registered (run directly):** `test-x1-acceptance-wording.js`.
- 12 of 12 pass on the candidate.
- On the `cd16dcc` `app.js` the same test gives 4 passed, 8 failed, so it detects each of the three defects. The 4 that pass on both are
  the "unchanged" checks.
- Outputs are in `evidence-files/`.
- It is not registered because this authorisation forbids changing `accepted-results.json` and `checksums.txt`. The proposed registration
  lines are in `PROPOSED-REGISTRATION.txt`.

**Failed attempt, kept for the record:** the first run of the new test crashed in its own setup. My harness left out the alternate-policy
runs that `link()` needs. It was fixed in the test harness, not in the application.

## B. Calculation verification

What was independently recomputed (from the raw sheets, by separate code, never by calling the production formula):

| Check | Scope | Tolerance | Result |
|---|---|---|---|
| `python-verifier` (pandas, `verify.py`) | 17 independent recalculations on Northstar | as coded per check | 17/17 |
| `scenarios` runner row (`verify_sup.py` per scenario) | 16 supplier and edge scenarios | as coded | 16/16 |
| Calendar-month raw-material usage | all 100 materials, all 12 months | 1e-6 relative | match |
| FG001 average demand | hand calculation over the last 12 months | 1e-9 | match |
| Inventory value | Σ on-hand × cost from the sheet | 1e-6 | match |
| Partial value total with a negative cost | 149 of 150 items | 1e-6 | match |
| Exposed £/mo for RM001 | Σ parents' demand × price | 1e-6 relative | match |
| Material known part with an unidentifiable BOM line | 100 of 100 materials | 1e-6 relative | match (RM001 386.3822/mo) |
| Workbook-policy limit checks for RM001 | reorder point, safety stock, shortage £ | exact / 1e-6 | match |

**Limits:**
- These are Claude's own independent recomputations. The owner's 13.2 rule stands: calculation correctness beyond these checks has not
  been reviewed by a person.
- No accepted difference or tolerance was widened to make a check pass.

## C. Regression and baseline integrity

- **Snapshots:** golden v0.5, golden v0.6.0 and the registered confidence snapshot are unchanged and pass.
- **Clean data:** for clean Northstar, every tab's text is identical between `cd16dcc` and the candidate (old/new rendering comparison).
- **Calculation code:** unchanged since `cd16dcc` (`calculations.js` hash `5362c24b…` in both).
- **Protected records:** 451/451. No accepted count, snapshot, checksum line or difference-register entry was changed in this task.

## D. Browser and performance

**Browser** (headless Chrome; desktop 1366×900 and Pixel 5 emulation):
- browser-x1-chrome 334/334;
- browser-chrome 53/53;
- every checklist expectation for Tests 1–4 passes on the candidate (19/19, including Test 3 step 3, which failed on `cd16dcc` because of the
  banner sentence);
- no console errors.

**Performance** (this container; Node v22.23.4; medians):

| Measure | Budget | Result |
|---|---|---|
| `analyse()`, 5,100 items | < 2 s | **1,007 ms** (957–1,179 over 7 runs); 1,097 ms with a blank BOM line |
| Tab switch, Northstar, desktop / Pixel 5 + CPU 4× | < 300 ms | worst 64 / 164 ms |
| Tab switch, 5,100 items, desktop / Pixel 5 + CPU 4× | < 300 ms | worst 156 / 224 ms |

## E. Android physical test reconciliation

**Device and evidence:**
- **Device (owner-reported):** Samsung Galaxy S24, Android 16, Chrome (version not confirmed; not invented here).
- **Build tested:** the live test site, `cd16dcc`.
- **Retained evidence:** no screenshots from the physical tests were found in this workspace or in the uploads. The results below are
  owner-reported only.

| Test | Owner-reported | What changed since `cd16dcc` | Is the physical result still valid for the candidate? |
|---|---|---|---|
| 1 Clean Northstar | PASS: 17 tabs, dashboard, Excel export opened, print preview and Save as PDF, wide-table scrolling, all 100 materials, settings recalculation, reset, refresh | nothing on any tab (text identical) | **Yes** |
| 2 Blank Material_ID | PASS: detected, no mapping guessed, withheld, Data Quality explained | only Summary (reorder-point line) and Reorder Policy (reason instead of "No demand") | **Yes** for everything recorded; the two changed lines were not part of the recorded checks |
| 3 Missing ROP column | PASS with two wording observations | the two observations are fixed (DEF-A1, DEF-A2); the banner sentence corrected (DEF-A3) | **Yes** for detection, visibility, no-zero and calculated ROP. The corrected wording is verified by automation and emulation only |
| 4 Blank line, full BOM | PASS: Not Assessed, partial disclosed, MRP and money withheld, 100 rows exported, PO discrepancy separate | only Summary and Reorder Policy (as Test 2) | **Yes** for everything recorded |

**The two Test 3 observations:**
1. **"Missing ROP shown as within ±20%" was a genuine misleading wording.** The "Why" text fell through to "Within ±20%" for any verdict
   other than insufficient/excessive. It now says "No workbook reorder point to compare. The calculated ROP (N) is indicative only."
2. **"Review reorder points while 0 are too low" was a genuine contradiction.** It now says "Reorder points not checked" (no workbook ROPs),
   or "Reorder points: none look too low" (when they were compared).

**Further physical testing:**
- **None is requested now.** The changes are text only and are verified by automation and emulation.
- They cannot be seen on a phone until an authorised redeploy, because the live site still serves `cd16dcc`.
- If you later authorise a redeploy, an optional 2-minute spot check covers it: load `no-rop-column.xlsx`, then look at the banner, the
  Summary line 5 and one Reorder Policy row.
