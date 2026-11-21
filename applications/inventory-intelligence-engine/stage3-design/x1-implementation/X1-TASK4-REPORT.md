# X1 Numeric Integrity: task 4 report, final review package (21 Nov 2026)

**Status: Implemented; awaiting independent review and owner acceptance.**
- X1 is **not** accepted. No calculation is Verified.
- Not committed, pushed, merged, tagged, published or deployed. No Tag-6. Stage 2 is not closed.
- Every check is Claude's own testing (self-review).
- The Stage 3A proposal is not implemented.
- `stage3-design/evidence/` was excluded from every operation.

This report supersedes the "awaiting decision" items of `X1-TASK3-REPORT.md`; everything else there stands.

## 1. Owner approvals Q1–Q4

| | Evidence checked first | Result |
|---|---|---|
| **Q1** D6 for no demand rows | FG050 and FG014: 12 positive Northstar rows each, **0 recorded zeros**; the tests *remove* them. M0058's sole parent P0001: 24 positive rows, **0 recorded zeros**, *excluded* in I6. All are "no rows", none is recorded zero. | Implemented (CR-17). Unknown, Not Assessed; uncommitted stock still listed and warned. 16 Round 2 / quality checks and 1 I6 check superseded; I6's own words "false excess" cited. |
| **Q2** negative allocation | — | The one Round 2 assertion superseded (CR-18). |
| **Q3** Willow snapshot | Regenerated on the final code: exactly one value differs (`clientQuestions[6].ev` "4 items" → "3 items"). | New dated snapshot `v0.7-confidence-20261121T075533Z.json` registered; the 12 and 16 Nov files are unchanged (CR-20). |
| **Q4** D1(a) quarantine | — | Stage 1 plus the minimum adapter change (CR-19). 10 `import-mapping` checks superseded. |

**Order of work, disclosed.** The v2 D6 sentence (Q1 step 1) was added *after* the assertions were superseded, though after the fixture
check. The content is unaffected (v2 §13.3).

**New owner questions:**
- **Q5:** should stock rows that match **no** item (unmatched, suggested links, "TOTAL" lines) also be quarantined? Today they keep the approved
  item-matching rules and still block the import. I treated D1(a) as covering rows of identified items only, rather than assume.
- **Q6:** please confirm that a raw material used by **no** BOM line keeps derived demand 0 (structural) and is not "unknown".

## 2. Proactive Engineering Finding A: raw-material month misalignment (severity **HIGH**, fixed)

- **Cause.** `calculations.js` line 120 built each material's monthly usage by adding parent demand **by row position**
  (`(ds[b.SKU]||[]).forEach((x,i)=>use[k][i]+=…)`): the 1st row of every parent went into slot 1, and so on. When parents cover different
  months, different calendar months were added together, and trailing slots held only some parents. This happens with a gap, a later start
  or an earlier end; duplicate rows also shift positions.
- **Path affected.** Material usage (`h`), then:
  - average usage `m`, variability `sg` / `cv`;
  - safety stock, recommended reorder point, cover, flags, severity, health;
  - excess;
  - MRP gross requirement (`m × horizon`);
  - ABC / XYZ;
  - client questions.
- **Not affected:** feasibility, which uses BOM quantities per order, and finished goods.
- **Where it occurred.** Among the 17 snapshot workbooks, only Willow, where parents cover 9 or 10 different months. 12 of its 22 materials
  changed. In the other 16 workbooks every parent covers the same 12 months, and results are identical (refined comparison, task 3). It can
  occur in any dataset whose BOM parents do not all cover the same months; it cannot occur when they do.
- **Before and after (Willow `ing 017`, 6 parents with 9 or 10 months):**

| | Monthly usage | Avg/month | Recommended ROP | Verdict |
|---|---|---|---|---|
| Before | 2236 2100 2300 2161 2180 2019 2153 2083 2071 **266** (a 10th "month" from only the 2 parents with 10 rows) | 1957 | 2890 | **Existing ROP insufficient** (false) |
| After | 6 months where every parent is known; the other 6 are unknown (`?`) | 2111 | 2429 | Broadly aligned |

- **Severity.** HIGH because the demonstrated effect is a **false procurement signal** on a real item and wrong usage for 12 of 22 materials
  in that dataset. Its spread beyond the fixtures has not been measured.
- **Tests:**
  - `test-x1-wp5.js`: one missing parent month makes exactly that month unknown for that parent's materials, and every other material's history
    is identical;
  - all 17 fixtures remain fully assessed;
  - golden is identical;
  - the confidence snapshot moves only by the Willow value (Q3).

