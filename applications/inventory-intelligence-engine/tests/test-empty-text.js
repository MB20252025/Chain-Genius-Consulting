#!/usr/bin/env node
/* DR-4 regression test: on the direct-upload route a blank cell means "no value", however the blank is represented.
 *
 * Semantic model (the same as Universal Import Stage 1, clean.js: blank -> missing, never 0): a cell that is absent (no cell),
 * holds an empty string, holds only spaces (including tabs and non-breaking spaces) or holds null is read by excel-import.js
 * rows() as an absent value. Numbers (including 0) and any other text (including "0") are real values and are unchanged.
 * Before DR-4 an empty-text or null cell reached the engine as "" or null, and plain comparisons such as `"" < Ordered_Qty`
 * counted an open PO as received short and raised "Inconsistent PO dates".
 *
 * The main check is equivalence: for a number field, a date field and a text field, the four blank representations give a
 * COMPLETE engine output (result, MRP, feasibility, forecasts, client questions, confidence) identical to each other. The absent
 * cell is the reference because it is the representation the engine already handled correctly. Expected values (which POs are
 * received short) are computed independently from the sheet rows here, never taken from the code under test.
 *
 * Engine-level only: Northstar and Willow are changed IN MEMORY and round-tripped through .xlsx; nothing is written to disk.
 * Not covered (outside DR-4): numeric text in numeric fields ("0", "0.02" in a Qty or scrap column) is left as text, as before;
 * it is subject to the owner's pending scrap-text decision.
 * Run from tests/:  NODE_PATH=<pinned test node_modules> node test-empty-text.js
 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const APP = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
const ok = (c, m) => { let v = false, why = '';
  try { v = !!(typeof c === 'function' ? c() : c); } catch (e) { why = ' [threw: ' + (e && e.message ? e.message : String(e)) + ']'; }
  v ? pass++ : fail++; console.log((v ? 'PASS: ' : 'FAIL: ') + (typeof m === 'function' ? m() : m) + why); };
const read = f => fs.readFileSync(path.join(APP, f), 'utf8');
const ctx = vm.createContext({ TextDecoder, Uint8Array, Buffer, console }); ctx.globalThis = ctx;
vm.runInContext(read('assets/xlsx.mini.min.js'), ctx);
vm.runInContext(['calculations', 'forecasting', 'app', 'excel-import', 'engine/engine-api'].map(n => read('js/' + n + '.js')).join('\n') + ';globalThis.__E=CGEngine;', ctx, { filename: 'engine' });
const X = ctx.XLSX, E = ctx.__E;
const NS = fs.readFileSync(path.join(__dirname, 'fixtures', 'northstar', 'Chain_Genius_Project_001_Northstar_Dataset_1.xlsx'));
const WILLOW = fs.readFileSync(path.join(__dirname, 'fixtures', 'structure', 'scenario-willow.xlsx'));

// ---------- helpers: edit real cells, then write and re-read the workbook as an .xlsx file (as an upload is read)
const colOf = (ws, h) => { const r = X.utils.decode_range(ws['!ref']); for (let c = r.s.c; c <= r.e.c; c++) { const x = ws[X.utils.encode_cell({ r: r.s.r, c })]; if (x && x.v === h) return c; } throw new Error('no column ' + h); };
const addr = (ws, h, row) => X.utils.encode_cell({ r: row - 1, c: colOf(ws, h) });   // row = spreadsheet row number (2 = first data row)
const put = (ws, h, row, cell) => { const a = addr(ws, h, row); if (cell === undefined) delete ws[a]; else ws[a] = cell; };
const build = (buf, fn, mem) => { const w = X.read(buf, { cellDates: true }); fn(w); return mem ? w : X.read(X.write(w, { type: 'array', bookType: 'xlsx', cellDates: true }), { cellDates: true }); };
const run = w => E.runEngine({ workbook: w });
const full = o => JSON.stringify({ result: o.result, mrp: o.mrp, feas: o.feas, forecasts: o.forecasts, fc: o.forecastCredibility, q: o.clientQuestions, conf: o.confidence });
const dq = (o, re) => o.result.dq.find(q => re.test(q.msg));
const rawAt = (w, sheet, h, row) => { const rows = X.utils.sheet_to_json(w.Sheets[sheet], { raw: true }), r = rows.find(x => x.__rowNum__ === row - 1); return r && Object.prototype.hasOwnProperty.call(r, h) ? { has: true, v: r[h] } : { has: false }; };
// The four blank representations. `want` is what SheetJS hands the reader before DR-4 (checked, so each case is really exercised).
// A null cannot come from a saved .xlsx file: SheetJS writes a null cell as a number cell shown "NAN", which reads back as NaN (a
// different, non-finite value, outside DR-4). A null reaches the reader only in a workbook built in memory, so that case is built in
// memory (mem) and compared with a missing cell built the same way.
const BLANKS = [
  { name: 'missing property (no cell)', cell: undefined, want: x => !x.has },
  { name: 'empty string', cell: { t: 's', v: '' }, want: x => x.has && x.v === '' },
  { name: 'whitespace only (spaces, tab, non-breaking space)', cell: { t: 's', v: ' \t  ' }, want: x => x.has && x.v === ' \t  ' },
  { name: 'null', cell: { t: 's', v: null }, want: x => x.has && x.v === null, mem: true } ];

// Independent expectation: POs received short = rows whose Received_Qty and Ordered_Qty are both numbers and Received_Qty < Ordered_Qty.
const shortIds = w => X.utils.sheet_to_json(w.Sheets['Purchase Orders'], { raw: true })
  .filter(r => typeof r.Received_Qty === 'number' && typeof r.Ordered_Qty === 'number' && r.Received_Qty < r.Ordered_Qty).map(r => r.PO_ID);
const shortN = o => { const q = dq(o, /^\d+ POs received short$/); return q ? +q.msg.split(' ')[0] : 0; };

// ---------- 1. Northstar as supplied: 5 known warnings, no blank-related findings.
const B0 = run(build(NS, () => {}));
ok(() => B0.result.dq.length === 5 && shortN(B0) === shortIds(build(NS, () => {})).length, () => `baseline: Northstar gives its 5 known warnings, and ${shortN(B0)} POs received short (independent count ${shortIds(build(NS, () => {})).length})`);

// ---------- 2. Each field type: one open PO (sheet row 2) / one supplier (row 2) with the field blank in each representation.
const PO = 'Purchase Orders', openPO = (w, f) => { const ws = w.Sheets[PO]; put(ws, 'PO_Status', 2, { t: 's', v: 'Open' }); f(ws); };
const FIELDS = [
  { type: 'number', where: 'Purchase Orders Received_Qty (open PO, row 2)', sheet: PO, col: 'Received_Qty',
    edit: c => w => openPO(w, ws => { put(ws, 'Received_Date', 2, undefined); put(ws, 'Received_Qty', 2, c); }) },
  { type: 'date', where: 'Purchase Orders Received_Date (open PO, row 2)', sheet: PO, col: 'Received_Date',
    edit: c => w => openPO(w, ws => { put(ws, 'Received_Qty', 2, undefined); put(ws, 'Received_Date', 2, c); }) },
  { type: 'text', where: 'Suppliers Country (row 2)', sheet: 'Suppliers', col: 'Country',
    edit: c => w => put(w.Sheets.Suppliers, 'Country', 2, c) } ];
for (const F of FIELDS) {
  const W = BLANKS.map(b => build(NS, F.edit(b.cell), b.mem)), O = W.map(run), ref = full(O[0]), refMem = full(run(build(NS, F.edit(undefined), true)));
  BLANKS.forEach((b, i) => ok(() => b.want(rawAt(W[i], F.sheet, F.col, 2)), `${F.type}: the ${b.name} case really reaches the reader as that representation (${F.where})`));
  BLANKS.slice(1).forEach((b, i) => ok(() => full(O[i + 1]) === (b.mem ? refMem : ref), `${F.type}: ${b.name} gives a complete engine output identical to a missing cell${b.mem ? ' (both built in memory)' : ''} (${F.where})`));
  // The shared meaning, stated for the reference case (and so for all four).
  O.forEach((o, i) => ok(() => /Missing values in /.test((dq(o, new RegExp('^Missing values in ' + F.col + '$')) || {}).msg || '') && dq(o, new RegExp('^Missing values in ' + F.col + '$')).ex.split(', ').includes('2'),
    `${F.type}: ${BLANKS[i].name}: reported as "Missing values in ${F.col}" with row 2`));
}
// Number and date meaning: the open PO with no receipt is not "received short" and its dates are not "inconsistent".
{ const w = build(NS, FIELDS[0].edit({ t: 's', v: '' })), o = run(w), want = shortIds(w), id = X.utils.sheet_to_json(w.Sheets[PO], { raw: true })[0].PO_ID;
  ok(() => shortN(o) === want.length && !want.includes(id), () => `number: an open PO (${id}) with an empty-text Received_Qty is not counted received short (${shortN(o)} = independent ${want.length})`);
  ok(() => !dq(run(build(NS, FIELDS[1].edit({ t: 's', v: '' }))), /^Inconsistent PO dates$/), 'date: an open PO with an empty-text Received_Date raises no "Inconsistent PO dates"');
  ok(() => !dq(run(build(NS, FIELDS[1].edit({ t: 's', v: null }), true)), /^Inconsistent PO dates$/), 'date: an open PO with a null Received_Date (in memory) raises no "Inconsistent PO dates"'); }
// Deliberate change (owner condition 6): a whitespace-only date is "missing", not also an "invalid date".
{ const o = run(build(NS, FIELDS[1].edit(BLANKS[2].cell)));
  ok(() => !dq(o, /^Invalid or non-date values in date fields$/) && dq(o, /^Missing values in Received_Date$/),
    'date: a whitespace-only Received_Date is reported as missing only, not also as an invalid date (deliberate DR-4 change)'); }

// ---------- 3. Real values are not blanks: numeric 0, a valid date, the text "0" and ordinary text.
{ const w = build(NS, FIELDS[0].edit({ t: 'n', v: 0 })), o = run(w);
  ok(() => !dq(o, /^Missing values in Received_Qty$/) && shortIds(w).includes(X.utils.sheet_to_json(w.Sheets[PO], { raw: true })[0].PO_ID) && shortN(o) === shortIds(w).length,
    'number: Received_Qty 0 is a real value: not missing, and the PO counts as received short (0 < ordered)'); }
{ const o = run(build(NS, FIELDS[1].edit({ t: 'd', v: new Date(Date.UTC(2026, 9, 20)) })));
  ok(() => !dq(o, /^Missing values in Received_Date$/), 'date: a valid Received_Date is a real value: not missing'); }
for (const t of ['0', 'Germany']) {
  const w = build(NS, FIELDS[2].edit({ t: 's', v: t })), o = run(w);
  ok(() => !dq(o, /^Missing values in Country$/) && rawAt(w, 'Suppliers', 'Country', 2).v === t, `text: "${t}" is a real value: kept as text and not reported missing`); }

// ---------- 4. Willow (52 empty-text cells: 16 in Purchase Orders Received_Qty/Received_Date on 8 POs, 36 = the whole Inventory Notes column).
{ const w = build(WILLOW, () => {}), o = run(w), want = shortIds(w);
  ok(() => shortN(o) === 11 && want.length === 11, () => `Willow: ${shortN(o)} POs received short, equal to the independent count of POs with numeric Received_Qty < Ordered_Qty (${want.length})`);
  ok(() => !dq(o, /^Inconsistent PO dates$/), 'Willow: no "Inconsistent PO dates" (the 8 POs have no received date)');
  ok(() => /^Column Notes contains no values/.test((dq(o, /^Column Notes contains no values/) || {}).msg || ''), 'Willow: the empty Notes column is still reported as holding no values (the header remains; DR-5 is unchanged)');
  ok(() => o.clientQuestions.some(q => q.ev === '11 POs received short'), 'Willow: the client question on short receipts now cites 11 POs'); }

console.log(`\nempty-text: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
