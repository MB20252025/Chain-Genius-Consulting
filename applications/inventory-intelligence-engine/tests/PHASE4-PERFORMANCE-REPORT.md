# Phase 4 performance report
Source: tests/logs/perf-p4-20261109T212017Z.log (raw output, kept). Machine: 2 CPU, 8 GB RAM, Node 22.23.4, headless desktop Chromium (Playwright). Datasets: tests/gen-large-workbook.js --items=N (5,000 = 1,667 FG + 3,333 RM; 15,000 = 5,000 FG + 10,000 RM). **Nothing here is a physical-device measurement.**
Method for "simulated mobile": Chrome CPU throttling 4x via the DevTools protocol, viewport 360 px wide (the existing script sets height 915, not 800). The brief also names "Fast 3G": the app is loaded from file:// and the workbook is a local file, so no network transfer exists to throttle and **network throttling was not applied**. Results are therefore CPU-throttled desktop results, a rough proxy only.
"Cold" = first visit to each tab after import. "Warm" = second visit to every tab. The original tests/perf-chrome.js measures cold only; tests/perf-chrome-p4.js is a copy with the same loop plus the warm pass (original untouched).

## Analysis execution time, analyse() (Node, median of 5; one call)
| Items | Phase 4 runs (median ms) | Target | Result |
|---|---|---|---|
| 5,000 | 1,104 / 1,077 / 1,056 (also 1,080 / 1,024 / 1,029 in the interleaved A/B) | under 2,000 ms | **MET** |
| 15,000 | 3,355 | informational | 3.4 s; about 3.2x the 5,000 time for 3x the items |
Import and full first analysis in Chrome (file read + parse + analyse x3 + first render): desktop 3.1 s (5,000), 9.1 s (15,000); simulated mobile 15.1 s (5,000), 42.9 s (15,000). analyse() was not timed separately under throttling (gap).
## Regression check: same machine, interleaved rounds, 5,000 items, analyse() median ms
| Round | Phase 2 | Phase 3B | Phase 4 |
|---|---|---|---|
| 1 | 915 | 1,131 | 1,080 |
| 2 | 884 | 1,078 | 1,024 |
| 3 | 829 | 1,019 | 1,029 |
Separate Phase 2 vs Phase 3 rounds: 852/887/968 vs 1,063/1,075/1,090. **Finding: analyse() is about 20% slower than Phase 2 (roughly +170 to +200 ms at 5,000 items). It appeared in Phase 3 (the missing-value check); Phase 3B adds nothing measurable; Phase 4 changes no application code.** Still inside the 2 s target. Not optimised (no unrelated optimisation without approval).
## Tab switching, 5,000 items (ms to paint, 300 ms target)
| | Desktop cold | Desktop warm | Simulated mobile cold | Simulated mobile warm |
|---|---|---|---|---|
| Tabs over 300 ms | 0 of 17 | 0 of 17 | 3 of 17 (MRP 826, Forecast accuracy 543, Demand forecast 300 borderline-over) | 0 of 17 (slowest warm 236) |
| Slowest tabs | MRP 262, Forecast accuracy 180, Reorder policy 97 (first run: MRP 254, Forecast accuracy 188) | Reorder policy 166, Forecast accuracy 109, MRP 88; slowest 176 | MRP 826, Forecast accuracy 543, Demand forecast 300, Production feasibility 283 | Demand forecast 236, MRP 236, Materials 212 |
Target for tab switching: **met on desktop; not met under the 4x simulation (cold MRP and Forecast accuracy)**, as in earlier phases ("where achievable").
## 15,000 items (informational, no target)
Desktop cold: MRP 524, Forecast accuracy 427 over 300 ms; others under; warm: slowest Suppliers 369 ms (a single slow first-pass result on a tab that is normally 83 ms cold; cause not investigated; recorded as measured). Simulated mobile cold: MRP 2,167, Forecast accuracy 1,495, Demand forecast 652, Production feasibility 557, Overview 528 over 300 ms (Overview at 528 ms is unusually slow compared with 18 ms on desktop; the cause was not investigated and the run was not repeated; recorded as measured). Simulated mobile warm at 15,000: Demand forecast 709 ms and Suppliers 608 ms were over 300 ms. The page did not crash at 15,000 items on either configuration.
## Node view timings (script only, no paint), 5,000 / 15,000 items
MRP 230-282 / 599, Forecast accuracy 210-218 / 580, everything else under 100 ms except Production feasibility 61-66 / 172.
## Verdict on performance
analyse() target at 5,000 items: PASS. Tab switching: PASS on desktop, NOT MET on the 4x simulation. 15,000: informational, results above. One performance regression (+20% analyse(), from Phase 3) is documented, within target. Physical Android performance: **not measured**.

## Final hardening addendum (RC vs final, same machine and method; log logs/perf-final-20261109T221220Z.log)
Accepted decision: the roughly 20% analyse() slowdown versus Phase 2 (about 880 to about 1,040 ms at 5,000 items) is a known v0.6 performance characteristic and a possible v0.6.1 optimisation candidate. No optimisation was attempted; no correctness check was removed.
analyse() at 5,000 items (Node, median of 5), interleaved RC / final: 1,085 / 1,106, 1,086 / 1,028, 1,081 / 1,119 ms. Target under 2,000 ms: MET; difference within run-to-run noise.
Tab timings (Chrome, 5,000 items, cold and warm, 3 desktop and 4 simulated-mobile interleaved runs per tree, per-tab medians): 68 tab/phase cells compared. First pass flagged 7 cells above +10% on the throttled runs and 4 cells above the whole RC range; all were tabs whose code the fixes do not touch, with changes in both directions (for example Excess and dead stock -26%, Policy comparison -43%) and small absolute differences (6 to 26 ms). To settle it, six flagged tabs were re-measured with 30 visits per tab and tree: simulated 4x at 360 px: Finished goods 207 vs 199 ms (-3.9%), Summary 38 vs 36, Client questions 29 vs 30, Policy comparison 129 vs 127, Suppliers 149 vs 146, Overview 49 vs 51 (+4.1%); desktop: Finished goods 144 vs 152 (+5.3%), others -7.2% to +1.8% (logs/final-tab-ab.txt). **Conclusion: no tab is more than 10% slower; no material performance regression.** Honest caveat: single runs vary by up to about 40% on this machine, so the first-pass flags were noise, not proven by profiling.
Simulated mobile = Chrome CPU throttle 4x at 360 px width; no network throttling (file:// load). Desktop and simulated-mobile figures are not physical-device figures. The 15,000-item and 4x-throttle limits recorded above are unchanged and accepted.
