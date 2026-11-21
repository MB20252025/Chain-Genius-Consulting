# Stage 3A proposal: restore `test-paging-chrome` on the available Chromium (proposal only; not implemented)

Prepared 21 Nov 2026 on the owner's instruction (X1 authorisation §5). **Nothing here has been changed:**
- `tests/test-paging-chrome.js` (checksum line 116, `3f1a68a0…c82b`) is untouched;
- its `accepted-results.json` entry (BLOCKED, blocker `playwright-browser`) is untouched.

Implementation needs its own Stage 3A authorisation.

## 1. Why it is blocked

The test needs Playwright's own Chromium build, and that download is blocked in this environment. A working Chromium is already used by two
tests:
- `browser-chrome` (53 checks): `@sparticuz/chromium` through `puppeteer-core`, from the pinned `testdeps`;
- `browser-x1-chrome` (334 checks): the same.

So the blocker is the browser *driver*, not the absence of a browser.

## 2. How it would be ported

A new file, `tests/test-paging-chrome-puppeteer.js`. The protected original stays, unchanged, as the record of the approved procedure.

The port is a one-for-one translation of the 29-line test:

| Playwright (original) | puppeteer-core (port) |
|---|---|
| `chromium.launch()` | `puppeteer.launch({ executablePath: await chromium.executablePath(), args, headless: 'shell' })`, the same as `browser-chrome.js` |
| `browser.newContext({ viewport, isMobile, hasTouch, userAgent })` | `browser.newPage()` then `page.emulate(KnownDevices['Pixel 5'])`, or `setViewport` for the wide screen |
| `page.$`, `page.$$`, `page.evaluate`, `setInputFiles` | `page.$`, `page.$$`, `page.evaluate`, `elementHandle.uploadFile` |
| downloads (`page.waitForEvent('download')`) | CDP `Browser.setDownloadBehavior` to a temporary folder, as `browser-chrome.js` already does |

The 1,500-item workbook generator and every threshold are copied unchanged.

## 3. Assertions preserved (all 12 `ok(...)` checks, wording unchanged)

1. A phone-sized screen (≤ 600 px) draws 50 rows at a time.
2. A wide screen draws 200 rows.
3. The pager is visible.
4. A tap reveals more rows.
5. "Show all" reaches 1,000 rows.
6. The scroll position is kept.
7. The "Show more" button is a usable touch target (height).
8. There is no sideways scroll.
9. There are no console errors.
10. Exports still contain all data, paging notwithstanding.
11. The "Showing …" text is correct.
12. The status of the export file.

The port keeps the same names, order and count (12).

## 4. Coverage restored

Real-browser paging on a phone-sized and a wide layout: rows drawn, pager behaviour, touch-target size, scroll stability and complete
exports. Today only the JSDOM paging test (`test-paging`) runs, and JSDOM has no layout, so the touch-target and sideways-scroll checks
cannot be established without a real browser. The port, like the original, is **desktop Chrome emulating a phone**, not a physical
Android test.

## 5. How the port would be tested

1. Run the port and record 12 / 12.
2. **Equivalence (planted faults).** In a throwaway copy, plant each defect the original detects and show that the port fails the same
   check:
   - page size 60 instead of 50;
   - pager hidden;
   - button height under the minimum;
   - an export that drops paged rows.
3. Run it in the full tier, twice, to show the results are stable.
4. Run the fast and full tiers to show nothing else changed.

## 6. Protected records and counts affected

| Record | Change |
|---|---|
| `tests/test-paging-chrome.js` | none (kept as the approved original) |
| its `accepted-results.json` entry | stays BLOCKED, with a note pointing to the port |
| new `test-paging-chrome-puppeteer` entry | added: full tier, one zone, accepted 12 |
| `checksums.txt` | one line added for the port; `check-protection` 448 → 449 (CR-03 convention) |
| `tests/V07-TEST-RECORD.md` | BLOCKED-test section: the D5 #5 blocker is "compensated by the port" (wording for the owner to approve) |

## 7. Reconciliation at Tag-6

Tag-6 must list the port as an **added** protected test and its checksum line as an added approved line. The BLOCKED original stays in the
record, so the Tag-5 → Tag-6 reconciliation shows one blocked test compensated, never one deleted. Whether the original is later retired is
a separate owner decision at Tag-6.

## 8. Risks

- `@sparticuz/chromium` is a Lambda-oriented build. It has run this repository's browser tests reliably, but a different Chromium version
  could shift layout by a pixel, which matters for the touch-target and sideways-scroll checks. Mitigation: the same tolerances as the
  original, and the version is recorded in the run log.
- **Effort:** small (about 1–2 hours including the planted-fault proof).
