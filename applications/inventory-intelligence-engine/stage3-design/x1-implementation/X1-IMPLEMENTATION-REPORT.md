# X1 Numeric Integrity: implementation report (decision-independent work)

Date: 20 November 2026. Branch `development/v0.7`, HEAD `eddf09b` (unchanged). Nothing staged, committed, pushed, tagged or deployed.
Design: `../X1-NUMERIC-INTEGRITY-DESIGN-v2.md`. It is a complete **draft**, not approved. v1 is unchanged (hash `db1790fd…`).
`stage3-design/evidence/` was excluded from every command, copy and inventory in this task: it was not read, copied or relied on.

Status words in this report: **Implemented**, **Tested-passed**, **Tested-failed**, **Not tested**, **Partial**, **Awaiting decision**, **Known limitation**.
No figure is called "Verified". X1 does not verify anything; only a future independent CIS could.

## 1. Deliverables

| # | Deliverable | Status |
|---|---|---|
| 1 | Start-state record (`stage3-design/x1-implementation/start-state/` in the repository working tree, untracked: `STATE.txt`, `status-all-files.txt`, `tree.sha256`, `remote.txt`) | Implemented |
| 2 | Clarifications C1–C6 added to Part 1 of v2 | Implemented |
| 3 | Part 2 of v2 (§10–§14, Appendices A–C) | Implemented (draft) |
| 4 | D1–D7 decision register, with independent recommendations | Implemented; **Awaiting decision** |
| 5 | Outstanding issues register (Appendix C) | Implemented |
| 6 | Work packages WP1–WP8 and acceptance criteria | Implemented. WP1–WP4 done; WP5–WP7 **Awaiting decision**; WP8 run |
| 7 | Protection report (v2 Appendix B, plus §4 below) | Implemented |
| 8 | A. Field-state mechanism, 10 states, 7 fields | Implemented, Tested-passed |
| 9 | B. Provenance record (field, record, route, source row, state, raw value, transformations, reasons; JSON-safe) | Implemented, Tested-passed |
| 10 | C. Dependency registry: 13 engine calculations declared, including the `CFG.sup` difference | Implemented, Tested-passed |
| 11 | D. Calendar-indexed demand history: gaps kept in place, four conditions, D6 **not** applied | Implemented, Tested-passed |
| 12 | E. Crash containment, including the MRP date path | Implemented, Tested-passed (Node). The browser view is **Not tested** in a browser |
| 13 | Engine integration: `out.integrity` attached; `opts.integrity` for the import route | Implemented, Tested-passed |
| 14 | App MRP view: "Not calculated" shown with its reason; total labelled partial | Implemented; string check only, **Not tested** in a browser |
| 15 | F. X1 tests, in two new files | Tested-passed: 39 + 31 checks in 5 time zones |
| 16 | Regression, full tier in a throwaway copy | Tested: 46 passed (+ pre-flight), **2 FAIL** (see §3), 5 BLOCKED, 2 REDUCED |
| 17 | Four accepted-assertion areas: records prepared, no assertion changed | Implemented (records only); **Awaiting decision** |
| 18 | End-of-task protection check against the start inventory | Implemented: passed (§4) |

## 2. Files changed by this task (all other differences in the working tree existed before it)

| File | Change |
|---|---|
| `js/validation/x1-integrity.js` | **New** (307 lines). Defines `globalThis.CGValidation`. Does not read or write `CFG`, `R` or `WB`. **Not** loaded by `index.html` (§3, conflict P1). |
| `js/calculations.js` | Inline edits at lines 179, 180 and 182. Still 217 lines. In `mrpCalc` the dependency check now runs first: if available stock, receipts, usage or safety stock is not a finite number, the row becomes `st:'Not calculated'`, `nc:true`, with a `why` reason and null figures, before any arithmetic. `dt` also has a finite-number guard. A missing lead time gives no date and "Not calculated" urgency. A missing cost gives `val:null`. Valid rows are unchanged. |
| `js/engine/engine-api.js` | One line: attaches `out.integrity` when CGValidation is present; validates `opts.integrity`. The record sits outside `result`, so route comparisons are unaffected. |
| `js/app.js` | Lines 43, 44 and 46 (inline; still 210 lines). The MRP view shows the reason, a "Not calculated" count, and a total marked **partial** when a value is missing. |
| `tests/test-x1-foundation.js`, `tests/test-x1-containment.js` | **New** |
| `tests/accepted-results.json` | **Two lines added** (`x1-foundation` 39, `x1-containment` 31, five zones). Zero lines removed or changed. |
| `stage3-design/X1-NUMERIC-INTEGRITY-DESIGN-v2.md`, `x1-implementation/` | Design completion and this record |

Not changed: Stage 1 (`validate.js`, including `REQUIRED_UNMAPPED`), the adapter, the result gate, `checksums.txt`, `run-all.sh`, every protected test, every snapshot, baseline, tag and Stage 2 or Round 2 record.

## 3. Results and the two failures

The acceptance criterion for MRP is **met**. One blank `Allocated_Qty` on RM001, and the whole Allocated column absent, no longer end the run on either route.
- The affected rows are "Not calculated" with no figure.
- The other 99 of the 100 materials are identical to the clean run.
- No NaN date or number is published.

