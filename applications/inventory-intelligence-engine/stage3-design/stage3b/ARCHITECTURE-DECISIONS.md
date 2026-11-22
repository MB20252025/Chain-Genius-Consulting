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
