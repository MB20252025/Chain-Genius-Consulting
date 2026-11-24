// Stage 3B Phase 2 completion (24 Nov 2026): synthetic fixture for the missing-month chart investigation.
// Derived from the Northstar demonstration workbook; only the Demand History sheet changes, for six products.
// Each changed product's recorded forecast (Forecast_Units) is set to 1000 + the month's position in the calendar
// (0 = first month of the workbook), so a value drawn on a chart identifies the month it belongs to.
//   FG001 middle month missing (no row)            FG004 last month missing (trailing gap)
//   FG002 middle month present, Units_Sold blank    FG005 one month recorded twice (duplicate row)
//   FG003 first three months missing (late start)  FG006 two separate months missing
// Synthetic test data, not a client's. Usage: node make-forecast-gaps.js <northstar.xlsx> <out.xlsx>
const X = require('xlsx');
const [src, out] = process.argv.slice(2);
const wb = X.readFile(src, { cellDates: true });
// Month_Start stays a real date cell (as in client workbooks); compare months by their time value
const rows = X.utils.sheet_to_json(wb.Sheets['Demand History'], { defval: null, raw: true });
const months = [...new Set(rows.map(r => +r.Month_Start))].sort((a, b) => a - b);
const pos = r => months.indexOf(+r.Month_Start);
const drop = { FG001: [5], FG003: [0, 1, 2], FG004: [months.length - 1], FG006: [2, 9] };
const outRows = [];
for (const r of rows) {
  const p = pos(r), id = r.SKU;
  if (['FG001', 'FG002', 'FG003', 'FG004', 'FG005', 'FG006'].includes(id)) r.Forecast_Units = 1000 + p;
  if (drop[id] && drop[id].includes(p)) continue;
  if (id === 'FG002' && p === 5) r.Units_Sold = null;
  outRows.push(r);
  if (id === 'FG005' && p === 7) outRows.push(Object.assign({}, r, { Units_Sold: 10, Customer_Orders: 2, Forecast_Units: 2000 + p }));
}
wb.Sheets['Demand History'] = X.utils.json_to_sheet(outRows, { header: ['Month_Start', 'SKU', 'Units_Sold', 'Customer_Orders', 'Forecast_Units'], cellDates: true, dateNF: 'yyyy-mm-dd' });
X.writeFile(wb, out, { cellDates: true });
console.log(`wrote ${out}: ${outRows.length} demand rows (was ${rows.length}); calendar months ${months.length}`);
