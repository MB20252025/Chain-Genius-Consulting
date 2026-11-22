# Tag-6 release record (22 Nov 2026)

This record sits on `release-records/tag6-20261122`, a child of the tagged commit. It is not part of the tagged commit, so recording it does not change the release target.

## 1. Authority

The owner gave full delegated authority on 22 Nov 2026 ("FULL AUTHORISATION: COMPLETE TAG-6 CREATION, GITHUB RELEASE AND FINAL VERIFICATION") to:
- accept the 50-entry registry block as assessed;
- create `v0.7-tests-approved-6` on `e65600cf7b74f7f25ec73ec24ef9fae1d648c619` through GitHub Releases;
- run the post-tag verification.

The decisions below were made by Claude **under delegated owner authority**. The owner did not personally review them at the time.

That authority does not cover:
- deployment or publishing;
- moving `development/v0.7`;
- promotion to another protected branch;
- changes to the Stage 2, X1 or Tag-5 baselines;
- new calculation behaviour;
- deferred roadmap work;
- weakening protection.

## 2. Target check (fresh, 22 Nov 2026, before any release operation)

| Check | Result |
|---|---|
| `e65600c` resolves to the full SHA | `e65600cf7b74f7f25ec73ec24ef9fae1d648c619` |
| `origin/candidate/tag6-20261122-r4` | same SHA: not modified or superseded |
| Switching changes only | 5 files against `3822045`: the workflow TAG, the registry check-control `tag`, the guard's default `--tag`, the `tests/README.md` Tag-6 row, and V07-TEST-RECORD Part A |
| Application code against `3822045` | `js/` and `index.html` identical (`git diff --quiet`) |
| Existing tags | v0.6 `8117c72`; Tag-1 `eb3111f`; Tag-2 `0e461a6`; Tag-3 `9eb578b`; Tag-4 `5f18335`; Tag-5 `f0e81bb`: unchanged. No Tag-6 existed |
| Protected branches | `development/v0.7` `eddf09b`; `x1/accepted-20261121` `a4e05e8`; `main` `8117c72`: unchanged |
| Remote | No unexpected branch or tag |

## 3. Formal acceptance of the Tag-6 registry block

The Tag-5 guard was run against the candidate tree in a throwaway worktree, with 12 checks: 7 passed, 5 failed, 50 PENDING.

| Kind | Guard PENDING | Assessment (`REGISTRY-ASSESSMENT-TAG6.md`) |
|---|---|---|
| Raised counts | 6 | R-01 to R-06, 6 ACCEPT |
| New tests | 16 | R-07 to R-22, 16 ACCEPT |
| New protected lines | 28 | R-23 to R-50, 28 ACCEPT |
| **Total** | **50** | **50 ACCEPT, 0 REJECT, 0 pending** |

The 5 FAILs are the expected ones:
- 3 are documented in the assessment, §3: `run-all.sh` changed; the confidence reference was replaced by A4 and D6; and 9 approved lines were re-hashed.
- 2 are the switching files, `check-control.js` and the workflow.

All five clear only against Tag-6.

**Checks made before acceptance:**
- All 50 entries are present.
- Each has evidence, a rationale and a limitations column.
- The counts reconcile with the guard output line by line.
- No entry contradicts an accepted decision, including:
  - D1–D4, assessed against the recorded option labels; the original wording was not recoverable and was not reconstructed;
  - the six D4 safeguards, all met (assessment §3);
  - blank or whitespace-only UoM as missing;
  - A3: usable stock for availability; dead stock on max(physical, usable) − allocated; all four quantities shown; no usable-above-physical warning (pinned by `test-tag6-changes`);
  - A4 blank-as-missing;
  - A6/D6: missing demand months are unknown, not zero.
- No new business-policy question is open.

**Decision (22 Nov 2026, under delegated owner authority):**
- All 50 entries are formally accepted into the Tag-6 baseline. "ACCEPT" now means accepted for the Tag-6 baseline, not only proposed.
- This is engineering acceptance of the test baseline only. It is not deployment or publishing approval.

## 4. Tag and Release

### 4a. First attempt by Claude (22 Nov 2026): blocked

The Release API returned HTTP 403: "Creating, editing, or deleting releases is not permitted for this session type."
- The block was not worked around.
- Checked afterwards: nothing was created.
- The owner was asked to create the release in GitHub's web interface.

### 4b. Created by the owner (22 Nov 2026, 05:38 UTC): verified

