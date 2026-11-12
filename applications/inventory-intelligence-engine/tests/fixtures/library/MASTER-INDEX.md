# M1 Test-Data Library — Master Index

All data is fictional and synthetic. No real company (including any employer) data was used. Generated with free tools only (Python standard library); the generator scripts are in `00-Generator-Scripts.zip`, so every file can be recreated exactly.

| Package | Business | Main purpose | M1 | M2 | M3 | M4 | M5 | M6 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 01-Clean-Manufacturer | Harbour Valve Engineering (make only, 3 locations) | Clean reference; Engine View must run on today's engine | Import, Engine View, reconciliation | Findings, £ rules, top 10 | Screens | Report, cause rules | Lead-time and demand scenarios | Investigator test cases |
| 02-Messy-Manufacturer | Same business, messy export | Mapping, cleaning, duplicates, unmatched, import report | **Primary** | — | Data screen | Data-confidence statement | — | Missing-information labelling |
| 03-Distributor | Pennine Fastener Supplies (buy only, quarantine location) | No BOM/production; Buy lead times | Distributor import | Supplier £ exposure | "Not applicable" screens | Distributor report | Supplier lead-time scenarios | — |
| 04-Mixed-Make-Buy | Calder Pump Systems (make + resale) | Per-item Make/Buy replenishment | Make/Buy detection | Correct risk for bought-in items | — | Cause rules across make/buy | Alternative-supplier scenario | Cross-area investigation |
| 05-Performance-Dataset | Ouse Valley Industrial Supply (5,000 SKUs) | Speed and scale | Import speed | Ranking at scale | Paging, Android | Report size | Scenario speed | Evidence size limits |
| 06-Edge-Cases | Two-item mini datasets | One condition each | Every rule | Missing-cost, negative-stock £ rules | Empty and N/A states | Wording of limitations | — | Fact vs missing information |

Regression baseline: Northstar (`tests/fixtures/northstar`) stays the protected baseline and is not part of this library.

## How the expected results were produced

`refcalc.py` reads only the CSVs in each package and applies the documented reference formulas. It does not use the generator's internal values, so it checks what is actually in the files. Edge cases also have hand-specified expectations. For 02, figures are calculated on `expected-canonical/`, the data as it should be after the importer applies every documented action.

## Check against today's engine (12 Nov 2026, commit 3e5a7b3, time zone UTC)

A throwaway prototype converted 01 and 04 into the Northstar eight-sheet layout and ran `CGEngine.runEngine()`. This is evidence about today's engine, not the M1 importer.

- **01 Clean Manufacturer:** runs without error. The engine rates S07 Kestrel Castings High risk (score 54). P0007, P0019 and P0031 have cover below lead time (2.5 vs 5.1, 3.0 vs 10.3, 4.5 vs 14.4 days). It also reports one High data-quality message: raw-material on-order in stock differs from PO outstanding by 2,030 units across 7 materials. Cause: today's engine treats a part-received PO line that has a receipt date as fully closed, so its undelivered balance is not counted as on order. See the M1 design, Deliverable 4.
- **04 Mixed Make/Buy:** runs, but bought-in products R0003 and R0006 get an assumed 7-day lead time ("Assumed (default setting)") and about 14 days of cover, so they are NOT flagged. Their purchase orders are reported as "unknown supplier/material", and R-items are reported as "Products with no BOM". This is the expected failure that the proposed Make/Buy change must fix.

## Transferring to your ChatGPT Library

Download each ZIP from this conversation to your phone (tap the file card, then Download). Then upload it in ChatGPT using its file-upload option. I have not checked how ChatGPT's Library currently works, so follow ChatGPT's own instructions for keeping files there. Files will not appear there automatically. Keep the ZIPs unchanged as masters; working copies go into the repository only when M1 is approved.
