# Tag-6 candidate r4: implementation record (22 Nov 2026)

Branch `candidate/tag6-20261122-r4`; parent `b1d2db9` (r3), itself on `43b6b55`. Scope: the owner's instruction of
22 Nov 2026, 04:17. Tag-6 has not been created; nothing is deployed or published. Verification evidence is on branch
`verification/tag6-r4-20261122`.

| Commit | Change | Calculation changed? | Could it alter an owner-checked figure? |
|---|---|---|---|
| `1cf81bb` | records: owner-completed human checks; A3 Tag-6 decision | no | no (documentation) |
| `2b820c7` | defect A: export writes unknown values as empty cells on every ENG_ sheet | no | **no**: export formatting of already-calculated values; finite values unchanged |
| `e9ee139` | defect B: demand chart by calendar month, gaps for unknown months | no | **no**: chart drawing only; the forecast and every calculated field are unchanged. Northstar's forecast views are byte-identical to `b1d2db9` |
| `df17371` | tests: 7 regression checks (23 → 30), re-hash | no | no |
| `7d558be` | records: registry assessment (50 items), roadmap, CHANGELOG | no | no |
| this commit | this record | no | no |

**Staleness guard.** None of the five owner checks covers the export or the chart:
- FG001 and RM001 SS/ROP, total stock value, RM004 MRP and ABC are all fields of the engine result.
- The figures were also compared between `b1d2db9` and this candidate in the live application run (`verification-r4-20261122/human-check-figures.txt`).
- The owner's checks therefore remain valid and were not repeated.

**Not changed, as instructed:**
- A3: no usable-above-physical warning; B6 preserved.
- A1, A2, A4, A5 and A6/D6 behaviour; D1–D4; duplicate-PO handling; scrap validation; the partial-total safeguards; the UoM rule.
- The guard and Tag-5; all accepted baselines and evidence.
