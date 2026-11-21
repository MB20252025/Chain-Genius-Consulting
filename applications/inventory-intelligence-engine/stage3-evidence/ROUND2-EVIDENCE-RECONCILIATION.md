# Stage 3 Round 2 — evidence reconciliation (19 Nov 2026)

*Prepared by Claude at the owner's request, to reconcile the seven discrepancies DeepSeek raised against the Round 2 report. Documentation,
evidence and audit only: no application code, calculation, test, baseline, commit or tag was changed, no REVIEW item was adopted, and nothing here
is owner approval, Stage 3 acceptance or Tag-6 work. Where existing evidence is insufficient, this says so instead of supplying a value.*

## 0. State examined and how

- **Final working tree** frozen for this exercise at 2026-11-19T22:20:25Z: 1,830 files hashed (`raw/final-tree-inventory-at-freeze.sha256`).
  Against Baseline B it differs in exactly nine files, the Round 2 set: modified `js/calculations.js`, `js/app.js`,
  `tests/test-stage3-quality.js`, `tests/accepted-results.json`, `tests/checksums.txt`, `STAGE3-CHANGE-REGISTER.md`, `CHANGELOG.md`,
  `tests/V07-TEST-RECORD.md`; new `tests/test-stage3-round2.js`. HEAD `eddf09b`, no commit since; Tag-5 `v0.7-tests-approved-5` still on `f0e81bb`.
- **Baseline A** re-verified: 1,819 of 1,819 restored files' Git blob hashes equal the Tag-5 tree. **Baseline B** re-verified: its restored copy
  has 0 hash mismatches against the 1,829-file inventory.
- **New runs made for this exercise** (all read-only, on throwaway copies or with the existing scripts, results saved under `raw/`): the three
  versions of the Round 2 test on their own trees and on Baseline B (R1); the impact comparison with a per-input inventory (R2); a dead-stock
  probe (R3); the blank-column, absent-column and import-route probes on Baseline B (R4); a fast tier on the final tree (R6). These are dated
  today. They reproduce, never replace, the 18 Nov figures, and every place they differ is stated.
- Supporting files in this folder: `ROUND2-PROTECTION-INVENTORY.csv`, `ROUND2-IMPACT-INPUT-INVENTORY.csv`, `raw/` (21 files, hashes in
  `RAW-EVIDENCE.sha256`).

---

## R1 — Round 2 test size: 24 / 14 versus 35 / 19

**Resolved.** Both figures are correct, for different versions of the same test file `tests/test-stage3-round2.js`. Three versions were
reported and reviewed, and each can be rebuilt exactly from the diffs the independent reviewer received:

| Version | Source | SHA-256 (first 16) | Checks | Passes on its own tree | Fails on Baseline B | Reported / reviewed |
|---|---|---|---|---|---|---|
| v24 | Baseline B + `ROUND2-as-reviewed.diff` | `f3267657e82497cf` | 24 | 24 | **14** | Round 2 checkpoint 1; first review |
| v30 | v24 + `DELTA-since-review.diff` | `cbad39395bf08795` | 30 | 30 | **17** | second review |
| v35 | final tree (= v30 + `DELTA-since-rereview.diff`) | `c15e0a17a5d2666c` | **35** | **35** | **19** | final report; third review; matches `checksums.txt` |

Runs: `raw/r1-v24-on-own-tree.log`, `raw/r1-v24-on-baseline-B.log`, and the same for v30 and v35 (UTC).

**Final:** `test-stage3-round2` (`tests/test-stage3-round2.js`), **35 checks, 35 pass on the final tree, 19 fail on Baseline B**; registered
`accepted: 35`, fast and full tiers, two zones; also run in all five zones on 18 Nov (35/35 each).

**The step from 24 to 35 is 11 checks, not five:** six were added between v24 and v30 and five between v30 and v35. One original assertion was
replaced (strengthened). The five-check figure the question cites is the v30 → v35 step.

| Step | Change | Check |
|---|---|---|
| v24 → v30 | **replaced (strengthened)** | old: fully allocated obsolete item is *not "Potentially obsolete"*; new: it is "Active" **and** not listed in the dead-stock view. The old assertion passed on a defect (the item fell through to "Slow-moving" and stayed listed). |
| v24 → v30 | added | allocation stored as text "10": not listed, not warned |
| v24 → v30 | added | negative allocation −5: listed and warned (uncommitted 15) |
| v24 → v30 | added | allocation 15 above stock 10: not listed |
| v24 → v30 | added | On_Hand blank, usable 10: listed (usable stock not hidden) |
| v24 → v30 | added | physical 10 / usable 4 / allocated 6: listed (documented assumption) |
| v24 → v30 | added | negative allocation gives the same figure (15) in classification, unallocated usable and excess, with the High warning |
| v30 → v35 | added | unreadable allocation "abc": stays listed beside the High warning |
| v30 → v35 | added | no stock and demand stopped 9 months ago: "Active", not listed |
| v30 → v35 | added | import route: negative Planned_Qty row rejected by Stage 1 (ROW_REJECTED) |
| v30 → v35 | added | import route: completed above planned gives the same Medium warning |
| v30 → v35 | added | import route: negative lead time blanked by Stage 1 (FIELD_BLANKED) |

