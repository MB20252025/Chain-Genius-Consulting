# X1 numeric integrity: design and owner decision package (seven fields)

*Prepared by Claude, 20 Nov 2026, for the owner's review. Design only: nothing here is implemented, adopted, accepted or approved. When the
owner approves or amends it, it becomes the implementation specification; implementation still needs a separate, explicit authorisation
(scope, test additions, protection-register amendments). Labels used: **[E]** evidence-confirmed, **[P]** proposed recommendation,
**[A]** business assumption, **[O]** owner decision required, **[U]** unresolved evidence.*

## 1. Executive summary

The engine must never present an unreliable figure as trustworthy, and must not stop unrelated analysis because one field is bad. Today
neither route meets that for these seven fields:

- **Direct upload [E]:** a blank or invalid cell in any of the seven fields becomes NaN inside calculations. Stock value and excess show NaN
  (On_Hand, Unit_Cost, Allocated). A blank Units_Sold silently *changes* the excess headline (£106,934 → £111,387) while the item keeps Medium
  confidence. A whole missing On_Hand or Allocated column stops the analysis with "Invalid time value" (MRP date formatting,
  `js/calculations.js:180`). Four other missing columns run with 200–6,203 non-finite values and no column warning.
- **Import route [E]:** much better. Canonical Dataset v1 (CDv1) never turns a missing value into 0. Costs are withheld, not guessed, and
  incomplete history is labelled. But: (a) **a source file without an Allocated_Qty column, an optional field, passes Stage 1 and the
  adapter and then crashes the engine** (pre-existing at Tag-5); (b) a single bad On_Hand, BOM quantity or negative quantity refuses the whole
  import; (c) zero unit cost passes silently as "complete".
- **No supported source format treats a blank allocation, on-order or reorder point as zero [E].** CDv1 forbids it, and "one value for every
  row" constants are refused (A12). So Allocated_Qty's "source-dependent" status (your §4) has no source to depend on today: under every
  current contract a blank allocation is *unknown*.

**Proposal [P].** One shared, modular validation layer used by both routes. It classifies every value of the seven fields into an explicit
state (valid, recorded zero, blank, absent column, invalid, non-finite, negative, assumed) with provenance. A dependency registry then decides,
per item and per calculation, what is available, withheld or labelled, instead of letting NaN flow. Withholding is per record or per item
wherever possible; dataset-wide stops are kept only where nothing meaningful can be computed. Direct uploads get the same withholding gate
the import route already uses (RG), so equivalent input gives consistent results on both routes.

**Seven owner decisions (§12):** D1 the seven field policies (§4); D2 provenance approach; D3 whether missing-column handling is in X1;
D4 unknown allocation together with the dead-stock layout; D5 future excess definition (E1 vs 90-day); D6 missing-month meaning; D7 zero
cost meaning.

## 2. Evidence reviewed and limitations

**Inspected in this task (read-only):** `js/import/canonical.js` (whole file); `js/import/adapter.js` (header contract, lines 108–136,
225–245, searches); `js/import/engine-map.js`, `engine-workbook.js`, `mapping.js`, `validate.js`, `result-gate.js` (targeted searches);
`js/calculations.js` (lines 55–73, 111, 150–151 and stack frames 176–182); `M1-DESIGN.md` (lines 58–66 and searches);
`IMPORT-V1-STAGE2-RECORD.md`, `IMPORT-V1-DIFFERENCE-REGISTER.md`, `KNOWN-LIMITATIONS.md`, `OUTSTANDING-DECISIONS.md` (searches);
`tests/tools/import-v1/reverse-eight-sheet.js` (header); the 19 Nov reconciliation and its raw evidence (hash-verified, 0 mismatches);
`STAGE3-CHANGE-REGISTER.md` (verified as the frozen version plus the 19 Nov pointer). **New probes** (read-only, throwaway copies):
`stage3-design/x1-evidence-claude-20261120/` (P1 crash source, P2 missing columns on the import route, P3 value conditions on both routes,
P4 Units_Sold month semantics), with hashes.

