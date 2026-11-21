# X1 requirements and acceptance matrix (21 Nov 2026)

*Prepared by Claude. This is a self-assessment, not independent verification. Statuses: PASS, FAIL, BLOCKED, PARTIAL, NOT RUN, NOT VERIFIED,
NOT APPLICABLE. Owner-deferred items are NOT APPLICABLE to this acceptance; they are not silently dropped (see §D).*

**Candidate:** `cd16dcc` plus one changed file, `js/app.js` (see `X1-ACCEPTANCE-PACKAGE.md` §2). Every "test" below ran on this candidate in
the full regression of 21 Nov 2026 (`evidence-files/full-regression-20261121-acceptance.txt`), except `test-x1-acceptance-wording`, which is
not yet registered (it ran directly; output in `evidence-files/`).

**Sources:**
- [AUTH] the owner's X1 implementation authorisation, §16 "Acceptance criteria" (22 criteria). Its text is in the owner's brief file
  `b09f4b21-attachment.txt`, not in the repository.
- [v2] `X1-NUMERIC-INTEGRITY-DESIGN-v2.md`.
- [OWN] the owner's later instructions of 21 Nov 2026: completion, material integrity, the Android tests, and this master authorisation.

**Discrepancy found and resolved here:** v2 §14.2 says "the implementation report assesses each" of the 22 criteria. No report did. This
matrix is that assessment.

## A. The 22 acceptance criteria [AUTH §16]

| # | Criterion | Verification method and evidence | Status |
|---|---|---|---|
| 1 | All seven fields have explicit field-state handling | `CGValidation.FIELDS` (7) × `STATES` (10); `test-x1-foundation` 40; per-field tests in `test-x1-wp5` 56 and `test-x1-completion` 48 (§5.1–§5.7: blank, column absent, invalid, negative, zero) | PASS |
| 2 | Provenance is retained where available | `provenance()` (sheet/file, row, column, original text); foundation and containment tests; the import record keeps Stage 1 sources | PASS |
| 3 | The generic dependency mechanism works | `createRegistry` / `DEFAULT_DEPENDENCIES` (14 calculations); `test-x1-containment` 41; "engine and record agree" check in every X1 test | PASS |
| 4 | Dependent calculations are withheld when required inputs are unavailable | wp5, completion and material-integrity tests (Not Assessed, NaN, withheld totals); browser-x1-chrome 334 | PASS |
| 5 | Independent calculations continue where their inputs are valid | every scenario asserts that unaffected items are identical to clean data (`others()`, `sig()`); material-integrity scenarios 8 and 17 | PASS |
| 6 | Missing values are not silently converted to zero | completion and material-integrity tests ("never a 0", "no misleading 0"); defects 28 and 32 fixed | PASS |
| 7 | Recorded zero remains distinguishable from missing | `calendarHistory` conditions (recorded-zero vs no-usable-history); D6/Q1 tests; Q6 structural 0 vs unknown | PASS |
| 8 | Invalid values do not silently propagate | invalid → Not Assessed with reason (wp5, completion §5.7 "abc", §5.5 "x"); BOM quantities | PASS |
| 9 | Demand history retains its calendar structure | D6 calendar-indexed usage; [indep] calendar-month usage for all 100 materials (completion and material-integrity tests) | PASS |
| 10 | Entirely absent demand history is not treated as genuine zero demand | Q1; `nuU` warning; Units_Sold column absent → all unknown (completion §5.4) | PASS |
| 11 | The allocation-related MRP issue no longer terminates the analysis run | MRP containment (implementation report §3); containment tests; browser `blank-one`, `column-absent` | PASS |
| 12 | Affected allocation-dependent outputs are withheld or clearly identified as unavailable | containment and browser-x1-chrome (Not Assessed rows, empty export cells) | PASS |
| 13 | Missing unit cost does not silently produce misleading financial totals | completion §5.3 (negative and absent cost; [indep] partial total); `x1Money`, `x1Sum` coverage | PASS |
| 14 | Missing on-order information does not silently become zero | completion §5.6 (blank On_Order with sup 1 → Not Assessed; sup 0 unaffected) | PASS |
| 15 | Direct and import routes apply shared integrity rules where Stage 1 permits | one builder `CGValidation` for both routes; import tests in completion, material-integrity (13, 17) and import-integrity 396 | PASS |
| 16 | Documented route-specific differences remain correctly represented | v2 §7.1 differences (import refuses where direct contains), tested; Q5 unchanged | PASS |
| 17 | Reporting explains incomplete and withheld results | one reason channel (`reasonsFor`); banner; partial totals with coverage; this task's wording corrections (§C) | PASS |
| 18 | Relevant X1 tests pass | foundation 40, containment 41, wp5 56, completion 48, material-integrity 42, browser-x1-chrome 334, acceptance-wording 12 (unregistered) | PASS |
| 19 | Existing unaffected functionality passes regression testing | full tier: 51 tests passed (+ pre-flight). 1 FAIL: `check-control`, the Tag-5 guard, failing by design until Tag-6 (same 9 approved lines as before). 5 BLOCKED and 2 REDUCED, all from before X1: historical trees and tags that are not available, and Playwright not installed | **PARTIAL** (every runnable test passes; 7 tests cannot run fully, which was the case before X1 too) |
| 20 | No protected historical records or baselines overwritten or erased | protection 451/451; golden v0.5, v0.6.0 and confidence snapshots unchanged; superseded assertions keep their originals as comments; evidence folder never read | PASS |
| 21 | All changes are traceable | `X1-CHANGE-RECORD.md` CR-01 to CR-33; v2 revision history; issue register 1–34 | PASS |
| 22 | Outstanding decisions and limitations are clearly documented | `X1-REGISTERS.md`; v2 Appendix C; §D below | PASS |

