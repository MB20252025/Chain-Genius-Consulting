# E02-no-purchase-history

All businesses, people, products and figures in this package are fictional and synthetic. No real company data was used.

**Situation:** No purchase-order lines at all.

## Expected behaviour (hand-specified)

- Purchasing and supplier-performance analysis reported as "not available: no purchase orders"
- Lead time still available from item/supplier (14 days)
- Supplier S1: no score ("Not assessed"), never 0% or 100%

## Reference calculator output on the raw input

`expected-results.json` is `refcalc.py` run on `input/` **as supplied**. For cases with duplicates or blank warehouses (E08, E09) the raw figures double-count or include the blank row on purpose: the hand-specified expectations above are what the importer must produce after cleaning.