**Limitations [U].** (1) `js/forecasting.js` and `js/app.js` were not re-read in this task; forecasting is characterised from outputs (P4) and
the dead-stock view from Round 2. (2) The **required/optional field matrix** M1 Clarification 2 asked Stage 2 to produce was **not found** in
any repository document searched; this package supplies it for these seven fields only. (3) No repository document describes the **CIS** or the
**defensible forecasting programme**; compatibility with them rests on the brief's description and the roadmap note that the Forecaster is
planned for v0.8. (4) Reviewer reports exist only as session text (19 Nov reconciliation). (5) **`stage3-design/evidence/`** (10 files,
created 20 Nov 00:29–00:30 UTC) was found at the start of this task, was not created in this conversation, and by the owner's instruction was
neither modified nor used. (6) The local remote-tracking ref `origin/development/v0.7` is stale (`46636ed`, an ancestor of HEAD); GitHub itself
reports `eddf09b`, as recorded. This is not a change.

## 3. Field grouping

| Field | Source contract (CDv1) [E] | Needed by | Group |
|---|---|---|---|
| `On_Hand_Qty` | required; negative kept and flagged | stock, value, availability, excess, MRP | **A** |
| `Allocated_Qty` | optional; blank = null, never 0; negative = invalid | availability, excess, dead stock, MRP | **A** for calculation; **B** at source (column and cell may be absent) |
| `Unit_Cost_GBP` (Inventory) | optional; invalid → blanked and flagged | every money figure | **A** for money only (conditional) |
| `Units_Sold` | required *when demand is supplied* (demand table optional) | forecasting, classification, excess, replenishment, material usage | **A** (conditional on demand being supplied) |
| `BOM.Qty_Per_Finished_Unit` | required *when a BOM is supplied* (BOM optional) | material requirements, MRP explosion, feasibility | **A** (conditional on a BOM) |
| `On_Order_Qty` | optional; blank = null; negative invalid | stock position, open supply, PO reconciliation | **B** |
| `Reorder_Point_Qty` | optional; blank = null; negative invalid | reorder comparison, reorder-gap display | **B** |

**Allocated_Qty, both groups [E].** The brief asks which source formats legitimately treat a blank allocation as zero. **None do today.**
CDv1 states "a missing value is never replaced by 0". The adapter sums only non-null allocations and *refuses the import* (STOCK_FIELD_PARTLY_BLANK) when an item's allocation is
blank at some locations and filled at others ("the sum would invent the missing figures"). Mapping constants are refused (A12). The direct
template has no documented blank rule, and the engine warns "Missing values in Allocated_Qty". **[P]** Treat a blank allocation as
**unknown** on both routes. A future source may *declare* "blank allocation = 0", for example an ERP export where blank genuinely means none,
through a mapping-profile declaration recorded in provenance (D2). That needs the A12 mapping-profile stage and is not part of X1.

## 4. Field policies (one per field; D1 approves or amends)

Common rules **[P]**: whitespace-only = blank; any non-finite number (NaN, ±Infinity) = invalid; text = invalid unless the separately pending
text-number policy (Option C / X1, still REVIEW) converts it; the policy here applies to what remains invalid. **Missing column ≠ blank cell**
(§5). "Withheld" means the figure is not shown as a number; the reason, the affected record and the remediation are shown instead.

**4.1 On_Hand_Qty: required per stock record.** *Today [E]:* direct blank/invalid → NaN headline (78 non-finite values); import → row rejected,
**whole import refused**; negative → High "Negative quantities" (direct) or NEGATIVE_KEPT (import); 0 and large values accepted.
*Policy [P]:* blank, whitespace, invalid or non-finite **quarantines the item** on both routes (not the dataset). Its stock quantity, value,
availability, excess, reorder comparison and MRP are withheld with reason "On-hand missing/invalid (sheet/row)". Dataset totals become partial
totals naming the item (RG3 partial-total form, already approved for the import route). Every other item, and supplier and demand analysis,
continue. *Why per item, not per dataset:* every dependent figure is item-scoped, and the import route's existing `blocked.all` mechanism
(K7/F1) already excludes one item while keeping the run. *Why not a silent 0:* 0 on hand would create false shortages and false zero value.
Negative: valid, kept, High warning (B6 Option D unchanged). Zero and large: valid. **Changes accepted behaviour:** the import route moves
from "import refused" to "item quarantined"; the Stage 1 tests asserting refusal would be amended by an identified, justified change, not
silently.

