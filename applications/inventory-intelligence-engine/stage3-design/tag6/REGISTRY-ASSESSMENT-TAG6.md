# Tag-6 registry assessment: all 50 pending items (22 Nov 2026)

Candidate branch `candidate/tag6-20261122-r4`. The list is the Tag-5 guard's actual output on this branch
(`verification-r4-20261122/guard.txt`), not a summary. Assessed by Claude under the owner's delegated technical authority
(22 Nov 2026).

**ACCEPT means prepared for the Tag-6 block approval, not approved.** Nothing here is approved until the owner
formally approves the Tag-6 block and creates the tag.

## 1. Summary

| Group | Count | Decision |
|---|---|---|
| Raised counts | 6 | 6 ACCEPT |
| New tests | 16 (the 15 of the 48, plus `tag6-changes`) | 16 ACCEPT |
| New protected lines | 28: 18 new files + 9 re-hashes of Tag-5 lines + 1 for `test-tag6-changes.js` | 28 ACCEPT |
| **Total** | **50** | **50 ACCEPT, 0 REJECT, 0 left pending** |

**Overlaps.** None double-counted.
- A new test appears twice by design: as a registry entry (its count) and as a checksum line (its file). These are two kinds of protection.
- The 9 re-hashed lines are the current hashes behind guard FAIL 3, which says the old Tag-5 lines are gone. One change is reported twice, by two different checks; it is not two changes.
- `stage3-round2` and `tag6-changes` were re-hashed during Tag-6 work (B1; defects A and B), each with a dated note in `checksums.txt`. Each is still one pending line.

**Corrections to earlier documents** (the originals are kept):
- The plan of 22 Nov counted 48 items, and the protection count as 452. Now: 50 items and 453 (one new test file).
- The plan's P-numbers do not match these R-numbers. The R-numbers follow the guard's order.
- Earlier reports said "51 pending" and "28 new protected lines". The figures before Tag-6 work were 48 and 27, as recorded in `OWNER-DECISION-RECORD-TAG6.md`.

## 2. Items

