# Characterisation tests

Tests in this folder record what the engine **currently does**, including known defects. A passing characterisation test means the recorded behaviour **has not changed**. It does **not** mean the behaviour is correct or approved. Approved future behaviour is set by the owner's decisions (see `../../M1-DESIGN.md`, "Decisions") and changes only through separately authorised commits.

Each recorded defect carries a `TODO(<id>, <commit or stage>)` comment naming the commit or stage intended to change it. A commit that changes the behaviour must, in the same commit, change the matching assertion and its line in `../checksums.txt`, so the diff shows the behaviour change next to the code change.

## characterisation-lead-time-fallbacks.js (added in M1 pre-tag Commit 3, 12 Nov 2026)

Run from `tests/`: `NODE_PATH=<pinned test packages> node characterisation/characterisation-lead-time-fallbacks.js`. The last line is `characterisation-lead-time: N passed, M failed` (28 assertions). The test is registered in `../accepted-results.json` (fast and full tiers; the full tier runs it in five time zones) with a `note` marking it as CHARACTERISATION. The test file is protected by `../checksums.txt`; this README is not.

It builds a small synthetic workbook in memory (fixed values, no random numbers, UTC dates), runs `CGEngine.runEngine()` with default settings and records lead-time results for six purchased materials:

| Case | Situation | Recorded current result | Status |
| --- | --- | --- | --- |
| H1 | Purchase-order history only: 6 POs promised 20 d, received 26 d | 32 d = history 26 d + 6 d lateness added again; label "... + calculated lateness" | **Known defect** (lateness counted twice). `TODO(H1, Commit 4)` |
| H2 | Supplier standard 20 d, same 6 late POs | 26 d = 20 d + 6 d lateness | Control case: not a double count; Commit 4 must not change it |
| H3 | Purchase-order history: one PO, 40 d | 40 d, labelled "Calculated", spread 0, `enough` false | **Known defect** (small sample). `TODO(small samples, Stage 4)` |
| H4 | Purchase-order history: two POs, 10 d and 50 d | 30 d, labelled "Calculated", spread 20, `enough` false | **Known defect** (small sample). `TODO(small samples, Stage 4)` |
| H5 | Purchase-order history: 6 POs delivered 5 d early | 25 d; lateness floored at 0 | Current behaviour; no change planned (lateness rule open, decision A4) |
| F7 | No stated lead time, no supplier standard, no POs | 7 d production default, "Assumed (default setting)" | **Known limitation** (7-day fallback). `TODO(7-day fallback, decision A1)` |

H1 flips in the next commit; the TODO is deliberate — it records the defect state for exactly one commit so the fix's diff shows the change.

**Case numbering.** The numbering follows the evidence from the H1 assessment (synthetic workbook `h-cases`, cases H1–H5). The original Commit 3 brief referred to "H5 small-sample variance"; that does not match the evidence: the small-sample cases are H3 and H4, while H5 is the early-delivery case. F7 is the seven-day fallback case.

## Known risks

- No baseline tag may be moved between Commit 3 and Commit 4. The guard would then treat Commit 3's checksum line as approved, and Commit 4's corrected checksum line would fail it.
- The runner (`run-all.sh`) shows this test as an ordinary `PASS`. Its characterisation status is carried by its name, its `note` in `accepted-results.json`, its output, this README and `V07-TEST-RECORD.md`.
- This test loads engine files via indirect eval; if a future refactor adds browser-only globals at load time, the test's loader must be revised.
