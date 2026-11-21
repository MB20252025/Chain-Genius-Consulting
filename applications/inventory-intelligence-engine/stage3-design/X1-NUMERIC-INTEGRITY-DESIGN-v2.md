# X1 numeric integrity: design and owner decision package, version 2

*Prepared by Claude, 20 Nov 2026, under the owner's "X1 – Controlled Design Revision v2" instruction. Design only. Nothing here is
implemented, adopted, accepted or approved, and no implementation authority is granted or implied by any section, including the work
packages. It replaces `X1-NUMERIC-INTEGRITY-DESIGN.md` (v1) in content; v1 is kept unchanged as the record of what was first proposed.*

**Status: complete DRAFT (Parts 1 and 2), not approved as a whole. The owner's decisions D1–D7 (21 Nov 2026) are recorded in §13.1.** Part 1 (sections 1–9) was delivered on 20 Nov 2026 and has been amended with the six
clarifications C1–C6 requested in the owner's review; Part 2 (sections 10–14 and the appendices) completes the package. Implementation of the
decision-independent foundations was separately authorised on 20 Nov 2026; its results are reported in `x1-implementation/X1-IMPLEMENTATION-REPORT.md`.

| Part 1 | Part 2 |
|---|---|
| 1 Purpose, status and scope · 2 Evidence base and its limits · 3 Field grouping and source contracts · 4 Field-state model · 5 Field policies (seven fields) · 6 Missing columns and import-crash containment · 7 Route provenance and shared validation contract · 8 Calculation dependencies, on-order error direction and allocation-unknown rules · 9 Demand history and time-series integrity | 10 Result-status model (Calculated, Validated, Verified) and CIS · 11 Roadmap compatibility · 12 Architecture and implementation work packages · 13 Owner decision register D1–D7 · 14 Test specification, acceptance criteria, X1 design matrix, user-facing reporting, what was not changed · Revision log · Protection report · Outstanding issues register |

**Labels.** **[E]** evidence-confirmed *by Claude's own code reading or probes in this repository* (reproducible from the scripts named in §2;
not independently verified by a third party); **[P]** proposed recommendation; **[A]** business assumption; **[O]** owner decision required;
**[U]** unresolved evidence.

**Owner's provisional preferences (supplied 20 Nov 2026; not approvals).** D1 amend the field-policy approach with the clarifications; D2
option (a) shared field-state and provenance record; D3 option (ii) crash containment and clear messages, broader Stage 1 changes deferred;
D4 option (c) hybrid presentation; D5 defer the excess definition; D6 a missing demand month means unknown, not zero; D7 zero unit cost is
suspicious, not automatically fully costed. This document is written so that each preference can be adopted *or* rejected; where a policy
depends on one, it says so.

---

## 1. Purpose, status and scope

**Purpose.** For seven numeric fields, define how the engine recognises good, missing, zero, invalid and assumed values on both upload routes,
which calculations each state affects, and what the user is shown, so that the engine never presents an unreliable figure as trustworthy and
never disables unrelated analysis because one field is affected.

**Fields (unchanged from v1):** `On_Hand_Qty`, `Allocated_Qty`, `Unit_Cost_GBP` (Inventory), `Units_Sold`, `BOM.Qty_Per_Finished_Unit`,
`On_Order_Qty`, `Reorder_Point_Qty`.

**Principle.** A data failure affects only the calculations that depend on that data. Nothing is silently substituted: an unknown value is never
shown as zero, an assumption is always disclosed, and a partial figure is never presented as complete.

**In scope.** Field policies; field states; missing-column policy; containment of the known import crash; provenance; dependency-aware withholding;
partial results and coverage; time-series integrity for demand history; result status; test and acceptance criteria; implementation work
packages (as proposals).

**Out of scope.** Any implementation; the X1 text-number policy (Option C / XCRT, still REVIEW: this design applies to whatever remains invalid
after that separate decision); the excess definition (D5); forecasting algorithms; broader Stage 1 `REQUIRED_UNMAPPED` behaviour (deferred under
the D3(ii) preference, §6); UI finalisation (D4).

**What changed from v1 (summary; full log in Part 2).** (1) `On_Hand_Qty` now has distinct partial-absence and total-absence rules; total absence
withholds only dependent outputs instead of stopping the engine (DeepSeek finding 1). (2) The v1 proposal to change Stage 1 table-level
behaviour is withdrawn from X1 and marked out of scope; the import crash gets a precise containment design (finding 2). (3) The blanket claim
that excluding unknown on-order is "conservative" is replaced by a per-figure analysis based on the engine's actual definitions (finding 3).
(4) Allocation-unknown integrity rules are fixed independently of the D4 layout (finding 4). (5) Demand-history gaps must keep their calendar
position (owner clarification); v1 only flagged the compression.

## 2. Evidence base and its limits

**Working-tree state, explained (C6) [E].** The working tree is *not* clean, and almost all of its uncommitted content predates the X1 design
work. Relative to HEAD `eddf09b` (branch `development/v0.7`; Tag-5 `f0e81bb`; GitHub `ls-remote` reports the same), the uncommitted content at
the start of each X1 task was, by origin:

| Origin | Content | Created by |
|---|---|---|
| Stage 3 Round 1 and Round 2 (16–18 Nov) | 22 modified tracked files (engine, import modules, tests, registers, records) and new tests, snapshots and `STAGE3-CHANGE-REGISTER.md` | earlier Stage 3 tasks (frozen Round 2 tree) |
| Evidence reconciliation (19 Nov) | `stage3-evidence/` and one pointer line in `STAGE3-CHANGE-REGISTER.md` | the 19 Nov reconciliation task |
| Unexplained folder | `stage3-design/evidence/` | **unknown**; not created in this conversation; deliberately left untouched and excluded |
| X1 v1 (20 Nov) | `stage3-design/X1-NUMERIC-INTEGRITY-DESIGN.md`, `stage3-design/x1-evidence-claude-20261120/` | the X1 v1 design task |
| X1 v2 Part 1 (20 Nov) | this document (Part 1), `stage3-design/x1-v2-protection/` | the X1 v2 design task |
| X1 implementation (20 Nov) | listed in the implementation report's change register | the X1 implementation task |

Each task recorded its own starting state and compared its end state against that start, not against a clean repository. These are Claude's
own checks, not independent verification. Details: Appendix B (protection report).

**Sources used in this revision.**

