# X1 Numeric Integrity: task 2 report (21 Nov 2026)

Scope: the owner's authorisation of 21 Nov 2026 (P2 approved, P1 conditionally approved, P3 deferred, clarifications A–F, D2,
continued progress).

Every change is itemised in `X1-CHANGE-RECORD.md` (CR-01 to CR-08).
- **Not committed, pushed, merged, tagged, published or deployed.**
- **Not independently reviewed.** All tests are Claude's own, and passing them is not verification.
- No calculation is labelled Verified; X1 is not complete; nothing here is formally accepted.
- `stage3-design/evidence/` was excluded from every command, copy, inventory and test run.

Status words: Implemented · Tested – passed · Tested – failed · Partially tested · Not tested · Awaiting owner decision · Awaiting
independent review · Formally accepted (not used: nothing is).

## 1. Summary

| Item | Status |
|---|---|
| Task-2 start state (`start-state-2/`) | Implemented |
| P2: `test-a1-static` 29 → 30, superseding record, count-growth process | Implemented; Tested – passed; Awaiting independent review |
| P1: module loaded by the page; load-list assertion, checksum line and count updated; app receives `INTEG` | Implemented; Tested – passed (real headless Chrome); Awaiting independent review |
| WP4 browser outcome A: MRP crash containment | Tested – passed, direct upload (real file input) and import route (in-page harness) |
| WP4 browser outcome B: integrity record available in the browser | Tested – passed, direct upload (`INTEG`) and import route (harness, `out.integrity`) |
| WP4 browser outcome C: presentation of withheld rows and partial totals | Tested – passed for direct upload. **Not tested for import upload: the app has no import screen** (CR-05, §9 question 3) |
| Presentation fixes found in the browser (CR-04) | Implemented; Tested – passed |
| Defect: raw materials falsely withheld in the dependency record (CR-06) | Implemented fix; Tested – passed |
| Clarifications A–F | Implemented in the documents (§3) |
| Stock-cover finding and the wider pattern (D) | Explanation implemented; pattern **Awaiting owner decision** (WP5, D1/D4) |
| P3 checksum protection | Prepared and proven in a throwaway copy; **not applied**; Awaiting owner decision |
| D1–D7 decision package, including D2 | Presented (§8); Awaiting owner decision |
| Physical Android testing | **Not tested.** Pixel 5 emulation in desktop Chrome only |

## 2. Browser evidence (Step 4)

`tests/browser-x1-chrome.js` (new, registered for the full tier) runs headless Chrome 153 on desktop (1280×800) and in **Pixel 5 emulation**.
Emulation is not a physical Android device.

- **Variants:** cell-level edits of Northstar, so every other cell stays as supplied. Each variant is uploaded through the real file input.
- **Result: 178 passed, 0 failed.**
- **Screenshots:** `browser-evidence-20261121/` (MRP tab, every variant, both screen sizes), plus the run log.

| Variant | A: run completes | B: `INTEG` (direct) | C: presentation checked |
|---|---|---|---|
| Normal valid data | ✓ | inputs-valid, no report line | no banner, no notice, no "partial", no qualifiers |
| One blank `Allocated_Qty` (RM001) | ✓ | names Allocated_Qty | row "Not calculated – Allocated_Qty unavailable", no figures; counts qualified ("of 99 calculated"); total "partial: excludes 1 material(s) not calculated"; banner on every tab; the other 99 rows identical to clean |
| Several blank (RM001, RM005, RM010) | ✓ | names Allocated_Qty | 3 withheld rows; all others identical to clean |
| Column absent | ✓ | column not supplied | 100 withheld; total "–", not £0; counts "of 0 calculated; 100 not calculated" |
| Invalid mix (Allocated "abc", cost "n/a", On_Hand blank) | ✓ | names On_Hand_Qty, Allocated_Qty, Unit_Cost_GBP | RM002 and RM004 withheld; RM003 in the total, labelled "without a unit cost"; unaffected rows identical |

