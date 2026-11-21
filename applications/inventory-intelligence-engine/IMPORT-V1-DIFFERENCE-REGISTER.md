# Universal Data Import v1 — Difference register (Stage 2)

**Status: evidence record. All seven entries were reviewed in K6 (14 Nov 2026): each description was checked against the evidence and the
implemented code, DR-1 and DR-4 were corrected and DR-2's evidence was replaced with a K6 check, with the owner's approval of the wording;
the owner accepted all seven. Accepting an entry records that the difference is understood and explained; it does not fix the
direct-upload behaviour behind DR-3 or DR-4.**

> **Correction (15 Nov 2026, owner ratification):** Original wording overstated: the seven entries were verified by Claude under the K6 instruction, and the owner's acceptance was delegated, not personal. Ratified by owner on 15 November 2026.
>
> This applies to the status above ("the owner accepted all seven") and to each entry's status "Reviewed and accepted by owner, 14 Nov 2026" below. The owner's words: "I confirm the K6 delegated acceptance of the difference register stands as mine, based on Claude's verification of the seven entries."

What it records: every way in which the engine's results for a workbook uploaded directly differ from its results for the same
data entered through Universal Import (reversed to canonical CSV files → Stage 1 → adapter → engine).

How it is checked: `tests/test-same-results.js` (Proof A) runs all 17 eight-sheet fixture workbooks both ways in 5 time zones,
in one JavaScript context. For each workbook it checks that:
- the differences appear exactly in the sections listed below, and nowhere else;
- each entry's cause, when removed from the direct workbook, makes the difference disappear (where that can be done in a test).

The four workbooks Stage 1 refuses (`combined`, `multiline`, `posupconflict`, `splitline`) produce no import-route result, so they
are not entries: they are checked to stay refused.

DR-1 to DR-5 were first recorded in the Stage 2 Solution Design Report (section G) and copied into `IMPORT-V1-STAGE2-RECORD.md`.
DR-6 and DR-7 were found during K5. K6 (14 Nov 2026) re-verified every entry with separate checks (scratch scripts, not
committed; the committed checks are in `tests/test-same-results.js`).

