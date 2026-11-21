# X1 manual check on a physical Android phone (for the owner; about 10 minutes)

Claude cannot test on a physical device. Everything below has been seen only in **desktop Chrome emulating a Pixel 5**. Please run this on
your phone in Android Chrome.

**Before you start:** have three workbooks on the phone:
- Northstar as supplied;
- a copy with one `Allocated_Qty` cell cleared (RM001, which is Inventory row 52);
- a copy with the whole `Allocated_Qty` column deleted.

Open the engine page (the local or hosted copy you normally use). If you have opened it before, reload it, so the new script versions load
(the page now asks for `?v=0.7-x1`).

| # | Do | Expect |
|---|---|---|
| 1 | Load **Northstar as supplied** | "Analysed." No orange "Missing or invalid input data" banner. No "Not Assessed" anywhere. |
| 2 | Load the **one-blank** copy | "Analysed." (it must not stop). An orange banner names `Allocated_Qty`. |
| 3 | Open **MRP** | RM001 is at the top: "Not Assessed – Allocated_Qty blank (Inventory row 52)". Its figures are "–", and "£–" for money. The cards read "of 99 assessed", "1 Not Assessed", and the total says "partial: excludes 1 material(s) Not Assessed". The word "partial" is small, inline text, not a big number. |
| 4 | Open **Materials** | RM001 is first, with Risk "Not Assessed – …". |
| 5 | Open **Health** | A "Not Assessed" card shows 1. The average says "of the 149 assessed items". RM001 has score "–" and is never "Excellent" or "Healthy". |
| 6 | Open **Overview** and **Summary** | A "Not Assessed" card. Summary names RM001 and says "not counted as low risk". |
| 7 | Swipe through **every tab** | Nowhere shows "NaN", "Infinity", "Invalid Date" or "undefined". |
| 8 | Load the **column-deleted** copy | "Analysed." MRP shows all 100 materials "Not Assessed", and the total is "–", not "£0". |
| 9 | Tap **Export** and open the file | Sheet `ENG_RM`: RM001's `Available` and `HealthScore` cells are empty, `Assessment` = "Not Assessed", and `AssessmentReason` names the field. Every other row says "Assessed". |

**If any line differs,** note the step number and take a screenshot.
