# Tag-7 performance evidence (5,000 items)

**Script:** `stage3-design/tag7/perf-cmp.js`, byte-identical to the session script `/tmp/perf-cmp.js`.
- SHA-256 `37a4d54e432e422dca05561c1742e4e8a9e1419dfe2ad6e623cabcea76be379d`.
- Not a protected file.
- For each run: it opens the app in headless Chromium (Playwright), uploads the workbook, and times upload → "Analysed".
  It then times one further `analyse()` call in the page.

**Workbook:** `/tmp/perf5k.xlsx`, made with `node tests/gen-large-workbook.js --items=5000`.
- SHA-256 `5dd781bf9d47b4d5f497366f91ff770093218db326282b0540adee9e7303ee52`.
- 5,434,525 bytes, created 23 Nov 2026.
- The same file was used for every 5,000-item figure in Phase 3.

**Command** (each commit's app folder exported with `git archive`, served side by side, run alternately):

```
git archive fc08021 applications/inventory-intelligence-engine | tar -x -C /tmp/bench-fc08021
git archive <commit> applications/inventory-intelligence-engine | tar -x -C /tmp/bench-<commit>
(cd /tmp/bench-fc08021/applications/inventory-intelligence-engine && python3 -m http.server 8771 --bind 127.0.0.1 &)
(cd /tmp/bench-<commit>/applications/inventory-intelligence-engine && python3 -m http.server 8772 --bind 127.0.0.1 &)
for i in 1 2 3 4; do node perf-cmp.js 8771 /tmp/perf5k.xlsx 3; node perf-cmp.js 8772 /tmp/perf5k.xlsx 3; done
```

**28 Nov 2026 result** (12 runs each, alternating): `fc08021` against the earlier switching commit `9b01ff0`, whose engine
is identical to the rebuilt one's:

| Commit | `analyse()` range | Median | Import to "Analysed" (round medians) |
|---|---|---|---|
| `fc08021` | 663–885 ms | 711 ms | 4,314–4,383 ms |
| `9b01ff0` | 648–936 ms | 743 ms | 4,249–4,422 ms |

The difference is noise:
- The only engine change between the two commits is the gap-warning text in `forecasting.js`.
- `analyse()` (`calculations.js`) never calls the forecasting code.

**Why the earlier 564–592 ms figures are not directly comparable.** They were measured on 27 Nov in an earlier instance of
the sandbox. Before the 28 Nov run the sandbox had restarted (`uptime`: 0 minutes), so the hardware allocation and load may
differ. Both commits measured about 25% slower *together* on 28 Nov, which shows a machine effect, not a code effect. Only
figures measured in the same session, alternately, are compared. Both remain well under the 2 s target.
