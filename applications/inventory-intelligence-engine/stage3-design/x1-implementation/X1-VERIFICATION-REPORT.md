# X1 verification and reconciliation (21 Nov 2026)

Every statement below was re-checked against the code, the tests and fresh runs today. No production or test file was changed.
- "Tested" means Claude's own automated tests. **Nothing is independently verified**, and nothing is accepted.
- Evidence key: `wp5` = tests/test-x1-wp5.js · `cont` = test-x1-containment.js · `found` = test-x1-foundation.js · `br` = browser-x1-chrome.js ·
  "probe" = a one-off run today, not an automated test.

## 1. The "seven numeric-integrity requirements": authoritative source NOT FOUND

- No document in the repository lists seven numeric-integrity **requirements** with IDs. I searched every `.md` file, the evidence folder
  excluded.
- The owner's 20 Nov 2026 X1 brief, which asked for seven fields, is not stored in the repository.
- The only set of seven is the X1 design's **seven field policies**, `X1-NUMERIC-INTEGRITY-DESIGN-v2.md` §5.1–§5.7. That is a draft design. The
  owner's D1–D7 decisions of 21 Nov (§13.1) are mapped against it, but it is not an approved requirement list.

The matrix below therefore assesses those seven policies, **as a proxy**. It does not claim that "the seven requirements" are complete. If a
different approved list exists, it needs to be supplied.

## 2. Completion matrix

| Item | Rule (short) | Production | Behaviour when it occurs | Evidence | Status |
|---|---|---|---|---|---|
| §5.1 `On_Hand_Qty` | blank or invalid gives unknown, never 0 | `calculations.js` `risk()`; `validate.js`; `adapter.js` | item Not Assessed with reason; import: bad row quarantined | `wp5` (invalid mix, quarantine), `br` (invalid-mixed RM004); column absent: **probe only** (150/150 Not Assessed) | IMPLEMENTED (column-absent not in an automated test) |
| §5.2 `Allocated_Qty` | blank, absent, invalid or negative gives allocation unknown | `risk()`, `stockB`, `mrpCalc`, `feasCalc` | Not Assessed; flags null; excluded from totals; still listed | `cont` (both routes), `wp5`, `br` (5 variants, every view) | COMPLETE |
| §5.3 `Unit_Cost_GBP` | invalid gives money withheld; zero is suspicious (D7) | `risk()` (`val`, `costZero`), app `x1Money` | money "–", partial totals with coverage; zero kept, flagged | `cont` (RM002), `wp5` (D7), `br` (partial cost); negative cost and column absent: **probe / not tested** | IMPLEMENTED |
| §5.4 `Units_Sold` | missing month = unknown; recorded zero = zero (D6) | calculations.js lines 111–120, `forecasting.js` `gapSeg` | calendar slots; gap-aware fitting; no usable history gives Not Assessed | `wp5` (7 cases), `found`, Willow and snapshot; column absent: **probe** | COMPLETE |
| §5.5 BOM quantity | zero, blank or invalid line is invalid (D1(b)) | line 120 (`useNA`), `feasCalc`, registry `bom-requirement` | material Not Assessed; orders "Insufficient information" | `wp5` (direct); **import route not tested** | IMPLEMENTED |
| §5.6 `On_Order_Qty` | negative prohibited; blank means not supplied | `risk()` (`naP`), `mrpCalc` (`alt`) | sup 0: comparison withheld; sup 1: position and MRP Not Assessed | `wp5` (sup 0 and 1), `found` (column absent); blank under sup 1: **not tested** | COMPLETE |
| §5.7 `Reorder_Point_Qty` | blank or absent = not configured; invalid or negative gives Not Assessed | `risk()` (`ropU`, `verdict`) | as specified in the engine | `wp5` (blank, negative) | **PARTIAL**: defect, issue 26 (§3) |
| **D1(a)** | quarantine bad stock row (Stage 1 + Stage 2 adapter) | `validate.js`, `adapter.js`, `x1-integrity.js` | row quarantined with reason; item Not Assessed; no partial sum; others unchanged | `wp5` (4 checks), `import-mapping` 976 (10 superseded) | COMPLETE (Node; no import screen to test in a browser) |
| **D1(b)** | zero BOM quantity invalid | as §5.5 | as §5.5 | as §5.5 | IMPLEMENTED (import route untested) |
| **D1(d)** | negatives prohibited, never repaired | `risk()`, `stockB`, line 55 warnings; import CDv1 + quarantine | not used as numbers; High warning; original kept in the record | direct: `wp5` (all three); import: `wp5` (Allocated only) | IMPLEMENTED (import On_Order / ROP not tested) |
| **D2** | shared record and builder | `x1-integrity.js` `forEngineResult`, `reasonsFor` | one builder for `INTEG` and `out.integrity` | `br` (INTEG = runEngine().integrity, every variant) | COMPLETE |
| D2, per-figure input IDs | — | none | — | — | DEFERRED (owner, 21 Nov: future extension) |
| **D3** | absent required column contained, with messages | `risk()`, registry column-level records | run completes; dependents Not Assessed; specific integrity line | Allocated: `cont`, `br`; On_Order: `found`; On_Hand, Units_Sold, Unit_Cost, BOM Qty: **probe only** | IMPLEMENTED |
| **D4** | Not Assessed, totals exclude, coverage, one term | `app.js`, `excel-import.js`, `R.cov` | every listed view and export | `br` 334 (desktop + Pixel 5 emulation); import presentation untestable | COMPLETE (direct route) |
| **D5** | 90-day rule unchanged; E1 deferred | line 156 formula unchanged for known inputs | — | golden v0.5 / v0.6.0 identical; snapshots | COMPLETE (E1 DEFERRED) |
| **D6** | positive / zero / missing / no usable history; calendar-aligned | lines 111–120, `forecasting.js`, registry history | as specified, including no rows (Q1) | `wp5`, `found`, `cont`, Willow, snapshot (Q3) | COMPLETE |
| **D7** | zero cost suspicious; value and provenance kept | `risk()` `costZero`, line 55 warning, `forRun` `suspicious` | £0 kept, flagged, not counted as reliably costed | `wp5` (4 checks) | COMPLETE |
| Q5 | unmatched codes not quarantined | `validate.js` (identified items only) | existing matching and blocking rules | `import-mapping` 976 | DEFERRED (owner) |
| Q6 | structural zero only with a complete, valid BOM | line 120 | see §3 | probe (today) + `wp5` (invalid qty) | COMPLETE (behaviour); the structural-zero case is not in an automated test |

