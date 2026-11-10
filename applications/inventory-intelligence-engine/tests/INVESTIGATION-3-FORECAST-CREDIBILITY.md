# Phase 3, item 3: forecast credibility edge cases (INVESTIGATION ONLY)

Status: **investigation only. No forecasting method, confidence rule or threshold was changed.**
Evidence: `tests/investigate-forecast-credibility.js` (re-runnable), full results in `tests/results/forecast-credibility-investigation.json` (45 runs). Code: `fcCred()` in `js/forecasting.js` line 32; screen: Forecast accuracy tab (`js/app.js` lines 115 and 125).

## 1. What the code does (so the results can be judged against the written rules)
- **Outlier test** runs on the **actual demand history** (`x.h`), not on forecast errors: a month is "extreme" if its robust z-score (median and MAD, factor 1.4826) exceeds 3.5 (`outZ`). It needs at least 6 months and MAD > 0.
- A flagged month with no flagged neighbour is an **outlier** (counted, listed as "N statistical outlier(s)", makes data quality "Limited"). A flagged month with a flagged neighbour is part of a **run** ("shift"): `shift` = number of flagged months minus outliers. The Settings page states this rule: "Two or more consecutive extreme months are treated as a level shift, not as outliers."
- **Confidence** (High / Medium / Low) = 0, 1, or 2+ points: history under 24 months (+1), data quality "Limited" (+1), "Insufficient" (+3), unusually high accuracy (+1). Outliers reach confidence only through "Limited". A run does not.
- **Accuracy / verdict** come from WAPE over forecast/actual pairs (accuracy = 1 − WAPE, floored at 0): Good ≥ 85, Fair ≥ 70, else Poor (over 95% is "Very high (verify)"). Forecast errors are never tested for outliers.
- **The run count displayed:** only the total number of months inside runs, in the Why column ("Possible level shift (N consecutive extreme periods, not counted as outliers)"). The number of separate runs is not kept.

