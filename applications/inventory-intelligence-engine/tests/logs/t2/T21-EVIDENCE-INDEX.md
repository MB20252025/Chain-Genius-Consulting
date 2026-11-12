# T2.1 evidence index (12 Nov 2026)

All folders are under `tests/logs/t2/` and are append-only. Job logs are GitHub's own job logs, fetched read-only; tokens are masked (`***`).

| Item | Folder | Key facts |
|---|---|---|
| Implementation commit, expected missing-tag failure, tag verification, single re-run | `t21-20261112T005455Z-01-implementation-missing-tag-and-rerun` | Commit 0e461a6 (3 files, 8+/7-). Run 43120841015 attempt 1 failed: `couldn't find remote ref refs/tags/v0.7-tests-approved-2`. Tag `-2`, lightweight, points to 0e461a6. Attempt 2 succeeded, guard 11/11 |
| S2 live force-push rejection | `t21-20261112T005455Z-02-s2-live-force-push` | GH013 "Cannot force-push to this branch"; `test/s2-verification` unchanged at 0e461a6 |
| Test A: formatter tampering | `t21-20261112T005455Z-03-testA-formatter-tamper` | e373e4e → run 43128815957 FAIL at guard (summarise-run.js). Revert e58974a, SHA-256 matches the tag. Recovery run 43128885652 passed |
| Test B: workflow tampering, guard kept | `t21-20261112T005455Z-04-testB-workflow-tamper` | e2b8cd7 → run 43129216325 FAIL at guard (workflow). Revert 96980fd, SHA-256 matches the tag. Recovery run 43129281435 passed |
| S1/S2/S3 configuration (listing) | `t21-20261112T005455Z-05-rulesets-config` | All active, bypass lists empty. S3 = deletion + non_fast_forward (owner design) |
| T2 regression: full tier, run-all.sh SHA-256 | `t21-20261112T005455Z-06-t2-regression` | `FULL: PASS 31 \| FAIL 0 \| BLOCKED 5 \| REDUCED 2 \| ERROR 0`; run-all.sh = T1 = 5cce88ba… |
| T2 regression: trigger checks, README run | `t21-…-07-regression-trigger-checks-and-readme-run` | Evidence-only commit 70f2ed5: no new run. README commit 00d9d55 → run 43131017835 passed |

Documentation: `tests/README.md`, section "T2.1 — baseline tags, protected files and release procedure".