This is containment, not a calculation: the withheld rows have no answer.

Golden v0.5 and v0.6.0 (10/10 in 5 zones), the confidence snapshot (51), same-results (416), check-globals (116) and check-protection (444) all pass.

- **check-control FAIL.** This is the expected Tag-5 guard failure. Its three failing checks are about `run-all.sh`, the confidence-snapshot record and 7 `checksums.txt` lines, all changed in earlier Stage 3 work. X1 changed none of these. Its two new registry lines did not add a check-control failure.
- **test-a1-static FAIL: count 30, accepted 29 (conflict P2).** This test adds one check per file under `js/`, so any new module raises its count. The runner fails any count above the accepted one. The new check itself **passes** (the module does not touch `CFG`, `R` or `WB`). To clear the failure, the **existing** entry would need raising from 29 to 30. That is a protected historical entry, so I stopped there. I have not raised the count, and I have not moved the file to avoid the scan.
- **P1: browser loading.** Adding the module to `index.html` would break the protected `check-globals` load-list assertion and need its checksum re-hashed. So the browser does not load it yet. The MRP containment works in the browser regardless, because it lives in `calculations.js`; `out.integrity` is simply absent there.
- **P3: checksum lines.** Protecting the new files would mean raising check-protection's accepted 444, an existing entry. No checksum line was added.

## 4. End-of-task protection check

Compared with `start-state/tree.sha256` (evidence folder excluded; 0 evidence paths in either list):
- Added: the 3 new code and test files and `start-state/remote.txt`.
- Changed: the 4 engine and app files above, `accepted-results.json`, the v2 design, and `tree.sha256` itself. The inventory changed only because it listed itself while it was being written.
- Removed: none.

Git: HEAD, the tags (6), the stashes (0) and the index (empty) are as at the start. Every test run used a throwaway copy, `/tmp/x1-full2`, or wrote only to `/tmp`. ~~No artefact was created in the repository.~~ **Corrected 21 Nov (clarification B):** no *test-run* artefact was created in the repository. This task did create the files listed in the addendum below, all inside the repository working tree (untracked, not committed).

## 5. Accepted-assertion records (prepared; nothing changed)

| Area | Effect of this task | Record |
|---|---|---|
| 1. Stage 1 On_Hand refusal vs item containment | None: Stage 1 untouched | Awaits D3 (owner preference ii, defer Stage 1) |
| 2. Stage 1 BOM-cell refusal | None | Awaits D1 (whether a zero BOM quantity is invalid) |
| 3. Zero-demand warning severity | None | Awaits D6 |
| 4. Global-count tests and the `CGValidation` namespace | check-globals unaffected (module not in `index.html`). **New finding:** test-a1-static counts files (P2) | Superseding record needed only if you approve P1 and P2 |

## 6. Corrections made during the work (shown, not hidden)

- My month keys first assumed UTC first-of-month. This failed in Asia/Kolkata. The engine actually turns each date into UTC midnight of its calendar day (`calDate`, `excel-import.js` line 10), so the module now uses the same rule.
- Import-route periods arrive as text; a parity check caught that they were not converted. Fixed.
- One expectation in my own test was wrong: forecast *recommendation text* does use available stock. The check now compares forecast figures and asserts no NaN text. The underlying behaviour became Finding 1.
- One check I had written was always true. It was replaced before any run was recorded.

## Addendum, 21 Nov 2026: corrections from the independent review (clarification B)

This report is kept as written on 20 Nov. Corrections are marked in place and listed here; nothing else was rewritten.

**Location.** `start-state/` is `applications/inventory-intelligence-engine/stage3-design/x1-implementation/start-state/`, inside the repository
working tree. It is untracked and not committed. Its `tree.sha256` lists itself with a partial hash, because it was hashed while being
written, so that one line can never match.

**Complete list of files task 1 created or changed in the repository working tree** (from `start-state/tree.sha256` compared with
`start-state-2/tree.sha256`; evidence folder excluded):

| File | Created / changed |
|---|---|
| `js/validation/x1-integrity.js` | created |
| `tests/test-x1-foundation.js`, `tests/test-x1-containment.js` | created |
| `stage3-design/x1-implementation/start-state/STATE.txt`, `status-all-files.txt`, `tree.sha256`, `remote.txt` | created |
| `stage3-design/x1-implementation/X1-IMPLEMENTATION-REPORT.md` (this file) | created |
| `js/calculations.js`, `js/app.js`, `js/engine/engine-api.js` | changed |
| `tests/accepted-results.json` | changed (2 lines added) |
| `stage3-design/X1-NUMERIC-INTEGRITY-DESIGN-v2.md` | changed (C1–C6, Part 2); the original Part 1 is preserved in `design-history/` (clarification A) |

Nothing else changed. Task 2 is recorded in `X1-CHANGE-RECORD.md` and `X1-TASK2-REPORT.md`.

**Other statements in this report that task 2 supersedes:**
- Browser loading "Not tested" / P1 blocked: now implemented and tested in headless Chrome (CR-02).
- `test-a1-static` FAIL: resolved by P2 (CR-01).
- "Northstar … inputs-valid" remains true. The dependency record, however, wrongly listed 100 raw materials as withheld even on clean data.
  That is defect CR-06, now fixed. The §3 claims about MRP rows are unaffected.
