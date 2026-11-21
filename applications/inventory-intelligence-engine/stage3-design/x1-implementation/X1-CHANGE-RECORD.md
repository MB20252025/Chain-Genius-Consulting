# X1 change record: task 2 (21 Nov 2026)

Authority: the owner's "Controlled implementation, engineering autonomy and continued progress authorisation" of 21 Nov 2026.

- Task-2 start state: `start-state-2/`, taken 2026-11-21T01:20:22Z. Branch `development/v0.7`, HEAD `eddf09b`, index empty, 0 stashes,
  6 tags. 89 status lines, 1,885 files hashed. The evidence folder was excluded from every command.
- The task-1 record `start-state/` is unchanged.
- Nothing has been committed, pushed, merged, tagged, published or deployed.
- **Independent review:** none of the changes below has been independently reviewed. All testing is Claude's own.

Origin key: **R** = requested by the owner; **C** = initiated by Claude under the routine-fix authority (§2.1 of the authorisation).

## CR-01 · P2 · `test-a1-static` accepted count 29 → 30 (R)

- **What changed:** `tests/accepted-results.json`, in the `test-a1-static` entry: `accepted` 29 → 30. The note is extended; the earlier
  text is kept word for word.
- **Superseded record:** accepted 29, with the note "20 + one rule-2 check per new js/import file (… adapter, result-gate)". It is
  preserved in the entry's note and here.
- **Why 30 is correct:** rule 2 adds one check per `.js` file under `js/` that is outside the allowed list. The new file
  `js/validation/x1-integrity.js` is such a file.
- **Evidence:** `VERBOSE=1 node test-a1-static.js` prints `PASS js/validation/x1-integrity.js: does not touch CFG, R or WB (none)`. The test
  reports 30 passed, 0 failed (UTC and Europe/London).
- **Unchanged:** the test file (its checksum line is unchanged), its rules and its scope.

## CR-02 · P1 · browser loading of the X1 module (R)

| Item | Before | After |
|---|---|---|
| `index.html` script list | xlsx → calculations → forecasting → app → excel-import → engine-api | … → excel-import → **validation/x1-integrity** → engine-api |
| `tests/check-globals.js` EXPECT | 6 entries | 7 entries (module added before the wrapper); rules unchanged |
| `tests/checksums.txt` line for `tests/check-globals.js` | `c4964c20…246f` | `1a51855a…708c`, re-hashed in place, plus a dated `#` comment naming the old hash; no line added or removed (444 stays 444) |
| `check-globals` accepted | 116 | **119** = 116 + 1 (new file exists) + 2 (new top-level names `INTEG`, `x1Banner` in `app.js`, each declared once) |

- **Every affected assertion checked.** 23 test files read `index.html`. Only `check-globals` asserts the script list. The others load the page,
  and the full tier exercises them with the new script (§ results in the task report).
- **Load order:** the module has no dependencies and runs no engine code at load time. It is placed after `excel-import.js` and before
  `engine-api.js`, the wrapper that uses it.
- **Global state:** the module defines one name, `globalThis.CGValidation`, frozen. It reads or writes no engine global
  (`test-a1-static` rule 2 passes).
- **How the app receives the record:** `app.js` `run()` sets `INTEG = CGValidation.forEngineResult({workbook: WB, XLSX, result: R, sup: CFG.sup})`
  after the three analyses.
  - **Design choice:** the record is not put on `R`. The wrapper's contract says its `result` equals the `R` from `app.js` `run()`, and the
    route comparisons check every key of `result`.
  - **Shared helper:** `forEngineResult` is called by both `app.js` and `engine-api.js`, so the arguments are built in one place.
  - **Failure handling:** if the check itself fails, `INTEG` records "integrity check failed", and the page says the inputs were not checked.
    A failed check is never shown as clean.
- **Cache versions** (Claude, C): `?v=` raised to `0.7-x1` for calculations, forecasting, app and engine-api, because these files changed.
  Without this, a phone browser holding a cached copy could pair the new page with an old script. No test asserts these strings.

## CR-03 · process for expected test-count growth (R)

`tests/README.md` gains a short section, "Registering a new engine module: expected test-count growth". The section is additive.

## CR-04 · presentation fixes in the X1 interface (C, routine authority)

Every item below was found by the new browser test or by looking at its screenshots.

