# E05-partial-receipts

All businesses, people, products and figures in this package are fictional and synthetic. No real company data was used.

**Situation:** P1 part-received and not yet due; P2 fully received on time; P3 over-received.

## Expected behaviour (hand-specified)

- P1: partially received (not due), outstanding 60
- P2: fully received, on time
- P3: fully received, outstanding 0, over-receipt of 10 reported separately (never offsets another line)
- Total outstanding = 60

## Reference calculator output on the raw input

`expected-results.json` is `refcalc.py` run on `input/` **as supplied**. For cases with duplicates or blank warehouses (E08, E09) the raw figures double-count or include the blank row on purpose: the hand-specified expectations above are what the importer must produce after cleaning.
