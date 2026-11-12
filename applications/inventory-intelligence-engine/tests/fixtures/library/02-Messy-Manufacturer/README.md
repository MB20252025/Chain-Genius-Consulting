# 02 — Messy Manufacturer

All businesses, people, products and figures in this package are fictional and synthetic. No real company data was used.

**Business:** The same business as 01 (Harbour Valve Engineering Ltd, fictional), exported from a typical small-business system with realistic problems.

**Used to test:** M1 mapping screen, cleaning rules, duplicate/unmatched handling, import report and preview decisions.

M1 test-data library v1.0 (generated 12 Nov 2026, seed-deterministic)

## Files

| File | Contents |
| --- | --- |
| source-export/ItemMaster_export.csv | Products and materials in one file; own column names; £ and "TBC" in cost |
| source-export/StockByWarehouse.csv | Stock per warehouse; UK dates; thousands separators; duplicates; unknown codes; a TOTAL row |
| source-export/Sales_History.csv | Monthly sales; UK dates; one code with spaces/lower case; one conflicting duplicate |
| source-export/Supplier_List.csv | Suppliers (S99 is missing on purpose) |
| source-export/PO_Lines.csv | PO lines; UK dates; a duplicate; unit text; a US-format date |
| source-export/BOM.csv | BOM with scrap as "5%" text |
| source-export/Works_Orders.csv | Works orders; ISO dates |
| expected-canonical/*.csv | What the importer must produce after applying the expected actions (the comparison target) |
| DATA-ISSUES.md / .csv | 23 documented issues with expected actions |

Dates are ISO (YYYY-MM-DD) unless stated. Money is GBP. Snapshot date: 31 October 2026. Demand history: November 2024 to October 2026 (24 months).

Expected figures assume default import choices: UK dates for the UK-format files, "ignore dashes and spaces" OFF, conflicting duplicates keep the first row.

Expected results: `EXPECTED-RESULTS.md` (readable) and `expected-results.json` (for automated tests).