1. **Status cell.** The withheld reason was inserted without HTML escaping, and "Not calculated" got the CSS class `undefined`.
   - Fix: both values are now escaped, and the status uses the existing `warn` style.
2. **"partial" label.** It was written as `<b>`, which the card style `.k b` renders as a 20 px headline. On a phone it read as a second
   number.
   - Fix: it is now `<strong>`. The browser test checks it is inline and 12 px.
3. **Totals hid withheld rows.** The replenishment total was labelled partial only for missing costs, not for withheld rows. With the
   allocation column absent, the screen showed "0 Order now", "0 materials with net requirement" and "£0 total", unqualified.
   - Fix: the total says what it excludes. The counts say "— of N calculated; M not calculated". The total shows "–" instead of £0 when no
     material was calculated.
4. **MRP notice heading over-claimed.** It said "affected results are withheld", but only MRP withholds.
   - Fix: it now says MRP rows are withheld, and that the other calculations listed are not yet withheld in other views.
5. **Banner on every tab.** When `INTEG` lists missing or invalid inputs, every tab now shows a banner:
   - it names the fields;
   - it says MRP withholds the affected rows;
   - it says risk status, health score, shortage and cover for the affected items **may be understated**.
   This is the honest interim state until WP5; see task report §4.
6. **Stock-cover advice no longer vanishes** (clarification D). When available stock is unknown, `forecasting.js` `recFor` now states
   "Stock cover not assessed: available stock is unknown … so no replenishment advice can be given". Clean data is unchanged.
   - Tests: `test-x1-containment` (5 checks).

None of these fixes changes a calculation, threshold or classification.

## CR-05 · import route in the browser (finding; owner decision needed for the UI)

- **Finding:** the browser application has **one** upload route. `excel-import.js` reads the workbook and `run()` calls `analyse()`. The
  Universal Import modules (`js/import/*`) are not loaded by `index.html`, so the app has no import-upload screen.
- **What can be tested:** browser evidence for the import route is produced by a **harness**. `browser-x1-chrome.js` loads the import modules
  into the real page and runs Stage 1 → adapter → `CGEngine.runEngine` → result gate in Chrome.
- **What that proves:** containment (A) and the integrity record (B) work in the browser engine.
- **What it does not prove:** app presentation (C) for import uploads. That cannot exist until the import pipeline is wired into the UI. Doing
  so is a scope change beyond P1, so it waits for the owner (task report §9).

## CR-06 · defect: raw materials falsely withheld (C, routine authority)

- **Defect:** `forRun` built demand history for every item. Raw materials have no `Units_Sold` rows (their usage comes from parent demand
  through the BOM), so all 100 Northstar raw materials were classed "no-usable-history". On **clean** data the dependency record therefore
  listed them as withheld for forecast, excess, excess value, reorder comparison and MRP.
- **Why tests missed it:** the task-1 checks asserted only that an affected item *was* listed, which was also true on clean data.
- **Where it appeared:** the browser and the MRP view were unaffected, because MRP withholding uses `mrpCalc`'s own check, not this record.
  The error was in the `integrity.dependencies` data only.
- **Fix:** history is built for demand items, that is, finished goods (`demandItems`). The indirect raw-material demand dependency is
  WP6 work.
- **New tests:** on clean data nothing is withheld, on both routes and on all 17 confidence-snapshot fixtures. History exists for every finished
  good and for no raw material. Willow's six items with internal gaps are identified.
- `x1-containment`: 36 → 41.

## CR-07 · design history preserved (clarification A, R)

- `design-history/` holds the pre-amendment v2 Part 1, byte-identical (SHA-256 `7f7ba296…62ff`, equal to the task-1 start-state hash), and a
  unified diff to the current v2.
- v1 is unchanged (`db1790fd…`).

## CR-08 · tests added or changed

| Test | Change | Registry | Result |
|---|---|---|---|
| `browser-x1-chrome.js` | new | added, full tier, one zone, accepted 178 | 178 passed (§ task report) |
| `test-x1-containment.js` | +10 checks (CR-04 item 6, CR-06); one source-string check updated to the new markup, and its comment now says rendering is tested in the browser | 31 → 41 (entry created in this uncommitted X1 work) | 41 passed in UTC, Asia/Kolkata and Pacific/Auckland (the full tier runs five zones) |
| `test-x1-foundation.js` | unchanged | 39 | 39 passed |
| `test-a1-static` | count only (CR-01) | 29 → 30 | 30 passed |
| `check-globals.js` | EXPECT list (CR-02) | 116 → 119 | 119 passed |

