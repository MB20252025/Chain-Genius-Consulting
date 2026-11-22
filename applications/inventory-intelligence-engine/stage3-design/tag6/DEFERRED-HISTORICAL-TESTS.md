# Deferred historical tests (recorded 22 Nov 2026, after Tag-6)

The owner's instruction of 22 Nov 2026 (06:18), "Complete Tag-6 Development Alignment", section 3, defers six tests from the immediate development sequence.

They stay in `tests/accepted-results.json` and keep running in every full tier. The runner reports them each time as BLOCKED or REDUCED.

They are **not passes**, and they have not been deleted or weakened.
- Five of the six files are unchanged between Tag-5 and Tag-6.
- `test-uom.js` gained the accepted U5 check (blank or whitespace UoM is missing). Its line is one of the 9 re-hashes in the accepted Tag-6 registry block. Its historical comparison part is unchanged, and its accepted count stays at 110.
- `PROTECTED-VERSIONS.txt` is unchanged.

They do **not** block Stage 3B, unless new evidence shows a material risk to the accepted engine baseline. Why the risk is low: the golden v0.5 and v0.6.0 snapshots and the v0.7 confidence snapshot (5 zones each) cover the same engine results, and pass at Tag-6.

Status source: the full tier at Tag-6 (`e65600c`), in CI run 44990351755 and in a local fresh clone, with identical results.

| # | Test (registry name) | File | Zones | Status at Tag-6 | Reason | Limitation |
|---|---|---|---|---|---|---|
| H1 | `test-fglt-note` (D5 #1) | `tests/test-fglt-note.js` | 2 | BLOCKED, no checks run | Needs the v0.6 Phase 2 source tree (`inventory-intelligence-engine-c4-phase2`, a historical zip) | No comparison of the finished-goods lead-time note with Phase 2 code |
| H2 | `test-forecast-conf` (D5 #2) | `tests/test-forecast-conf.js` | 2 | BLOCKED, no checks run | Needs the Phase 3 tree named in `p3tree.txt` (historical zip) | No comparison of forecast confidence with Phase 3. Partly compensated by the T3 confidence snapshot (as the runner notes) |
| H3 | `test-supplier-eligibility` (D5 #3) | `tests/test-supplier-eligibility.js` | 2 | BLOCKED, no checks run | Needs the same Phase 3 tree | No comparison of supplier eligibility with Phase 3 code |
| H4 | `phase2-comparison` (D5 #4) | `tests/run-regression.sh` (registry type `blocked-only`) | 1 | BLOCKED, no checks run | Needs the git tag `v0.6-candidate-4-phase2`, which is not on GitHub | No whole-engine regression against the Phase 2 candidate |
| H5 | `test-phase1` | `tests/test-phase1.js` | 2 | REDUCED: 57 of 125 checks run (68 not run); accepted count 57 | Item 1e (render comparison with candidate 3) needs `C3_TREE`, built from the tag `c4-base`, which is not on GitHub | The Phase 1 render comparison is not checked; the other 57 checks pass |
| H6 | `test-uom` | `tests/test-uom.js` | 2 | REDUCED: 110 of 164 checks run (54 not run); accepted count 110 | The comparison with Phase 1 final needs `P1_TREE`, built from the tag `v0.6-candidate-4-phase1-final`, which is not on GitHub | The unit-of-measure comparison with Phase 1 final is not checked; the current UoM rules (including U5, blank as missing) pass |

## Conditions for revisiting

Revisit any one of these tests when:
1. the owner supplies the v0.6 zips or tags it needs (`tests/PROTECTED-VERSIONS.txt` lists them); then run it and record the real result; or
2. the owner decides to retire it, which is an owner decision: changing its registry entry is a protected change needing approval; or
3. new evidence suggests a regression in the area it covers, such as a golden or confidence snapshot difference, a reference-check failure or a user report. That would raise its priority before further Stage 3B work.

No time is to be spent recovering the unavailable material unless one of these happens.

## Where they are tracked

- `KNOWN-LIMITATIONS.md` entry 19
- `stage3-design/tag6/OUTSTANDING-ROADMAP.md` item HIST
- this file
- the runner's output, in every full tier