Correction to the candidate 3 note (B4): that note said the shift count "is never used in the issues list or in the confidence rating". That is right for the rating, but the shift **is** shown to the reader as text in the Why column (and the note's table did not mention it).

## 2. Test design
Product FG001 (12 months, Northstar) and a 36-month synthetic history (so the "under 24 months" point does not mask the effect; control reads Good accuracy 91.4%, High confidence). Ten patterns of extreme months, each applied twice:
- **DEMAND spike:** Units_Sold × 10 in the chosen months, forecast unchanged.
- **FORECAST miss:** Forecast_Units × 10 in the chosen months, demand unchanged.
Patterns: none; 1 isolated; 2 consecutive; 3 consecutive; 2 separated by 1 normal month; 2 separated by 3 normal months; consecutive pair + a separate single; consecutive triple + a separate single; 4 consecutive; half the months in one block; two separate pairs. Plus a constant-demand case (MAD = 0).
Check: accuracy recomputed independently from the raw rows matches the engine in **44 of 44** runs (no calculation defect).

## 3. Results (36 months; the 12-month results show the same ordering one level lower)
DEMAND spikes:
| Pattern | Outliers | Run months | Data quality | Accuracy / verdict | Confidence | Reasons displayed |
|---|---|---|---|---|---|---|
| control | 0 | 0 | Adequate | 91.4 Good | High | "complete and varied" |
| 1 isolated | 1 | 0 | Limited | 71.5 Fair | Medium | "1 statistical outlier(s)" |
| 2 consecutive | **0** | 2 | **Adequate** | 62.7 Poor | **High** | "complete and varied" + level-shift note |
| 3 consecutive | **0** | 3 | **Adequate** | 54.7 Poor | **High** | same |
| 4 consecutive | 0 | 4 | Adequate | 46.6 Poor | **High** | same |
| 2 separated by 1 normal | 2 | 0 | Limited | 61.2 Poor | Medium | "2 statistical outlier(s)" |
| 2 separated by 3 normal | 2 | 0 | Limited | 64.8 Poor | Medium | same |
| pair + separate single | 1 | 2 | Limited | 53.1 Poor | Medium | outlier + level-shift note |
| triple + separate single | 1 | 3 | Limited | 47.0 Poor | Medium | same |
| two separate pairs | 0 | 4 | Adequate | 46.5 Poor | **High** | level-shift note (run count 4, number of runs not shown) |
| half the months in one block | 0 | 6 | Adequate | 38.7 Poor | **High** | level-shift note |
12 months: the same patterns give Medium for consecutive spikes against Low for separated ones. A block of half the months (6 of 12) is not detected at all (the median moves with it), so the row shows only "under 24 months", accuracy 16.7% Poor.

FORECAST misses (forecast ×10 in the chosen months): outliers 0, run 0 and data quality "Adequate" in **every** pattern. Accuracy falls (isolated 56.4, pair 36.2, triple 15.6, four 0.0) and the verdict is Poor, but confidence stays **High** and the reason reads "The history is complete and varied, and accuracy is not unusually high." The finding text is "Biased overall, but not consistent period to period" until over-forecast months reach 75% of the pairs.

MAD = 0 (demand constant at 100 with one month at 1,000): no outlier flagged, "Adequate", confidence High, accuracy 80 Fair.

## 4. Assessment: credible, misleading or incorrect?
| Finding | Judgement | Reason |
|---|---|---|
| Accuracy % and Good/Fair/Poor verdict in every pattern | **Credible** | matches an independent recomputation in 44/44 runs; moves as expected with the size and number of extreme months |
| Separated extreme demand months → outlier count, "Limited", Medium (Low at 12 months) | **Credible** | follows the written rule |
| Consecutive extreme demand months → 0 outliers, data quality "Adequate", confidence **High** | **Misleading** (not an arithmetic error) | follows the written rule that runs are "level shifts", but the same row then shows High confidence, the sentence "history is complete and varied", and a level-shift warning together. Two bad months in a row rate better than two bad months apart; 4 consecutive or two pairs still rate High with 46% accuracy. The code cannot tell a lasting level shift from a short campaign spike (no persistence test), so the "level shift" label is a guess |
| Run count shown | **Limited / mildly misleading** | total months in runs only; "4" could be one run of four or two pairs |
| Forecast-miss months produce no flag; confidence High with a Poor verdict | **Credible as designed, easily misread** | the page defines confidence as trust in the information (history length, completeness, unusual accuracy), separate from accuracy. A reader may still take "High confidence" as confidence in the forecast. Wording issue, not a calculation fault |
| Half or more of the months extreme → nothing flagged | **Limitation** | the median/MAD test needs most points to be normal; verdict still correct |
| MAD = 0 → a 10× spike is not flagged | **Limitation (missed detection)** | documented in candidate 3; verdict still correct |
No case produced a wrong accuracy figure or a wrong Poor/Fair/Good verdict.

## 5. Proposals (not implemented, need your approval)
| Id | Proposal | Type | Effect shown by an in-memory run |
|---|---|---|---|
| P1 | Count a run of 2 or more consecutive extreme months as a data issue (one more point, like an outlier). | confidence rule change | confidence changes in 9 of 44 runs, always one level lower (12 months: Medium → Low; 36 months: High → Medium) for consecutive-spike patterns only; **accuracy and verdict unchanged in 44 of 44** |
| P2 | When MAD is 0, fall back to a mean-absolute-deviation test. | method change | not run |
| P3 | Reword the confidence reason when a level shift is shown, so it does not say "complete and varied" next to the warning; show number of runs as well as months. | text only | not run |
| P4 | Label the Confidence column "confidence in the information (not in the forecast)". | text only | not run |
| P5 | Test persistence to distinguish a lasting level shift from a short spike. | new method | not proposed unless you ask |

## 6. Decisions needed from you
1. Approve P1 (confidence rule) or keep as is.
2. Approve P3 and P4 (wording, no number changes) as reporting-only changes.
3. Decide whether P2 should be pursued.
