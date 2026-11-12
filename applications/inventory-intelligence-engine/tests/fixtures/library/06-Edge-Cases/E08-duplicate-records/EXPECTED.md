# E08-duplicate-records

All businesses, people, products and figures in this package are fictional and synthetic. No real company data was used.

**Situation:** Exact duplicate stock row, exact duplicate PO line, duplicate item row, and a conflicting demand row (same month, different units).

## Expected behaviour (hand-specified)

- Stock: one copy kept → A1 on hand 60 (not 120)
- PO: one copy kept → 5 lines, not 6
- Item: one kept, flagged
- Demand: conflicting duplicate (A1, same month, Units 30 and 99) → the demand import STOPS; no row is chosen automatically (never first or last). The Stage 2 test must assert the stop. Resolving a conflict in canonical input is deferred to M1b
- Import report counts: 3 exact duplicates removed, 1 conflicting duplicate stopping the demand import

## Reference calculator output on the raw input

`expected-results.json` is `refcalc.py` run on `input/` **as supplied**. For cases with duplicates or blank warehouses (E08, E09) the raw figures double-count or include the blank row on purpose: the hand-specified expectations above are what the importer must produce after cleaning.
