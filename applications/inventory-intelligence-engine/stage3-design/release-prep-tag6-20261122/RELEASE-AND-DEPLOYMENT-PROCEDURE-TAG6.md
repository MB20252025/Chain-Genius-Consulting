# Tag-6 release and deployment procedure (prepared 22 Nov 2026)

Each step names who does it and what evidence closes it. Do not skip or reorder steps. Rollback reference for the
temporary site: `cd16dcc`. Tag-5 (`f0e81bb`) and every existing branch and tag stay untouched throughout.

| # | Step | Who | Done when |
|---|---|---|---|
| 1 | Owner decisions on the decision record (items 1–12) | Owner | Written answers recorded in `OWNER-DECISIONS-TAG6.md` (Claude writes them down verbatim) |
| 2 | Build the final candidate | Claude | Branch `candidate/tag6-final` with: `43b6b55` + `40730de` (documentation) if all recommended options are chosen; otherwise + the authorised changes, each with tests. No unapproved change, no deferred work, no paging proposal unless approval 2 says "into Tag-6" |
| 3 | Invalidation check | Claude | If any "yes" item in the record was rejected or changed, `43b6b55` is recorded as INVALID for Tag-6 and steps 4–7 are done on the new commit |
| 4 | Human calculation checks (5 worksheets) | A person other than Claude | Signed worksheet. Any disagreement is a **blocker**: Claude investigates, the owner adjudicates, and expected results are never edited to match |
| 5 | Freeze | Claude | Final commit SHA stated; no further commits on that branch |
| 6 | Verification of the frozen SHA | Claude | All of the below |

Step 6 checklist:
- (a) local full tier on a clean checkout;
- (b) `candidate verification` CI pinned to the SHA (new `ci/` branch), fast and full tiers;
- (c) guard: FAIL only on the items listed in approval 1, and no new ones;
- (d) counts match the registry, reported as "N tests passed (+ pre-flight)";
- (e) r1/r2 baselines and the recovery copy re-verified;
- (f) every remote ref compared with the record.

| # | Step | Who | Done when |
|---|---|---|---|
| 7 | Tag-6 approval | Owner | Explicit written approval naming the exact SHA |
| 8 | Create Tag-6 | Owner | Tag `v0.7-tests-approved-6` on that SHA, created through GitHub Releases (tag pushes are blocked from Claude's sessions). Note: the web flow makes a lightweight tag and a `release/…` branch |
| 9 | Post-tag verification | Claude | Tag on GitHub points at the SHA. CI with the guard reading **Tag-6** passes the guard (no FAIL, no PENDING). Full tier: the same results as step 6 |
| 10 | Release build | Claude | Site rebuilt with `BUILD-SITE.sh <repo> v0.7-tests-approved-6 <site>` on branch `deploy-candidate/<SHA>`; `SOURCE-MANIFEST.sha256` matches the tagged files |
| 11 | Smoke test | Claude | Chrome at 412 px and desktop: Northstar loads, totals match the worksheets, no console errors, wording checks pass. Plus your own Android check, if you want one |
| 12 | Deployment approval | Owner | Separate written approval naming the build commit |
| 13 | Deploy | Claude | One normal commit on the site's `main` on top of `cd16dcc` (no force-push), then confirm Pages serves the new title and the `app.js` hash |
| 14 | Rollback, if needed | Claude | `git revert <deploy commit>` on `main`, push, and confirm the site serves `cd16dcc`'s files again. Recorded either way |

Not part of this release: the main consultancy site (`main` / `v0.6` at `8117c72`), Stage 3B, Stage 3C, CIS,
forecast-based excess and route alignment.

## Current position (22 Nov 2026)

| Step | Status |
|---|---|
| 1 | Awaiting owner decision |
| 2–3 | Prepared: candidate `43b6b55`, documentation `40730de` |
| 4 | Worksheets ready; not started (needs a person other than Claude) |
| 5–14 | Not started |

Deployment branches:
- `deploy-candidate/dc16902` (`edb4611`): **STALE**, built from `dc16902`, kept for traceability only.
- `deploy-rehearsal/43b6b55` (`734d721`): rehearsal only. Its runtime files are byte-identical to the
  `dc16902` build, and it passed the smoke test. It is **not** the release build (step 10).
