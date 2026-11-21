# X1 — Material-integrity correction (21 Nov 2026)

*Prepared by Claude under the owner's "X1 Final Material Integrity Correction". This is a rigorous internal technical review, not an
independent or external one. No commit, push, merge, tag, publish or deployment. No Stage 3A work, no Stage 2 closure, no formal X1
acceptance. `stage3-design/evidence/` was excluded from every command, hash, copy and test run. This report supersedes
`X1-COMPLETION-REPORT.md` §E, which is kept unchanged as history.*

## 1. The residual risk

The completion report said: *"If the bad line was meant for an already-assessed material, that material's usage is understated. The High
warning is the only control."* Example: RM001's valid lines give 386 units/month. A BOM line with a blank Material_ID could be more RM001 use,
yet 386 was shown as RM001's assessed usage. The owner did not accept a warning as the only control.

## 2. Investigation (before changing code)

- **Read and attribution.** `calculations.js` derives monthly usage per material from parent Units_Sold × quantity × (1 + scrap). An
  unidentifiable line was skipped (correctly, it is never guessed). But nothing marked the other materials' figures as possibly incomplete.
- **Which materials can be affected?** Any of them. A BOM row has SKU, Material_ID, quantity and scrap; nothing narrows which material a
  missing or unknown code meant. Choosing likely candidates would be guessing, which is prohibited.
- **What consumed the incomplete figure:** daily usage → cover, stock-out and lead-time flags; recommended safety stock and reorder point;
  MRP gross/net; excess quantity and £; annual value → ABC; variability → XYZ and "volatile" flags; months-since-use → dead stock;
  exposed £; totals. The High warning stopped none of these.
- **Related leaks found** (all fixed, §4):
  1. Feasibility: an order marked "Insufficient information" consumed **nothing** from the shared stock pool, so later orders could be
     judged feasible against stock that may already be used.
  2. Recommended policy: an incalculable safety stock gave "not below safety stock" and a **£0 shortage**.
  3. A material with an *invalid* BOM line still got annual usage **0** and an XYZ class from its incomplete history.
  4. "Materials not used in any BOM" named materials whose use could not be established; one warning printed "undefined".
- **Could the engine tell complete from incomplete usage?** No: there was no completeness state. That is what this change adds.

## 3. Engineering decision

| Situation | Treatment |
|---|---|
| A BOM line with a blank, whitespace-only or unknown Material_ID that **can add usage** | Every material's BOM-derived usage is **incomplete** |
| …its parent has **recorded zero sales in every month** | It provably adds 0, so materials with valid lines stay complete (the line is still reported, High) |
| Material with valid lines, usage incomplete | **Not Assessed.** Usage is unknown to every calculation. The known part is shown separately as "at least N (incomplete: not used in any calculation)" |
| Material with **no** valid line, while any bad line exists | **Unknown, not 0**, even if the line provably adds 0 (a structural 0 needs a complete, valid BOM: Q6) |
| Complete valid BOM, material on no line | Structural **0** (unchanged) |
| Products | Unchanged (their demand does not use the BOM) |
| Import route, blank or unknown component | Stage 1 refuses the import (unchanged; approved route difference) |
| Import route, item Stage 1 identified and then excluded (e.g. unit mismatch) | A **known** code. The adapter lists it, so it is never "could be any material" |

**Why this is the safest defensible option.** A narrower rule would have to decide which materials the line "probably" meant: that is
guessing. A wider rule (withholding products, or stock and value) would withhold results that demonstrably do not depend on the BOM. The
zero-sales exception is the only narrowing that is proven, not assumed.

## 4. Implementation and files changed

| File | Change |
|---|---|
| `js/calculations.js` (217 lines, inline) | completeness rule; `mPart`, `bomInc`; incomplete history not used; `exposed` unknown; feasibility propagation; recommended-policy safety stock unknown; warnings reworded; "(blank)" not "undefined"; excluded-item codes read locally (no new global) |
| `js/app.js` | "at least … (incomplete…)" cell; explanatory note; the labelled known part added to the Not Assessed reason (screen and export) |
| `js/validation/x1-integrity.js` | same rule in the shared record (`bom-incomplete`); materials told apart from products; excluded codes known |
| `js/import/adapter.js` | hidden workbook property `CGExcludedItems` (no sheet, cell or report change) |
| `tests/test-x1-material-integrity.js` | **new**, 42 checks |
| `tests/test-x1-completion.js` | 2 assertions superseded with dated notes; originals kept as `// [original]`; count 48 unchanged |
| `tests/accepted-results.json`, `tests/checksums.txt` | new entry; re-hash with the previous hash recorded; one new line |
| v2 design, change record, completion report, Android checklist | additive notes (§13.5; CR-28 to CR-31; issues 30–34) |

**What is withheld or protected for an affected material:** daily usage, cover, stock-out/lead-time/excess flags, recommended safety stock
and reorder point, MRP gross and net, excess quantity and £, annual value, ABC, XYZ, volatility, months-since-use, exposed £, severity and
health score. **What stays, and why:** stock, value, and the checks against the reorder point and safety stock **configured in the
workbook** (and the shortage £ from them). These compare stock with fixed limits and do not use usage (checked independently, §6). Under the
recommended policy, those limits come from usage and are withheld.

