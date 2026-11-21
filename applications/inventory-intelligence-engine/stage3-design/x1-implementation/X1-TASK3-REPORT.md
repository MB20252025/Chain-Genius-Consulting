# X1 Numeric Integrity: task 3 report and independent-review package (21 Nov 2026)

**Status of X1: implemented as far as the owner's decisions allow; awaiting independent review and owner acceptance.**
- X1 is **not** accepted.
- No calculation is labelled or claimed Verified. Calculation correctness has not been independently recomputed.
- **Not committed, pushed, merged, tagged, published or deployed.** No Tag-6.
- Stage 2 and Stage 3A are not closed.
- Every check below is Claude's own testing (self-review), **not** independent review.
- `stage3-design/evidence/` was excluded from every command, copy, inventory, hash and test run.

Status words: Implemented · Tested – passed · Tested – failed · Partially tested · Not tested · Awaiting independent review · Awaiting owner
acceptance · Formally accepted (not used).

## 1. Implementation summary

**What the engine could not reliably do before X1:**
- One blank allocation on a raw material stopped the whole analysis.
- An item with unknown stock was shown as **healthy**: RM001 went from severity 3 and health 42 to severity 0 and health 100, its £785
  shortage vanished, and its reorder and safety-stock flags turned off.
- Replenish advice disappeared silently.
- Feasibility read unknown stock as 0, which could report a false shortage.
- One invalid cost reshuffled the ABC class of 75 unrelated materials.
- Unknown cover appeared as ">90 days".
- Blank demand cells produced NaN forecasts.
- Raw-material usage summed parent demand by row position (months mixed when a parent had a gap).
- Forecasts were fitted across gaps as if the months were consecutive.
- Negative allocations **added** stock.
- A zero BOM quantity silently created a zero requirement.
- Zero-cost stock counted as fully costed.

**What it can do now:**
- Every analysis completes.
- Each item is **Assessed** or **Not Assessed** with a specific reason (field, state, sheet row) from one shared record.
- Unknown inputs never produce a healthy status, a false flag, a 0 or a number in a total.
- Totals say how many items they cover.
- Missing demand months are unknown, not zero. Forecasts use only consecutive observed months and say so.
- Raw-material demand is calendar-aligned.
- Negatives are prohibited and zero BOM lines are invalid on both routes. Zero cost is flagged.
- Every listed view and the export say the same thing.

**Production modules materially changed:**
- `js/calculations.js`: `risk()`, dead-stock class, health, ABC, totals and coverage, demand history, raw-material usage, MRP, feasibility,
  data-quality warnings.
- `js/forecasting.js`: gap-aware fitting.
- `js/validation/x1-integrity.js`: decisions, the single reason channel, derived demand, D7.
- `js/app.js`: every listed view, the banner, partial totals.
- `js/excel-import.js`: the export.
- `js/engine/engine-api.js`: passes the risk policy.
- `index.html` and the version strings, from task 2.

**Satisfied by existing functionality (no production change needed):**
- Credibility already counted missing periods (`fcCred`).
- The import route already rejected negative Allocated/On_Order/Reorder_Point (CDv1).
- Gap-free histories needed no forecasting change: they are processed byte-identically. Evidence: all 16 non-Willow fixtures are identical.

**Incomplete, awaiting owner decisions (§7):**
- D1(a) import quarantine (Q4);
- D6 for items with no demand rows at all (Q1);
- two accepted records that encode the old behaviour (Q2, Q3).

## 2. Work packages

### WP5: field policies and calculation integrity: Implemented; Tested – passed (Node, browser); Awaiting independent review
- **Production code changed:** CR-10 (`calculations.js`), CR-12 (`x1-integrity.js`).
- **Behaviour changed:** Not Assessed severity, health, category, class, ABC; flags null; shortage, excess and cover non-finite (shown "–");
  totals non-finite when a component is unknown, with coverage `R.cov`; D1(b), D1(d), D7; feasibility; MRP.
- **Tests:** `test-x1-wp5.js` (new, 51 checks, five zones). Both sides:
  - every case asserts the affected items **and** that every other item equals clean data;
  - the 17 snapshot fixtures are fully assessed;
  - the engine and the shared record agree on five variants.
- **Evidence:** Node five zones; browser on every view (§3).
- **Preserved:** golden v0.5 and v0.6.0 identical (five zones); same-results 416; every import test; all clean fixtures unchanged.
- **Limitations:** Q2 (one Round 2 check fails by D1(d)); D1(a) import quarantine not done (Q4).

**WP5 acceptance criteria:**