## 3. Snapshot impact check, enumerated (requirement B)

`SNAPSHOT-IMPACT-INVENTORY.md` is a generated, fixture-by-fixture table for all 17 golden, confidence and browser workbooks. It covers
negative Allocated / On_Order / Reorder_Point, zero `Unit_Cost_GBP`, blank allocation, text in a stock number field, zero or invalid BOM
quantity, blank / invalid / negative `Units_Sold`, recorded zero months and finished goods with no demand rows.

**Every fixture has 0 matches in every column**, so no snapshot needed treatment for D1(b), D1(d), D7 or invalid demand. Treated
separately: Willow's gaps (Q3) and the two import-route fixtures (Package 01 / I6, and fault F01, superseded under Q1 and Q4).

## 4. Production file-by-file changes (all X1 tasks; requirement C)

| File | Change (behaviour) |
|---|---|
| `js/calculations.js` (still 217 lines; inline) | MRP containment (no crash, Not Assessed with reason); `risk()`: inputs checked before use; Not Assessed severity, health, class, flags (null), figures non-finite; contract formulas kept; D1(d) negatives prohibited and warned; D7 zero cost flagged; totals stay non-finite with an unknown component, coverage `R.cov`; ABC ranks known values only; feasibility never reads unknown stock as 0, invalid BOM line gives "Insufficient information"; D6 calendar-indexed history, no-usable-history and no-rows = unknown; material usage by calendar month (Finding A); uncommitted-stock warning for unknown demand |
| `js/forecasting.js` | gap-aware fitting (`gapSeg` / `gapTxt`): models use only the last run of consecutive months, with the reason; stock-cover advice explained, never dropped |
| `js/validation/x1-integrity.js` (new) | shared field-state and provenance record (D2), 10 states, dependency registry incl. risk-status and derived demand, calendar history, D7 suspicious list, the single reason channel `reasonsFor`, quarantine records |
| `js/app.js` | `INTEG` from the shared builder; Not Assessed + reason in Overview, Health, Finished goods, Materials, Excess & dead stock, Summary, MRP; coverage and partial totals; stock-cover "Not Assessed" band; banner (final D4 wording) |
| `js/excel-import.js` | export: empty cell + `Assessment` + `AssessmentReason` for unassessed figures |
| `js/engine/engine-api.js` | attaches `out.integrity` (same builder); passes the risk policy |
| `js/import/validate.js` (Stage 1, D1(a)) | bad stock row of an identified item gives `ROW_QUARANTINED` (non-blocking); other tables and unmatched rows unchanged |
| `js/import/adapter.js` (Stage 2, Q4 only) | quarantined item written with no stock values, never partly summed; included in the reconciliation report and check |
| `index.html` | loads the X1 module; cache versions `?v=0.7-x1` |

**Not production:**
- tests: `tests/*x1*`, the superseded Stage 3 and import tests, `accepted-results.json`, `checksums.txt`, `README.md`, snapshots;
- design and records: `stage3-design/**`;
- evidence: screenshots, logs, candidate files.

## 5. Per work package (requirement D)

### WP5: Not Assessed and calculation integrity: Implemented; Tested – passed; awaiting independent review
1. **Production:** `calculations.js` (risk, health, class, ABC, totals, coverage, feasibility, MRP, D1(d), D7, D1(b)); `x1-integrity.js`;
   `validate.js` and `adapter.js` (D1(a)).
2. **Behaviour:**
   - unknown, invalid or prohibited inputs produce Not Assessed with a reason, never a healthy status, a 0 or a number in a total;
   - bad stock rows are quarantined, not refused;
   - zero BOM lines are invalid; zero cost is suspicious.
3. **Tests:** `test-x1-wp5.js` (56 checks, 5 zones). Both sides (affected items and every unaffected item); clean fixtures fully assessed;
   engine/record consistency; import-route parity and quarantine.
4. **Evidence:** full tier and browser (§6).
5. **Preserved:** golden v0.5 and v0.6.0 identical; same-results 416; all import tests (as superseded); 16 of 17 confidence fixtures identical.

### WP6: demand history and forecasting: Implemented; Tested – passed; awaiting independent review
1. **Production:** `calculations.js` (history, raw-material usage); `forecasting.js` (gap-aware fitting).
2. **Behaviour:** recorded positive, recorded zero, missing month, no usable history (including no rows) and insufficient consecutive history are
   distinct; material usage is calendar-aligned (Finding A); no new model.