No test was removed, no assertion weakened and no historical baseline replaced. Superseded counts are kept in the notes and in this record.

# Task 3 (21 Nov 2026): owner decisions D1–D7 implemented

Authority: "X1 Numeric Integrity — Owner Decisions and Continued Implementation Authorisation", 21 Nov 2026.

- **Start state:** `start-state-3/`, taken 2026-11-21T02:33:49Z (HEAD `eddf09b`, index empty, 0 stashes). A recoverable archive of the tree
  (evidence folder excluded) is kept outside the repository.
- **Origin key:** **R** = required by the authorisation; **C** = initiated by Claude under it.
- **Independent review:** none. Every check below is Claude's own testing.

## CR-09 · P3 applied (R)

- **Inspection first.** Two weak checks in `test-x1-containment.js` were tightened before hashing:
  - the unit-cost check had accepted any finite £ value;
  - the lead-time check claimed to exercise a guard that data cannot reach.
- **Applied:** three `file` lines and a dated comment were added to `checksums.txt`. `check-protection`: 444 → 447 = 3 references + 444
  files, matching exactly the three initial X1 test files. Verified: 447 passed.
- **Task-3 additions:** `test-x1-wp5.js` was added (447 → 448). The three initial files were re-hashed in place, with a dated comment
  naming each previous hash. Verified: 448 passed.
- No `js/` file has a checksum line.

## CR-10 · WP5 engine: Not Assessed (R; production code)

`js/calculations.js` (inline edits; still 217 lines):
- **`risk()`, inputs checked before use.**
  - An unknown, invalid or prohibited input (negative Allocated, or negative On_Order under `sup = 1`) makes the dependent **figures**
    non-finite (NaN, shown "–"), which is the established engine contract the import gate relies on.
  - The dependent **flags** (`fSS`, `fROP`, `fLT`, `fLTp`, `fEx`, `fND`) become `null`, never `false`.
  - Reasons are recorded in `x.na` / `x.naP` / `x.naD` / `x.naR`; `x.assess` is "Not Assessed" or "Assessed".
- **Severity, health and class.** Severity is `null` unless critical is already certain. Health score `null` and category "Not Assessed".
  Stock class "Not Assessed" instead of "Active".
- **Kept unchanged on purpose:**
  - the contract formulas `x.av=(…)-x.al;` and `x.val=x.oh*x.cost`;
  - a blank reorder point or safety stock under the workbook policy still means "not configured".
- **D1(d):** negative reorder point is not allowed, with a High warning; negative allocation no longer adds to stock (`stockB`).
- **D7:** zero cost is kept, flagged `costZero`, has a Medium warning, and is excluded from "reliably costed" coverage.
- **Totals.** An unknown component keeps the total non-finite, as NaN did before, so the import gate still withholds it. `R.cov` publishes
  coverage counts (no money, so nothing escapes the gate). Partial £ totals are computed in the app.
- **ABC.** Unknown annual values are "Not Assessed" and left out of the ranking (Appendix C issue 17).
- **Feasibility.** Unknown stock gives "Insufficient information" with a reason, never 0. A zero or invalid BOM quantity also gives
  "Insufficient information" (D1(b)).
- **MRP.** Status "Not Assessed" (owner §6.3). A negative On_Order is never used. The engine reason now names the input state.

## CR-11 · WP6 demand (R; production code)

- **`js/calculations.js`** (finished goods):
  - a blank, invalid or negative `Units_Sold` is a **missing** month (never NaN, never 0);
  - `x.hc` is the calendar-indexed history;
  - rows present but none usable means demand unknown (`m = null`).
- **`js/calculations.js`** (raw materials): usage is calendar-aligned (was by row position). A month with any missing parent is unknown, and
  a zero or invalid BOM line makes the material's usage unknown (D1(b)).
- **Interim (Q1):** an item with **no demand rows at all** keeps the existing zero-demand treatment, because accepted Round 2 C-STK and
  import I6 assertions require it.
- **`js/forecasting.js`:** `gapSeg` and `gapTxt`. With missing months inside the window or at its end, the existing models are fitted only to
  the last run of consecutive observed months, with the seasonal position taken from that run's real last month. A run shorter than 6
  months gives no forecast, with the reason. No new model. A gap-free history is processed exactly as before.

