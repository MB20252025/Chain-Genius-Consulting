# Stage 3B – architecture and owner decisions

This record is added to, never rewritten: each entry is dated. The authoritative design is `stage3-design/stage3b-readiness/STAGE3B-BLUEPRINT.md`.

## Owner decisions

The owner approved these on 22 Nov 2026, 20:39, in "Chain Genius SCIE — Formal Stage 3B Authorisation". They were recorded by Claude.

| ID | Decision (as approved) | When it applies |
|---|---|---|
| D-1 | APPROVED. Remove the four unrecoverable BLOCKED historical entries from the active registry. Record test-phase1 and test-uom at their runnable counts (57, 110). Preserve every original record and the dated disposition. Never represent an unrecoverable test as passed. | Tag-7 cycle only |
| D-2 | APPROVED IN PRINCIPLE. The ten readiness test additions go into the next protected baseline, subject to normal Tag-7 verification and acceptance. Not to be moved into the guard, and no Tag-7, during Stage 3B. | Tag-7 cycle only |
| D-3 | APPROVED. The guard must fail on unrecognised status words. The protected guard is not modified during Stage 3B. | Tag-7 cycle only |
| D-4 | APPROVED. Six-area navigation: Overview, Inventory, Demand & Planning, Procurement & Suppliers, Production, Scenarios & Recommendations. Production is hidden when the business has no production. Settings & Data is reachable outside the six areas. | Stage 3B |
| D-5 | APPROVED. Chart.js, stored locally at a pinned version, with no CDN or external service. Chart components are reusable and separate from calculations. | Stage 3B |
| D-6 | APPROVED. The 17 existing tabs remain as an Advanced view at first. The new navigation is the principal experience. The Advanced view must not duplicate calculation logic. The future retirement phase is documented (see AD-6 below). | Stage 3B |
| D-7 | APPROVED. Full scenario comparison stays at milestone M5. Stage 3B covers recommendations only. | Stage 3B |
| D-8 | NOT AUTHORISED as a workstream. No further searching for the v0.6 zips unless new evidence makes it worthwhile. The historical-test disposition stands. | — |

## Architecture decisions

- **AD-1 (22 Nov 2026): one engine access point.**
  - `CGVM.source()` in `js/views/contract.js` is the only place the view layer reads engine state.
  - It reads exactly what the existing 17 tabs already use: `R`, `mrp()`, `feas()`, `fcAll()`, `fcCredAll()`, `qs()`, `confAreas()`, `CFG`, `SETDEF` and `x1Sum`.
  - So the new screens and the Advanced view share one source, and no calculation logic is duplicated (D-6).
  - Alternative rejected: calling `CGEngine.runEngine()` separately for the new UI. That would mean a second analysis run and the risk of two results disagreeing.
- **AD-2: charts never calculate. The view layer has no arithmetic, and this is enforced.**
  - The only arithmetic in `js/views/` and `js/ui/` is one marked block in `contract.js`, holding counting and sort order.
  - `tests/test-view-contract.js` strips strings, comments and regular expressions, then fails on any arithmetic operator, `Math.`, `.reduce(`, `Number(` or `parseFloat(` elsewhere.
  - Money totals use the existing `x1Sum` (the D4 partial-total rule), never a new sum.
- **AD-3: declarative traces.**
  - Every number in a view-model carries a `trace` (a field path, a count with conditions, an `x1Sum` partial total, or a row source).
  - The contract test resolves every trace with its own independent code and requires exact equality on three workbooks.
  - Builders use the same trace to obtain their values, so a view-model is literally generated from its own provenance.
- **AD-4: unknown is never zero and never NaN.**
  - A KPI with no engine value is `null` and marked `unavailable`, with a reason.
  - A partial total is marked `partial`, with included, of and excluded counts.
  - A table cell holding NaN or Infinity becomes `null`, as the exports already do.
- **AD-5: Production visibility** is decided by data. Production is shown only when there is a BOM, production history or production orders.
  - Every current workbook has production. The engine is manufacturer-only, and B14 (wholesale/resale) is deferred.
  - So hiding is tested with a synthetic source. A real non-production workbook becomes possible when B14 is decided.
- **AD-6: Advanced view and its retirement.**
  - The 17 tabs stay byte-for-byte as they are. The contract test proves that building view-models changes neither their HTML nor the engine results.
  - **Intended retirement:** blueprint phase 6, once a facts checklist shows that every fact on every old tab is reachable in the new areas. Retirement then needs its own owner decision; until then the Advanced view stays.
