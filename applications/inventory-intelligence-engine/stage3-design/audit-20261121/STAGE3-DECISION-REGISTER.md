# Stage 3 decision register (21 Nov 2026)

Prepared by Claude for the owner. **Nothing here is decided.** Each entry says what the software does now (commit
`dc16902`, the Tag-6 candidate), where that came from, the options, and Claude's recommendation in plain English.
"Owner decision" means only the owner can settle it. Probe workbooks and outputs: `audit-20261121/evidence/`.

How to read the options: a *rule* decides how items are classified or valued; changing it changes what a client sees.

---

## 1. Dead-stock rule (C-STK / R2-STK) — OWNER DECISION

- **Now:** an item is listed as "No recorded demand", "Potentially obsolete", "Slow-moving" or "Excess" only while it
  holds *uncommitted* stock: the larger of physical and usable on-hand, minus allocated. Probe (FG050, no demand,
  10 on hand): allocated 0 → "No recorded demand", excess £749.60; allocated 10 → **"Active"**, excess £0.
- **Origin:** Tag-5 (accepted Stage 2) listed any item with physical on-hand > 0. Stage 3 Round 1 added the usable
  basis (C-STK); Round 2 subtracted allocations (R2-STK). Not accepted.
- **Root cause of the difference:** Stage 2 had no notion of usable or allocated stock in this rule.
- **Options:** A keep Tag-5 (physical > 0); B usable-or-physical basis, allocations ignored (Round 1); **C uncommitted
  basis (now)**; D C, but show fully allocated no-demand items in a separate "allocated, no demand" note.
- **Recommendation: D** (C plus a note). Allocated stock is promised to someone, so calling it dead is misleading (C is
  right), but an item with no demand and stock that is fully allocated is unusual and worth a line, not silence.
- **Calculation impact:** classification and listing only; excess value already netted allocations in Tag-5.
- **Presentation:** dead-stock list and counts change. **Data:** needs Allocated_Qty; see item 5 when it is blank.
- **Entanglement:** X1 code calls the same `stockB()` function, so reverting to A or B needs a targeted rework of X1
  lines in `calculations.js` (not a file revert).
- **Tests:** `stage3-quality` C-STK checks and `stage3-round2` R2-STK checks assert option C; they change with the decision.
- **Risk of deferring:** none for safety; the candidate keeps an unaccepted rule.

## 2. Dead-stock view (R2-VIEW) — OWNER DECISION

- **Now:** the dead-stock table shows Physical, Allocated, Usable and Unallocated usable side by side, with a note.
- **Origin:** Round 2; three mock-ups (A four columns, now; B stock-composition bar; C summary cards plus one
  "uncommitted" column) on the design canvas. Tag-5 showed one "Qty" column (physical).
- **Recommendation: C** for clients (one number to act on, detail on demand), A kept for the export. Presentation only.
- **Open sub-point:** negative physical stock shows a negative value (F-STK2): recommend showing it as a data-quality
  flag, not a negative £ figure.
- **Tests:** `stage3-round2` R2-VIEW renders the HTML; `browser-chrome` passes. No physical Android check yet.

## 3. Definition of excess stock (R2.6) — OWNER DECISION

- **Now (E0, unchanged since Tag-5):** excess = unallocated usable − 90 days × average daily units sold (12 months);
  no demand → all unallocated usable. Ignores on-order stock, safety stock, forecast and held stock.
- **Options:** E0 keep; **E1** unallocated usable + on order − (forecast over horizon + safety stock), floor 0, with E0
  as fallback when the forecast is not credible; E2 above reorder point + order quantity; E3 ageing tiers.
- **Recommendation: keep E0 for Tag-6 and plan E1 as its own work item (FW-EXCESS).** E1 is better (it catches
  over-ordering) but it changes money figures shown to clients and needs its own tests and review; it should not ride
  in with Tag-6.
- **Calculation impact (E1):** excess £ changes for many items. **Risk of deferring:** E0 overstates excess when demand
  is rising and understates it when big orders are inbound; this is already a known limitation.

## 4. Differences between the direct and import routes (F-XR1, R2.4) — OWNER DECISION

- **Now:** the import route cleans "120", "1,200", "(25)" and "£5" (money fields only) into numbers (accepted Stage 1
  D8). The direct route converts none of them: since X1 each such cell is **Not Assessed** with a reason, and C-NUM
  warns. So the same workbook can give different results by route.
- **Options:** A clean everywhere; B clean nowhere (reverses accepted Stage 1); **C apply the Stage 1 grammar on the
  direct route too** ("£" only in `_GBP` columns), with one Medium warning listing every converted cell.
