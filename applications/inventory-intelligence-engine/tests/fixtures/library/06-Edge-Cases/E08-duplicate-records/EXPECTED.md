# E08-duplicate-records

All businesses, people, products and figures in this package are fictional and synthetic. No real company data was used.

**Situation:** Exact duplicate stock row, exact duplicate PO line, duplicate item row, and a conflicting demand row (same month, different units).

## Expected behaviour (hand-specified)

- Stock: one copy kept → A1 on hand 60 (not 120)
- PO: one copy kept → 5 lines, not 6
- Item: one kept, flagged
- Demand: conflicting duplicate (A1, same month, Units 30 and 99) → the demand import STOPS; no row is chosen automatically (never first or last). The Stage 2 test must assert the stop. Resolving a conflict in canonical input is deferred to M1b
- Import report counts: 3 exact duplicates removed, 1 conflicting duplicate stopping the demand import

## Reference calculator output on the raw input

`expected-results.json` is `refcalc.py` run on `input/` **as supplied**. For cases with duplicates or blank warehouses (E08, E09) the raw figures double-count or include the blank row on purpose: the hand-specified expectations above are what the importer must produce after cleaning.

## Clarification for E08 (added by hand in M1 pre-tag Commit 2, 12 Nov 2026; not produced by the generator)

For the demand table there is no result "after cleaning": the import stops on the conflicting row, so the expected outcome for demand is the stop itself, with the conflict reported. The other expectations above (stock, PO, item, import report counts) still apply. This follows interpretation (a), approved by the owner on 12 Nov 2026: in canonical input a conflicting duplicate stops the affected import; the mechanism for resolving it is deferred to M1b. Regenerating the library with `build.py` does not reproduce this section, so a regenerated copy of this file differs from the repository by this section only.