## 3. Findings of this verification

- **Defect, issue 26 (in scope; reported, NOT fixed, per your instruction).**
  - With the `Reorder_Point_Qty` column absent, `assess()` in `x1-integrity.js` treats column-level absence as a reason without applying the
    per-field `accepts` list. The shared record and the on-screen notice therefore say risk status depends on it, while the engine
    (correctly) assesses all items as "No reorder point configured".
  - Impact: disclosure overstated; no figure or status is wrong.
  - Proposed fix, one line: `if (col) return accepts(def, field).includes(col.state) ? [] : [{…}]`, plus a both-sides test.
  - **Awaiting your approval.**
- **Q6 verified by probe** (RM001):

| Case | Derived demand |
|---|---|
| Clean | 386 / month |
| Complete valid BOM, no line uses it | 0 (structural) |
| Every parent blank | unknown |
| Qty column absent | unknown |
| Zero or invalid quantity | unknown (`wp5`) |
| BOM sheet missing, or invalid scrap | analysis refused, never a silent 0 |

  A BOM line with a **blank Material_ID** belongs to no material, so a material it was meant for would look unused (0). This is like Q5:
  the line can't be attributed. It is recorded as a limitation, not changed.
- **Evidence gaps (no defect, no automated test):** absent On_Hand / Units_Sold / Unit_Cost / BOM-quantity columns; negative cost; D1(b)
  and D1(d) On_Order / ROP on the import route; blank On_Order under sup = 1. I added no tests in this task (none were authorised).

## 4. Reporting matters closed

1. **Q1 sequence.**
   - The protected assertions were superseded *before* the D6 sentence was added to v2 (after the fixture check).
   - It is recorded unchanged in v2 §13.3 and in `X1-TASK4-REPORT.md` §1.
   - The final design (§13.3), the code and the tests are consistent: no-rows and no-usable-history are both unknown.
