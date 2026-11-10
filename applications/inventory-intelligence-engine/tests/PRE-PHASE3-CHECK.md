# Pre-Phase 3 check (previously approved cleanup)

Evidence taken from git tag `v0.6-candidate-4-phase2` (commit f663295d6dc8a736ba8cddfc715b698ca84f2038) using `git show <tag>:<file>`. Automated checks: `tests/test-prephase3.js` (41 checks, real Chrome for the browser parts).

## B.1 Forecast accuracy duplicate: PRESENT (cleanup confirmed)
- `js/app.js` line 112 is the only text matching `views['Forecast accuracy']`. There is no second definition, so no dead duplicate remains.
- Checks: test-prephase3 B.1a-c.

## B.2 Supplier fill guard: `Math.min(100, fill)` RETAINED
- `js/calculations.js` line 109: `fill=a.reduce((s,r)=>s+Math.min(r.Received_Qty,r.Ordered_Qty),0)/(sum of Ordered_Qty)` and the score uses `Math.min(100,fill)`.
- Why it was kept: per-line capping (`Math.min(received, ordered)`) keeps fill at or below 100% only when quantities are valid (non-negative). With invalid negative quantities the guard still matters. Example: ordered -10, received -30 gives min = -30, divided by -10 = 300% fill, and the supplier score would exceed 100 without the guard. A negative received quantity gives a negative fill. The guard is therefore a defence against invalid data, not a redundant check. No safe alternative has been demonstrated, so per your instruction it was not removed and supplier scoring is unchanged.
- Checks: test-prephase3 B.2a-c; `test-fillcap.js` (276 checks) unchanged.

## B.4 Responsive pagination: PRESENT, one gap found and fixed in this candidate
Present at the Phase 2 tag:
- Page size: `js/app.js` line 11, `PAGE_WIDE=200, PAGE_NARROW=50`, `pgSize()` uses `matchMedia('(max-width:600px)')` (narrow at 600px and below, wide above).
- Table paging: line 12 (`tbl`), limit = max(page size, rows already revealed by Show all).
- Resize/orientation: line 86, debounced `resize` listener (150 ms) that redraws only if the page size changed and some table has more than 50 rows.
- View state kept outside the redrawn HTML: `shown{}` (Show all), `fsku` and `pf` (line 66), `prAll` (line 93). Click handler at line 88.

Gap found by the Chrome orientation test: the redraw read `window.scrollY` inside the debounce timeout, but the browser had already clamped the scroll position when the page got shorter. After rotating a phone the user could be moved back up the page.
Fix (Phase 3 `js/app.js` lines 86-89): the scroll position is now remembered from scroll events that occurred before the resize (`lastY`) and restored after the redraw. Behaviour otherwise unchanged.
Result in real Chrome emulating 412x915 and 360x800 orientation changes: resize fires, 50 and 200 rows as expected, exactly one redraw, scroll position kept, Show all kept, Demand forecast SKU selector kept, no console errors (test-prephase3 41/41). test-paging-chrome and test-responsive-chrome still pass.
