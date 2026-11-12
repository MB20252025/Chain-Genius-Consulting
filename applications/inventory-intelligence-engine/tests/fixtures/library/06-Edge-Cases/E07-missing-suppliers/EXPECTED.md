# E07-missing-suppliers

All businesses, people, products and figures in this package are fictional and synthetic. No real company data was used.

**Situation:** Two lines reference supplier S9, which is not in suppliers.csv.

## Expected behaviour (hand-specified)

- S9 added as "Unlisted supplier S9" placeholder; lines kept
- S9 not scored (2 lines is below the minimum evidence) → "Not assessed"; no name, lead time or risk invented
- S1 unaffected

## Reference calculator output on the raw input

`expected-results.json` is `refcalc.py` run on `input/` **as supplied**. For cases with duplicates or blank warehouses (E08, E09) the raw figures double-count or include the blank row on purpose: the hand-specified expectations above are what the importer must produce after cleaning.
