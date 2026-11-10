# Outstanding decisions and recommendations (v0.6 candidate 4 final)
Each item shows my recommendation (FIX, ACCEPT or DEFER) and a one-sentence rationale. The reviewer may override.
| # | Item | Status | Recommendation | Rationale |
|---|---|---|---|---|
| 1 | Unapplied Settings lost on tab switch | Fixed in this task | FIX (done) | The defect was genuine and the draft fix is small, UI-only and fully tested. |
| 2 | 12 px Summary overflow at 360 px | Fixed in this task | FIX (done) | One CSS property removes it with no layout change elsewhere. |
| 3 | analyse() about 20% slower than Phase 2 | Open, accepted by you | ACCEPT (v0.6.1 candidate) | It is still about 1.05 s against a 2 s target and removing correctness checks to speed it up would be the wrong trade. |
| 4 | Tab switching over 300 ms under the 4x CPU simulation (MRP, Forecast accuracy) | Open | ACCEPT | The target was "where achievable", desktop meets it, and the simulation is only a rough proxy. |
| 5 | 15,000-item performance (analysis 3.4 s, slow on the simulation) | Open | ACCEPT | It is informational with no target and is documented. |
| 6 | Physical Android testing | Not done, outside this task | DEFER | It needs your device and authorisation, and every browser result so far is desktop Chrome. |
| 7 | Overdue open POs excluded from supplier OTD | Final v0.6 business rule | DEFER to v0.7 | You decided it is out of scope for v0.6; the impact is documented (SUP011 example). |
| 8 | Numeric-text quantities ("120") invalid | Final v0.6 rule | DEFER to v0.7 | Safe parsing is a policy change. |
| 9 | Golden snapshots do not cover forecast-confidence wording | Open limitation | DEFER | Dedicated tests cover it; extending snapshots is test-tooling work for later. |
| 10 | Monolithic code / modularisation | Open | DEFER to v0.7 | Out of scope and risky to do at the release gate. |
No new defects were found in this task. v0.6 is not frozen or released by this document.
