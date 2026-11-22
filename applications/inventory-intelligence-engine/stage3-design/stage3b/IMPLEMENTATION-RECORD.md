# Stage 3B – implementation and phase acceptance record

This record is added to phase by phase and never rewritten.
- **Authority:** owner's "Chain Genius SCIE — Formal Stage 3B Authorisation", 22 Nov 2026, 20:39.
- **Design:** `stage3-design/stage3b-readiness/STAGE3B-BLUEPRINT.md`, with the amendments listed in `BLUEPRINT-AMENDMENTS.md`.

## Starting baseline (verified 22 Nov 2026, before any change)

- `development/v0.7` was at `808f877ae178a0dc62c8f8b098868a2e3e148f05`, the readiness commit.
- All 41 remote references are unchanged since the end of readiness: 33 branches, 7 tags and HEAD. `main` is at `8117c72`; Tag-6 at `e65600c`.
- The last CI run (45059735758 on `808f877`) succeeded.
- `verify-protection.sh 808f877`: all checks passed, and all 450 Tag-6 protected files are unchanged.
- The readiness records and the blueprint are present.

## Phase 0 – Foundations (no visible change)

- **Branch:** `stage3b/phase0-20261122`.
- **Commit:** see the phase report and CHANGELOG. This record cannot contain its own commit hash.

**Implemented:**
- **`js/views/contract.js`**: the data contract, the engine access point `CGVM.source()`, declarative traces, the builders (`kpi`, `total`, `table`, `bars`, `line`) and the validator. The view layer's only arithmetic is the marked counting and sort-order block.
- **`js/views/areas.js`**: view-models for **all 17 existing tabs** (54 contract objects on Northstar; 53 on Willow, where forecast accuracy is one "unavailable" object because the workbook has no Forecast_Units). It also holds the approved six-area map with Settings & Data as secondary (D-4) and the Production visibility rule.
- **`tests/test-view-contract.js`**: the contract tests. They run in the fast and full tiers, in two time zones.
- The application's screens are unchanged. `index.html` does not load the new files yet; Phase 1 adds them.

**Acceptance criteria** (blueprint G, Phase 0, plus the common criteria):

| Criterion | Result |
|---|---|
| Every view-model number equals its engine field, on 3 workbooks | **Met.** An independent resolver checks every KPI, bar value, line value and table cell on Northstar, faulty Northstar and Willow |
| A test fails if a view-model or component file contains arithmetic outside the allowed list | **Met.** Static check on `js/views/` and `js/ui/`; the detector's own self-test is included |
| The old tabs are untouched | **Met.** All 17 tabs render identically before and after view-models are built, on all 3 workbooks; `app.js` is unchanged |
| No change to any engine output | **Met** for the view layer. Results are unchanged before and after building view-models, and `js/` engine files are unchanged. The full tier (golden, confidence and same-results snapshots) is the final evidence: see the phase report |
| Unknown is never zero or NaN | **Met.** Faulty Northstar totals are marked partial (for example "144 of 150 items"), and NaN cells become null |
| Production hidden without production data | **Met** with a synthetic source. No real non-production workbook exists yet (AD-5) |
| Full tier green and guard passing | See the phase report (results recorded after the run) |
| Chrome 412 / 1280 px, 0 console errors | Not applicable: no screen changed in Phase 0. The existing browser tests run in the full tier |
| Owner's physical Android check | Not applicable to Phase 0 (no visible change). **Not performed by Claude**, which cannot test on a physical device |

**Fault-planting checks (22 Nov 2026, scratch copies only).** The contract test failed, as it should, when each of these was planted:
- arithmetic added to `areas.js`;
- a builder pointed at the wrong engine field (`R.shV` instead of `R.exV`);
- an in-place sort of an engine array (engine results and the old tabs changed);
- the "null must be unavailable" validator rule disabled.

**Coverage.**
- The 307 restored checks and 9 additional checks from readiness are unchanged.
- +128 new checks (`test-view-contract`).
- No existing test or count was reduced.

**Limitations and deferred items:**
- Forecast-chart labels are "+1 month … +12 months". Calendar labels need date arithmetic, which the view layer may not do. Phase 4 will take them from an engine-provided label list.
- The Summary's prioritised recommendation list stays in the Summary tab until Phase 5. Phase 0 exposes the figures it is built from.
