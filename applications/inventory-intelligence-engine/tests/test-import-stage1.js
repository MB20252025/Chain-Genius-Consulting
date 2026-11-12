#!/usr/bin/env node
/* v0.7 M1 Stage 1 tests (A1 library, A2 canonical definitions, A3 readers and cleaning).
 * Run from tests/:  node test-import-stage1.js            (all checks, then the same checks in 5 time zones)
 *                   node test-import-stage1.js --once     (one time zone only; used internally)
 * Needs: Node 22, python3 (standard library only), the pinned test packages (NODE_PATH) for writing test .xlsx files.
 * Uses the app's own bundled SheetJS (assets/xlsx.mini.min.js) for all reading, as the browser would.
 */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), vm = require('vm'), cp = require('child_process');
const APP = path.resolve(__dirname, '..'), LIB = path.join(__dirname, 'fixtures', 'library');
const ZONES = ['UTC', 'Europe/London', 'America/New_York', 'Asia/Kolkata', 'Pacific/Auckland'];

if (!process.argv.includes('--once')) {
  // Run the full set in each time zone; outputs must be identical apart from the zone line.
  // The final summary ADDS the checks of every zone, so a failure in any one zone is always counted as a failure
  // (run-all.sh reads the last "import-stage1 all zones: N passed, M failed" line and also treats a non-zero exit as an error).
  let P = 0, Fl = 0;
  const outs = ZONES.map(z => {
    const r = cp.spawnSync(process.execPath, [__filename, '--once'], { env: Object.assign({}, process.env, { TZ: z }), encoding: 'utf8', maxBuffer: 64e6 });
    process.stdout.write(`\n===== TZ=${z} (exit ${r.status}) =====\n` + r.stdout + r.stderr);
    const m = /import-stage1: (\d+) passed, (\d+) failed\s*$/.exec(r.stdout.trim());
    if (m && r.status === (+m[2] ? 1 : 0)) { P += +m[1]; Fl += +m[2]; } else { Fl++; console.log(`FAIL: ${z}: no valid summary line or unexpected exit code ${r.status}`); }
    return { z, status: r.status, body: r.stdout.split('\n').filter(l => !l.startsWith('time zone:')).join('\n') };
  });
  const same = outs.every(o => o.body === outs[0].body);
  same ? P++ : Fl++;
  console.log(`\n${same ? 'PASS' : 'FAIL'}: results identical in all ${ZONES.length} time zones`);
  console.log(`import-stage1 all zones: ${P} passed, ${Fl} failed`);
  process.exit(Fl ? 1 : 0);
}

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? 'PASS: ' : 'FAIL: ') + m); };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
console.log('time zone: ' + (process.env.TZ || '(default)'));

// ---- load the app's SheetJS and the Stage 1 modules exactly as plain scripts
vm.runInThisContext(fs.readFileSync(path.join(APP, 'assets', 'xlsx.mini.min.js'), 'utf8'));
for (const f of ['canonical', 'read', 'clean']) vm.runInThisContext(fs.readFileSync(path.join(APP, 'js', 'import', f + '.js'), 'utf8'), { filename: f + '.js' });
const { canonical: C, read: RD, clean: CL } = globalThis.CGImport;