**Other code changes between versions** (`raw/v24-to-v30.diff`, `raw/v30-to-v35.diff`): v24 → v30 changed the test's scenario helper so that an
`undefined` value deletes the cell (needed for the blank On_Hand case; no earlier case passes `undefined`, so earlier inputs are unchanged).
v30 → v35 only adds loading of the import modules. No other assertion or expected value changed.

**Breakdown of the final 35:** R2-STK dead-stock rule 19 (7 table cases, obsolete, FG014, RM009, valuation, 5 allocation and blank cases,
negative-allocation consistency, unreadable allocation, no-stock case); R2-VIEW 4; F-A1/F-A2 4; F-A3 2; Northstar clean 1; F-A4 2; import route 3.

**Not preserved:** a 26-check draft existed briefly before two weak checks were removed (it was never registered or reported as a result; noted
in the 18 Nov narration). Its file was not kept, so its exact content cannot be shown.

## R2 — Impact analysis: 25 inputs versus 22

**Resolved.** Both figures describe one inventory: **25 inputs submitted, 22 compared.** The comparison script submits every `.xlsx` found under
`tests/fixtures` (20 files) plus 5 constructed scenarios. Three of the 20 files are not engine workbooks; both trees refuse them with the same
message, so no result exists to compare.

| # | Input | Compared | Baseline B vs final: areas that differ |
|---|---|---|---|
| 1–9 | edge/scenario-combined, -dupexact, -dupkey, -multiline, -overrec, -overshort, -partial, -posupconflict, -splitline | yes | none |
| 10 | import-v1/faults/F19-corrupt-xlsx/items.xlsx | **no** | both refuse: "Unsupported ZIP encryption" |
| 11 | import-v1/faults/F20-not-a-zip-xlsx/items.xlsx | **no** | both refuse: "Missing sheet(s): Products, Materials, BOM…" |
| 12 | import-v1/layouts/L2-erp-workbook/ERP_Extract.xlsx | **no** | both refuse: "Missing sheet(s): Products, Materials, Demand…" |
| 13 | northstar/Chain_Genius_Project_001_Northstar_Dataset_1.xlsx | yes | none |
| 14 | structure/scenario-willow.xlsx | yes | data-quality messages (new over-production warning, intended) |
| 15–20 | suppliers/scenario-allfuture, -nohist, -nopo, -s0, -three, -unknown | yes | none |
| 21 | scenario: negative Planned_Qty | yes | data-quality messages |
| 22 | scenario: Completed > Planned | yes | data-quality messages |
| 23 | scenario: negative material lead time | yes | data-quality messages |
| 24 | scenario: BOM qty 0 | yes | data-quality messages |
| 25 | scenario: FG050 no demand, fully allocated | yes | classification; data-quality messages |

Full inventory with sources and outcomes: `ROUND2-IMPACT-INPUT-INVENTORY.csv`; run: `raw/r2-wider-final-tree.txt`.

- **In both reports:** the same 25 inputs. Nothing was added or removed between them.
- **Counted differently:** the earlier wording "no difference on any of 25 inputs" counted the three refused files as compared. That wording was
  wrong and was corrected on 18 Nov to "22 compared". The 18 Nov register also said "17 fixtures + 5 scenarios + 3 non-engine files", which
  agrees with this inventory.
- **Final verified experiment:** today's run of the unchanged comparison script on the frozen final tree (`raw/r2-wider-final-tree.txt`). It is the
  only run on the final tree saved to file. The 18 Nov file `wider.txt` was made on an earlier Round 2 version (before the review corrections), and
  the reviewer's rerun on the final tree was reported but not saved. All three agree on which inputs differ.

## R3 — Negative physical stock, zero usable, unreadable and missing allocation, held stock

**Implementation** (`js/calculations.js`, final tree):

- Line 150: `const stockB=x=>{const num=v=>v===undefined||v===null||(typeof v==='string'&&v.trim()==='')?NaN:+v,S=[num(x.oh),num(x.ua)].filter(isFinite),A=num(x.al);return (S.length?Math.max(...S):NaN)-(isFinite(A)?A:0)};`
  Uncommitted stock = the larger of the readable physical (`x.oh`) and usable (`x.ua`) figures, minus the allocation if it is readable, else minus 0.