**4.2 Allocated_Qty: optional at source, required for availability.** *Today [E]:* direct blank/invalid → available stock NaN, excess
headline NaN (60 non-finite values); an item with no demand is still listed as dead stock with £0 excess (v3.1); import blank → excess value withheld by the gate,
run continues; negative → direct High and *used*, import row rejected and import refused; absent column → **crash on both routes**.
*Policy [P]:* blank or absent = **allocation unknown** (no source declares blank = 0, §3). Physical stock and value continue. Available
stock, excess quantity and value, shortage/position and the item's MRP net requirement are **unavailable — allocation unknown**; never £0
confirmed. Invalid or non-finite: the same, with a High warning naming the cell. Negative: **invalid** on both routes (aligning the direct
route to CDv1); the item is not refused, only its availability-dependent results. Zero: valid, recorded zero ("nothing allocated").
Dead-stock listing and display of unknown allocation: **per D4**; the field policy only guarantees that no excess is confirmed.
*Conditional on D4:* (a) "keep visible with warning": listed, excess shown as "not calculated (allocation unknown)", excluded from excess
totals, which become partial; (b) "unknown": listed under "cannot assess" with no excess; (c) hybrid, as in §12.

**4.3 On_Order_Qty: optional.** *Today [E]:* direct blank → 6 non-finite item values plus the reconciliation warning; import blank → run continues
and figures stay finite; absent column → direct 1,400 non-finite values, import fine; negative → direct High and used, import row rejected.
*Policy [P]:* blank or absent = **on-order not supplied** (no source declares zero). Stock position, cover-with-supply and open-supply netting for
that item are computed **excluding on-order** and labelled "on-order not supplied". This is a conservative figure (it can only understate
supply), so it is shown with its label rather than withheld. Where purchase orders exist and the on-order setting uses PO-derived supply,
the PO figure is used with its provenance. Invalid/non-finite: same as blank plus a High warning. Negative: invalid. Zero: valid. Never
reject a dataset for this field.

**4.4 Reorder_Point_Qty: optional.** *Today [E]:* direct blank → 9 non-finite item values plus a Medium warning; import blank → run continues;
negative → **direct has no negative check** (only "Reorder point below safety stock"), import row rejected. *Policy [P]:* blank or absent = **not
configured**. The reorder-point comparison and gap show "No reorder point configured". The engine's *recommended* reorder point (calculated from
demand and lead time) continues. Invalid/non-finite: not configured plus a High warning. Negative: invalid. Zero: valid ("reorder at zero"),
shown as configured. No dataset rejection.

**4.5 Unit_Cost_GBP (Inventory): optional at source, required for money.** *Today [E]:* direct blank/invalid → stock value and excess value
NaN (495 non-finite values); import → the gate withholds **all** money totals; zero → value 0, direct gives only Medium "differs from master",
**import silent "complete"**; negative → direct High and used, import blanked and money withheld. *Policy [P]:* blank, invalid, non-finite or
negative **withholds that item's money results** (value, excess value, shortage value). Quantity results continue. Money aggregates are
published as **partial totals** with cost coverage: covered items over total, known-value total, withheld item count, reason and remediation.
Never as complete. This replaces the import route's all-or-nothing money withholding with item-level withholding plus a partial total, which
is more useful and still never presents an incomplete total as complete (identified change to accepted gate behaviour). No substitution from
`Standard_Cost_GBP`: that would be an undocumented fallback. Zero: **per D7**. Large: valid.

**4.6 Units_Sold: required where demand is supplied.** *Today [E] (P4, FG001):* a **missing month row** is treated as missing on both routes:
history shrinks, credibility records `missing`, confidence falls to Low. A **recorded zero** is a zero on both routes (credibility `zeros`,
class Slow-moving). A **blank cell** differs: direct → forecast NaN, excess 81 as if there were no demand, credibility says `missing 0`,
confidence stays Medium; import → row rejected, history marked incomplete, the same as a missing month. A gap mid-history is closed up (11
contiguous values: [E] `calculations.js:111` builds history from present rows only), so position-sensitive methods do not see it. Genuine
zero months raise Medium "Zero/negative demand months" on the direct route. *Policy [P], conditional on D6:* a blank cell is treated
**exactly like a missing month row**, whatever D6 decides, so the two can never disagree. If D6 = **unknown**: excluded from history, counted
in credibility as missing, confidence lowered, forecast from known months; dependent excess and replenishment labelled "based on incomplete
history". The history is passed as a **period-indexed series with explicit gaps** for the planned forecasting programme; X1 itself only
guarantees no NaN, correct counting and labelling, and does not change model choice. If D6 = **zero**: blank cells and absent months become 0
**with provenance "assumed zero (owner rule)"**, counted separately from recorded zeros, and confidence carries the assumption. Invalid or
non-finite: treated as missing plus a High warning. Negative: invalid (CDv1). Returns are not sales. Zero: valid, recorded zero; the warning
for genuine zeros changes from Medium "Zero/negative demand months" to an informational "zero-sales months" note, with negatives reported
separately as invalid (identified wording and severity change).