| Source | Status |
|---|---|
| v1 design (`X1-NUMERIC-INTEGRITY-DESIGN.md`) and its evidence (`x1-evidence-claude-20261120/`: probes P1–P4 with outputs and hashes) | Claude-produced; P1–P4 are Claude-reported observations, reproducible from the stored scripts |
| `js/calculations.js` lines 8 (settings), 117, 140 (item build), 153–158 (availability, position, cover, excess, shortage, reorder gap), 179–182 (MRP), 185–194 (feasibility supply pool) | read in this task [E] |
| `js/import/canonical.js` (whole), `js/import/adapter.js` (contract header, stock aggregation), `js/import/engine-workbook.js`, `js/import/result-gate.js` (rule R7, partial totals) | read in the v1 task and this task [E] |
| 19 Nov evidence reconciliation (`stage3-evidence/`) | Claude-produced; hash-verified |
| DeepSeek review of v1 | **based on the v1 document text supplied to it, not on repository access**; its four findings are treated as review comments on the text |
| `stage3-design/evidence/` (pre-existing, unexplained) | **deliberately left untouched and excluded from this work** (owner's Option 1) |

**Limits [U].** `js/forecasting.js`, `js/app.js` and the Stage 1 acceptance logic in `js/import/validate.js` were not re-read; their behaviour is
described from observed outputs. No repository document describes the CIS or the planned forecasting programme. The required/optional field
matrix asked for by M1 Clarification 2 was not found in the repository (v1 finding, not re-searched). No test was run in this task.

## 3. Field grouping and source contracts

**Import-route contract, Canonical Dataset v1 (CDv1) [E]:** "A missing value is never replaced by 0." Required numeric fields reject the row when
invalid; costs are blanked and flagged; `neg: 'no'` makes a negative invalid; `On_Hand_Qty` allows negatives (kept and flagged).

| Field | CDv1 status [E] | Needed by | Group |
|---|---|---|---|
| `On_Hand_Qty` | required; negative kept and flagged | stock, valuation, availability, excess, position, MRP, feasibility | A |
| `Allocated_Qty` | optional; blank = null; negative invalid | availability, excess, dead stock, shortage, position, MRP | A for calculation; B at source |
| `Unit_Cost_GBP` (Inventory) | optional (cost: invalid → blanked) | every money figure | A for money only |
| `Units_Sold` | required where demand is supplied (demand table optional) | forecasting, classification, excess, replenishment, material usage | A, conditional |
| `BOM.Qty_Per_Finished_Unit` | required where a BOM is supplied (BOM optional) | material requirements, MRP, feasibility | A, conditional |
| `On_Order_Qty` | optional; blank = null; negative invalid | depends on the supply setting (§8.2) | B |
| `Reorder_Point_Qty` | optional; blank = null; negative invalid | reorder-point comparison | B |

**Blank allocation is never zero today [E].** No supported source format declares blank = 0 for allocation, on-order or reorder point: CDv1 forbids
it, constants are refused (A12), and the adapter refuses an import whose allocation is blank at some locations of an item and filled at others
(`STOCK_FIELD_PARTLY_BLANK`). A future source could *declare* "blank = 0" through a mapping-profile declaration recorded in provenance (§7);
that capability belongs to the A12 mapping-profile stage, not X1 [P].

## 4. Field-state model

Every value of the seven fields receives exactly one state, with provenance (§7). States are never collapsed to simplify implementation [P].

| State | Meaning | Example | Treated as a number? |
|---|---|---|---|
| `valid` | finite, rule-conforming, positive (or negative where the field allows it) | On_Hand 120; On_Hand −2 | yes |
| `zero` | a recorded 0 | Allocated 0 | yes, as 0 |
| `blank` | cell present in the row, empty or whitespace only | Units_Sold "  " | no |
| `column-absent` | the field's column is not in the sheet or not mapped | no Allocated_Qty column | no |
| `not-supplied` | the source does not hold this information at all (optional table or field not provided, e.g. no BOM file) | no demand file | no |
| `invalid` | present but not a number under the applicable parsing policy | "abc", "5 units" | no |
| `non-finite` | NaN, +Infinity, −Infinity | Infinity | no |
| `negative-prohibited` | negative where the field forbids it | Allocated −5 | no |
| `assumed` | a value supplied by a *declared* rule, never silently (e.g. a future owner rule or a source declaration) | — none today for these fields | yes, labelled |
| `not-applicable` | the field has no meaning for this record | Reorder point on a phantom/non-stocked line (if such items are introduced) | no |

Distinctions that matter: `zero` ≠ `blank` ≠ `column-absent`; `blank` (one record) ≠ `column-absent` (whole field) ≠ `not-supplied` (whole
source table or capability); `invalid` keeps the raw text for the user; `assumed` always carries the rule that produced it.

## 5. Field policies

Common rules [P]: whitespace-only is `blank`; `invalid` is judged after the separately pending text-number policy; every withheld or labelled
figure names the affected record and the reason (§7); partial totals use the approved partial-total form (RG3 on the import route) and show
coverage. "Withheld" = not shown as a number; "labelled" = shown with an incompleteness status.

### 5.1 `On_Hand_Qty` — required

**Today [E]:** direct route, a blank or invalid cell makes stock value and excess headline NaN (78 non-finite values); a whole missing column stops
the analysis ("Invalid time value", §6). Import route, a blank or invalid cell rejects the row and the **whole import** is refused; an unmapped
column is refused by Stage 1 (`REQUIRED_UNMAPPED`). Negative kept with a High "Negative quantities" warning (direct) or `NEGATIVE_KEPT` (import).

**A. Partial missing or invalid records [P, pending D1].** Column present; some items valid, others `blank`, `invalid` or `non-finite`:
- affected items are **quarantined** from every calculation that depends on their on-hand quantity (§8.1);
- unaffected items are processed normally;
- dependent totals are published as **partial**, naming excluded items, with coverage (items and, where known, value);
- the report says the results are incomplete;
- zero is **never** substituted.

**B. Total absence [P, pending D1].** Column absent, or present with every cell blank:
- inventory-dependent outputs are **withheld**: stock, valuation, physical and projected availability, excess, position, shortage, reorder
  flags, inventory-dependent MRP and feasibility;
- a clear explanation names the missing column and how to fix it;
- unrelated analysis continues wherever its own inputs are available (supplier performance, demand analysis and forecasting, BOM-only analysis);
- the scope of the stop is the dependent outputs, never the whole engine.

**Route note [E/P].** On the direct route both rules are new behaviour. On the import route, rule B for an *unmapped* column is pre-empted today by
Stage 1 `REQUIRED_UNMAPPED`, which refuses the import; under the D3(ii) preference that Stage 1 behaviour is **deferred and unchanged**, so the
routes differ for this one case until a later approved stage (recorded in the outstanding issues register). Rule A on the import route requires a
change to how Stage 1's row rejection of a stock row affects import acceptance; that is a distinct work package needing separate authorisation
(Part 2, §12), and is not a `REQUIRED_UNMAPPED` change.

**Values.** Negative: `valid` (B6 Option D), High "Negative quantities" retained (fixed Test B). Zero: `zero`, valid. Large: valid (no upper bound
without a business rule [U]).

### 5.2 `Allocated_Qty` — optional at source, required for availability

**Today [E]:** direct, blank/invalid → available stock and excess NaN; an item with no demand is still listed as dead stock with £0 excess
(dead-stock rule v3.1 counts unknown allocation as 0 *for listing*). Import, blank → excess withheld by the gate's generic safety net R7
(`NON_FINITE_VALUE`); negative → row rejected and import refused; column absent → **crash on both routes** (§6).

**Policy [P, pending D1].**
- `blank`, `column-absent`, `invalid`, `non-finite`, `negative-prohibited` → **allocation unknown** for that item (all items if column-absent).
  The record is retained.
- Physical stock and valuation are unaffected.
- Physical available stock, stock position, shortage, excess quantity and value, dead-stock assessment and the item's MRP net requirement are
  governed by the allocation-unknown rules of §8.3, **identical under every D4 option**.
- `zero` → recorded zero ("nothing allocated"), valid. Negative → `negative-prohibited` on both routes (aligning the direct route to CDv1; the item
  is not refused, only its allocation-dependent results).

### 5.3 `Unit_Cost_GBP` (Inventory) — optional at source, required for money

**Today [E]:** direct, blank/invalid → stock value and excess value NaN (495 non-finite values); zero → value 0 with only Medium "differs from
master" where the master cost differs. Import, blank/invalid → **all** money totals withheld; zero → silently "complete"; negative → blanked
and money withheld.

**Policy [P, pending D1].** `blank`, `column-absent`, `invalid`, `non-finite`, `negative-prohibited` → that item's money results withheld (stock
value, excess value, shortage value); quantity results continue. Money aggregates are **partial** with cost coverage: costed items ÷ items,
known-value total, withheld count, reason, remediation. No substitution from `Standard_Cost_GBP`. Column absent → all money withheld, all quantity
results continue.

**Zero (conditional on D7) — four distinct ideas [P]:**
- *mathematically valid:* 0 is a finite number; arithmetic with it is well defined, so it never produces NaN;
- *suspicious business value:* a held item with no cost is often an unpriced or not-yet-costed item; treating it as fully costed would let
  unpriced stock hide inside "complete" totals;
- *source-dependent legitimate value:* free-issue, consigned or sample stock may genuinely cost 0, but only the source can say so;
- *effect:* zero contributes £0 to valuation and excess value; how coverage counts it decides whether totals are called complete.

Under D7 = suspicious (provisional preference): included in arithmetic as 0, flagged Medium, **not counted as costed** in coverage, totals labelled
"including N zero-cost items"; **not invalid** — figures are still produced. Under D7 = valid: counted as costed; totals complete. Under D7 =
source-dependent: valid where the source declares it (requires D2 declarations), otherwise suspicious.

### 5.4 `Units_Sold` — required where demand is supplied

**Today [E] (probe P4, FG001):** an absent month row is treated as missing on both routes (credibility `missing`, confidence Low); a recorded zero is
a zero on both routes; a **blank cell** differs: direct → forecast NaN, excess recomputed as if there were no demand, credibility `missing 0`,
confidence unchanged; import → row rejected and history labelled incomplete. History is built from present rows only (`calculations.js:111`),
so an internal gap is compressed.

**Policy [P, pending D1; conditional on D6].**
- `blank`, `invalid`, `non-finite`, `negative-prohibited` (negatives invalid: returns are not sales) → the month is **missing**, exactly like an
  absent row, on both routes. Invalid/non-finite also raise a High warning naming the cell.
- Under D6 = unknown (provisional preference): missing months keep their calendar position, are never filled, lower confidence and affect
  eligibility per §9. Under D6 = zero: missing months become `assumed` 0 with provenance "assumed zero (owner rule)", counted separately from
  recorded zeros.
- `zero` → recorded zero, valid; the current Medium "Zero/negative demand months" warning becomes an informational "zero-sales months" note, with
  negatives reported separately as invalid (identified wording/severity change).
- Column absent → demand treated as `not-supplied`: demand-dependent outputs withheld (forecasting, classification, excess, replenishment,
  demand-driven MRP), unrelated analysis continues. On the import route an unmapped `Units` is refused by Stage 1 today; that stays unchanged
  under D3(ii) (route difference recorded).

### 5.5 `BOM.Qty_Per_Finished_Unit` — required where a BOM is supplied

**Today [E]:** direct, blank/invalid/≤0 → High "BOM quantity per finished unit is zero, negative or not a number"; import, blank/invalid/negative →
row rejected and **whole import** refused; import zero → accepted silently.

**Policy [P, pending D1].** `blank`, `invalid`, `non-finite`, `negative-prohibited` and `zero` (zero treated as invalid: a component consuming
nothing is not a meaningful line **[A]**, amendable in D1) → that **BOM line** is invalid: its material requirements, the parent's MRP explosion
and the feasibility of the parent's orders are withheld ("Insufficient information"; shared materials never reserved for them, owner decision of
15 Nov). Other products, inventory, supplier and demand analysis continue. Column absent → the BOM is unusable: BOM-dependent outputs withheld,
others continue; on the import route Stage 1 `REQUIRED_UNMAPPED` remains unchanged under D3(ii). The import-route move from "import refused" to
"line invalid" for a bad cell is a separate Stage 1 work package (as §5.1 A). UoM: quantity in the component's unit, never converted; the
fractional-"each" Low warning and the unit-mismatch block are unchanged.

### 5.6 `On_Order_Qty` — optional

**Today [E]:** default supply setting `CFG.sup = 0` (line 8): finished goods' supply in position = 0 and raw materials' = scheduled purchase orders,
so the Inventory `On_Order_Qty` feeds **only** the PO reconciliation and the alternative MRP figure (`netU`); with `CFG.sup = 1` it *is* the
supply (position, MRP receipts, feasibility pool). Direct blank → 6 non-finite values; import blank → finite figures; negative → direct High
and used, import row rejected.

**Policy [P, pending D1].** `blank` and `column-absent` → `not-supplied` (never 0). `invalid`, `non-finite`, `negative-prohibited` → the same, plus a
High warning. `zero` → valid. Effects depend on the figure and the supply setting (§8.2); the status shown is **"Incomplete – on-order quantity not
supplied"** where a figure is shown, or the figure is withheld where its error would drive an action (§8.2). Never a reason to reject a dataset.

### 5.7 `Reorder_Point_Qty` — optional