| # | Criterion | Result |
|---|---|---|
| 1 | Unknown input can't produce a healthy status | Tested – passed |
| 2 | Severity, health, shortage, cover and flags are Not Assessed | Tested – passed |
| 3 | Each has a reason | Tested – passed |
| 4 | Items stay visible | Tested – passed |
| 5 | Totals and coverage are honest | Tested – passed |
| 6 | Unaffected items unchanged | Tested – passed |
| 7 | Clean snapshots unchanged | Golden: passed. Confidence: **one D6-driven line**, Q3 |
| 8 | All views tested in a real browser | Tested – passed |
| 9 | Both engine routes tested | Direct: passed. Import: engine harness passed; interface not testable |
| 10 | Both item sets proved | Tested – passed |

**Snapshot impact check:** all golden, confidence and browser fixtures (17 workbooks) were scanned on the canonical Inventory columns. There
are **no** negative Allocated/On_Order/Reorder_Point values, no zero `Unit_Cost_GBP`, no zero BOM quantity, no blank or invalid demand cells
and no text values. So D1(d) and D7 change no snapshot.

### WP6: demand history and forecasting: Implemented; Tested – passed; Awaiting independent review
- **Production code changed:** CR-11 (`calculations.js` history and raw-material usage; `forecasting.js` `gapSeg` / `gapTxt`).
- **Behaviour changed:** the engine now distinguishes:
  - recorded positive;
  - recorded zero (zero demand, "No recorded demand");
  - missing month (calendar slot null);
  - no usable history (rows present, none usable: Not Assessed);
  - insufficient consecutive history (no forecast, with the reason).
- **Raw materials:** derived demand is calendar-aligned; a month with a missing parent is unknown; an invalid BOM line makes usage unknown.
- **Tests:** in `test-x1-wp5.js` (blank cell, internal gap, short run, all blank, all zero, no rows (interim), derived months).
- **Willow prediction verified:**
  - exactly the **6 predicted finished goods** changed forecast (WF-B330, WF-E110, WF-F355, WF-I957, WF-K343, WF-N525);
  - **additionally**, 12 Willow raw materials changed usage, because of the calendar-alignment correction (Appendix C issue 20);
  - through it, one client-question count moved from 4 to 3 (`ing 017` left "reorder point insufficient");
  - `forecastCredibility` and `confidence` are unchanged; the 16 other fixtures are identical.
- **Limitation:** no rows at all is Q1.

### WP7: presentation and exports: Implemented; Tested – passed (real browser); Awaiting independent review
- **Production code changed:** CR-13 (`app.js`, `excel-import.js`).
- **Behaviour changed:**
  - "Not Assessed" plus the reason in Overview, Health, Finished goods, Materials, Excess & dead stock, Summary and MRP;
  - coverage on cards and totals;
  - partial totals labelled;
  - "–" instead of £0 when nothing was assessed;
  - a stock-cover "Not Assessed" band;
  - export option (a): empty cell plus `Assessment` plus `AssessmentReason`;
  - banner reviewed and amended (owner §6.1);
  - MRP "Not calculated" replaced by "Not Assessed".
- **Distinguished on screen:**
  - **Calculated:** normal figures.
  - **Partially calculated:** "partial: N of M items".
  - **Not Assessed:** status plus reason.
  - **Withheld:** "–" or "£–" with that status.
  - **Invalid or unavailable inputs:** banner and reasons naming the field, state and row.
- **Tests:** `browser-x1-chrome.js`, 334 checks (§3).

### WP8: regression, evidence, review package: done for this stage

## 3. Browser evidence (real headless Chrome 153; desktop 1280×800 and Pixel 5 EMULATION, not a physical device)

`browser-x1-chrome`: **334 passed, 0 failed**. Run log and 36 screenshots in `browser-evidence-20261121-task3/`: every listed view for two
variants on both screen sizes, plus MRP for all five variants.

- **Variants:** clean; one blank allocation; three blank; column absent; invalid mix (allocation "abc", cost "n/a", on-hand blank).
- **Per variant and screen size:**
  - the upload completes;
  - `INTEG` equals `CGEngine.runEngine({}).integrity`;
  - exactly the expected items are Not Assessed;
  - each listed view shows them first with the reason, and no assessed item is mislabelled;
  - every unaffected item shown is identical to clean data;
  - Health averages only assessed items;
  - Overview and Summary cards count and name them;
  - the real export path gives empty cells with status and reason and no NaN;
  - all 17 tabs are free of NaN, Infinity, "Invalid Date" and "undefined".