**4.7 BOM.Qty_Per_Finished_Unit: required where a BOM is supplied.** *Today [E]:* direct blank/invalid/≤0 → High "BOM quantity per finished unit
is zero, negative or not a number", 1 non-finite value; import blank/invalid/negative → row rejected, **whole import refused**; import zero →
accepted "complete" (CDv1 allows 0). *Policy [P]:* blank, invalid, non-finite, negative or zero **invalidates that BOM line**. Material
requirements from that line, the parent's MRP explosion and the feasibility of that parent's orders are withheld. Feasibility uses the existing
"Insufficient information" status. Shared materials are never reserved for such orders (owner decision of 15 Nov). Other products, inventory,
supplier and demand analysis continue. Zero is treated as invalid because a component consuming nothing is not a meaningful BOM line **[A]**;
the owner may amend this in D1 (for example to allow phantom lines). UoM: the quantity is in the component's unit, never converted. The
fractional-"each" Low warning and the import route's unit-mismatch block stay unchanged.

## 5. Missing-column policy (distinct from blank cells)

**How the engine tells them apart [E/P].** Direct route: the sheet's header row (`sheetHeaders`) shows whether a column exists. The engine
already emits "Column X contains no values" for a present-but-empty column, but nothing for an absent one. Import route: the mapping says which
fields were supplied, and the Engine View omits columns that were not (reported as `omitted`). **[P]** The shared layer records, per field, one
of: *column absent*, *column present and all cells blank*, *some cells blank*, *cells invalid*.

| Field | Status | Column absent | Present, all blank | Some blank | Invalid text | Blocked or withheld | Unrelated continues | User sees | Audit |
|---|---|---|---|---|---|---|---|---|---|
| On_Hand_Qty | required | direct: **stop with a clear message** (no item can be valued); import: Stage 1 REQUIRED_UNMAPPED (unchanged) | same as absent | items quarantined (§4.1) | as blank, plus High | everything stock-based | supplier performance and demand analysis only, if the owner wants a partial run; **[P]** stop, because nearly every output needs stock | "Inventory has no On_Hand_Qty column" + fix | sheet, header row |
| Allocated_Qty | optional at source | allocation unknown for **all** items; **no crash** | same | per item unknown | per item unknown + High | availability, excess, dead-stock assessment | yes | "Allocation not supplied: available stock and excess cannot be calculated" | column absent, source |
| On_Order_Qty | optional | on-order not supplied for all; positions labelled | same | per item | + High | open-supply netting labelled | yes | "On-order not supplied" | as above |
| Reorder_Point_Qty | optional | not configured for all | same | per item | + High | reorder comparison | yes | "No reorder points supplied" | as above |
| Unit_Cost_GBP | optional at source | all money withheld (import already does) | same | per-item withholding + partial totals | + High | money | yes | coverage 0 of N; quantities valid | as above |
| Units_Sold | required if the demand sheet is supplied | demand sheet unusable → treated as **demand not supplied**: forecasting, demand classification, excess, replenishment withheld | same | per month per D6 | missing + High | demand-dependent | inventory, valuation, supplier, BOM | "Demand history has no Units_Sold column" | sheet/table |
| Qty_Per_Finished_Unit | required if a BOM is supplied | BOM unusable → material requirements and feasibility withheld | same | per line | + High | BOM-dependent | yes | "BOM has no quantity column" | as above |

**Route note [P]:** the import route today *refuses* a mapped demand or BOM table whose required quantity is unmapped (REQUIRED_UNMAPPED).
For consistency the proposal treats that table as "not supplied, with a MUST message" and continues. This is an identified change to Stage 1
behaviour, included only if D3 includes missing-column handling.

## 6. Route provenance and shared validation contract

**Contract (NV1) [P].** For each of the seven fields the contract defines: business status; blank meaning (unknown / not configured /
assumed-zero-by-declaration only); sign rule; zero rule; the invalid states; dependent calculations; withholding; message templates. Both
routes produce the same **field-state record** per value: `{ field, item/line, state, value, rawValue, source: { route, file|sheet, row,
column, location }, rule, ruleVersion }`.

