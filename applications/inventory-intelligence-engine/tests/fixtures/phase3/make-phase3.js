// Stage 3B Phase 3 (25 Nov 2026): SYNTHETIC fixture for the duplicate-month review and missing months (owner rules A–F).
// Derived from the Northstar demonstration workbook (simulated data, not a client's); only Demand History changes:
//   FG005 month 8 recorded twice: Units_Sold 35 (first row, the default) and 10 (second row)
//   FG010 month 4 recorded twice with identical rows (both 81 units)
//   FG012 month 2 recorded three times: 70, 75, 80
//   FG020 last two months missing (trailing gap)        FG030 months 4 and 5 missing (interior gap)
//   FG040 month 7 Units_Sold 0 (a genuine zero, recorded)
// Usage: node make-phase3.js <northstar.xlsx> <out.xlsx>
const X = require('xlsx');
const [src, out] = process.argv.slice(2);
const wb = X.readFile(src, { cellDates: true });
const rows = X.utils.sheet_to_json(wb.Sheets['Demand History'], { defval: null, raw: true });
const months = [...new Set(rows.map(r => +r.Month_Start))].sort((a, b) => a - b), pos = r => months.indexOf(+r.Month_Start);
const outRows = [];
for (const r of rows) {
  const p = pos(r), id = r.SKU;
  if (id === 'FG020' && p >= months.length - 2) continue;
  if (id === 'FG030' && (p === 4 || p === 5)) continue;
  if (id === 'FG040' && p === 7) r.Units_Sold = 0;
  if (id === 'FG005' && p === 8) { r.Units_Sold = 35; outRows.push(r); outRows.push(Object.assign({}, r, { Units_Sold: 10, Customer_Orders: 2 })); continue; }
  if (id === 'FG010' && p === 4) { r.Units_Sold = 81; outRows.push(r); outRows.push(Object.assign({}, r)); continue; }
  if (id === 'FG012' && p === 2) { [70, 75, 80].forEach(u => outRows.push(Object.assign({}, r, { Units_Sold: u }))); continue; }
  outRows.push(r);
}
wb.Sheets['Demand History'] = X.utils.json_to_sheet(outRows, { header: ['Month_Start', 'SKU', 'Units_Sold', 'Customer_Orders', 'Forecast_Units'], cellDates: true, dateNF: 'yyyy-mm-dd' });
X.writeFile(wb, out, { cellDates: true });
console.log(`wrote ${out}: ${outRows.length} demand rows (was ${rows.length}); calendar months ${months.length}`);
