# Tag-6 candidate r3: implementation record (22 Nov 2026)

Branch `candidate/tag6-20261122-r3`; parent `43b6b55`. The scope is the owner's approval of 22 Nov 2026, 02:40
(`OWNER-DECISIONS-TAG6.md`). Recorded by Claude. Tag-6 has not been created; nothing is deployed.

| Item | Commit | Status |
|---|---|---|
| B5, E-13 docs (KNOWN-LIMITATIONS 16–20, decision record, §9 note) | `278d783` | implemented |
| E-1 X1 partial totals (dead-stock cards, reconciliation gap value) | `8b57a2b` | implemented |
| A2 unknown allocation → stock class "Not Assessed" | `bcede0a` | implemented |
| A1 "Stock fully allocated to orders but no recorded demand" warning | `f0ef368` | implemented |
| A3 "Usable on-hand exceeds physical on-hand" warning | `3f19fbe`, reverted by `83da66f` | **stopped** (below) |
| A3 remainder (availability on usable; dead stock on max(); quantities visible) | n/a (already the behaviour) + B1 | in place |
| B1 dead-stock view and export columns | `d3baf89` | implemented |
| B2 ABC note | `8618cf3` | implemented |
| E-9 and tests (`test-tag6-changes.js`, registry, checksums) | `12b1428`; updated after A3 was stopped | implemented |
| A4, A5, A6, B3, B4 | no code change (accepted as implemented) | n/a |
| R2, G1, E-6, E-7 | — | deferred, as approved |

## A3 warning stopped (unexpected result, reported to the owner)

- **Observed:** the full tier of `a8c0323` failed `import-adapter`, an accepted Stage 2 test, at 341 of 346. The check "the supplied column raises no new data-quality warning" failed in all 5 zones.
- **Cause:** the accepted Stage 2 decision **B6** (`IMPORT-V1-STAGE2-RECORD.md`, "Mandatory example") clamps negative stock at a location to 0 for usable stock. Physical is the sum including the negative location. For W1 60, W2 −15, physical is 45 and usable is 60, so usable legitimately exceeds physical, and the adapter already reports every such item ("treated as 0 for available stock. Please investigate."). The approved warning assumed usable can never exceed physical, which is false under B6.
- **Action:** the warning commit was reverted (`83da66f`), and `test-tag6-changes.js` now pins that no such warning is raised. No substitute rule was invented. For example, a direct-route-only warning would be a new business rule.
- **Decision left to the owner:** whether a usable > physical check is wanted at all and, if so, on which route and with what exception for B6 clamping.