**Where each route applies it [P].** *Direct:* after `rows()` reads the sheets and before `analyse()` uses any of the seven fields. *Import:*
Stage 1 keeps cleaning and its CDv1 checks; the adapter converts canonical nulls and Stage 1 issues into the same field-state records, carrying
`__sources`. **Route-specific interpretation stays explicit:** the import route's location summing (B1/B6), negative-location clamping and
scrap assumptions are recorded as derived states (`derived: B6 Option D`) rather than removed.

**One gate for both routes [P].** The dependency registry (§8) turns field states into a gate specification. The import route already applies
one (RG); the direct route would build one too and use the same `result-gate.js`. Equivalent input then produces the same withheld, labelled
and partial results whichever route it came in by.

## 7. Calculation dependency matrix

States: *valid* (finite, rule-conforming), *zero* (recorded zero), *unknown* (blank or absent), *invalid*. "Item" = only that item is affected.

| Field | Dependent calculation | Required input state | Failure behaviour [P] | Unrelated continues? |
|---|---|---|---|---|
| On_Hand | stock quantity, valuation | valid (negative allowed) | item quarantined; partial totals | yes |
| On_Hand | available stock, excess qty/value, dead stock | valid | withheld (item) | yes |
| On_Hand | reorder comparison, replenishment, MRP netting, feasibility | valid | withheld (item); dependent orders "Insufficient information" | yes |
| Allocated | available stock, position, shortage | valid or zero | unavailable: allocation unknown (item) | yes |
| Allocated | excess quantity and value | valid or zero | not calculated; never £0 confirmed; total partial | yes |
| Allocated | dead-stock classification | valid or zero | per D4 | yes |
| Allocated | MRP net requirement | valid or zero | withheld for that item | yes |
| On_Order | position, cover with supply, MRP open supply | valid or zero; unknown → "excluding on-order" | labelled conservative figure | yes |
| On_Order | PO reconciliation | valid or zero | "not supplied", no reconciliation | yes |
| Reorder_Point | reorder comparison and gap | valid or zero | "not configured" | yes (recommended ROP continues) |
| Unit_Cost | valuation, excess value, shortage value, money aggregates | valid (zero per D7) | item money withheld; aggregates partial with coverage | yes (all quantity results) |
| Units_Sold | forecasting, backtesting | per D6 | known months only (unknown) or assumed zeros (zero); no NaN | yes |
| Units_Sold | forecast confidence | per D6 | missing/assumed months lower confidence | yes |
| Units_Sold | demand classification, excess, replenishment | per D6 | labelled "incomplete history" | yes |
| Units_Sold | material usage via BOM | per D6 | inherits the parent's history state | yes |
| Qty_Per | material requirements, MRP explosion | valid and > 0 | that line withheld | yes |
| Qty_Per | production feasibility | valid and > 0 | parent's orders "Insufficient information"; no reservation | yes |

**Calculated, Validated, Verified [P].** Each output carries an integrity status: **Calculated** (computed); **Validated** (computed only from
inputs in valid or recorded-zero states, with no assumption or label); **Verified** (independently recomputed and matched: reserved for the
future CIS; X1 never sets it). A labelled or partial figure is at most *Calculated*. This needs no CIS to exist; it only reserves the slot.

## 8. Modular architecture

New folder `js/validation/` (plain scripts, no build step, no dependency, the same pattern as `js/import/`), one namespace `CGValidation`:

| Module | Responsibility | Relationship to current files |
|---|---|---|
| `contract.js` | NV1 field definitions (§6), versioned | data only; the single source of the rules |
| `classify.js` | value → state (blank, whitespace, invalid, non-finite, negative, zero); text-number rule as a pluggable policy left at current behaviour until Option C is decided | no engine globals |
| `route-direct.js` | reads sheet headers and rows into field-state records | called before `analyse()` |
| `route-import.js` | converts Stage 1 nulls and issues and the adapter's `__sources` into field-state records | called by `adapter.js` |
| `dependencies.js` | calculation → required states; builds the gate specification | feeds `result-gate.js` on both routes |
| `report.js` | central messages, severity, counts, coverage, remediation, provenance | replaces scattered message strings for these fields only |

`calculations.js` changes are limited to consulting availability where a value would otherwise become NaN, and guarding the MRP date format
(the crash). No new top-level globals inside it. **Risk [E]:** `check-globals` (116) and `test-a1-sync-path` (74) count globals. A new
`CGValidation` namespace will change their accepted counts, which needs explicit authorisation as a protection-register amendment.