| ID | Category | Item | Original protected requirement | Actual change | Evidence examined | Decision | Reason | Remaining limitation | Ready for Tag-6 block |
|---|---|---|---|---|---|---|---|---|---|
| R-01 | raised count | `check-protection` 434 → 453 | Every protected file's checksum matches (count = references + protected files) | 434 → 453: +19 net protected files (28 new lines − 9 replacing approved lines) | re-run 453/453; checksums.txt diff vs Tag-5; guard output | ACCEPT | Mechanical: follows the 19 added files | — | yes |
| R-02 | raised count | `check-globals` 116 → 124 | Each top-level name declared once; load order as expected | 116 → 124: x1-integrity.js in load order (+1); 7 new top-level names (INTEG, x1Banner, gapSeg, gapTxt, x1Why, x1Sum, x1Money) | re-run 124/124; registry note CR-02/CR-03 | ACCEPT | Same rules cover more code; r3/r4 added no top-level names | — | yes |
| R-03 | raised count | `test-a1-static` 29 → 30 | No free CFG/R/WB reference in engine files (rule 2) | 29 → 30: rule now also covers js/validation/x1-integrity.js | re-run 30/30 (2 zones in tiers) | ACCEPT | Same rule, one more file | — | yes |
| R-04 | raised count | `same-results` 356 → 416 | Direct and import routes give identical results | 356 → 416: 83 per zone × 5 + 1 (was 71); the 4 workbooks once refused (invented Line_No) now compared | re-run 416/416; diff of test-same-results.js | ACCEPT | Coverage genuinely widened (D3) | Provenance: recorded option label only (original wording not recoverable); assessed against the recorded implementation and tests (D3(1)) | yes |
| R-05 | raised count | `import-integrity` 386 → 396 | Import route integrity assertions per zone | 386 → 396: 79 per zone × 5 + 1 (was 77); 45 E-1 withholding assertions replaced by D2 rejection, D4 partial totals, X1 Q1 (M0058 under D6) | re-run 396/396; diff; superseded assertions kept as comments | ACCEPT | Assertions follow recorded decisions; nothing removed silently | Provenance: recorded option label only (original wording not recoverable); assessed against the recorded implementation and tests (D2(a), D4) | yes |
| R-06 | raised count | `test-a1-sync-path` 74 → 76 | Every helper on the runEngine path is synchronous | 74 → 76: gapSeg, gapTxt now reachable | re-run 76/76 | ACCEPT | Same rule, two more helpers | — | yes |
| R-07 | new test | `allocated-usable` (23) | D5 warning uses the available-stock basis | new, 23 | CI and local tiers; file header | ACCEPT | Accurate detection; owner accepted B3 | — | yes |
| R-08 | new test | `empty-text` (46) | DR-4: blank in any form is missing on the direct route | new, 46 | re-run 46/46; A4 owner-approved (load-bearing) | ACCEPT | Implements A4 | — | yes |
| R-09 | new test | `shortage-delay` (19) | N1: feasibility never shows a negative delay | new, 19 | CI and local tiers | ACCEPT | Calculation correction pinned; golden differences enumerated by D1 | Provenance: recorded option label only (original wording not recoverable); assessed against the recorded implementation and tests (D1(a)) | yes |
| R-10 | new test | `scrap-rules` (71) | D2 scrap rules on both routes | new, 71 | re-run 71/71 | ACCEPT | Implements D2 | Provenance: recorded option label only (original wording not recoverable); assessed against the recorded implementation and tests (D2(a)) | yes |
| R-11 | new test | `tz-boundaries` (71) | Dates correct in all five zones | new, 71 | CI (5 zones) | ACCEPT | Strengthens date handling | — | yes |
| R-12 | new test | `partial-totals` (8) | D4 partial totals: flag, excluded items with reasons, arithmetic refused, ABC/cumulative withheld, NO_ELIGIBLE_ITEMS when none eligible | new, 8 | re-run 8/8; the 8 checks read against the owner's six safeguards (see §3) | ACCEPT | Safeguards 1–5 checked directly; 6 checked for the import result gate | Provenance: recorded option label only (original wording not recoverable); assessed against the recorded implementation and tests (D4: the safeguards are now listed by the owner, 22 Nov, and were used for this assessment) | yes |
| R-13 | new test | `stage3-quality` (28) | C-STK, D5, C-NUM and Round 1 corrections | new, 28 | CI and local tiers | ACCEPT | Behaviours accepted (A1, B3) | — | yes |
| R-14 | new test | `stage3-round2` (35) | R2-STK, R2-VIEW, F-A1–F-A4 | new, 35; R2-VIEW checks amended for B1 (originals as comments), re-hashed | re-run 35/35 | ACCEPT | Behaviours accepted (A1, B1, B3) | — | yes |
| R-15 | new test | `x1-foundation` (40) | X1 field states, provenance, dependencies | new, 40 | re-run 40/40 | ACCEPT | X1 accepted | — | yes |
| R-16 | new test | `x1-containment` (41) | MRP crash containment; integrity record | new, 41 | CI and local tiers | ACCEPT | X1 accepted | — | yes |
| R-17 | new test | `browser-x1-chrome` (334) | X1 in real Chrome, desktop and Pixel 5 emulation | new, 334 | re-run 334/334 | ACCEPT | X1 accepted | Emulation, not a physical device | yes |
| R-18 | new test | `x1-wp5` (56) | Unknown, invalid and prohibited inputs; calendar demand (D6) | new, 56 | CI and local tiers | ACCEPT | X1 accepted; D6 owner-approved 22 Nov (A6) | — | yes |
| R-19 | new test | `x1-completion` (48) | X1 evidence gaps closed | new, 48 | CI and local tiers | ACCEPT | X1 accepted | — | yes |
| R-20 | new test | `x1-material-integrity` (42) | Unidentifiable BOM materials | new, 42 | re-run 42/42 | ACCEPT | X1 accepted | — | yes |
| R-21 | new test | `x1-acceptance-wording` (12) | Wording fixes from the owner's Android Test 3 | new, 12 | re-run 12/12 | ACCEPT | X1 accepted | — | yes |
| R-22 | new test | `tag6-changes` (30) | Tag-6 approved changes (E-1, A1, A2, A3 remainder, B1, B2, E-9) and r4 defects A and B; unchanged-elsewhere checks | new, 30 | 5 zones; fails 13 of the first 23 checks on 43b6b55 and 6 of the 7 r4 checks on b1d2db9 | ACCEPT | Pins the approved behaviour | — | yes |
| R-23 | protected line | `tests/check-globals.js` `1a51855a9727…` | File content as approved at the tag | re-hash of an approved file: X1 P1: x1-integrity.js in expected load order (C-1) | checksums.txt diff vs Tag-5; check-protection 453/453 | ACCEPT | Replaces the Tag-5 hash; pairs with guard FAIL 3; protection level unchanged | — | yes |
| R-24 | protected line | `tests/compare-snapshots.js` `923fc38da580…` | File content as approved at the tag | re-hash: D1: applies exactly the 20 enumerated permitted differences to the in-memory expected copy; printer crash fix (C-2) | checksums.txt diff vs Tag-5; check-protection 453/453 | ACCEPT | Replaces the Tag-5 hash; pairs with guard FAIL 3; protection level unchanged | Provenance: recorded option label only (original wording not recoverable); assessed against the recorded implementation and tests | yes |
| R-25 | protected line | `tests/snapshots/README.md` `ee3ce5fe1e3f…` | File content as approved at the tag | re-hash: documents new confidence references and permitted differences (C-3) | checksums.txt diff vs Tag-5; check-protection 453/453 | ACCEPT | Replaces the Tag-5 hash; pairs with guard FAIL 3; protection level unchanged | — | yes |
| R-26 | protected line | `tests/test-uom.js` `89c09b68fd54…` | File content as approved at the tag | re-hash: blank units moved to a U5 'missing' check (A4; UoM rule preserved) (C-4) | checksums.txt diff vs Tag-5; check-protection 453/453 | ACCEPT | Replaces the Tag-5 hash; pairs with guard FAIL 3; protection level unchanged | — | yes |
| R-27 | protected line | `tests/test-import-stage1.js` `5a5229936a67…` | File content as approved at the tag | re-hash: invalid scrap rejects the row (D2) (C-5) | checksums.txt diff vs Tag-5; check-protection 453/453 | ACCEPT | Replaces the Tag-5 hash; pairs with guard FAIL 3; protection level unchanged | Provenance: recorded option label only (original wording not recoverable); assessed against the recorded implementation and tests | yes |
| R-28 | protected line | `tests/test-import-mapping.js` `c76421661519…` | File content as approved at the tag | re-hash: bad stock row quarantined, not rejected (X1 D1(a)/Q4) (C-6) | checksums.txt diff vs Tag-5; check-protection 453/453 | ACCEPT | Replaces the Tag-5 hash; pairs with guard FAIL 3; protection level unchanged | Provenance: recorded option label only (original wording not recoverable); assessed against the recorded implementation and tests | yes |
| R-29 | protected line | `tests/test-same-results.js` `2c06aaed52ff…` | File content as approved at the tag | re-hash: D3: refused list emptied; route equality (C-7) | checksums.txt diff vs Tag-5; check-protection 453/453 | ACCEPT | Replaces the Tag-5 hash; pairs with guard FAIL 3; protection level unchanged | Provenance: recorded option label only (original wording not recoverable); assessed against the recorded implementation and tests | yes |
| R-30 | protected line | `tests/tools/import-v1/reverse-eight-sheet.js` `43ba6fd6235a…` | File content as approved at the tag | re-hash: D3: no invented Line_No (C-8) | checksums.txt diff vs Tag-5; check-protection 453/453 | ACCEPT | Replaces the Tag-5 hash; pairs with guard FAIL 3; protection level unchanged | Provenance: recorded option label only (original wording not recoverable); assessed against the recorded implementation and tests | yes |
| R-31 | protected line | `tests/test-import-integrity.js` `4b56ca43ed09…` | File content as approved at the tag | re-hash: D2, D4, X1 Q1 (C-9) | checksums.txt diff vs Tag-5; check-protection 453/453 | ACCEPT | Replaces the Tag-5 hash; pairs with guard FAIL 3; protection level unchanged | Provenance: recorded option label only (original wording not recoverable); assessed against the recorded implementation and tests | yes |
| R-32 | protected line | `tests/test-allocated-usable.js` `121a914bfb4f…` | File as created for the registered test/reference | new test file: protects the new test test-allocated-usable.js | checksums.txt diff vs Tag-5; check-protection 453/453 | ACCEPT | Protects the file in its accepted form | — | yes |
| R-33 | protected line | `tests/test-empty-text.js` `66410a63795f…` | File as created for the registered test/reference | new test file: protects the new test test-empty-text.js | checksums.txt diff vs Tag-5; check-protection 453/453 | ACCEPT | Protects the file in its accepted form | — | yes |
| R-34 | protected line | `tests/snapshots/v0.7-confidence-20261116T034921Z.json` `8b3fdf2a7842…` | File as created for the registered test/reference | new reference: Stage 3 confidence reference (DR-4), superseded, kept | checksums.txt diff vs Tag-5; check-protection 453/453 | ACCEPT | Protects the file in its accepted form | — | yes |
| R-35 | protected line | `tests/test-shortage-delay.js` `a54a12045354…` | File as created for the registered test/reference | new test file: protects the new test test-shortage-delay.js | checksums.txt diff vs Tag-5; check-protection 453/453 | ACCEPT | Protects the file in its accepted form | — | yes |
| R-36 | protected line | `tests/test-scrap-rules.js` `8a87a7c9f514…` | File as created for the registered test/reference | new test file: protects the new test test-scrap-rules.js | checksums.txt diff vs Tag-5; check-protection 453/453 | ACCEPT | Protects the file in its accepted form | — | yes |
| R-37 | protected line | `tests/test-tz-boundaries.js` `c5d6f2bdec7c…` | File as created for the registered test/reference | new test file: protects the new test test-tz-boundaries.js | checksums.txt diff vs Tag-5; check-protection 453/453 | ACCEPT | Protects the file in its accepted form | — | yes |
| R-38 | protected line | `tests/test-partial-totals.js` `52ed11f4f680…` | File as created for the registered test/reference | new test file: protects the new test test-partial-totals.js | checksums.txt diff vs Tag-5; check-protection 453/453 | ACCEPT | Protects the file in its accepted form | — | yes |
| R-39 | protected line | `tests/snapshots/permitted-differences.json` `ff1b71abad35…` | File as created for the registered test/reference | new reference: the 20 enumerated D1 differences | checksums.txt diff vs Tag-5; check-protection 453/453 | ACCEPT | Protects the file in its accepted form | Provenance: recorded option label only (original wording not recoverable); assessed against the recorded implementation and tests | yes |
| R-40 | protected line | `tests/test-stage3-quality.js` `7491f2894730…` | File as created for the registered test/reference | new test file: protects the new test test-stage3-quality.js | checksums.txt diff vs Tag-5; check-protection 453/453 | ACCEPT | Protects the file in its accepted form | — | yes |
| R-41 | protected line | `tests/test-stage3-round2.js` `b35f2322046a…` | File as created for the registered test/reference | new test file: protects the new test test-stage3-round2.js | checksums.txt diff vs Tag-5; check-protection 453/453 | ACCEPT | Protects the file in its accepted form | — | yes |
| R-42 | protected line | `tests/test-x1-foundation.js` `ac424fc5d61c…` | File as created for the registered test/reference | new test file: protects the new test test-x1-foundation.js | checksums.txt diff vs Tag-5; check-protection 453/453 | ACCEPT | Protects the file in its accepted form | — | yes |
| R-43 | protected line | `tests/test-x1-containment.js` `aa7f0124c38c…` | File as created for the registered test/reference | new test file: protects the new test test-x1-containment.js | checksums.txt diff vs Tag-5; check-protection 453/453 | ACCEPT | Protects the file in its accepted form | — | yes |
| R-44 | protected line | `tests/browser-x1-chrome.js` `739e4f9c0801…` | File as created for the registered test/reference | new test file: protects the new test browser-x1-chrome.js | checksums.txt diff vs Tag-5; check-protection 453/453 | ACCEPT | Protects the file in its accepted form | — | yes |
| R-45 | protected line | `tests/test-x1-wp5.js` `e704b317bcf2…` | File as created for the registered test/reference | new test file: protects the new test test-x1-wp5.js | checksums.txt diff vs Tag-5; check-protection 453/453 | ACCEPT | Protects the file in its accepted form | — | yes |
| R-46 | protected line | `tests/snapshots/v0.7-confidence-20261121T075533Z.json` `cf27c4fd7a9c…` | File as created for the registered test/reference | new reference: current confidence reference (D6: Willow 4 → 3 items) | checksums.txt diff vs Tag-5; check-protection 453/453 | ACCEPT | Protects the file in its accepted form | — | yes |
| R-47 | protected line | `tests/test-x1-completion.js` `573d8c56528e…` | File as created for the registered test/reference | new test file: protects the new test test-x1-completion.js | checksums.txt diff vs Tag-5; check-protection 453/453 | ACCEPT | Protects the file in its accepted form | — | yes |
| R-48 | protected line | `tests/test-x1-material-integrity.js` `888f0603fa8d…` | File as created for the registered test/reference | new test file: protects the new test test-x1-material-integrity.js | checksums.txt diff vs Tag-5; check-protection 453/453 | ACCEPT | Protects the file in its accepted form | — | yes |
| R-49 | protected line | `tests/test-x1-acceptance-wording.js` `898104338434…` | File as created for the registered test/reference | new test file: protects the new test test-x1-acceptance-wording.js | checksums.txt diff vs Tag-5; check-protection 453/453 | ACCEPT | Protects the file in its accepted form | — | yes |
| R-50 | protected line | `tests/test-tag6-changes.js` `b4cb6621a6e8…` | File as created for the registered test/reference | new test file: protects the new test test-tag6-changes.js | checksums.txt diff vs Tag-5; check-protection 453/453 | ACCEPT | Protects the file in its accepted form | — | yes |

