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

**Full tier on 9a2215c** (fresh clone, 23 Nov 2026): 60 tests passed (+ pre-flight) of 66; 0 FAIL, 0 ERROR; the six
accepted historical limitations unchanged (4 BLOCKED, 2 REDUCED). The protected browser tests are part of this tier.
Fast tier: 41 of 41. Smoke check: 63 screen visits at 1280, 768 and 412 px, no console errors, no page overflow.

## Phase 2 completion: chart months, S12–S15, phone labels, performance (24 Nov 2026; owner authorisation of 24 Nov)

**Start:** local `HEAD` and `origin/development/v0.7` both at 6ae3f63 (checked before any change); work done on
`development/v0.7` only; only `development/v0.7` pushed.

**1. Missing-month chart** (`chart-investigation/README.md`): suspected "recorded forecast drawn early" not
reproduced; four display defects found and corrected (A: original chart hid the recorded forecast when a month was
missing; B: both charts started the forecast a month late after a missing last month; C: new chart repeated a duplicate
month's first recorded value; D: new chart month labels a month early west of UTC). Fixture
`tests/fixtures/forecast-gaps/` (protected). Render comparison against 6ae3f63: of 986 tab renders only the fixture's
Demand forecast chart differs (2); of 1,407 product charts only the fixture's four products with missing months.
Engine-level observations recorded for the owner (duplicate month rows treated as separate periods; a product with a
missing last month is forecast from that month, so its "next 3 months" start a month earlier).

**2. S12–S15** (`SHARED-CALCULATIONS.md` §7): moved verbatim into `CGShared` and proven (G1 7/7; G2a 16,652 values;
G2b every item: S12 3,314, S13 3,328, S15 9,972, S14 9,044 sweep cases; G3 1,156 renders; 0 failures) with five
synthetic edge workbooks; independent comparators on the new screens. Now shown: 3-month range (Demand forecast table),
bias £ at cost (Forecast accuracy table), the consistency warning (Forecast accuracy), the Why column (Safety stock &
reorder points).

**3. Phone chart labels** (AD-16; `ui-evidence/chart-labels-20261124.txt`): method names were cut off below about
460 px of chart width (Chart.js gives the label axis at most half the chart). They now wrap between words there; wider
charts are unchanged. The sweep also found charts that silently skipped labels at every width (supplier charts, cover
against lead time, orders by supplier) and charts with up to 233 bars at 5,000 items; all now draw every label, and
long rankings show a named top or bottom 10–15 with the full list in the table. Checked: 13 widths from 320 to 1,920 px,
rotation 412 → 915 → 412, and the 5,000-item workbook; 0 problems.

**4. Proof re-runs after each shared-code change:** S11 (baseline dcf6308 with the identical chart correction applied by
`chart-investigation/apply-chart-correction.js`): 0 failures, 467,315 leaf values, 986 renders. S1–S10 (baseline
e0b261f, same): 0 failures, 3,178 values, 782 renders. Raw runs against the uncorrected baselines differ only on the
fixture's Demand forecast chart (2 G3 lines), as expected; both are kept.

**5. Performance** (`ui-evidence/perf-5000-phase2-completion-20261124.txt`; same machine, alternating, Phase 2 code
vs current code): three regressions introduced during this work were found and fixed before commit (AD-15). Final:
`analyse()` median 725 ms (Phase 2 code 727 ms today; 587 ms in the Phase 2 report, a less loaded session); slowest
screen 105 ms cold / 193 ms warm (Phase 2 code 211 / 211 ms today; 168 ms in the Phase 2 report); no run over 300 ms.
Safety stock & reorder points is about 20–30 ms slower than in Phase 2 because it now builds the S15 explanations for
the rows it shows, as the original tab does.

**Tests:** `test-view-contract` 402 → 745, `test-a1-sync-path` 83 → 85, `check-protection` 459 → 461 (PENDING).

**Final verification on 0e269b7** (fresh clone, 24 Nov 2026): full tier 60 tests passed (+ pre-flight) of 66; 0 FAIL,
0 ERROR; 4 BLOCKED and 2 REDUCED, the accepted historical limitations, unchanged. Protected browser tests:
`browser-chrome` 53, `browser-x1-chrome` 334, `test-paging-chrome` 59. Proofs on the committed code: S1–S10, S11 and
S12–S15 all 0 failures. Smoke check: 63 screen visits at 1280, 768 and 412 px, 0 console errors (Settings opens the
original tab by design). Chart labels: 0 problems after the performance fixes, rotation included.

## Phase 3: duplicate months, missing months, global forecast boundary (25 Nov 2026; owner authorisation "Phase 3: Fresh Implementation")

Started from verified `bd61ae7`. The earlier report of commit `e7a4b1d` was false: that commit does not exist, and it
was reported as such on 25 Nov 06:16.

- **Engine:**
  - `prepDemand` + `DUPDEC` in `calculations.js` (AD-17);
  - calendar windows for `m`/`tr`;
  - `R.boundary`, `R.dsId`, `R.dups`, `R.demandBadDate`, `R.fg[].gap`;
  - `forecasting.js` `fcast` rewritten on calendar positions (`calObs`, `fnC`, `olsP`, `seasnP`; `gapSeg` removed;
    AD-18);
  - `F.start`, `F.lead`, `F.na`, `F.act12n`.
- **Wrapper:** `CGEngine.duplicates` (`decide`, `forget`, `reload`, `storageOK`, `key`). It records decisions only;
  the screen re-runs `run()`. An earlier draft re-ran inside the wrapper, which pulled 27 screen functions onto the
  engine's synchronous path (sync-path 91 → 118). It was rejected and reverted.
- **Screens:**
  - new subsection Data Management › Duplicates & gaps (bespoke screen; buttons in the first column so they stay
    visible on a phone);
  - chart and timeline forecast after the boundary;
  - a note on the chart for an undecided duplicate.
- **Engine-map conflict avoided:** reading `Customer_Orders` by name would have broken the protected
  `import-engine-map`. The group rows carry each whole record (`rec`) instead.
- **Protected-test conflict:** `test-x1-wp5.js` lines 86 and 90 assert D6 behaviour, which rules D/F supersede
  (forecast from the last 7 consecutive months; refusal with 3 consecutive months). The test is unchanged and fails
  2 of 56. Smallest safe resolution: owner-approved supersession of those two assertions, keeping their intent
  (missing ≠ zero; a forecast never silently crosses a gap). Proposed wording is in the Phase 3 report.
- **Evidence:** `stage3-design/stage3b/phase3/`.

## Phase 3 follow-up: outstanding decisions (27 Nov 2026; owner "Phase 3 – Outstanding Decisions and Completion")

Started from `9765b33`.

- **Item 1, x1-wp5.**
  - Lines 86 and 90 were superseded one-for-one, as approved, with comments in the test and a re-hashed checksum line.
    The count is unchanged at 56.
  - **Guard interaction:** check-control (taken from Tag-6) treats any change to an approved checksum line as
    CHANGED/FAIL, and CI runs the guard first. CI therefore cannot pass until the next baseline tag approves the line,
    via the documented switching commit and Tag-7. No new tag was created (not authorised).
- **Item 3, minimum history.**
  - `fcast`: the product gate is now the smallest method minimum (3). Levels and tier are explained in `tierWhy`.
  - Comparison-set rule in the back-test.
  - Wording updated in both the original tab and the new screen; a new KPI counts forecasts of limited reliability.
  - test7 line 124 (protected) asserts the old gate. Proposed patch:
    `stage3-design/stage3b/phase3/PROPOSED-test7-line124.patch`. Not applied (the owner's instruction: further
    protected-test changes stay pending).
  - Found during the wider sweep:
    - Willow's six one-gap products are now forecast;
    - WF-E110 had been left untested by the shared-month rule, which led to the comparison-set rule;
    - 24–26 seasonal months improved, so the "unchanged" claim was corrected.
- **Item 2, saved decisions.**
  - Identity uses identifiers only. Fingerprints use calendar days, trimmed text and ignore empty cells.
  - The v1 format is still read; v2 is written.
  - New `related`/`adopt` and `exportText`/`importText` (the engine stays synchronous; the file is read in the shell).
  - New "Your saved decisions" panel on Duplicates & gaps.
- **Test-oracle fix:** the Phase 3 test's "month as displayed" helper failed in Asia/Kolkata. SheetJS reads local midnight
  10 s early there, and the engine is right. The test now rounds to the nearest local day; it passes in 5 time zones.
- **Remote:** `origin` set to `https://github.com/MB20252025/Chain-Genius-Consulting.git`, after GitHub's API confirmed
  this canonical name.

## Phase 3 completion: Tag-7 preparation (27 Nov 2026; owner "Phase 3 Completion – Prepare Tag-7")

- **Section 9 safety check** (`tests/test-view-contract.js` §9; lines 370–415 at bd61ae7 against 371–418 at fc08021):
  - no protection was weakened;
  - expectations changed only where rules A, D, E and F require;
  - coverage grew from 24 to 32 checks.

  The comparison was sent to the owner before any change.
- **test7:** the three-boundary replacement was applied (118 → 120).
- **Gap warning:** `gapTxt` no longer ends with a blanket method clause. `fcast` appends the exact excluded methods. The
  helper is local to `fcast`, so there is no new top-level name (check-globals and sync-path unchanged).
- **Records:**
  - V07-TEST-RECORD "Phase 3 completion": decisions, retrospective acceptance, and the incremental rule from Tag-8;
  - AD-21;
  - `stage3-design/tag7/REGISTRY-ASSESSMENT-TAG7.md`;
  - tests/README: the per-phase acceptance rule.