- **Import route:** the Universal Import pipeline plus `runEngine` was exercised **in the real page** (harness).

**Explicit limitation (owner §4):** import-route engine containment and integrity behaviour have been exercised in a real browser through the
import harness. Import-route application presentation has **not** been tested, because the Universal Import pipeline does not yet have an
application upload interface. That remains future Universal Import work. Presentation outcome C has **not** passed on both routes.

**Physical Android: Not tested.** `MANUAL-ANDROID-TEST.md` gives a 9-step procedure for the owner.

## 4. Full regression (final tree, throwaway copy)

**Full tier: 47 tests passed (+ pre-flight), 3 FAIL, 5 BLOCKED, 2 REDUCED (57 tests).**
- FAIL `check-control`: the expected Tag-5 guard (owner §6.5).
- FAIL `stage3-round2`: 34 of 35. The one failing check is the negative-allocation assertion: Q2.
- FAIL confidence snapshot: 50 of 51. The one failing check is Willow `clientQuestions[6].ev`: Q3.
- BLOCKED and REDUCED: the same seven as at Tag-5 (task-2 report §3 C).

**Passing (selection):**

| Group | Tests and counts |
|---|---|
| Protection and structure | `check-protection` 448, `check-globals` 124, `test-a1-static` 30, `test-a1-sync-path` 76 |
| Import route | `import-stage1` 616, `import-mapping` 976, `import-engine-map` 276, `import-adapter` 346, `import-integrity` 396 |
| Route equality, Stage 3, snapshots | `same-results` 416, `stage3-quality` 28, golden v0.5 and v0.6.0 (5 zones) |
| X1 | `x1-foundation` 40, `x1-containment` 41, `x1-wp5` 51 (5 zones each), `browser-x1-chrome` 334 |
| Other browser and page tests | `browser-chrome` 53, `domtest` 30, `domtest2` 18 |

A last module change (performance, §5) was made after the full run; the fast tier was rerun on the final tree (see the addendum at the end).

**Tag-5 guard:** behaves as expected. It lists 8 changed approved lines, and Tag-6 must reconcile them together with the P3 and task-3
additions. Not altered.

## 5. Performance (Node, median of 5)

| Dataset | runEngine without X1 | runEngine with X1 | X1 record alone |
|---|---|---|---|
| Northstar, 150 items | 102 ms | 136 ms | 33 ms |
| Northstar ×10, 1,500 items | 974 ms (task 2: 872) | 1,113 ms | **107 ms** |

- A quadratic slowdown that I introduced in this task (1,879 ms at 1,500 items) was found by this measurement and fixed (indexed and cached
  derived demand).
- The engine is about 12% slower, from the calendar-indexed history. It is linear in items.

## 6. P3, registrations, accepted-assertion register

**P3:** applied after inspection (two weak checks tightened first): 444 → 447, verified. Then +1 (`test-x1-wp5.js`) → 448 with in-place
re-hashes and dated comments. Verified: 448 passed. No `js/` line.