2. **File table.** `forecasting.js`, `excel-import.js`, `engine/engine-api.js` and `index.html` were **all changed by X1** (tasks 2–3) and
   still are. Hashes differ from the pre-X1 baseline, `start-state/tree.sha256`. None was restored, and none is listed incorrectly. They are
   absent from the task-4 inventory only because task 4 did not change them; the task-4 production table covers all X1 tasks. Two notes:
   - `x1-integrity.js` is new and untracked, which is why it shows "same as HEAD";
   - the `js/import/` files also carry Round 2 changes made before X1.
3. **The 5 BLOCKED and 2 REDUCED tests** (latest run): `test-fglt-note`, `test-forecast-conf`, `test-supplier-eligibility`,
   `phase2-comparison`, `test-paging-chrome` (BLOCKED); `test-phase1` 57/125, `test-uom` 110/164 (REDUCED).
   - All need historical trees or tags that are not on GitHub, or Playwright's browser.
   - All were the same at Tag-5. None tests X1 behaviour, so they do not block X1 completion. They do leave pre-X1 historical comparisons
     unrun.
4. **Raw-material calendar alignment** (Finding A, HIGH, fixed). Confirmed in today's full run: `x1-wp5` 56, Willow snapshot value as
   registered, golden identical. Before and after: `X1-TASK4-REPORT.md` §2.
5. **Physical Android: NOT tested.** All browser evidence is desktop Chrome with Pixel 5 **emulation**. Procedure: `MANUAL-ANDROID-TEST.md`.
6. **Still open and visible:**
   - issue 8 (generic R7 reason on the import route; Stage 2 gate);
   - the text-number policy (REVIEW; numeric text keeps the old treatment);
   - route differences (v2 §7.1);
   - the import upload screen (none);
   - issue 26 (new).

## 5. Final checks (today, final tree, throwaway copy)

- **Full tier: 49 tests passed (+ pre-flight), 1 FAIL, 5 BLOCKED, 2 REDUCED (57).** The FAIL is `check-control`, the expected Tag-5 guard (9
  approved lines changed since Tag-5, all recorded, for Tag-6 to reconcile).

| Group | Results |
|---|---|
| Import and adapter | `import-stage1` 616 · `import-mapping` 976 · `import-engine-map` 276 · `import-adapter` 346 · `import-integrity` 396 · `same-results` 416 |
| X1 and quality | `x1-foundation` 40 · `x1-containment` 41 · `x1-wp5` 56 (5 zones each) · `stage3-quality` 28 · `stage3-round2` 35 |
| Browser | `browser-x1-chrome` 334 · `browser-chrome` 53 |
| Protection | `check-protection` 449 · `check-globals` 124 · `test-a1-static` 30 |
| Snapshots | golden v0.5 and v0.6.0 identical (5 zones) · confidence 51 (5 zones) |

- **Performance, 1,500 items:** X1 82 ms. `runEngine` 1,363 ms with X1, 1,119 ms without (this run; machine load varies, earlier
  1,114 / 974).

## 6. Conclusions

1. **Implementation completion: substantially, not wholly.**
   - D1(a), D1(b), D1(d), D2 (builder), D3, D4, D6 and D7 are implemented.
   - D5 is unchanged, as decided. E1, D2 per-figure IDs and Q5 are deferred by your decisions.
   - Of the seven field policies, six behave as specified. §5.7 has one disclosure defect (issue 26).
   - The "seven requirements" as such cannot be confirmed, because no approved list was found.
2. **Verification completion: not sufficient yet.**
   - Self-tests pass for the core cases.
   - Several specified cases are evidenced only by today's probes or not at all (§3 evidence gaps).
   - The import-route presentation cannot be tested, and physical Android is untested.
   - Nothing has been independently verified or recomputed.
3. **Acceptance readiness: not yet ready for formal acceptance.** Still needed:
   - (a) your decision on fixing issue 26;
   - (b) automated tests for the §3 evidence gaps;
   - (c) the authoritative seven-requirement list, if it differs from §5.1–§5.7;
   - (d) the physical Android check;
   - (e) independent review.

   The package *is* ready to go to an independent reviewer now, with these items listed as known gaps.
