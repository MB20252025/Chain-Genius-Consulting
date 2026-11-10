# Code review findings (candidate 3)

Items B4 and B5 are **findings and proposals only**. No business rule was changed. Nothing below is applied until you approve it.
Probe scripts were run against the Northstar data with edited copies in memory (nothing saved to the fixtures).

## B1. Duplicate view definitions: DONE (safe dead code removed)
`js/app.js` defined four views twice. The later definition always won, so the earlier ones never ran: `Suppliers`, `Data quality`, `Settings` (object-literal versions) and the first `Forecast accuracy`.
Removed those four. Evidence: the rendered HTML of every tab (17 tabs, 51 renders over Northstar, over-receipt and multi-line workbooks) has the same MD5 before and after. The tab order comes from the `ORDER` list, not from definition order, so it is unchanged.

## B2. Repeated Excel export: genuine defect FIXED
Candidate 2 built the export by adding `ENG_` sheets to the uploaded workbook object itself (it deleted old `ENG_` sheets, then appended new ones). Visible effects were small (exports stayed identical) but the uploaded data was changed in memory: a "Recalculate" or a second import comparison would see the added sheets, and a workbook already holding `ENG_` sheets had them removed from the working copy.
Fixed: the export now works on a shallow copy (`SheetNames` and `Sheets` copied); the uploaded workbook is never touched.
Test: `tests/test-export-repeat.js` (24 checks). It fails 6 checks on candidate 2 and passes all on candidate 3.

## B3. Cross-file globals and load order: no defects
Four classic scripts share one global scope. Order in `index.html`: xlsx -> calculations -> forecasting -> app -> excel-import.
- 79 top-level names, none declared in two files.
- 19 load-time references (code that runs while the file loads) all resolve to a name declared earlier.
- ESLint (one-off, not kept in the project): no undefined globals and no redeclarations. Only unused-variable style notes.
- Kept as a permanent test: `tests/check-globals.js` (101 checks). I proved it detects a swapped script order and a `const` used before its declaration.

## B4. Forecast credibility edge cases: FINDINGS, NOT CHANGED
Probe: 12 months of Northstar FG001 with forecasts altered in memory.

| Case | Accuracy | Verdict | Confidence | Note |
|---|---|---|---|---|
| Unchanged | 94.7% | Good | Medium | control |
| 1 isolated month forecast 10x actual | 31.7% | Poor | Medium | caught as "not consistent" |
| 3 consecutive months forecast 10x actual | 0.0% | Poor | Medium | caught |
| All months 10x | 0.0% | Poor | Medium | "Consistent over-forecast" |
| Varied demand, ONE spike | 51.2% | Poor | Low | 1 outlier flagged |
| Varied demand, TWO consecutive spikes | 38.0% | Poor | **Medium** | outliers 0, shift 2 |
| Varied demand, THREE consecutive spikes | 29.2% | Poor | **Medium** | outliers 0, shift 3 |
| Two spikes separated by a normal month | 35.9% | Poor | Low | 2 outliers flagged |

Findings:
1. **Consecutive extreme errors are hidden from the outlier test.** The median/MAD outlier test needs most points to be normal. When two or three neighbouring months are extreme they move the median and spread, so `outliers` drops to 0. The code does count them as a `shift` (2 or 3) but the shift count is never used in the issues list or in the confidence rating. Result: two bad months in a row give a **higher** confidence (Medium) than two bad months apart (Low). Accuracy and the Poor verdict are still correct, so no wrong risk class results, but the confidence rating is too generous.
   - Proposal: use `shift >= 2` as a data issue ("run of extreme errors") that lowers confidence by one level, like an outlier does. One line plus one text string.
2. **MAD = 0 fallback.** If most errors are identical (for example constant demand with a constant forecast) the spread is 0 and the test cannot flag anything. Constant demand of 100 with one spike of 5,000 shows accuracy 16.5%, "Poor" and no outlier. Verdict is right; the outlier label is absent.
   - Proposal: when MAD is 0, fall back to a mean absolute deviation so a lone spike is still flagged.
3. **Accuracy floor.** Accuracy is clamped at 0%, so "forecast = 10x actual" and "forecast = 0" both show 0.0%. Bias (+227% to +900%) shows the difference. Proposal: show the clamped value with a "<0%" style label, or leave as is. Cosmetic.

## B5. Units of measure and FG lead-time variability: FINDINGS, NOT CHANGED
### UOM false positives
The importer accepts a fixed list of unit names (line 51 of `calculations.js`): `each, kg, m, l, g, pcs, set, box`, compared in lower case. Anything else gets a Medium data-quality flag "Unrecognised unit of measure".
Probe (10 materials changed in memory):

| Unit written | Flag raised | Risk class or health score changed |
|---|---|---|
| `EA` (standard ERP code for each) | Medium flag | none |
| `pack` | Medium flag | none |
| ` kg` (stray leading space) | Medium flag | none |
| `Each` | none (whitelist is case-insensitive) | none |
| `zzz` | Medium flag | none |

Findings: `EA`, common legitimate units and a stray space are **false positives**. The flag is a Medium data-quality item and changes no calculation, so the effect is noise and a lower data-quality score.
- Proposal: (a) trim spaces before comparing; (b) add common codes that are missing (`ea`, `pc`, `pack`, `lb` and similar); (c) downgrade an unknown unit to Low. This is a rule change, so it needs approval.
- Related: the fractional-BOM check (line 55) compares the unit with `==='each'` **exactly, case-sensitive**, while the whitelist above is case-insensitive. A material entered as `Each` passes the whitelist but is skipped by the fractional-BOM check, and `EA` is skipped too. Fractional BOM quantities on those materials would not be flagged. Proposal: lower-case and trim the unit once, accept `each` and `ea` as the same thing, and use that in both checks.

### Finished-goods lead-time variability (unlabelled assumption)
The calculated safety-stock formula uses lead-time variability for **raw materials** (from supplier PO history) but not for **finished goods**: the production-time spread (`ltS`) is not stored on FG items, so FG safety stock assumes a fixed production time. This is not stated on screen.
Probe (calculated policy, Northstar): all 50 FG have at least 2 usable production orders with a measurable spread. If it were included, calculated safety stock would rise for all 50 SKUs: median +27%, largest +115%, 26 SKUs by more than 25%. **No risk class changes** (0). The workbook-policy results are identical with or without it.
- Proposal A (labelling only, no calculation change): add a line to the Settings "Fixed rules" and the Confidence explanation: "Finished-goods safety stock assumes a fixed production time; production-time variability is not included."
- Proposal B (rule change): include the production-time spread. It would raise calculated FG safety stock as above. Needs approval and a new golden snapshot.
