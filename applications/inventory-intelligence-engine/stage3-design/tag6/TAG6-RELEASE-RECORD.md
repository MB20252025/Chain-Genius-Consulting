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

## 4. Tag and Release: NOT CREATED (blocked, 22 Nov 2026)

- **Attempt:** GitHub REST `POST /repos/MB20252025/chain-genius-consulting/releases`:
  - `tag_name` v0.7-tests-approved-6;
  - `target_commitish` e65600cf7b74f7f25ec73ec24ef9fae1d648c619;
  - pre-release, as for Tag-5.
- **Result:** HTTP 403: "Creating, editing, or deleting releases is not permitted for this session type." This is a platform restriction on this session.
- Tag pushes from this session were already known to be blocked by the proxy. No browser route was connected.
- The restriction was not worked around. No other route (a git-refs API call, a tag push, another commit) was tried.
- **Checked afterwards:** no `v0.7-tests-approved-6` tag, no Tag-6 release and no `release/v0.7*` branch exist. Nothing partial was created.

**Still to do (the owner, GitHub web, Releases → Draft a new release):**
- **Tag:** `v0.7-tests-approved-6`, as a new tag.
- **Target:** the commit `e65600c`. Select branch `candidate/tag6-20261122-r4`, whose tip is that commit. Do **not** choose `development/v0.7`.
- **Title:** "Supply Chain Intelligence Engine v0.7 — T6 Tests Approved".
- **Options:** tick "Set as a pre-release" and leave "Set as the latest release" unticked, as for Tag-5.

## 5. Post-tag verification: NOT RUN

Requires the real tag. A local simulation exists (`verification/tag6-switch-20261122`) but is **not** a substitute and is not reported as post-tag evidence.