| Entry | Workbooks | Sections that differ | Cause | Evidence (Proof A) | Status |
| --- | --- | --- | --- | --- | --- |
| DR-1 | all 13 accepted | `result.demo`, `result.declared`, `result.notes` | Sheets outside the engine's eight data sheets are not part of the canonical model, so their text is not carried. In the 12 accepted fixture workbooks other than Willow these are `START HERE`, `QA NOTES` and `DATA DICTIONARY`; in Willow they are `Read me` and `Pivot (old)`. | On Northstar, deleting those sheets from the direct workbook removes the difference (K6). No other section depends on them. | Reviewed and accepted by owner, 14 Nov 2026. |
| DR-2 | all 13 accepted | raw production rows only | `Production_Line_ID` is not carried. The engine never reads it by name; it is only inspected generically (K1 engine map). | Removing the 151 `Production_Line_ID` cells from the direct Northstar workbook removes the difference (K6). All 13 accepted workbooks carry the column. | Reviewed and accepted by owner, 14 Nov 2026. |
| DR-3 | `dupexact` | 14 sections: `mrp`, `feas`, `clientQuestions`, `confidence`, and `result.` `recon`, `sched`, `po`, `dq`, `rm`, `sup`, `supRisk`, `top`, `alt`, `altS` | Stage 1 removes 3 exact duplicate PO rows (A6). The direct route counts them twice. | Removing the same 3 rows from the direct workbook leaves no difference. Confidence v0.7 differs in `confidence` and `clientQuestions` for this workbook. | Reviewed and accepted by owner, 14 Nov 2026. |
| DR-4 | `willow` | `result.dq`, `clientQuestions`, `result.alt`, `result.altS`. Confidence v0.7 differs in `clientQuestions` only. | In Willow, 8 purchase orders (7 Open, 1 Cancelled) have empty-text cells in `Received_Qty` and `Received_Date`. The direct-upload route reads these as text: it counts the 8 orders as received short (19 POs received short, against Universal Import's 11) and raises a High "Inconsistent PO dates" warning. Universal Import (Stage 1) reads the empty text as missing, so it reports 11 short receipts and no date warning. **The direct-upload route has a known bug in handling empty-text cells. Universal Import treats empty text as missing and reads correctly. This is an improvement. The direct-upload bug is separate and remains unfixed at the engine level.** | Cell inspection (K6): the 8 orders are wf-po-1000, 1013 (Cancelled), 1022, 1024, 1036, 1050, 1054 and 1064; 19 − 11 = 8. With empty-text cells read as missing and the `Notes` column removed from the direct workbook, DR-4 and DR-5 disappear; only DR-7 remains. | Reviewed and accepted by owner, 14 Nov 2026. |
| DR-5 | `willow` | `result.dq` (and its copies in `alt`, `altS`) | The unmapped empty `Notes` column is not carried, so the engine's "Column Notes contains no values" warning disappears. **Explanation (K1/K2 finding):** the engine inspects every column supplied to it, reads 42 column names by name, and some of its warnings depend on columns it does not otherwise use. Any column the Engine View does not write can therefore change warnings. | With empty-text cells removed and the `Notes` column removed from the direct workbook, DR-4 and DR-5 disappear; only DR-7 remains. | Reviewed and accepted by owner, 14 Nov 2026. |
| DR-6 | all 13 accepted | item records (`result.fg`, `result.rm`, and copies) | Import-route items carry the new key `ua` (usable on-hand, B6 Option D). Direct uploads without the `Usable_On_Hand_Qty` column never have it. No fixture has negative location stock, so `ua` equals on-hand everywhere and available stock is unchanged. | Every import-route item has `ua === oh`; no direct item has `ua`. | Reviewed and accepted by owner, 14 Nov 2026. |
| DR-7 | `willow` | order of `result.dq` (and `alt.dq`, `altS.dq`) | The engine lists some warnings in the order of the sheet's columns. Willow's columns are in reverse order; the Engine View writes the standard order, so "Missing values in Received_Qty" and "Missing values in Received_Date" swap places. Same warnings, different order. | After DR-4/DR-5 are removed, only these three sections differ, and sorting the warnings removes the difference. K6: in each of `result`, `alt` and `altS` the same 10 warnings appear (identical in every field); only positions 0 and 1 swap; every other section is identical. | Reviewed and accepted by owner, 14 Nov 2026. |

## Not a direct-vs-import difference, recorded for the owner (decisions taken in K6: see `IMPORT-V1-STAGE2-RECORD.md`)

- **E04 expectation and B6 Option D.** `tests/fixtures/library/06-Edge-Cases/E04-negative-stock/EXPECTED.md` (hand-specified,
  written for B6 Option A) gives stock value £1,100 (the −15 row excluded). Under B6 Option D, physical on-hand is 45 and value
  is 45 × £10 + 100 × £5 = £950; available stock (60) agrees. The fixture was not changed. E04 cannot run through the adapter at
  present in any case: its items are bought and sold (B14 undecided) and its demand file has no `Demand_Basis` label.
- **Package 01 has no `Demand_Basis` label.** The adapter refuses it as supplied (`DEMAND_BASIS_NOT_LABELLED`, M1 D14). Proof B
  adds `Demand_Basis = shipments` in memory as a documented test assumption.

## Stage 3 resolution notes (dated; the entries above are kept as written)

- **DR-4 resolved (16 Nov 2026, Stage 3, technically verified; not yet owner-accepted).** The direct-upload reader
  (`js/excel-import.js`, `rows()`) now reads a cell that holds null or text that is empty after trimming spaces as an empty cell,
  as Universal Import Stage 1 does (`clean.js`: blank → missing, never 0). Numbers, 0 and any other text are unchanged.
  - Willow: 8 fewer purchase orders now trigger the "received short" warning on the direct-upload route; **both routes now produce
    11**, and neither raises "Inconsistent PO dates". This records route agreement only: whether the 11 are correctly classified
    against the PO source data has not been separately reconciled (follow-up, not a DR-4 gate).
  - Client-facing: Willow's client question on short receipts (Q3) now cites 11 POs on the direct-upload route (previously 19).
    If the earlier figure was shared, the corrected figure should be communicated.
  - `tests/test-same-results.js` now asserts route equality for Willow (both 11, no "Inconsistent PO dates"), so it fails again if
    the routes diverge; with the pre-DR-4 reader it fails with "direct 19, import 11". Regression test: `tests/test-empty-text.js`.
  - Observation: Willow's Inventory sheet also has 36 empty-text cells, its whole `Notes` column. They now read as empty cells; the
    "Column Notes contains no values" warning remains because the header remains.
  - Not addressed by DR-4: numbers stored as text in numeric fields (for example "0" or "0.02") stay as text, subject to the
    owner's scrap-text decision.
- **DR-5 unchanged.** The unmapped empty `Notes` column is still not carried by Universal Import; its warning remains direct-only.
  With DR-4 resolved, Willow's remaining route differences are DR-5's and DR-7's (`result.alt`, `result.altS`, `result.dq`).
- **DR-3 resolved (16 Nov 2026, Stage 3, owner decision D3, option 1; technically verified, not yet formally accepted).** DR-3 was
  an artefact of the comparison tool, not of either route. The engine's Purchase Orders sheet has no line number; the test-only
  tool `tests/tools/import-v1/reverse-eight-sheet.js` gave every PO row an invented `Line_No "1"`, so Stage 1 (A6) treated the three
  identical-looking pairs in `edge/scenario-dupexact.xlsx` as proven copies and removed them. The tool no longer invents a line
  number. Now **both routes keep all 303 rows**: Stage 1 reports `DUP_EXACT_KEPT` ("Please check", rows 2 & 302, 3 & 303, 4 & 304:
  "they can be genuine separate records"), both engines warn "Duplicate records" (High) for PO0001, PO0002 and PO0003, and the two
  routes give identical results. No identical-looking record is merged or deleted.
  - Identifier types, kept distinct: `PO_ID` is a source identifier; `Line_No "1"` was tool-generated and is gone; a genuine
    duplicate cannot be told apart from two genuine lines without a source line identifier, so both are kept and flagged.
  - Potential impact of keeping them (if the pairs are in fact copies), measured on `dupexact`: RM022's on-order position 100 instead
    of 50; PO outstanding in the reconciliation 350 instead of 300; on-time delivery 63.2% instead of 61.1% for SUP015 and 45.5%
    instead of 42.9% for SUP008. Inventory on hand is not affected; on-order, available-plus-on-order cover and supplier performance
    are. The High warning is the user's prompt to check.
  - The same invented identifier made Stage 1 refuse four workbooks with genuinely multi-line orders (`combined`, `multiline`,
    `posupconflict`, `splitline`) as key conflicts. They are now imported, and each gives results identical to its direct upload.
    The note above that they "produce no import-route result" is historical.

## Stage 3 completion note (18 Nov 2026; recorded by Claude; the entries above are kept as written)

- **F-XR1 (open, owner decision).** Numbers stored as text: the import route cleans "120", "£5", "1,200" and "(25)" into numbers
  (Stage 1 D8) and rejects true junk ("abc", "TBC", NaN, Infinity) as invalid; the direct route converts none of them. Since Stage 3
  C-NUM the direct route reports every such cell with a High warning (previously silent) but still runs. The two routes therefore still
  differ for text-stored numbers. Options (none implemented): convert on the direct route with the Stage 1 grammar, or refuse
  (experiment X1, `STAGE3-CHANGE-REGISTER.md`). Both change accepted direct-route results.