## 5. Tests and results

**New `test-x1-material-integrity.js`: 42 of 42 pass** (5 time zones in the runner). The owner's 16 scenarios, plus 17 (import exclusion):

| # | Scenario | Result |
|---|---|---|
| 1 | clean BOM: all 100 materials complete, usage = independent calculation; feasibility 16/33/1 as accepted | PASS |
| 2 | blank Material_ID: High warning names sheet row and parent | PASS |
| 3 | whitespace-only: identical to blank | PASS |
| 4 | unknown code: identical to blank, nothing mapped | PASS |
| 5 | already-assessed material (RM001): Not Assessed; known part 386.38 = independent; labelled; engine and record agree | PASS |
| 6 | material with no valid line: unknown, no partial figure, not called "unused" | PASS |
| 7 | two bad lines, two parents: both named; both parents' orders Insufficient | PASS |
| 8 | parent with recorded zero sales: every material unchanged and assessed (independent); a no-line material still unknown | PASS |
| 9 | complete BOM, unused material: structural 0 | PASS |
| 10 | BOM sheet missing: refused | PASS |
| 11 | quantity column missing: every material unknown, none at 0 (was: annual 0) | PASS |
| 12 | zero / negative / invalid quantity: existing handling; others unchanged | PASS |
| 13 | import route: bad component refused; clean import identical to direct | PASS |
| 14 | downstream: every usage-based figure withheld; configured-limit checks recomputed independently; recommended policy withheld; MRP Not Assessed; no feasible order after unknown use; totals 0 of 100 known; no misleading 0 | PASS |
| 15 | export: Not Assessed, reason, labelled known part; no "null/undefined/NaN" cell | PASS |
| 16 | no "null/undefined/NaN" in any reason, warning or feasibility text; every Not Assessed item has a reason | PASS |
| 17 | import: excluded known material (M0028) does not make others incomplete; control without the adapter list does | PASS |

Other X1 tests: foundation 40, containment 41, wp5 56, completion 48 (2 superseded with notes), browser-x1-chrome 334: all pass.

## 6. Independent calculation and reconciliation

- The test's own model (`indep()`) recomputes usage from the **raw sheets only**:
  - parent sales per calendar month, × quantity × (1 + scrap);
  - a month with no usable parent row is unknown;
  - the mean of the last 12 known months;
  - which bad lines can add usage.

  It never calls an engine function.
- **Clean data:** all 100 materials match the model.
- **Blank line under FG002:**
  - known part matches for 100 of 100 materials;
  - usage unknown for 100 of 100;
  - 0 materials assessed;
  - 50 of 50 products identical to clean data.
- **Trace:** `browser-evidence-20261121-material/RECONCILIATION.md`. It follows five materials from their BOM lines, through the independent value and the engine value, to the screen and export text, plus RM001 month by month. RM001's known part is 386.3822/mo independently and 386.3822 in the engine. The screen shows "at least 386 (incomplete…)"; the export shows "at least 386.4/mo, incomplete".
- **Workbook-policy checks** for RM001, recomputed from the Inventory sheet:
  - below reorder point: (on hand − allocated + on order) < reorder point;
  - below safety stock: (on hand − allocated) < safety stock;
  - shortage £ = (safety stock − available) × cost.

## 7. Regression, protection, browser, performance

- **Full regression** (fresh throwaway copy, evidence folder excluded): **51 tests passed (+ pre-flight), 1 FAIL, 5 BLOCKED, 2 REDUCED.**
  - FAIL: `check-control`, the Tag-5 guard. Its content is unchanged from earlier: the same 9 approved lines. New checksum lines show as
    PENDING for Tag-6. It is not hidden or bypassed.
  - BLOCKED: test-fglt-note, test-forecast-conf, test-supplier-eligibility, phase2-comparison, test-paging-chrome.
  - REDUCED: test-phase1 57/125, test-uom 110/164.
  - On the way, two intermediate runs caught real problems, both fixed before the final run:
    - `import-integrity` lost 15 checks: an excluded known material was read as an unknown code (fixed with the adapter list);
    - `check-globals` and `test-a1-sync-path` went one over their counts: I had added a new global (made local).

    No accepted count was raised to get past them.
- **Snapshots:** golden v0.5 10/10, golden v0.6.0 10/10, confidence snapshot 51/51. No snapshot changed.
- **Protection:** 451/451 (one new test file). No protected test or expected result was weakened, removed or overwritten.
- **Browser** (headless Chrome, desktop and Pixel 5 emulation; not a physical phone): 32/32 checks.
  - Covered: Materials, MRP, feasibility, excess, data quality and export, issue 26, and clean Northstar.
  - No console errors and no page overflow.
  - Screenshots are in `browser-evidence-20261121-material/`.
- **Performance** (5,100 items; before = start of this task, after = final; same machine, medians):