**Today [E]:** the reorder-point comparison is `ropGap = rop / ropR − 1` (user's reorder point against the engine's recommended one); the reorder
*flag* uses position against the engine's recommended point (`pos < ropU`), not the user's value. Direct blank → 9 non-finite values; direct
negative → no negative check; import negative → row rejected.

**Policy [P, pending D1].** `blank`, `column-absent` → **not configured**: comparison and gap show "No reorder point configured"; the recommended
reorder point and the reorder flag continue (they do not use this field). `invalid`, `non-finite`, `negative-prohibited` → not configured plus a
High warning. `zero` → valid, configured as zero.

## 6. Missing columns and import-crash containment

**Missing column ≠ blank cell [E/P].** Direct route: the sheet's header row shows whether a column exists; the engine already reports a
present-but-empty column ("Column X contains no values") but nothing for an absent one. Import route: the mapping records which fields were
supplied, and the Engine View omits unsupplied columns (reported as `omitted`). The shared layer (§7) records per field one of `column-absent`,
all-`blank`, some-`blank`, some-`invalid`.

| Field | Column absent | Present, all blank | Effect on dependent outputs | Unrelated continues |
|---|---|---|---|---|
| On_Hand | §5.1 B (direct); import: Stage 1 refusal unchanged (D3(ii)) | §5.1 B | withheld | yes |
| Allocated | allocation unknown for all items; **no crash** | same | §8.3 rules | yes |
| Unit_Cost | all money withheld | same | money only | yes |
| Units_Sold | demand not supplied (direct); import: Stage 1 refusal unchanged | missing for all months | demand-dependent withheld | yes |
| Qty_Per | BOM unusable (direct); import: Stage 1 refusal unchanged | all lines invalid | BOM-dependent withheld | yes |
| On_Order | not supplied for all | same | §8.2 | yes |
| Reorder_Point | not configured for all | same | comparison only | yes |

**Out of scope (D3(ii) preference):** changing Stage 1 `REQUIRED_UNMAPPED` for On_Hand, Units_Sold and Qty_Per on the import route. v1's proposal to
treat an unmapped required field's table as "not supplied" is **withdrawn from X1** and recorded as a deferred item.

### 6.1 The known import crash: why it happens [E]

An import whose stock file has no `Allocated_Qty` column is valid under CDv1 (the field is optional), passes Stage 1, and the adapter correctly
writes **no cell** (never 0). The engine then reads `undefined`: `x.av = usable − undefined = NaN` (line 153). In MRP (line 179),
`days = (x.av + rq) / x.d` is NaN; the date helper `dt` (line 180) tests only `d == null`, so NaN passes, `new Date(NaN).toISOString()` throws
`RangeError: Invalid time value`, and the whole run stops. The same happens on the direct route with the column removed (probe P1; also at Tag-5
and Baseline B, probe P2).

**Why existing optional-field handling does not prevent it [E].** Each layer behaves correctly for its own contract: Stage 1 accepts an absent
optional field; the adapter leaves it absent; the gate's R7 safety net withholds non-finite numbers — but **R7 runs after the engine**, so it
cannot act on an exception thrown inside it. The engine itself has no notion of "not supplied" for this field.

### 6.2 Containment design (D3(ii) scope only) [P] — order of controls (C1)

A date-formatting guard alone is **insufficient**: it would stop the crash but could still publish a plausible-looking figure built on an
unknown input. The controls apply in this order; **the dependency gate is the primary integrity control**, the guards are secondary protection:

1. **Classify the input and keep its provenance.** The route layer records `Allocated_Qty` as `column-absent` (direct: header row; import: the
   mapping's supplied set) or, per record, `blank` / `invalid` / `non-finite` / `negative-prohibited`, with source, row and raw value (§4, §7).
2. **Identify dependent calculations.** The dependency registry (§8) lists what needs allocation: physical available stock, stock position,
   cover, shortage, excess, the item's MRP net requirement, order quantity, stock-out and order-by dates, and its feasibility contribution.
3. **Withhold before publishing.** Those calculations are not performed for the affected items, or their results are replaced by a withheld
   status, *before* any output is published. Nothing downstream receives a number that depends on the unknown input.
4. **Prevent propagation.** Inside the engine, each calculation that consumes another's result checks that its inputs are finite before
   combining them (for MRP: available stock, receipts, usage, safety stock before `net`; lead time before `order-by`), so a non-finite
   intermediate cannot flow into later arithmetic.
5. **Defensive guards** on operations that throw or mislead: date construction and formatting (`dt`, `iso`, `sd`), status text derived from
   comparisons with a non-finite value. A guard returns "not calculated", never a substitute number.
6. **Report** which outputs are affected and why: "Allocated_Qty was not supplied. Available stock, stock position, shortage, excess and MRP
   requirements cannot be calculated for N items; physical stock quantities, valuation (where cost is valid), demand and supplier analysis are
   complete." Severity High (figures withheld).

**What this does not do.** It does not repair the allocation data or make the affected MRP figures valid: a contained failure is not a
successful calculation. It changes no Stage 1 rule, mapping rule, `REQUIRED_UNMAPPED` behaviour or import acceptance.

**Evidence that containment is needed beyond the column case [E] (implementation task probe):** a *single* blank `Allocated_Qty` on one raw
material (RM001) already stops the whole direct-upload run at the same line; so does a non-finite lead time reaching `order-by`.

## 7. Route provenance and shared validation contract

**Contract NV1 [P].** For each field: business status, valid values, blank meaning, sign and zero rules, invalid states, dependent calculations,
withholding, message templates, version. Both routes emit the same **field-state record** per value:
`{ field, record (item / item+location / parent+component / item+month), state, value, rawValue, source: { route, file or sheet, row, column,
location }, transformations: [ { rule, ruleVersion, from, to } ] }`.

**Where it applies [P].** Direct: after the sheets are read, before `analyse()` uses any of the seven fields. Import: Stage 1 keeps its CDv1 cleaning;
the adapter translates canonical nulls, Stage 1 issues, its own derivations and `__sources` into field-state records. Route-specific rules remain
explicit transformations, not hidden differences: B1 location inclusion, B6 Option D physical/usable split, negative-location treatment, scrap
assumptions.

**One withholding mechanism for both routes [P].** The dependency registry turns field states into a withholding specification; the import route
already applies one through `result-gate.js`; the direct route would build one and use the same gate. R7 stays as the final safety net, but specific
reasons replace generic ones wherever the cause is known.

### 7.1 Existing route differences (C2) [E]

The routes are **not** equivalent today, and X1 does not claim they will become so. Known differences for these fields:

| Situation | Import route (Stage 1 → adapter → gate) | Direct route (engine) | X1 handling |
|---|---|---|---|
| Required column absent (On_Hand_Qty, Units_Sold in a supplied demand table, Qty_Per in a supplied BOM) | Stage 1 `REQUIRED_UNMAPPED`: **import refused** | engine runs; dependent outputs unreliable or the run stops | direct: contain and withhold dependent outputs (§5.1 B); import: **unchanged** (D3(ii)); difference documented |
| Invalid or blank On_Hand cell; invalid BOM quantity; negative Allocated / On_Order / Reorder_Point / Qty_Per | row rejected → **import refused** | warning; value flows into calculations | direct: classify and withhold; import: unchanged unless D1 approves the separate Stage 1 work package |
| Blank Allocated / On_Order / Reorder_Point / Unit_Cost cell | null, no Engine View cell; dependent figures withheld by the gate (R7 generic) | NaN flows; may stop the run | both: classified the same way; specific reasons |
| Optional column absent (Allocated_Qty) | passes Stage 1 and the adapter, **engine stops** | **engine stops** | both: contained (§6.2) |
| Blank Units_Sold cell | row rejected, history labelled incomplete | NaN in history | both: a missing month (D6 decides its meaning) |
| Zero unit cost | accepted silently | accepted (Medium "differs from master" only if the master differs) | both: per D7 |
| Where the code runs | the import modules are **not loaded by the browser page** (`index.html` loads six scripts, asserted by `check-globals`); the import route runs in the test pipeline today | browser page and tests | X1 shared layer: see §12 (loading it in the page is blocked by a protected assertion) |

**Future reconciliation requirements [P].** (1) A Stage 1 decision (D1/D3, separately authorised) on refusing versus containing at row and
column level. (2) The import route's generic R7 withholding replaced by the specific X1 reasons. (3) The shared layer loaded on both routes in
the page. Until then, each difference is shown to the user in the run report, with its route.

**Reproducibility [P].** The field-state records, contract version and rule versions are retained with each run, so a figure can be traced to its
inputs, their states and the rules applied — the precondition for future independent verification (Part 2, §10).

## 8. Calculation dependencies

### 8.1 Dependency matrix

States: V valid, Z recorded zero, U unknown (blank, column-absent, not-supplied), I invalid (invalid, non-finite, negative-prohibited).

| Field | Dependent calculation | Required input state | Failure behaviour [P] | Unrelated continues? |
|---|---|---|---|---|
| On_Hand | stock quantity, valuation | V (negative allowed) or Z | partial: item quarantined, partial totals; total: withheld | yes |
| On_Hand | physical available, position, cover, shortage, excess, dead stock | V or Z | quarantined (partial) / withheld (total) | yes |
| On_Hand | reorder flag, MRP net requirement, feasibility | V or Z | as above; dependent orders "Insufficient information" | yes |
| Allocated | physical available, position, cover, shortage | V or Z | §8.3 | yes |
| Allocated | excess quantity and value; dead-stock assessment | V or Z | §8.3 | yes |
| Allocated | MRP net requirement and dates | V or Z | withheld, "allocation unknown" (§6.2) | yes |
| Unit_Cost | stock value, excess value, shortage value, money aggregates | V (Z per D7) | item money withheld; aggregates partial with coverage | yes (all quantities) |
| Units_Sold | forecast, backtest, confidence | per §9 | known periods only; gaps kept; confidence lowered | yes |
| Units_Sold | demand classification, cover, excess, replenishment | per §9 | labelled "based on incomplete history" | yes |
| Units_Sold | material usage via BOM | per §9 | inherits the parent's history status | yes |
| Qty_Per | material requirements, MRP explosion, feasibility | V > 0 | line withheld; parent's orders "Insufficient information" | yes |
| On_Order | position, MRP receipts, feasibility pool, reconciliation | V or Z | §8.2 | yes |
| Reorder_Point | reorder-point comparison and gap | V or Z | "No reorder point configured" | yes |

### 8.2 Unknown on-order: effect and error direction per figure

The direction of any error depends on each figure's definition and on the supply setting `CFG.sup` (default 0). "Excluding" below means
computing as if on-order contributed nothing.

| Figure | Definition in the engine | Effect of excluding unknown on-order | Direction of potential error | Confidence / unresolved |
|---|---|---|---|---|
| Physical available stock | `av = usable (or physical) − allocated` (line 153) | none | none | [E] |
| Projected available (stock-out date in MRP) | `days = (av + receipts) / daily demand` (line 179); receipts = Inventory on-order when `CFG.sup=1`, scheduled POs when 0 | `CFG.sup=1`: receipts understated → earlier stock-out date. `CFG.sup=0`: none | understates projected availability (mode 1) | [E] |
| Stock position | `pos = av + oo`; `oo` = Inventory on-order when `CFG.sup=1`; when 0, FG 0 and raw material = scheduled POs (lines 117, 140, 153) | mode 1: position understated; mode 0: none | understates position (mode 1) | [E] |
| Shortage value | `(safety stock − av) × cost` when below safety stock (line 156) | none | none | [E] |
| Reorder flag | `pos < recommended reorder point` (line 155) | mode 1: flag raised more often | overstates need to reorder (mode 1) | [E] |
| Replenishment recommendation (MRP order quantity and urgency) | `need = demand × horizon + safety stock − av`; `net = max(0, need − receipts)`; order qty from `net` (line 179) | mode 1: receipts understated → net and order quantity overstated, urgency raised | overstates replenishment, may trigger unnecessary orders (mode 1); in mode 0 only the alternative figure `netU` is affected | [E] |
| MRP net requirement | as above | as above | overstated (mode 1) | [E] |
| Feasibility supply pool | mode 1: on-order arrives at lead time as a receipt (line 185) | mode 1: less supply → more orders at risk | overstates feasibility risk (mode 1) | [E] |
| PO reconciliation | Inventory on-order vs open PO quantity | cannot reconcile | n/a: reported "not supplied" | [E] |
| Excess inventory | today: `av − 90 days × demand` (line 156) — on-order **not** included | none under the current definition | none today; **under E1** (on-order counted as supply) excluding it would ordinarily *understate* excess | current [E]; E1 effect depends on D5 [U] |

**What stays calculable (C4) [E].** Physical available stock (`usable − allocated`) never includes on-order, so it remains calculable
whenever on-hand and allocation are valid. In the default setting (`CFG.sup = 0`) the Inventory `On_Order_Qty` enters only the PO
reconciliation and the alternative MRP figure `netU`; stock position, receipts and feasibility use scheduled purchase orders instead. Only with
`CFG.sup = 1` does it become the supply in position, MRP receipts and the feasibility pool. No statement is made about excess beyond its
current definition (which excludes on-order); any E1-based effect waits for D5.

**Policy derived from the table [P].** Where on-order is unknown:
- figures it does not enter (physical available, shortage value, current excess) are shown normally;
- figures where exclusion only *understates* a quantity without driving an action (stock position, projected availability) are shown with the
  status **"Incomplete – on-order quantity not supplied"**; for these the trade-off is a lower-than-true figure the user can read correctly;
- figures where the error would drive an action (MRP order quantity and urgency, reorder flag, feasibility risk, in mode 1) are **withheld for that
  item**, because an overstated "ORDER NOW" is an instruction, not a figure;
- in mode 0 only the reconciliation and `netU` are affected; they are shown "not available – on-order not supplied";
- unknown on-order is never represented as 0. "Conservative" is not used as a blanket description.

### 8.3 Allocation unknown: what remains, what does not (C5) — independent of the D4 layout

When allocation is unknown for an item, the outputs fall into these classes, under **every** D4 option [P]:

| Output | Status | Why |
|---|---|---|
| Physical on-hand quantity | **available** | does not use allocation |
| Physical valuation | **available where cost is valid**; otherwise withheld by the cost rule (§5.3) | quantity × cost, no allocation |
| Available stock (`usable − allocated`) | **not calculated** — "allocation unknown" | needs allocation |
| Stock position, cover, position cover | **not calculated** | built on available stock |
| Shortage (quantity and value) | **not calculated** | built on available stock |
| Excess quantity and value | **not calculated**; never £0 confirmed | built on available stock |
| Dead-stock assessment | visibility per D4; never confirmed unallocated or confirmed excess | needs uncommitted stock |
| Allocation-dependent MRP (net requirement, order quantity, stock-out and order-by dates, urgency) and the item's feasibility supply | **not calculated** | built on available stock |
| Independent demand outputs (history, forecast, credibility) and supplier outputs (on-time, risk) | **available, unaffected** | do not use allocation |

It is wrong to say that "inventory quantities remain complete": only the *physical* quantity and its valuation do. Integrity rules, whatever
D4 decides:
1. unknown allocation is never treated as zero in any figure;
2. the item is never presented as confirmed unallocated stock;
3. it contributes nothing to confirmed excess totals;
4. every total it would have entered (available stock, excess, shortage, MRP replenishment value) is a **partial total**, identified as such,
   with coverage (items) and, where meaningful, the excluded physical value;
5. physical quantity and valuation remain available (valuation subject to cost validity);
6. the dead-stock rule's internal use of 0 to decide *visibility* (v3.1) never becomes a value.

D4's options (a) visible with warning, (b) "unknown" group, (c) hybrid differ only in where and how such items appear.

## 9. Demand history and time-series integrity

**Requirement (owner clarification; D6 provisional preference: missing = unknown).** A missing month is unknown, not zero, and must never be
removed in a way that compresses the series: if January, February and April exist and March is missing, April remains April.

**Today [E].** History is the list of present rows (`calculations.js:111`); an internal gap closes up (probe P4: 11 contiguous values). Credibility
already counts `expected`, `missing` and `zeros` per item, so the engine knows a month is missing but its forecast methods (mean, moving averages,
weighted average, trend, per the forecast output) do not see where.

**Three different conditions (C3).** They must never be confused:

| Condition | Meaning | Today [E] (implementation-task probe, FG001) | X1 treatment [P] |
|---|---|---|---|
| **Partially usable history** — some valid or zero months, some missing | evidence for some periods only | gaps compressed; credibility counts them; forecast produced from the compressed list | calendar series with gaps kept in place; forecast only by methods whose gap rule fits; confidence lowered; dependent results labelled "incomplete history" |
| **Entirely missing or blank history** — no usable observation (no rows, or every cell blank/invalid) | no evidence at all | forecast correctly **not produced** (`ok: false`, credibility "Cannot assess", 12 missing); but daily demand is taken as 0, so the item is classed "No recorded demand" and all 81 available units count as excess, exactly as for genuine zero | forecast unavailable: "no usable demand history"; demand-based classification, cover and excess **not calculated from an assumed zero**; how the item is shown is decided with D6 (see below) |
| **Genuine recorded zero history** — every month present and recorded as 0 | evidence of no sales | forecast produced (0); "No recorded demand"; all available stock is excess | unchanged: zero demand is real evidence; forecast 0 is legitimate |

A completely absent history must not produce a normal zero-demand forecast (it does not today [E]) and must not be treated as zero demand in
classification or excess (it is today [E]). Changing the classification and excess of an item with no usable history alters accepted behaviour
(the dead-stock "No recorded demand" class) and depends on D6, so it is **not** implemented with the foundations; the foundations only make the
three conditions distinguishable in the field states and the calendar series.

**Representation [P].** Each item's history is a **calendar-indexed series** over the analysis window (the engine's existing `expected` window), one
slot per month, each with a state:
- `valid` (recorded quantity), `zero` (recorded zero sales), `missing` (absent row, blank, invalid, non-finite or negative cell — with the
  underlying state kept in provenance), `assumed` (only if D6 = zero or a future declared rule), `not-applicable` (months before the item existed,
  if launch dates are ever supplied [U]).
- Recorded zero and missing are different states and are never merged: a recorded zero is evidence of no sales; a missing month is absence of
  evidence.

**Effects of incomplete history [P].**
- **Forecasting:** methods consume the calendar-indexed series; no method may fill a gap unless that is its declared, disclosed behaviour; no method
  may re-index.
- **Model eligibility:** each method declares how it treats gaps (e.g. "mean of known periods" is position-insensitive; a moving average over a
  window containing a missing period is not); a method without a declared gap rule is **ineligible** for that item while its window contains a gap.
  Minimum-history and maximum-gap thresholds are for the forecasting programme to set [U].
- **Confidence:** missing months lower confidence (as credibility already does) and the reason names the months.
- **Rolling-origin backtesting:** an origin is scored only if its target period is `valid` or `zero`; a training window with a gap is handled by
  the method's declared gap rule or the method is skipped at that origin; scores report how many origins were skipped.
- **Classification, cover, excess, replenishment:** computed from known periods and labelled "based on incomplete history (n months missing)".
- **Under D6 = zero:** missing slots become `assumed` 0 with provenance; confidence still records the assumption; nothing changes silently.

**Not prescribed.** No specific forecasting algorithm or gap-handling method is chosen here; X1 guarantees the representation, the states, no NaN,
correct counting and labelling, and the eligibility principle, so the planned forecasting programme can use the information without inventing
demand. Regression note [U]: Northstar FG001 has no gaps; whether any golden or confidence fixture item has an internal gap must be checked at
implementation, because re-indexing would change its forecast.

---

# Part 2

## 10. Result-status model and the future CIS

**Three distinct statuses [P]** (never interchangeable):

