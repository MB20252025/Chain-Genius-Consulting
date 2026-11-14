# Universal Data Import v1 — Difference register (Stage 2)

**Status: evidence record. Every entry is PENDING the owner's review. Nothing here is accepted, resolved or approved.**

What it records: every way in which the engine's results for a workbook uploaded directly differ from its results for the same
data entered through Universal Import (reversed to canonical CSV files → Stage 1 → adapter → engine).

How it is checked: `tests/test-same-results.js` (Proof A) runs all 17 eight-sheet fixture workbooks both ways in 5 time zones,
in one JavaScript context. For each workbook it checks that:
- the differences appear exactly in the sections listed below, and nowhere else;
- each entry's cause, when removed from the direct workbook, makes the difference disappear (where that can be done in a test).

The four workbooks Stage 1 refuses (`combined`, `multiline`, `posupconflict`, `splitline`) produce no import-route result, so they
are not entries: they are checked to stay refused.

DR-1 to DR-5 were first recorded in the Stage 2 Solution Design Report (section G) and copied into `IMPORT-V1-STAGE2-RECORD.md`.
DR-6 and DR-7 were found during K5.

| Entry | Workbooks | Sections that differ | Cause | Evidence (Proof A) | Status |
| --- | --- | --- | --- | --- | --- |
| DR-1 | all 13 accepted | `result.demo`, `result.declared`, `result.notes` | Notes sheets (`START HERE`, `QA NOTES`, `Read me`) are not part of the canonical model. | The import route has no notes text; no other section depends on it. | Pending review |
| DR-2 | all 13 accepted | raw production rows only | `Production_Line_ID` is not carried. The engine never reads it by name; it is only inspected generically (K1 engine map). | The key is left out of the comparison; nothing else differs. Not separately proven by removing the column. | Pending review |
| DR-3 | `dupexact` | 14 sections: `mrp`, `feas`, `clientQuestions`, `confidence`, and `result.` `recon`, `sched`, `po`, `dq`, `rm`, `sup`, `supRisk`, `top`, `alt`, `altS` | Stage 1 removes 3 exact duplicate PO rows (A6). The direct route counts them twice. | Removing the same 3 rows from the direct workbook leaves no difference. Confidence v0.7 differs in `confidence` and `clientQuestions` for this workbook. | Pending review |
| DR-4 | `willow` | `result.dq`, `clientQuestions`, `result.alt`, `result.altS` | Empty-text cells become missing values in Stage 1. The direct route reads them as text and reports 19 short-received POs and "Inconsistent PO dates"; the import route reports 11 and no date warning. | Direct route has "19 POs received short", import route "11 POs received short". Confidence v0.7 differs in `clientQuestions` for this workbook. | Pending review |
| DR-5 | `willow` | `result.dq` (and its copies in `alt`, `altS`) | The unmapped empty `Notes` column is not carried, so the engine's "Column Notes contains no values" warning disappears. **Explanation (K1/K2 finding):** the engine inspects every column supplied to it, reads 42 column names by name, and some of its warnings depend on columns it does not otherwise use. Any column the Engine View does not write can therefore change warnings. | With empty-text cells removed and the `Notes` column removed from the direct workbook, DR-4 and DR-5 disappear; only DR-7 remains. | Pending review |
| DR-6 | all 13 accepted | item records (`result.fg`, `result.rm`, and copies) | Import-route items carry the new key `ua` (usable on-hand, B6 Option D). Direct uploads without the `Usable_On_Hand_Qty` column never have it. No fixture has negative location stock, so `ua` equals on-hand everywhere and available stock is unchanged. | Every import-route item has `ua === oh`; no direct item has `ua`. | Pending review |
| DR-7 | `willow` | order of `result.dq` (and `alt.dq`, `altS.dq`) | The engine lists some warnings in the order of the sheet's columns. Willow's columns are in reverse order; the Engine View writes the standard order, so "Missing values in Received_Qty" and "Missing values in Received_Date" swap places. Same warnings, different order. | After DR-4/DR-5 are removed, only these three sections differ, and sorting the warnings removes the difference. | Pending review |

## Not a direct-vs-import difference, recorded for the owner

- **E04 expectation and B6 Option D.** `tests/fixtures/library/06-Edge-Cases/E04-negative-stock/EXPECTED.md` (hand-specified,
  written for B6 Option A) gives stock value £1,100 (the −15 row excluded). Under B6 Option D, physical on-hand is 45 and value
  is 45 × £10 + 100 × £5 = £950; available stock (60) agrees. The fixture was not changed. E04 cannot run through the adapter at
  present in any case: its items are bought and sold (B14 undecided) and its demand file has no `Demand_Basis` label.
- **Package 01 has no `Demand_Basis` label.** The adapter refuses it as supplied (`DEMAND_BASIS_NOT_LABELLED`, M1 D14). Proof B
  adds `Demand_Basis = shipments` in memory as a documented test assumption.