On every variant and both screen sizes, all 17 tabs were visited and none showed NaN, Infinity, "Invalid Date" or "undefined". There
were no page errors.

**Import route.** The app has no import-upload screen. The harness loads the nine import modules into the real page and runs Stage 1 →
adapter → `runEngine` (with `CGValidation.fromImport`) → result gate in Chrome, for clean, one blank and column absent. The engine
completes, `out.integrity.route` is `import` and names the field, and the withheld rows are correct, with no NaN. This shows A and B on the
import route **in the browser engine, not in the app's interface**.

## 3. Clarifications

**A. Original v2 Part 1: recoverable, yes.**
- The pre-amendment text is preserved byte-identical in `design-history/`. SHA-256 `7f7ba296…62ff` equals the hash recorded in
  `start-state/tree.sha256` before the amendment.
- `design-history/v2-part1-to-current.diff` shows C1–C6 (still labelled), Part 2, and the four passages the amendment **replaced**:
  §6.2, §8.3, the delivery status and the start-state paragraph.
- v1 is unchanged (`db1790fd`).

**B. start-state location.** It is in the repository working tree at `stage3-design/x1-implementation/start-state/`, untracked. The task-1
report's sentence "No artefact was created in the repository" was wrong; it meant test-run artefacts. It is corrected in place (struck
through, not deleted), with an addendum listing every file task 1 created or changed.

**C. BLOCKED and REDUCED tests.** All seven have exactly the same status in the Tag-5 baseline (`v0.7-tests-approved-5`), so none was
introduced by Stage 3 or by X1. None counts as PASS.

| Test | Purpose | Why | Before X1? / Stage 3? | Not established today | To restore |
|---|---|---|---|---|---|
| `test-phase1` (REDUCED 57 of 125) | Phase 1 corrections; item 1e compares screens with candidate 3 | needs `C3_TREE` from tag `c4-base`, not on GitHub | yes / no | 68 checks: that the Phase 1 screens differ from candidate 3 only where intended | the `c4-base` source (tag or archive) |
| `test-uom` (REDUCED 110 of 164) | approved unit-of-measure corrections | comparison with Phase 1 final needs `P1_TREE` from tag `v0.6-candidate-4-phase1-final`, not on GitHub | yes / no | 54 checks: that nothing outside UoM changed against Phase 1 final | that tag or archive |
| `test-fglt-note` (BLOCKED) | Phase 3 item 4: the finished-goods production-time note, and nothing else changes | needs the Phase 2 source tree (historical zip) | yes / no | that the note changed only text, against Phase 2 | the Phase 2 zip |
| `test-forecast-conf` (BLOCKED) | Phase 3B item E: level-shift confidence correction | needs the Phase 3 tree (historical zip) | yes / no | equality with the Phase 3 engine on 44 patterns (partly compensated by the T3 confidence snapshot) | the Phase 3 zip |
| `test-supplier-eligibility` (BLOCKED) | Phase 3B supplier metric eligibility and "Not Assessed" | needs the Phase 3 tree | yes / no | independent re-derivation of supplier scores against Phase 3 | the Phase 3 zip |
| `phase2-comparison` (BLOCKED) | regression comparison with Phase 2 | needs git tag `v0.6-candidate-4-phase2`, not on GitHub | yes / no | Phase 2 equality | that tag |
| `test-paging-chrome` (BLOCKED) | real-Chrome paging (50/200 rows, touch targets, export) | Playwright's browser cannot be downloaded | yes / no | real-browser paging behaviour (the JSDOM paging test runs) | **proposal:** port to the Chromium already used by `browser-chrome` (changes a protected test, so it needs approval; issue 15) |

**D. Disappearing stock-cover advice.** The cause is established and an explanation is implemented (CR-04 item 6). It is recorded as issue
11, and the wider pattern as issue 12, in v2 Appendix C. See §4.

