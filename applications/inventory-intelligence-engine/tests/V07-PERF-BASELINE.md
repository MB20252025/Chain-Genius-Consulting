# v0.7 performance baseline (recorded 11 Nov 2026, A1 closure)

No binary workbook is committed. The 5,000-item fixture is regenerated from `gen-large-workbook.js` (unchanged).

## Fixture

- **Command** (from `tests/`, test dependencies on `NODE_PATH`): `node gen-large-workbook.js <out.xlsx> --items=5000`
- **Seed:** 12345, hard-coded LCG; there is no seed option. Same command → same file.
- **Counts:** 1,667 finished goods + 3,333 materials. BOM 6,631; Demand History 20,004; Inventory 5,000; Suppliers 150; Purchase Orders 9,999; Production Orders 5,001 (plus START HERE 9, QA NOTES 7, DATA DICTIONARY 60 rows).
- **File:** 5,434,525 bytes. SHA-256 `5dd781bf9d47b4d5f497366f91ff770093218db326282b0540adee9e7303ee52`.
- **Content hash** (SHA-256 over sheet name + `header:1` rows): `b898da3fa55c07e7bd0b5472d157ac8316837b055b3ffb62bc09aa7c7ef19ab8`.
- **Verified:** three generations (including the owner's attached `Chain_Genius_Large_5000_items.xlsx`, made ~40 min earlier) are byte-identical.
- **Caveat:** byte identity holds with xlsx 0.18.5. `package.json` uses `*` versions, so a newer SheetJS may change bytes; the content hash is the robust check.
- **Size vs GitHub's 50 MB warning:** 5.4 MB (5k), 16.3 MB (15k), 32.7 MB (30k) — all under. Not committed anyway; the generator is the source.

## Measured (this sandbox: Node 22.23.4, 2 CPUs, ~7 GB RAM)

| Items | Generate | Read workbook | `analyse()` median | Full `runEngine()` median | Peak RSS |
|---|---|---|---|---|---|
| 5,000 | 1.4–1.8 s | 1,402 ms | 806 ms (5 runs) | 2,811 ms | 769 MB |
| 15,000 | — | 3,918 ms | 2,595 ms | 9,410 ms | 2,234 MB |
| 30,000 | — | 8,328 ms | 5,679 ms | 20,210 ms (3 runs) | 3,056 MB |

At 5,000 items: 8 data-quality issues, 3,333 MRP rows, 1,667 feasibility rows, 10 client questions.

**Browser import, upload → "Analysed."** (headless Chrome, `tools/perf-browser-baseline.js`):

- 5,000 items, desktop: median 3,224 ms (3,251 / 2,770 / 3,224); JS heap 104 MB.
- 5,000 items, **emulated** mobile (Pixel 5, CPU throttled 4×): median 13,828 ms (13,828 / 13,765 / 14,668).
- 15,000 items, desktop, 1 run: 9,237 ms; heap 307 MB.

**Not measured:** a physical Android phone (D2). Emulation is an estimate of phone behaviour, not proof.

## AI summary counts

None. The A2 digest does not exist yet, so no AI summary records are calculated. A2 must add digest size/time for this fixture to the baseline.

## Scaling limits observed

Time and memory grow roughly linearly. Full `runEngine()` runs `analyse()` three times (normal, policy flipped, supplier mode flipped), so it costs ~3.5× one analysis. 30,000 items reaches ~3 GB RSS in Node — impractical on a phone. 5,000 is the v0.7 working reference size; ~14 s emulated mobile import is the figure to beat or hold.

## Reproduce

```
node gen-large-workbook.js /tmp/l5k.xlsx --items=5000 && sha256sum /tmp/l5k.xlsx
node tools/perf-node-baseline.js .. /tmp/l5k.xlsx 5
node tools/perf-browser-baseline.js .. /tmp/l5k.xlsx 3 desktop,mobile4x
```

Raw results: `logs/v07-perf-baseline/`.

Note for D1 condition 4: `tools/perf-node-baseline.js` loads the app through a fixed five-file list (the four v0.6 scripts + `engine/engine-api.js`), like the 26 existing harnesses. It must move to the shared loader in v0.8 with them. Reproducibility re-checked 11 Nov: a fourth generation gave the same SHA-256.
