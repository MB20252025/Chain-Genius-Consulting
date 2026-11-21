# SCIE: issue resolution, CI verification and Tag-6 readiness (21 Nov 2026, second pass)

Claude's report to the owner. My own work throughout: none of it is independent external verification.
Statuses used: Completed and verified · Completed but partially verified · Awaiting owner decision ·
Blocked by missing evidence · Deferred · Not started.

**Bottom line.** Every item that did not need you is done. The candidate has now been tested by GitHub's own runners
at the exact commit. Tag-6 is still not created and nothing was deployed, because the release would include Stage 3
rules that only you can accept (section 18). I also found and corrected two counting errors of my own from the
first pass: 53 tests passed, not 54; and 38, not 39.

## 1. Work completed

| Item | Status |
|---|---|
| State recorded: all branches and tags as listed in your brief; Tag-5 `f0e81bb` unchanged; r1/r2 tars and manifests re-verified (730/730 each); recovery copy verified; live temporary site still `cd16dcc` | Completed and verified |
| CI gap investigated and closed (section 4) | Completed and verified |
| X1 criteria reclassified with your three classes; criterion 19 qualified | Completed but partially verified |
| Separate reference calculations (section 8) | Completed but partially verified (same engineer) |
| Historical test files investigated | Blocked by missing evidence (you may hold them) |
| Chrome paging test made reproducible on GitHub's runner | Completed and verified |
| Counts and 451/452 reconciled; my own count errors corrected | Completed and verified |
| 725/726/730 and the 11 shared files reconciled | Completed and verified |
| Stage 3 decision register (12 items) | Completed; decisions awaiting you |
| Low-risk corrections | Completed and verified (section 2) |
| Deployment candidate prepared, smoke-tested, not deployed | Completed but partially verified (no physical Android) |

## 2. Files changed (all on new branches; nothing existing rewritten)

- `.github/workflows/candidate-verification.yml` (new, on `ci/` branches only).
- `tests/run-all.sh`: one added summary line, "Tests: N passed (+ pre-flight PASS), of T tests". The existing PASS line is unchanged, so the CI summariser still parses it.
- New records in `stage3-design/audit-20261121/`: `RECONCILIATION-AND-VERIFICATION.md`, `STAGE3-DECISION-REGISTER.md`, `reference/` (3 scripts), `evidence/` (5 synthetic probe workbooks, outputs, CI extract).
- Proposal only (not in the candidate): `accepted-results.json` gives the paging test an accepted count of 59, and `run-all.sh` judges a test with no accepted count as ERROR.
- Temporary-site repository: `BUILD-SITE.sh` and a rebuilt site on branch `deploy-candidate/dc16902`.

## 3. Commits and branches created today (second pass)

| Repository / branch | Commit | Purpose |
|---|---|---|
| `ci/candidate-verification-20261121` | `c9e32de` | CI pinned to `dc16902` |
| `corrections/records-runner-20261121` = `candidate/tag6-20261121-r2` | `43b6b55` | runner line + second-pass records; **current candidate** |
| `ci/candidate-verification-r2-20261121` | `cf4a16e` | CI pinned to `43b6b55` |
| `proposal/paging-count-20261121` | `872470f` | needs your test-status approval |
| temporary site `deploy-candidate/dc16902` | `d5af97a` | deployment candidate; `main` still `cd16dcc` |

Unchanged: `development/v0.7` `eddf09b`, Tag-5 `f0e81bb`, `recovery/…` `0d71aab`, `x1/…` `a4e05e8`,
`corrections/x1-…` `11d2944`, `audit/…` and `candidate/tag6-20261121` `dc16902`.

## 4. CI

Why there was none: `v07-tests.yml` runs only on pushes to `development/v0.7`, and its first step is the Tag-5
guard, which fails on any commit with unapproved protected changes. So even on that branch it would have stopped
before running a test. I left it unchanged and added a separate workflow. That workflow checks out the pinned
candidate commit (verified in the log), records the guard result without stopping, then runs both tiers. It stays
red unless everything passes.