## CR-12 · shared record and tests aligned to the decisions (R)

- **`js/validation/x1-integrity.js`:**
  - history condition `no-rows` (Q1 interim);
  - `bom-requirement` accepts only `valid` (D1(b));
  - new `risk-status` dependency;
  - raw-material derived-demand dependency;
  - D7 `suspicious` list and report line;
  - `reasonsFor()`, the single user-facing reason channel;
  - risk policy (`pol`) passed by both callers.
- **Tests** (superseded expectations kept as comments in the tests):
  - `test-x1-foundation.js`: no-rows interim (39 → 40);
  - `test-x1-containment.js`: "Not calculated" → "Not Assessed", reason text.

## CR-13 · WP7 presentation and export (R; production code)

- **`js/app.js`:**
  - `sv` and `cls` know "Not Assessed";
  - `x1Why` (reasons from the record), `x1Sum` and `x1Money` (partial totals with coverage);
  - **Overview:** Not Assessed card and coverage, partial values, risk tables listing Not Assessed first with the reason;
  - **Health:** average over assessed items only, a Not Assessed card, no score shown for unknowns, ABC rows not summing unknowns;
  - **Finished goods / Materials:** Not Assessed first, with the reason;
  - **Excess & dead stock:** Not Assessed status with the reason;
  - **Summary:** a Not Assessed card naming the items, "of N assessed" qualifiers, partial excess;
  - **MRP:** canonical status, and the reason taken from the record;
  - **stock-cover chart:** a "Not Assessed" band (issue 19);
  - **banner:** reviewed and amended (owner §6.1).
- **`js/excel-import.js` export** (ENG_FG / ENG_RM): an unassessed number is an empty cell, never NaN; the row carries `Assessment` and
  `AssessmentReason` (owner option (a)).
- **Tests:** `browser-x1-chrome.js` (178 → 334) covers every view, the real export path, `INTEG = runEngine().integrity`, and both sides.

## CR-14 · registrations (R; CR-03 process)

| Entry | Change |
|---|---|
| `check-globals` | 119 → 124 (+5 top-level names) |
| `test-a1-sync-path` | 74 → 76 (+2 newly reachable helpers, both synchronous) |
| `x1-wp5` | added, 51 |
| `x1-foundation` | 39 → 40 |
| `browser-x1-chrome` | 178 → 334 |
| `check-protection` | 444 → 447 → 448 |

Each note supersedes rather than replaces. `tests/README.md` gains one line on the sync-path growth.

## CR-15 · stopped items (owner decisions Q1–Q4; nothing changed in protected records)

- **Q1:** D6 for items with no demand rows at all.
- **Q2:** the Round 2 negative-allocation assertion (1 check now fails, by your D1(d) decision).
- **Q3:** recording the Willow confidence-snapshot difference.
- **Q4:** D1(a) needs a Stage 2 adapter change.

The details are in `X1-TASK3-REPORT.md` §7.

## CR-16 · documents (R)

- v2: §13.1 owner decisions, §13.2 implementation notes, revision rows 10–11, Appendix C issues 17–23 and status updates.
- `STAGE3A-PROPOSAL-test-paging-chrome.md` (proposal only).
- `MANUAL-ANDROID-TEST.md`.
- This record and `X1-TASK3-REPORT.md`.

# Task 4 (21 Nov 2026): owner approvals Q1–Q4

- **Start state:** `start-state-4/`, taken 2026-11-21T07:31:54Z (HEAD `eddf09b`, index empty, 0 stashes). The tree is archived outside the
  repository.
- **Origin key:** **R** = required by the approval.
- **Independent review:** none.

## CR-17 · Q1: D6 for items with no demand rows (R; production)

- **Fixture evidence (checked first):**
  - FG050 and FG014: 12 positive rows each, 0 recorded zeros, removed by the tests.
  - P0001 (sole parent of M0058): 24 positive rows, 0 recorded zeros, excluded in I6.
- **`js/calculations.js`:**
  - no usable demand history (including no rows at all) gives `m = null`, demand unknown;
  - a parent with no demand rows makes its materials' derived demand unknown (was 0, the I6 "false excess");
  - `x.uncomm` stores uncommitted stock;
  - new Medium warning "Stock held with no demand history (demand unknown, not zero …)". The zero-demand warning and its severity are unchanged.
