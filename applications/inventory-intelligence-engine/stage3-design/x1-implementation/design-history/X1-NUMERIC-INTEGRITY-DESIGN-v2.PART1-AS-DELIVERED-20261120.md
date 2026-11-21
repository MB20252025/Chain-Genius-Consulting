# X1 numeric integrity: design and owner decision package, version 2

*Prepared by Claude, 20 Nov 2026, under the owner's "X1 – Controlled Design Revision v2" instruction. Design only. Nothing here is
implemented, adopted, accepted or approved, and no implementation authority is granted or implied by any section, including the work
packages. It replaces `X1-NUMERIC-INTEGRITY-DESIGN.md` (v1) in content; v1 is kept unchanged as the record of what was first proposed.*

**Delivery status: PART 1 of 2 — sections 1–9.** Part 2 (sections 10–14, revision log, protection report, outstanding issues register)
follows after the owner's review of Part 1.

| Part 1 (this delivery) | Part 2 (to follow) |
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

**Repository state at the start of this task (fresh check, 2026-11-20T22:39:11Z) [E]:** branch `development/v0.7`, HEAD `eddf09b`, Tag-5
`v0.7-tests-approved-5` → `f0e81bb`; GitHub (read-only `ls-remote`) reports `development/v0.7` `eddf09b`, `main` `8117c72`, Tag-5 `f0e81bb`;
working tree 35 status entries, 1,878 files hashed (`x1-v2-protection/start-tree.sha256`, Part 2). The v1 design document and its evidence
folder hash as left at the end of the v1 task. Full protection report: Part 2.

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

### 6.2 Containment design (D3(ii) scope only) [P]

Containment must sit **inside the engine computation**, at the boundary where a non-finite intermediate would otherwise reach code that throws,
plus a declaration upstream so the withheld figures carry a specific reason:

1. **Engine guard (both routes).** Where MRP and feasibility derive dates or statuses from availability (`days`, `ob`, `dt`, the status text),
   a non-finite input yields the status "not calculated – allocation unknown" (or the specific missing input) instead of formatting a date.
   General rule: no engine formatting or date construction may receive a non-finite number. This is local to the engine; no Stage 1 change.
2. **Declaration (field state).** The route layer records `Allocated_Qty: column-absent` (direct: from the header row; import: from the mapping's
   supplied set, already known to the adapter). The withholding specification then marks allocation-dependent outputs of every item
   `ALLOCATION_NOT_SUPPLIED`, so they are withheld with that reason instead of the generic `NON_FINITE_VALUE`.
3. **Reporting.** One clear message: "Allocated_Qty was not supplied. Available stock, excess, shortage and MRP requirements cannot be calculated;
   stock quantities, valuation, demand and supplier analysis are complete." Severity High (figures withheld).
4. **Unrelated outputs.** Valuation, physical stock, forecasting, supplier performance and BOM structure are unaffected and released normally.

**Not expanded into Stage 1 redesign:** Stage 1, the mapping rules, `REQUIRED_UNMAPPED` and import acceptance are untouched; the change is an
engine guard plus a field-state declaration read by the existing gate. **The crash is not fixed; this is a design recommendation.**

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

**Policy derived from the table [P].** Where on-order is unknown:
- figures it does not enter (physical available, shortage value, current excess) are shown normally;
- figures where exclusion only *understates* a quantity without driving an action (stock position, projected availability) are shown with the
  status **"Incomplete – on-order quantity not supplied"**; for these the trade-off is a lower-than-true figure the user can read correctly;
- figures where the error would drive an action (MRP order quantity and urgency, reorder flag, feasibility risk, in mode 1) are **withheld for that
  item**, because an overstated "ORDER NOW" is an instruction, not a figure;
- in mode 0 only the reconciliation and `netU` are affected; they are shown "not available – on-order not supplied";
- unknown on-order is never represented as 0. "Conservative" is not used as a blanket description.

### 8.3 Allocation unknown: integrity rules independent of the D4 layout

These rules apply under **every** D4 option; D4 chooses only how the result is displayed [P]:
1. Unknown allocation is never treated as zero in any figure.
2. The item's stock is never presented as confirmed *unallocated* stock: physical available stock, stock position and cover are shown as
   "unknown – allocation not supplied", not as numbers.
3. It contributes nothing to **confirmed** excess totals; excess quantity and value for the item are "not calculated".
4. Every total it would have entered (excess, available stock, shortage) is a **partial total**, identified as such, with coverage (items, and
   value where known: the item's physical value is known even though its excess is not) and the excluded value shown where meaningful.
5. Shortage value and MRP net requirement for the item are withheld (they depend on `av`); MRP dates are "not calculated" (§6.2).
6. Physical stock quantity and valuation remain available.
7. Dead-stock *visibility* is a presentation matter (D4); the dead-stock rule's internal use of 0 to decide visibility (v3.1) never becomes a value,
   and no confirmed £0 excess can result.

D4's options (a) visible with warning, (b) "unknown" group, (c) hybrid differ only in where and how such items appear, never in these rules.

## 9. Demand history and time-series integrity

**Requirement (owner clarification; D6 provisional preference: missing = unknown).** A missing month is unknown, not zero, and must never be
removed in a way that compresses the series: if January, February and April exist and March is missing, April remains April.

**Today [E].** History is the list of present rows (`calculations.js:111`); an internal gap closes up (probe P4: 11 contiguous values). Credibility
already counts `expected`, `missing` and `zeros` per item, so the engine knows a month is missing but its forecast methods (mean, moving averages,
weighted average, trend, per the forecast output) do not see where.

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

*End of Part 1. Part 2 (sections 10–14, revision log, protection report, outstanding issues register) follows after review.*
