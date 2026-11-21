#!/usr/bin/env node
/* Stage 3A regression test: the "Allocated exceeds on-hand" data-quality warning uses the same stock basis as available stock.
 *
 * Available stock (calculations.js, `const risk`) is (usable on-hand when it is a finite number, otherwise On_Hand_Qty) minus
 * Allocated_Qty. Usable on-hand comes from B6 Option D: on the import route On_Hand_Qty is the signed physical total over the
 * counted locations and Usable_On_Hand_Qty is the sum of the non-negative location quantities. Before 3A the warning compared
 * Allocated_Qty with On_Hand_Qty only, so a negative location could raise a false High warning while available stock was positive.
 *
 * Engine-level only: Northstar's direct workbook (tests/fixtures/northstar) is changed IN MEMORY (a Usable_On_Hand_Qty column and a
 * few inventory figures). No fixture, library package or reference data is added or changed on disk.
 * Expected values are worked out by hand below from the figures set here (basis = finite usable ? usable : on-hand).
 * Run from tests/:  NODE_PATH=<pinned test node_modules> node test-allocated-usable.js
 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const APP = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
const ok = (c, m) => { let v = false, why = '';
  try { v = !!(typeof c === 'function' ? c() : c); } catch (e) { why = ' [threw: ' + (e && e.message ? e.message : String(e)) + ']'; }
  v ? pass++ : fail++; console.log((v ? 'PASS: ' : 'FAIL: ') + m + why); };
const read = f => fs.readFileSync(path.join(APP, f), 'utf8');
const ctx = vm.createContext({ TextDecoder, Uint8Array, Buffer, console }); ctx.globalThis = ctx;
vm.runInContext(read('assets/xlsx.mini.min.js'), ctx);
vm.runInContext(['calculations', 'forecasting', 'app', 'excel-import', 'engine/engine-api'].map(n => read('js/' + n + '.js')).join('\n') + ';globalThis.__E=CGEngine;', ctx, { filename: 'engine' });
const X = ctx.XLSX, E = ctx.__E;
const NS = fs.readFileSync(path.join(__dirname, 'fixtures', 'northstar', 'Chain_Genius_Project_001_Northstar_Dataset_1.xlsx'));
const MSG = 'Allocated exceeds usable on-hand';   // Stage 3 D5 (18 Nov 2026): was 'Allocated exceeds on-hand'; same check, same basis

// A fresh Northstar workbook whose Inventory rows are passed through edit(rows) in memory. The sheet is rebuilt with date cells
// kept as dates and the workbook round-tripped through xlsx, as a real upload would be read (a plain json_to_sheet rebuild turns
// Snapshot_Date into an invalid value and changes unrelated warnings). Self-check 2 below confirms a rebuild alone changes nothing.
const wb = edit => { const w = X.read(NS, { cellDates: true }); if (edit) { const rows = X.utils.sheet_to_json(w.Sheets.Inventory, { raw: true }); edit(rows); w.Sheets.Inventory = X.utils.json_to_sheet(rows, { cellDates: true }); }
  return X.read(X.write(w, { type: 'array', bookType: 'xlsx' }), { cellDates: true }); };
const runWb = w => E.runEngine({ workbook: w });
const warning = o => o.result.dq.find(q => q.msg === MSG);
const listed = o => { const q = warning(o); return q ? q.ex.split(', ') : []; };
const item = (o, id) => [...o.result.fg, ...o.result.rm].find(x => x.id === id);
const set = (rows, id, v) => { const r = rows.find(x => x.Item_ID === id); if (!r) throw new Error('no inventory row ' + id); Object.assign(r, v); return r; };

// ---------- 1. Baseline: Northstar as supplied (no usable column) has no allocation warning and its known 5 warnings.
const B = runWb(wb());
ok(() => B.result.dq.length === 5 && !warning(B), 'baseline: direct Northstar gives its 5 known data-quality warnings and no "' + MSG + '"');

// ---------- 2. Normal stock: rebuilding the sheet alone, and a usable column equal to on-hand on every row, change nothing.
const RB = runWb(wb(() => {}));
ok(() => JSON.stringify(RB.result.dq) === JSON.stringify(B.result.dq) && JSON.stringify([RB.result.fg, RB.result.rm]) === JSON.stringify([B.result.fg, B.result.rm]),
  'self-check: rebuilding the Inventory sheet in memory, with no change, gives results identical to the baseline');
const EQ = runWb(wb(rows => rows.forEach(r => { r.Usable_On_Hand_Qty = r.On_Hand_Qty; })));
ok(() => JSON.stringify(EQ.result.dq.map(q => q.msg)) === JSON.stringify(B.result.dq.map(q => q.msg)), 'usable = on-hand everywhere: the data-quality warnings are identical to the baseline');
ok(() => [...B.result.fg, ...B.result.rm].every(x => item(EQ, x.id).av === x.av), 'usable = on-hand everywhere: available stock is identical to the baseline for every item');

// ---------- 3. Mixed cases in one workbook (every other row keeps usable = on-hand).
//   id      on-hand  usable  allocated  basis  available  warning?   case
//   FG001      6       10        8        10       2        no       false-warning case (FG): allocated > on-hand, <= usable
//   RM001     30       40       35        40       5        no       false-warning case (RM)
//   FG005     10       10       10        10       0        no       boundary: allocated equal to the basis
//   FG002     10       10       12        10      -2        yes      genuine, usable = on-hand
//   RM002      6       10       12        10      -2        yes      genuine: allocated exceeds usable as well
//   FG003      6     'abc'       8         6      -2        yes      fallback: non-numeric usable is not used
//   FG004      6    (blank)      8         6      -2        yes      fallback: blank usable cell (property missing)
const CASES = { FG001: [6, 10, 8, 2, false], RM001: [30, 40, 35, 5, false], FG005: [10, 10, 10, 0, false], FG002: [10, 10, 12, -2, true],
  RM002: [6, 10, 12, -2, true], FG003: [6, 'abc', 8, -2, true], FG004: [6, undefined, 8, -2, true] };
const M = runWb(wb(rows => { rows.forEach(r => { r.Usable_On_Hand_Qty = r.On_Hand_Qty; });
  for (const [id, [oh, ua, al]] of Object.entries(CASES)) { const r = set(rows, id, { On_Hand_Qty: oh, Allocated_Qty: al }); if (ua === undefined) delete r.Usable_On_Hand_Qty; else r.Usable_On_Hand_Qty = ua; } }));
for (const [id, [oh, ua, al, av, warn]] of Object.entries(CASES)) {
  ok(() => item(M, id).av === av, `${id}: on-hand ${oh}, usable ${ua === undefined ? '(blank)' : JSON.stringify(ua)}, allocated ${al}: available stock is ${av} (got ${item(M, id).av})`);
  ok(() => listed(M).includes(id) === warn, `${id}: "${MSG}" ${warn ? 'is' : 'is not'} raised for it (listed: ${listed(M).join(', ') || 'none'})`);
}
ok(() => JSON.stringify(listed(M)) === JSON.stringify(['FG002', 'FG003', 'FG004', 'RM002']), 'the warning lists exactly the four genuine cases, in inventory order (FG002, FG003, FG004, RM002)');
ok(() => { const q = warning(M); return q.sev === 'High' && q.sheet === 'Inventory'; }, 'the warning keeps its High severity and Inventory sheet');
ok(() => M.result.dq.some(q => /^Non-numeric Usable_On_Hand_Qty/.test(q.msg) && q.ex.split(', ').includes('FG003')), 'FG003: the existing non-numeric usable warning still names it (fallback rule unchanged)');
// Consistency: for every item, the warning is raised exactly when available stock is negative (both use the same basis).
ok(() => [...M.result.fg, ...M.result.rm].every(x => listed(M).includes(x.id) === (x.av < 0)), 'every item: listed by the warning exactly when its available stock is negative');

// ---------- 4. Direct route without the usable column: the existing behaviour is unchanged.
const D = runWb(wb(rows => { set(rows, 'FG002', { On_Hand_Qty: 10, Allocated_Qty: 12 }); set(rows, 'RM001', { On_Hand_Qty: 46, Allocated_Qty: 46 }); }));
ok(() => JSON.stringify(listed(D)) === JSON.stringify(['FG002']) && item(D, 'FG002').av === -2 && !('ua' in item(D, 'FG002')),
  'no usable column: allocated 12 > on-hand 10 is still warned (FG002 only; allocated equal to on-hand, RM001, is not)');

console.log(`\nallocated-usable: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