- **`js/app.js`:** the dead-stock view lists a Not Assessed item only when it holds uncommitted stock.
- **`js/validation/x1-integrity.js`:** `no-rows` is withheld like `no-usable-history`; derived demand is unknown when a parent has no rows.
- **Superseded, with the originals kept as `// [original]` comments and the reason cited:**
  - `test-stage3-round2.js`: the 7-row C-STK table and its check; the 5-row listing check; "abc"; FG014;
  - `test-stage3-quality.js`: the 6-row C-STK table;
  - `test-import-integrity.js` I6: M0058's £6,232.80, which the check itself calls a "false excess".
- In every one, the listing and warning expectations are kept and only the class and excess change.
- X1 tests: the interim checks in `test-x1-foundation.js` and `test-x1-wp5.js` are superseded in place.

## CR-18 · Q2: Round 2 negative allocation (R)

`test-stage3-round2.js`: the one assertion "a negative allocation … gives the same uncommitted figure (15)" is superseded, with the original
kept as a comment. New expectation: flagged High, never used as a number, uncommitted 10, excess Not Assessed (D1(d)). No other assertion
changed.

## CR-19 · Q4: D1(a) quarantine (R; production, Stage 1 + the minimum Stage 2 adapter change)

- **`js/import/validate.js`:** a rejected stock row of an **identified** item gives `ROW_QUARANTINED` (Please check; the dataset is not blocked;
  the row is not imported; row number and reasons are kept). Unmatched or unidentifiable rows are unchanged (Q5).
- **`js/import/adapter.js`:**
  - an item with a quarantined row is written with no stock values, and its other locations are not summed;
  - the item is in the reconciliation report;
  - the hard reconciliation check confirms that no value was written for it.
- **`js/validation/x1-integrity.js`:** the quarantine is recorded against the item, and `reasonsFor` shows "stock row quarantined: …".
- **Superseded in `test-import-mapping.js`** (10 checks, each with a note and the original commented): the outcome helper reads
  `ROW_QUARANTINED`; stock fields are class "quarantine"; F01; the quantity regression; the "£5" check; the `reliabilityOf` F01 part.
- **Tests added** (`test-x1-wp5.js`):
  - quarantine, with the import accepted;
  - Not Assessed with the reason;
  - 149 other items unchanged;
  - no partial sum across locations.

## CR-20 · Q3: confidence snapshot registered (R)

- New: `tests/snapshots/v0.7-confidence-20261121T075533Z.json`, emitted from the final code (17 fixtures × 5 zones identical).
- It differs from the 16 Nov file in exactly one value: Willow `clientQuestions[6].ev` "4 items" → "3 items". `ing 017` left the "reorder
  point too low" list after its derived usage was aligned by calendar month (D6/WP6, Finding A).
- The registry's `snapshot` path was updated with a superseding note (accepted 51 unchanged). README row and checksum line added.
- The 12 Nov and 16 Nov files and their checksum lines are unchanged.

## CR-21 · protection

- Re-hashed in place, with one dated comment listing every previous hash:
  - `snapshots/README.md`;
  - `test-import-mapping.js`, `test-import-integrity.js`;
  - `test-stage3-quality.js`, `test-stage3-round2.js`;
  - `test-x1-foundation.js`, `test-x1-wp5.js`.
- `check-protection`: 448 → 449 (the new snapshot). Verified: 449 passed.
- `x1-wp5`: 51 → 56. No line removed.

## CR-22 · documents (R)

- v2: §13.3 and revision row 12; Appendix C issues 24–25.
- `SNAPSHOT-IMPACT-INVENTORY.md`.
- `X1-TASK4-REPORT.md`.

# Verification task (21 Nov 2026)

- **CR-23 · documents only (R).**
  - v2: owner decisions Q5 (deferred scope) and Q6 (structural-zero rule), and new issue 26 (defect found, not fixed).
  - `X1-VERIFICATION-REPORT.md`.
- **No production or test file was changed in this task.**

# Final completion task (21 Nov 2026, owner "X1 Final Completion Authorisation")

Start state: `start-state-5/` (1,992 files hashed, evidence folder excluded). Report: `X1-COMPLETION-REPORT.md`.