## 9. X1 design matrix

Abbreviations: Q = quarantine item; W = withhold the dependent figure; Pt = partial total; H/M/I = High/Medium/Info warning.

| Field | Business meaning | Status | Blank | Missing column | Invalid non-blank | Zero | Negative | Direct today | Import today | Dependent calcs | Failure / withholding | User warning | Audit / provenance | Tests | Owner decision |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| On_Hand | physical units held [E] | required [E] | Q item [P] | stop, clear message [P] | Q + H [P] | valid [E] | valid, H "Negative quantities" [E] | NaN headline [E] | import refused [E] | §7 | Q, Pt [P] | "On-hand missing for N items" [P] | sheet/row or file/row/location [P] | §11 T1, Test B | D1 |
| Allocated | units committed to orders [E] | optional at source; required for availability [E] | unknown, never 0 [P] | unknown for all; no crash [P] | unknown + H [P] | valid [E] | invalid [P] (import already) | NaN; listed with £0 excess [E] | money withheld; absent column **crashes** [E] | §7 | W availability and excess [P] | "Allocation unknown: excess not calculated" [P] | as above | T2, Test A | D1, D4 |
| On_Order | open supply [E] | optional [E] | not supplied [P] | not supplied for all [P] | not supplied + H [P] | valid [E] | invalid [P] | 6 non-finite [E] | runs [E] | §7 | labelled conservative figure [P] | "On-order not supplied" [P] | as above | T3 | D1 |
| Reorder_Point | configured trigger [E] | optional [E] | not configured [P] | not configured for all [P] | not configured + H [P] | valid [P] | invalid [P] | 9 non-finite; no negative check [E] | runs; negative rejected [E] | §7 | comparison "not configured" [P] | "No reorder point configured" [P] | as above | T4 | D1 |
| Unit_Cost | GBP cost per unit [E] | optional at source; required for money [E] | item money W [P] | all money W [P] | item money W + H [P] | **D7** [O] | item money W [P] | NaN money [E] | all money W [E]; zero silent [E] | §7 | W + Pt with coverage [P] | "Cost coverage N of M" [P] | as above | T5 | D1, D7 |
| Units_Sold | units shipped in the month [E] (Demand_Basis "shipments") | required if demand supplied [E] | as a missing month [P]; meaning **D6** [O] | demand not supplied [P] | missing + H [P] | recorded zero [E]; I note [P] | invalid [P] | blank → NaN forecast, excess altered [E] | blank → row rejected, incomplete [E] | §7 | labelled incomplete; no NaN [P] | "History incomplete for N items" [P] | month, sheet/row [P] | T6 | D1, D6 |
| Qty_Per | component units per parent unit [E] | required if BOM supplied [E] | line invalid [P] | BOM unusable [P] | line invalid + H [P] | invalid [A] | invalid [P] | High warning; 1 non-finite [E] | import refused (zero accepted) [E] | §7 | line W; orders "Insufficient information" [P] | "BOM line unusable" [P] | parent/component, row [P] | T7 | D1 |

## 10. User-facing reporting

**[P]** One "Data reliability" panel, in plain words, per affected field:

- **What happened:** for example "Allocation missing for [n] items (Inventory sheet rows [r1], [r2] …)" (illustrative).
- **What it affects:** "available stock and excess cannot be calculated for these items".
- **What still works:** "stock value and all other items are complete".
- **How to fix:** "add Allocated_Qty, or enter 0 where nothing is allocated".
- **Coverage:** "Cost coverage: [covered] of [total] items ([%]); value shown is a partial total of £[known-value total]; [n] items withheld" (illustrative wording only; no figure here is a result).

Severity:

- **High:** a figure is withheld or invalid input was found.
- **Medium:** a figure is shown with a limitation (excluding on-order, incomplete history).
- **Info:** a recorded zero or a not-configured value.

Every figure that is not *Validated* carries a marker:

- "partial", "excluding on-order" or "incomplete history" for a labelled figure;
- "withheld" with a reason instead of a number;
- "zero" only for a recorded zero, never for unknown.

**Zero vs unknown and incomplete vs invalid** are shown as different words, never the same symbol. The route and source are shown on demand
("from stock.csv row 22, location W1 (import)" / "Inventory sheet row 14 (direct upload)"). Calculated, Validated and Verified appear as
distinct labels; nothing is called "verified" until the CIS exists.

## 11. Test specification (risk-based; not executed)

