// S11 edge cases (Stage 3B Phase 2): synthetic workbooks derived from the Northstar demonstration fixture, each changing
// only the Inventory sheet, so the Excess & dead stock values meet the cases the fixtures do not cover (negative on-hand,
// unknown or invalid allocation, missing, negative or text unit cost, very large stock). Synthetic data, not a client's.
// A negative physical on-hand makes an item Active (negative cover), so it never reaches the Excess list on its own.
// E6 records a negative physical on-hand alongside a positive Usable_On_Hand_Qty (the stock record and the usable figure
// disagree), which is how a negative on-hand item can be listed. Starts from the audit workbook nodem-alloc-10.xlsx.
// Usage: node make-s11-edge-workbooks.js <northstar.xlsx> <out-dir> [nodem-alloc-10.xlsx]
const X = require('xlsx'), path = require('path');
const [src, out, nodem] = process.argv.slice(2);
const VARIANTS = {
  'E1-negative-on-hand': (r, i) => { if (i % 4 === 0) r.On_Hand_Qty = -(i + 5); },
  'E2-allocation-unknown': (r, i) => { r.Allocated_Qty = ['', 'abc', -3, null, ' ', '12'][i % 6]; },
  'E3-unit-cost-invalid': (r, i) => { r.Unit_Cost_GBP = ['', -4.5, 'n/a', 0, null][i % 5]; },
  'E4-very-large-stock': (r, i) => { r.On_Hand_Qty = (i % 3 === 0) ? 1e9 : r.On_Hand_Qty; r.Allocated_Qty = (i % 3 === 0) ? 0 : r.Allocated_Qty; },
  'E5-combined': (r, i) => { if (i % 5 === 0) r.On_Hand_Qty = -1; if (i % 5 === 1) r.Allocated_Qty = ''; if (i % 5 === 2) r.Unit_Cost_GBP = -1; if (i % 5 === 3) { r.On_Hand_Qty = 50000; r.Allocated_Qty = 60000; } }
};
const SRC = { 'E6-negative-on-hand-no-demand': nodem };
if (nodem) VARIANTS['E6-negative-on-hand-no-demand'] = (r, i) => { r.Usable_On_Hand_Qty = r.On_Hand_Qty; if (i % 2 === 0) r.On_Hand_Qty = -(i + 2); };
for (const [name, fn] of Object.entries(VARIANTS)) {
  const wb = X.readFile(SRC[name] || src, { cellDates: true });
  const rows = X.utils.sheet_to_json(wb.Sheets.Inventory, { defval: null, raw: true });
  rows.forEach(fn);
  wb.Sheets.Inventory = X.utils.json_to_sheet(rows);
  X.writeFile(wb, path.join(out, name + '.xlsx'));
  console.log('wrote', name);
}
