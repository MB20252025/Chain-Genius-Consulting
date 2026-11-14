#!/usr/bin/env node
/* Universal Data Import v1, Stage 2 (K5): adapter (K3), result gate and reliabilityDetail (K4), and the engine's
 * Usable_On_Hand_Qty contract (B6 Option D). Proof D of the Stage 2 design, plus the four mandatory Stage 2 tests.
 * Run from tests/:  NODE_PATH=<pinned test node_modules> node test-import-adapter.js      (5 time zones + identity check)
 *                   ... node test-import-adapter.js --once                                 (one zone; used internally)
 * ONE JavaScript context holds the bundled SheetJS, the import modules and the engine, as in the browser. Every run first checks
 * that direct Northstar gives its known 5 data-quality warnings (a split harness would show 9: dates unreadable).
 * Synthetic data is written here, in code, so each case shows exactly what it changes. Expectations are written by hand.
 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process');
const APP = path.resolve(__dirname, '..');
const ZONES = ['UTC', 'Europe/London', 'America/New_York', 'Asia/Kolkata', 'Pacific/Auckland'];
if (!process.argv.includes('--once')) {
  let P = 0, Fl = 0;
  const outs = ZONES.map(z => {
    const r = cp.spawnSync(process.execPath, [__filename, '--once'], { env: Object.assign({}, process.env, { TZ: z }), encoding: 'utf8', maxBuffer: 256e6 });
    process.stdout.write(`\n===== TZ=${z} (exit ${r.status}) =====\n` + r.stdout + r.stderr);
    const m = /import-adapter: (\d+) passed, (\d+) failed\s*$/.exec(r.stdout.trim());
    if (m && r.status === (+m[2] ? 1 : 0)) { P += +m[1]; Fl += +m[2]; } else { Fl++; console.log(`FAIL: ${z}: no valid summary line or unexpected exit code ${r.status}`); }
    return r.stdout.split('\n').filter(l => !l.startsWith('time zone:')).join('\n');
  });
  const same = outs.every(o => o === outs[0]); same ? P++ : Fl++;
  console.log(`\n${same ? 'PASS' : 'FAIL'}: results identical in all ${ZONES.length} time zones`);
  console.log(`import-adapter all zones: ${P} passed, ${Fl} failed`);
  process.exit(Fl ? 1 : 0);
}

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? 'PASS: ' : 'FAIL: ') + m); };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const read = f => fs.readFileSync(path.join(APP, f), 'utf8');
console.log('time zone: ' + (process.env.TZ || '(default)'));

// ---- one context, as the browser page
const ctx = vm.createContext({ TextDecoder, Uint8Array, Buffer, console }); ctx.globalThis = ctx;
vm.runInContext(read('assets/xlsx.mini.min.js'), ctx);
for (const f of ['canonical', 'read', 'clean', 'mapping', 'validate', 'engine-map', 'engine-workbook', 'result-gate', 'adapter']) vm.runInContext(read('js/import/' + f + '.js'), ctx, { filename: f + '.js' });
vm.runInContext(['calculations', 'forecasting', 'app', 'excel-import', 'engine/engine-api'].map(n => read('js/' + n + '.js')).join('\n') + ';globalThis.__E=CGEngine;', ctx, { filename: 'engine' });
const X = ctx.XLSX, G = ctx.CGImport, E = ctx.__E, V = G.validate, A = G.adapter, RG = G.resultGate;
const NSBUF = fs.readFileSync(path.join(__dirname, 'fixtures', 'northstar', 'Chain_Genius_Project_001_Northstar_Dataset_1.xlsx'));
const nsWb = () => X.read(NSBUF, { cellDates: true });
const engineRows = (wb, sheet) => { ctx.__wb = wb; ctx.__sheet = sheet; return vm.runInContext('WB = __wb; rows(__sheet)', ctx); };
const items = o => [...o.result.fg, ...o.result.rm];
const find = (o, id) => items(o).find(x => x.id === id);
const code = f => { try { f(); return 'no error'; } catch (e) { return e.code || e.message; } };

// ===================== S0: harness self-check and static safety =====================
console.log('\n--- S0 harness self-check (one context) and static safety of adapter.js and result-gate.js');
{
  const ns = E.runEngine({ workbook: nsWb() });
  ok(ns.result.dq.length === 5 && !ns.result.dq.some(d => /non-date/.test(d.msg)), 'self-check: direct Northstar gives its known 5 data-quality warnings and no "non-date" warning (dates readable: one context)');
}
{
  const acorn = require('acorn');
  const walk = (n, fn) => { if (!n || typeof n.type !== 'string') return; fn(n); for (const k in n) { if (k === 'loc') continue; const v = n[k]; Array.isArray(v) ? v.forEach(c => walk(c, fn)) : v && typeof v.type === 'string' && walk(v, fn); } };
  const BANNED = new Set(['setTimeout', 'setInterval', 'setImmediate', 'queueMicrotask', 'requestAnimationFrame', 'Promise', 'fetch', 'XMLHttpRequest', 'Worker', 'postMessage', 'WebSocket', 'EventSource',
    'localStorage', 'sessionStorage', 'indexedDB', 'eval', 'Function', 'require', 'importScripts', 'document', 'window', 'navigator', 'CFG', 'R', 'WB', 'CGEngine', 'analyse']);
  for (const f of ['js/import/adapter.js', 'js/import/result-gate.js']) {
    const out = [], ast = acorn.parse(read(f), { ecmaVersion: 2022, locations: true });
    const local = new Set(); // names the module declares itself (e.g. its own "R" for the Stage 1 result) are not the engine globals
    walk(ast, n => { if (n.type === 'MemberExpression' && !n.computed) n.property.__skip = true; if (n.type === 'Property' && !n.computed) n.key.__skip = true;
      if (n.type === 'VariableDeclarator' && n.id.type === 'Identifier') local.add(n.id.name); if (/Function/.test(n.type)) n.params.forEach(q => q.type === 'Identifier' && local.add(q.name)); });
    walk(ast, n => { if (/Function/.test(n.type) && (n.async || n.generator)) out.push('async/generator'); if (n.type === 'AwaitExpression') out.push('await');
      if (n.type === 'Identifier' && !n.__skip && BANNED.has(n.name) && !local.has(n.name)) out.push(n.name + '@' + n.loc.start.line);
      if (n.type === 'MemberExpression' && !n.computed && ['then', 'runEngine'].includes(n.property.name)) out.push('.' + n.property.name); });
    ok(out.length === 0, `${f}: no asynchronous code, network, storage, eval, engine globals or engine call (${out.join(', ') || 'none found'})`);
  }
  ok(!/import\/(adapter|result-gate)\.js|reverse-eight-sheet/.test(read('index.html')), 'index.html loads neither the new modules nor the test-only reverse converter');
}

// ===================== S1: the engine contract (B6 Option D) — direct workbooks =====================
console.log('\n--- S1 engine contract: Usable_On_Hand_Qty is optional; available = usable - allocated; on-hand and value unchanged');
const withInv = (edit, usable) => {
  const w = nsWb(), rows = X.utils.sheet_to_json(w.Sheets.Inventory, { raw: true, cellDates: true });
  rows.forEach(r => { edit(r); if (usable) { const u = usable(r); if (u !== undefined) r.Usable_On_Hand_Qty = u; } });
  w.Sheets.Inventory = X.utils.json_to_sheet(rows, { cellDates: true });
  return X.read(X.write(w, { type: 'array', bookType: 'xlsx' }), { cellDates: true });
};
const noUa = o => JSON.stringify(o, (k, v) => (k === 'ua' || k === 'memo' ? undefined : typeof v === 'number' && !isFinite(v) ? 'N' + v : v));
{
  const base = E.runEngine({ workbook: withInv(() => {}) }), same = E.runEngine({ workbook: withInv(() => {}, r => r.On_Hand_Qty) });
  ok(noUa(base) === noUa(same) && items(same).every(x => x.ua === x.oh), 'Usable_On_Hand_Qty equal to On_Hand_Qty on every row gives exactly the engine result without the column (all sections)');
  ok(items(base).every(x => !('ua' in x) && x.av === x.oh - x.al), 'without the column, no item gains a "ua" key and available = on-hand - allocated for every item, as before');
  const fg1 = find(base, 'FG001'), cost = fg1.cost;
  const run = (oh, al, ua) => E.runEngine({ workbook: withInv(r => { if (r.Item_ID === 'FG001') { r.On_Hand_Qty = oh; r.Allocated_Qty = al; } }, ua === undefined ? undefined : r => (r.Item_ID === 'FG001' ? ua : r.On_Hand_Qty)) });
  const plain = run(45, 0), d0 = run(45, 0, 60), d19 = run(45, 19, 60);
  const a = find(d0, 'FG001'), b = find(d19, 'FG001'), p = find(plain, 'FG001');
  ok(a.oh === 45 && a.al === 0 && a.av === 60 && a.val === 45 * cost && d0.result.tot === plain.result.tot,
    `mandatory example, allocated 0: physical on-hand 45, usable 60, available 60, allocated 0, value 45 x £${cost} (total stock value unchanged)`);
  ok(b.oh === 45 && b.al === 19 && b.av === 41 && b.val === 45 * cost && d19.result.tot === plain.result.tot,
    'mandatory example, allocated 19: physical on-hand 45, available 41, allocated 19 (unchanged), value 45 x cost (unchanged)');
  ok(p.av === 45 && a.cover > p.cover && a.pos === a.av + a.oo && b.pos === b.av + b.oo, 'available-dependent outputs (cover, position) follow the corrected available figure; position = available + on order');
  ok(d0.result.dq.length === plain.result.dq.length, 'the supplied column raises no new data-quality warning');
  const bad = E.runEngine({ workbook: withInv(() => {}, r => (r.Item_ID === 'FG002' ? 'TBC' : r.On_Hand_Qty)) }), f2 = find(bad, 'FG002');
  ok(bad.result.dq.some(d => /Non-numeric Usable_On_Hand_Qty/.test(d.msg) && d.sev === 'High' && String(d.ex).split(', ').includes('FG002')) && f2.av === f2.oh - f2.al,
    'a non-numeric Usable_On_Hand_Qty is flagged High and not used: that item falls back to on-hand - allocated');
}

// ===================== synthetic canonical data =====================
const MONTHS = Array.from({ length: 24 }, (_, i) => { const d = new Date(Date.UTC(2024, 10 + i, 1)); return d.toISOString().slice(0, 10); });
const BASE = () => ({
  dataset: [{ Format_Version: 'CDv1', Snapshot_Date: '2026-10-31', Currency: 'GBP', Demand_Basis: 'shipments' }],
  items: [
    { Item_ID: 'P1', Item_Name: 'Pump one', Is_Sold: 'Y', Replenishment: 'Make', Unit_of_Measure: 'each', Standard_Cost: 50, Selling_Price: 90, Default_Supplier_ID: '', Purchase_Lead_Time_Days: '' },
    { Item_ID: 'P2', Item_Name: 'Pump two', Is_Sold: 'Y', Replenishment: 'Make', Unit_of_Measure: 'each', Standard_Cost: 20, Selling_Price: 40, Default_Supplier_ID: '', Purchase_Lead_Time_Days: '' },
    { Item_ID: 'M1', Item_Name: 'Casting', Is_Sold: 'N', Replenishment: 'Buy', Unit_of_Measure: 'each', Standard_Cost: 5, Selling_Price: '', Default_Supplier_ID: 'S1', Purchase_Lead_Time_Days: 14 },
    { Item_ID: 'M2', Item_Name: 'Seal', Is_Sold: 'N', Replenishment: 'Buy', Unit_of_Measure: 'each', Standard_Cost: 2, Selling_Price: '', Default_Supplier_ID: 'S1', Purchase_Lead_Time_Days: 21 }],
  locations: [{ Location_ID: 'W1', Location_Name: 'Main', Include_In_Available: 'Y' }, { Location_ID: 'W2', Location_Name: 'Branch', Include_In_Available: 'Y' },
    { Location_ID: 'W3', Location_Name: 'Overflow', Include_In_Available: '' }, { Location_ID: 'QUAR', Location_Name: 'Quarantine', Include_In_Available: 'N' }],
  stock: [st('P1', 'W1', 60, 0, 0, 20, 10, 50), st('P2', 'W1', 100, 0, 0, 30, 10, 20), st('M1', 'W1', 500, 0, 0, 100, 50, 5), st('M2', 'W1', 800, 0, 0, 100, 50, 2)],
  demand: MONTHS.flatMap((m, i) => [{ Item_ID: 'P1', Period_Start: m, Units: 30 + (i % 3) }, { Item_ID: 'P2', Period_Start: m, Units: 50 + (i % 4) }]),
  suppliers: [{ Supplier_ID: 'S1', Supplier_Name: 'Supplier one', Standard_Lead_Time_Days: 14 }],
  bom: [{ Parent_Item_ID: 'P1', Component_Item_ID: 'M1', Qty_Per: 2, Scrap_Pct: 0 }, { Parent_Item_ID: 'P2', Component_Item_ID: 'M2', Qty_Per: 3, Scrap_Pct: 0 }],
  po_lines: [
    { PO_ID: 'PO1', Line_No: '1', Supplier_ID: 'S1', Item_ID: 'M1', Order_Date: '2026-09-01', Promised_Date: '2026-09-15', Ordered_Qty: 200, Received_Qty: 200, Last_Receipt_Date: '2026-09-14', Unit_Cost: 5, Status: 'Closed' },
    { PO_ID: 'PO2', Line_No: '1', Supplier_ID: 'S1', Item_ID: 'M2', Order_Date: '2026-10-10', Promised_Date: '2026-10-31', Ordered_Qty: 300, Received_Qty: '', Last_Receipt_Date: '', Unit_Cost: 2, Status: 'Open' }],
  production_orders: [
    { Production_Order_ID: 'WO1', Item_ID: 'P1', Planned_Start_Date: '2026-09-01', Planned_Finish_Date: '2026-09-08', Actual_Start_Date: '2026-09-01', Actual_Finish_Date: '2026-09-07', Planned_Qty: 40, Completed_Qty: 40, Status: 'Complete' },
    { Production_Order_ID: 'WO2', Item_ID: 'P2', Planned_Start_Date: '2026-10-01', Planned_Finish_Date: '2026-10-08', Actual_Start_Date: '2026-10-01', Actual_Finish_Date: '2026-10-09', Planned_Qty: 60, Completed_Qty: 60, Status: 'Complete' }]
});
function st(Item_ID, Location_ID, On_Hand_Qty, Allocated_Qty, On_Order_Qty, Reorder_Point_Qty, Safety_Stock_Qty, Unit_Cost) {
  return { Item_ID, Location_ID, Snapshot_Date: '2026-10-31', On_Hand_Qty, Allocated_Qty, On_Order_Qty, Reorder_Point_Qty, Safety_Stock_Qty, Unit_Cost };
}
const csvCell = v => v === undefined || v === null ? '' : (s => /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s)(String(v));
function toFiles(T) {
  return Object.entries(T).filter(([, rows]) => rows).map(([t, rows]) => {
    const cols = rows.length ? [...new Set(rows.flatMap(r => Object.keys(r)))] : (BASE()[t] ? Object.keys(BASE()[t][0]) : []);
    return { name: t + '.csv', text: [cols.join(','), ...rows.map(r => cols.map(c => csvCell(r[c])).join(','))].join('\n') + '\n' };
  });
}
function mapFor(files, currency) {
  const m = { format: 'CG-IMPORT-MAPPING', version: 1, name: 'synthetic', files: {}, tables: {} };
  for (const f of files) {
    const t = f.name.slice(0, -4), tb = G.read.fromCSVText(f.text, f.name);
    m.files[f.name] = Object.assign({ dateFormat: 'ISO' }, G.mapping.moneyFields(t).some(c => tb.headers.includes(c)) ? { currency: { code: currency || 'GBP', confirmed: true } } : {});
    m.tables[t] = { sources: [{ file: f.name, columns: Object.fromEntries(tb.headers.filter(h => G.canonical.field(t, h)).map(h => [h, { source: h }])) }] };
  }
  return m;
}
function go(edit, opts) {
  const T = BASE(); if (edit) edit(T);
  const files = toFiles(T), mapping = mapFor(files, opts && opts.currency);
  const imp = V.importFiles(mapping, files), ad = A.build(imp, mapping, opts && opts.options);
  const out = ad.workbook ? E.runEngine({ workbook: ad.workbook }) : null;
  return { T, imp, mapping, ad, out, g: out ? RG.apply(out, ad.gate) : null };
}
const refusedWith = (r, c) => r.ad.status === 'refused' && r.ad.workbook === null && r.ad.report.refusals.some(x => x.code === c);
const setStock = (T, rows) => { T.stock = T.stock.filter(r => r.Item_ID !== 'P1').concat(rows); };
const neg = r => r.ad.report.negativeStock;
const NEG = 'treated as 0 for available stock. Please investigate.';

// ===================== S2: Proof D — negative and multi-location stock (B1, M1 D5, B6 Option D) =====================
console.log('\n--- S2 Proof D cases 1-10: locations, negative stock, valuation, allocations, on order');
const ctl = go();
ok(ctl.imp.importAccepted && ctl.ad.status === 'complete' && ctl.g.status === 'complete', 'control: the synthetic dataset imports, adapts and gates as "complete"');
{ // 1. positive + negative
  const r = go(T => setStock(T, [st('P1', 'W1', 60, 0, 0, 20, 10, 50), st('P1', 'W2', -15, 0, 0, '', '', 50)])), x = find(r.out, 'P1'), n = neg(r);
  ok(r.ad.status === 'restricted' && x.oh === 45 && x.ua === 60 && x.al === 0 && x.av === 60 && x.val === 45 * 50,
    'case 1 (W1 60, W2 -15): engine physical on-hand 45, usable 60, allocated 0, available 60, value 45 x £50 = £2,250');
  ok(n.length === 1 && eq(Object.keys(n[0]).slice(0, 11), ['itemId', 'locationId', 'negativeQty', 'physicalOnHandOriginal', 'physicalOnHandUsedByEngine', 'usableLocationStock', 'allocatedQty',
    'availableStockUsedByEngine', 'stockValuationOriginal', 'stockValuationUsedByEngine', 'message']) &&
    n[0].itemId === 'P1' && n[0].locationId === 'W2' && n[0].negativeQty === -15 && n[0].physicalOnHandOriginal === 45 && n[0].physicalOnHandUsedByEngine === 45 &&
    n[0].usableLocationStock === 60 && n[0].allocatedQty === 0 && n[0].availableStockUsedByEngine === 60 && n[0].stockValuationOriginal === 2250 && n[0].stockValuationUsedByEngine === 2250 && n[0].message === NEG,
    'case 1: the mandatory report has item, location, negative quantity, original and engine physical on-hand, usable stock, allocated, engine available, original and engine valuation, and the exact text');
  ok(r.ad.gate.items.P1 && r.ad.gate.items.P1.labels.some(l => l.code === 'NEGATIVE_LOCATION_STOCK') && r.g.labelled.some(l => /item P1/.test(l.path)),
    'case 1: the adjustment is visible: the item is labelled NEGATIVE_LOCATION_STOCK in the gate and its output');
  // 8 + 10: compare with the same physical stock in one location (no negative): only available and what depends on it may differ.
  const one = go(T => setStock(T, [st('P1', 'W1', 45, 0, 0, 20, 10, 50)])), y = find(one.out, 'P1');
  ok(y.oh === x.oh && y.al === x.al && y.val === x.val && one.out.result.tot === r.out.result.tot && y.av === 45 && x.av === 60,
    'case 8/10: against the same 45 units in one location, physical on-hand, allocated, item value and total stock value are identical; only available differs (45 vs 60)');
}
{ // 2. multiple negatives
  const r = go(T => setStock(T, [st('P1', 'W1', 50, 0, 0, 20, 10, 50), st('P1', 'W2', -10, 0, 0, '', '', 50), st('P1', 'W3', -5, 0, 0, '', '', 50)])), x = find(r.out, 'P1');
  ok(x.oh === 35 && x.ua === 50 && x.av === 50 && x.val === 35 * 50 && neg(r).length === 2 && eq(neg(r).map(n => n.locationId + ':' + n.negativeQty), ['W2:-10', 'W3:-5']) && neg(r).every(n => n.message === NEG),
    'case 2 (50, -10, -5; W3 has a blank flag so it counts): physical 35, usable 50, available 50, value 35 x £50; both negative locations reported');
}
{ // 3. negative + genuine allocation
  const r = go(T => setStock(T, [st('P1', 'W1', 60, 19, 0, 20, 10, 50), st('P1', 'W2', -15, 0, 0, '', '', 50)])), x = find(r.out, 'P1'), n = neg(r)[0];
  ok(x.oh === 45 && x.al === 19 && x.ua === 60 && x.av === 41 && x.val === 45 * 50 && n.allocatedQty === 19 && n.availableStockUsedByEngine === 41,
    'case 3 (allocated 19 at W1): physical 45, allocated 19 kept as entered, available 41, value 45 x £50; the report shows allocated 19 and available 41');
}
{ // 4. negative + stock on order
  const r = go(T => setStock(T, [st('P1', 'W1', 60, 0, 30, 20, 10, 50), st('P1', 'W2', -15, 0, 0, '', '', 50)])), x = find(r.out, 'P1');
  ok(x.oh === 45 && x.ooI === 30 && x.av === 60 && x.val === 45 * 50 && x.pos === x.av + x.oo, 'case 4 (30 on order at W1): on order 30 summed as entered; on-hand 45, available 60, value unchanged; position = available + engine on-order');
}
{ // 5. all locations negative
  const r = go(T => setStock(T, [st('P1', 'W1', -10, 0, 0, 20, 10, 50), st('P1', 'W2', -5, 0, 0, '', '', 50)])), x = find(r.out, 'P1');
  ok(x.oh === -15 && x.ua === 0 && x.av === 0 && x.val === -15 * 50 && neg(r).length === 2 && r.out.result.dq.some(d => d.msg === 'Negative quantities' && String(d.ex).includes('P1')),
    'case 5 (all negative): physical on-hand -15 and value -£750 kept signed (the engine still flags "Negative quantities"); usable 0, available 0; both locations reported');
}
{ // 6. excluded location with a negative quantity
  const r = go(T => setStock(T, [st('P1', 'W1', 60, 0, 0, 20, 10, 50), st('P1', 'QUAR', -20, 0, 0, '', '', 50)])), x = find(r.out, 'P1'), e = r.ad.report.excludedLocationNegatives;
  ok(x.oh === 60 && x.av === 60 && x.val === 3000 && neg(r).length === 0 && e.length === 1 && e[0].itemId === 'P1' && e[0].locationId === 'QUAR' && e[0].negativeQty === -20 && /information only/.test(e[0].note),
    'case 6 (QUAR is N): the excluded location contributes to nothing (on-hand 60, value £3,000); its negative is listed for information only, not in the mandatory report');
  const pos = go(T => setStock(T, [st('P1', 'W1', 60, 0, 0, 20, 10, 50), st('P1', 'QUAR', 25, 0, 0, '', '', 50)])), y = find(pos.out, 'P1');
  ok(y.oh === 60 && y.val === 3000 && pos.ad.report.stockReconciliation.find(q => q.itemId === 'P1').excludedLocations.join() === 'QUAR', 'case 6: positive stock in an excluded location is not counted either (B1: N excludes), and the report names the excluded location');
}
{ // 7. valuation stays on physical on-hand everywhere
  const r = go(T => setStock(T, [st('P1', 'W1', 50, 0, 0, 20, 10, 50), st('P1', 'W2', -10, 0, 0, '', '', 50)]));
  ok(items(r.out).every(x => x.val === x.oh * x.cost) && Math.abs(r.out.result.tot - items(r.out).reduce((s, x) => s + x.val, 0)) < 1e-6,
    'case 7: every item value equals physical on-hand x cost, and total stock value equals the sum of item values');
}
{ // unassigned stock (M1 D5) and a location missing from the locations file (B1 blank = counted)
  const r = go(T => setStock(T, [st('P1', '', 10, 0, 0, 20, 10, 50), st('P1', 'W1', 20, 0, 0, '', '', 50), st('P1', 'W9', 5, 0, 0, '', '', 50)])), x = find(r.out, 'P1');
  ok(x.oh === 35 && r.ad.report.stockReconciliation.find(q => q.itemId === 'P1').countedLocations.join() === 'UNASSIGNED,W1,W9' && r.ad.report.locations.unknownLocationsCountedAsIncluded.join() === 'W9',
    'stock with no location is counted as UNASSIGNED (M1 D5); a location missing from the locations file has no flag, so it counts (B1) and is reported');
}
{ // 9/10 direct uploads: Proof A and C in test-same-results.js; here the per-item reconciliation is checked as a hard rule
  const r = go(T => setStock(T, [st('P1', 'W1', 60, 0, 0, 20, 10, 50), st('P1', 'W2', -15, 0, 0, '', '', 50)]));
  ok(r.ad.report.stockReconciliation.every(q => q.sourcePhysicalSum === q.enginePhysical) && engineRows(r.ad.workbook, 'Inventory').every(row => 'Usable_On_Hand_Qty' in row),
    'reconciliation: for every item the Engine View physical on-hand equals the sum of its counted source rows; every Engine View row carries Usable_On_Hand_Qty');
}

// ===================== S3: money, permissions, duplicates, relationships, optional tables =====================
console.log('\n--- S3 Proof D cases 11-16: money, permissions, duplicates, relationships, optional tables, malformed data');
const nanFree = o => !JSON.stringify(o, (k, v) => (typeof v === 'number' && !isFinite(v) ? '__NAN__' : v)).includes('__NAN__');
{ // 11a. missing cost (currency confirmed)
  const r = go(T => { T.stock.find(s => s.Item_ID === 'P2').Unit_Cost = ''; });
  ok(r.ad.status === 'restricted' && r.ad.gate.money.withhold && /COST_MISSING/.test(r.ad.gate.money.reasons.join()) && !nanFree(r.out) && nanFree(r.g.result),
    'case 11 (one missing unit cost): the engine’s own £ totals are NaN; the gate withholds every money output, so the gated result contains no NaN');
  ok(r.g.result.result.tot.withheld === true && find(r.g.result, 'P1').abc.withheld === true && find(r.g.result, 'P1').val.withheld === true &&
    find(r.g.result, 'P1').av === find(r.out, 'P1').av && find(r.g.result, 'P1').sev === find(r.out, 'P1').sev,
    'case 11: stock value, ABC and item values are withheld markers; quantities and risk (available, severity) pass through unchanged');
}
{ // 11b. foreign currency
  const r = go(null, { currency: 'USD' });
  ok(r.imp.permissions.financial.status !== 'allowed' && r.ad.status === 'restricted' && r.ad.gate.money.withhold && /FINANCIAL_NOT_ALLOWED/.test(r.ad.gate.money.reasons.join()) &&
    r.g.result.clientQuestions.withheld === true && r.g.result.clientQuestions.reason === 'POLICY_UNDECIDED_B11',
    'case 11 (USD files): financial permission withheld → money outputs withheld and client questions withheld pending B11');
  ok(['P1', 'P2', 'M1', 'M2'].every(id => find(r.g.result, id).av === find(ctl.out, id).av && find(r.g.result, id).sev === find(ctl.out, id).sev && find(r.g.result, id).cat.withheld === true),
    'case 11: available stock and risk equal the GBP run; health category (value-weighted) is withheld');
}
{ // 12. permissions: incomplete, blocked, caveated
  const bad = (T, id, months) => months.forEach(m => { T.demand.find(d => d.Item_ID === id && d.Period_Start === MONTHS[m]).Units = 'abc'; });
  const inc = go(T => bad(T, 'P1', [3]));
  ok(V.reliabilityOf(inc.imp, 'P1', 'demand') === 'incomplete' && inc.ad.gate.items.P1.withhold.length === 0 && inc.ad.gate.items.P1.labels.some(l => l.status === 'incomplete') &&
    !find(inc.g.result, 'P1').sev.withheld, 'case 12 incomplete (one month rejected): labelled "incomplete", not withheld');
  const blk = go(T => bad(T, 'P1', [3, 7]));
  const pb = find(blk.g.result, 'P1'), p2 = find(blk.g.result, 'P2');
  ok(V.reliabilityOf(blk.imp, 'P1', 'demand') === 'blocked' && blk.ad.status === 'restricted' && pb.sev.withheld === true && pb.cover.withheld === true && pb.oh === find(blk.out, 'P1').oh &&
    blk.g.result.forecasts.P1.withheld === true, 'case 12 blocked (two months rejected): P1’s analysis outputs and forecast are withheld; its stock quantities stay');
  ok(eq(p2, find(blk.out, 'P2')) && blk.g.result.forecasts.P2 && !blk.g.result.forecasts.P2.withheld, 'case 12: P2 (not blocked) is released exactly as the engine calculated it');
  const cav = go(T => { T.demand.push(Object.assign({}, T.demand.find(d => d.Item_ID === 'P2' && d.Period_Start === MONTHS[5]))); });
  const det = V.reliabilityDetail(cav.imp, 'P2', 'demand');
  ok(V.reliabilityOf(cav.imp, 'P2', 'demand') === 'caveated' && det.statuses.includes('caveated') && cav.ad.gate.items.P2.withhold.length === 0 &&
    cav.ad.gate.items.P2.labels.some(l => l.status === 'caveated' && l.code === 'CAVEAT') && !find(cav.g.result, 'P2').sev.withheld,
    'case 12 caveated (kept duplicate demand row): labelled "caveated" (mandatory test 2: the caveat reaches the adapter output), never treated as blocked');
  ok(engineRows(cav.ad.workbook, 'Demand History').filter(d => d.SKU === 'P2').length === 25, 'case 12: the kept duplicate is passed through as its own row (never merged or doubled by the adapter)');
  const both = go(T => { bad(T, 'P1', [3]); T.demand.push(Object.assign({}, T.demand.find(d => d.Item_ID === 'P1' && d.Period_Start === MONTHS[9]))); });
  const d2 = V.reliabilityDetail(both.imp, 'P1', 'demand');
  ok(d2.status === 'caveated' && eq(d2.statuses, ['caveated', 'incomplete']) && both.ad.gate.items.P1.labels.filter(l => l.analysis === 'demand').map(l => l.status).sort().join() === 'caveated,incomplete',
    'case 12 caveated + incomplete: reliabilityOf still says "caveated"; reliabilityDetail and the gate keep both, so "caveated" no longer hides "incomplete"');
  // mandatory test 3: a blocked analysis is never shown as available (dataset level)
  const allBad = go(T => [0, 1, 2].forEach(m => { const d = T.demand.find(x => x.Item_ID === 'P1' && x.Period_Start === MONTHS[m]); d.Item_ID = ''; d.Units = 'abc'; }));
  ok(allBad.imp.permissions.analyses.demand !== 'available' && allBad.g.result.forecasts.withheld === true && find(allBad.g.result, 'P1').sev.withheld === true && find(allBad.g.result, 'P2').sev.withheld === true,
    `case 12 dataset-level (3 of 48 demand rows rejected and not linkable to an item: demand analysis "${allBad.imp.permissions.analyses.demand}"): forecasts and every finished good’s analysis outputs are withheld (mandatory test 3)`);
}
{ // 13. duplicates and conflicts
  const conf = go(T => { T.stock.push(st('P1', 'W1', 61, 0, 0, 20, 10, 50)); });
  ok(conf.ad.status === 'refused' && conf.ad.report.refusals.some(x => x.code === 'IMPORT_NOT_ACCEPTED' || x.code === 'REQUIRED_TABLE_UNAVAILABLE'), 'case 13: conflicting stock rows (same item and location, different quantity) are refused');
  const ex = go(T => { T.po_lines.push(Object.assign({}, T.po_lines[0])); });
  ok(ex.imp.importAccepted && ex.ad.status === 'complete' && engineRows(ex.ad.workbook, 'Purchase Orders').length === 2, 'case 13: an exact duplicate PO line is removed by Stage 1 (A6); the engine receives one row');
}
{ // 14. missing relationships and unsupported roles
  const r = go(T => { T.po_lines.push({ PO_ID: 'PO3', Line_No: '1', Supplier_ID: 'S9', Item_ID: 'M1', Order_Date: '2026-08-01', Promised_Date: '2026-08-15', Ordered_Qty: 50, Received_Qty: 50, Last_Receipt_Date: '2026-08-15', Unit_Cost: 5, Status: 'Closed' }); });
  ok(r.imp.dataset.suppliers.some(s => s.__placeholder) && !engineRows(r.ad.workbook, 'Suppliers').some(s => s.Supplier_ID === 'S9') && r.ad.report.excludedPlaceholders.suppliers === 1 &&
    r.out.result.sup.some(s => s.id === 'S9' && s.known === false), 'case 14: an unknown supplier’s placeholder row never reaches the engine (E10); the engine treats S9 as unlisted, as on a direct upload');
  const res = go(T => { T.items.push({ Item_ID: 'R1', Item_Name: 'Resold valve', Is_Sold: 'Y', Replenishment: 'Buy', Unit_of_Measure: 'each', Standard_Cost: 3 }); T.stock.push(st('R1', 'W1', 10, 0, 0, '', '', 3)); });
  ok(refusedWith(res, 'POLICY_UNDECIDED_B14') && res.ad.report.refusals[0].items.join() === 'R1 (Buy + sold)', 'case 14: a bought-for-resale item is refused with POLICY_UNDECIDED_B14, naming the item');
  const sub = go(T => { T.items.push({ Item_ID: 'SA1', Item_Name: 'Sub-assembly', Is_Sold: 'N', Replenishment: 'Make', Unit_of_Measure: 'each', Standard_Cost: 3 }); T.stock.push(st('SA1', 'W1', 10, 0, 0, '', '', 3)); });
  ok(refusedWith(sub, 'POLICY_UNDECIDED_B14'), 'case 14: a made-but-not-sold item is refused with POLICY_UNDECIDED_B14');
}
{ // 15. empty and optional tables
  const r = go(T => { delete T.po_lines; });
  ok(r.ad.status === 'restricted' && r.ad.gate.analyses.purchasing === 'unavailable' && r.g.labelled.some(l => /purchasing analysis not available/.test(l.label)) &&
    !r.g.withheld.some(w => /sup|recon/.test(w.path)) && r.ad.gate.items.M1.labels.some(l => l.code === 'TABLE_NOT_SUPPLIED'),
    'case 15: no PO file → purchasing "unavailable": its sections are labelled, not withheld, and items carry TABLE_NOT_SUPPLIED');
  const e = go(T => { T.bom = []; });
  ok(e.imp.importAccepted && e.ad.workbook && engineRows(e.ad.workbook, 'BOM').length === 0 && e.out && e.g.status !== 'refused', 'case 15: an empty BOM file (header only) gives an empty BOM sheet; the run completes');
  const none = go(T => { delete T.demand; });
  ok(none.ad.status !== 'refused' && none.ad.report.demand.basis === 'none supplied' && engineRows(none.ad.workbook, 'Demand History').length === 0, 'case 15: no demand file at all: the engine receives an empty Demand History sheet; analyses depending on it are labelled');
}
{ // 16. malformed reliability information and malformed inputs (mandatory test 4: unknown statuses fail safe)
  const base = ctl.imp, clone = o => JSON.parse(JSON.stringify(o));
  const fake = (patch) => { const c = clone(base); patch(c); const df = o => { if (o && typeof o === 'object') { Object.freeze(o); Object.values(o).forEach(df); } return o; }; return df(c); };
  const m1 = fake(c => { c.permissions.items.P1 = { weird: 1 }; }), a1 = A.build(m1, ctl.mapping);
  ok(a1.status === 'restricted' && a1.gate.items.P1.withhold.some(w => /ITEM_ENTRY_MALFORMED/.test(w.reason)), 'case 16: a malformed item permission entry → that item’s outputs are withheld (ITEM_ENTRY_MALFORMED)');
  const m2 = fake(c => { c.permissions.analyses.production = 'mystery'; }), a2 = A.build(m2, ctl.mapping), o2 = E.runEngine({ workbook: a2.workbook }), g2 = RG.apply(o2, a2.gate);
  ok(g2.result.feas.withheld === true && g2.withheld.some(w => /ANALYSIS_PRODUCTION_MYSTERY/.test(w.reason)) && find(g2.result, 'P1').sev.withheld === true,
    'case 16: an unknown analysis status ("mystery") fails safe: its sections and the dependent item outputs are withheld (mandatory test 4)');
  ok(V.reliabilityDetail(null, 'P1', 'demand').status === 'blocked' && V.reliabilityDetail(base, 'P1', 'nope').reasons[0].code === 'ANALYSIS_UNKNOWN' && V.reliabilityDetail(base, 'ZZ', 'demand').reasons[0].code === 'ITEM_NOT_IMPORTED',
    'case 16: reliabilityDetail fails safe on a missing result, an unknown analysis and an unknown item');
  ok(A.build(null, ctl.mapping).report.refusals[0].code === 'ADAPTER_INPUT_INVALID' && A.build(base, { nope: 1 }).report.refusals[0].code === 'ADAPTER_MAPPING_INVALID' &&
    RG.apply(ctl.out, { version: 'RG1' }).status === 'refused' && RG.apply({}, ctl.ad.gate).status === 'refused' && RG.apply({}, ctl.ad.gate).result === null,
    'case 16: malformed adapter input or mapping is refused; the gate releases nothing for a malformed specification or engine output');
}
{ // 17. frozen input and immutability
  const unfrozen = JSON.parse(JSON.stringify(ctl.imp));
  ok(A.build(unfrozen, ctl.mapping).report.refusals[0].code === 'ADAPTER_INPUT_NOT_FROZEN', 'case 17: an unfrozen Stage 1 result is refused (it may have been changed after validation)');
  const before = JSON.stringify(ctl.imp), ad1 = A.build(ctl.imp, ctl.mapping), ad2 = A.build(ctl.imp, ctl.mapping);
  ok(JSON.stringify(ctl.imp) === before && Object.isFrozen(ad1) && Object.isFrozen(ad1.report) && Object.isFrozen(ad1.gate) && Object.isFrozen(ad1.gate.items) && JSON.stringify(ad1.report) === JSON.stringify(ad2.report),
    'case 17: the adapter does not change its input; its result, report and gate are frozen; two builds give identical reports (pure function)');
  const out = E.runEngine({ workbook: ad1.workbook }), snap = JSON.stringify(out, (k, v) => (typeof v === 'number' && !isFinite(v) ? 'N' : v)), g = RG.apply(out, Object.assign({}, ad1.gate, { money: { withhold: true, reasons: ['TEST'] } }));
  ok(JSON.stringify(out, (k, v) => (typeof v === 'number' && !isFinite(v) ? 'N' : v)) === snap && Object.isFrozen(g) && Object.isFrozen(g.result.result.fg[0]) && find(out, 'P1').tot === undefined && typeof out.result.tot === 'number',
    'case 17: the gate never changes the engine output (it works on a frozen copy)');
  ok(A.build(ctl.imp, ctl.mapping, { b6: 'A' }).report.refusals[0].code === 'ADAPTER_OPTION_UNKNOWN', 'case 17: unapproved options are refused (ADAPTER_OPTION_UNKNOWN)');
}

// ===================== S4: sales lines (M1 D14, E6) and refused policies =====================
console.log('\n--- S4 Proof D cases 18-19: sales-line conversion and undecided policies');
const SALES = () => [
  { SO_ID: 'SO1', Line_No: '1', Item_ID: 'P1', Order_Date: '2026-09-01', Ordered_Qty: 10, Shipped_Qty: 10, Last_Ship_Date: '2026-09-10', Status: 'Shipped' },
  { SO_ID: 'SO2', Line_No: '1', Item_ID: 'P1', Order_Date: '2026-09-20', Ordered_Qty: 10, Shipped_Qty: 6, Last_Ship_Date: '2026-10-05', Status: 'Part shipped' },
  { SO_ID: 'SO3', Line_No: '1', Item_ID: 'P1', Order_Date: '2026-09-21', Ordered_Qty: 5, Shipped_Qty: 0, Last_Ship_Date: '', Status: 'Cancelled', Cancel_Reason: 'customer' },
  { SO_ID: 'SO4', Line_No: '1', Item_ID: 'P1', Order_Date: '2026-10-01', Ordered_Qty: 8, Shipped_Qty: 3, Last_Ship_Date: '2026-10-20', Status: 'Cancelled' },
  { SO_ID: 'SO5', Line_No: '1', Item_ID: 'P2', Order_Date: '2026-09-02', Ordered_Qty: 20, Shipped_Qty: 20, Last_Ship_Date: '2026-09-12', Status: 'Shipped' },
  { SO_ID: 'SO6', Line_No: '1', Item_ID: 'P2', Order_Date: '2026-10-02', Ordered_Qty: 7, Shipped_Qty: 7, Last_Ship_Date: '2026-10-12', Status: 'Shipped' },
  { SO_ID: 'SO7', Line_No: '1', Item_ID: 'P2', Order_Date: '2026-10-25', Ordered_Qty: 9, Shipped_Qty: 0, Last_Ship_Date: '', Status: 'Open' }];
{
  const r = go(T => { delete T.demand; T.sales_lines = SALES(); T.dataset[0].Demand_Basis = ''; });
  const dem = r.ad.workbook ? engineRows(r.ad.workbook, 'Demand History').map(d => d.SKU + ' ' + d.Month_Start.toISOString().slice(0, 7) + ' ' + d.Units_Sold) : [];
  ok(r.ad.status !== 'refused' && eq(dem.sort(), ['P1 2026-09 10', 'P1 2026-10 9', 'P2 2026-09 20', 'P2 2026-10 7']),
    'case 18: history = shipped quantity by ship month: P1 Sep 10, Oct 6 + 3 (partly shipped and the shipped part of a cancelled line) = 9; P2 Sep 20, Oct 7');
  ok(eq(r.ad.report.commitments.map(c => c.soId + ':' + c.openQty), ['SO2:4', 'SO7:9']), 'case 18: open quantities (SO2 4, SO7 9) are commitments, kept separate; cancelled lines (SO3, SO4) leave no commitment');
  ok(!engineRows(r.ad.workbook, 'Demand History')[0].hasOwnProperty('Forecast_Units') && /last ship month/.test(r.ad.report.demand.note), 'case 18: no forecast column is invented; the report states the one-ship-date limit');
  ok(refusedWith(go(T => { delete T.demand; T.sales_lines = SALES().concat([{ SO_ID: 'SO8', Line_No: '1', Item_ID: 'P2', Order_Date: '2026-10-02', Ordered_Qty: 4, Shipped_Qty: 4, Last_Ship_Date: '', Status: 'Shipped' }]); }), 'SALES_LINE_SHIP_DATE_MISSING'),
    'case 18: a shipped quantity without a ship date is refused (no date is invented)');
  ok(refusedWith(go(T => { delete T.demand; T.sales_lines = SALES().filter(s => s.SO_ID !== 'SO6'); }), 'POLICY_UNDECIDED_B17'), 'case 18/19: an item with no shipment in a month inside the file’s span is refused (B17 undecided)');
  ok(refusedWith(go(T => { T.sales_lines = SALES(); }), 'POLICY_UNDECIDED_B18'), 'case 19: demand file and sales lines together are refused (B18 undecided)');
  ok(refusedWith(go(T => { T.dataset[0].Demand_Basis = 'orders'; }), 'POLICY_UNDECIDED_B19'), 'case 19: a demand file labelled "orders" is refused (B19 undecided)');
  ok(refusedWith(go(T => { T.dataset[0].Demand_Basis = ''; }), 'DEMAND_BASIS_NOT_LABELLED'), 'case 19: an unlabelled demand file is refused (M1 D14 requires the label)');
}
{
  ok(refusedWith(go(T => setStock(T, [st('P1', 'W1', 60, 0, 0, 20, 10, 50), st('P1', 'QUAR', 5, 5, 0, '', '', 50)])), 'POLICY_UNDECIDED_B4'), 'case 19: allocated stock in an excluded location is refused (B4 undecided)');
  ok(refusedWith(go(T => setStock(T, [st('P1', 'W1', 60, 0, 0, 20, 10, 50), st('P1', 'W2', 5, 0, 0, '', '', 55)])), 'POLICY_UNDECIDED_B7'), 'case 19: different unit costs across counted locations are refused (B7 undecided)');
  ok(refusedWith(go(T => setStock(T, [st('P1', 'W1', 60, 0, 0, 20, 10, 50), st('P1', 'W2', 5, 0, 0, 15, '', 50)])), 'POLICY_UNDECIDED_B9'), 'case 19: reorder points at two counted locations are refused (B9 undecided)');
  ok(refusedWith(go(T => setStock(T, [st('P1', 'W1', 60, 3, 0, 20, 10, 50), st('P1', 'W2', 5, '', 0, '', '', 50)])), 'STOCK_FIELD_PARTLY_BLANK'), 'case 19: allocated blank at one counted location and filled at another is refused (no zero is invented)');
}

// ===================== S5: reliabilityDetail and mandatory test 1 =====================
console.log('\n--- S5 reliabilityDetail beside the unchanged reliabilityOf');
{
  const R0 = { permissions: { dataset: { status: 'allowed' }, analyses: { demand: 'available', purchasing: 'unavailable', production: 'available', materials: 'stopped' }, items: {} }, dataset: { items: ['A', 'B', 'C', 'D', 'E'].map(Item_ID => ({ Item_ID })) } };
  R0.permissions.items = { A: { incomplete: { demand: '1 month' }, caveats: { demand: V.CAVEAT_DUP } }, B: { noDemandHistory: true }, C: { blocked: { demand: 'x' } }, D: { caveats: { demand: 'odd' } } };
  const grid = []; for (const id of ['A', 'B', 'C', 'D', 'E', 'Z']) for (const a of ['demand', 'purchasing', 'production', 'materials', 'stock']) grid.push([id, a]);
  ok(grid.every(([id, a]) => { const d = V.reliabilityDetail(R0, id, a); return d.status === V.reliabilityOf(R0, id, a) && d.statuses[0] === d.status && Object.isFrozen(d) && Object.isFrozen(d.reasons); }),
    `on a ${grid.length}-case grid, reliabilityDetail().status always equals reliabilityOf() and is the first (worst) of its statuses; results are frozen`);
  ok(eq(['A', 'B', 'C', 'D', 'E'].map(id => V.reliabilityOf(R0, id, 'demand')), ['caveated', 'incomplete', 'blocked', 'blocked', 'available']) && V.reliabilityOf(R0, 'E', 'purchasing') === 'blocked',
    'reliabilityOf() unchanged: caveated, incomplete, blocked, blocked (unrecognised caveat), available; purchasing (not supplied) blocked');
  ok(eq(V.reliabilityDetail(R0, 'A', 'demand').statuses, ['caveated', 'incomplete']) && V.reliabilityDetail(R0, 'E', 'purchasing').reasons.map(r => r.code).join() === 'ANALYSIS_NOT_AVAILABLE,TABLE_NOT_SUPPLIED' &&
    V.reliabilityDetail(R0, 'E', 'materials').reasons.map(r => r.code).join() === 'ANALYSIS_NOT_AVAILABLE' && V.reliabilityDetail(R0, 'B', 'demand').reasons[0].code === 'NO_DEMAND_HISTORY',
    'reliabilityDetail keeps every status and reason: caveated + incomplete; "not supplied" (TABLE_NOT_SUPPLIED) is distinguishable from "stopped"; no demand history is named');
  const r1 = go(T => { T.demand.find(d => d.Item_ID === 'P2' && d.Period_Start === MONTHS[3]).Units = 'abc'; });
  ok(r1.ad.gate.items.P2 && r1.ad.gate.items.P2.labels.some(l => l.code === 'INCOMPLETE') && !ctl.ad.gate.items.P2,
    'mandatory test 1: the Stage 1 reliability result reaches the adapter (a changed permission changes the gate specification)');
}

// ===================== S6: no money-derived value escapes the gate (evidence check against the engine) =====================
console.log('\n--- S6 money: every output that changes with costs is withheld by the gate (Northstar, per-item cost factors)');
{
  const MONEY = { Products: ['Standard_Cost_GBP', 'Selling_Price_GBP'], Materials: ['Standard_Cost_GBP'], Inventory: ['Unit_Cost_GBP'], 'Purchase Orders': ['Unit_Cost_GBP'] };
  const scaled = f => { const w = nsWb(); for (const [s, cols] of Object.entries(MONEY)) { const rows = X.utils.sheet_to_json(w.Sheets[s], { raw: true, cellDates: true });
    rows.forEach(r => { const id = r.SKU || r.Material_ID || r.Item_ID, k = [...String(id)].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) % 97; cols.forEach(c => { if (typeof r[c] === 'number') r[c] = f(r[c], k); }); });
    w.Sheets[s] = X.utils.json_to_sheet(rows, { cellDates: true }); } return X.read(X.write(w, { type: 'array', bookType: 'xlsx' }), { cellDates: true }); };
  const spec = { version: 'RG1', money: { withhold: true, reasons: ['TEST'] }, clientQuestions: { withhold: false, reason: null }, analyses: { demand: 'available', purchasing: 'available', production: 'available', materials: 'available' }, items: {} };
  const leaves = (v, p, o) => { if (Object.prototype.toString.call(v) === '[object Date]') { o[p] = +v; return o; } if (v && typeof v === 'object') { for (const k of Object.keys(v)) leaves(v[k], p + '.' + k, o); return o; } o[p] = typeof v === 'number' && !isFinite(v) ? 'N' + v : v; return o; };
  const g = w => { const r = RG.apply(E.runEngine({ workbook: w }), spec).result; const c = JSON.parse(JSON.stringify(r)); c.mrp.sort((a, b) => (a.x.id < b.x.id ? -1 : 1)); return leaves(c, '', {}); };
  const raw = w => leaves(JSON.parse(JSON.stringify(E.runEngine({ workbook: w }), (k, v) => (typeof v === 'number' && !isFinite(v) ? 'N' : v))), '', {});
  const w1 = scaled(v => v), w2 = scaled((v, k) => v * (1.3 + (k % 11) / 10));
  const r1 = raw(w1), r2 = raw(w2), changedRaw = Object.keys(r1).filter(k => r1[k] !== r2[k]).length;
  const a = g(w1), b = g(w2), leaked = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(k => a[k] !== b[k]);
  ok(changedRaw > 1000 && leaked.length === 0, `costs scaled per item: ${changedRaw > 1000 ? 'over 1,000' : changedRaw} raw engine values change; after the gate none differ (${leaked.slice(0, 3).join(', ') || 'no leaks'}; MRP rows compared by item, their order is labelled)`);
}

console.log(`\nimport-adapter: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
