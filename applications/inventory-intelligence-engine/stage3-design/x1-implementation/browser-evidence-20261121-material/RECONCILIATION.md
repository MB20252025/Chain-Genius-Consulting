# Reconciliation: blank Material_ID line added under FG002 (Northstar), 21 Nov 2026

Expected values computed by the independent model in tests/test-x1-material-integrity.js (raw sheets only; no production function).

| Material | Valid BOM lines (parent × qty × (1+scrap)) | Independent known part, mean of last 12 months | Engine known part (mPart) | Engine usage (m) | Status | Materials screen "Est use/mo" | Export AssessmentReason (end) |
|---|---|---|---|---|---|---|---|
| RM001 | FG001 × 1.94 × (1+0.02); FG038 × 3.16 × (1+0.03) | 386.3822 | 386.3822 | null (unknown) | Not Assessed | at least 386 (incomplete: not used in any calculation) | …parent FG002) (known part of usage: at least 386.4/mo, incomplete, not used in any calculation) |
| RM002 | FG032 × 4.13 × (1+0.02); FG045 × 2.48 × (1+0) | 515.6275 | 515.6275 | null (unknown) | Not Assessed | at least 516 (incomplete: not used in any calculation) | …parent FG002) (known part of usage: at least 515.6/mo, incomplete, not used in any calculation) |
| RM020 | FG004 × 3.7 × (1+0); FG041 × 1.57 × (1+0.01) | 1030.4475 | 1030.4475 | null (unknown) | Not Assessed | at least 1,030 (incomplete: not used in any calculation) | …rent FG002) (known part of usage: at least 1,030.4/mo, incomplete, not used in any calculation) |
| RM050 | FG006 × 4.09 × (1+0.03); FG019 × 1.86 × (1+0) | 1007.5303 | 1007.5303 | null (unknown) | Not Assessed | at least 1,008 (incomplete: not used in any calculation) | …rent FG002) (known part of usage: at least 1,007.5/mo, incomplete, not used in any calculation) |
| RM100 | FG031 × 3.92 × (1+0.02); FG044 × 2.86 × (1+0.01) | 851.3396 | 851.3396 | null (unknown) | Not Assessed | at least 851 (incomplete: not used in any calculation) | …parent FG002) (known part of usage: at least 851.3/mo, incomplete, not used in any calculation) |

All 100 materials: engine known part = independent known part for 100 of 100; usage (m) unknown for 100 of 100; assessed 0 of 100.
Feasibility (50 illustrative orders): clean {"Feasible":16,"Material shortage":33,"At risk":1} → with the blank line {"Feasible":5,"Material shortage":32,"Insufficient information":13}.
Products: 50 of 50 identical to clean data.

## RM001 month-by-month (independent)

| Month | FG001 units sold | FG038 units sold | Known usage |
|---|---|---|---|
| 2025-11 | 77 | 56 | 334.6364 |
| 2025-12 | 81 | 58 | 349.0612 |
| 2026-01 | 100 | 77 | 448.4996 |
| 2026-02 | 92 | 80 | 442.4336 |
| 2026-03 | 95 | 77 | 438.6056 |
| 2026-04 | 103 | 68 | 425.1428 |
| 2026-05 | 92 | 76 | 429.4144 |
| 2026-06 | 74 | 54 | 322.1904 |
| 2026-07 | 99 | 53 | 368.4056 |
| 2026-08 | 76 | 61 | 348.9316 |
| 2026-09 | 88 | 52 | 343.3840 |
| 2026-10 | 70 | 76 | 385.8808 |

**Correction, 21 Nov 2026 (15:55 sanity check):** the first version of this table labelled the months April to October 2026 one month early.
It showed 2026-03 twice and no 2026-10. Only the labels were wrong: the figures and their order were right.
- Cause: the script that wrote this file labelled each month with its UTC date. In the raw workbook read, a month that starts during British
  Summer Time is midnight local time, which is 23:00 UTC on the previous day (1 April = 31 March 23:00 UTC).
- Not an engine defect: the engine converts every date to its calendar day when it loads the sheet (`calDate` in `excel-import.js`), and uses
  12 distinct months, 1 Nov 2025 to 1 Oct 2026. RM001's last month in the engine is 385.8808, the same as the last row here.
- Not a test defect: the independent model groups rows by the exact cell value, so each month is still one distinct group (12 groups, every
  parent row of a month has the same value). Its 12-month mean, 386.3822, equals the engine's.
- The labels above are now the workbook's own month dates (as shown in the cell, e.g. "2026-10-01"). The figures are unchanged.
  The original text is kept outside the repository at `/home/claude/x1-t6-backup/RECONCILIATION.before-label-fix.md`.