| Measure | Before | After | Budget |
|---|---|---|---|
| `analyse()`, clean | 1,053 ms | 1,148 ms | < 2 s: met |
| `analyse()`, with a blank line | 1,184 ms | 1,131 ms | < 2 s: met |
| Tab switch worst, desktop / Pixel 5 + CPU 4×, 5,100 items | 189 / 268 ms | 203 / 252 ms | < 300 ms: met |
| Tab switch worst, Northstar, desktop / Pixel 5 + CPU 4× | 77 / 222 ms | 86 / 274 ms | < 300 ms: met |

The differences go both ways and are within this machine's run-to-run noise. No material deterioration.

## 8. Working-tree inventory (since the completion task's end hashes)

HEAD `eddf09b` unchanged; index empty; 0 stashes; nothing removed; no evidence-folder path in any hash list.

- **Changed:**
  - `js/app.js`, `js/calculations.js`, `js/import/adapter.js`, `js/validation/x1-integrity.js`;
  - `tests/accepted-results.json`, `tests/checksums.txt`, `tests/test-x1-completion.js`;
  - v2 design, `X1-CHANGE-RECORD.md`, `ANDROID-CHECKLIST-FINAL.md`, and `X1-COMPLETION-REPORT.md` (a note was appended).
- **New:**
  - `tests/test-x1-material-integrity.js`;
  - this report;
  - `browser-evidence-20261121-material/`, holding 17 files: screenshots, results, reconciliation, timings, scripts, a workbook and the regression output.

## 9. Completion criteria

| Criterion | Status |
|---|---|
| An unidentified line cannot let an affected material look complete | **Met** (scenarios 5, 14, 15; browser) |
| Known partial usage is distinguished from complete | **Met:** separate field, "at least … (incomplete: not used in any calculation)" |
| No downstream calculation consumes incomplete usage as reliable | **Met:** all usage-based outputs withheld; feasibility propagates |
| Structural 0 distinguishable from unknown | **Met** (scenarios 6, 8, 9, 11) |
| Unaffected calculations unchanged | **Met:** products; clean data; zero-sales parent; snapshots |
| Tests pass; full regression reported; protection passes; documents and evidence complete | **Met** |

## 10. Remaining risks and limits

- **Wide but correct effect.** One unidentifiable line with real parent sales makes every material Not Assessed. This is intended: it is
  the price of not guessing, and the High warning tells the user which row to fix.
- **Configured-limit checks stay visible** for affected materials under the workbook policy. They are true statements about stock
  against fixed limits. Severity is still Not Assessed.
- **Feasibility propagation is conservative.** After an unknown order, later non-shortage orders become "Insufficient information".
  A certain shortage stays a shortage, with a note that it may be larger.
- **Hidden adapter list.** It is a new interface between Stage 2 and the engine. It is documented and tested, including the control
  case without it. A workbook saved to a file and reopened loses it; the only consequence is the safe side (codes read as unknown).
- **Deferred, not reopened:** D2, D5/E1, Q5, the D3 Stage 1 column-level part, the text-number policy, and the import-route policy difference. No import screen was built.
- **Physical Android not tested.** See the checklist addendum.

---
## Addendum, 21 Nov 2026, 15:55: documentation and evidence sanity check (owner request)

No production code, test, accepted result or protected evidence was changed. No regression was started.

1. **RECONCILIATION.md month labels: documentation error, corrected.**
   - The RM001 table showed 2026-03 twice and no 2026-10: April to October were labelled one month early. The figures were right.
   - Cause: my report script printed each month's UTC date. A British Summer Time month starts at 23:00 UTC on the previous day.
   - The engine is right: it converts dates to calendar days on load (`calDate`) and uses 12 distinct months, Nov 2025 to Oct 2026.
   - The independent test model is right: it groups rows by exact cell value, giving 12 groups.
   - Cross-check against the workbook cells: FG001/FG038 = 95/77 (Mar), 103/68 (Apr), 70/76 (Oct), as now labelled.
   - The correction and its cause are recorded in the file. The pre-correction copy is kept outside the repository, at
     `/home/claude/x1-t6-backup/RECONCILIATION.before-label-fix.md`.
2. **Android checklist: accurate, with one wording correction** (Addendum 2 in that file). Every expectation was re-checked against the
   final code (headless Chrome, Pixel 5 emulation). The re-check found finding 3.
3. **New finding, reported, not fixed (production code): the integrity banner's general sentence.**
   - It always says "Affected items stay in every list with the status Not Assessed …".
   - When the only problem is an absent Reorder_Point_Qty column, no item is Not Assessed (correct, issue 26), so the sentence overstates.
   - Severity: LOW (wording; no figure is wrong). A fix needs the owner's go-ahead.
4. **Build availability: the final X1 code exists only in Claude's workspace.**
   - Remote `development/v0.7` = local HEAD `eddf09b` (15 Nov, before X1); `main` = `8117c72`.
   - All X1 changes (49 paths) are uncommitted, by instruction.
   - The workspace files are byte-identical to the copy that passed the final regression.
   - Nothing was deployed or published.
