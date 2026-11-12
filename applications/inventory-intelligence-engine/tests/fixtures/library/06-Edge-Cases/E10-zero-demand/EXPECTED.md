# E10-zero-demand

All businesses, people, products and figures in this package are fictional and synthetic. No real company data was used.

**Situation:** A2 has 12 months of demand rows, all zero, and 100 in stock.

## Expected behaviour (hand-specified)

- A2 is dead stock: 100 × £5 = £500.00
- No cover or risk figure for A2 (no division by zero; not "infinite")
- Forecast for A2 = 0 with a "no recent demand" note, not an error

## Reference calculator output on the raw input

`expected-results.json` is `refcalc.py` run on `input/` **as supplied**. For cases with duplicates or blank warehouses (E08, E09) the raw figures double-count or include the blank row on purpose: the hand-specified expectations above are what the importer must produce after cleaning.
