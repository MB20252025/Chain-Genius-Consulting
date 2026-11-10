# Phase 4 code review findings and consolidated issue report
No application code was changed in Phase 4. Per the change-control rule every issue below is reported for your approval; none has been fixed.
## A. Checks performed (what was actually run)
| Area | Evidence | Result |
|---|---|---|
| JS errors / warnings | ESLint (earlier-phase config, with no-redeclare set to ignore redefinition of the app's own global names, which the config pre-declares; rules no-undef, no-redeclare, no-dupe-keys, no-use-before-define, no-unused-vars) over the 4 source files | 0 errors, 8 warnings: unused variables (app.js 12:57 _m, 38:270 p, 117:22 A; calculations.js 95:61 n, 116:15 useM; excel-import.js err x3). Harmless; not changed |
| Duplicate/conflicting definitions, globals, load order | check-globals.js | 113 of 113 pass (90 top-level names, 20 load-time references) |
| Cache invalidation, stale results | test-cache (15), test-failed-import (18) | pass, UTC and London |
| Export mutation | test-export-repeat (24), test-export-nohistory (19), test-supplier-eligibility group J (workbook and analysis data unchanged after repeated exports) | pass |
| Import/recalculation | test-failed-import, test-cache, test-timezones (15), test-phase1 (101), browser suites | pass |
| Null/missing values | test-missing-values (63), test-blank-qty (19), test-supplier-eligibility (301), test-na-constraints (88) | pass |
| Responsive rendering | test-responsive-chrome 35, test-paging-chrome 59, test-p4-chrome (see issues 1-2) | pass except issues 1 and 2 |
| Data integrity | independent verifiers verify.py 17/17, verify_sup.py on 6 supplier scenarios, verify_structure.py/edge scenarios | pass |
| Maintainability/modularity | read-only review | see D |
## B. Section 2 constraint check (Not Assessed suppliers): all three CONFIRMED (tests/test-na-constraints.js, 88 checks, 5 scenarios incl. nohist, nopo, one supplier with every received quantity blank, every quantity blank, one supplier with every promised date blank)
1. Materials stay visible: every Not Assessed supplier is in the supplier-risk ranking (R.supRisk has all suppliers); "Materials supplied" equals the Materials-sheet count and every material is a row in the material-risk analysis; "At-risk materials" equals an independent count; top-five Not Assessed suppliers display by name with the exact state string.
2. Null scores: Suppliers table orders score descending with all unscored after scored; supplier-risk ranking is at-risk count descending then score ascending with unscored last; a null score occurs exactly when the class is the state string; scored suppliers keep the 75/60 cut-offs; no null-score supplier is High risk; all 17 tabs render without exception or NaN/undefined/Infinity text; export has one row per supplier with blank score and the exact state string. (The Suppliers screen has no interactive sort or filter control; ordering is fixed in the engine, so "filtering" was verified only as the Summary weak-list filter, which never names a Not Assessed supplier.)
3. Not silently removed: item counts, finite value and cover for their materials, portfolio totals finite; blanking received quantities changed no item risk class or action versus intact Northstar (0 differences); blanking one supplier's promised dates also changed 0 items. Not run: a negative control (this test was not run against Phase 2 code to prove it can fail).
## C. Issues found
### Issue 1: unapplied Settings values are lost when you switch tabs (LOW; does not block)
- What: a value typed into Settings but not applied (for example Z 1.65 -> 1.9) returns to 1.65 after visiting another tab and coming back. The same edit survives resize and rotation (tested earlier and again now).
- Found by: test-p4-chrome.js (9 of 9 workbook/width combinations); confirmed identical in Phase 2, Phase 3 and candidate 3.
- Where: the Settings view is rebuilt from CFG each time the tab is shown (js/app.js line 169 views.Settings, rebuilt from CFG on every tab switch; unapplied edits are only protected across resize by the separate resize handler; Apply is applySettings(), line 163).
- Impact: usability only; the brief lists "no loss of unapplied Settings when switching tabs" as a check. No calculation, recommendation or export is affected; applied settings persist.
- Blocks PASS? No (pre-existing, low, documented). It is a failed listed check, so your call.
- Smallest safe fix (needs approval): keep unapplied edits in a small in-memory draft object updated on each input event, restore them when views.Settings renders, and clear it on Apply or Reset. No calculation touched.
### Issue 2: Summary overflows the page by 12 px at 360 px when the workbook file name is long (LOW; does not block)
- What: at 360 px width the page scrolls sideways (scrollWidth 372 > 360) on Summary with the Northstar file name (Chain_Genius_Project_001_Northstar_Dataset_1.xlsx); the heading "Management summary – <file name>" cannot wrap. Other tabs and the shorter-named workbooks did not overflow.
- Found by: test-p4-chrome.js; located by hiding elements one at a time (the heading is the only cause). Identical in Phase 2 and Phase 3.
- Where: js/app.js line 60 (the Summary h2 containing esc(R.title)); heading style in the stylesheet (h2 rules in css/styles.css line 13 and the max-width:600px block at line 29).
- Impact: a sideways page scroll of 12 px on narrow phones for long file names; nothing else.
- Blocks PASS? No.
- Smallest safe fix (needs approval): let long words in headings wrap (CSS overflow-wrap:anywhere on that heading). No colours, themes or contrast touched.
### Issue 3: analyse() is about 20% slower than Phase 2 (LOW; informational)
- 5,000 items: about 880 ms (Phase 2) to about 1,040 ms (Phase 3, 3B, 4); introduced in Phase 3 (missing-value check). Target under 2 s still met. See PHASE4-PERFORMANCE-REPORT.md. No fix proposed.
### Issue 4: tab switching misses 300 ms under the 4x CPU simulation (known; informational)
- Cold MRP 826 ms and Forecast accuracy 543 ms at 5,000 items; more at 15,000. Same pattern as earlier phases. The target was "where achievable". Not fixed; optimisation is out of scope without approval.
### Not defects but limits of this verification
No physical Android test; headless Chrome with a resized window and CPU throttling only; analyse() not isolated under throttling; no network throttling (file:// load).
## D. Maintainability and architecture (observations, no change proposed)
Classic scripts share one global scope; analyse() is a single very large function with dense one-line statements, so supplier and forecast logic are hard to review; the temporal-dead-zone hazard for isN/isD inside analyse() is a standing trap. This is the known v0.7 modularisation area and was not touched.

## Final hardening addendum
Issue 1 (Settings drafts lost on tab switch): investigated, confirmed genuine (not display-only), FIXED in js/app.js with an in-memory draft (setDraft); verified by test-final-chrome (76) and test-p4-chrome (81). Issue 2 (Summary 12 px overflow at 360 px): FIXED with one CSS property; verified with normal and 141-character file names on all 17 tabs at desktop, 412 and 360; layout of all tabs identical to the RC elsewhere. Issue 3 (analyse() about 20% slower): ACCEPTED, v0.6.1 candidate. Issue 4 (4x-throttle tab switching): ACCEPTED as a known limit.
Re-review of the changed code: check-globals 114/114 (setDraft declared before use; load order unchanged). ESLint (same config as the Phase 4 review) on the changed files: no errors. The draft is cleared on Apply and Reset only; it is deliberately kept across a new workbook import because it is still unapplied user text; no new defect found. No new defects discovered in this task.