- Line 151: every listed class requires `stockB(x)>0`:
  `x.cls=stockB(x)>0&&(x.fND||L<0)?'No recorded demand':x.msl>=6&&stockB(x)>0?'Potentially obsolete':x.fEx&&stockB(x)>0?'Excess stock':stockB(x)>0&&((…))?'Slow-moving':'Active';`
- Line 55 (unchanged since Tag-5): `const neg=I.filter(r=>[r.On_Hand_Qty,r.Allocated_Qty,r.On_Order_Qty].some(x=>x<0))` → High "Negative quantities".
- Available stock (unchanged): `x.av=(usable if finite, else x.oh)-x.al`; excess `x.exQty=d>0?Math.max(0,x.av-CFG.excess*d):(x.av>0?x.av:0)`.

**Per case** (final engine; `raw/r3-probe.txt`; Northstar with FG050's demand removed):

| Case (physical / usable / allocated) | Class, listed | Available | Excess | Warnings | Test assertion (`test-stage3-round2.js`) |
|---|---|---|---|---|---|
| Negative physical −2 / 10 / 0 | No recorded demand, listed | 10 | 10 units | **High "Negative quantities"**; Medium no-demand | line 44 `[-2, 10, 0, 'No recorded demand', true, 10, …]`, checked by line 48: `s.x.cls === cls && s.w === w && Math.round(s.x.exQty) === ex` |
| Zero usable (held) 10 / 0 / 0 | No recorded demand, listed | 0 | 0 | Medium no-demand | line 45 `[10, 0, 0, 'No recorded demand', true, 0, …]`, same check |
| Held stock fully allocated 10 / 0 / 10 | Active, not listed | −10 | 0 | High "Allocated exceeds usable on-hand" | line 46 `[10, 0, 10, 'Active', false, 0, …]` |
| Unreadable allocation 10 / 10 / "abc" | No recorded demand, listed | NaN (shown "–") | 0 | **High "Non-numeric … Allocated_Qty row N "abc""**; Medium no-demand | line 63: `s.x.cls === 'No recorded demand' && inViewOf(s) && !isFinite(s.x.av) && s.r.dq.some(q => q.sev === 'High' && /Allocated_Qty row \d+ "abc"/.test(q.msg))` |
| **Missing (blank) allocation** 10 / 10 / blank | No recorded demand, listed | NaN | 0 | **Medium "Missing values in Allocated_Qty"**; Medium no-demand | **no test** (see gap below) |

**Negative physical stock:** it is *not excluded* from the uncommitted calculation; the maximum takes the usable figure (10) instead, so the item
is listed through the **ordinary** classification rule, not a separate one. It is **also flagged by a separate warning**, the High "Negative
quantities" warning at line 55, which predates Stage 3. Stock value stays physical (−2 × £74.96 = −£149.92), the accepted B6 Option D rule.

**Unreadable allocation:** `num("abc")` is `NaN`; the branch `(isFinite(A)?A:0)` in line 150 then subtracts 0, so the item counts as fully
uncommitted and is listed. Available stock uses the raw value and becomes `NaN`, so excess is 0 (`x.av>0` is false) and the view shows "–".
**Why visible:** hiding stock whose commitment is unknown would remove it from the report where a person would look for it; keeping it listed,
beside the High warning that names the cell, shows the stock and the reason the figure is unreliable. This was a deliberate engineer choice,
documented in the line 150 comment and recorded as LOW limitation R2-ALLOC; the reviewer would prefer "unknown" (R7). It is an owner decision.

**Gaps found by this reconciliation (not fixed; tests may not be changed in this exercise):**
1. No test asserts the separate "Negative quantities" warning for the negative-physical case (the behaviour is shown by the probe only).
2. No test covers a **missing (blank)** allocation. The reviewer asked for "unreadable or blank" on 18 Nov; only "abc" was added. The probe shows
   blank behaves like unreadable, with a Medium "Missing values" warning instead of a High one.

## R4 — The seven critical numeric columns used by XCRT

XCRT is an experiment (patch `EXP-XCRT.patch` against Baseline B), status **REVIEW**; nothing below adopts it. Its list (in `apply-numeric.py`) is:
`Inventory:On_Hand_Qty`, `Inventory:Allocated_Qty`, `Inventory:On_Order_Qty`, `Inventory:Reorder_Point_Qty`, `Inventory:Unit_Cost_GBP`,
`Demand History:Units_Sold`, `BOM:Qty_Per_Finished_Unit`. **Basis:** one blank cell (row 2) in each of the 21 numeric engine columns of Northstar
on Baseline B; these seven, and only these, produce non-finite results (`raw/probe-blanks-on-B.txt`, rerun today with the 18 Nov script).

| Column | Non-finite values from one blank cell (B) | Calculations that depend on it (`js/calculations.js` line) | Can it legitimately be blank? | Import route, one blank cell (B) | Mandatory on the direct route? |
|---|---|---|---|---|---|
| `Inventory.On_Hand_Qty` | 78; **stock value and excess headline NaN** | item stock and value (117, 140), allocation check (56), negative check (55), availability, dead stock | no | **import refused** (Stage 1 ROW_REJECTED) | no checksum or column rule; column removed or empty → analysis stops with "Invalid time value" (same at Tag-5) |
| `Inventory.Allocated_Qty` | 60; **excess headline NaN** | availability `av` (117, 140), allocation check (56), negative check (55), dead stock | arguably yes (blank often means none allocated) | runs, **excess value withheld** by the gate | no; removed or empty → "Invalid time value" (same at Tag-5) |
| `Inventory.On_Order_Qty` | 6 (item level); headline finite | stock position, MRP open supply (117, 140), PO reconciliation (92, 95, 198–199), negative check (55) | **yes** (nothing on order) | runs, headline finite | no; removed → runs with 1,400 non-finite values, no column warning |
| `Inventory.Reorder_Point_Qty` | 9 (item level); headline finite | reorder logic and display (95, 117, 140), ROP-vs-safety check (57) | **yes** (no reorder point set) | runs, headline finite | no; removed → 1,150 non-finite values, **no warning** |
| `Inventory.Unit_Cost_GBP` | 495; **stock value and excess headline NaN** | item cost and value (117, 140), PO gap value (95), cost checks (58, 60) | not for valuation; may be unknown | runs, **all money totals withheld** (`fgV`, `rmV`, `exV`) | no; removed → 5,278 non-finite values, **no warning** |
| `Demand History.Units_Sold` | 574; excess headline **changes silently** (£106,934 → £111,387) | demand history, forecasts, cover, excess (111), material usage via BOM (120), odd-demand check (102) | ambiguous (missing month vs no sales) | row rejected, history marked incomplete, then runs | no; removed → 6,203 non-finite values, **no warning** |
| `BOM.Qty_Per_Finished_Unit` | 1 | material usage (120), production feasibility requirement (189), BOM checks (68, 73) | no | **import refused** (Stage 1 ROW_REJECTED) | no; removed → 200 non-finite values, **no warning** |

Evidence: `raw/probe-blanks-on-B.txt`, `raw/column-absent-or-empty-on-B.txt`, `raw/import-route-blank-on-B.txt`.

**Optional or withheld cost and quantity fields:** `Inventory.Unit_Cost_GBP` is the cost field the import adapter deliberately writes blank when
Stage 1 cannot read a money value, after which the gate **withholds** every money total; `Allocated_Qty` blank also leads the gate to withhold the
excess value. `On_Order_Qty` and `Reorder_Point_Qty` can be legitimately blank and the import route runs with them blank.

**Assessment (not approval):** the list is evidence-based for "a blank produces non-finite results", but it is **not** a list of fields the
import route refuses. XCRT would refuse on the direct route where the import route refuses (On_Hand, BOM qty), rejects a row (Units_Sold),
withholds (Allocated, Unit_Cost) or simply runs (On_Order, Reorder_Point). Refusing a blank On_Order_Qty or Reorder_Point_Qty, which can be
legitimately blank, is stricter than the import route and stricter than the evidence requires for headline figures. The seven-column list
remains part of the X1 REVIEW decision.

**Also observed (pre-existing, outside Round 2):** removing or emptying On_Hand_Qty or Allocated_Qty stops the direct route with an unhelpful
"Invalid time value" message (identical at Tag-5); removing four of the other columns runs with thousands of non-finite values and no warning.

## R5 — X1R: "443/443 standalone" versus "31 PASS standalone"

**Resolved: different measures from different commands, both correctly attributed, but reported next to each other without their units.**

| Figure | Command (in the X1R experiment copy `/tmp/ft-X1R/.../tests`) | What it counts | Log |
|---|---|---|---|
| 443/443 | `NODE_PATH=… node check-protection.js` | individual checks inside **one suite**, `check-protection` (3 Git references + 440 protected files) | console output (18 Nov), quoted in the register; the same suite also passes 443/443 inside the standalone fast run |
| 31 PASS | `NODE_PATH=… bash run-all.sh --fast` | **result rows** of the fast tier: 32 tests + the pre-flight row = 33 rows; 31 PASS, 2 FAIL (`check-control`, the Tag-5 guard; `stage3-quality`, 12 checks that assert today's warn-only behaviour) | `raw/r5-fast-tier-X1R-standalone.log` |

The 443 is not 444 because X1R is built on Baseline B, which has 440 protected files; the final tree adds `test-stage3-round2.js`. The earlier
parallel run (`raw/r5-fast-tier-X1R-parallel.log`: 30 PASS, 2 FAIL, 1 ERROR "no summary line" in `check-protection`) was a load artefact of five
tiers running at once; both standalone runs and the reviewer's own run show `check-protection` passing.

## R6 — Fast tier 33 PASS / 1 FAIL versus full tier 45 (46) PASS / 1 FAIL / 5 BLOCKED / 2 REDUCED

**Resolved.** The runner's PASS count **includes the pre-flight row**; the "45" in the report excluded it. Like for like:

| | Tests in tier | PASS rows (runner) | Tests passed | FAIL | BLOCKED | REDUCED | ERROR |
|---|---|---|---|---|---|---|---|
| Fast, final tree (run 19 Nov, `raw/fast-tier-final-tree.log`) | 33 | 33 | **32** | 1 | 0 | 0 | 0 |
| Full, final tree (run 18 Nov after all corrections, `raw/full-tier-final-tree.log`) | 53 | 46 | **45** | 1 | 5 | 2 | 0 |

**Difference, 32 → 45 tests passed (+13):** the full tier runs 21 tests the fast tier does not (14 pass, 5 BLOCKED, 2 REDUCED) and replaces one
fast-only test with its full twin:

- fast-only, dropped in full: `test-a1-wrapper-quick` (117, 100-call wrapper);
- full-only and passing (14): `test-a1-wrapper` (117, the 1,000-call twin), `test8` 47, `test9` 57, `domtest` 30, `domtest2` 18,
  `test-failed-import` 18, `test-export-nohistory` 19, `test-timezones` 15, `test-structure` 34, `test-paging` 23, `test-missing-values` 63,
  `python-verifier` 17, `scenarios` 16, `browser-chrome` 53;
- full-only, BLOCKED (5): `test-fglt-note`, `test-forecast-conf`, `test-supplier-eligibility` (historical trees absent), `phase2-comparison`
  (tag not on GitHub), `test-paging-chrome` (Playwright browser download blocked);
- full-only, REDUCED (2): `test-phase1` 57 of 125, `test-uom` 110 of 164 (historical comparison inputs absent).

So 32 − 1 + 14 = 45. Newly introduced tests since Tag-5 (all in both tiers, all passing): Round 1 / D1–D4 `allocated-usable` 23, `empty-text` 46,
`shortage-delay` 19, `scrap-rules` 71, `tz-boundaries` 71, `partial-totals` 8, `stage3-quality` 28; Round 2 `stage3-round2` 35. The fast tier
runs most tests in UTC only (golden and confidence in five zones); the full tier in their registered zones (one, two or five).

**The designed Tag-5 guard failure:** `check-control` FAILs in both tiers (9 of 12; 3 checks fail: `run-all.sh` changed since the approved
baseline, the confidence reference changed, approved checksum lines changed). It reports the pending counts for approval and turns green only
when the owner approves and Tag-6 moves the approved baseline.

**Consolidated final result (final tree):**

| Test | Origin | Fast | Full |
|---|---|---|---|
| pre-flight | runner | PASS | PASS |
| check-control | Tag-5 guard | **FAIL** (designed) | **FAIL** (designed) |
| check-protection | Tag-5 | 444 | 444 |
| check-globals | Tag-5 | 116 | 116 |
| test-a1-static / -sync-path / -state / -escaping | Tag-5 | 29 / 74 / 10 / 46 | 29 / 74 / 10 / 46 |
| test-a1-wrapper-quick | Tag-5 | 117 | — (fast only) |
| test-a1-wrapper | Tag-5 | — (full only) | 117 |
| import-stage1 / -mapping / -engine-map / -adapter | Tag-5 | 616 / 976 / 276 / 346 | same |
| same-results / import-integrity | Tag-5 (counts raised in D1–D4) | 416 / 396 | 416 / 396 |
| allocated-usable / empty-text / shortage-delay / scrap-rules / tz-boundaries / partial-totals | new, D1–D4 | 23 / 46 / 19 / 71 / 71 / 8 | same |
| stage3-quality | new, Round 1 | 28 | 28 |
| stage3-round2 | new, Round 2 | 35 | 35 |
| characterisation-lead-time | Tag-5 | 28 | 28 |
| golden v0.5 / golden v0.6.0 / confidence v0.7 | Tag-5 | 10 / 10 / 5 zones | same |
| test7, test-po-edge, test-fillcap, test-export-repeat, test-cache, test-blank-qty, test-na-constraints | Tag-5 | 118, 35, 276, 24, 15, 19, 88 | same |
| 14 full-only tests listed above | Tag-5 | — | all PASS |
| 5 BLOCKED, 2 REDUCED listed above | Tag-5 | — | BLOCKED / REDUCED |
| **Total** | | **33 PASS rows = 32 tests + pre-flight; 1 FAIL** | **46 PASS rows = 45 tests + pre-flight; 1 FAIL; 5 BLOCKED; 2 REDUCED; 0 ERROR** |

The 18 Nov "fast tier 33 PASS" figure in checkpoint 1 was measured on an earlier Round 2 tree (24-check test); today's fast run on the final tree
gives the same row counts.

## R7 — Independent review severity register (all findings, three Round 2 passes and the Round 1 review)

Severity: the reviewer's own where it gave one (marked R); otherwise classified here (marked E) by the same scale. No finding is omitted because it
was corrected. Sources: the reviewer's reports of 18 Nov (Round 1; Round 2 passes 1–3), quoted in the 18 Nov session and summarised in
`STAGE3-CHANGE-REGISTER.md` (Round 1 reconciliation, R2.2, R2.13).

| # | Review | Finding (original substance) | Severity | Affected | Corrected? | Evidence of correction | Confirmed by later review? | Disagreement / engineer's evidence |
|---|---|---|---|---|---|---|---|---|
| 1 | Round 1 | Dead-stock v1: physical 10 / usable 0 with no demand no longer flagged; £749.60 disappears from the view | MEDIUM (R) | calculations.js 150–151 | yes (Round 1 v2, kept in v3.1) | test-stage3-round2 line 45 | yes (Round 2 pass 1 reran the comparison) | none |
| 2 | Round 1 | Physical −2 / usable 10 listed with Qty −2 and value −£149.92 | MEDIUM (R) | app.js view | partly: four quantities now shown; value stays physical | R2-VIEW checks; mock-ups | n/a | value rule is accepted B6 Option D; display is the owner's interface decision |
| 3 | Round 1 | Numeric-column check only warns; NaN still reaches headline totals | MEDIUM (R) | calculations.js 65 | no (X1 REVIEW) | matrix (21 cases) | n/a | none; owner decision |
| 4 | Round 1 | Warning said "not converted" though JavaScript coerces "120" | LOW (R) | calculations.js 65 | yes (Round 1) | message text | yes (pass 1 did not repeat it) | none |
| 5 | Round 1 | Row numbers on the import route refer to the Engine View | LOW (R) | calculations.js 65 | no | — | n/a | low impact: Stage 1 rejects such values first |
| 6 | Round 1 | Mutation "obsolete on physical only" undetected | LOW (R) | test-stage3-quality | yes | 4 obsolete cases; mutation fails 1 check | yes | none |
| 7 | Round 1 | Mutation "Suppliers removed from the check" undetected; 8 of 18 columns tested | LOW (R) | test-stage3-quality | partly (11 of 18) | mutation fails 1 check | n/a | 7 columns still untested individually |
| 8 | Round 1 | D5 wording also used when no usable column exists | LOW (R, "minor") | calculations.js 56 | partly (view note) | app.js note | n/a | 3A message unchanged; open LOW |
| 9 | Round 1 | Stage 2 record R4 still says totals "withheld" | INFORMATIONAL (E) | IMPORT-V1-STAGE2-RECORD.md | yes (RG3 amendment) | dated amendment | n/a | none |
| 10 | Round 1 | compare-snapshots prints no detail for non-array sections (pre-existing) | INFORMATIONAL (E) | compare-snapshots.js | no | — | n/a | pre-existing |
| 11 | Round 1 | Five-file limit reached when registry files are counted | LOW (R) | process | noted | — | n/a | registry edits accompany any test change |
| 12 | Round 1 | Dead-stock flags ignore allocations (10 / 10 / 10 flagged, excess £0) | MEDIUM (E; reviewer gave none) | calculations.js 150 | yes (Round 2 v3, v3.1) | test-stage3-round2 line 42 | yes (pass 1 and 2) | none |
| 13 | Round 1 | Dead-stock view Qty/Value on physical while class uses usable stock | MEDIUM (E) | app.js 35 | partly (four quantities shown) | R2-VIEW | n/a | same as #2 |
| 14 | Round 1 | A future adapter emitting an RG3 spec would be refused (deliberate) | INFORMATIONAL (R) | result-gate.js | not a defect | — | n/a | none |
| 15 | R2 pass 1 | D1: fully allocated obsolete item falls to "Slow-moving" and stays listed | MEDIUM (R) | calculations.js 151 | yes (v3.1) | test line for obsolete (strengthened, R1) | **yes, pass 2** | none |
| 16 | R2 pass 1 | D2: classification and available stock read allocation differently ("10", −5) | MEDIUM (R) | calculations.js 150 | yes (v3.1) | tests for "10" and −5 | **yes, pass 2** | none |
| 17 | R2 pass 1 | D3: blank On_Hand hides usable stock (from Round 1) | MEDIUM (R) | calculations.js 150 | yes (v3.1) | test for blank On_Hand | **yes, pass 2** | none |
| 18 | R2 pass 1 | D4: 10 / 4 / 6 listed although unallocated usable is −2 | LOW (R; "an assumption") | calculations.js 150 | documented and tested | test line 59 | yes (pass 2) | owner decision with the excess definition |
| 19 | R2 pass 1 | D5: unreachable scrap conditions left in the BOM filter | LOW (R) | calculations.js 68 | yes | filter tests quantity only | **yes, pass 2** | none |
| 20 | R2 pass 1 | Experiments X1T/XCT: marker also exempted invalid values | MEDIUM (E; experimental code) | EXP-X1T, EXP-XCT | yes (blank-only) | matrix marker checks | **yes, pass 2** | none |
| 21 | R2 pass 1 | Marker lost on write and read: outcome depends on origin | LOW (E) | EXP-T/RT design | documented | matrix marker checks | yes (pass 2: "a design point") | owner decision (REVIEW) |
| 22 | R2 pass 1 | XC converts money "(25)" where the import route withholds | LOW (E) | EXP-XC | yes | matrix row "(25)" | **yes, pass 2** | none |
| 23 | R2 pass 1 | `_GBP` name suffix weaker than explicit currency confirmation | INFORMATIONAL (E) | EXP-XC | no (design) | — | n/a | owner decision with Option C |
| 24 | R2 pass 1 | XC contradicts the Suppliers note ("not converted") | LOW (E) | EXP-XC, app.js | yes | EXP-XC.patch | **yes, pass 2** | none |
| 25 | R2 pass 1 | Under T, Selling_Price "abc" (32) and MOQ "abc" (4) leave non-finite values | INFORMATIONAL (E; T only warns there) | EXP-T | no (policy design) | — | n/a | XCRT refuses these |
| 26 | R2 pass 1 | R skips Usable_On_Hand_Qty despite "any column"; blank On_Hand still NaN under R | LOW (E) | EXP-X1R | description corrected | apply-numeric.py | n/a | usable is optional and checked separately |
| 27 | R2 pass 1 | No fast-tier log for X1R | LOW (E) | evidence | yes | standalone log | **yes, pass 2 (reran)** | none |
| 28 | R2 pass 1 | Experiments never tested combined with the Round 2 changes | INFORMATIONAL (E) | experiments | no | — | n/a | Tag-6 step: re-base any adopted experiment |
| 29 | R2 pass 1 | "No difference on any of 25 inputs" overstates: 3 inputs error on both | LOW (E) | evidence wording | yes | R2 above | n/a | none |
| 30 | R2 pass 1 | Missing tests: allocation as text, negative, blank, non-finite | LOW (E) | test-stage3-round2 | **partly**: text, negative, above-stock, unreadable added; **blank allocation still untested** | tests (R1 list) | n/a | open gap (R3) |
| 31 | R2 pass 1 | Missing test: fully allocated obsolete/slow item not in the view | LOW (E) | test | yes | strengthened check | **yes, pass 2** | none |
| 32 | R2 pass 1 | Missing test: blank On_Hand with usable stock | LOW (E) | test | yes | check | yes | none |
| 33 | R2 pass 1 | Missing tests: import-route parity for F-A1–F-A3 | LOW (E) | test | yes (v35) | 3 import-route checks | **yes, pass 3** | none |
| 34 | R2 pass 1 | Missing tests shipping with the experiment patches | LOW (E) | experiments | no | — | n/a | to be written if a policy is adopted |
| 35 | R2 pass 1 | `check-control` reports the confidence reference changed against Tag-5 | INFORMATIONAL (R) | guard | by design | — | n/a | clears at Tag-6 |
| 36 | R2 pass 2 | Unreadable or blank allocation counts as 0 while available stock is unknown | LOW (R) | calculations.js 150 | documented and tested ("abc") | line 63; code comment | yes (pass 3: "acceptable") | **yes**: reviewer prefers "unknown"; engineer keeps it listed so the stock stays visible beside its warning (R3) |
| 37 | R2 pass 2 | Missing test: no stock, falling demand → Active | LOW (E) | test | yes (v35) | check | **yes, pass 3** | none |
| 38 | R2 pass 3 | Three of the five v35 checks pass on Baseline B: they record existing behaviour, not a correction | INFORMATIONAL (R) | test | n/a | R1 counts | n/a | accepted |
| 39 | R2 pass 3 | Direct route warns, import route rejects or blanks negative planned quantity and lead time | INFORMATIONAL (R) | routes | n/a (now visible and tested) | 3 import-route checks | n/a | accepted |

**Final reviewer recommendations (pass 3, unchanged since pass 2):** R2-STK KEEP; F-A1–F-A4 KEEP; both test files, registry and checksums KEEP;
R2-VIEW REVIEW; EXP-XC, X1R, X1T, XCT EXPERIMENTAL; EXP-XCRT REVIEW. Nothing to revert. The only disagreement is #36.

**Limitation of this register:** the reviewer's reports exist as text in the 18 Nov session record, not as files in the repository; the table
reproduces their substance. If a verbatim archive is required, the reports would need to be exported from that session record.

---

## 3. Protection evidence

`ROUND2-PROTECTION-INVENTORY.csv` lists every file in any of the three protection inventories (the `file` lines of `tests/checksums.txt` in A,
B and the final tree: 431, 440 and 441) and the three Git references, with the actual SHA-256 of the file in each tree, presence in each tree,
presence in each tree's list, whether it changed in Round 2, whether each list's recorded hash matches the file, and its classification.
Generated from the trees, not copied from the lists. CSV SHA-256 `4821b5cd6af0b340afa974a2b0f346022f43eadab3924f8496c83dfb40aac05a`.

| Classification | Files |
|---|---|
| unchanged since Tag-5 | 422 |
| modified since Tag-5 (all before Round 2) | 7: `compare-snapshots.js`, `snapshots/README.md`, `test-import-integrity.js`, `test-import-stage1.js`, `test-same-results.js`, `test-uom.js`, `tools/import-v1/reverse-eight-sheet.js` |
| added after Tag-5, before Round 2 | 9: `snapshots/permitted-differences.json`, `snapshots/v0.7-confidence-20261116T034921Z.json`, 7 tests (`test-stage3-quality.js` among them, which Round 2 also changed) |
| added in Round 2 | 1: `test-stage3-round2.js` |
| protected historical file, unchanged | 2 in the list: `v0.5-golden-20261105T101953Z.json`, `v0.6.0-baseline-20261109T152050Z.json` |
| supplementary row | 1: `v0.7-confidence-20261112T011814Z.json` |
| Git references, unchanged | 3: `refs/heads/main`, `refs/heads/release/v0.6`, `refs/tags/v0.6` (all `8117c72`) |

Changed in Round 2 (B → final): `test-stage3-quality.js` (re-hashed) and `test-stage3-round2.js` (added). Removed: none. Recorded-hash mismatches
in any list: 0.

**Correction to the 18 Nov report:** `v0.7-confidence-20261112T011814Z.json` is **not** in the checksum list (neither at Tag-5 nor now). It is
byte-identical in A, B and the final tree, but that is identity, not checksum protection; the 18 Nov report listed it among "historical
snapshots unchanged" without that distinction.

## 5. Conclusion

- **All seven discrepancies are resolved by evidence.** Two remaining gaps are evidence or test gaps, not discrepancies: (a) the 26-check draft
  of the Round 2 test was not preserved; (b) the reviewer's reports are not archived as files. Two **test gaps** were found (R3: blank allocation;
  negative-physical warning not asserted) and are listed, not fixed.
- **Errors in the 18 Nov reporting that this corrects:** "12 points" (13 in Round 1); "no difference on any of 25 inputs" (22 compared, corrected
  then); "five additional checks" in the question's framing (11 added, one strengthened, over two steps); "45 PASS" next to "33 PASS" (different
  units: tests versus runner rows); the 12 Nov confidence snapshot described as protected (identical, not in the checksum list); "443" next to
  "31" without units.
- **The Round 2 engineering is unchanged:** the nine Round 2 files hash as frozen at the start of this exercise; only this `stage3-evidence/`
  folder and one pointer line in `STAGE3-CHANGE-REGISTER.md` were added.
- **Baselines A and B remain protected** and re-verified (1,819/1,819; 0 mismatches over 1,829).
- **Owner decisions remain REVIEW:** X1 numeric validation (XCRT candidate; R4 shows its seven-column list is stricter than the import route for
  four columns); cross-route Option C; dead-stock interface (mock-ups); genuinely-excess definition; R2-ALLOC (#36).
- **Readiness:** the evidence is now internally consistent and auditable. The project is ready for the owner's review and decisions; it is **not**
  ready for Tag-6 until those decisions are made and the Tag-6 steps in `STAGE3-CHANGE-REGISTER.md` R2.15 are completed. Nothing here approves
  anything.
