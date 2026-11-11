# v0.7 physical Android checklist

This is for the owner, on his own Android phone in Chrome, using the protected Cloudflare preview. It needs no terminal, developer tools or computer.

**Rules**
- Browser emulation (headless Chrome, "Pixel 5 emulation") is **never** recorded here as Android testing.
- Every result must name the **exact preview commit** tested. To find it: Cloudflare dashboard → Workers & Pages → `chain-genius-consulting` → Deployments. The preview you open shows its commit next to it.
- **D2 (physical Android test of all 17 tabs) stays OPEN** until the owner completes the full checklist below and confirms the result. Nobody else can close it.

## When to use which check

| Occasion | Check | Time |
|---|---|---|
| Once, to close D2 | Full checklist | About 15–20 min |
| Each development checkpoint | Core set + changed tabs. If more than 3 tabs changed, the full checklist instead | Under 5 min |
| Before release | Full checklist | About 15–20 min |

**Changed tabs** are listed by Claude in each checkpoint report. A tab counts as changed when a commit in that checkpoint changed its screen code, or a calculation it displays, compared with the previous checkpoint (`git diff`). New screens always count as changed. If A2 adds no screens, the A2 check is the core set only. If A2 adds screens, they are added to this checklist and count as changed.

## Core set (every checkpoint, under 5 minutes)

1. Open the preview and sign in with the Cloudflare email code.
2. The demonstration analysis loads. The **Overview** figures are shown, and the demonstration-data warning is visible.
3. Open **Data quality**: the list appears and scrolls.
4. Open **Settings**: change one value, check that the screen responds, then put the value back.

Then check each changed tab listed in the checkpoint report: it opens, shows content and scrolls.

## Full checklist (closes D2; repeated before release)

**A. Load and import.** The Northstar file can be downloaded on the phone from GitHub: `applications/inventory-intelligence-engine/tests/fixtures/northstar/`, then tap the file and choose Download. The 5,000-item file is the one the owner already has. Its SHA-256 is recorded in `tests/V07-PERF-BASELINE.md`.
1. Sign in; the demonstration analysis loads.
2. Import the Northstar workbook (`Chain_Genius_Project_001_Northstar_Dataset_1.xlsx`). The status reads "Analysed." Note roughly how many seconds it took.
3. Import the 5,000-item workbook (`Chain_Genius_Large_5000_items.xlsx`). Note roughly how many seconds it took; for comparison, the emulation estimate is about 14 s. Then continue with the tabs.

**B. The 17 tabs, portrait.** Each tab: opens, shows content, scrolls, has no text running off the screen, and any table pages ("show more") work.

| # | Tab | OK? | Notes |
|---|---|---|---|
| 1 | Overview | | |
| 2 | Health | | |
| 3 | Finished goods | | |
| 4 | Materials | | |
| 5 | MRP | | |
| 6 | Production feasibility | | |
| 7 | Excess & dead stock | | |
| 8 | Policy comparison | | |
| 9 | Reorder policy | | |
| 10 | Forecast accuracy | | |
| 11 | Demand forecast | | |
| 12 | Suppliers | | |
| 13 | Data quality | | |
| 14 | Client questions | | |
| 15 | Data confidence | | |
| 16 | Summary | | |
| 17 | Settings | | |

**C. Landscape.** Turn the phone sideways and recheck Overview, MRP, Suppliers and Settings.

**D. Export.** Export the workbook once. The file downloads and opens in a spreadsheet app on the phone.

## Result record (copy one block per test)

```
Date:
Check: FULL / CORE + CHANGED (list tabs)
Preview URL:
Preview commit (from Cloudflare Deployments):
Phone model and Android version:
Chrome version (Chrome > Settings > About Chrome):
Northstar import time (approx.):
5,000-item import time (approx.):      (full checklist only)
Results: all OK / problems (tab, what happened, screenshot name)
Tested by: owner
```

Results are copied into `tests/V07-TEST-RECORD.md` under "Physical Android tests".