// ===================== A1: library integrity =====================
console.log('\n--- A1 library');
const man = fs.readFileSync(path.join(LIB, 'MANIFEST.sha256'), 'utf8').trim().split('\n');
let bad = [];
for (const l of man) { const [h, p] = l.split(/\s+/); const got = crypto.createHash('sha256').update(fs.readFileSync(path.join(LIB, p))).digest('hex'); if (got !== h) bad.push(p); }
ok(bad.length === 0, `library MANIFEST: ${man.length} files, ${bad.length} changed${bad.length ? ' (' + bad.slice(0, 5).join(', ') + ')' : ''}`);
const listed = new Set(man.map(l => l.split(/\s+/)[1].replace(/^\.\//, '')));
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.relative(LIB, path.join(d, e.name))]);
const extra = walk(LIB).filter(p => p !== 'MANIFEST.sha256' && !listed.has(p));
ok(extra.length === 0, `no unlisted files in the library${extra.length ? ' (' + extra.join(', ') + ')' : ''}`);
const PKG = { '01': '01-Clean-Manufacturer', '02': '02-Messy-Manufacturer/expected-canonical', '03': '03-Distributor', '04': '04-Mixed-Make-Buy', '05': '05-Performance-Dataset' };
const edge = fs.readdirSync(path.join(LIB, '06-Edge-Cases')).filter(n => /^E\d\d/.test(n)).sort();
const refTargets = Object.entries(PKG).map(([k, p]) => [k, path.join(LIB, p), path.join(LIB, p.split('/')[0], 'expected-results.json')])
  .concat(edge.map(e => [e, path.join(LIB, '06-Edge-Cases', e, 'input'), path.join(LIB, '06-Edge-Cases', e, 'expected-results.json')]));
const py = cp.spawnSync('python3', ['-B', '-c', `
import sys, json; sys.path.insert(0, sys.argv[1]); import refcalc
for folder in sys.argv[2:]: print(json.dumps(refcalc.compute(folder), sort_keys=True))`, path.join(__dirname, 'tools', 'library'), ...refTargets.map(t => t[1])], { encoding: 'utf8', maxBuffer: 256e6 });
ok(py.status === 0, 'reference calculator ran (python3, standard library only)' + (py.status ? ': ' + py.stderr.slice(0, 300) : ''));
const recomputed = py.stdout.trim().split('\n');
refTargets.forEach(([k, , exp], i) => {
  const a = JSON.parse(recomputed[i] || 'null'), b = JSON.parse(fs.readFileSync(exp, 'utf8'));
  ok(eq(sortDeep(a), sortDeep(b)), `expected results reproduced exactly: ${k}`);
});
function sortDeep(o) { if (Array.isArray(o)) return o.map(sortDeep); if (o && typeof o === 'object') return Object.fromEntries(Object.keys(o).sort().map(k => [k, sortDeep(o[k])])); return o; }

// ===================== A2: canonical definitions against every canonical package =====================
console.log('\n--- A2 canonical definitions');
function loadCanonical(folder) {
  const out = {};
  for (const t of C.tableNames) {
    const p = path.join(folder, t + '.csv');
    if (!fs.existsSync(p)) continue;
    const tbl = RD.fromCSVText(fs.readFileSync(p, 'utf8'), t + '.csv');
    const def = C.TABLES[t];
    const unknown = tbl.headers.filter(h => !def.fields.some(f => f.name === h));
    const cols = def.fields.filter(f => tbl.headers.includes(f.name)).map(f => ({ f, res: CL.cleanColumn(f, RD.values(tbl, f.name), { dateFormat: 'ISO' }) }));
    const rows = tbl.rows.map((r, i) => Object.fromEntries(cols.map(c => [c.f.name, c.res.results[i].value])));
    const notOk = cols.flatMap(c => c.res.results.map((r, i) => ({ r, i, f: c.f.name })).filter(x => !['ok', 'missing'].includes(x.r.status)));
    out[t] = { tbl, rows, unknown, notOk, check: C.checkTable(t, rows) };
  }
  return out;
}
// E08 deliberately contains one duplicate each of: item, stock row, demand row (conflicting) and PO line (see its EXPECTED.md)
const expectedDupes = { 'E08-duplicate-records': { items: 1, stock: 1, demand: 1, po_lines: 1 } };
for (const [k, folder] of refTargets.map(t => [t[0], t[1]])) {
  const D = loadCanonical(folder);
  const probs = Object.entries(D).flatMap(([t, d]) => d.check.problems.map(p => `${t} row ${p.row} ${p.field}: ${p.problem}`));
  const unk = Object.entries(D).flatMap(([t, d]) => d.unknown.map(u => t + '.' + u));
  const notOk = Object.entries(D).flatMap(([t, d]) => d.notOk.map(x => `${t} row ${x.i} ${x.f}: ${x.r.status} ${x.r.reason || x.r.rule}`));
  const dup = Object.fromEntries(Object.entries(D).filter(([, d]) => d.check.duplicateKeys.length).map(([t, d]) => [t, d.check.duplicateKeys.length]));
  ok(probs.length === 0 && unk.length === 0 && notOk.length === 0, `${k}: every value valid in CDv1 as written (${Object.values(D).reduce((a, d) => a + d.rows.length, 0)} rows)` + (probs.length + unk.length + notOk.length ? ' — ' + [...probs, ...unk, ...notOk].slice(0, 4).join('; ') : ''));
  ok(eq(dup, expectedDupes[k] || {}), `${k}: duplicate keys ${JSON.stringify(dup)} (expected ${JSON.stringify(expectedDupes[k] || {})})`);
  const exp = JSON.parse(fs.readFileSync(path.join(path.dirname(refTargets.find(t => t[0] === k)[2]), 'expected-results.json'), 'utf8')).row_counts;
  const got = Object.fromEntries(Object.keys(exp).map(t => [t, D[t] ? D[t].rows.length : 0]));
  ok(eq(got, exp), `${k}: row counts equal expected-results.json`);
}

// ===================== A2b: field-policy test (CP1 addition) =====================
// The EXPECTED rules are written out here independently, from the approved M1 design (Part 3 / Deliverable 1 and decisions
// D8, D14, D17, D20); they are NOT read from canonical.js. Format per field: name:type:req:onInvalid[:neg]
//   type  id | text | num | date | flag | enum | pct      req  R = required, O = optional
//   onInvalid  RJ = reject the row, BF = blank the field and flag it
//   neg (num only)  no = negative invalid, flag = kept as entered and flagged. For non-number fields "neg" does NOT apply and is not checked.
// Design rule behind the onInvalid column: identifiers, dates, quantities and status text -> RJ; costs, prices, names,
// descriptions, lead times, order quantities/multiples, yes/no settings and forecast figures -> BF.
console.log('\n--- A2b field policies (independent specification)');
const SPEC = {
  dataset: ['', 'Format_Version:text:R:RJ', 'Business_Name:text:O:BF', 'Business_Type:text:O:BF', 'Snapshot_Date:date:R:RJ', 'Currency:enum:R:RJ', 'Demand_Basis:enum:O:BF',
    'Date_Format_By_File:text:O:BF', 'Source_Files:text:O:BF', 'Mapping_Name:text:O:BF'],
  items: ['Item_ID', 'Item_ID:id:R:RJ', 'Item_Name:text:R:BF', 'Item_Group:text:O:BF', 'Is_Sold:flag:R:RJ', 'Replenishment:enum:R:RJ', 'Unit_of_Measure:text:O:BF',
    'Standard_Cost:num:O:BF:no', 'Selling_Price:num:O:BF:no', 'Default_Supplier_ID:id:O:BF', 'Purchase_Lead_Time_Days:num:O:BF:no', 'Production_Lead_Time_Days:num:O:BF:no',
    'Min_Order_Qty:num:O:BF:no', 'Order_Multiple:num:O:BF:no', 'Active:flag:O:BF'],
  locations: ['Location_ID', 'Location_ID:id:R:RJ', 'Location_Name:text:O:BF', 'Include_In_Available:flag:O:BF'],
  stock: ['Item_ID+Location_ID', 'Item_ID:id:R:RJ', 'Location_ID:id:O:RJ', 'Snapshot_Date:date:R:RJ', 'On_Hand_Qty:num:R:RJ:flag', 'Allocated_Qty:num:O:RJ:no', 'On_Order_Qty:num:O:RJ:no',
    'Reorder_Point_Qty:num:O:RJ:no', 'Safety_Stock_Qty:num:O:RJ:no', 'Unit_Cost:num:O:BF:no'],
  demand: ['Item_ID+Period_Start+Location_ID', 'Item_ID:id:R:RJ', 'Period_Start:date:R:RJ', 'Units:num:R:RJ:no', 'Forecast_Units:num:O:BF:no', 'Location_ID:id:O:RJ'],
  sales_lines: ['SO_ID+Line_No', 'SO_ID:id:R:RJ', 'Line_No:id:O:RJ', 'Customer_ID:id:O:BF', 'Item_ID:id:R:RJ', 'Order_Date:date:R:RJ', 'Requested_Date:date:O:RJ',
    'Ordered_Qty:num:R:RJ:no', 'Shipped_Qty:num:O:RJ:no', 'Last_Ship_Date:date:O:RJ', 'Status:text:O:RJ', 'Cancel_Reason:text:O:BF'],
  suppliers: ['Supplier_ID', 'Supplier_ID:id:R:RJ', 'Supplier_Name:text:O:BF', 'Standard_Lead_Time_Days:num:O:BF:no', 'Country:text:O:BF', 'Payment_Terms:text:O:BF', 'Active:flag:O:BF'],
  supplier_items: ['Supplier_ID+Item_ID', 'Supplier_ID:id:R:RJ', 'Item_ID:id:R:RJ', 'Lead_Time_Days:num:O:BF:no', 'Unit_Cost:num:O:BF:no', 'Min_Order_Qty:num:O:BF:no', 'Preferred:flag:O:BF'],
  po_headers: ['PO_ID', 'PO_ID:id:R:RJ', 'Supplier_ID:id:R:RJ', 'Order_Date:date:R:RJ', 'Currency:text:O:BF', 'Freight:num:O:BF:no', 'Tax:num:O:BF:no', 'Header_Total:num:O:BF:no', 'Status:text:O:RJ'],
  po_lines: ['PO_ID+Line_No', 'PO_ID:id:R:RJ', 'Line_No:id:O:RJ', 'Supplier_ID:id:R:RJ', 'Item_ID:id:R:RJ', 'Order_Date:date:R:RJ', 'Promised_Date:date:O:RJ', 'Ordered_Qty:num:R:RJ:no',
    'Received_Qty:num:O:RJ:no', 'Last_Receipt_Date:date:O:RJ', 'Unit_Cost:num:O:BF:no', 'Status:text:O:RJ', 'Location_ID:id:O:RJ'],
  bom: ['Parent_Item_ID+Component_Item_ID', 'Parent_Item_ID:id:R:RJ', 'Component_Item_ID:id:R:RJ', 'Qty_Per:num:R:RJ:no', 'Scrap_Pct:pct:O:BF'],
  production_orders: ['Production_Order_ID', 'Production_Order_ID:id:R:RJ', 'Item_ID:id:R:RJ', 'Planned_Start_Date:date:O:RJ', 'Planned_Finish_Date:date:O:RJ', 'Actual_Start_Date:date:O:RJ',
    'Actual_Finish_Date:date:O:RJ', 'Planned_Qty:num:R:RJ:no', 'Completed_Qty:num:O:RJ:no', 'Status:text:O:RJ'],
};
const ENUMS = { 'dataset.Currency': ['GBP'], 'dataset.Demand_Basis': ['shipments', 'orders'], 'items.Replenishment': ['Make', 'Buy'] };
const SPECF = Object.fromEntries(Object.entries(SPEC).map(([t, [key, ...fs]]) => [t, { key: key ? key.split('+') : [], fields: fs.map(s => { const [name, type, req, inv, neg] = s.split(':'); return { name, type, req: req === 'R', onInvalid: inv === 'RJ' ? 'reject-row' : 'blank-flag', neg: neg || null }; }) }]));
ok(eq(Object.keys(SPECF).sort(), C.tableNames.slice().sort()), `the canonical model has exactly the 12 tables of the design: ${Object.keys(SPECF).join(', ')}`);
for (const [t, sp] of Object.entries(SPECF)) {
  const def = C.TABLES[t], diffs = []; let asserted = 0, na = 0;
  const names = def.fields.map(f => f.name), want = sp.fields.map(f => f.name);
  if (!eq(names.slice().sort(), want.slice().sort())) diffs.push('fields differ: extra [' + names.filter(n => !want.includes(n)) + '] missing [' + want.filter(n => !names.includes(n)) + ']');
  if (!eq(def.key, sp.key)) diffs.push('key ' + JSON.stringify(def.key) + ' expected ' + JSON.stringify(sp.key));
  for (const w of sp.fields) {
    const f = def.fields.find(x => x.name === w.name); if (!f) continue;
    for (const k of ['type', 'req', 'onInvalid']) { asserted++; if (f[k] !== w[k]) diffs.push(`${w.name}.${k} = ${f[k]}, expected ${w[k]}`); }
    if (w.type === 'num') { asserted++; if (f.neg !== w.neg) diffs.push(`${w.name}.neg = ${f.neg}, expected ${w.neg}`); } else na++;
    const ek = t + '.' + w.name;
    if (w.type === 'enum') { asserted++; if (!eq(f.values, ENUMS[ek])) diffs.push(`${w.name} allowed values ${JSON.stringify(f.values)}, expected ${JSON.stringify(ENUMS[ek])}`); } else na++;
  }
  ok(diffs.length === 0, `policy ${t}: ${sp.fields.length} fields, ${asserted} rules asserted, ${na} not applicable (neg only for numbers, allowed values only for enums)` + (diffs.length ? ' — ' + diffs.join('; ') : ''));
}

// ===================== A2c: structural validation test (CP1 addition) =====================
// For every table, a valid synthetic row is built from SPEC (above), then changed one way at a time. Each change must give
// exactly the expected problem (or none). Applies only the rules relevant to each field's type.
console.log('\n--- A2c structural validation (all 12 tables, synthetic rows)');
const GOOD = { id: 'X001', text: 'Sample', num: 5, date: '2026-10-31', flag: 'Y', pct: 0.05 };
const BAD = { id: [[123, 'not a valid id'], [' X001', 'not a valid id'], ['', 'not a valid id']], text: [[5, 'not a valid text']], num: [['abc', 'not a number'], [NaN, 'not a number']],
  date: [['31/10/2026', 'not an ISO date'], ['2026-02-30', 'not an ISO date']], flag: [['Yes', 'not Y/N']], enum: [['Other', 'not one of']], pct: [[1.5, 'not a fraction 0..1'], [-0.1, 'not a fraction 0..1']] };
for (const [t, sp] of Object.entries(SPECF)) {
  const base = Object.fromEntries(sp.fields.map(f => [f.name, f.type === 'enum' ? ENUMS[t + '.' + f.name][0] : GOOD[f.type]]));
  const probs = row => C.checkTable(t, [row]).problems.map(p => p.field + ': ' + p.problem);
  const wrong = []; let n = 0;
  const expect = (label, row, want) => { n++; const got = probs(row); if (!(got.length === want.length && want.every((w, i) => got[i] && got[i].startsWith(w)))) wrong.push(`${label} → ${JSON.stringify(got)} (expected ${JSON.stringify(want)})`); };
  expect('valid row', base, []);
  for (const f of sp.fields) {
    const r = Object.assign({}, base); r[f.name] = null;
    expect((f.req ? 'missing required ' : 'optional absent ') + f.name, r, f.req ? [f.name + ': required value missing'] : []);
    for (const [v, msg] of BAD[f.type]) { const r2 = Object.assign({}, base); r2[f.name] = v; expect(`${f.name}=${JSON.stringify(v)}`, r2, [f.name + ': ' + msg]); }
    if (f.type === 'enum') for (const v of ENUMS[t + '.' + f.name]) { const r3 = Object.assign({}, base); r3[f.name] = v; expect(`${f.name} allowed value ${v}`, r3, []); }
    if (f.type === 'num') { const r4 = Object.assign({}, base); r4[f.name] = -1; expect(`${f.name}=-1 (neg ${f.neg})`, r4, f.neg === 'no' ? [f.name + ': negative not allowed'] : []); }
  }
  const r5 = Object.assign({}, base, { Extra_Field: 'x' }); expect('unknown field', r5, ['Extra_Field: unknown field']);
  ok(wrong.length === 0, `structure ${t}: ${n} valid/invalid variations give exactly the expected problems` + (wrong.length ? ' — ' + wrong.slice(0, 3).join(' | ') : ''));
}

// Synthetic data for the two tables with no library data (sales_lines, po_headers): read as CSV, cleaned field by field
// with the approved rules, then checked. Value-level results only: row removal and relationships are Stage 2.
{
  const cleanCSV = (t, csv, fmt) => {
    const tbl = RD.fromCSVText(csv, t + '.csv');
    const cols = C.TABLES[t].fields.filter(f => tbl.headers.includes(f.name)).map(f => ({ f, res: CL.cleanColumn(f, RD.values(tbl, f.name), { dateFormat: fmt }) }));
    return { rows: tbl.rows.map((r, i) => Object.fromEntries(cols.map(c => [c.f.name, c.res.results[i].value]))), res: Object.fromEntries(cols.map(c => [c.f.name, c.res.results])) };
  };
  const sl = cleanCSV('sales_lines', 'SO_ID,Line_No,Customer_ID,Item_ID,Order_Date,Requested_Date,Ordered_Qty,Shipped_Qty,Last_Ship_Date,Status,Cancel_Reason\n' +
    'SO0001,10,C001,000123,03/10/2026,17/10/2026,100,100,16/10/2026,Shipped,\n' +
    'SO0001,20,C001,000124,03/10/2026,17/10/2026,"1,200",400,20/10/2026,Part shipped,\n' +
    'SO0002,10,C002,000123,25/10/2026,05/11/2026,50,0,,Open,\n' +
    'SO0003,10,C003,000125,01/09/2026,15/09/2026,30,0,,Cancelled,Out of stock\n' +
    'SO0004,10,C004,000126,02/10/2026,10/10/2026,TBC,,,Open,\n', 'UK');
  const good = sl.rows.slice(0, 4);
  ok(C.checkTable('sales_lines', good).ok && good[0].Item_ID === '000123' && good[1].Ordered_Qty === 1200 && good[3].Cancel_Reason === 'Out of stock',
    'sales_lines synthetic data: 4 valid rows (shipped, part-shipped, open, cancelled) clean and check; leading zeros kept; "1,200" → 1200');
  ok(sl.res.Ordered_Qty[4].status === 'invalid' && C.field('sales_lines', 'Ordered_Qty').onInvalid === 'reject-row' && sl.res.Order_Date[0].status === 'ambiguous',
    'sales_lines synthetic data: "TBC" ordered quantity is invalid (row would be rejected in Stage 2); 03/10/2026 reported as ambiguous');
  const ph = cleanCSV('po_headers', 'PO_ID,Supplier_ID,Order_Date,Currency,Freight,Tax,Header_Total,Status\n' +
    '0000045120,0000700012,2026-10-01,GBP,£250.00,"£2,050.00","£12,300.00",Open\n' +
    '0000045121,0000700013,2026-10-02,GBP,0,0,£980.00,Closed\n' +
    '0000045122,0000700012,2026-10-05,GBP,TBC,£40.00,£240.00,Open\n', 'ISO');
  const h = ph.rows;
  ok(C.checkTable('po_headers', h).ok && h[0].PO_ID === '0000045120' && h[0].Supplier_ID === '0000700012' && h[0].Tax === 2050 && h[0].Header_Total === 12300,
    'po_headers synthetic data: 3 rows clean and check; 10-digit codes keep leading zeros; £ and separators cleaned (£2,050.00 → 2050)');
  ok(ph.res.Freight[2].status === 'invalid' && h[2].Freight === null && C.field('po_headers', 'Freight').onInvalid === 'blank-flag',
    'po_headers synthetic data: "TBC" freight → field blank and flagged; row kept');
}

// ===================== A3: readers =====================
console.log('\n--- A3 readers');
{
  const csv = '﻿Part No,Desc,Qty,Date,Part No\r\n0000104523,"Bolt, M8",1,03/04/2026,X\r\n\r\n000123,"Two\nlines",  7 ,2026-10-31,Y\r\n, ,,,\r\n p0012 ,Spaces,"1,200",31/10/2026,Z\r\n';
  const t = RD.fromCSVText(csv, 'reader-test.csv');
  ok(eq(t.headers, ['Part No', 'Desc', 'Qty', 'Date', 'Part No_2']), 'CSV: byte-order mark removed; duplicate heading renamed and reported: ' + JSON.stringify(t.report.duplicateHeaders));
  ok(eq(RD.values(t, 'Part No'), ['0000104523', '000123', ' p0012 ']), 'CSV: leading zeros and surrounding spaces kept exactly as written');
  ok(eq(RD.values(t, 'Date'), ['03/04/2026', '2026-10-31', '31/10/2026']), 'CSV: dates kept as text (not read as US dates)');
  ok(eq(RD.values(t, 'Qty'), ['1', '  7 ', '1,200']), 'CSV: numbers kept as text (cleaning happens later)');
  ok(eq(RD.values(t, 'Desc'), ['Bolt, M8', 'Two\nlines', 'Spaces']), 'CSV: quoted commas and line breaks inside quotes kept');
  ok(eq(t.rows.map(r => r.row), [2, 4, 6]) && t.report.blankRowsSkipped === 2, 'CSV: blank rows skipped, spreadsheet row numbers preserved (2, 4, 6)');
}
{
  const XF = require('xlsx'); // pinned full SheetJS, used only to WRITE a test workbook
  const ws = XF.utils.aoa_to_sheet([['Code', 'Name', 'Qty', 'When', 'Stamp', 'Flag'], ['000123', 'text code', 5, null, null, true], [123, 'number code', 2.5, null, null, false]]);
  ws['D2'] = { t: 'n', v: 46326, z: 'dd/mm/yyyy' }; ws['D3'] = { t: 'n', v: 46085, z: 'm/d/yy' };
  ws['E2'] = { t: 'n', v: 46326.5, z: 'yyyy-mm-dd hh:mm' }; ws['E3'] = { t: 'e', v: 7, w: '#DIV/0!' };
  const wb0 = XF.utils.book_new(); XF.utils.book_append_sheet(wb0, ws, 'Stock');
  const bytes = XF.write(wb0, { type: 'buffer', bookType: 'xlsx' });
  const [t] = RD.fromWorkbook(RD.readWorkbook(bytes), 'reader-test.xlsx');
  ok(eq(RD.values(t, 'Code'), ['000123', '123']), 'Excel: text code keeps leading zeros; number-stored code read as "123"');
  ok(eq(RD.metasOf(t, 'Code').map(m => !!(m && m.numberCell)), [false, true]), 'Excel: number-stored code is marked (possible lost leading zeros)');
  ok(eq(RD.values(t, 'When'), ['2026-10-31', '2026-03-04']), 'Excel: date cells converted from the workbook date number, no time-zone shift');
  ok(eq(RD.values(t, 'Stamp'), ['2026-10-31', '']) && t.report.errorCells === 1, 'Excel: date-time cell gives its date (time noted); error cell is blank and counted');
  ok(eq(RD.values(t, 'Flag'), ['TRUE', 'FALSE']) && eq(RD.values(t, 'Qty'), ['5', '2.5']), 'Excel: booleans and numbers as plain text');
  const ck = CL.cleanColumn(C.field('stock', 'Item_ID'), RD.values(t, 'Code'), { metas: RD.metasOf(t, 'Code') });
  ok(ck.summary.warnings === 1 && /leading zeros/.test(ck.results[1].warning), 'Excel: cleaning carries the leading-zeros warning for the number-stored code');
}

// ===================== A3: cleaning rules (D6, D7, D8, D22) =====================
console.log('\n--- A3 cleaning rules');
const S = r => `${r.status}:${r.value}`;
const cases = [
  ['number', '1200', 'ok:1200'], ['number', '1,200', 'cleaned:1200'], ['number', '£5.50', 'cleaned:5.5'], ['number', '£1,234.56', 'cleaned:1234.56'],
  ['number', '(25)', 'cleaned:-25'], ['number', '-12', 'ok:-12'], ['number', ' 7 ', 'ok:7'], ['number', '', 'missing:null'],
  ['number', '12 units', 'invalid:null'], ['number', 'TBC', 'invalid:null'], ['number', '1.200,50', 'invalid:null'], ['number', '1,5', 'invalid:null'],
  ['number', '$5', 'invalid:null'], ['number', '€5', 'invalid:null'], ['number', '1e3', 'invalid:null'], ['number', '12,34', 'invalid:null'],
  ['pct', '5%', 'cleaned:0.05'], ['pct', '2.5%', 'cleaned:0.025'], ['pct', '0.02', 'ok:0.02'], ['pct', '0', 'ok:0'], ['pct', '5', 'invalid:null'],
  ['dateUK', '31/10/2026', 'cleaned:2026-10-31'], ['dateUK', '03/04/2026', 'ambiguous:2026-04-03'], ['dateUK', '05/05/2026', 'cleaned:2026-05-05'],
  ['dateUK', '11/23/2025', 'conflict:null'], ['dateUK', '2026-10-31', 'ok:2026-10-31'], ['dateUK', '2026-10-31 00:00:00', 'cleaned:2026-10-31'],
  ['dateUK', '2026-10-31 14:30', 'invalid:null'], ['dateUK', '31/10/26', 'invalid:null'], ['dateUK', '31/02/2026', 'invalid:null'], ['dateUK', '46085', 'invalid:null'],
  ['dateUK', '31-10-2026', 'cleaned:2026-10-31'], ['dateUK', '31.10.2026', 'cleaned:2026-10-31'],
  ['dateUS', '03/04/2026', 'ambiguous:2026-03-04'], ['dateUS', '31/10/2026', 'conflict:null'], ['dateISO', '31/10/2026', 'invalid:null'],
  ['id', '000123', 'ok:000123'], ['id', ' P0012 ', 'cleaned:P0012'], ['id', '1.04523E+11', 'invalid:null'], ['id', '', 'missing:null'],
  ['flag', 'Y', 'ok:Y'], ['flag', 'yes', 'cleaned:Y'], ['flag', 'FALSE', 'cleaned:N'], ['flag', 'Active', 'invalid:null'],
  ['enum', 'buy', 'cleaned:Buy'], ['enum', 'B', 'invalid:null'],
];
const fns = { number: v => CL.cleanNumber(v), pct: v => CL.cleanPercent(v), dateUK: v => CL.cleanDate(v, 'UK'), dateUS: v => CL.cleanDate(v, 'US'), dateISO: v => CL.cleanDate(v, 'ISO'),
  id: v => CL.cleanId(v), flag: v => CL.cleanFlag(v), enum: v => CL.cleanEnum(v, ['Make', 'Buy']) };
const wrong = cases.filter(([k, v, want]) => S(fns[k](v)) !== want).map(([k, v, want]) => `${k} "${v}" gave ${S(fns[k](v))}, expected ${want}`);
ok(wrong.length === 0, `${cases.length} cleaning cases give the approved result` + (wrong.length ? ' — ' + wrong.join(' | ') : ''));
ok(CL.cleanValue(C.field('stock', 'On_Hand_Qty'), '-12').flag === 'negative value kept as entered', 'negative stock is kept as entered and flagged');
ok(CL.cleanValue(C.field('po_lines', 'Ordered_Qty'), '-5').status === 'invalid', 'negative ordered quantity is invalid');
{
  const few = CL.assessDateColumn([...Array(99)].map(() => CL.cleanDate('31/10/2026', 'UK')).concat([CL.cleanDate('11/23/2025', 'UK')]));
  const many = CL.assessDateColumn([...Array(90)].map(() => CL.cleanDate('31/10/2026', 'UK')).concat([...Array(10)].map(() => CL.cleanDate('11/23/2025', 'UK'))));
  ok(few.decision === 'reject-rows' && many.decision === 'stop', `D6: 1 conflict in 100 → ${few.decision}; 10 in 100 → ${many.decision}`);
}

// ===================== A3: package 02 issues, value level =====================
console.log('\n--- A3 package 02 (documented issues, value level; matching, codes and duplicates are Stage 2)');
{
  const SRC = path.join(LIB, '02-Messy-Manufacturer', 'source-export'), EXC = path.join(LIB, '02-Messy-Manufacturer', 'expected-canonical');
  const T = n => RD.fromCSVText(fs.readFileSync(path.join(SRC, n), 'utf8'), n);
  const E = n => RD.fromCSVText(fs.readFileSync(path.join(EXC, n), 'utf8'), n);
  const items = T('ItemMaster_export.csv'), stock = T('StockByWarehouse.csv'), sales = T('Sales_History.csv'), po = T('PO_Lines.csv'), bom = T('BOM.csv');
  // I01/I02 costs
  const cost = CL.cleanColumn(C.field('items', 'Standard_Cost'), RD.values(items, 'Std Cost (£)'));
  const tbc = items.rows.filter((r, i) => cost.results[i].status === 'invalid').map(r => r.cells[0]);
  tbc.sort();
  ok(cost.summary.cleaned === items.rows.length - 2 && eq(tbc, ['M0044', 'P0026']), `I01/I02: ${cost.summary.cleaned} costs cleaned (£ and separators); "TBC" invalid for ${tbc.sort().join(', ')} → cost blank and flagged (row kept: ${C.field('items', 'Standard_Cost').onInvalid})`);
  // I05 thousands, I07 negative, I06 blanks, I14 UK dates
  const qoh = CL.cleanColumn(C.field('stock', 'On_Hand_Qty'), RD.values(stock, 'QOH'));
  const thou = qoh.summary.rules['thousands separators removed'] || 0;
  ok(thou === 16 && qoh.summary.invalid === 0, `I05: ${thou} QOH values had thousands separators (15 data rows + the TOTAL row, which Stage 2 rejects); none invalid`);
  const negIdx = stock.rows.findIndex(r => r.cells[1] === 'M0030' && r.cells[0] === 'MAIN');
  ok(qoh.results[negIdx].value === -12 && !!qoh.results[negIdx].flag, 'I07: M0030 at MAIN = −12, kept and flagged');
  const ss = CL.cleanColumn(C.field('stock', 'Safety_Stock_Qty'), RD.values(stock, 'Safety Stock'));
  const blankSS = [...new Set(stock.rows.filter((r, i) => ss.results[i].status === 'missing' && r.cells[0] === 'FGW').map(r => r.cells[1]))].sort();
  ok(['P0002', 'P0003', 'P0016', 'P0024', 'P0033'].every(x => blankSS.includes(x)), 'I06: blank Safety Stock read as missing (not 0) for P0002, P0003, P0016, P0024, P0033');
  const sd = CL.cleanColumn(C.field('stock', 'Snapshot_Date'), RD.values(stock, 'Stock Date'), { dateFormat: 'UK' });
  ok(sd.summary.ambiguous === 0 && sd.results.filter(r => r.value === '2026-10-31').length === stock.rows.length - 1, 'I14: Stock Date read as UK day/month/year → 2026-10-31 (TOTAL row blank)');
  // I17 ambiguous months
  const mon = CL.cleanColumn(C.field('demand', 'Period_Start'), RD.values(sales, 'Month'), { dateFormat: 'UK' });
  const expectAmb = RD.values(sales, 'Month').filter(v => !/^01\/01\//.test(v)).length;
  ok(mon.summary.ambiguous === expectAmb && mon.summary.dateDecision.decision === 'ok', `I17: ${mon.summary.ambiguous} sales months are ambiguous (every 01/MM except January), read as UK and reported for confirmation`);
  // I15 spaces
  const pc = CL.cleanColumn(C.field('demand', 'Item_ID'), RD.values(sales, 'Product Code'));
  ok(pc.summary.rules['trimmed spaces'] === 24 && pc.results.some(r => r.value === 'p0012'), 'I15: " p0012 " trimmed to "p0012" on 24 rows (case-insensitive matching to P0012 is Stage 2)');
  // I20/I21 PO rows
  const rq = CL.cleanColumn(C.field('po_lines', 'Received_Qty'), RD.values(po, 'Qty Received'));
  const due = CL.cleanColumn(C.field('po_lines', 'Promised_Date'), RD.values(po, 'Due Date'), { dateFormat: 'UK' });
  const inv = po.rows.filter((r, i) => rq.results[i].status === 'invalid').map(r => r.cells[0]);
  const conf = po.rows.filter((r, i) => due.results[i].status === 'conflict').map(r => r.cells[0]);
  ok(eq(inv, ['PO99901']) && C.field('po_lines', 'Received_Qty').onInvalid === 'reject-row', 'I20: "12 units" invalid on PO99901 → row rejected');
  ok(eq(conf, ['PO99902']) && due.summary.dateDecision.decision === 'reject-rows', `I21: 11/23/2025 on PO99902 is a date-format conflict → ${due.summary.dateDecision.decision} (${due.summary.dateDecision.conflict} of ${due.summary.dateDecision.supplied})`);
  // I22 scrap
  const sc = CL.cleanColumn(C.field('bom', 'Scrap_Pct'), RD.values(bom, 'Scrap %'));
  const want = RD.values(E('bom.csv'), 'Scrap_Pct').map(Number);
  ok(eq(sc.results.map(r => r.value), want), 'I22: every "5%"-style scrap value equals the expected canonical fraction');
  // values of ordinary stock rows equal the expected canonical data (matched by item + location in this test only)
  const ex = E('stock.csv'), key = r => r.cells[0] + '|' + r.cells[1];
  const exMap = new Map(ex.rows.map(r => [r.cells[0] + '|' + r.cells[1], r]));
  const oh = RD.column(ex, 'On_Hand_Qty');
  let matched = 0, diff = [];
  stock.rows.forEach((r, i) => { const e = exMap.get(r.cells[1] + '|' + r.cells[0]); if (!e) return; matched++; if (qoh.results[i].value !== Number(e.cells[oh])) diff.push(r.cells[1]); });
  ok(matched >= 159 && diff.length <= 1 && (diff.length === 0 || diff[0] === 'P0006'), `stock quantities equal expected canonical for ${matched - diff.length} of ${matched} matching rows${diff.length ? ' (the other is the I09 conflicting duplicate, resolved in Stage 2)' : ''}`);
}

console.log(`\nimport-stage1: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
