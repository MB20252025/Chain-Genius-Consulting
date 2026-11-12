// CHARACTERISATION TEST: records what the engine CURRENTLY does for material lead times, including known defects.
// A pass means the behaviour has NOT CHANGED. It does NOT mean the behaviour is correct or approved.
// See tests/characterisation/README.md. Each recorded defect carries a TODO naming the commit or stage meant to change it.
//
// Data: a synthetic workbook built in memory below (no file on disk, no random numbers, no seed). All dates are UTC
// midnights. Six raw materials ML1-ML6, each with its own supplier SL1-SL6. Snapshot 31 Oct 2026. Settings: engine defaults
// (CFG.late = 1, CFG.fgLT = 7, CFG.ltMinSup = 30).
// Run (from tests/): NODE_PATH=<pinned test packages> node characterisation/characterisation-lead-time-fallbacks.js
// Last line: "characterisation-lead-time: N passed, M failed" (read by run-all.sh).
'use strict';
const fs = require('fs'), path = require('path'), XLSX = require('xlsx');
global.XLSX = XLSX;
const APP = process.env.CG_APP ? path.resolve(process.env.CG_APP) : path.resolve(__dirname, '..', '..');
(0, eval)(['calculations', 'forecasting', 'app', 'excel-import', 'engine/engine-api']
  .map(n => fs.readFileSync(path.join(APP, 'js', n + '.js'), 'utf8')).join('\n') + ';globalThis.__E=CGEngine');

// ---------- synthetic workbook ----------
const D = s => new Date(s + 'T00:00:00Z');
const add = (s, n) => { const d = D(s); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
// [id, description, Materials.Lead_Time_Days, Suppliers.Standard_Lead_Time_Days, POs as [days order->promised, days order->received]]
const CASES = [
  ['L1', 'H1: history only, 6 POs promised 20 d, received 26 d (6 d late)', null, null, Array(6).fill([20, 26])],
  ['L2', 'H2: supplier standard 20 d, same 6 late POs', null, 20, Array(6).fill([20, 26])],
  ['L3', 'H3: history only, ONE PO received in 40 d (on time)', null, null, [[40, 40]]],
  ['L4', 'H4: history only, TWO POs, 10 d and 50 d (on time)', null, null, [[10, 10], [50, 50]]],
  ['L5', 'H5: history only, 6 POs promised 30 d, received 25 d (5 d early)', null, null, Array(6).fill([30, 25])],
  ['L6', 'F7: no stated lead time, no supplier standard, no purchase orders', null, null, []]];
const po = []; let n = 0;
for (const [id, , , , rows] of CASES) rows.forEach(([p, r], k) => {
  const o = `2026-0${1 + k}-05`;   // one order a month, Jan-Jun 2026
  po.push({ PO_ID: 'P' + (++n), Supplier_ID: 'S' + id, Material_ID: 'M' + id, Order_Date: D(o), Promised_Date: D(add(o, p)),
    Received_Date: D(add(o, r)), Ordered_Qty: 100, Received_Qty: 100, Unit_Cost_GBP: 5, PO_Status: 'Received' });
});
const months = [...Array(24)].map((_, i) => new Date(Date.UTC(2024, 10 + i, 1)));
const wb = XLSX.utils.book_new(), sh = (nm, rows) => XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows, { cellDates: true }), nm);
sh('Products', [{ SKU: 'FG1', Product_Name: 'T', Product_Family: 'T', Unit_of_Measure: 'each', Standard_Cost_GBP: 50, Selling_Price_GBP: 80, Active_YN: 'Y' }]);
sh('Materials', CASES.map(([id, nm, lt]) => ({ Material_ID: 'M' + id, Material_Name: nm, Unit_of_Measure: 'each', Standard_Cost_GBP: 5, Default_Supplier_ID: 'S' + id, Lead_Time_Days: lt, Minimum_Order_Qty: 1, Active_YN: 'Y' })));
sh('BOM', CASES.map(([id]) => ({ SKU: 'FG1', Material_ID: 'M' + id, Qty_Per_Finished_Unit: 1, Scrap_Factor_Pct: 0 })));
sh('Demand History', months.map((m, i) => ({ Month_Start: m, SKU: 'FG1', Units_Sold: i % 2 ? 260 : 340, Customer_Orders: 30, Forecast_Units: 300 })));
sh('Inventory', [{ Snapshot_Date: D('2026-10-31'), Item_Type: 'Finished_Good', Item_ID: 'FG1', On_Hand_Qty: 600, Allocated_Qty: 0, On_Order_Qty: 0, Reorder_Point_Qty: 100, Safety_Stock_Qty: 50, Unit_Cost_GBP: 50, Location: 'ALL' }]
  .concat(CASES.map(([id]) => ({ Snapshot_Date: D('2026-10-31'), Item_Type: 'Raw_Material', Item_ID: 'M' + id, On_Hand_Qty: 150, Allocated_Qty: 0, On_Order_Qty: 0, Reorder_Point_Qty: 100, Safety_Stock_Qty: 50, Unit_Cost_GBP: 5, Location: 'ALL' }))));
