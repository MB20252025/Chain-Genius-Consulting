# A1 escaping audit (v0.7 checkpoint A1)

Result: **no unescaped workbook-derived text reaches HTML output. No escaping fix was made, because none was needed.** Line numbers refer to `js/app.js` on `development/v0.7` after the A1 page-guard commit; lines after 90 are three higher than in v0.6 (lines up to 90 are unchanged).

## Where HTML is written

| File | HTML sinks | Notes |
|---|---|---|
| `js/app.js` | 2 `innerHTML` writes, both in `show()` (line 82): the tab bar (built from the fixed `ORDER` list) and `#v` (banner + the current tab's view) | All 17 views build HTML strings that end up here |
| `js/excel-import.js` | none | Status messages, including the file name, use `textContent` |
| `js/calculations.js`, `js/forecasting.js`, `js/engine/engine-api.js` | none | No DOM access |

## How workbook text reaches those strings, and why it is escaped

| Route | Escaping | Evidence |
|---|---|---|
| Table cells (`tbl()`, line 12) | Every cell passes through `cv_()`, which calls `esc()` unless the column returns an `H()` object | `cv_` at line 8 |
| `H()` raw-HTML cells (6 calls) | Each contains only engine constants, numbers or `esc()`: lines 14 (risk class), 36 (number), 46 (MRP status from a fixed list), 52 (`esc(x.status)`), 209 (fixed rating table), 210 (`esc(x.rating)`) | `tests/logs/a1/escaping-html-app.txt` |
| Bar charts (`bars()`, line 10) | Labels pass through `esc(k)` | line 10 |
| Forecast product picker (line 78) | `esc(y.id)`, `esc(y.name)`, inside an attribute and as text | line 78 |
| Demonstration banners (lines 102, 123) | `esc(R.demo.sheet)`, `esc(R.demo.text)` | lines 102, 123 |
| Workbook notes (line 132) | `esc(n.sheet)`, `esc(t)` | line 132 |
| Settings messages and labels (lines 175–176) | `esc(setMsg)`, `esc(label)` and others | lines 175–176 |
| Other template interpolations | 301 in total: 99 are escaped calls or numeric helpers; the other 202 were read one by one and are numbers, dates, settings values, tab names or fixed engine labels (for example `x.st`, `p.status`, `F.trend`) | `tests/logs/a1/escaping-templates-app.json` |
| HTML built with `+` | 2 places, both numbers or tab names (lines 12, 50) | `tests/logs/a1/escaping-html-app.txt` |

## By area requested

| Area | Finding |
|---|---|
| Product names | Escaped (table cells, product picker). Confirmed by the hostile-workbook test |
| Supplier names | Escaped (table cells). Confirmed by the test |
| Notes (extra "QA/seed/scenario/test" sheets, demonstration text) | Escaped (lines 102, 123, 132). Confirmed by the test |
| Other workbook cell values (IDs, families, material names, column headers in data-quality messages, sheet names) | Escaped (table cells, notes). Confirmed by the test |
| File name | Never written as HTML (`textContent` only) |

## Test

`tests/test-a1-escaping.js` builds a Northstar copy with HTML planted in: a product name, a product family, a material name, a supplier name, a supplier ID (changed consistently across sheets), an all-blank extra column header, a notes sheet, a sheet name and the file name. It loads the copy through the real file picker in jsdom, opens all 17 tabs (expanding "Show all"), and checks that no planted element or `onerror` attribute appears, and that each planted string does appear as plain text.

- On `development/v0.7`: 46 passed, 0 failed.
- On untouched v0.6 (`8117c72`): 46 passed, 0 failed (the behaviour was already correct).
- Mutation check: with `cv_()` changed to skip `esc()`, the test fails (9 failures).

Limit: jsdom is a simulated page, not a real browser. The real-browser suite (`browser-chrome.js`) uses only the normal Northstar file.
