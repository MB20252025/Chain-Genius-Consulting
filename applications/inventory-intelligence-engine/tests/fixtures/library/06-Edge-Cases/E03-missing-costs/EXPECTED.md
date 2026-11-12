# E03-missing-costs

All businesses, people, products and figures in this package are fictional and synthetic. No real company data was used.

**Situation:** A2 has no cost anywhere.

## Expected behaviour (hand-specified)

- A2 kept; flagged "cost missing"
- Stock value = A1 only: 60 × £10 = £600.00; A2 listed as excluded from value
- Any £ finding states that 1 item is excluded

## Reference calculator output on the raw input

`expected-results.json` is `refcalc.py` run on `input/` **as supplied**. For cases with duplicates or blank warehouses (E08, E09) the raw figures double-count or include the blank row on purpose: the hand-specified expectations above are what the importer must produce after cleaning.
