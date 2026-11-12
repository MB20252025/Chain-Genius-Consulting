# E09-multiple-warehouses

All businesses, people, products and figures in this package are fictional and synthetic. No real company data was used.

**Situation:** A1: 60 at W1, 40 at W2, 25 in quality hold (excluded). A2: 100 at W1 plus 7 on a row with no warehouse.

## Expected behaviour (hand-specified)

- A1 business-wide available = 100 (W1 60 + W2 40); QC 25 shown in detail but excluded
- A2 row with blank warehouse: flagged "missing warehouse"; proposed default: assign to a single "UNASSIGNED" location, included, so A2 = 107 (needs approval — see Deliverable 4)
- Reconciliation: included rows sum = 60 + 40 + 100 + 7 = 207 = Engine View total

## Reference calculator output on the raw input

`expected-results.json` is `refcalc.py` run on `input/` **as supplied**. For cases with duplicates or blank warehouses (E08, E09) the raw figures double-count or include the blank row on purpose: the hand-specified expectations above are what the importer must produce after cleaning.