sh('Suppliers', CASES.map(([id, , , std]) => ({ Supplier_ID: 'S' + id, Supplier_Name: 'S' + id, Country: 'UK', Standard_Lead_Time_Days: std, Payment_Terms: '30 days', Active_YN: 'Y' })));
sh('Purchase Orders', po);
sh('Production Orders', [{ Production_Order_ID: 'W1', SKU: 'FG1', Planned_Start_Date: D('2026-09-01'), Planned_Finish_Date: D('2026-09-08'), Actual_Start_Date: D('2026-09-01'), Actual_Finish_Date: D('2026-09-08'), Planned_Qty: 300, Completed_Qty: 300, Production_Line_ID: 'L1' }]);
// Round-trip through .xlsx bytes, as a user's file would arrive.
const book = XLSX.read(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }), { type: 'buffer', cellDates: true });
const R = __E.runEngine({ workbook: book }).result;

// ---------- assertions ----------
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? 'PASS: ' : 'FAIL: ') + m); };
const rm = id => R.rm.find(x => x.id === 'M' + id), sup = id => R.sup.find(s => s.id === 'S' + id);
const eq = (id, field, got, want) => ok(got === want, `${id} ${field}: expected ${JSON.stringify(want)}, actual ${JSON.stringify(got)}`);
const near = (id, field, got, want) => ok(got != null && Math.abs(got - want) < 1e-9, `${id} ${field}: expected ${want}, actual ${got}`);
for (const [id] of CASES) ok(!!rm(id), `${id}: material M${id} present in the result`);

// H1 (ML1). Records: lead time used = 32 d = PO-history base 26 d + 6 d average lateness.
// Current because js/calculations.js line 133 adds CFG.late lateness to whatever base was chosen (line 132), including the
// supplier's observed order-to-receipt average (6 POs x 26 d), which already contains the 6 d lateness.
// Not correct: the lateness is counted twice (KNOWN-LIMITATIONS 14, "Arithmetic defect (H1)").
// TODO(H1, Commit 4): Commit 4 stops adding the observed lateness to a PO-history-derived base (the supplier's 6-day average
// lateness remains visible on the supplier; it is no longer double-counted). lt becomes 26 and the label loses ' + calculated lateness'.
near('H1', 'lt0 (base)', rm('L1').lt0, 26);
near('H1', 'lt (used)', rm('L1').lt, 32);
eq('H1', 'ltInfo.label', rm('L1').ltInfo.label, 'Calculated (supplier PO history) + calculated lateness');
near('H1', 'supplier late (mean received - promised)', sup('L1').late, 6);