## B. Field policies v2 §5.1–§5.7 (verification scope)

| Field | Policy | Evidence | Status |
|---|---|---|---|
| On_Hand_Qty | blank/invalid/negative → Not Assessed; column absent → all withheld (direct), import refused (unchanged) | completion §5.1; wp5; import quarantine D1(a) | PASS |
| Allocated_Qty | blank = 0 by policy where configured; invalid/negative → unavailable | wp5; containment | PASS |
| Unit_Cost_GBP | negative → money withheld; zero suspicious (D7); column absent → all money withheld | completion §5.3 | PASS |
| Units_Sold | missing month unknown (D6, Q1); column absent → all unknown | completion §5.4; material-integrity | PASS |
| Qty_Per_Finished_Unit | zero/negative/invalid → line invalid (D1(b)); column absent → materials unknown | completion §5.5; material-integrity 11–12 | PASS |
| On_Order_Qty | blank with sup 1 → Not Assessed; negative → quarantined on import (D1(d)) | completion §5.6 | PASS |
| Reorder_Point_Qty | blank/absent → "not configured" (still assessed: issue 26); invalid → Not Assessed | completion §5.7; acceptance-wording | PASS |

## C. Owner decisions and later requirements

| Ref | Requirement | Evidence | Status |
|---|---|---|---|
| D1(a) | quarantine an identified bad stock row on import (Stage 1 + minimal adapter change) | wp5 Q4 checks; completion D1(d) imports | PASS |
| D1(b) | zero BOM quantity is invalid, both routes | completion; material-integrity 12 | PASS |
| D1(d) | negative Allocated/On_Order/Reorder_Point prohibited, both routes | completion import checks | PASS |
| D3 | containment and messages now; Stage 1 table-level part deferred | completion (direct); import refusal documented | PASS (direct); Stage 1 part NOT APPLICABLE (deferred) |
| D4 | Not Assessed in place, out of totals, coverage counted, never looks healthy | browser-x1-chrome; partial totals | PASS |
| D5 | 90-day excess rule unchanged | no change to excess; golden snapshots unchanged | PASS (E1 NOT APPLICABLE, deferred) |
| D6 / Q1 | missing month unknown; no-history unknown; recorded zero stays | wp5; [indep] calendar usage | PASS |
| D7 | zero cost suspicious, kept, flagged | wp5; completion | PASS |
| Q2 | Round 2 negative-allocation assertion superseded | CR-18 | PASS |
| Q3 | confidence snapshot difference recorded in a new dated snapshot | confidence 51/51 against the registered snapshot | PASS |
| Q4 | D1(a) Stage 2 adapter change | wp5 Q4 checks | PASS |
| Q6 | structural 0 only with a complete valid BOM; listed cases unknown or refused | completion Q6; material-integrity 6, 9–11 | PASS |
| Issue 26 | an absent ROP column must not overstate dependency | completion; acceptance-wording | PASS |
| MI-1…MI-9 | material-integrity completion criteria [OWN, 21 Nov]: no false complete usage; partial distinguished; nothing downstream consumes partial; structural 0 distinct; unaffected unchanged; tests; regression; protection; documents | `test-x1-material-integrity` 42; reconciliation trace | PASS |
| UoM | blank or whitespace-only UoM is missing, not an unrecognised unit [OWN principle; decision U5 option (a), 16 Nov] | `test-uom` U5 (in the full tier; that test is REDUCED only for its Phase 1 comparison) | PASS |
| PERF-1 | `analyse()` < 2 s at 5,000 SKUs | 1,007 ms median (5,100 items), 1,097 ms with a blank BOM line | PASS |
| PERF-2 | tab switch < 300 ms | worst 224 ms (5,100 items, Pixel 5 emulation, CPU 4× slower); 164 ms on Northstar | PASS |
| AND-1…4 | physical Android Tests 1–4 [OWN] | owner-reported PASS, 21 Nov 2026, on build `cd16dcc`; reconciliation in `X1-VERIFICATION-RECORD.md` §E | PASS (owner-reported) for what was recorded; this task's wording corrections NOT VERIFIED on a physical phone |
| T3-W1 | Test 3 observation: Reorder Policy said "within ±20%" for an item with no workbook ROP | fixed (DEF-A1); acceptance-wording B | PASS (automated and emulation) |
| T3-W2 | Test 3 observation: Summary recommended reviewing reorder points while reporting 0 too low | fixed (DEF-A2); acceptance-wording C | PASS (automated and emulation) |

## D. Not in this acceptance (owner-deferred or not approved)

| Item | Why it is excluded | Status |
|---|---|---|
| D2 per-figure input IDs | deferred by the owner | NOT APPLICABLE |
| D3 Stage 1 column-level containment | deferred by the owner (import refuses, which is safe) | NOT APPLICABLE |
| D5 E1 | deferred by the owner | NOT APPLICABLE |
| Q5: quarantine of unmatched codes, suggested links, TOTAL rows | deferred by the owner | NOT APPLICABLE |
| Text-number policy | owner decision pending; existing behaviour preserved and flagged | NOT APPLICABLE |
| Import upload screen | not authorised | NOT APPLICABLE |
| A displayed version number for this build | no version has been approved (the page still says "v0.6") | owner decision (non-blocking) |
