# E11-inactive-products

All businesses, people, products and figures in this package are fictional and synthetic. No real company data was used.

**Situation:** A2 is marked inactive but still has 100 in stock.

## Expected behaviour (hand-specified)

- A2 excluded from risk, excess and actions
- A2 still counted in stock value (£500.00) and listed as "inactive with stock" so the cash is visible
- Total stock value = £1,100.00

## Reference calculator output on the raw input

`expected-results.json` is `refcalc.py` run on `input/` **as supplied**. For cases with duplicates or blank warehouses (E08, E09) the raw figures double-count or include the blank row on purpose: the hand-specified expectations above are what the importer must produce after cleaning.