- **AD-7: tests of current behaviour are never mixed with historical comparisons.**
  - This is the owner's Stage 3B test-architecture rule.
  - All Stage 3B tests test current behaviour only.
  - A missing historical comparison can never block them.

- **AD-1 amendment (22 Nov 2026, after the first Phase 0 full tier): engine access goes through the engine API.**
  - The view layer may not touch `CFG`, `R` or `WB` (`tests/test-a1-static.js`, rule 2).
  - `CGVM.source()` therefore calls `CGEngine.current()` (new, read-only, no recalculation) instead of reading the globals.

## Navigation decisions (owner, 23 Nov 2026)

Source: "Stage 3B — Approved Navigation, Visual Design and Implementation Instructions" (01:14, resent with the images at 01:19). Recorded by Claude.

| ID | Decision | Ruling |
|---|---|---|
| N-1 | Navigation structure: six primary areas and the subsection mapping in `SCIE-NAVIGATION-AND-SCREEN-SPEC-v1.md` | APPROVED |
| N-2 | Policy & supply-source comparison under Scenarios & Recommendations | APPROVED |
| N-3 | Schedule attainment → Production; on-order reconciliation → Procurement & Suppliers | APPROVED |
| N-4 | Shared calculation refactor | APPROVED WITH CONDITIONS (spec v1 §10.3) |
| N-5 | Demand forecast and Forecast accuracy stay separate | APPROVED |
| N-6 | Per-PO detail: no new engine output in Stage 3B | APPROVED FOR DEFERRAL |

The additional binding clarifications are in spec v1 §10: Overview direct; three utility areas; original-tab links; Reports and Summary as one source; the presentation-only item panel; filter persistence within an area and reset between areas; Production visibility; visual direction; preview.

**The approved specification is version v1.** The commit containing it is recorded in `IMPLEMENTATION-RECORD.md`; a document cannot contain its own commit hash.

- **AD-8 (23 Nov 2026): shared derived figures.**
  - The ten inline calculation sites of the existing tabs were moved verbatim into `CGShared` (`js/app.js`).
  - Full rationale and evidence: `SHARED-CALCULATIONS.md`.
  - AD-1 now also hands `CGShared` to the view layer, as `CGEngine.current().shared`.

- **AD-9 (23 Nov 2026): the new presentation files are loaded by `js/app.js`, not by `index.html`.**
  - `check-globals` pins the `index.html` script list exactly, and that test is protected. Rather than change it, a short
    loader at the end of `js/app.js` adds `css/scie.css`, Chart.js and the seven view and UI files, in a fixed order
    (`SCIE_UI`), with `async = false`. It does nothing where there is no DOM (Node tests).
  - `test-view-contract` section 8 stands in for the pinned list: it checks the file order, that every file exists, the
    no-DOM guard, that `index.html` is unchanged, and that each UI file is a self-contained function that declares no
    name the core files declare.
- **AD-10 (23 Nov 2026): the new screens sit after the original page, and the original page is the Advanced view.**
  - The shell adds its sidebar, top bar, screen area and item panel after `#app`. `#nav` and `#v` are never moved,
    renamed or rewritten, so the protected browser tests still find and click the 17 original tabs.
  - The body classes `scie-on` and `scie-adv` decide which is visible. Choosing an original tab, a "See original tab"
    link or "Advanced view" shows `#v`; choosing any area shows the new screens. Print always prints `#v` (the
    original Summary), so the report and the Summary are one source.
  - Choosing an original tab is detected in the capture phase, because the original click handler re-renders `#nav`
    and detaches the button before a bubbling listener sees it (found by the protected browser tests; fixed in 89098e4).
- **AD-11 (23 Nov 2026): long tables show 100 rows first.** On a 5,000-item workbook the Stock position table took up
  to 798 ms to draw. Tables now show the first 100 rows and a "Show all N rows" button; nothing is summarised, re-sorted
  or dropped. The choice resets when the area changes, like the filters.
- **AD-12 (23 Nov 2026): a figure from an unproven inline calculation is left off the new screens.** S12–S15 stay on
  their original tabs; the new screen names the omission and links to the tab (spec v1 §10.3 fallback, applied to
  columns and warnings as well as cards).
- **AD-13 (23 Nov 2026): product-specific views are built on demand.** `CGVM.forecastFor(S, id)` builds one product's
  timeline and method comparison for the product chosen on the screen; the tab builder includes the first product so the
  contract tests cover the shape, and the tests check every forecast product.
