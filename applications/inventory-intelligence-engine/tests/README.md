# tests/

## T2.1 — baseline tags, protected files and release procedure

*Updated in T3 (12 Nov 2026): baseline tag `v0.7-tests-approved-3`; 12 protected files including the confidence snapshot; check-control recorded ACTIVE.*

Recorded 12 Nov 2026. Repository `MB20252025/Chain-Genius-Consulting`, branch `development/v0.7`.

### 1. Approved baseline tags

An approved baseline tag records the exact versions of the testing-control files the owner has approved.

| Tag | Points to | Contents |
|---|---|---|
| `v0.7-tests-approved-1` | `eb3111f5d25f02678db02b35e9cf4e9ab0e23a73` | T1 baseline (kept unchanged) |
| `v0.7-tests-approved-2` | `0e461a629d0aa631c92ca6682958071cdf8388e6` | T2.1 baseline (kept unchanged) |
| `v0.7-tests-approved-3` | the T3 implementation commit (created by the owner) | T3 baseline (current): adds the confidence snapshot; check-control ACTIVE |

**Creating a baseline tag (permanent procedure)**

1. The change to the control files is reviewed, committed and pushed to `development/v0.7` on its own, as one commit. Claude does not create or push baseline tags.
2. Before the tag is created:
   - `git show --name-status <commit>` lists only the reviewed files;
   - `git diff <commit>` (against the working tree) is empty.
3. The workflow run for that commit is expected to fail at the guard with `couldn't find remote ref refs/tags/<new tag>`. This is recorded as evidence and is not fixed with another commit.
4. The owner creates the tag on GitHub, on the phone:
   - Releases → Draft a new release → Choose a tag;
   - type the new name and pick "Create new tag on publish";
   - set the target to `development/v0.7`, check it shows the reviewed commit, then publish. The release entry may be deleted afterwards; the tag stays.
5. Verification, using `git ls-remote origin` only (never local references):
   - `git cat-file -t <tag>` and the commit it dereferences to;
   - the control files are read from the tag;
   - every protected reference is unchanged.
6. The failed run is re-run **once**, through the API or "Re-run all jobs". It must show all guard checks passing before Node setup, and every later step succeeding. If it fails, stop and report; do not create another tag or commit.

Existing baseline tags are never moved or deleted; S1 enforces this.

### 2. Files the guard protects

`check-control.js` is always run **from the approved tag**, never the working copy. It checks these files byte-for-byte against the tag:

- `tests/run-all.sh`
- `tests/check-protection.js`
- `tests/check-control.js`
- `tests/test-a1-wrapper-quick.js`
- `tests/package.json`
- `tests/package-lock.json`
- `tests/requirements.txt`
- `tests/summarise-run.js` (added in T2.1)
- `.github/workflows/v07-tests.yml` (added in T2.1, written as `:/.github/workflows/v07-tests.yml`; `:/` means a path from the repository root)
- `tests/snapshots/v0.7-confidence-20261112T011814Z.json` (added in T3: the confidence snapshot)

It also checks two files for weakening:

- `tests/accepted-results.json`: no test removed, no count lowered, no new BLOCKED or REDUCED entry.
- `tests/checksums.txt`: every approved line still present.

Result: 12 checks (11 until T3). `check-protection.js` separately checks 3 references and 124 frozen v0.6 test files by SHA-256.

**Permanent protected-file maintenance rule (T3 and every later stage).** Any new workflow-adjacent file must be added to `check-control.js`'s protected list **in the same commit that creates it**. That includes test runners, summary formatters, protection-check functions and workflow files. A workflow-adjacent file added without protection is a T-level blocker, not a minor omission.

### 3. How the workflow uses the baseline

`.github/workflows/v07-tests.yml` runs on every push to `development/v0.7`. It does not run when a push changes only `applications/inventory-intelligence-engine/tests/logs/**` or `…/tests/V07-TEST-RECORD.md`.

The steps run in this order:
0. Checkout.
1. **Guard:** fetch tag `v0.7-tests-approved-3` (`-2` until T3) from GitHub and run *its* copy of `check-control.js`.
2. Node.
3. Pinned packages.
4. `run-all.sh --fast` and `summarise-run.js`.
5. Evidence artifact.

If the guard fails, steps 2–4 are skipped and the run is red. Proven in T2 and T2.1:
- an altered `run-all.sh` (run 43110161774);
- an altered `summarise-run.js` (run 43128815957);
- an altered workflow file with the guard step kept (run 43129216325).