**E. D6.** Two distinct things:
- **The integrity record.** WP4 keeps a calendar-indexed history there: every month in the analysis window has a slot, a gap stays in place
  as `missing` with its cause, and nothing is filled.
- **The engine's own forecasting is unchanged.** It still builds history from present rows only (`calculations.js` line 111, which compresses
  gaps).

No D6 meaning (unknown or zero) is applied anywhere. Forecasting consequences, confidence wording and zero-versus-unknown behaviour are
**not** finalised. They belong to WP6 after D6. What changed in the forecast output is only the explanatory sentence of CR-04 item 6, which
appears only when available stock is unknown.

**F. D1–D7.** See §8.

## 4. Clarification D in depth: recommendations that disappear

| Recommendation or flag | When an input is unknown | Status now |
|---|---|---|
| Forecast "replenish" / "slow replenishment" advice | vanished | **explained** (CR-04 item 6) |
| MRP order recommendation (ORDER NOW / Order soon / Plan) | crashed the run (before X1) | **withheld with reason** (WP3) |
| Overview and Summary "order now" counts | use MRP rows, so withheld rows are not counted | covered by the banner; counts are qualified only on the MRP tab |
| Reorder flag (`pos < ropU`), safety-stock flag (`av < ssU`), excess flag | turn **off**; shortage £0; severity and health improve (RM001: severity 3 → 0, health 42 → 100) | **not fixed**; banner warns "may be understated"; WP5, needs D1/D4 |
| Transfer recommendation | none exists in the engine | n/a |

**Risk.** An item whose stock is unknown can be shown as healthy and drop out of critical lists. This is significant, because it is exactly
what a consultant would present to a client.

**Proposed WP5 correction.** Use the X1 registry (already declares shortage, excess, position and availability) to mark severity, health,
shortage and flags "Not assessed – reason" per item. Totals show coverage ("N of M items assessed"). The item stays visible, as under D4
option (c). This changes how risk status is presented, so it needs D1/D4.

**Tests required:**
- severity, health and shortage for an item with an unknown input are "Not assessed", never OK;
- unaffected items are unchanged;
- totals are labelled partial;
- golden and confidence snapshots unchanged on clean fixtures;
- browser checks on every tab.

## 5. Tests run (all in throwaway copies or writing only to `/tmp`)

