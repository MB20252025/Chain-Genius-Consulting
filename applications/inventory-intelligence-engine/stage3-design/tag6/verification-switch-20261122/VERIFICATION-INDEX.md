# Verification of the Tag-6 switching commit (22 Nov 2026)

**Proposed for Tag-6:** `e65600cf7b74f7f25ec73ec24ef9fae1d648c619` (`candidate/tag6-20261122-r4`), child of `3822045`.
It changes only 5 control and record files (`00-identity.txt`): the workflow's TAG, the registry's check-control tag, the
guard's default tag, `tests/README.md` and `V07-TEST-RECORD.md`. Its application files are byte-identical to `3822045`. So
`3822045`'s browser, export, performance and owner-checked-figure evidence applies unchanged
(`../verification-r4-20261122/`).

| Check | Result | File |
|---|---|---|
| Guard against Tag-5 (explicit `--tag …-5`) | exit 1; **5 FAIL**: the 3 earlier ones, plus `check-control.js` and the workflow changed by the switch; PENDING 50 | `guard-vs-tag5.txt` |
| **Pre-tag** CI run **44987012577** (pinned SHA, GitHub runner) | fast: 39 tests passed (+ pre-flight) of 40, **ERROR 1**. full: 54 passed (+ pre-flight) of 61, **ERROR 1**, BLOCKED 4, REDUCED 2, FAIL 0. The ERROR is `check-control`: "cannot read check-control.js from approved tag v0.7-tests-approved-6" (it does not exist yet) | `ci/ci-44987012577-e65600c.log` |
| Pre-tag fast tier, local | 39 passed (+ pre-flight) of 40; ERROR 1 (same cause) | `fast-pre-tag-summary.txt` |
| **Simulated post-tag**: tag created ONLY in a local mirror, never on GitHub | guard from the simulated Tag-6: **12 passed, 0 failed, 0 PENDING**. Full tier (`--remote sim`): **55 tests passed (+ pre-flight) of 61; FAIL 0; ERROR 0; BLOCKED 4; REDUCED 2**; check-control 12/12 | `guard-SIMULATED-post-tag6.txt`, `full-SIMULATED-post-tag6-summary.txt` |
| GitHub refs | no `v0.7-tests-approved-6` on GitHub; Tag-5, tags 1–4, v0.6, `development/v0.7`, `x1/accepted-20261121`, `main` unchanged | `remote-refs.txt` |
