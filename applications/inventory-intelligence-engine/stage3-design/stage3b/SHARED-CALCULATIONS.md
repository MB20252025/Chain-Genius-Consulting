# Shared derived figures (owner decision N-4)

**Implemented:** 23 Nov 2026, by Claude, under "Stage 3B — Approved Navigation, Visual Design and Implementation Instructions", sections 3 and 13.

## 1. Inventory of calculation sites (correction to the navigation proposal)

The proposal said "six figures". The owner corrected this to "six calculation sites", because some sites produce more than one figure. Inspecting the code (every `.reduce(`, `mean(` and division in `js/app.js`) found **ten** sites where a tab works out a figure inline.

| Site | Tab (original source) | Figures | In the proposal? |
|---|---|---|---|
| S1 | Health | Overall health (simple average of scored items) | yes |
| S2 | Overview | Turnover, FG and materials | yes |
| S3 | Health | ABC table: % of annual value, cumulative %, % of stock value, per class | **no** (found on inspection) |
| S4 | Data quality (reconciliation section) | Gap value; top-10 share of the gap | **no** |
| S5 | MRP | Total replenishment over the horizon | yes |
| S6 | Summary | Management-summary figures and the prioritised recommendations (including critical-item exposure) | yes |
| S7 | Demand forecast | Units sold last 12 months; forecast next 3, 6 and 12 months (totals) | yes (as "demand totals") |
| S8 | Demand forecast | Per-product forecast over the display horizon (table column) | **no** |
| S9 | Forecast accuracy | Assessable products, high-accuracy count, average accuracy | yes |
| S10 | Suppliers (schedule-attainment section) | Production totals, average order attainment, weighted attainment | **no** (it sits outside the view function, so the proposal's scan missed it) |

These are **not** sites:
- `x1Sum` and `x1Money` (the existing shared X1 partial-total helpers);
- `confAreas()` (already shared through the engine API);
- sort comparators (ordering, not figures).

Four extra sites were found (S3, S4, S8, S10). The new screens need all of them, and N-4 approved the method, not a fixed count. So all ten were brought under the same safeguards, and no fallback was needed.

## 2. Where the shared functions live, and why

They live in **`CGShared`, a frozen object of pure functions in its own block at the top of the tab code in `js/app.js`**. It is exposed to the view layer through `CGEngine.current()`.

- **Why not `calculations.js` or `forecasting.js`:** excluded by the owner (N-4, safeguard 5).
- **Why not a new file:**
  - Every existing node test harness, many of them checksum-protected, loads exactly `calculations.js`, `forecasting.js`, `app.js` and `excel-import.js`, and then renders the existing tabs.
  - A function moved to a new file would make those tabs throw in those harnesses.
  - Changing the harnesses means changing protected tests, which is only possible at a baseline tag.
- **Kept separate from presentation:**
  - The block contains no HTML, no formatting and no DOM.
  - Formatting (`f`, `gbp`, `%`) stays in the tabs. For example, `abcRows` now formats `CGShared.abcStats`.
  - Every input is an argument, except `summaryModel()`. That is the Summary tab's declaration statement moved as one unit; it reads `R`, `CFG`, `mrp()` and `feas()` exactly as before, and `app.js` is permitted to do so (A1 rule).
- **Kept separate from view-models:** view-models only call these functions through `CGEngine.current().shared`, and the view layer still contains no arithmetic.
- **One implementation:** the old tab and the new screen call the same function. No second copy exists, and G1 below checks that the moved text no longer appears in the tab code.

## 3. Unavoidable changes to existing tab code

Each change replaces an inline expression with a call to the moved function. The output is unchanged; see G2 and G3.

- **S3:** `abcRows` now formats the figures from `abcStats` instead of computing them.
- **S6:** the Summary destructures the same 16 names from `summaryModel()`.
- **S9 and S10:** destructure `{ass,hi,avg}` and `{T,avg,w}`.
- **Everywhere else:** a one-expression call.

`check-globals` counts one more top-level name (`CGShared`): 124 → 125, PENDING.

## 4. Verification: three separate guarantees

**Evidence script:** `refactor-evidence/verify-shared-refactor.js`. It compares old code with new code, so it is kept as evidence and is not a registered current-behaviour test. Its output and report are in `refactor-evidence/`.

| Guarantee | What it proves | Result (23 Nov 2026, against the baseline `app.js` of `e0b261f`) |
|---|---|---|
| **G1 verbatim move** | Each moved expression (16 fragments over 10 sites) occurs in the baseline tab code, occurs in `CGShared`, and no longer occurs in the tab code | 16/16 pass |
| **G2 calculation equivalence** | With the baseline and the new code each instrumented in memory, every site's value is recorded at full precision while all 17 tabs render, and the two records are identical (strict deep equality; functions compared by source text) | **3,038 values identical** over 22 workbook runs (all 25 workbooks × 2 safety-stock policies, minus 6 import-fault runs that cannot be analysed and fail identically old and new); all 10 sites exercised |
| **G3 byte-identical HTML** | All 17 tabs render byte-identical HTML with the uninstrumented old and new code | **748 tab renders identical** |

**Defects found in the evidence script on its first runs, and corrected:**
1. Strict equality reported a "difference" for a date-formatting function (`sd`) attached to feasibility rows. The old and new engines each load their own copy of the function, and the source is identical. Functions are now compared by source text.
2. The first version of the move left one extra blank line inside the Summary block. G1 caught it, and it was removed so the move is character-for-character verbatim.

Neither changed any value or any HTML.

**Fallbacks:** none needed. All ten sites are proven. No new screen needs a "See original tab" substitute for a figure.
