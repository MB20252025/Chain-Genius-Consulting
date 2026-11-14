#!/usr/bin/env node
/* Universal Data Import v1, Stage 2 tests for K1 (js/import/engine-map.js) and K2 (js/import/engine-workbook.js).
 * Run from tests/:  NODE_PATH=<pinned test node_modules> node test-import-engine-map.js      (all checks in 5 time zones + identity check)
 *                   ... node test-import-engine-map.js --once                                  (one time zone; used internally)
 * Needs: Node 22, the pinned test packages (acorn) on NODE_PATH. Every module, including the bundled SheetJS and the engine's own
 * rows() reader (js/excel-import.js), is loaded into ONE JavaScript context, as in the browser: a Date made in one context is not
 * a Date to code in another, and a split harness hides date errors (Stage 2 Solution Design Report, section G).
 * Expectations are written by hand from the engine code, the Northstar workbook's headers and Package 01's documented row counts
 * (EXPECTED-RESULTS.md); they are never generated from the code under test. The engine itself is not run here (K5 does that).
 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process');
const APP = path.resolve(__dirname, '..'), LIB = path.join(__dirname, 'fixtures', 'library');
const ZONES = ['UTC', 'Europe/London', 'America/New_York', 'Asia/Kolkata', 'Pacific/Auckland'];

if (!process.argv.includes('--once')) {
  let P = 0, Fl = 0;
  const outs = ZONES.map(z => {
    const r = cp.spawnSync(process.execPath, [__filename, '--once'], { env: Object.assign({}, process.env, { TZ: z }), encoding: 'utf8', maxBuffer: 256e6 });
    process.stdout.write(`\n===== TZ=${z} (exit ${r.status}) =====\n` + r.stdout + r.stderr);
    const m = /import-engine-map: (\d+) passed, (\d+) failed\s*$/.exec(r.stdout.trim());
    if (m && r.status === (+m[2] ? 1 : 0)) { P += +m[1]; Fl += +m[2]; } else { Fl++; console.log(`FAIL: ${z}: no valid summary line or unexpected exit code ${r.status}`); }
    return r.stdout.split('\n').filter(l => !l.startsWith('time zone:')).join('\n');
  });
  const same = outs.every(o => o === outs[0]);
  same ? P++ : Fl++;
  console.log(`\n${same ? 'PASS' : 'FAIL'}: results identical in all ${ZONES.length} time zones`);
  console.log(`import-engine-map all zones: ${P} passed, ${Fl} failed`);
  process.exit(Fl ? 1 : 0);
}

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? 'PASS: ' : 'FAIL: ') + m); };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const read = f => fs.readFileSync(path.join(APP, f), 'utf8');
console.log('time zone: ' + (process.env.TZ || '(default)'));
const NEW = ['js/import/engine-map.js', 'js/import/engine-workbook.js'];

// ===================== S0: static safety of the two new modules =====================
console.log('\n--- S0 static safety of engine-map.js and engine-workbook.js');
const acorn = require('acorn');
const walk = (n, fn) => { if (!n || typeof n.type !== 'string') return; fn(n); for (const k in n) { if (k === 'loc') continue; const v = n[k]; Array.isArray(v) ? v.forEach(c => walk(c, fn)) : v && typeof v.type === 'string' && walk(v, fn); } };
const BANNED = new Set(['setTimeout', 'setInterval', 'setImmediate', 'queueMicrotask', 'requestAnimationFrame', 'requestIdleCallback', 'Promise', 'fetch', 'XMLHttpRequest', 'Worker', 'postMessage',
  'WebSocket', 'EventSource', 'localStorage', 'sessionStorage', 'indexedDB', 'eval', 'Function', 'require', 'importScripts', 'document', 'window', 'navigator', 'CFG', 'R', 'WB', 'runEngine', 'CGEngine', 'analyse']);
const findings = src => { const out = []; const ast = acorn.parse(src, { ecmaVersion: 2022, locations: true });
  walk(ast, n => { if (n.type === 'MemberExpression' && !n.computed) n.property.__skip = true; if (n.type === 'Property' && !n.computed) n.key.__skip = true; });
  walk(ast, n => {
    if (/Function/.test(n.type) && (n.async || n.generator)) out.push((n.async ? 'async' : 'generator') + ' function @' + n.loc.start.line);
    if (n.type === 'AwaitExpression' || n.type === 'YieldExpression' || n.type === 'ImportExpression') out.push(n.type + ' @' + n.loc.start.line);
    if (n.type === 'Identifier' && !n.__skip && BANNED.has(n.name)) out.push(n.name + ' @' + n.loc.start.line);
    if (n.type === 'MemberExpression' && !n.computed && ['then', 'sendBeacon', 'cookie', 'runEngine'].includes(n.property.name)) out.push('.' + n.property.name + ' @' + n.loc.start.line);
  }); return out; };
for (const f of NEW) { const r = findings(read(f)); ok(r.length === 0, `${f}: no asynchronous code, network, storage, eval, engine globals or engine call (${r.join(', ') || 'none found'})`); }
ok(['setTimeout(f,1)', 'fetch(u)', 'async function a(){}', 'x.then(y)', 'const a=R.fg', 'CGEngine.runEngine({})', 'WB=1']
  .every(s => findings(s).length > 0) && findings('const o={fetch:1}; o.fetch; a.R=1').length === 0, 'the static rule detects 7 bad examples and ignores property names');
ok(!/import\/engine-(map|workbook)\.js/.test(read('index.html')), 'index.html does not load the new modules (Stage 2 adds no screens and no app change)');

// ---- load everything into one context, as the browser page would
const ctx = vm.createContext({ TextDecoder, Uint8Array, Buffer, console });
vm.runInContext(read('assets/xlsx.mini.min.js'), ctx);
const before = new Set(vm.runInContext('Object.getOwnPropertyNames(globalThis)', ctx));
for (const f of ['canonical', 'read', 'clean', 'mapping', 'validate']) vm.runInContext(read('js/import/' + f + '.js'), ctx, { filename: f + '.js' });
const mid = new Set(vm.runInContext('Object.getOwnPropertyNames(globalThis)', ctx));
for (const f of NEW) vm.runInContext(read(f), ctx, { filename: f });
const added = vm.runInContext('Object.getOwnPropertyNames(globalThis)', ctx).filter(n => !mid.has(n));
vm.runInContext(read('js/excel-import.js'), ctx, { filename: 'excel-import.js' });   // the engine's own reader: rows(), sheetHeaders(), calDate()
const G = ctx.CGImport, EM = G.engineMap, EW = G.engineWorkbook, C = G.canonical, X = ctx.XLSX;
ok(added.length === 0 && [...mid].filter(n => !before.has(n)).join() === 'CGImport' && Object.isFrozen(EW) && typeof EM === 'object',
  `globals: the new modules add no global names (only CGImport.engineMap and CGImport.engineWorkbook) (added: ${added.join(', ') || 'none'})`);
{ let threw = false; try { vm.runInContext(read('js/import/engine-workbook.js'), vm.createContext({})); } catch (e) { threw = /needs/.test(e.message); }
  ok(threw, 'load order: engine-workbook.js refuses to load without canonical.js and engine-map.js (clear error)'); }
// The engine's read path: WB is the engine's global; rows(n) is exactly what analyse() calls for each sheet.
const engineRows = (wb, sheet) => { ctx.__wb = wb; ctx.__sheet = sheet; return vm.runInContext('WB = __wb; rows(__sheet)', ctx); };
const engineHeaders = (wb, sheet) => { ctx.__wb = wb; ctx.__sheet = sheet; return vm.runInContext('WB = __wb; sheetHeaders(__sheet)', ctx); };
const isDate = v => Object.prototype.toString.call(v) === '[object Date]';
const iso = d => d.toISOString().slice(0, 10);
const roundTrip = wb => X.read(X.write(wb, { type: 'array', bookType: 'xlsx' }), { cellDates: true });

// ===================== S1: K1 — the engine map =====================
console.log('\n--- S1 engine map: structure, frozen, coverage of every engine column, uniqueness');
const deepFrozen = o => !(o && typeof o === 'object') || (Object.isFrozen(o) && Object.values(o).every(deepFrozen));
ok(deepFrozen(EM) && EM.VERSION === 'EM1' && EM.CANONICAL_VERSION === C.VERSION, 'the map is frozen at every level, version EM1, for canonical CDv1');
{ let threw = false; try { vm.runInContext('"use strict"; CGImport.engineMap.SHEETS[0].columns[0].field = "x"', ctx); } catch (e) { threw = true; }
  ok(threw && EM.SHEETS[0].columns[0].field === 'Item_ID', 'a write to the map is refused (strict mode) and the map is unchanged'); }
const calc = read('js/calculations.js');
const need = JSON.parse('[' + /const need=\[([^\]]+)\]/.exec(calc)[1].replace(/'/g, '"') + ']');
ok(eq(EM.SHEETS.map(s => s.sheet), need), `the map's sheets are exactly the engine's eight required sheets, in its order (${need.join(', ')})`);
// Northstar is the standard layout the engine was built on: the map must list every one of its columns, in order.
{
  const ns = X.read(fs.readFileSync(path.join(__dirname, 'fixtures', 'northstar', 'Chain_Genius_Project_001_Northstar_Dataset_1.xlsx')), { cellDates: true });
  const wrong = EM.SHEETS.filter(s => !eq(X.utils.sheet_to_json(ns.Sheets[s.sheet], { header: 1 })[0], s.columns.map(c => c.column))).map(s => s.sheet);
  ok(wrong.length === 0, `every sheet lists exactly the Northstar workbook's columns, in the same order (60 columns)${wrong.length ? ' — differ: ' + wrong.join(', ') : ''}`);
}
// Every column name the engine reads by name (property access or quoted name in calculations.js and forecasting.js) is in the map.
const engineSrc = calc + '\n' + read('js/forecasting.js');
const tokens = new Set([...engineSrc.matchAll(/\.([A-Z][A-Za-z0-9]*(?:_[A-Za-z0-9]+)+|SKU)\b/g), ...engineSrc.matchAll(/['"]([A-Z][A-Za-z0-9]*(?:_[A-Za-z0-9]+)+|SKU)['"]/g)].map(m => m[1]));
const allCols = EM.SHEETS.flatMap(s => s.columns), colNames = new Set(allCols.map(c => c.column));
const unknown = [...tokens].filter(t => !colNames.has(t));
ok(tokens.size === 42 && unknown.length === 0, `all ${tokens.size} column names the engine reads by name are in the map (mapped or listed as not supplied)${unknown.length ? ' — missing: ' + unknown.join(', ') : ''}`);
ok(allCols.every(c => (c.read === 'name') === tokens.has(c.column) && ['name', 'generic'].includes(c.read)),
  'each column is marked "name" exactly when the engine reads it by name, otherwise "generic" (whole-sheet checks and raw rows only)');
const notSupplied = allCols.filter(c => c.field === null), mapped = allCols.filter(c => c.field !== null);
ok(allCols.length === 60 && mapped.length === 56 && eq(notSupplied.map(c => c.column).sort(), ['Customer_Orders', 'Item_Type', 'Location', 'Production_Line_ID']) &&
  notSupplied.every(c => typeof c.reason === 'string' && c.reason.length > 20 && c.read === 'generic'),
  '60 engine columns: 56 mapped, 4 not supplied (Customer_Orders, Item_Type, Location, Production_Line_ID), each with a reason and none read by name');
ok(EM.SHEETS.every(s => C.TABLES[s.table] && s.columns.every(c => c.field === null || C.field(s.table, c.field))),
  'every mapped field exists in its canonical table (canonical.js)');
// Uniqueness. Within a sheet: no engine column twice, no canonical field twice. Across sheets: a canonical field may feed two
// sheets only when both read the same table and their row selections cannot both match (Products and Materials).
ok(EM.SHEETS.every(s => new Set(s.columns.map(c => c.column)).size === s.columns.length), 'no engine column appears twice in a sheet (so no engine column is fed by two canonical fields)');
ok(EM.SHEETS.every(s => { const f = s.columns.filter(c => c.field).map(c => c.field); return new Set(f).size === f.length; }), 'no canonical field feeds two columns of the same sheet');
{
  const where = {};
  EM.SHEETS.forEach(s => s.columns.filter(c => c.field).forEach(c => (where[s.table + '.' + c.field] = where[s.table + '.' + c.field] || []).push(s)));
  const disjoint = (a, b) => a.select && b.select && Object.keys(a.select).some(k => k in b.select && a.select[k] !== b.select[k]);
  const shared = Object.entries(where).filter(([, ss]) => ss.length > 1);
  ok(shared.every(([, ss]) => ss.length === 2 && ss[0].table === 'items' && disjoint(ss[0], ss[1])) && shared.length === 5,
    `a canonical field feeds two sheets only for items shared by Products and Materials, whose selections are disjoint (${shared.map(([k]) => k.split('.')[1]).join(', ')})`);
}
// Every canonical field is accounted for exactly once: mapped, a row selector, or "not consumed" with a reason.
{
  const all = Object.entries(C.TABLES).flatMap(([t, d]) => d.fields.map(f => t + '.' + f.name));
  const m = new Set(EM.SHEETS.flatMap(s => s.columns.filter(c => c.field).map(c => s.table + '.' + c.field)));
  const sel = EM.SELECTORS.map(x => x.table + '.' + x.field), nc = EM.NOT_CONSUMED.map(x => x.table + '.' + x.field);
  const counts = all.map(k => [m.has(k), sel.includes(k), nc.includes(k)].filter(Boolean).length);
  ok(all.length === 96 && counts.every(n => n === 1) && new Set(nc).size === nc.length && [...sel, ...nc].every(k => all.includes(k)),
    `all ${all.length} canonical fields are accounted for exactly once: ${m.size} mapped, ${sel.length} row selectors, ${nc.length} not consumed`);
  ok(m.size === 51 && sel.length === 2 && nc.length === 43 && EM.NOT_CONSUMED.every(x => x.reason.length > 15) && EM.SELECTORS.every(x => x.reason.length > 15),
    '51 mapped, 2 selectors (Is_Sold, Replenishment), 43 not consumed; every selector and not-consumed entry has a reason');
}
// Types: every date column the engine checks for non-dates is fed by a canonical date field, and date fields feed only those.
{
  const dateCols = new Set([...calc.matchAll(/badD\(\w+,\[([^\]]+)\]/g)].flatMap(m => m[1].split(',').map(s => s.replace(/['\s]/g, ''))));
  const fieldType = (s, c) => C.field(s.table, c.field).type;
  const bad = EM.SHEETS.flatMap(s => s.columns.filter(c => c.field && ((fieldType(s, c) === 'date') !== dateCols.has(c.column))).map(c => s.sheet + '.' + c.column));
  ok(dateCols.size === 9 && bad.length === 0, `the engine's ${dateCols.size} date columns are fed by canonical date fields, and no other column is${bad.length ? ' — wrong: ' + bad.join(', ') : ''}`);
}

// ===================== S2: K2 — cell writing on a hand-written dataset =====================
console.log('\n--- S2 cell writing: types, absent values, absent columns, unplaced items, fail-closed');
const mapping = (tables) => ({ format: 'CG-IMPORT-MAPPING', version: 1, name: 'test', files: {}, tables: Object.fromEntries(Object.entries(tables).map(([t, fs_]) => [t, { sources: [{ file: t + '.csv', columns: Object.fromEntries(fs_.map(f => [f, { source: f }])) }] }])) });
const ITEM_F = ['Item_ID', 'Item_Name', 'Item_Group', 'Is_Sold', 'Replenishment', 'Unit_of_Measure', 'Standard_Cost', 'Selling_Price', 'Default_Supplier_ID', 'Purchase_Lead_Time_Days', 'Min_Order_Qty'];   // Active NOT mapped
const M1 = mapping({
  items: ITEM_F, stock: ['Item_ID', 'Location_ID', 'Snapshot_Date', 'On_Hand_Qty', 'Allocated_Qty', 'On_Order_Qty', 'Unit_Cost'],
  demand: ['Item_ID', 'Period_Start', 'Units', 'Forecast_Units'], suppliers: ['Supplier_ID', 'Supplier_Name'],
  po_lines: ['PO_ID', 'Line_No', 'Supplier_ID', 'Item_ID', 'Order_Date', 'Promised_Date', 'Ordered_Qty', 'Received_Qty', 'Last_Receipt_Date', 'Unit_Cost', 'Status'],
  bom: ['Parent_Item_ID', 'Component_Item_ID', 'Qty_Per', 'Scrap_Pct'],
  production_orders: ['Production_Order_ID', 'Item_ID', 'Planned_Start_Date', 'Planned_Finish_Date', 'Actual_Start_Date', 'Actual_Finish_Date', 'Planned_Qty', 'Completed_Qty', 'Status']
});
const it = (id, rep, sold, extra) => Object.assign({ Item_ID: id, Item_Name: 'Item ' + id, Item_Group: null, Is_Sold: sold, Replenishment: rep, Unit_of_Measure: 'each', Standard_Cost: null, Selling_Price: null,
  Default_Supplier_ID: null, Purchase_Lead_Time_Days: null, Production_Lead_Time_Days: null, Min_Order_Qty: null, Order_Multiple: null, Active: null, __source: { file: 'items.csv', row: 2 } }, extra || {});
const DS = {
  items: [it('P1', 'Make', 'Y', { Item_Group: 'Valves', Standard_Cost: 12.5, Selling_Price: 30 }), it('00123', 'Buy', 'N', { Standard_Cost: 0.75, Default_Supplier_ID: 'S01', Purchase_Lead_Time_Days: 21, Min_Order_Qty: 100 }),
    it('R1', 'Buy', 'Y'), it('SA1', 'Make', 'N')],
  stock: [{ Item_ID: 'P1', Location_ID: 'W1', Snapshot_Date: '2026-10-31', On_Hand_Qty: 60, Allocated_Qty: null, On_Order_Qty: 0, Reorder_Point_Qty: null, Safety_Stock_Qty: null, Unit_Cost: 12.5 },
    { Item_ID: 'P1', Location_ID: 'W2', Snapshot_Date: '2026-10-31', On_Hand_Qty: -15, Allocated_Qty: 0, On_Order_Qty: 0, Reorder_Point_Qty: null, Safety_Stock_Qty: null, Unit_Cost: null },
    { Item_ID: '00123', Location_ID: null, Snapshot_Date: '2026-10-31', On_Hand_Qty: 1500, Allocated_Qty: 0, On_Order_Qty: 200, Reorder_Point_Qty: null, Safety_Stock_Qty: null, Unit_Cost: 0.75 }],
  demand: ['2024-03-31', '2026-03-29', '2026-10-25', '2026-10-01'].map((d, i) => ({ Item_ID: 'P1', Period_Start: d, Units: [10, 0, 7.5, 3][i], Forecast_Units: null, Location_ID: null })),
  suppliers: [{ Supplier_ID: 'S01', Supplier_Name: 'Supplier one', Standard_Lead_Time_Days: null, Country: null, Payment_Terms: null, Active: null }],
  po_lines: [{ PO_ID: 'PO1', Line_No: '1', Supplier_ID: 'S01', Item_ID: '00123', Order_Date: '2026-09-01', Promised_Date: '2026-09-22', Ordered_Qty: 200, Received_Qty: null, Last_Receipt_Date: null, Unit_Cost: 0.75, Status: 'Open', Location_ID: null }],
  bom: [{ Parent_Item_ID: 'P1', Component_Item_ID: '00123', Qty_Per: 2, Scrap_Pct: 0.02 }],
  production_orders: [{ Production_Order_ID: 'WO1', Item_ID: 'P1', Planned_Start_Date: '2026-10-05', Planned_Finish_Date: '2026-10-12', Actual_Start_Date: '2026-10-05', Actual_Finish_Date: null, Planned_Qty: 40, Completed_Qty: null, Status: 'In progress' }]
};
const before2 = JSON.stringify(DS);
const B = EW.build(DS, M1);
const wb = B.workbook;
ok(JSON.stringify(DS) === before2, 'build() does not change the dataset it is given');
ok(eq(wb.SheetNames, need), 'the workbook has the engine\'s eight sheets in its order');
ok(deepFrozen(B.report) && B.report.mapVersion === 'EM1', 'the report is frozen and names the map version');
const hdr = s => engineHeaders(wb, s);
ok(eq(hdr('Products'), ['SKU', 'Product_Name', 'Product_Family', 'Unit_of_Measure', 'Standard_Cost_GBP', 'Selling_Price_GBP']) &&
  eq(hdr('Materials'), ['Material_ID', 'Material_Name', 'Unit_of_Measure', 'Standard_Cost_GBP', 'Default_Supplier_ID', 'Lead_Time_Days', 'Minimum_Order_Qty']),
  'columns are written only for mapped fields: Active not mapped, so no Active_YN column on Products or Materials');
ok(eq(hdr('Inventory'), ['Snapshot_Date', 'Item_ID', 'On_Hand_Qty', 'Allocated_Qty', 'On_Order_Qty', 'Unit_Cost_GBP']) && eq(hdr('Suppliers'), ['Supplier_ID', 'Supplier_Name']),
  'unmapped fields (Reorder_Point_Qty, Safety_Stock_Qty, Country…) and not-supplied columns (Item_Type, Location) are absent, not empty');
ok(eq(hdr('Demand History'), ['Month_Start', 'SKU', 'Units_Sold', 'Forecast_Units']) && !hdr('Demand History').includes('Customer_Orders'),
  'a mapped field whose values are all missing keeps its column (Forecast_Units: "column empty", not "column absent")');
ok(eq(hdr('Production Orders'), ['Production_Order_ID', 'SKU', 'Planned_Start_Date', 'Planned_Finish_Date', 'Actual_Start_Date', 'Actual_Finish_Date', 'Planned_Qty', 'Completed_Qty', 'Order_Status']),
  'Production Orders: every mapped column in map order; Production_Line_ID not written');
{
  const cells = wb.SheetNames.flatMap(s => Object.entries(wb.Sheets[s]).filter(([k]) => k[0] !== '!').map(([, c]) => c));
  ok(cells.every(c => !(c.t === 's' && c.v === '')) && cells.every(c => ['s', 'n', 'd'].includes(c.t)), 'no cell holds empty text; every cell is text, number or date');
  const inv = engineRows(wb, 'Inventory');
  ok(!('Allocated_Qty' in inv[0]) && !('Unit_Cost_GBP' in inv[1]) && inv[1].Allocated_Qty === 0 && inv[0].On_Order_Qty === 0,
    'a missing value has no cell (no key in the engine\'s row), while a real 0 is kept as 0');
  ok(inv.length === 3 && inv[1].On_Hand_Qty === -15 && inv[2].Item_ID === '00123' && inv[2].On_Hand_Qty === 1500,
    'the engine reads numbers exactly (negative kept as entered: no rule is applied here) and text IDs keep their leading zeros');
  const po = engineRows(wb, 'Purchase Orders')[0];
  ok(po.Material_ID === '00123' && po.PO_Status === 'Open' && !('Received_Date' in po) && !('Received_Qty' in po) && po.Unit_Cost_GBP === 0.75 && !('Line_No' in po),
    'Purchase Orders: item → Material_ID, Status → PO_Status, missing receipt date and quantity have no cell, Line_No is not written');
  const bom = engineRows(wb, 'BOM')[0];
  ok(bom.SKU === 'P1' && bom.Material_ID === '00123' && bom.Qty_Per_Finished_Unit === 2 && bom.Scrap_Factor_Pct === 0.02, 'BOM: parent, component, quantity and scrap fraction (0.02, the engine\'s 0..1 convention)');
}
// Dates: the engine's rows() (with its calDate correction) must give back the same calendar date, including the days clocks change.
{
  const dem = engineRows(wb, 'Demand History');
  ok(dem.every(r => isDate(r.Month_Start) && r.Month_Start.getTime() % 864e5 === 0) && eq(dem.map(r => iso(r.Month_Start)), ['2024-03-31', '2026-03-29', '2026-10-25', '2026-10-01']),
    'dates come back from the engine reader as Date objects at UTC midnight with the same calendar date, including clock-change days (2024-03-31, 2026-03-29, 2026-10-25)');
  const inv = engineRows(wb, 'Inventory'), pr = engineRows(wb, 'Production Orders')[0], po = engineRows(wb, 'Purchase Orders')[0];
  ok(iso(inv[0].Snapshot_Date) === '2026-10-31' && iso(pr.Planned_Start_Date) === '2026-10-05' && iso(pr.Actual_Start_Date) === '2026-10-05' && !('Actual_Finish_Date' in pr) &&
    iso(po.Order_Date) === '2026-09-01' && iso(po.Promised_Date) === '2026-09-22', 'every date column reads back as its canonical date; a missing date has no cell');
  ok(dem.map(r => r.Units_Sold).join() === '10,0,7.5,3' && dem.every(r => !('Forecast_Units' in r)), 'demand numbers exact (0 and 7.5 kept); missing forecasts have no cell');
}
// Unplaced items and repeated engine keys are reported, never silently dropped or merged.
{
  const un = B.report.unplaced.map(u => u.Item_ID + ':' + u.Replenishment + '+' + u.Is_Sold);
  ok(eq(un, ['R1:Buy+Y', 'SA1:Make+N']) && B.report.unplaced.every(u => /No engine sheet holds this item role/.test(u.reason)) &&
    engineRows(wb, 'Products').map(r => r.SKU).join() === 'P1' && engineRows(wb, 'Materials').map(r => r.Material_ID).join() === '00123',
    'items whose role has no engine sheet (Buy + sold, Make + not sold) are not written and are listed in report.unplaced with a reason');
  const invRep = B.report.sheets.find(s => s.sheet === 'Inventory');
  ok(eq(invRep.duplicateKeys, ['P1']) && invRep.rows === 3, 'two stock rows for one item are both written as given and reported as a repeated engine key (aggregation is the adapter\'s job, K3)');
  ok(invRep.omitted.some(o => o.column === 'Location' && /not supplied/.test(o.why)) && invRep.omitted.some(o => o.column === 'Reorder_Point_Qty' && /not mapped/.test(o.why)),
    'the report lists each omitted column and why (not supplied by the canonical model / field not mapped)');
}
// Fail closed.
{
  const code = f => { try { f(); return 'no error'; } catch (e) { return e.code || e.message; } };
  const withRow = (t, patch) => Object.assign({}, DS, { [t]: [Object.assign({}, DS[t][0], patch)] });
  ok(code(() => EW.build(withRow('stock', { On_Hand_Qty: '60' }), M1)) === 'ENGINE_WORKBOOK_VALUE', 'a number field holding text is refused (ENGINE_WORKBOOK_VALUE), never written as text');
  ok(code(() => EW.build(withRow('demand', { Period_Start: '31/03/2024' }), M1)) === 'ENGINE_WORKBOOK_VALUE' && code(() => EW.build(withRow('demand', { Period_Start: '2026-02-30' }), M1)) === 'ENGINE_WORKBOOK_VALUE',
    'a date that is not a valid ISO date is refused (ENGINE_WORKBOOK_VALUE)');
  ok(code(() => EW.build(withRow('items', { Active: 'Y' }), M1)) === 'ENGINE_WORKBOOK_INPUT', 'a value in a field the mapping did not supply is refused, not silently dropped (ENGINE_WORKBOOK_INPUT)');
  ok(code(() => EW.build(DS, { tables: {} })) === 'ENGINE_WORKBOOK_INPUT' && code(() => EW.build(Object.assign({}, DS, { widgets: [] }), M1)) === 'ENGINE_WORKBOOK_INPUT' &&
    code(() => EW.build(null, M1)) === 'ENGINE_WORKBOOK_INPUT' && code(() => EW.build(DS, M1, { supplied: { demand: ['Nope'] } })) === 'ENGINE_WORKBOOK_INPUT',
    'an invalid mapping, unknown table, missing dataset or unknown supplied field is refused (ENGINE_WORKBOOK_INPUT)');
  const noDemandMap = mapping(Object.fromEntries(Object.entries(JSON.parse(JSON.stringify(M1.tables))).filter(([t]) => t !== 'demand').map(([t, v]) => [t, Object.keys(v.sources[0].columns)])));
  ok(code(() => EW.build(DS, noDemandMap)) === 'ENGINE_WORKBOOK_INPUT' &&
    eq(engineHeaders(EW.build(DS, noDemandMap, { supplied: { demand: ['Item_ID', 'Period_Start', 'Units'] } }).workbook, 'Demand History'), ['Month_Start', 'SKU', 'Units_Sold']),
    'options.supplied names the fields of a table the adapter builds itself (e.g. demand from sales lines); without it that table is refused');
}
// Transport cross-check (test-only): the in-memory workbook and the same workbook written to .xlsx and read back give the engine
// identical rows, value for value and date for date, on every sheet.
{
  const rt = roundTrip(wb);
  const norm = rows => JSON.stringify(rows, (k, v) => (typeof v === 'string' && /^\d{4}-\d\d-\d\dT/.test(v) ? 'D:' + v : v));
  const diff = need.filter(s => norm(engineRows(wb, s)) !== norm(engineRows(rt, s)) || !eq(engineHeaders(wb, s), engineHeaders(rt, s)));
  ok(diff.length === 0, `in-memory and write-then-read workbooks give the engine identical rows and headers on all 8 sheets${diff.length ? ' — differ: ' + diff.join(', ') : ''}`);
}

// ===================== S3: Package 01 through Stage 1 and K2 =====================
console.log('\n--- S3 Package 01: Stage 1 import (identity mapping) → cell writing → the engine\'s reader');
{
  const dir = path.join(LIB, '01-Clean-Manufacturer');
  const files = fs.readdirSync(dir).filter(n => n.endsWith('.csv')).sort();
  const map01 = { format: 'CG-IMPORT-MAPPING', version: 1, name: 'identity', files: {}, tables: {} };
  for (const n of files) {
    const t = n.slice(0, -4); if (!C.TABLES[t]) continue;
    const tbl = G.read.fromCSVText(fs.readFileSync(path.join(dir, n), 'utf8'), n);
    map01.files[n] = Object.assign({ dateFormat: 'ISO' }, G.mapping.moneyFields(t).some(f => tbl.headers.includes(f)) ? { currency: { code: 'GBP', confirmed: true } } : {});
    map01.tables[t] = { sources: [{ file: n, columns: Object.fromEntries(tbl.headers.filter(h => C.field(t, h)).map(h => [h, { source: h }])) }] };
  }
  const imp = G.validate.importFiles(map01, files.map(n => ({ name: n, text: fs.readFileSync(path.join(dir, n), 'utf8') })));
  ok(imp.importAccepted && imp.summary.mustFix === 0, 'Package 01 is accepted by Stage 1 with no Must fix');
  const b = EW.build(imp.dataset, map01), w = b.workbook;
  const counts = Object.fromEntries(need.map(s => [s, engineRows(w, s).length]));
  ok(eq(counts, { Products: 40, Materials: 80, BOM: 142, 'Demand History': 960, Inventory: 160, Suppliers: 12, 'Purchase Orders': 741, 'Production Orders': 414 }) && b.report.unplaced.length === 0,
    'row counts match EXPECTED-RESULTS.md (40 made + 80 bought items, 142 BOM, 960 demand, 160 stock, 12 suppliers, 741 PO lines, 414 works orders); nothing unplaced');
  ok(b.report.sheets.find(s => s.sheet === 'Inventory').duplicateKeys.length === 40, 'the 40 items stocked in two locations are reported as repeated engine keys (K3 aggregates them; K2 does not)');
  // Every cell the engine reads equals the canonical value: dates by calendar date, numbers and text exactly, missing = no key.
  let cellsChecked = 0; const bad = [];
  for (const sh of EM.SHEETS) {
    const src = (imp.dataset[sh.table] || []).filter(r => !sh.select || Object.entries(sh.select).every(([f, v]) => r[f] === v));
    const got = engineRows(w, sh.sheet);
    src.forEach((r, i) => sh.columns.filter(c => c.field && map01.tables[sh.table] && map01.tables[sh.table].sources[0].columns[c.field]).forEach(c => {
      const want = r[c.field], have = got[i][c.column]; cellsChecked++;
      const same = want === null ? !(c.column in got[i]) : isDate(have) ? iso(have) === want && have.getTime() % 864e5 === 0 : have === want;
      if (!same && bad.length < 3) bad.push(sh.sheet + ' row ' + (i + 2) + ' ' + c.column + ': ' + JSON.stringify(want) + ' vs ' + JSON.stringify(have));
    }));
  }
  ok(bad.length === 0 && cellsChecked > 10000, `every engine cell equals its canonical value (${cellsChecked} cells; dates by calendar date at UTC midnight, missing values absent)${bad.length ? ' — ' + bad.join('; ') : ''}`);
  const rt = roundTrip(w), norm = rows => JSON.stringify(rows);
  ok(need.every(s => norm(engineRows(w, s)) === norm(engineRows(rt, s))), 'Package 01: in-memory and write-then-read workbooks give the engine identical rows on all 8 sheets');
}

console.log(`\nimport-engine-map: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
