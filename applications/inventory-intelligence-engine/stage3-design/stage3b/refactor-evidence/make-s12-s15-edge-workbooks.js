// S12–S15 edge cases (Stage 3B Phase 2 completion, 24 Nov 2026): synthetic workbooks derived from the Northstar
// demonstration fixture so the four displayed calculations meet missing, zero, negative and text inputs, and both sides
// of the 'unusually consistent accuracy' warning. Dates stay date cells. Synthetic data, not a client's.
// Usage: node make-s12-s15-edge-workbooks.js <northstar.xlsx> <out-dir>
const X = require('xlsx'), path = require('path');
const [src, out] = process.argv.slice(2);
const edit = (wb, sheet, fn) => { const rows = X.utils.sheet_to_json(wb.Sheets[sheet], { defval: null, raw: true }); rows.forEach(fn); wb.Sheets[sheet] = X.utils.json_to_sheet(rows, { cellDates: true, dateNF: 'yyyy-mm-dd' }); };
const VARIANTS = {
  // S13: product cost missing, negative, text or zero (Products and the Inventory unit cost)
  'Q1-cost-invalid': wb => { const bad = ['', -4.5, 'n/a', 0, null]; edit(wb, 'Products', (r, i) => { if (i % 2 === 0) r.Standard_Cost_GBP = bad[i % 5]; }); edit(wb, 'Inventory', (r, i) => { if (r.Item_Type === 'Finished_Good' && i % 2 === 0) r.Unit_Cost_GBP = bad[i % 5]; }); },
  // S13/S14: recorded forecasts missing for some months and for every month of some products
  'Q2-forecast-units-missing': wb => edit(wb, 'Demand History', (r, i) => { const n = +String(r.SKU).slice(2); if (n % 5 === 0) r.Forecast_Units = null; else if (i % 7 === 0) r.Forecast_Units = ''; }),
  // S15: lead time zero, blank, text; reorder point blank, zero, negative, text
  'Q3-leadtime-rop-edge': wb => { edit(wb, 'Materials', (r, i) => { r.Lead_Time_Days = [0, '', 'tbc', r.Lead_Time_Days, -5, r.Lead_Time_Days][i % 6]; }); edit(wb, 'Inventory', (r, i) => { r.Reorder_Point_Qty = ['', 0, -10, 'x', r.Reorder_Point_Qty, r.Reorder_Point_Qty * 5, 1][i % 7]; }); },
  // S14: every recorded forecast twice actual demand: low accuracy, the warning must not show
  'Q4-low-accuracy': wb => edit(wb, 'Demand History', r => { if (typeof r.Units_Sold === 'number') r.Forecast_Units = r.Units_Sold * 2 + 1; }),
  // S14: every recorded forecast equal to actual demand: 100% accuracy, the warning must show
  'Q5-perfect-accuracy': wb => edit(wb, 'Demand History', r => { r.Forecast_Units = r.Units_Sold; })
};
for (const [name, fn] of Object.entries(VARIANTS)) { const wb = X.readFile(src, { cellDates: true }); fn(wb); X.writeFile(wb, path.join(out, name + '.xlsx'), { cellDates: true }); console.log('wrote', name); }
