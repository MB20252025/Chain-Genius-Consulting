# E01-no-demand-history

All businesses, people, products and figures in this package are fictional and synthetic. No real company data was used.

**Situation:** A2 is a sold item with no demand rows at all.

## Expected behaviour (hand-specified)

- A2 listed under "sold items with no demand history"
- No forecast, cover or risk for A2 (not zero, not an error: "no history")
- A1 unaffected: 30/month → cover 60 / (360/365) ≈ 60.8 days

## Reference calculator output on the raw input

`expected-results.json` is `refcalc.py` run on `input/` **as supplied**. For cases with duplicates or blank warehouses (E08, E09) the raw figures double-count or include the blank row on purpose: the hand-specified expectations above are what the importer must produce after cleaning.
