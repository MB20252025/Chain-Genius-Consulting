# Missing-month demand chart investigation (Stage 3B Phase 2 completion, 24 Nov 2026)

**Question (owner, 24 Nov 2026):** when a product's demand history has missing months, does the original Demand forecast
chart place the recorded workbook forecast against the correct months, and does the new Demand forecast screen?

**Fixture:** `tests/fixtures/forecast-gaps/forecast-gaps.xlsx`, made by `make-forecast-gaps.js` from the Northstar
demonstration workbook (synthetic; only the Demand History sheet changes). Each changed product's Forecast_Units is
1000 + the month's calendar position, so a drawn value names its own month.

| Product | Case |
|---|---|
| FG001 | a middle month has no row |
| FG002 | a middle month has a row but Units_Sold is blank |
| FG003 | the first three months have no rows (late start) |
| FG004 | the last month has no row (trailing gap) |
| FG005 | one month is recorded on two rows (Forecast_Units 1007 and 2007) |
| FG006 | two separate months missing (final run of 2 months) |
| FG007 | unchanged (control) |

**Method:** `investigate-forecast-gaps.js` reads the dated rows directly with SheetJS (not through the engine), renders
the original tab's SVG for each product and converts every drawn point back to its slot on the chart's axis, and
builds the new screen's timeline. Outputs: `before-fix-6ae3f63.json` (code at 6ae3f63) and `after-fix-20261124.json`.

## Findings at 6ae3f63

1. **"Recorded forecast drawn early": not reproduced.** The original chart never drew a recorded value on the wrong
   month in any case.
2. **Defect A (original chart), confirmed: the recorded forecast disappeared.** On the calendar axis the recorded series
   (one value per usable history row) was drawn only when its length equalled the axis, so it vanished whenever a month
   was missing or unusable (FG001–FG004). No figure was wrong; the line was silently absent.
3. **Defect B (both charts), confirmed: the statistical forecast was drawn a month late after a trailing gap.** The
   engine fits the forecast to the last unbroken run and starts it the month after that run (forecasting.js
   `gapSeg`/`fcast`, `F.trail`). For FG004 (October missing) the forecast is October onwards; both charts drew it from
   November.
4. **Defect C (new screen), confirmed: duplicate month.** For FG005 the new chart showed the first row's recorded
   forecast (1007) on both rows; the second row's is 2007. The original chart drew both rows correctly.
5. **Defect D (new screen), confirmed: month labels in browsers west of UTC.** The engine keys months at UTC midnight;
   the new chart formatted them in local time, so a New York browser labelled November 2025 "Oct 2025". UK browsers
   were not affected.

## Corrections (display only; no forecast calculation or business rule changed)

- `js/app.js` `chart()`: A and B. A series that already matched the axis is drawn exactly as before (FG007 and FG005
  unchanged; the Tag-6 r4 chart tests pass unchanged).
- `js/views/contract.js` `timeline()`: B and C; with a duplicate month it uses the row axis and says why.
- `js/ui/format.js`: D (`timeZone: 'UTC'`).

**Regression tests:** `tests/test-view-contract.js` section 9 checks both charts against the fixture's dated rows, the
forecast start, the duplicate-month case, the not-forecast case and month labels in New York, Auckland and UTC. The
fixture is also in the contract test's workbook list, so every generic check runs on it.

**Not changed, recorded for the owner (engine behaviour, outside this scope):**
- FG002: a row with a blank Units_Sold is not a usable history row, so its recorded forecast is not carried by the
  engine and cannot be shown or assessed.
- FG005: a month recorded twice makes the engine treat each row as a separate period (13 periods for 12 months), both
  for the forecast and for the chart's row axis. Whether duplicate month rows should be summed, rejected or flagged is
  a business rule for the owner.
- FG004: the forecast for a product with a trailing gap starts a month earlier than other products' (October, not
  November), so its "next 3 months" total covers October to December. This follows the engine's documented rule.