## 3. Assessments behind the decisions

**Guard FAILs (not registry items; they clear only when Tag-6 is created):**
1. `run-all.sh` changed: five-zone snapshot runs (Stage 3) and the "Tests: N passed (+ pre-flight)" line.
2. Confidence reference replaced. Each step changes exactly one documented value: 19 → 11 POs (A4, owner-approved) and 4 → 3 items (D6, owner-approved as A6).
3. 9 approved lines changed (R-items marked "re-hash").

The guard was not changed. Its message names only 3 of the 9 files; improving that is deferred (G1).

**D1–D4 provenance (owner-confirmed limitation).** The repository records the option labels D1(a), D2(a), D3(1) and D4 (`tests/V07-TEST-RECORD.md`, line 1294). The original full wording is not recoverable and is not reconstructed here.
- The implementations were assessed against the recorded option labels, the implementation records and their tests.
- Where an item depends on D1–D4, its "Remaining limitation" column says so.
- These items are ACCEPT because the recorded labels are authoritative (owner, 22 Nov). Full verification against the original wording is not claimed.

**D4 partial-total safeguards, against the six safeguards the owner listed on 22 Nov:**

| Safeguard | Evidence | Status |
|---|---|---|
| 1 Visible partial flag for every consumer | Import route: frozen `{value, partial: true, excludedItems}`, `disclosures.partialTotals` (`test-partial-totals` checks 2, 4). Direct route: X1 `x1Money` "partial: N of M items" on screen, including the three totals fixed by E-1 | met (both routes) |
| 2 Excluded items and reasons exposed | `excludedItems` with reasons (check 3); "(K Not Assessed)" on screen | met |
| 3 Never presented as complete | Arithmetic and comparison on a partial value throw (check 6); serialisation keeps `partial: true` (check 7); E-1 removed the last "£–"/complete-looking totals | met |
| 4 ABC and cumulative shares withheld where required | Import route: all `abc`/`cum` withheld when an item is withheld (check 5). Direct route: X1 WP5 makes unvalued items Not Assessed and ranks the rest, with B2's provisional note | met as implemented; the two routes intentionally differ, an existing documented route difference (KNOWN-LIMITATIONS 18) |
| 5 No eligible items → unavailable, not zero | `NO_ELIGIBLE_ITEMS` reason (check 8) | met |
| 6 Consistent propagation | Import gate: all six totals listed in disclosures (check 4). Screens: X1 partial labels. Exports carry item rows (empty cells for unknowns since defect A), not totals | met for the consumers that exist; no total is exported |

**D6 / A6 provenance.** Established. The owner explicitly approved A6 ("missing demand months remain unknown, not zero") on 22 Nov 2026, 02:40, recorded in `OWNER-DECISIONS-TAG6.md`. The X1 records also label D6 as an owner decision of 21 Nov. Kept as is; no further owner action needed.

**UoM.** Blank and whitespace-only units are missing, not unrecognised (`test-uom` U5). Preserved.

**No genuine business-policy question remains open in the registry block.**