| Run | Result |
|---|---|
| `test-x1-foundation` (5 zones) | 39 passed |
| `test-x1-containment` (UTC, Asia/Kolkata, Pacific/Auckland directly; five zones in the full tier) | 41 passed |
| `browser-x1-chrome` | 178 passed |
| `test-a1-static` | 30 passed (the new module's rule-2 check passes) |
| `check-globals` | 119 passed |
| `check-protection` (real repository) | 444 passed |
| `check-protection` with the P3 lines (throwaway copy) | 447 passed |
| Golden v0.5 and v0.6.0 (direct) | ALL SECTIONS IDENTICAL |
| **Full tier, final tree** | see §10 |

## 6. Protection

- **Protected records changed, all under P1/P2:**
  - one checksum line re-hashed (`check-globals.js`), with a dated comment carrying the old hash;
  - accepted counts for `test-a1-static` (29 → 30) and `check-globals` (116 → 119), each with a superseding note.
- **Additive changes:** three new registry entries (two from task 1 and one now, `browser-x1-chrome`) and a `tests/README.md` section.
- **Not changed:** any other test or checksum line, snapshots, baselines, tags, Stage 1/2 records, Round 2 records, v1.
- **End-of-task comparison** against `start-state-2/tree.sha256`: see §10.

## 7. P3: prepared, not applied

- **Scope:** `js/` files are protected by behaviour tests, not checksums (M1-DESIGN.md, decision of 12 Nov 2026; no `js/` file has a line
  today). So the module gets **no** line. The three new X1 test files do.
- **Prepared lines:** `P3-PREPARED-CHECKSUM-LINES.txt`, one comment line and three `file` lines.
- **Effect:** `check-protection` would count 447 (3 references + 444 files) instead of 444. The registry count 444 → 447 would be recorded
  by the CR-03 process.
- **Proven in a throwaway copy:** 447 passed, 0 failed.
- **Not applied, as instructed.**
- **Timing:** apply only after you are content that the three test files are final, because any edit to them after registration needs a re-hash.

## 8. Decision package D1–D7 (none applied; recommendations are Claude's, not decisions)

### D1 — Field-level policies (the seven fields, design v2 §5)
- **Exact question:** approve or amend the §5 policies, including:
  - (a) quarantine an item, or refuse the whole import, when a stock row is bad (import route);
  - (b) whether a zero BOM quantity is invalid;
  - (c) stop a whole run or withhold dependent outputs when a required column is absent;
  - (d) whether negative Allocated, On_Order and Reorder_Point are invalid on the direct route too.
- **Options:** approve as written, or amend any of (a)–(d).
- **Current behaviour in code:** the classifier records the facts, e.g. zero BOM = `zero`, negative allocation = `negative-prohibited`. No
  policy maps a state to an outcome except MRP containment. Stage 1 still refuses the import for a bad stock row.
- **Consequences:**
  - (a) Quarantine keeps unrelated analysis but changes accepted Stage 1 assertions (areas 1 and 2); refusal keeps today's behaviour.
  - (b) Invalid stops a zero line driving plans; permitted allows phantom lines.
  - (c) Withholding keeps unrelated outputs.
  - (d) Aligns the routes.
- **Recommendation:** approve §5. (b) invalid, unless phantom components occur in target businesses. (c) withhold.
- **Dependencies:** D3 (Stage 1 part), D4, D7.
- **Already implemented:** classification for all 7 fields; MRP withholding.
- **Rework if you choose differently:** only the WP5 policy layer. The classifier records facts, not policy.

### D2 — Provenance (distinct decision; part of option (a) is already built)
- **Exact question:** which provenance model X1 uses. (a) a shared field-state record on both routes; (b) a route stamp only; (c) full
  cell-level lineage.
- **What is implemented (WP1/WP4, not accepted merely because it exists):**
  - One record per value of the 7 fields: `{field, record, route, source, state, value, raw, transformations, assumptions, reasons}`.
  - **Source and route, direct:** `{sheet, row, column}`, where row is the spreadsheet row number.
  - **Source and route, import:** `{file, table, row, column, location}`, from Stage 1's `__source`.
  - **Column-level absence:** one record with record `*`.
  - **Transformations recorded on the import route:**
    - the CDv1 cleaning step;
    - Stage 1's own decisions: `FIELD_BLANKED`, where an unreadable value was blanked, and `ROW_REJECTED`, where a row was rejected for that
      field. These are recorded, not re-decided.
  - **Raw values** are kept JSON-safe (NaN kept as the text "NaN"; absence and invalid dates explicit). Records are frozen.
- **How it connects:** the dependency registry reads the record states, and a withheld calculation lists `{field, state, source}` for each
  reason. The report text and the browser notice are generated from the same records.
- **Sufficient for universal importing?** Mostly. It already keys import records by canonical table and field, and carries file and row.
  Missing:
  - source-declared semantics (e.g. "zero cost is consignment"), needed for D7 source-dependent;
  - a mapping step entry (source column name → canonical field) in `transformations`;
  - records for fields beyond the seven.
- **Scenario analysis and CIS?** Yes in shape: every figure's inputs can be traced to a record, state and source, which is what an
  independent recomputation needs. Missing: a stable record ID per run, and a link from each calculated figure to the IDs it used (today the
  link is per calculation and item, not per figure).
- **If rejected:**
  - (b): remove `source` and `transformations`; the registry still works, but reasons could no longer name a row.
  - (c): the record shape stays; lineage would be added at the mapping and cleaning layers (Stage 1 changes, beyond X1).
- **Recommendation:** (a), extended later with the mapping step and per-figure input IDs. This is the strongest long-term base for
  universal import, Client Scenario Mode and CIS, at modest cost.
- **Dependencies:** none blocking. D7 source-dependent needs it.

### D3 — Missing-column handling in X1
- **Question:** (i) include all, including Stage 1 table-level changes; (ii) containment and clear messages now, Stage 1 deferred; (iii) defer
  all.
- **Current behaviour:** (ii) is implemented, covering MRP containment, reasons, the banner and route parity where Stage 1 permits.
  `REQUIRED_UNMAPPED` is unchanged.
- **Consequences:**
  - (i) closes the route differences, but changes accepted Stage 1 behaviour;
  - (ii) leaves the documented differences (v2 §7.1);
  - (iii) would mean reverting WP3, restoring the crash.
- **Recommendation:** (ii).
- **Rework if you choose differently:**
  - (i): new Stage 1 work package and accepted-assertion records (areas 1 and 2);
  - (iii): revert WP3 (not recommended).

### D4 — Presentation of allocation-unknown items
- **Question:** (a) visible with warning; (b) separate "unknown" group; (c) hybrid: in place, with a distinct status and excluded from totals.
  Layout A/B/C.
- **Current behaviour:** MRP is effectively (c): rows stay in place, "Not calculated", excluded from totals with "partial". Other views do not
  yet apply any option (issue 12).
- **Consequences:**
  - (a) risks being read as fine;
  - (b) is clearest, but moves rows;
  - (c) keeps context and needs coverage labels.
- **Recommendation:** (c), layout A.
- **Rework if you choose differently:** (b) changes the MRP sort and grouping and the WP5 views; the integrity layer is unaffected.

### D5 — Excess definition
- **Question:** keep the 90-day rule, or adopt E1 later.
- **Current behaviour:** the 90-day rule; the registry labels it "current 90-day definition".
- **Recommendation:** defer.
- **Rework:** a registry input change if E1 is adopted (adds On_Order and forecast eligibility).

### D6 — Missing demand month
- **Question:** is a missing month unknown or zero?
- **Current behaviour:** the integrity history keeps gaps as `missing`. The engine still compresses gaps; no meaning is applied (§3 E).
- **Consequences:**
  - unknown: honest, lowers confidence, needs gap-aware methods;
  - zero: continuity, but invents demand of zero.
- **Measured regression scope:** only Willow (6 items with internal gaps), plus absent-history items.
- **Recommendation:** unknown.
- **Rework:** WP6 either way. Under zero, `calendarHistory` slots become `assumed` 0 with provenance, which is a small change.

### D7 — Zero unit cost
- **Question:** valid, suspicious, or source-dependent.
- **Current behaviour:** classified `zero`, an accepted state, so valuation is computed and it counts as costed. That is D7 = valid by default,
  not by decision.
- **Consequences:** suspicious keeps the number but excludes the item from cost coverage and flags it.
- **Recommendation:** suspicious now, source-dependent once D2 declarations exist.
- **Rework:** one registry `accepts` override (valuation accepts `valid` only for cost), plus coverage and labels in WP5/WP7.

## 9. Remaining work packages, and questions for the owner

| WP | Content | Depends on | Acceptance criteria (draft) |
|---|---|---|---|
| WP5 | apply field rules; withhold severity, health, shortage, cover and flags with reasons (issue 12); specific import reasons instead of R7 | D1, D3, D4, D7 | every registry calculation withheld per item with a reason; never OK when unknown; partial totals with coverage; clean fixtures unchanged (golden, confidence); browser checks on every tab |
| WP6 | demand history: gap-aware forecasting, absent-history classification, raw-material indirect dependency (issue 13) | D6 | three history conditions behave as approved; Willow changes only as predicted; recorded zero ≠ missing |
| WP7 | statuses and coverage in every view (Overview, Health, Materials, Excess, Summary, exports) | D4, D7 | §14.4 wording; exports carry the status, not blank numbers |
| WP8 | full regression, protection, browser evidence, independent review | all | full tier; P3 applied; review findings closed |

**Owner questions:**
1. **D1–D7** (§8).
2. **P3:** apply the prepared lines (444 → 447)?
3. **Import upload in the browser:** should the Universal Import pipeline become an app screen? Without it, browser outcome C for the
   import route cannot be evidenced. This is a scope decision.
4. **test-paging-chrome:** port it to the available Chromium to restore its coverage (issue 15)?

**Next executable steps that need no decision (not started):**
1. WP5 skeleton: a per-item "assessed / not assessed" lookup from the registry, so every view can consume it once D4 is chosen.
2. The mapping step in provenance (useful under D2 = (a)).

Performance measurement is done (§10).

## 10. Final full tier and end-of-task protection check

**Full tier, final tree, throwaway copy (evidence folder not copied): 48 tests passed (+ pre-flight), 1 FAIL, 5 BLOCKED, 2 REDUCED (56 tests).**

- **FAIL `check-control`:** the Tag-5 guard, failing by design since earlier Stage 3 work, with the same three checks.
  - Its checksum check now lists **8** changed approved lines instead of 7.
  - The added one is `tests/check-globals.js`, re-hashed under P1 (CR-02).
  - It will clear only when you move the approved baseline (Tag-6), which is not authorised.
- **BLOCKED and REDUCED:** the seven of §3 C, unchanged since Tag-5.
- **Passing:** `check-protection` 444, `check-globals` 119, `test-a1-static` 30, `same-results` 416, golden v0.5 and v0.6.0 (5 zones),
  confidence snapshot 51 (5 zones), `x1-foundation` 39 (5 zones), `x1-containment` 41 (5 zones), `browser-x1-chrome` 178, `browser-chrome` 53,
  and every page-loading test (`domtest` 30, `domtest2` 18, `test-structure` 34, `test-failed-import` 18, `test-a1-*`). So adding the script
  to the page disturbed no existing test.

**Performance** (Node, median of 5, CPU otherwise idle):

| Dataset | X1 alone | runEngine with X1 | runEngine without |
|---|---|---|---|
| Northstar, 150 items | 10 ms | 110 ms | 86 ms |
| Northstar ×10, 1,500 items | 93 ms | 937 ms | 872 ms |

X1 adds about 10%, linear in items. No action needed.

**End-of-task comparison** with `start-state-2/tree.sha256` (evidence folder excluded; 0 evidence paths):
- **Removed:** none.
- **Changed:** `index.html`, `js/app.js`, `js/engine/engine-api.js`, `js/forecasting.js`, `js/validation/x1-integrity.js`, the v2 design,
  `X1-IMPLEMENTATION-REPORT.md`, `tests/README.md`, `tests/accepted-results.json`, `tests/check-globals.js`, `tests/checksums.txt`,
  `tests/test-x1-containment.js`. `js/calculations.js` is not changed in task 2.
- **Added:** `tests/browser-x1-chrome.js`; `X1-CHANGE-RECORD.md`; this report; `P3-PREPARED-CHECKSUM-LINES.txt`; `design-history/` (3 files);
  `browser-evidence-20261121/` (10 screenshots, run log, SHA256SUMS); `start-state-2/` (3 files; its `tree.sha256` cannot list its own final hash).
- **Git:** HEAD `eddf09b`, 6 tags, 0 stashes and an empty index, as at the start. v1 is unchanged (`db1790fd`).
- **Test runs:** every run happened in a throwaway copy or wrote only to `/tmp`. The browser evidence was copied into the repository
  deliberately.

## 11. Remaining defects and limitations

- **Issue 12 (significant):** unknown inputs still make an item look healthy outside MRP. The banner warns; the fix is WP5 (needs D1/D4).
- **Not tested:** the import-upload interface (it doesn't exist; question 3); physical Android devices.
- **Unchanged and still documented:** the route differences of v2 §7.1, and the generic R7 reason on the import route (issue 8).
- **Not reviewed:** every change awaits independent review.
