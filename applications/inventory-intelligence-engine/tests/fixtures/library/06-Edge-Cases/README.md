# 06 — Edge Cases

All businesses, people, products and figures in this package are fictional and synthetic. No real company data was used.

Small, separate datasets (two items, one supplier) that each isolate one condition. Base case: A1 sells 30/month, A2 60/month; A1 60 in stock at £10, A2 100 at £5; supplier S1, 14-day lead time.

| Case | Situation |
| --- | --- |
| E01-no-demand-history | A2 is a sold item with no demand rows at all. |
| E02-no-purchase-history | No purchase-order lines at all. |
| E03-missing-costs | A2 has no cost anywhere. |
| E04-negative-stock | A1 has −15 at W2 and 60 at W1. |
| E05-partial-receipts | P1 part-received and not yet due; P2 fully received on time; P3 over-received. |
| E06-overdue-open-pos | Four lines received on time, one line 12 days overdue and unreceived. |
| E07-missing-suppliers | Two lines reference supplier S9, which is not in suppliers.csv. |
| E08-duplicate-records | Exact duplicate stock row, exact duplicate PO line, duplicate item row, and a conflicting demand row (same month, different units). |
| E09-multiple-warehouses | A1: 60 at W1, 40 at W2, 25 in quality hold (excluded). A2: 100 at W1 plus 7 on a row with no warehouse. |
| E10-zero-demand | A2 has 12 months of demand rows, all zero, and 100 in stock. |
| E11-inactive-products | A2 is marked inactive but still has 100 in stock. |

Each folder: `input/` (canonical CSVs), `EXPECTED.md` (hand-specified expected behaviour) and `expected-results.json` (reference calculator on the raw input).