### 4. GitHub rulesets (Settings → Rules → Rulesets; all Active; all bypass lists empty)

| Ruleset | Targets | Rules | Purpose |
|---|---|---|---|
| S1 — Approved Baseline Tag Protection (27079964) | tags `v0.7-tests-approved-*`, `v0.6` | Restrict updates, Restrict deletions | Baselines and the v0.6 tag cannot be moved or deleted. Creating new tags stays possible |
| S2 — Development Branch Protection (27080313) | `development/v0.7` | Restrict deletions, Block force pushes | History cannot be rewritten or erased, so any change, including one that bypasses the guard, stays visible |
| S3 — Protected Release Branches (27081183) | `main`, `release/v0.6` | Restrict deletions ON, Block force pushes ON. **Restrict updates OFF**, Restrict creations OFF (owner design) | The v0.6 history cannot be rewritten (force-pushed) or deleted; both remain **blocked**. Ordinary direct pushes and merges (fast-forward updates) to `main` and `release/v0.6` **remain possible** for anyone with write access |

**S2 live verification (12 Nov 2026).**
- The throwaway branch `test/s2-verification` was temporarily added to S2.
- One force-push of a non-fast-forward commit was rejected by GitHub: `GH013: Repository rule violations found … - Cannot force-push to this branch`. The branch was unchanged.
- The branch was then removed from S2 and deleted.

S1 and S3 are verified by configuration listing only. No rejection was provoked against real protected references.

### 5. S3 release procedure (Stage 5, v0.7 → `main`): documentation only, not performed

**Ordinary release: S3 is NOT disabled.** S3 has Restrict updates OFF, so an approved ordinary (fast-forward) merge or push of v0.7 into `main` is allowed with S3 active. Record the merge commit, its UTC time and its author in the Stage 5 release notes.

**Only if a separately authorised operation needs something S3 blocks** (a non-fast-forward update, i.e. a force-push, or deleting `main` or `release/v0.6`), use a temporary full disable of S3. This is preferred to adding a permanent bypass entry.

1. Obtain the owner's separate authorisation for that specific operation.
2. Temporarily disable S3, and record the exact UTC time.
3. Perform only the authorised operation.
4. Re-enable S3 immediately afterwards, and record the exact UTC time.

**Bounded audit window** (applies only when S3 is disabled):
- Keep the window as short as possible: minutes, not hours.
- Record the disable and re-enable timestamps in the Stage 5 release notes.
- Log every commit, merge or push to `main` or `release/v0.6` during the window, with its timestamp and author.

### 6. Known GitHub Free limitation

On a public repository with GitHub Free, nothing available can stop someone with push access to `development/v0.7` from removing the guard step from the workflow.
- Push rulesets that restrict file paths are not available on this plan.
- `pull_request_target` workflows run only from the default branch (`main`), which must not change.
- Required review is impossible for a solo owner.

**Mitigations:**
- The guard detects any workflow change while it still runs.
- The runner's own `check-control` row (also from the tag) catches workflow changes if `run-all.sh` still runs.
- S2 keeps any such change permanently in history.

The workflow is therefore **not** tamper-proof, and T2.1 is recorded as **PARTIALLY COMPLETE** for this reason.

### FUTURE GOVERNANCE — not actioned

Before another developer or contractor is given push access, review who can push to `development/v0.7` and how workflow integrity will be protected against collaborators.

This is a future consideration only; nothing has been investigated or changed for it.

### T3 — confidence snapshot (12 Nov 2026)

`tests/snapshots/v0.7-confidence-20261112T011814Z.json` records three things for each of the 17 fixtures:
- forecast confidence (`fcCredAll`);
- `confAreas`;
- client questions.

It was created with `bash tests/run-all.sh --emit-confidence <absolute path>`. That computes every fixture in all five time zones and writes the file only if all five results are identical.

`run-all.sh` compares the current results against it: **fast tier UTC only, full tier all five zones** (85 fixture/zone combinations). The check is 17 fixtures × 3 sections = 51 per zone. Any difference is a FAIL naming the fixture, the section and the field.

The GitHub workflow still runs the fast tier only.

`check-control` is now recorded **ACTIVE**, so the recorded full-tier figures are BLOCKED 5 and REDUCED 2. The fast-tier summary now reads BLOCKED 5, which matches the full-tier result; the T2.1 inconsistency is resolved.
