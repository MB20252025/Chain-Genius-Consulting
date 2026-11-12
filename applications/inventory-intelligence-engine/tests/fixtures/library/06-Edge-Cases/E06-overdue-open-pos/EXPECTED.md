# E06-overdue-open-pos

All businesses, people, products and figures in this package are fictional and synthetic. No real company data was used.

**Situation:** Four lines received on time, one line 12 days overdue and unreceived.

## Expected behaviour (hand-specified)

- Q5 state: overdue open; outstanding 30; overdue value £300.00
- S1 OTD received-only = 100% (4/4); OTD including overdue = 80% (4/5)
- M2 rule: supplier performance must use the 80% figure

## Reference calculator output on the raw input

`expected-results.json` is `refcalc.py` run on `input/` **as supplied**. For cases with duplicates or blank warehouses (E08, E09) the raw figures double-count or include the blank row on purpose: the hand-specified expectations above are what the importer must produce after cleaning.