| Run | Tested commit | Fast tier | Full tier | Result |
|---|---|---|---|---|
| 44952372282 | `dc16902` | 38 tests passed (+ pre-flight), 1 FAIL (`check-control`) | 53 tests passed (+ pre-flight), 1 FAIL, 4 BLOCKED, 2 REDUCED, 0 ERROR | red (guard) |
| 44954005216 | `43b6b55` | 38 tests passed (+ pre-flight), 1 FAIL (`check-control`) | 53 tests passed (+ pre-flight), 1 FAIL, 4 BLOCKED, 2 REDUCED, 0 ERROR | red (guard) |

Environment (from the log): ubuntu-24.04 runner; Node 22.23.4, npm 10.9.9, Python 3.13.18; packages exactly
as recorded (pandas 3.0.5, openpyxl 3.1.5, numpy 2.5.3, xlsx 0.18.5, jsdom 31.0.0, puppeteer-core 25.17.0,
@sparticuz/chromium 153.0.0); Playwright 1.63.0 with Chrome for Testing 153.0.8010.12 (build chromium-1243). The
paging test passed 59/59 on GitHub's runner.

Not covered by CI: physical Android, the 4 BLOCKED and 2 REDUCED tests, and evidence artifacts. The artifacts
are stored on GitHub (90 days), but this session's proxy blocks downloading them, so I kept the job log instead.

## 5. Full test results

| Run | Commit | Tests | Passed (+ pre-flight) | FAIL | BLOCKED | REDUCED | ERROR |
|---|---|---|---|---|---|---|---|
| Local, clean worktree | `43b6b55` | 60 | 53 | 1 | 4 | 2 | 0 |
| Local, proposal | `872470f` | 60 | 53 (paging judged 59/59) | 1 | 4 | 2 | 0 |
| CI 44952372282 | `dc16902` | 60 | 53 | 1 | 4 | 2 | 0 |
| CI 44954005216 | `43b6b55` | 60 | 53 | 1 | 4 | 2 | 0 |

The only FAIL anywhere is `check-control` (section 6). The proposal was also exercised directly: count 59 → PASS, 58 → FAIL "COUNT DROPPED", no accepted count → ERROR. On the current candidate the same "58, no accepted count" case gives PASS, which is finding F3.

## 6. X1, criterion by criterion

These are the second-pass classes, using your definitions. **Independently verified (1):** 21 (traceability: the Git structure itself).
**Partially verified (14):** 1, 3, 4, 5, 6, 8, 9, 12, 13, 17, 18, 19, 20, 22.
**Uncontradicted (7):** 2, 7, 10, 11, 14, 15, 16. **Contradicted:** none.
Detail per criterion: `RECONCILIATION-AND-VERIFICATION.md` §5.

**Criterion 19 is qualified, not passed.** The guard is working correctly: its 3 FAILs are real, unapproved changes
to protected test material:
- `run-all.sh` changed;
- the confidence reference was replaced twice, one documented value each time;
- 9 protected test files were re-hashed.

The only proper way to clear them is your approval through a new tag. Editing the guard or the registry to make it
pass would weaken the protection.

## 7. Stage 2

All 8 closure conditions as before. 5 are verified from GitHub; 3 are partially verified, because I can't confirm your
own acceptance acts myself. A Git check today found no file deleted since Tag-5, and the golden and confidence
snapshots, fixtures and 1,323 historical logs are byte-identical. **Completed and verified** for what Git can show.

## 8. Separate calculation verification

| Check | Result |
|---|---|
| Northstar: stock value, available stock, monthly, annual and daily demand, safety stock, reorder point (all 150 items, including calendar-month BOM usage with scrap), FG/RM/total value | 1,103 of 1,103 agree |
| X1 containment, Northstar with 7 seeded faults (blank cost, blank on-hand, "abc" allocation): partial total and coverage, withheld headline, no blank becomes 0, unaffected items unchanged, ABC recomputed | 495 of 495 agree |
| Willow "POs received short" (the value that changed in the confidence snapshot) | 11, agrees |

