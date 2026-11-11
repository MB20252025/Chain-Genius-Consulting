# A1 review: settings validation (current state) and A2 requirements

## What A1 validates (`CGEngine.runEngine()`, `checkSettings` in `js/engine/engine-api.js`)

- The settings argument is absent, or a plain object (not an array).
- Every setting name exists in the v0.6 defaults (`CFG0`). Unknown names are rejected with `BAD_ARGS`.
- Every value is a number and finite. Text, `NaN` and infinities are rejected with `BAD_ARGS`.
- Nothing is changed before validation passes, and nothing is clamped or rounded.

## What A1 does not validate

- **Ranges.** For example `z: 10` or `excess: 0` are accepted and passed to the engine.
- **Whole numbers.** For example `hor: 2.5` is accepted.
- **Allowed codes.** For example `pol: 5`, `late: 2` or `sup: 7` are accepted, although only 0–1, 0–1 and 0–2 have a meaning.
- **Order between related settings.** For example `x` higher than `y`, or `abcA` higher than `abcB`, is accepted.
- **Step sizes** (for example `z: 1.67` when the screen steps by 0.05). The existing Settings screen does not enforce steps either.

Each example above was run through the A1 wrapper and accepted (`tests/logs/a1-review/settings-gaps-demo.txt`). A1 has no caller that passes settings from users or AI. These gaps must be closed before A2 lets anything new pass settings in.

## Which settings need range validation, and where the permitted ranges come from

All 29 settings need it. No limits are invented: every limit already exists in the v0.6 application.

| Rule | Existing source | Settings |
|---|---|---|
| Minimum and maximum | `SETDEF` in `js/app.js`, columns 3 and 4: one entry for each of the 29 settings (checked: no setting is missing, none extra) | All 29 (table below) |
| Whole numbers only | The list in `applySettings()` in `js/app.js` | `basis`, `hor`, `fcH`, `fcTest`, `sup`, `pol`, `late`, `fcMinN`, `fcAdeqN`, `ltMinN`, `ltMinSup`, `supMinPO` |
| Order between pairs | The pair list in `applySettings()` | `x` < `y`; `abcA` < `abcB`; `supMed` < `supLow`; `fcMinN` < `fcAdeqN` |
| Codes | `SETDEF` labels and ranges | `pol` 0 or 1; `late` 0 or 1; `sup` 0, 1 or 2 |

A2 should read these rules from `SETDEF` and the two `applySettings()` lists at run time rather than copying the numbers, so the two can never disagree. `SETDEF` lives in `app.js`; since A1 that file loads without a page, so this is possible. Moving `SETDEF` out of `app.js` is not proposed for A2 (see `A1-DEVIATIONS.md`).

**Important difference from the existing Settings screen:** when a user types an out-of-range value there, v0.6 corrects it (to the minimum, maximum or default) and shows a message. It also rounds whole-number settings and resets a pair that is out of order. That screen behaviour is protected and stays as it is. New capabilities must reject invalid values instead (criterion 3 below).

## A2 acceptance criteria for settings (required, not implemented in A1)

1. Every setting used by a new capability must be validated before use.
2. Invalid, out-of-range and unsupported settings must be rejected safely: the request fails with a clear reason, and nothing is calculated or changed.
3. Validation must not silently change or clamp user inputs.
4. Existing v0.6 defaults and calculation behaviour must remain protected: `CFG0` and the Settings screen's behaviour are unchanged, and the v0.6 golden snapshots stay identical.
5. Tests must cover valid boundary values (each minimum and maximum, both members of each ordered pair at their limits) and invalid values (one below each minimum, one above each maximum, non-whole values for whole-number settings, out-of-order pairs, unknown names, non-numbers).

**Open decision for A2 (yours):** whether values between steps (for example `z: 1.67`) should be rejected. v0.6 does not enforce steps, so rejecting them would be a new rule.

## Appendix: the 29 settings and their existing limits (generated from `SETDEF` and `CFG0`)

| Setting | Meaning (Settings label) | Default | Min | Max | Step | Whole number | Section |
| `basis` | Demand months averaged | 12 | 1 | 12 | 1 | yes | Stock and demand |
| `excess` | Excess stock threshold (days of cover) | 90 | 1 | 365 | 1 | no | Stock and demand |
| `x` | XYZ: X if demand variability (CV) at most | 0.15 | 0 | 5 | 0.01 | no | Stock and demand |
| `y` | XYZ: Y if variability at most | 0.25 | 0 | 5 | 0.01 | no | Stock and demand |
| `abcA` | ABC: A items up to cumulative % of value | 80 | 1 | 99 | 1 | no | Stock and demand |
| `abcB` | ABC: B items up to cumulative % | 95 | 2 | 100 | 1 | no | Stock and demand |
| `z` | Service level (z-score) | 1.65 | 0 | 4 | 0.05 | no | Safety stock and policy |
| `pol` | Policy driving risk (0 workbook, 1 calculated) | 0 | 0 | 1 | 1 | yes | Safety stock and policy |
| `hold` | Holding cost % per year (illustration) | 20 | 0 | 100 | 1 | no | Safety stock and policy |
| `sup` | Supply source (0 verified POs, 1 inventory on-order, 2 verified plus comparison) | 0 | 0 | 2 | 1 | yes | Supply and lead times |
| `fgLT` | Default lead time when none exists (days) | 7 | 1 | 365 | 1 | no | Supply and lead times |
| `late` | Add supplier lateness to lead time (0 or 1) | 1 | 0 | 1 | 1 | yes | Supply and lead times |
| `ltMinN` | Production orders needed for a reliable lead time | 5 | 1 | 50 | 1 | yes | Supply and lead times |
| `ltMinSup` | POs needed for a reliable supplier lateness | 30 | 1 | 200 | 1 | yes | Supply and lead times |
| `hor` | MRP horizon (months) | 3 | 1 | 12 | 1 | yes | Planning |
| `grace` | Supplier on-time grace (days) | 0 | 0 | 30 | 1 | no | Suppliers |
| `otd` | Supplier on-time warning level (%) | 40 | 0 | 100 | 1 | no | Suppliers |
| `supLow` | Supplier class: Low risk from score | 75 | 1 | 100 | 1 | no | Suppliers |
| `supMed` | Supplier class: Medium risk from score | 60 | 0 | 99 | 1 | no | Suppliers |
| `supMinPO` | Scored POs for adequate supplier evidence | 10 | 1 | 100 | 1 | yes | Suppliers |
| `fcH` | Forecast horizon shown (months) | 12 | 3 | 12 | 1 | yes | Forecasting |
| `fcTest` | Forecast back-test months | 6 | 3 | 6 | 1 | yes | Forecasting |
| `fcHighAcc` | Forecast accuracy flagged unusually high at (%) | 95 | 50 | 100 | 1 | no | Forecast credibility |
| `fcHighShare` | Dataset warning when this % of products are flagged | 50 | 0 | 100 | 1 | no | Forecast credibility |
| `fcBias` | Forecast bias: balanced within ± (%) | 10 | 0 | 50 | 1 | no | Forecast credibility |
| `fcBiasShare` | Bias counted as consistent if same direction in (% of periods) | 75 | 50 | 100 | 1 | no | Forecast credibility |
| `outZ` | Outlier threshold (robust z-score) | 3.5 | 2 | 10 | 0.1 | no | Forecast credibility |
| `fcMinN` | Minimum periods to assess a forecast | 6 | 3 | 12 | 1 | yes | Forecast credibility |
| `fcAdeqN` | Periods for adequate history | 12 | 4 | 36 | 1 | yes | Forecast credibility |