- **Recommendation: C**, as a separate change after Tag-6, with its own regression. It aligns the routes without
  touching the accepted import route.
- **Calculation impact:** direct-route results for workbooks with text numbers change from Not Assessed to assessed.

## 5. R2-ALLOC (blank or unreadable Allocated_Qty) — OWNER DECISION

- **Now (probe):** FG050 with Allocated blank or "abc": the item is **Not Assessed** (X1), available stock is withheld,
  but the dead-stock class is still "No recorded demand" (blank counted as 0 for listing). The two signals disagree.
- **Options:** A keep (listed, beside the warning); **B class "Not Assessed" when Allocated is unknown**; C treat blank
  as 0 everywhere (contradicts X1).
- **Recommendation: B.** It matches X1's rule that unknown is never zero, and removes the contradiction.
- **Impact:** classification only, for rows with unknown allocations. **Tests:** two new probe cases.

## 6. R2-ASSUME (physical above usable, allocation between them, e.g. 10 / 4 / 6) — OWNER DECISION

- **Now:** listed (uncommitted = max(10, 4) − 6 = 4), although unallocated *usable* stock is negative (4 − 6).
- **Options:** A keep (max basis); B use usable only when a usable column is supplied; C flag as a data-quality issue.
- **Recommendation: B + C**, decided together with item 1. Low frequency; affects listing only.

## 7. Four new data-quality warnings (F-A1 to F-A4) — OWNER CONFIRMATION

| ID | Warning | Severity |
|---|---|---|
| F-A1 | Negative planned or completed production quantity | High |
| F-A2 | Completed above planned (over-production or keying error) | Medium |
| F-A3 | Negative lead time (Materials or Suppliers) | High |
| F-A4 | BOM quantity message no longer mentions scrap | wording |

- **Now:** all four present; detection only (no calculation changes). Willow fixture gains the F-A2 warning.
- **Recommendation: accept all four.** They report real data errors and change no figures.

## 8. D1–D4 (owner decisions of 16 Nov, implemented, not formally accepted) — OWNER ACCEPTANCE

D1 permitted golden-snapshot differences (20 listed, golden files unchanged); D2 scrap rules on both routes;
D3 duplicate PO rows kept, comparison no longer invents a line number; D4 partial totals with coverage.
**Recommendation: accept**: they implement decisions the owner already made, and their tests pass in today's run.

## 9. "Allocated exceeds usable on-hand" wording (D5) — OWNER ACCEPTANCE

Fixes the false Stage 2 warning (same check, correct basis named). **Recommendation: accept.** Wording only.

## 10. Invalid-number warning (C-NUM) — OWNER ACCEPTANCE

High warning naming each column and row with text, NaN or ±Infinity in a numeric engine column. Since X1 the values
themselves are contained (Not Assessed), so the warning is now the explanation, not the only protection.
**Recommendation: accept** as detection. Low item F-NUM2 (import-route row numbers refer to the Engine View) stays recorded.

## 11. Empty-text handling (DR-4) — OWNER ACCEPTANCE

Null and empty-after-trim text read as missing (`excel-import.js`). Changes one confidence value on the willow fixture
("19 POs received short" → "11"), recorded in the registry and checked by the confidence snapshot.
**Recommendation: accept.**

## 12. Test-registry amendments — OWNER APPROVAL (by moving the approved tag)

The Tag-5 guard lists every item: run-all.sh changed; confidence reference replaced twice (each time exactly one value,
documented); 9 approved checksum lines re-hashed; 28 new protected lines; raised counts (check-protection 434→452,
check-globals 116→124, test-a1-static 29→30, same-results 356→416, import-integrity 386→396, test-a1-sync-path 74→76)
and 15 new tests (Stage 3: 8; X1: 7). Proposed separately (branch `proposal/paging-count-20261121`, not in the candidate):
give `test-paging-chrome` an accepted count of 59 and make the runner refuse a test with no accepted count.
**Recommendation: approve**, once items 1–11 are settled, by creating Tag-6 on the final candidate.

---

## Owner decisions in one list

1. Dead-stock rule: A / B / C / **D**.
2. Dead-stock view: A / B / **C**; negative physical shown as a flag (yes / no).
3. Excess stock: **keep E0 now, E1 later as FW-EXCESS** / adopt E1 now.
4. Route differences: **C after Tag-6** / C now / leave.
5. R2-ALLOC: A / **B** / C.
6. R2-ASSUME: A / **B+C**.
7. F-A1 to F-A4: **accept** / reject (each).
8. D1–D4, D5 wording, C-NUM, DR-4: **accept** / reject (each).
9. Registry amendments and paging proposal: **approve via Tag-6** / not yet.