The reference code is mine, written from the workbook and the formulas, not from the engine. It checks the engine
but is **not** independent review.

**Still needed from a person:** check by hand, on Northstar:
- one finished-good and one raw-material safety stock and reorder point;
- the total stock value (£2,533,596);
- one MRP shortage;
- the ABC table with and without missing costs.

MRP shortages, forecast confidence and the import route have no separate check yet.

## 9. Historical test recovery: Blocked by missing evidence

- The four v0.6 zips and their tags are not anywhere I can reach.
- Past chats show they were produced on 9–10 Nov and **sent to you as downloads**.
- If you have them, upload them. I will verify them against the hashes in `PROTECTED-VERSIONS.txt` (first 24 hex digits recorded) before using them.
- Even then, these tests compare today's code with v0.6 and assert "nothing changed". Stage 2, Stage 3 and X1 changed results deliberately, so they would likely fail as written.
- The zips have no `.git`, so the tag-based test stays blocked.
- Recommendation: run them once as a historical comparison if the zips turn up, then mark them RETIRED (files kept, reason recorded). Nothing was substituted.

## 10. Protection count: Completed and verified

452 is correct: CR-35 added one protected line, as recorded in `accepted-results.json`. The 451 in the requirements
matrix is covered by the erratum file. Today's runs and CI report `check-protection` 452/452.

## 11. File count 730 / 726 / 725: Completed and verified

- 730 = 726 application files + 4 files of the temporary site.
- The branch holds 725, because I deliberately left out `start-tree.sha256`: it lists names in the protected evidence folder.
- The baseline also never included `tests/logs/` (1,323 historical logs). They are in the branches and identical to accepted Stage 2. That scope was not written down; it is now.
- No runtime or acceptance effect.

## 12. Shared files: Completed and verified

Line-level diffs show 6 of the 11 files are cleanly separable. The important exception is `js/calculations.js`: X1's
containment code calls and changes the Stage 3 dead-stock function `stockB()`. Line 35 of `js/app.js` (the dead-stock
view) is the other. So X1 cannot be shipped without that Stage 3 code unless those lines are reworked.
Recommendation: keep the files and decide the Stage 3 rules; if you reject a rule, rework the specific lines, not the files.

## 13–14. Stage 3 decisions and my recommendations (plain English)

1. **Dead-stock rule.** Should stock that is already promised to customers (allocated) ever be called dead?
   - I recommend **no**: list only uncommitted stock (what the software does now).
   - Add a one-line note for items that have no demand but are fully allocated, because that is unusual. *(Option D)*
2. **Dead-stock view.** For clients, I recommend summary cards plus one "uncommitted stock" column, with the four quantities in the export. *(Option C)* Show negative physical stock as a data warning, not a negative £ figure.
3. **Excess stock.** I recommend **no change for Tag-6**. Keep today's 90-day rule and plan the better forecast-based rule (E1) as its own piece of work, because it changes £ figures clients see.
4. **Route differences.** Text numbers such as "1,200" are understood by the import route but marked Not Assessed on the direct route. I recommend making the direct route understand them the same way, **after** Tag-6, with its own tests. *(Option C)*
5. **Unknown allocations (R2-ALLOC).** Today an item can be "Not Assessed" and still be listed as dead stock: the two signals disagree. I recommend **"Not Assessed" for the dead-stock class too**.
6. **Physical above usable (R2-ASSUME).** I recommend using usable stock when a usable column exists, and flagging the mismatch. Rare.
7. **Four new data warnings.** Negative production quantities, completed above planned, negative lead times, BOM wording. I recommend **accept**: they change no figures.
8. **D1–D4** (your 16 Nov decisions, implemented). Recommend **accept**.
9. **"Usable on-hand" wording.** It fixes a false Stage 2 warning. Recommend **accept**.
10. **Invalid-number warning.** Recommend **accept**. Since X1 it explains, rather than replaces, the protection.
11. **Empty text read as missing.** Recommend **accept**. It changed one count on a test file, from 19 to 11; my recount gives 11.
12. **Registry amendments.** Recommend **approve via Tag-6** once 1–11 are settled. The paging proposal is separate and also needs your yes.