| Item | Verified value |
|---|---|
| Tag | `v0.7-tests-approved-6`, a lightweight tag (`git cat-file -t` gives `commit`) |
| Tag resolves to | `e65600cf7b74f7f25ec73ec24ef9fae1d648c619`, the approved commit |
| Release | "Supply Chain Intelligence Engine v0.7 — T6 Tests Approved"; pre-release; not a draft; published 05:38:16Z; author MB20252025 |
| Release URL | https://github.com/MB20252025/Chain-Genius-Consulting/releases/tag/v0.7-tests-approved-6 |
| Release target | `candidate/tag6-20261122-r4`, whose tip is `e65600c` |
| Latest release | still `v0.7-tests-approved-3`; unchanged, and Tag-6 is not marked latest |
| `release/` branch | none created; only `release/v0.6` exists, unchanged |

## 5. Post-tag verification (22 Nov 2026)

**Real GitHub CI: run 44990351755.**
- Workflow "candidate verification", branch `ci/candidate-verification-tag6-20261122`, commit `e71f074`. Conclusion: **success**.
- The workflow's only change: TAG `-5` → `-6`, so step 1 runs the same guard step as `v07-tests.yml`, reading the real remote Tag-6.

| Check | CI result | Local fresh clone |
|---|---|---|
| Tested commit | `e65600c…`, checked by the workflow | `e65600c…` |
| Guard from Tag-6 | 12 passed, 0 failed, **0 PENDING**, baseline `v0.7-tests-approved-6 = e65600c` | same |
| Fast tier | 40 tests passed (+ pre-flight) of 40; 0 FAIL, 0 ERROR; exit 0 | same |
| Full tier | 55 tests passed (+ pre-flight) of 61; 0 FAIL, 0 ERROR; **4 BLOCKED, 2 REDUCED**; exit 0 | same |

**Full tier, key rows:**
- check-protection 453
- same-results 416
- import-adapter 346
- tag6-changes 30, in 1 and 5 zones
- the X1 suites at their accepted counts
- golden v0.5 and v0.6.0: 10 each, in 5 zones
- confidence snapshot v0.7: 51, in 5 zones
- browser-chrome 53; browser-x1-chrome 334; test-paging-chrome 59, with no accepted count recorded (deferred item R2)

**BLOCKED:** test-fglt-note, test-forecast-conf, test-supplier-eligibility and phase2-comparison.
**REDUCED:** test-phase1 (57 of 125) and test-uom (110 of 164).
- All six need historical v0.6 material that is not available. They are not passes.

**Switch confirmed.** With the real tag, the guard reports its baseline as `v0.7-tests-approved-6 = e65600c`. All five FAILs that Tag-5 reported against this tree have cleared. CI no longer judges this release line against Tag-5.

**Browser and export checks.**
- The full tier's Chrome tests ran in CI and locally: browser-chrome, browser-x1-chrome and test-paging-chrome.
- The separate manual export check (0 NaN cells) and the performance timing were not repeated. The application code is identical to `3822045`, where they were done (`verification/tag6-r4-20261122`).

**Protection, checked after the tag:**
- Tags v0.6 and Tag-1 to Tag-5 are unchanged. Tag-5 is still `f0e81bb`.
- `development/v0.7` (`eddf09b`, Stage 2), `x1/accepted-20261121` (`a4e05e8`), `main` (`8117c72`), `release/v0.6` and `recovery/stage3-unaccepted-20261116-19` (`0d71aab`) are unchanged.
- Between Tag-5 and Tag-6:
  - no file was deleted;
  - no existing snapshot, fixture, characterisation or log file was changed, apart from the documented re-hash of `tests/snapshots/README.md`;
  - the snapshot change is additive: new files are protected and the old ones are kept.
- These copies verify against their checksum files: the recovery copy (`RECOVERY.sha256`), the X1 r2 tree (730 files), the Tag-5 tree archive and the Stage 3 baseline manifest.
- The guard is unchanged apart from its default tag name, and it reads its rules from the approved tag.
- **Difference from the previous protection report:** only the new tag `v0.7-tests-approved-6`, plus the record branches `release-records/tag6-20261122` and `ci/candidate-verification-tag6-20261122`.

**Artefacts.**
- The local runs were made in a throwaway clone (`/tmp/pt6`). That run's screenshot folder stayed in the clone.
- The working repository was not touched.
- Evidence copies: `post-tag-evidence/`. The CI log there has GitHub's masked `***` token lines and no secrets.

**Corrections after the tag:** none were needed.

## 6. Final status

| Status | Result |
|---|---|
| Registry block accepted (delegated) | Yes |
| Tag created | Yes, on `e65600c` |
| Release created | Yes, as a pre-release |
| CI passed (real tag) | Yes: run 44990351755 |
| Guard passed (real Tag-6, 0 pending) | Yes |
| Release technically verified | Yes, with the limitations listed in §5 |
| Deployment authorised | **No**: a separate owner decision |
| `development/v0.7` moved | **No**: a separate owner decision |
