# Android phone test checklist (Chrome only, no tools needed)

You need: your Android phone, Chrome, the published page address (GitHub Pages), and the Northstar workbook saved on the phone (Downloads or Google Drive).
Why the published page: Android Chrome cannot reliably open a local copy of the app because it loads several files. Test the page as it is published.

For each step write PASS or FAIL, and take a screenshot of anything odd (press Power + Volume Down).

| # | Do this | PASS if |
|---|---|---|
| 1 | Open the page in Chrome. | Header and the Choose file button are visible. The page does not wobble sideways. |
| 2 | Tap Choose file and pick the Northstar workbook. | Within about 10 seconds the status says "Analysed." and the tabs appear. |
| 3 | Swipe the row of tabs and tap each of the 17 tabs in turn. | Every tab shows content. Note any tab that takes more than 2 seconds or stays blank. |
| 3b | Second file: import Android-paging-test-1500-items.xlsx (1,500 synthetic items, about 2 MB), open the Materials tab and scroll to the bottom of the table. | It says "Showing the first 200 of 1000 rows". Tap "Show 200 more", then "Show all". More rows appear each time and the page does not jump to the top. |
| 4 | On Finished goods and Materials, swipe the table sideways. | The first column stays in place and the text is readable without zooming. |
| 5 | Turn the phone sideways, then back. | Nothing breaks or disappears. |
| 6 | Phone Settings, Display, turn Dark theme ON. Reload the page and import the file again. | The title bar, the active tab, the buttons and the red and green labels are easy to read. |
| 7 | Turn Dark theme OFF and look at the labels "High", "Watch" and "OK" in daylight or near a window. | You can read them without squinting. |
| 8 | Open Settings. Change one number, tap Recalculate. Then tap Reset to defaults. | A confirmation message appears each time and nothing breaks. |
| 9 | Settings, tap Export to Excel. | A message says the export was created. The file Chain_Genius_Engine_Output.xlsx is in Downloads and opens in Sheets or Excel. |
| 10 | Tap Choose file and pick a photo or a PDF. | The message says to choose an .xlsx file. The earlier results stay on screen. |
| 11 | Pick a different, wrong .xlsx (any spreadsheet that is not the project workbook). | A clear error appears and the earlier results stay on screen, with the note that the previous analysis is unchanged. Recalculate still works. |
| 12 | Turn Airplane mode ON (the page is already loaded). Choose the Northstar file again. | It still analyses. Turn Airplane mode OFF afterwards. |
| 13 | Open the Summary tab, then Chrome's three-dot menu, Share, Print, Save as PDF. | A one-page summary PDF is produced and the buttons are not in it. |

Then send me: phone model, Android version, Chrome version (Chrome menu, Settings, About Chrome), the PASS or FAIL list, and any screenshots.

Limits to expect (not faults): very large workbooks (thousands of items) can be slow or run out of memory on a phone. Use the Northstar workbook for this test.