## CR-24 · issue 26 fixed (P)

- `js/validation/x1-integrity.js` `assess()` → `check()`: a column-level absence now honours the per-field `accepts` list.
- Effect: with `Reorder_Point_Qty` absent, the record withholds only the reorder comparison (150), not risk status (0).
  The banner and MRP notice no longer overstate what is withheld. Engine figures were already correct and are unchanged.

## CR-25 · defects found in the completion review (P)

1. **Blank or unknown `Material_ID` on a BOM line** (owner-required; decision record in the report §E).
   - `js/calculations.js` (inline, still 217 lines): the line adds usage to no material (never guessed, never trimmed);
     a High data-quality warning names the row and parent; the parent's production orders say "Insufficient information"
     with the reason; a material with **no** valid BOM line gets unknown usage, not a structural 0; materials with valid lines
     are unchanged.
   - `js/validation/x1-integrity.js`: the same rule in `derivedDemand` (new reason state `bom-unidentifiable` with plain text).
   - Direct-route record keys are no longer trimmed, so the record matches identifiers exactly as the engine does
     (found by the trailing-space test: "RM050 " was read as RM050 by the record only).
2. **"Exposed £/mo" read unknown parent demand as 0** (Materials screen), giving a smaller number instead of "unknown".
   Now not a number (shown "–") when any parent's demand is unknown. Price handling unchanged (not an X1 field).
3. **On-screen reasons printed "null"** when a reason had no source row (seen in the browser check). Fixed in `reasonsFor`.

## CR-26 · tests and protection (T)

- New `tests/test-x1-completion.js` (48 checks), registered in `accepted-results.json` (fast + full, 5 zones).
- `checksums.txt`: one new line with a dated comment. No approved line changed. `check-protection`: 449 → 450.
- No protected test, snapshot or expected result was changed.

## CR-27 · evidence and documents (R)

- `browser-evidence-20261121-final/` (screenshots, results, timing, scripts, two test workbooks).
- `X1-COMPLETION-REPORT.md`, `ANDROID-CHECKLIST-FINAL.md`.
- v2: §13.4 and revision row 13; Appendix C status update (issue 26 fixed, issues 27–29 added and fixed).

# Material-integrity correction (21 Nov 2026, owner "X1 Final Material Integrity Correction")

Report: `X1-MATERIAL-INTEGRITY-REPORT.md`. It supersedes `X1-COMPLETION-REPORT.md` §E (kept unchanged as history).

## CR-28 · incomplete BOM-derived usage (P)

- `js/calculations.js` (inline, still 217 lines):
  - a BOM line whose Material_ID is blank, whitespace-only or not a known material "can add usage" unless its parent has recorded zero sales
    in every month (then it provably adds 0);
  - while such a line exists, every material's usage is incomplete: `m` and `annual` are null (Not Assessed), the known part is kept in
    `mPart` with the reason, and `exposed` is not a number. Product results are unchanged;
  - an incomplete history (unidentifiable OR invalid BOM line) is not used as history: no annual usage, variability (XYZ) or
    months-since-use. Before, an invalid line still gave `annual = 0` and an XYZ class;
  - "Materials not used in any BOM" is reworded while lines are unidentifiable; "Stock held with no demand history" no longer lists
    BOM-identification cases (the High BOM warning covers them); the BOM reference warning prints "(blank)", not "undefined".
- `js/app.js`: Materials "Est use/mo" shows "at least N (incomplete: not used in any calculation)"; a note explains it; the Not Assessed
  reason (screen and export) carries the labelled known part.
- `js/validation/x1-integrity.js`: the same rule (new reason state `bom-incomplete`); materials are told apart from products.

## CR-29 · related downstream defects (P)

1. **Feasibility:** an order whose material use is unknown consumed nothing, so later orders were judged against stock that may already be
   used. Now later orders using those materials (any material, for an unidentifiable line) are "Insufficient information" unless they are
   already a certain shortage; the reason is given.
2. **Recommended policy:** an incalculable safety stock gave `fSS = false` and a £0 shortage. Now unknown.

## CR-30 · import route and protection (P, T)

- `js/import/adapter.js`: adds a hidden (non-enumerable) workbook property `CGExcludedItems` listing items Stage 1 excluded for all
  analyses. Found by the full regression: without it, an excluded known material (M0028) was read as an unidentifiable code and
  `test-import-integrity` lost 15 checks. No sheet, cell or report changes. Engine and record read it.
