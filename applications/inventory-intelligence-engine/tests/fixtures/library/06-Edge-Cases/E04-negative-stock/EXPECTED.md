# E04-negative-stock

All businesses, people, products and figures in this package are fictional and synthetic. No real company data was used.

**Situation:** A1 has −15 at W2 and 60 at W1.

## Expected behaviour (hand-specified)

- Row kept as entered; flagged High "negative stock"
- A1 available = 60 (the −15 counts as 0, not as −15 → not 45)
- Stock value: A1 60 × £10 + A2 100 × £5 = £1,100.00 (negative row excluded)

## Reference calculator output on the raw input

`expected-results.json` is `refcalc.py` run on `input/` **as supplied**. For cases with duplicates or blank warehouses (E08, E09) the raw figures double-count or include the blank row on purpose: the hand-specified expectations above are what the importer must produce after cleaning.