| Status | Meaning | Who can set it |
|---|---|---|
| **Calculated** | the production calculation ran and produced a value | the engine |
| **Validated** | every input it depends on was in an accepted state (`valid`, or `zero` where the field allows it), no `assumed` input was used, and the defined validation checks passed | the X1 dependency mechanism |
| **Verified** | an independent recomputation, separate from the production code, reproduced the value | only the future CIS; **X1 never sets it** |

A result is not Verified because its tests pass or because it is Validated. A **withheld** result has none of these statuses; a **partial** or
**labelled** result is at most Calculated. User-facing statuses (§14.4) map onto this model: *Complete* = Validated; *Partial* = Calculated with
coverage below 100%; *Not calculated* / *Unavailable because of a dependency* / *Not supplied* / *Invalid input* = withheld with that reason;
*Assumed input* = Calculated with a disclosed assumption.

**How X1 prepares for CIS [P].** CIS will need, for any figure: its inputs, their states, the rules applied and the code path. X1 retains the
first three (field-state records with provenance, contract and rule versions, dependency assessments per calculation and record). An independent
verifier can then recompute from the same recorded inputs and compare. X1 deliberately does not build the verifier, does not claim
verification, and keeps its records JSON-safe (non-finite raw values are stored as text) so they can be exported unchanged.

## 11. Roadmap compatibility

| Roadmap area | What X1 provides | What X1 does not do |
|---|---|---|
| Forecasting and predictive intelligence (Forecaster planned for v0.8) | calendar-indexed history with explicit gaps and the three history conditions (§9) | choose algorithms, gap rules or thresholds |
| Universal data import | the same field states and reasons on the import route; Stage 1 untouched | Stage 1 redesign, mapping profiles (A12) |
| Inventory and replenishment; MRP | dependency declarations for availability, position, shortage, excess, MRP; MRP crash containment | new replenishment logic; the excess definition (D5) |
| Supplier intelligence | declares that supplier outputs do not depend on the seven fields, so they stay available | supplier scoring changes |
| Production planning | BOM-line states and the feasibility dependency | feasibility redesign |
| Visual intelligence | status per figure (§10) that charts can show (no NaN plotted as a number) | chart redesign |
| Client Scenario Mode, Recommendation Impact Mode | reproducible recorded inputs and states, so a scenario changes declared inputs, not silent defaults | the modes themselves |
| CIS | §10 | the verifier |

Design choices made for compatibility: one namespace with versioned contract; records keyed by field and record (item, item+location,
parent+component, item+month); no route-specific shapes; no framework, build step, dependency or service.

## 12. Architecture and implementation work packages

### 12.1 Architecture [P; status per item in the implementation report]