- New `tests/test-x1-material-integrity.js` (42 checks), registered. `test-x1-completion.js`: two assertions superseded with dated notes,
  originals kept as `// [original]` comments, count 48 unchanged; re-hashed with the previous hash recorded. `check-protection` 450 → 451.

## CR-31 · evidence and documents (R)

- `browser-evidence-20261121-material/` (browser results and screenshots, reconciliation, timings, scripts, workbook).
- v2 §13.5, revision row 14, issues 30–34. `ANDROID-CHECKLIST-FINAL.md` addendum.

## CR-32 · sanity check, 21 Nov 2026 15:55 (R, documentation only)

- `browser-evidence-20261121-material/RECONCILIATION.md`: month labels corrected (UTC labelling error in the report script; data and
  engine unaffected); the correction is recorded in the file.
- `ANDROID-CHECKLIST-FINAL.md` Addendum 2; `X1-MATERIAL-INTEGRITY-REPORT.md` addendum.
- Finding reported, not fixed: the banner's general "Not Assessed" sentence when no item is Not Assessed.

# X1 acceptance preparation (21 Nov 2026, owner "Master authorisation: X1 completion …")

Work environment: the local working tree of the temporary repository `MB20252025/chain-genius-x1-android-test` (based on `cd16dcc`), filled
with the full application folder from the original working tree (evidence folder and its listing excluded). Nothing was committed or
pushed. The original repository was not modified. Package: `acceptance-20261121/`.

## CR-33 · wording corrections from the Android Test 3 observations and the banner finding (P, T)

- `js/app.js` only (6 lines added, 5 removed; diff in `acceptance-20261121/evidence-files/`):
  - banner: the "Not Assessed" sentence only when an item is Not Assessed (DEF-A3);
  - Reorder Policy "Why": verdict-specific (DEF-A1);
  - Summary: no contradictory zero-count recommendation (DEF-A2).
- No calculation changed: engine outputs and snapshots are unchanged.
- New test `tests/test-x1-acceptance-wording.js` (12 checks). It is **not registered**: the authorisation forbids changing accepted results
  and checksums. The proposed lines are in `acceptance-20261121/PROPOSED-REGISTRATION.txt`.
- No protected test, snapshot, checksum or accepted result was changed.

# X1 completion and delegated acceptance (21 Nov 2026, owner master authorisation "Complete X1, preserve the accepted baseline, close Stage 2 …")

## CR-34 · registration, version label, paging evidence (P, T, R)

- `tests/test-x1-acceptance-wording.js` registered **prospectively** (CR-03 count-growth process):
  - a new `accepted-results.json` entry (accepted 12, fast + full, five zones);
  - `check-protection` 451 → 452, with a dated note keeping the previous value;
  - one new `checksums.txt` line with a dated comment.

  No existing entry, result or checksum line was altered or backdated.
- `index.html`: title and header now read "v0.7 development build · X1 candidate · not a release" (was "v0.6"). Text only; no test asserts
  it; no release number claimed.
- `test-paging-chrome` (unchanged; its hash matches its protected line) ran in full on genuine Chrome for Testing 153, using the
  environment's Playwright 1.63: 59/59, the historical count. The registry entry (BLOCKED) was not changed.
- `check-control` investigated. Its approval mechanism is the owner's remote tag (Tag-6). It is not completable without a commit, tag
  and push, so it was left untouched.
- The four historical-tree tests and two REDUCED tests were investigated. Their trees are unavailable anywhere reachable. Nothing was
  weakened.

## CR-35 · formal X1 decision (D)

**X1 ACCEPTED**, 21 Nov 2026, by Claude under the owner's delegated authority (not the owner's personal review).
- Decision record: `acceptance-20261121/X1-ACCEPTANCE-PACKAGE.md` §1.
- Baseline: `acceptance-20261121/X1-ACCEPTED-BASELINE.md`.
- *Correction, 21 Nov 2026, after the first baseline preservation:* the decision record's "Restrictions" row said "Stage 3 not started".
  That was inaccurate: the candidate contains the earlier unaccepted Stage 3 engineering-completion and Round 2 work. A scope row now
  says the X1 decision does not accept that work. Baseline revision 1 is kept unchanged; revision 2 carries the correction.
