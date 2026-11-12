# E08-duplicate-records

All businesses, people, products and figures in this package are fictional and synthetic. No real company data was used.

**Situation:** Exact duplicate stock row, exact duplicate PO line, duplicate item row, and a conflicting demand row (same month, different units).

## Expected behaviour (hand-specified)

- Stock: one copy kept → A1 on hand 60 (not 120)
- PO: one copy kept → 5 lines, not 6
- Item: one kept, flagged
- Demand: first row kept (30), conflicting row (99) flagged High
- Import report counts: 3 exact duplicates removed, 1 conflict flagged

## Reference calculator output on the raw input

`expected-results.json` is `refcalc.py` run on `input/` **as supplied**. For cases with duplicates or blank warehouses (E08, E09) the raw figures double-count or include the blank row on purpose: the hand-specified expectations above are what the importer must produce after cleaning.