3. **Tests:** in `test-x1-wp5.js` (blank cell, gap, short run, all blank, all zero, no rows, derived months, parent with no rows).
4. **Evidence:** Willow prediction confirmed. The 6 predicted forecasts changed; the additional 12 materials are explained (Finding A); one
   snapshot value changed (Q3).
5. **Preserved:** gap-free histories are byte-identical; `forecastCredibility` and `confidence` are unchanged.

### WP7: presentation and exports: Implemented; Tested – passed (real browser); awaiting independent review
1. **Production:** `app.js`, `excel-import.js`.
2. **Behaviour:**
   - Not Assessed + reason (from the shared record) in every listed view;
   - coverage and partial totals;
   - an export row carries its status and reason, with no NaN and no plausible number;
   - banner amended (owner §6.1);
   - dead-stock list shows a Not Assessed item only when it holds uncommitted stock.
3. **Tests:** `browser-x1-chrome.js` (334).
4. **Evidence:** `browser-evidence-20261121-task4/` (36 screenshots, log, SHA256SUMS; desktop and Pixel 5 **emulation**).
5. **Preserved:** every unaffected item shown is identical to clean data in every view checked.
- **Limitation:** import-upload presentation is not testable (no import screen); physical Android not tested (`MANUAL-ANDROID-TEST.md`).

### WP8: regression, protection, review package: Done
1. **Production:** none in WP8.
2. **Behaviour:** none.
3. **Tests:** full tier, fast tier, browser and protection runs; no test weakened or removed; every supersession keeps its original as a
   comment and gives the reason.
4. **Evidence:** §6 and the change record (CR-01 to CR-22).
5. **Preserved:** all start states (1 to 4), the task-2 and task-3 evidence, the 12 and 16 Nov snapshots, v1, Tag-5 and the guard.

## 6. Final results (final tree, throwaway copy)

**Full tier: 49 tests passed (+ pre-flight), 1 FAIL, 5 BLOCKED, 2 REDUCED (57 tests).**
- **FAIL `check-control`:** the expected Tag-5 guard. It now lists **9** approved lines changed since Tag-5, all legitimate and recorded. Tag-6
  must reconcile them, plus the P3 and snapshot additions; that is not done here.
- **BLOCKED / REDUCED:** the same seven as at Tag-5.
- **No other failure.** The previous Round 2 and confidence-snapshot failures are resolved by Q2 and Q3.
- **Passing (selection):**
  - protection and structure: `check-protection` **449**, `check-globals` 124, `test-a1-static` 30;
  - import route: `import-stage1` 616, `import-mapping` 976, `import-engine-map` 276, `import-adapter` 346, `import-integrity` 396;
  - route equality and Stage 3: `same-results` 416, `stage3-quality` 28, `stage3-round2` 35;
  - X1: `x1-foundation` 40, `x1-containment` 41, `x1-wp5` 56 (5 zones each), `browser-x1-chrome` 334;
  - snapshots: golden v0.5 and v0.6.0, confidence 51 (5 zones);
  - other browser: `browser-chrome` 53.
- **Performance (1,500 items):** X1 81 ms; `runEngine` 1,114 ms with X1, 974 ms without.

**Inventory, task 4** (from `start-state-4/`; nothing removed; 0 evidence paths):

| Type | Files |
|---|---|
| Changed, production | `js/calculations.js`, `js/app.js`, `js/validation/x1-integrity.js`, `js/import/validate.js`, `js/import/adapter.js` |
| Changed, tests and records | `tests/accepted-results.json`, `tests/checksums.txt`, `tests/snapshots/README.md`, `tests/test-import-integrity.js`, `tests/test-import-mapping.js`, `tests/test-stage3-quality.js`, `tests/test-stage3-round2.js`, `tests/test-x1-foundation.js`, `tests/test-x1-wp5.js` |
| Changed, documents | the v2 design, `X1-CHANGE-RECORD.md` |
| Added | the new snapshot; `start-state-4/` (3); `SNAPSHOT-IMPACT-INVENTORY.md`; this report; `browser-evidence-20261121-task4/` (38) |

**Git:** HEAD `eddf09b`, 6 tags, 0 stashes, index empty.

## 7. Still open

- **Owner:** Q5, Q6.
- **Blocked or reduced:** the seven tests above.
- **Not tested:** physical Android; import-upload interface.
- **Awaiting:** independent review; owner acceptance.
- **Unchanged and documented:** issue 8 (generic R7 reason on the import route, Stage 2 gate); text-number policy (REVIEW); route differences of
  v2 §7.1.