// H2 (ML2). Records: stated supplier standard 20 d + 6 d lateness = 26 d. Current and intended: a promised (stated) lead
// time does not contain lateness, so adding it once is not a double count. Control case: Commit 4 must NOT change it.
// Not necessarily final: lateness for bought-in items is open (decision A4). No change planned in Commit 3 or 4.
near('H2', 'lt0 (base)', rm('L2').lt0, 20);
near('H2', 'lt (used)', rm('L2').lt, 26);
eq('H2', 'ltInfo.label', rm('L2').ltInfo.label, 'Supplied (supplier standard) + calculated lateness');

// H3 (ML3). Records: a lead time from ONE purchase order (40 d) is labelled "Calculated" like one from many, with a
// standard deviation of 0. Current because line 132 accepts any observed average (n >= 1) and sd() of one value is 0.
// Not correct: one point is weak evidence and gives no variability (KNOWN-LIMITATIONS 14, "Evidence-quality defect
// (small samples)"). ltInfo.enough is already false (n < CFG.ltMinSup), but the label and numbers do not reflect it.
// TODO(small samples, Stage 4): Stage 4 (decision A3) is planned to change how 1-2 PO samples are labelled.
near('H3', 'lt (used)', rm('L3').lt, 40);
eq('H3', 'ltInfo.label', rm('L3').ltInfo.label, 'Calculated (supplier PO history)');
eq('H3', 'ltInfo.n', rm('L3').ltInfo.n, 1);
near('H3', 'ltS (lead-time standard deviation)', rm('L3').ltS, 0);
eq('H3', 'ltInfo.enough', rm('L3').ltInfo.enough, false);

// H4 (ML4). Records: TWO purchase orders (10 d and 50 d) give lead time 30 d with standard deviation 20 d (population sd
// of two points), labelled "Calculated". Not correct for the same reason as H3: the variability rests on two points and
// feeds safety stock. ltInfo.enough is already false (n < CFG.ltMinSup), but the label and numbers do not reflect it.
// TODO(small samples, Stage 4): Stage 4 (decision A3) is planned to change this.
near('H4', 'lt (used)', rm('L4').lt, 30);
eq('H4', 'ltInfo.label', rm('L4').ltInfo.label, 'Calculated (supplier PO history)');
eq('H4', 'ltInfo.n', rm('L4').ltInfo.n, 2);
near('H4', 'ltS (lead-time standard deviation)', rm('L4').ltS, 20);
eq('H4', 'ltInfo.enough', rm('L4').ltInfo.enough, false);

// H5 (ML5). Records: early deliveries (received 5 d before the promised date) do not shorten the lead time: lateness is
// floored at 0 (line 133, Math.max(0, ...)), so lt = observed average 25 d. Current by design of line 133; not shown to be
// wrong, but the lateness rule for bought-in items is open (decision A4). No change planned in Commit 3 or 4.
near('H5', 'lt (used)', rm('L5').lt, 25);
near('H5', 'supplier late (mean received - promised)', sup('L5').late, -5);
eq('H5', 'ltInfo.label', rm('L5').ltInfo.label, 'Calculated (supplier PO history)');

// F7 (ML6). Records: a purchased item with no stated lead time, no supplier standard and no delivery history is given the
// 7-day production default (CFG.fgLT), labelled "Assumed (default setting)". Current because line 132 falls back to
// CFG.fgLT. Not correct as evidence: 7 d is a production default, not a figure from the data (KNOWN-LIMITATIONS 14,
// "Assumed-data limitation (7-day fallback)"). TODO(7-day fallback, decision A1): labelling and warnings may change in
// Stage 4 within the L3 boundary (no number changes); any change to the number itself is L2 (M2, separately authorised).
near('F7', 'lt (used)', rm('L6').lt, 7);
eq('F7', 'ltInfo.label', rm('L6').ltInfo.label, 'Assumed (default setting)');

console.log(`characterisation-lead-time: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