**Per field T1–T7**, each on **both routes** wherever the route can carry the input:

- blank; whitespace; absent column; present-but-empty column; invalid text;
- NaN; +Infinity; −Infinity;
- zero; negative; a large value (10¹²);
- one bad record among valid ones (partial absence) and all records bad (total absence).

**Expected outcomes for every case:** the outcome in §4 and §5; no non-finite value in any released output; the withheld or labelled set;
the warning text and severity; and provenance naming the record. Each case also asserts that unrelated items' results are unchanged against
the same input without the fault.

**Regression:** golden v0.5 and v0.6.0 and confidence v0.7 reproduce exactly in five zones (Northstar has none of these faults [E]); the full
tier keeps 45 passing plus the designed guard FAIL; any changed accepted assertion is listed with its original and revised results.

**Cross-field scenarios (expected outcome):**

1. *Missing cost, valid quantities:* every quantity result available; that item's money withheld; totals partial with coverage; no "complete".
2. *Missing allocation, valid physical and usable:* physical stock and value available; available stock, excess and position unavailable for
   that item; excess total partial; listing per D4; no £0 excess.
3. *Missing demand months, otherwise valid history:* forecast from known months (or assumed zeros, per D6); credibility counts the months;
   confidence lowered; excess labelled; a blank cell gives the same result as an absent row.
4. *Missing BOM quantity, valid production demand:* that line withheld; the parent's orders "Insufficient information"; no reservation of
   shared materials; other parents and all inventory results unchanged.
5. *Missing reorder point, valid on-hand and on-order:* position and cover available; reorder comparison "not configured"; recommended reorder
   point still shown.

**Consistency check.** One conflict was found and resolved. The current dead-stock rule (v3.1) counts an unknown allocation as 0 to keep the
item listed, while §4.2 forbids treating blank as 0. **Resolution [P]:** the 0 is used *only* to decide visibility, never as a value. Excess is
"not calculated", so no confirmed £0 can result. How the item is shown is D4. No other conflict was found.

**Fixed Test A: blank allocation.** Asserts every criterion of the brief §10:

- blank detected, with its state and provenance;
- the source-specific rule applied: today, unknown on both routes, because no source declares blank = 0;
- available stock not shown as known;
- excess quantity and value "not calculated" and never £0 confirmed;
- a warning naming the cell;
- visibility per the approved D4 choice;
- direct and import routes equivalent;
- traceable to the record and its source.

**Fixed Test B: negative physical stock.**

- High "Negative quantities" present for that record, and not replaced by a lower severity;
- classification per the approved dead-stock policy: listed while uncommitted stock remains;
- traceable to the record.

## 12. Owner decision register (exactly seven)

**D1 — Field-level policies.** Approve or amend §4.1–4.7 and §9. Allocated, Units_Sold and Unit_Cost apply conditionally on D4, D6 and D7.
Points most worth your attention: item quarantine instead of import refusal (4.1, 4.7); a zero BOM quantity treated as invalid (4.7, a
business assumption); on-order shown as a labelled conservative figure rather than withheld (4.3); item-level money withholding with partial
totals (4.5).

**D2 — Route provenance.**

- (a) **[P] recommended:** a shared field-state record with source and route on both routes, kept in the validation report, not in the
  workbook. Full traceability; modest effort; supports future source declarations such as "blank allocation = 0".
- (b) Route stamp only: cheaper, but a user cannot see *which* record caused a withheld figure.
- (c) Full cell-level lineage for every field: maximum audit, significantly more effort, beyond X1's need.

**D3 — Missing-column handling in X1?**

- (i) **Include it:** fixes the crash, the absent-column cases without a warning, and the Stage 1 refusal of a mapped table with an unmapped
  quantity. More code paths and an identified Stage 1 change; regression risk is moderate, covered by T1–T7.
- (ii) **[P] recommended:** include *crash containment and clear messages* (no stop for optional fields; clear stop for On_Hand) and defer
  the Stage 1 table-level change. This removes the crash that a contract-valid import file causes today, with low regression risk.
- (iii) **Defer entirely:** lowest change now, but a valid import without Allocated_Qty keeps crashing, and direct uploads keep producing
  thousands of silent NaN values.

**D4 — Unknown allocation and dead-stock presentation.** Choose a treatment *and* a layout (Round 2 mock-ups A four columns, B composition bar,
C summary cards):

