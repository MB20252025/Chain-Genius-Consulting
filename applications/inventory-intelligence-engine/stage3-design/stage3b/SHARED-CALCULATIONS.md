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

## 5. S11: Excess & dead stock values (Stage 3B Phase 2, 23 Nov 2026)

**Found:** while building the Excess screen in Phase 1. The original Excess tab declared its own listing and per-item
values inline: the listed items (not Active; Not Assessed only with uncommitted stock), the uncommitted quantity
(`uc`, unknown when the allocation is unknown), the uncommitted value (`uc × cost`, unknown when either is unknown or
the cost is negative), the negative on-hand flag, and the physical-value list (negative on-hand left out). Until it was
proven, the new screen showed a "See original tab" link instead of the two value cards (spec v1 §10.3).

**Move:** the declaration block was moved verbatim into `CGShared.excessModel()`, in the same way as S6 (the Summary
block), and the tab now destructures the same eight names (`a, n, alK, uc, neg, NEG, pv, uv`). The cards keep their
formatting in the tab and still total with the shared X1 helper `x1Sum`. No figure, rule or label changed.

**Proof** (`refactor-evidence/verify-s11-refactor.js`, against the `app.js` of dcf6308; same three guarantees and the
same tolerance as S1–S10: strict deep equality at full precision, functions compared by source text):

| Guarantee | Result |
|---|---|
| G1 verbatim move | 3/3: the block was found and split into the listing and the helper declarations; each is in the baseline tab code, in `CGShared`, and no longer in the tab code |
| G2 calculation equivalence | 224 recorded values, each the whole listing with every item's `uc`, `neg`, `alK` and value plus every card total (453,313 leaf values), identical over 28 workbook runs |
| G3 byte-identical HTML | 952 tab renders identical |

**Edge cases.** The fixtures had no listed item with a negative on-hand, so six synthetic workbooks were made from the
Northstar demonstration data (`make-s11-edge-workbooks.js`, `s11-edge-workbooks/`): negative on-hand; unknown, text,
negative and blank allocation; blank, negative, text and zero unit cost; very large stock; a mix; and negative physical
on-hand with positive usable stock (E6, the only way a negative on-hand item reaches the list, because a negative
on-hand otherwise makes an item Active). Over all runs the proof met 2,094 listed items, including 316 with unknown
allocation, 42 with negative on-hand, 378 without a value and 62 with a missing or negative cost.

**Re-run of S1–S10** on the same code (`output-s1-s10-rerun-20261123.txt`): 3,038 values and 748 tab renders identical
to `e0b261f`, unchanged.

**Displayed results.** `test-view-contract` reads the three Excess cards (figure and partial counts) from the original
tab's rendered HTML and checks that the new screen shows the same text, and that the table lists the same items in the
same order with the tab's own uncommitted and value cells, on five workbooks including E5 and E6. The new screen's
"Potential excess value" card is now the tab's own card (listed items); the Overview keeps the engine total `R.exV`, as
the Summary does.