Full detail (current behaviour, origin, options, impact, tests, risks): `STAGE3-DECISION-REGISTER.md`.

## 15. Remaining defects and risks

| ID | Priority | Finding | Status |
|---|---|---|---|
| F1 | MEDIUM | When some items' cost is unknown, other items' ABC classes can move. Example: RM020 moves from A to B (its cumulative share goes from 79.7% to 80.5%) when RM005 and two other materials drop out of the ranking. The table shows a "Not Assessed" row, but does not warn that the remaining classes are provisional. | Awaiting owner decision (presentation) |
| F2 | MEDIUM | Safety stock uses the population standard deviation; a sample standard deviation would give about 4.4% higher safety stock with 12 months of data. This is a calculation choice that is not written down anywhere I found. | Awaiting owner decision (calculation change) |
| F3 | LOW | When a BLOCKED test's blocker cleared, any count passed. | Proposal ready |
| F4 | LOW | The temporary site still shows the wording from before the fixes. | Deployment candidate ready |
| R-ALLOC | LOW | Not Assessed items can still be listed as dead stock. | Decision 5 |
| — | — | No physical Android test by me; no human review of calculations. | Open |

## 16. Tag-6 readiness: NOT READY (awaiting owner decisions)

Technically ready:
- candidate `43b6b55`, tested locally and by CI at the exact commit;
- the only FAIL is the guard;
- the separation of Stage 2, Stage 3, X1 and corrections is clear in Git.

Not ready:
- Tag-6 would approve the unaccepted Stage 3 rules (items 1, 2, 5, 6) and the registry amendments;
- if you change any rule, the candidate changes and must be re-tested.

Tag pushes are blocked from this session, so you create the tag (through GitHub Releases, as with Tag-5). I then
re-run CI and expect the guard to PASS against the new tag.

## 17. Deployment readiness: PREPARED, NOT DEPLOYED

- Branch `deploy-candidate/dc16902`:
  - built with `BUILD-SITE.sh` from the exact commit, using `git show` only;
  - only `app.js` and `index.html` differ from the live `cd16dcc`;
  - smoke-tested in Chrome at 412 px: Northstar loads, total £2,533,596, no console errors.
- To deploy after approval:
  1. rebuild from the tagged commit;
  2. commit it on top of `cd16dcc` on `main` (a normal commit, no history rewrite);
  3. confirm Pages serves it.
- Rollback: `git revert` that commit, so Pages serves `cd16dcc` again. `cd16dcc` stays the reference.
- The main consultancy site is not touched.

## 18. Exact decisions required from you

1. Dead-stock rule: A / B / C / **D (recommended)**.
2. Dead-stock view: A / B / **C**; negative physical shown as a flag: yes / no.
3. Excess stock: **keep the current rule now, E1 later** / adopt E1 now.
4. Route alignment: **after Tag-6** / now / never.
5. R2-ALLOC: **Not Assessed** / keep as is.
6. R2-ASSUME: **usable basis + flag** / keep.
7. Four new warnings, D1–D4, the wording fix, the invalid-number warning, empty-text: **accept** / reject (each).
8. F1 (ABC note) and F2 (sample vs population standard deviation): change / leave as documented behaviour.
9. Paging proposal: approve / not yet.
10. Historical zips: upload them / retire the six tests.
11. Then: create Tag-6 on the final candidate commit I give you, and approve deploying it to the temporary site.