- (a) **Keep visible with a warning** (the engineer's position): stock never disappears; risk of being read as excess.
- (b) **"Unknown" group** (the reviewer's position): clearest that nothing is calculated; stock is moved out of the main list.
- (c) **Hybrid:** listed in place with a distinct "allocation unknown — excess not calculated" status, excluded from excess totals.

Every layout must distinguish confirmed-zero excess, positive excess, negative or unavailable stock, unknown allocation, incomplete
calculation and invalid input. Consequences: (a) is the lowest effort; (b) suits layout C; (c) suits A and B.

**D5 — Excess definition (future, not changed here).** The existing rule is unallocated usable stock minus 90 days of history; it is simple,
but ignores on-order, safety stock and forecast. E1 (unallocated usable + on-order − forecast − safety stock) catches over-ordering and ties
to MRP, but depends on more fields whose unknown states (§4.3, §4.6) then matter more, and on forecast credibility. Decide whether E1 replaces
the 90-day rule in a later approved change.

**D6 — Missing month for Units_Sold.**

- **Unknown:** this is what both routes already do for an absent row [E]. Honest, lowers confidence, needs the forecast to tolerate gaps.
- **Zero:** keeps continuity, but invents demand of zero, which inflates excess and lowers forecasts if the month was simply not exported.

Either way, a blank cell follows the same rule as an absent row (§4.6).

**D7 — Zero unit cost.**

- **Valid:** counts as costed; value £0 is genuine; totals complete. Risk: unpriced items hide in "complete" totals.
- **Suspicious:** included, but flagged Medium, listed in coverage as "zero cost" and not counted as covered. Totals are shown "including N
  zero-cost items".
- **Source-dependent:** valid only where the source declares it (free issue, consigned stock), otherwise suspicious. Needs D2's declarations.

Today the import route treats zero as valid and silent [E].

## 13. Implementation sequencing, risks and assumptions

**Sequence (recommended, not executed):**

1. Agree field semantics and contracts (D1, D6, D7).
2. Agree provenance (D2) and missing-column scope (D3).
3. Fix dependencies and withholding (§7).
4. Approve the user treatment (D4, §10).
5. Implement in small reversible modules.
6. Add tests.
7. Independent review.
8. Reconcile against the baselines.
9. Update the registers.
10. Explicit owner acceptance before Tag-6.

**Groups (lowest regression risk first):**

- **G0** shared layer, provenance and crash containment (no figure changes except crash → message);
- **G1** valuation-critical: On_Hand and Unit_Cost (partial totals);
- **G2** availability: Allocated (after D4), On_Order, Reorder_Point;
- **G3** Units_Sold (after D6);
- **G4** BOM quantity;
- **G5** remaining missing-column policy (D3);
- **G6** reporting and UI (after D4).

All seven fields stay in scope.

**Isolation (for the authorised phase):**

- a separate physical copy of the repository at a recorded path, verified against the Baseline B inventory and its hashes before work starts;
- the frozen Round 2 tree untouched;
- a diff against Baseline B before applying anything;
- small reversible changes;
- afterwards, A, B, Tag-5 and the frozen tree re-verified;
- every changed file listed with its reason;
- no commit, push, merge or Tag-6 without separate approval.

New tests need additions to `tests/checksums.txt` and `tests/accepted-results.json`, authorised as part of the scope. Existing protected
entries are never silently rewritten. Changed accepted assertions (Stage 1 refusals in 4.1 and 4.7, the zero-demand wording in 4.6, the
global counts in §8) are listed separately with their justification.

**Risks [E/U]:**

- the gate becomes shared by both routes, so the direct route's outputs change shape where figures are withheld (UI must handle withheld
  values);
- forecasting gaps (4.6) touch the v0.8 Forecaster's design;
- global-count tests change;
- golden fixtures are expected unchanged, but a fixture with zero-sales months would change its warning text: verify at implementation.

**Assumptions [A]:**

- a zero BOM quantity is not a meaningful line;
- on-order understating is acceptable as a labelled conservative figure;
- per-item quarantine is preferred to import refusal.

All three are in D1.

## 14. What was not changed

No application, calculation, import, normalisation, test or test-runner file; no baseline, snapshot, checksum, accepted result or tag; no
commit, push or merge; no REVIEW item adopted (X1, XCRT, Option C, dead-stock interface, excess definition remain REVIEW); no Tag-6. Created
in the repository working tree: this document and `stage3-design/x1-evidence-claude-20261120/` only. The pre-existing
`stage3-design/evidence/` was left untouched.