- `js/validation/x1-integrity.js` — one plain script (same pattern as `js/import/*.js`), namespace `CGValidation`, frozen, versioned: field
  descriptors (seven fields; descriptive facts only, no unresolved policy), state classifier, provenance records, dependency registry,
  withholding records (shape compatible with the gate's `{ withheld, reason }`), calendar-indexed history, report text, and two route adapters
  (direct workbook; Stage 1 result + mapping). One file because the parts are small and always used together; splitting further would add load
  order without benefit.
- `js/calculations.js` — only containment: dependency checks and defensive guards in MRP (and the date helpers), inline, no new top-level names,
  line count unchanged.
- `js/engine/engine-api.js` — `runEngine` attaches `integrity` (field states, history conditions, dependency assessment) when `CGValidation` is
  loaded; accepts a precomputed import-route record through `opts.integrity` (unknown options are already ignored, so this is additive).
- `js/app.js` — MRP view: withheld rows shown as "Not calculated" with their reason; replenishment total excludes them and says "partial".
- Not changed: Stage 1 (`js/import/validate.js`, `mapping.js`, `canonical.js`), `adapter.js`, `result-gate.js`.

**Protection conflict (blocks one step) [E].** Loading `x1-integrity.js` in the browser page requires a new `<script>` in `index.html`. The
protected test `tests/check-globals.js` asserts the exact six-script list, and its checksum line is protected; changing it needs an assertion change
(accepted-assertion area 4) **and** a re-hash of a protected checksum line, which the authorisation forbids (§10 of the instruction). So the shared
layer runs in the engine wrapper, the import pipeline and the tests, but **not yet in the browser page**; the MRP containment, which is inside
`calculations.js`, does run in the page.

### 12.2 Work packages

| WP | Objective and scope | Files | Depends on | Behaviour change | Risks | Tests and acceptance | Protection implications | Owner authorisation |
|---|---|---|---|---|---|---|---|---|
| WP1 | field-state classifier and provenance record | `x1-integrity.js` | — | none (new module) | state rules too coarse | unit tests for all ten states and provenance fields; JSON-safe records | new test file; additive registry entry | authorised 20 Nov |
| WP2 | dependency registry and withholding records | same | WP1 | none | declarations incomplete | declare/assess tests; independent calcs unaffected | as WP1 | authorised |
| WP3 | contain the MRP crash and unsafe operations | `calculations.js`, `app.js` | WP2 (concepts) | only inputs that crashed before: run completes, affected rows "Not calculated" | changing output for valid data | crash cases on both routes complete; golden/confidence exact; affected rows withheld; others unchanged | none beyond new tests | authorised |
| WP4 | route integration | `engine-api.js`, `x1-integrity.js` | WP1–2 | new `integrity` output key | key contract tests; route provenance | both routes classified alike where Stage 1 permits; documented differences represented | browser loading **blocked** (§12.1) | authorised; page loading needs a separate decision on the protected assertion |
| WP5 | field policies | engine, adapter/gate | D1, D3, D4, D7 | yes | accepted assertions (areas 1, 2) | per approved policy | superseding records | **needs decisions** |
| WP6 | demand-history behaviour (classification/excess for absent history; gap-aware methods) | engine, forecasting | D6 | yes | forecast changes for gapped fixtures | three history conditions | possibly area 3 | **needs D6** |
| WP7 | result statuses and coverage across views | `app.js`, engine | D4, D7 (partly) | yes | UI shape | statuses per §14.4 | — | partly authorised (MRP view only, as part of WP3) |
| WP8 | regression and readiness | — | all | — | — | fast and full tiers; acceptance assessment | records additive only | authorised (no commit) |

**Sequence.** WP1 → WP2 → WP3 → WP4 (implemented in this task), then WP5–WP7 after decisions, then WP8. WP3 precedes WP4 because the crash
stops the run before any integration output can be observed.

## 13. Owner decision register (D1–D7)

Each entry: question; options; consequences; provisional preference (not an approval); my independent recommendation; evidence needed; work
affected. None is decided here.

**D1 — Field-level policies.** *Question:* approve or amend §5 (seven fields), including its sub-questions: (a) quarantine an item vs refuse the
import for a bad stock row (import route Stage 1 work package); (b) zero BOM quantity invalid or permitted; (c) where the design has not settled
it, stop a whole run vs withhold outputs (§5.1 B total absence); (d) negative Allocated/On_Order/Reorder_Point invalid on the direct route too.
*Options:* approve; amend per sub-question. *Consequences:* (a) quarantine keeps unrelated analysis but changes accepted Stage 1 assertions
(area 1, 2); refusal keeps today's behaviour. (b) invalid → material plans never use a zero line; permitted → phantom lines allowed. *Provisional
preference:* amend to resolve contradictions (done in v2). *My recommendation:* approve §5 as written; for (b) I recommend *invalid* unless
phantom components are a real case in target businesses. *Evidence needed:* whether target ERPs export zero-quantity BOM lines. *Work affected:*
WP5, accepted-assertion areas 1–2.

**D2 — Provenance.** *Options:* (a) shared field-state record on both routes; (b) route stamp only; (c) full cell lineage. *Consequences:* (a)
traceable to record and source, modest effort, supports future source declarations; (b) cheap, cannot say which record caused a withheld figure;
(c) heavy, beyond X1. *Provisional preference:* (a). *My recommendation:* (a) — it is what the foundations already implement generically, and
it is what CIS needs. *Evidence needed:* none further. *Work affected:* WP4, WP5.

**D3 — Missing-column handling in X1.** *Options:* (i) include all, including Stage 1 table-level changes; (ii) crash containment and clear
messages now, Stage 1 deferred; (iii) defer all. *Consequences:* (i) closes route differences sooner, changes accepted Stage 1 behaviour;
(ii) removes the crash and silent NaN, leaves the documented route differences (§7.1); (iii) leaves a valid import and one blank raw-material
allocation able to stop the run. *Provisional preference:* (ii). *My recommendation:* (ii); the containment part is already implemented under the
foundations authorisation because it prevents a crash rather than choosing a policy. *Evidence needed:* none. *Work affected:* WP3 (done),
WP5 (Stage 1 part).

**D4 — Allocation-unknown presentation.** *Options:* (a) visible with warning; (b) separate "unknown" group; (c) hybrid, in place with a
distinct status, excluded from excess totals; plus layout A/B/C from the Round 2 mock-ups. *Consequences:* presentation only — the integrity
rules of §8.3 are identical under every option. (a) least change, risk of being read as excess; (b) clearest, moves stock out of the list;
(c) keeps stock in place and visibly not calculated. *Provisional preference:* (c). *My recommendation:* (c) with layout A (four columns),
because it shows physical stock beside "allocation unknown" without moving rows. *Evidence needed:* the owner's view of the mock-ups. *Work
affected:* WP5, WP7.

**D5 — Excess definition.** *Options:* keep the 90-day rule; adopt E1 (unallocated usable + on-order − forecast − safety stock) later. *Consequences:*
E1 makes unknown on-order and forecast credibility matter for excess (§8.2). *Provisional preference:* defer. *My recommendation:* defer; record
that E1 would need on-order known-state handling and forecast eligibility first. *Evidence needed:* forecasting programme outputs. *Work
affected:* none in X1.

**D6 — Missing demand month.** *Options:* unknown; zero. *Consequences:* unknown — honest, lowers confidence, needs gap-aware methods (§9) and
changes classification/excess for items with no usable history (no longer "No recorded demand" from an assumed zero); zero — continuity, but
invents demand of zero, inflating excess when a month was simply not exported. *Provisional preference:* unknown. *My recommendation:* unknown,
consistent with what both routes already do for absent rows. *Evidence needed:* whether any golden/confidence fixture item has an internal gap
(regression impact). *Work affected:* WP6, accepted-assertion area 3.

**D7 — Zero unit cost.** *Options:* valid; suspicious; source-dependent. *Consequences:* §5.3 — suspicious keeps the number (0 is mathematically
valid) but stops zero-cost items counting as costed; it does **not** make zero invalid. *Provisional preference:* suspicious. *My recommendation:*
suspicious now, moving to source-dependent once D2 declarations exist, because some stock (free issue, consignment) is genuinely zero-cost.
*Evidence needed:* whether target businesses hold zero-cost stock. *Work affected:* WP5, WP7.

### 13.1 Owner decisions, 21 Nov 2026 (recorded as the OWNER'S decisions; the entries above are kept as the decision history)

| Decision | Owner decision | Effect on §5 (mapped to the seven fields) |
|---|---|---|
| **D1(a)** | Quarantine a bad stock row on the import route instead of refusing the whole import; keep the rejection reason and provenance; never repair or accept the invalid value. | §5.1 A and the import route of §5.2, §5.6, §5.7, §5.3: the row is quarantined and its item stays visible as **Not Assessed** (WP5). This is an authorised additive Stage 1 correction (row handling only). `REQUIRED_UNMAPPED` is **not** changed (D3). |
| **D1(b)** | A zero BOM quantity is invalid. | §5.5 as written. The classifier still records the fact `zero`; the policy layer treats a BOM line with `zero` as invalid. Import route: Stage 1 handles it as a bad BOM line (additive correction). |
| **D1(c)** | Not a D1 question; it belongs to D3. | **Register correction:** D1(c) above ("stop a whole run vs withhold outputs") is withdrawn from D1 and answered by D3 (ii). The text is kept above as history. |
| **D1(d)** | Negative Allocated, On_Order and Reorder_Point are prohibited on **both** routes, never normalised; original value, reason and provenance kept. | §5.2, §5.6, §5.7 as written (`negative-prohibited`). Direct route: the engine treats them as unavailable (no longer "adds to available stock"); the High "Negative quantities" warning stays. Import route: CDv1 already rejects them; under D1(a) the row is quarantined rather than the import refused. |
| **D2** | Option (a), shared field-state record; one builder (`CGValidation`) for both routes. | Future extensions recorded, **not** required now: mapping entries (source column → canonical field) in `transformations`; stable per-figure input IDs. |
| **D3** | Option (ii): containment and clear messages now; Stage 1 table-level changes deferred. | Absent required column: dependent calculations withheld with a reason; route differences of §7.1 stay documented, and route equivalence is not claimed. |
| **D4** | Option (c), hybrid, layout A. | Affected items stay in place with the canonical status **"Not Assessed"** and its reason. They are excluded from totals where their figures cannot be calculated, and counted in coverage ("N of M assessed"). An unknown input never makes an item look healthy, low-risk or fully assessed. |
| **D5** | Defer E1; keep the 90-day excess rule unchanged during X1. | No change to the excess calculation. |
| **D6** | A missing month is **unknown**, not zero; a recorded zero stays a zero; calendar-indexed history and provenance are kept; gaps are never filled or compressed in the integrity record. | §5.4 and §9 under "D6 = unknown". Forecasting consequences in WP6. |
| **D7** | Zero unit cost is **suspicious**: the value and provenance are kept, it is flagged, and it is excluded from reliable cost-coverage claims. Source-dependent treatment is a future extension; no source declaration is invented. | §5.3 under "D7 = suspicious". |

**Status vocabulary (owner, §6.3):** "Not Assessed" is the canonical user-facing status for any figure that cannot responsibly be assessed from
the available data. The MRP label "Not calculated" (task 1) is superseded by it. A row that cannot be calculated for a reason **other** than
unknown input shows that reason and is not labelled "Not Assessed – [field] unknown".

### 13.2 Implementation notes and corrections, task 3 (21 Nov 2026)

- **§5.7 discrepancy, resolved.**
  - §5.7 says the reorder *flag* uses the recommended reorder point. That is true only under the calculated policy. Under the default
    workbook policy (`CFG.pol = 0`), `ropU` is the workbook reorder point.
  - Resolution, as implemented: a blank or absent workbook reorder point means "not configured", so the reorder check does not apply. An
    invalid or negative one (D1(d)) makes the reorder flag and the risk status Not Assessed.
- **Interim disclosure banner (owner §6.1).** The task-2 banner (CR-04 item 5) was an *interim disclosure pending WP7 and D4*. It was
  reviewed under WP7 and **amended**: the views now apply D4, so "may be understated" was no longer true. The new wording says affected items
  stay in every list as Not Assessed with the reason, and that totals say how many items they cover.
- **`INTEG` and `out.integrity` (owner §6.2).**
  - Both are built by the single builder `CGValidation.forEngineResult` with the same arguments.
  - `out.integrity` is the authoritative record for programmatic consumers (`CGEngine.runEngine`).
  - `INTEG` is the browser application's copy for the analysis on screen. It is not stored on `R`, so the wrapper's `result === R`
    contract holds.
  - The browser test asserts on every variant and both screen sizes that `JSON.stringify(CGEngine.runEngine({}).integrity) ===
    JSON.stringify(INTEG)`.
- **One reason channel (owner §6.3).** Every on-screen reason comes from `CGValidation.reasonsFor(INTEG, id)`: the MRP row, the Risk
  column, Health, Excess and the export. The engine's own reason (`x.naWhy`, `mrpCalc` `why`) stays for computational traceability. It is
  shown only if the record is missing, and then labelled "engine check; integrity record unavailable".
- **Tag-5 / Tag-6 (owner §6.5).**
  - `check-control` fails by design: it compares the current approved lines with Tag-5. Every legitimate approved change since Tag-5 adds to
    its list (8 lines after P1, plus the P3 additions and the task-3 re-hashes).
  - Tag-6 must reconcile every one of these changes. It is not a switch or a reset.
  - The guard, Tag-5 and the baselines are unchanged.
- **Evidence versus correctness (owner §6.7).** These are kept separate:
  - a passing test establishes the specified behaviour under the tested conditions;
  - browser evidence shows observed application behaviour;
  - calculation correctness needs independent recomputation and reconciliation, which X1 has not done;
  - independent review and formal acceptance belong to others.

  Nothing is labelled Verified.

### 13.3 Owner approvals Q1–Q4, 21 Nov 2026 (task 4)

**D6 scope (owner Q1, verbatim requirement):** "D6 applies to items with no usable demand history as well as to gaps within a history:
both are unknown, not zero." A recorded zero remains zero.
- *Order of work, disclosed:* the protected assertions were superseded **after** the fixture evidence was confirmed but **before** this
  sentence was added. The content is unchanged by the order.
- *Fixture evidence:*
  - FG050 and FG014 each have 12 positive Northstar demand rows and 0 recorded zeros; the Round 2 and quality tests remove them.
  - P0001, the only parent of M0058, has 24 positive rows in Package 01 and 0 recorded zeros; it is excluded in import I6.
  - So all three are "no demand rows", never recorded zero.

**Raw-material corollary, as implemented:**
- A material whose parent has no demand rows has **unknown** derived demand.
- A material used by **no** BOM line keeps derived demand 0. That is structural: no product consumes it. *Confirmation requested (Q6).*

**D1(a) (owner Q4, an authorisation amendment).** D1(a) requires a change to the **Stage 2 adapter**, not only Stage 1 row handling. The
minimum change was made:
- Stage 1 quarantines a bad stock row of an **identified item** (`ROW_QUARANTINED`, "Please check", the dataset is not blocked; the row is never
  imported and its reasons are kept).
- The adapter writes that item with **no** stock values. It never partly sums its other locations.
- The engine shows it Not Assessed.
- The X1 record carries the reason "stock row quarantined".

Stock rows whose item code matches **no** item (unmatched, suggested links, totals lines) keep the existing item-matching rules (Q2/Q13,
Option A). Whether they should also be quarantined is a new owner question (Q5).

**Assertion areas, corrected:**
- **Area 1** ("Stage 1 On_Hand refusal vs item containment") is now "Stage 1 bad-stock-row refusal → quarantine (Stage 1 + Stage 2 adapter)".
  10 `test-import-mapping.js` checks were superseded with notes.
- **Area 2** ("Stage 1 BOM-cell refusal"): Stage 1 still refuses a blank or invalid BOM cell (D1(a) covers stock rows only). D1(b) zero = invalid
  is enforced by the engine on both routes.

## 14. Tests, acceptance criteria, design matrix, reporting, assertion changes

### 14.1 Test specification

Foundations (WP1–WP4), implemented in this task: classification of every state; provenance fields; JSON safety; registry declare/assess;
withholding records; calendar history for the three conditions; MRP containment on both routes (blank raw-material allocation, absent column,
non-finite lead time) with unaffected outputs unchanged; route classification equivalence where Stage 1 permits; documented route differences
represented. Decision-dependent behaviour (WP5–WP7): per field, blank / whitespace / absent column / all blank / invalid / NaN / ±Infinity /
zero / negative / large / partial and total absence, both routes; the five cross-field scenarios and fixed Tests A and B of v1 §11, re-stated
here unchanged in substance, run once their decisions are made. Regression: golden v0.5 and v0.6.0 and confidence v0.7 exact in five zones; the
fast and full tiers at their accepted counts.

### 14.2 Acceptance criteria

The 22 criteria of the implementation authorisation (§16 there) are the acceptance criteria; the implementation report assesses each.

### 14.3 X1 design matrix (summary)

| Field | Status | Blank | Column absent | Invalid / non-finite | Zero | Negative | Owner decision |
|---|---|---|---|---|---|---|---|
| On_Hand | required | item quarantined [P] | dependent outputs withheld (direct); import refused (unchanged) | quarantined + High | valid | valid, High warning | D1 |
| Allocated | optional at source, required for availability | unknown [P] | unknown for all; contained [E impl.] | unknown + High | valid | invalid [P] | D1, D4 |
| Unit_Cost | optional, required for money | item money withheld | all money withheld | withheld + High | per D7 | withheld | D1, D7 |
| Units_Sold | required if demand supplied | missing month | demand not supplied (direct); import refused | missing + High | recorded zero | invalid | D1, D6 |
| Qty_Per | required if BOM supplied | line invalid | BOM unusable (direct); import refused | line invalid | invalid [A] | invalid | D1 |
| On_Order | optional | not supplied | not supplied | not supplied + High | valid | invalid | D1 |
| Reorder_Point | optional | not configured | not configured | not configured + High | valid | invalid | D1 |

### 14.4 User-facing reporting

Statuses shown to a planner: **Complete**, **Partial** (with coverage), **Not calculated** (with the missing dependency), **Not supplied**, **Invalid
input** (naming the cell and its text), **Assumed input** (naming the rule), **Unavailable because of a dependency**. Examples: "Physical on-hand
quantity available; allocation unknown"; "Available stock not calculated because allocation is missing (Inventory row 14)"; "Financial valuation
incomplete: unit cost unavailable for 2 items (coverage 148 of 150)" (illustrative); "Forecast unavailable: no usable demand history";
"Replenishment incomplete: on-order quantities not supplied". Warnings are scoped to the figures they affect; unaffected results carry no warning.

### 14.5 Accepted-assertion changes (the four identified areas)

| Area | Existing assertion | Proposed behaviour | Depends on | Status |
|---|---|---|---|---|
| 1 | Stage 1 refuses an import with an invalid/blank On_Hand cell (`test-import-stage1`, `test-import-integrity`) | item quarantine | D1(a), D3 | not changed; awaiting decision |
| 2 | Stage 1 refuses an import with an invalid BOM quantity | line invalid | D1(a), D3 | not changed; awaiting decision |
| 3 | Medium "Zero/negative demand months" for genuine zeros (no golden fixture has zeros [U]) | informational note; negatives invalid | D1, D6 | not changed; awaiting decision |
| 4 | `check-globals` asserts the six-script page list (protected file and checksum) | add `x1-integrity.js` to the page | approval of the assertion change and of re-hashing a protected checksum line | not changed; **blocked by the protection rules** |

Any approved change will keep the old record, add a superseding record with reason and authorisation, and link the two.

### 14.6 What was not changed by the design work

No Stage 1 file, test, baseline, snapshot, checksum, accepted result, tag or historical record; the v1 document is unchanged; nothing committed,
pushed or published; the unexplained folder was not read or used.

---

### 13.4 Final completion, 21 Nov 2026 (decisions made under the owner's completion authorisation)

**Blank or unknown `Material_ID` on a BOM line (direct route).** Decision made by Claude under the authorisation; the owner may revisit it.
- The line is not used: no material is guessed and the code is not trimmed or corrected.
- It is reported: a High data-quality warning names the sheet row and the parent product.
- The parent's production orders are "Insufficient information", with the reason.
- A material with **no** valid BOM line is Not Assessed ("usage unknown, not zero"): Q6's structural 0 needs a complete BOM, and a line
  naming no known material means "used by no product" cannot be established.
- A material with at least one valid line keeps its assessed usage: the unidentifiable line cannot be shown to be that material.
  This avoids withholding unrelated results (principle 6). Residual risk: if the bad line was really meant for an assessed material,
  that material's usage is understated; the High warning is the control.
- Import route: Stage 1 already rejects the line and refuses the whole import (BOM must be complete). Q5 matching rules unchanged.
- Engine and shared record use the same rule; the record matches identifiers exactly as the engine does (no trimming on the direct route).

**Issue 26 fixed** (column-level absence honours `accepts`). **Issues 27–29** found and fixed in the completion review (Appendix C).

### 13.5 Material-integrity correction, 21 Nov 2026 (supersedes part of §13.4)

§13.4 kept a material with valid BOM lines "assessed" beside an unidentifiable line. The owner rejected that residual risk: the known figure
may be incomplete. **Decision (Claude, under the owner's authorisation):**
- A BOM line whose Material_ID is blank, whitespace-only or names no known material **can add usage to any material**: no field narrows it,
  and attributing it would be guessing. The one provable exception: its parent has **recorded zero sales in every month** (zero × anything = 0).
- While a line can add usage, **every** material's BOM-derived usage is **incomplete**:
  - usage is unknown for every calculation (Not Assessed: risk, reorder/safety stock where calculated, MRP, excess, cover, ABC/XYZ, exposed £);
  - the **known part** (valid lines only) is kept apart and shown as "at least N (incomplete: not used in any calculation)" on screen and in
    the export reason;
  - checks against limits **configured in the workbook** (reorder point, safety stock, shortage £) stay, because they do not use usage.
- A material with **no** valid line stays **unknown** even if the bad line provably adds 0: a structural 0 needs a complete, valid BOM (Q6).
- Products are unaffected (their demand does not use the BOM). Feasibility: no order after one with unknown material use is shown feasible
  for the materials it may share (any material, for an unidentifiable line).
- Import route: Stage 1 still refuses a blank or unknown component (approved route difference). Items Stage 1 identified and then excluded
  (e.g. unit mismatch) are **known codes**; the adapter lists them on a hidden workbook property so they are never treated as unidentifiable.
- Why this is the safest defensible option: a narrower rule would have to pick the materials the line "probably" means, which is guessing;
  a wider rule (withholding products too) would withhold results that provably do not depend on the BOM.

## Appendix A — Revision history

| # | Change | Sections | Prompted by | Type |
|---|---|---|---|---|
| 1 | On_Hand partial vs total absence; total absence withholds dependent outputs only | 5.1, 6, 8.1, 14.3 | DeepSeek finding 1 (on the v1 text) | changes a recommendation |
| 2 | Stage 1 table-level change withdrawn; containment design added | 6, 6.1, 6.2 | DeepSeek finding 2 | changes a recommendation |
| 3 | On-order effects per figure and supply setting; "conservative" removed | 5.6, 8.2 | DeepSeek finding 3 | corrects an error |
| 4 | Allocation-unknown rules independent of D4 | 8.3 | DeepSeek finding 4 | clarifies scope |
| 5 | Calendar-indexed history; gaps keep position | 9 | owner clarification (v2 instruction) | changes a recommendation |
| 6 | Ten-state field model | 4 | owner v2 instruction §7 | clarifies scope |
| 7 | D7 four meanings of zero | 5.3, 13 | owner v2 instruction §6 | clarifies a decision |
| C1 | Order of controls: classify → dependencies → withhold → prevent propagation → guards → report; gate primary | 6.2 | owner review clarification C1 | corrects the design |
| C2 | Honest route-difference table and future reconciliation requirements | 7.1 | clarification C2 | clarifies scope |
| C3 | Three demand-history conditions; absent history today treated as zero demand in classification/excess (evidence) | 9 | clarification C3 | identifies an unresolved decision (D6) |
| C4 | What stays calculable without on-order; `CFG.sup` modes; no excess-direction claim | 8.2 | clarification C4 | clarifies |
| C5 | Allocation-unknown output classes; physical quantity ≠ inventory quantities complete | 8.3 | clarification C5 | corrects wording |
| C6 | Working-tree origin table; checks are Claude's, not independent | 2, Appendix B | clarification C6 | clarifies |
| 8 | Part 2 written (10–14, appendices) | 10–14 | v2 instruction | completes the package |
| 10 | (21 Nov 2026, task 3) Owner decisions D1–D7 recorded (§13.1); D1(c) moved to D3 (register overlap corrected additively); canonical status "Not Assessed" | 13.1 | owner decisions of 21 Nov 2026 | records decisions |
| 11 | (21 Nov 2026, task 3) §13.2 implementation notes: §5.7 discrepancy resolved; banner amended (§6.1); INTEG/out.integrity roles (§6.2); single reason channel (§6.3); Tag-6 reconciliation (§6.5); evidence vs correctness (§6.7). Appendix C issues 12 (fixed), 17–23 | 13.2, C | owner task-3 authorisation §6 | records implementation and corrections |
| 12 | (21 Nov 2026, task 4) §13.3: D6 scope sentence (Q1), D1(a) Stage 2 adapter amendment (Q4), assertion-area corrections; Appendix C issues 21–23 resolved; issues 24–25 (Q5, Q6) | 13.3, C | owner approvals Q1–Q4 | records decisions |
| 13 | (21 Nov 2026, final completion) §13.4: blank/unknown Material_ID decision; issue 26 fixed; issues 27–29 found and fixed | 13.4, C | owner X1 Final Completion Authorisation | records decisions |
| 14 | (21 Nov 2026, material-integrity correction) §13.5 supersedes the §13.4 rule for materials with valid lines; issues 30–34 | 13.5, C | owner X1 Final Material Integrity Correction | records decisions |
| 9 | (21 Nov 2026) Appendix C issues 11–16 added; dated status of issues 1, 2, 5 added; pre-amendment Part 1 preserved in `x1-implementation/design-history/` | C | owner task-2 clarifications A, D | records findings; no recommendation changed |

## Appendix B — Protection report (design work)

Checks performed by Claude (own checks, not independent verification). Starting states: v2 task `x1-v2-protection/` (2026-11-20T22:39Z);
implementation task `x1-implementation/start-state/` (2026-11-20T22:54Z). The end-of-task results are in the implementation report.

| Check | Status |
|---|---|
| Branch, HEAD, tags, stashes, refs recorded at start | PERFORMED (both tasks) |
| Working tree hashed at start, evidence folder excluded | PERFORMED (implementation task; the v2 design task hashed it before the owner's no-read instruction) |
| v1 design document unchanged | PERFORMED (hash compared at the start of each task) |
| GitHub refs read-only (`ls-remote`) | PERFORMED |
| Unexplained folder untouched | Implementation task: **NOT PERFORMED – NOT VERIFIED** by content (the owner forbids inspecting it); only its absence from every command and output is asserted |
| Independent verification of any of the above | **NOT PERFORMED – NOT VERIFIED** |

## Appendix C — Outstanding issues register (not owner decisions unless listed in D1–D7)

| # | Issue | Type |
|---|---|---|
| 1 | Browser page cannot load the shared layer without changing a protected test (§12.1) | protection conflict, needs owner direction |
| 2 | Adding X1 test checksum lines raises `check-protection`'s accepted count, an existing entry | protection-register question (implementation report) |
| 3 | `forecasting.js`, `app.js` views and Stage 1 acceptance logic not fully re-read | evidence gap |
| 4 | No repository description of CIS or the forecasting programme | evidence gap |
| 5 | Whether any golden/confidence fixture item has an internal demand gap | to check before WP6 |
| 6 | Text-number policy (Option C / XCRT) still REVIEW; X1 classifies text as invalid meanwhile | dependency |
| 7 | No upper plausibility bound for quantities or costs | open technical question, no rule proposed |
| 8 | Import route still uses the gate's generic R7 reason for non-finite values | to replace with specific reasons in WP5 |
| 9 | Absent demand history classed "No recorded demand" with all stock as excess | D6 (WP6) |
| 10 | Required/optional field matrix for all canonical fields (M1 Clarification 2) not found | evidence gap, outside X1 |
| 11 | **Stock-cover advice disappeared silently** when available stock was unknown. *Cause:* `forecasting.js` `recFor` computes `fc = av / (forecast/day)`; with `av` NaN, `fc` is NaN, not null, so `fc < lead time` and `fc > excess` are both false and neither sentence is added. *Risk:* a consultant may read missing "replenish" advice as "cover is fine" (operational: missed replenishment; commercial: loss of credibility if a client's stock-out was flagged nowhere). *Status:* **explanation implemented 21 Nov** (CR-04 item 6): the advice now says "Stock cover not assessed … no replenishment advice can be given". Clean data unchanged. 5 tests. The broader handling stays in WP5/WP6. | Claude finding; presentation fixed; policy WP5 |
| 12 | **Broader pattern: unknown inputs silently read as "no problem".** Every comparison with NaN is false, so with `Allocated_Qty` blank the item's reorder flag (`pos < ropU`), safety-stock flag (`av < ssU`) and excess flag turn off. Its shortage becomes £0, its severity falls (RM001: 3 → 0; FG003: 3 → 0) and its health score rises (RM001: 42 → 100). The item leaves critical lists and the shortage total is understated. Confirmed on Northstar 21 Nov. Existing behaviour, not caused by X1. Transfer recommendations: no Transfer recommendation exists in the engine (none found in `calculations.js`, `forecasting.js`, `app.js`). Order recommendations: MRP withholds since WP3; the Overview and Summary "order now" counts use the same MRP rows. *Interim:* the every-tab banner (CR-04 item 5) tells the user these figures may be understated. *Fix:* WP5 dependency-based withholding of severity, health, shortage, cover and flags, using the X1 registry; it needs D1/D4 because it changes how risk status is presented. | Claude finding; **significant**; WP5, needs D1/D4 |
| 13 | Raw-material demand is indirect (parent `Units_Sold` × BOM). X1 records history for finished goods only (CR-06). Whether a raw material's usage is "unknown" when all its parents lack usable history depends on D6. | WP6, D6 |
| 14 | The browser app has no import-upload screen; Universal Import runs only in tests and in the browser harness (CR-05). | scope decision for the owner |
| 15 | `test-paging-chrome` is BLOCKED because Playwright's browser cannot be downloaded, yet a working Chromium (`@sparticuz/chromium` via puppeteer-core) is available and used by `browser-chrome` and `browser-x1-chrome`. Porting would restore coverage but changes a protected test. | proposal; owner approval needed |
| 16 | `gbp()` prints "£–" for a missing money value app-wide. That is acceptable (not a figure), but "–" alone would be more consistent with the quantity columns. | LOW; presentation, not changed |

| 17 | One unknown annual value pushed every later item into ABC class C (75 of 100 materials for one invalid cost; existing behaviour). **Fixed in WP5:** items with unknown values are "Not Assessed" for ABC and the others are ranked among known values. | Claude finding (browser test); fixed |
| 18 | Feasibility read unknown material stock as 0 (`Math.max(0, NaN)`), which could report a false "Material shortage". **Fixed:** "Insufficient information" with the material and reason. | Claude finding; fixed |
| 19 | Stock-cover chart put unknown cover in ">90d". **Fixed:** a "Not Assessed" band. | Claude finding (WP7); fixed |
| 20 | Raw-material usage summed parents by row position, not by month, so a parent with a gap shifted months; it also produced NaN usage from a blank cell. **Fixed in WP6** (calendar-aligned; a month with a missing parent is unknown). This is the source of the 12 extra Willow raw-material changes. | Claude finding; fixed |
| 21 | **Q1, owner decision.** An item with **no demand rows at all**: D6 says unknown, but accepted Round 2 C-STK and import I6 assertions require "No recorded demand" with all uncommitted stock as excess. Interim: existing treatment kept, record condition `no-rows`. | owner decision |
| 22 | **Q2, owner decision.** The Round 2 assertion "a negative allocation … gives the same uncommitted figure (15)" encodes the behaviour D1(d) prohibits. It now fails (1 check). It is a frozen Round 2 record outside the four authorised areas, so it is not amended. | owner decision |
| 23 | **Q3/Q4, owner decisions.** Q3: how to record the D6-driven Willow confidence-snapshot difference (one line) without replacing the accepted snapshot. Q4: D1(a) quarantine needs a Stage 2 adapter change (the adapter refuses the whole import when a counted stock row has no on-hand). | owner decisions |

| 24 | **Q5, owner decision.** Should stock rows whose item code matches no item (unmatched, suggested links, totals lines) also be quarantined instead of blocking the import? Today they keep the approved item-matching rules. | owner decision |
| 25 | **Q6, confirmation.** A raw material used by no BOM line keeps derived demand 0 (structural) instead of unknown. | owner confirmation |
| 27 | Blank, whitespace or unknown `Material_ID` on a BOM line could leave an otherwise-unused material at a false structural 0. **Fixed** (§13.4). | owner-required; fixed |
| 28 | "Exposed £/mo" (Materials screen) read unknown parent demand as 0. **Fixed:** unknown. | Claude finding; fixed |
| 29 | On-screen reasons printed "null" when a reason had no source row. **Fixed.** | Claude finding; fixed |
| 30 | A material with valid BOM lines kept its usage as complete beside an unidentifiable line (residual risk in X1-COMPLETION-REPORT §E). **Fixed** (§13.5). | owner-required; fixed |
| 31 | Feasibility: an order with unknown material use consumed nothing, so later orders could show a false "Feasible". **Fixed.** | Claude finding; fixed |
| 32 | Recommended policy: an incalculable safety stock gave "not below safety stock" and a £0 shortage. **Fixed:** unknown. | Claude finding; fixed |
| 33 | An invalid BOM line still gave annual usage 0 and an XYZ class from incomplete history. **Fixed.** | Claude finding; fixed |
| 34 | Import route: an excluded but identified material was indistinguishable from an unknown code in the engine. **Fixed** (hidden adapter list). | found by regression; fixed |

**Status updates, 21 Nov 2026, final completion:** issue 26 **fixed** (CR-24). Issue 8 **kept, documented:** the gate's generic
NON_FINITE_VALUE code is internal to Stage 2 and shown on no screen; every user-facing reason comes from `reasonsFor`, which is specific.

**Status updates, 21 Nov 2026, verification task (owner decisions Q5, Q6):**
- **Issue 24 (Q5) — owner decision: DEFERRED scope.** X1 quarantine is not extended to unmatched item codes, suggested links or TOTAL rows;
  they keep the existing matching and import-blocking rules. This is not an implementation failure.
- **Issue 25 (Q6) — owner decision.** A raw material keeps a structurally zero BOM-derived demand only when the BOM information is complete
  and valid and no line consumes it. Missing, incomplete, invalid or unreliable BOM information gives unknown demand. Verified (X1-VERIFICATION-REPORT.md §3).
- **New issue 26 (found in verification, NOT fixed; owner approval requested).** When the `Reorder_Point_Qty` column is absent, the shared
  record's dependency assessment ignores the per-field `accepts` list for column-level absence. It therefore reports "Risk status" as
  depending on the column, although the engine (correctly) assesses every item with "No reorder point configured".
  - No figure or status is wrong.
  - The banner and the MRP notice overstate what is withheld.

**Status updates, 21 Nov 2026, task 4:** issues 21 (Q1), 22 (Q2) and 23 (Q3, Q4) are **resolved** by the owner's approvals and implemented
(§13.3; X1-CHANGE-RECORD.md CR-17 to CR-21).

**Status updates, 21 Nov 2026, task 3:** issue 12 **fixed** (WP5: severity, health, flags, shortage, excess and cover are Not Assessed
with the reason in every view and the export; evidence in `x1-implementation/X1-TASK3-REPORT.md`). Issue 13 implemented (WP6 derived
demand). Issue 9 partly addressed: rows present but unusable are now unknown; no rows at all is Q1. Issue 8 (generic R7 reason on the
import route) is unchanged, because it is gate code (Stage 2).

**Status updates, 21 Nov 2026** (rows above unchanged): issue 1 resolved by P1 (CR-02). Issue 2 deferred to P3: prepared, not applied
(task-2 report §7). Issue 5 answered: only `structure/scenario-willow.xlsx` has items with an internal demand gap (WF-B330, WF-E110, WF-F355,
WF-I957, WF-K343, WF-N525), so a D6 change would move the confidence snapshot for Willow only (test in `test-x1-containment`).
