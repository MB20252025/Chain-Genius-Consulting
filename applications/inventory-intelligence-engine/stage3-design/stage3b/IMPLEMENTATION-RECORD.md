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

## Phase 1 step 2: presentation layer (23 Nov 2026; commits 724e1b3, 89098e4, dfc9343)

**What was built.** Design tokens and layout (`css/scie.css`), Chart.js 4.6.1 (`assets/vendor/chartjs-4.6.1/`, MIT,
npm integrity recorded in `SOURCE.md`), and four presentation files: `js/ui/format.js` (display formatting; unknown values
shown as "Unavailable"), `components.js` (cards, panels, tables, charts, recommendations), `screens.js` and `shell.js`.
Loader and screen placement: AD-9 to AD-11.

**Screens.** Bespoke: Overview; Inventory (Stock position with products/materials switch and filters, Stock health & ABC,
Excess & dead stock); Reports (Management report, Engine output workbook); Data Management (Load workbook). Every other
subsection uses the generic layout built from its view-models. Settings opens the original Settings tab.

**Open item: Excess value cards.** The uncommitted and physical value cards on Excess & dead stock come from an eleventh
inline calculation (S11, `uc × cost` in the original Excess tab), found while building the screen. Until it gets the
same three-part proof as S1–S10, the cards show a "See original tab" link and no figure (spec v1 §10.3 fallback).

**Tests.** `test-view-contract` 154 → 202: the independent resolver now covers shared, band, entry and ordered-row
traces; the two section view-models; anchors against the original tab code; real engine field names for every table
column; and the loader (section 8). Rule-prescribed rises: `check-globals` 125 → 126 (`SCIE_UI`); `test-a1-static`
32 → 36 (four `js/ui` files); `test-a1-sync-path` 81 → 82 (`bucket`, now handed over as `coverBands`). All PENDING.

**Full tier.** The first run on 724e1b3 (fresh clone) found two ERRORs in protected browser tests, `browser-chrome` and
`test-paging-chrome`: choosing an original tab did not show the original page (AD-10). Fixed in 89098e4 without changing
any test; both then passed at their accepted counts (53 and 59), and `browser-x1-chrome` passed 334.

**Performance (5,000 items, `ui-evidence/perf-5000-20261123.txt`).**
- `analyse()`: median 906 ms (Tag-6 tree on the same machine: 871 ms). Under the 2 s target.
- Import to "Analysed.": about 5.0–5.2 s (Tag-6 tree: 4.8 s). This is mostly the full engine run (three analyses,
  `V07-PERF-BASELINE.md`); the new screens add about 0.2–0.3 s for the first draw.
- Screen switching: all 21 subsections 53–97 ms after AD-11 (before: up to 798 ms). Under the 300 ms target.
- "Show all 1,667 rows" on Stock position: about 0.6 s (a user's request, not a screen switch).

**Smoke check** (`ui-evidence/smoke.js`): 63 screen visits at 1280, 768 and 412 px, no console errors, no page-level
overflow, no "NaN" or "undefined" text.

**Full tier on dfc9343** (fresh clone, 23 Nov 2026): 60 tests passed (+ pre-flight) of 66; 0 FAIL, 0 ERROR. The other six are
the accepted historical limitations (4 BLOCKED, 2 REDUCED; KNOWN-LIMITATIONS 19), unchanged. Fast tier on b0432c7: 41 of 41.

## Phase 2: S11, Demand & Planning, Procurement (23 Nov 2026; owner's Phase 2 authorisation, 12:11)

**Start:** HEAD and `origin/development/v0.7` both at dcf6308. Work was done on a local branch that was not pushed;
only `development/v0.7` is pushed (the owner has not yet confirmed that all three preview addresses require sign-in).

**S11** (SHARED-CALCULATIONS §5): moved into `CGShared.excessModel`, proven G1 3/3, G2 224 records (453,313 leaf
values), G3 952 renders, with six synthetic edge workbooks. The Excess screen now shows the uncommitted, physical and
potential excess value cards, items listed, negative on-hand count and the full listing.

**Demand & Planning** (bespoke screens):
- *Demand forecast*: totals (S7), trend counts, forecast / not-forecast counts; product selector; demand timeline
  (calendar-month history, recorded workbook forecast placed on its own month, statistical forecast and 80% band);
  back-test WAPE by method; forecast confidence; forecasts needing attention; all products with S8. The S12 range
  column is left out.
- *Forecast accuracy*: average accuracy (S9), assessable, high-accuracy count (S9), over/under/balanced, "existing
  beats statistical", accuracy and bias charts, data quality and confidence, the full assessment table in the tab's
  order, with bias and data-quality filters. S13 and S14 are left out. Willow (no Forecast_Units) shows "unavailable".
- *Safety stock & reorder points*: verdict counts, verdict mix, largest "too low" gaps (workbook vs calculated ROP),
  products/materials tables with a verdict filter. S15 is left out.

**Procurement & Suppliers** (bespoke screens):
- *What to buy*: order now / soon / net requirement / total replenishment (S5, partial exactly when the tab says so) /
  Not Assessed; the Order now list; status mix; order now/soon by supplier (counts); material availability (cover vs
  lead time, the Stock position chart); all MRP lines with status and supplier filters.
- *Supplier performance*: high/medium risk, at-risk materials, limited evidence, Not Assessed; score; on-time vs fill;
  stated vs observed lead time; procurement actions (the Summary's own recommendations about purchasing, in its order);
  the scorecard in the tab's order with a risk filter. Per-PO lists stay deferred (M-1, N-6).
- *On-order reconciliation*: the Phase 1 section view-models in a bespoke layout with a gap-direction filter.

**Engine API:** `CGEngine.current()` also returns `methodNames` (the existing `FNAME` labels). No engine calculation
changed; `calculations.js` and `forecasting.js` unchanged.

**Finding, original chart (unverified as a defect):** the original Demand forecast chart draws the recorded workbook
forecast (`x.fc`, one value per valid history row) at row positions on a calendar-month axis (`x.hc`). When a product's
history has a missing month, the recorded forecast would be drawn one or more months early. The new timeline places
each recorded value on its own month (`x.hd`). The original chart is unchanged.

**Tests:** `test-view-contract` 326 → 402; `test-a1-sync-path` 82 → 83 (FNAME). PENDING. Order anchor caught a real
difference during building: the Forecast accuracy tab puts products without an accuracy first, not last; corrected.

**Performance (5,000 items, `ui-evidence/perf-5000-phase2-20261123.txt`):** `analyse()` median 587 ms; every screen
switch 156 ms or less cold, 168 ms or less warm (21 subsections); import to "Analysed." median 3.8 s (engine-bound).