**Accepted-assertion register (the four task-2 areas plus this task's):**

| Area | Status |
|---|---|
| 1. Stage 1 On_Hand refusal vs item containment | **Not changed.** D1(a) needs a Stage 2 adapter change (Q4) |
| 2. Stage 1 BOM-cell refusal | **Not changed.** A blank or invalid BOM cell is still refused by Stage 1 (quarantine needs the adapter, Q4). D1(b) zero = invalid is enforced by the engine on both routes, because zero passes the adapter |
| 3. Zero-demand warning severity | **Not changed.** No decision requires it; the §5.4 wording change was a proposal |
| 4. Global-count tests | Updated with superseding notes: `test-a1-static` 29→30; `check-globals` 116→119→124; `test-a1-sync-path` 74→76 |
| 5. "Not calculated" → "Not Assessed" (owner §6.3) | Only X1's own tests asserted it. Updated, with the superseded wording in comments; re-hashed under P3 |
| 6. Round 2 negative allocation; Willow confidence line | **Not amended.** Q2, Q3 |

## 7. Owner decisions required (only the affected work is stopped)

- **Q1 — D6 for an item with *no demand rows at all*.**
  - Conflict: D6 says unknown, but two accepted records require the old "zero demand, No recorded demand, all uncommitted stock is excess":
    Round 2 C-STK (FG050, 16 checks) and import I6 (M0058's £6,232.80 "false excess").
  - Interim: the old treatment is kept, and the integrity record marks the item `no-rows`.
  - Options: (a) apply D6 (Not Assessed) and authorise superseding notes on those Round 2 / I6 assertions; (b) keep the interim.
  - **Recommendation: (a)**, because I6 itself calls the figure "false excess".
- **Q2 — Round 2 assertion.** "A negative allocation … gives the same uncommitted figure (15)" contradicts D1(d). Authorise a superseding
  note on that one check (frozen Round 2 record)?
- **Q3 — Willow confidence-snapshot line** (`clientQuestions[6].ev` "4 items" → "3 items", D6/WP6).
  - The candidate is in `candidate-snapshot-Q3/`, not registered. It differs from the accepted snapshot in exactly that one item; the 17
    fixtures are identical across 5 zones.
  - Options: (a) register it as a new dated snapshot, keeping the old one, with a registry note and a checksum line (the 16 Nov precedent);
    (b) extend the permitted-differences mechanism to confidence snapshots (`run-all.sh` change).
  - **Recommendation: (a).**
- **Q4 — D1(a) import quarantine.** The Stage 2 adapter refuses the whole import when a counted stock row has no on-hand, and it sums
  locations. Quarantine therefore needs an adapter change: an item with a quarantined row would be written with unknown values and reasons
  (Not Assessed), never refused and never partly summed. Authorise that Stage 2 change?

## 8. Review package (all in `stage3-design/`)

- **Design:** `X1-NUMERIC-INTEGRITY-DESIGN-v2.md`, with §13.1 owner decisions, §13.2 implementation notes, revision rows 1–11 and Appendix C
  issues 1–23.
- **Design history:** `x1-implementation/design-history/` (original Part 1 plus diff). v1 is unchanged.
- **Change record:** `x1-implementation/X1-CHANGE-RECORD.md` (CR-01 to CR-16).
- **Reports:** `X1-IMPLEMENTATION-REPORT.md` (task 1, with addendum), `X1-TASK2-REPORT.md`, this report.
- **Evidence:**
  - `browser-evidence-20261121/` (task 2) and `browser-evidence-20261121-task3/` (36 screenshots, log, SHA256SUMS);
  - `candidate-snapshot-Q3/`;
  - `P3-PREPARED-CHECKSUM-LINES.txt`.
- **Proposals and procedures:** `STAGE3A-PROPOSAL-test-paging-chrome.md`, `MANUAL-ANDROID-TEST.md`.
- **Start states:** `start-state/`, `start-state-2/`, `start-state-3/` (all preserved).

**Changed-file inventory, task 3** (from `start-state-3/tree.sha256`; evidence folder excluded; nothing removed):

| Type | Files |
|---|---|
| Changed, production | `js/calculations.js` (still 217 lines), `js/forecasting.js`, `js/app.js`, `js/excel-import.js`, `js/engine/engine-api.js`, `js/validation/x1-integrity.js` |
| Changed, tests and records | `tests/accepted-results.json`, `tests/checksums.txt`, `tests/README.md`, `tests/test-x1-foundation.js`, `tests/test-x1-containment.js`, `tests/browser-x1-chrome.js` |
| Changed, documents | the v2 design, `X1-CHANGE-RECORD.md` |
| Added | `tests/test-x1-wp5.js`; `start-state-3/` (3); `candidate-snapshot-Q3/` (1); `MANUAL-ANDROID-TEST.md`; `STAGE3A-PROPOSAL-test-paging-chrome.md`; this report; `browser-evidence-20261121-task3/` (38) |

**Git:** HEAD `eddf09b`, 6 tags, 0 stashes and an empty index, as at the start.

## 9. Still blocked, reduced, untested or awaiting decision

- **Blocked or reduced:** the seven tests of task-2 §3 C (unchanged since Tag-5).
- **Untested:** physical Android; import-upload interface (none exists).
- **Awaiting owner decision:** Q1 to Q4.
- **Awaiting independent review:** everything in this report.
- **Unchanged and documented:** issue 8 (generic R7 reason on the import route); text-number policy (pending, REVIEW); route differences of v2 §7.1.

## Addendum: fast tier on the final tree (after the §5 performance fix)

**Fast tier, throwaway copy: 33 tests passed (+ pre-flight), 3 FAIL (36 tests).** The three FAILs are the same as in §4 (Tag-5 guard, Q2, Q3).
Nothing new failed.

The X1 Node tests and `browser-x1-chrome` were also rerun directly on the final module:
- `x1-foundation` 40, `x1-containment` 41, `x1-wp5` 51;
- `browser-x1-chrome` 334;
- `check-protection` 448.

All passed. The evidence folder `browser-evidence-20261121-task3/` comes from that final run.
