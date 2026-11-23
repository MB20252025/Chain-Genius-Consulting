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

### Phase 0 defect found by the full tier, and its correction (22 Nov 2026)

**First full tier on `7090385`:** 59 tests passed (+ pre-flight) of 66, with **1 FAIL**.
- The failure was `test-a1-static`: "`js/views/contract.js` does not touch CFG, R or WB".
- The Universal Import rule (A1) allows only the engine files to touch the shared state. `CGVM.source()` read `R` and `CFG` directly, so the rule was correctly broken.

**Correction (next commit):**
- A new read-only accessor, `CGEngine.current()`, in `js/engine/engine-api.js`. It hands the view layer the results already calculated, with no new calculation and no recalculation.
- `CGVM.source()` now reads engine state only through it. The A1 rule is unchanged.

Two accepted counts rise as a consequence. Both are genuine growth and PENDING, and nothing was weakened:
- `test-a1-static`, 30 → 32: one rule-2 check per new `js/` file, as its existing note prescribes.
- `test-a1-sync-path`, 76 → 78: `current()` brings `SETDEF` and `x1Sum` onto the checked engine path, and both are verified synchronous.

`CGEngine.version` stays `v0.7-a1`, which two tests require. The engine-API tests still pass at their counts: `test-a1-wrapper-quick` 117, `test-a1-state` 10, `test-a1-sync-path` 78.

## Phase 1 – step 1: specification freeze, shared calculations, navigation map v1 (23 Nov 2026)

**Authority:** owner instruction "Stage 3B — Approved Navigation, Visual Design and Implementation Instructions" (01:14, resent with the images at 01:19).

**Step 1a – shared calculation sites (N-4), commit `8b3eb90`.**
- Ten sites were moved verbatim into `CGShared`.
- Three separate guarantees are proven: verbatim move 16/16; 3,038 values identical at full precision; 748 tab renders byte-identical.
- No fallbacks were needed. See `SHARED-CALCULATIONS.md`.
- Sequencing note: this commit came *before* the specification freeze. The owner's sequence listed the freeze first. Nothing depended on the order, and the frozen v1 records the corrected site inventory.

**Step 1b – specification frozen, commit `fbf7359`.**
- `SCIE-NAVIGATION-AND-SCREEN-SPEC-v1.md` is the approved version; the proposal is preserved.
- N-1 to N-6 and the clarifications are in `ARCHITECTURE-DECISIONS.md`.
- The owner's two visual references are in `visual-reference/`, marked illustrative.

**Step 1c – navigation map v1 and tests (next commit).** The Phase 0 map is superseded:

| | Phase 0 map (D-4 version, `e0b261f`) | Approved map v1 (spec v1) |
|---|---|---|
| Object | `CGVM.AREAS`: 7 flat areas, each a list of tabs | `CGVM.NAV`: `primary` (6 areas → subsections → tabs), `utility` (3 areas), `advanced`, `filterScope` |
| Overview | tabs `[Overview]` | `direct: true`; one subsection, "Executive dashboard" |
| Inventory | FG, Materials, Health, Excess | Stock position (FG + Materials) · Stock health & ABC (Health) · Excess & dead stock |
| Demand & Planning | Demand forecast, Forecast accuracy, Reorder policy, **Policy comparison** | Demand forecast · Forecast accuracy · Safety stock & reorder points (Reorder policy) |
| Procurement & Suppliers | MRP, Suppliers | What to buy (MRP) · Supplier performance (Suppliers) · **On-order reconciliation** (section, original tab Data quality) |
| Production | Production feasibility (conditional) | Production feasibility · **Schedule attainment** (section, original tab Suppliers); conditional |
| Scenarios & Recommendations | Summary | Recommendations & management summary (Summary) · **Policy & supply-source comparison** (Policy comparison) |
| Outside the six | one secondary area, "Settings & Data" (Settings, Data quality, Client questions, Data confidence) | **three utility areas:** Reports (Management report – source Summary; Engine output workbook) · Data Management (Load workbook; Data quality; Client questions; Data confidence) · Settings (Thresholds & assumptions) |
| Advanced view | implied by D-6 | explicit `NAV.advanced`: all 17 original tabs |
| Original-tab links | none | every subsection has `original` (the real source tab) |
| Filters | none | `filterScope: 'area'`: kept within an area, reset between areas, never global |
| Functions | `areas(S)`, `forArea(S, area)` | `primary(S)` (Production filtered by eligibility), `find(area, sub)`, `forSub(S, area, sub)` |

**View-model area labels changed accordingly:**
- the data-quality, client-questions and data-confidence view-models → Data Management;
- settings → Settings;
- policy comparison → Scenarios & Recommendations.

The Phase 0 map remains readable in git history at `e0b261f` (`js/views/areas.js`).

**Tests:**
- `test-view-contract` goes from 128 to 154 checks. It checks the v1 structure exactly, that each tab has one home, original-tab links, the Reports source, filter scope, Production eligibility on each of its three rules, view-model area labels, and access to `CGShared`.
- `test-a1-sync-path` goes from 78 to 81 (`CGShared`, `gbp`, `minC` on the engine path).
- `check-globals` goes from 124 to 125 (`CGShared`).
- All three rises are PENDING growth.

**Coverage check (owner §15).** The registry holds, unchanged:
- `test-h1-fglt-note-current` 3;
- `test-h2-forecast-conf-current` 5;
- `test-h3-supplier-eligibility-current` 299;
- `test-h2-level-shift-spec` 9.

That is **307 restored + 9 additional = 316**, matching the readiness record. There is no discrepancy.
