#!/usr/bin/env node
/* Stage 3 (18 Nov 2026) engineering corrections, one block per change ID in STAGE3-CHANGE-REGISTER.md:
 *   C-STK  dead-stock flags ("No recorded demand", "Potentially obsolete", the no-demand warning) test stock held on EITHER basis,
 *          physical On_Hand_Qty or usable on-hand (B6 Option D), not physical On_Hand_Qty alone (revised after independent review).
 *   C-NUM  text, NaN or Infinity in a numeric engine column is reported (High), naming column and row; it used to pass silently.
 *   C-RG3  the result gate's output contract is RG3; it still accepts RG2 specifications and refuses anything else.
 *   C-CMP  compare-snapshots.js reports a missing or emptied section as a difference instead of crashing.
 * Engine-level only; Northstar changed in memory. Expected outcomes are written from the rules above, never read from the code.
 * Run from tests/:  NODE_PATH=<pinned test node_modules> node test-stage3-quality.js
 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process'), os = require('os');
const APP = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
const ok = (c, m) => { let v = false, why = ''; try { v = !!(typeof c === 'function' ? c() : c); } catch (e) { why = ' [threw: ' + e.message + ']'; }
  let msg; try { msg = typeof m === 'function' ? m() : m; } catch (e) { msg = '(message could not be built: ' + e.message + ')'; }
  v ? pass++ : fail++; console.log((v ? 'PASS: ' : 'FAIL: ') + msg + why); };
const read = f => fs.readFileSync(path.join(APP, f), 'utf8');
const ctx = vm.createContext({ TextDecoder, Uint8Array, Buffer, console }); ctx.globalThis = ctx;
vm.runInContext(read('assets/xlsx.mini.min.js'), ctx);
vm.runInContext(['calculations', 'forecasting', 'app', 'excel-import', 'engine/engine-api'].map(n => read('js/' + n + '.js')).join('\n') + ';globalThis.__E=CGEngine;', ctx, { filename: 'engine' });
vm.runInContext(read('js/import/result-gate.js'), ctx, { filename: 'result-gate.js' });
const X = ctx.XLSX, E = ctx.__E, RG = ctx.CGImport.resultGate;
const NS = fs.readFileSync(path.join(__dirname, 'fixtures', 'northstar', 'Chain_Genius_Project_001_Northstar_Dataset_1.xlsx'));
const addr = (ws, h, row) => { const rg = X.utils.decode_range(ws['!ref']); for (let c = 0; c <= rg.e.c; c++) if ((ws[X.utils.encode_cell({ r: 0, c })] || {}).v === h) return X.utils.encode_cell({ r: row - 1, c }); throw new Error('no column ' + h); };
const rt = w => X.read(X.write(w, { type: 'array', bookType: 'xlsx', cellDates: true }), { cellDates: true });
const sheetEdit = (w, sh, fn) => { const r = X.utils.sheet_to_json(w.Sheets[sh], { raw: true, cellDates: true }); fn(r); w.Sheets[sh] = X.utils.json_to_sheet(r, { cellDates: true }); };

// ---------- C-STK: one finished good with no demand (FG050), on-hand / usable varied. Every other row: usable = on-hand.
const stk = (oh, ua, obsolete) => { const w = X.read(NS, { cellDates: true });
  sheetEdit(w, 'Inventory', r => r.forEach(x => { x.Usable_On_Hand_Qty = x.On_Hand_Qty; if (x.Item_ID === 'FG050') { x.On_Hand_Qty = oh; x.Allocated_Qty = 0; if (ua === undefined) delete x.Usable_On_Hand_Qty; else x.Usable_On_Hand_Qty = ua; } }));
  // Round 2: Allocated_Qty set to 0 explicitly. Round 1 left Northstar's real FG050 allocation (51) in place, which exceeds every stock figure
  // used here; once allocations count (C-STK v3, owner direction 18 Nov 2026) that made every case "fully committed". Same cases, same expectations.
  // obsolete: FG050 sold only in the 3 earliest of the 12 months (9 months since the last sale); otherwise: no FG050 demand at all
  sheetEdit(w, 'Demand History', r => { if (obsolete) { const f = r.filter(x => x.SKU === 'FG050').sort((a, b) => a.Month_Start - b.Month_Start); f.forEach((x, i) => { x.Units_Sold = i < 3 ? 40 : 0; }); } else r.splice(0, r.length, ...r.filter(x => x.SKU !== 'FG050')); });
  const o = E.runEngine({ workbook: rt(w) }); return { x: o.result.fg.find(y => y.id === 'FG050'), warned: o.result.dq.some(q => /no recorded demand|Stock held with no demand/i.test(q.msg) && q.ex.split(', ').includes('FG050')) }; };
for (const [oh, ua, cls, warned, why] of [
  [10, 10, 'No recorded demand', true, 'normal stock (on-hand 10 = usable 10)'],
  [-2, 10, 'No recorded demand', true, 'Option D: locations net to -2 but 10 are usable'],
  [0, 5, 'No recorded demand', true, 'Option D: locations net to 0 but 5 are usable'],
  [10, 0, 'No recorded demand', true, 'Option D: 10 on hand but none usable (held or quarantined): still flagged, as before'],
  [10, undefined, 'No recorded demand', true, 'usable cell blank: falls back to on-hand 10'],
  [0, 0, 'Active', false, 'no stock at all']]) {
  ok(() => { const r = stk(oh, ua); return r.x.cls === cls && r.warned === warned; }, () => { const r = stk(oh, ua); return `C-STK ${why}: FG050 with no demand is "${cls}"${warned ? ' and listed by the no-demand warning' : ' and not listed'} (got "${r.x.cls}", ${r.warned ? 'listed' : 'not listed'})`; });
}
for (const [oh, ua, cls, why] of [[10, 10, 'Potentially obsolete', 'normal stock'], [-2, 10, 'Potentially obsolete', 'Option D: physical -2, usable 10'],
  [10, 0, 'Potentially obsolete', 'Option D: physical 10, none usable'], [0, 0, null, 'no stock at all']]) {
  ok(() => { const c = stk(oh, ua, true).x.cls; return cls ? c === cls : c !== 'Potentially obsolete'; }, () => `C-STK obsolete, ${why}: FG050 last sold 9 months ago is ${cls ? '"' + cls + '"' : 'not "Potentially obsolete"'} (got "${stk(oh, ua, true).x.cls}")`);
}
ok(() => { const a = stk(-2, 10), b = stk(10, 10); return a.x.val === -2 * a.x.cost && b.x.val === 10 * b.x.cost; }, 'C-STK stock value is unchanged: still on-hand × cost (physical valuation under Option D)');

// ---------- C-NUM: invalid values in numeric engine columns are reported, naming column and sheet row; valid values are not.
const num = edits => { const w = X.read(NS, { cellDates: true }); edits.forEach(([sh, col, row, cell]) => { w.Sheets[sh][addr(w.Sheets[sh], col, row)] = cell; });
  const o = E.runEngine({ workbook: w }); return o.result.dq.filter(q => /^Non-numeric or non-finite values in numeric columns/.test(q.msg)); };
ok(() => num([]).length === 0, 'C-NUM Northstar as supplied: no numeric-column warning');
for (const [sh, col, cell, shown] of [['Inventory', 'On_Hand_Qty', { t: 's', v: 'abc' }, '"abc"'], ['Inventory', 'On_Hand_Qty', { t: 'n', v: NaN }, 'NaN'], ['Inventory', 'Allocated_Qty', { t: 'n', v: Infinity }, 'Infinity'],
  ['Inventory', 'Unit_Cost_GBP', { t: 'n', v: -Infinity }, '-Infinity'], ['BOM', 'Qty_Per_Finished_Unit', { t: 's', v: 'two' }, '"two"'], ['Demand History', 'Units_Sold', { t: 's', v: '120' }, '"120"'],
  ['Products', 'Standard_Cost_GBP', { t: 's', v: '£5' }, '"£5"'], ['Suppliers', 'Standard_Lead_Time_Days', { t: 's', v: 'ten' }, '"ten"'], ['Materials', 'Minimum_Order_Qty', { t: 'n', v: NaN }, 'NaN'],
  ['Purchase Orders', 'Unit_Cost_GBP', { t: 's', v: 'n/a' }, '"n/a"'], ['Production Orders', 'Planned_Qty', { t: 's', v: 'TBC' }, '"TBC"']]) {
  ok(() => { const q = num([[sh, col, 2, cell]]); return q.length === 1 && q[0].sev === 'High' && q[0].sheet === sh && q[0].msg.includes(col + ' row 2 ' + shown) && q[0].ex === col + ' row 2'; },
    `C-NUM ${sh}.${col} = ${shown}: one High warning on ${sh} naming "${col} row 2 ${shown}"`);
}
ok(() => num([['Inventory', 'On_Hand_Qty', 2, { t: 'n', v: 0 }], ['Inventory', 'Allocated_Qty', 3, { t: 's', v: '' }], ['Inventory', 'Safety_Stock_Qty', 4, { t: 's', v: '   ' }]]).length === 0,
  'C-NUM numeric 0, an empty text cell and a spaces-only cell are not reported (0 is a value; blanks are missing values, DR-4)');
ok(() => { const q = num([['Inventory', 'On_Hand_Qty', 2, { t: 's', v: 'x' }], ['Inventory', 'Allocated_Qty', 5, { t: 'n', v: NaN }]]); return q.length === 1 && /\(On_Hand_Qty, Allocated_Qty\)/.test(q[0].msg) && q[0].ex === 'On_Hand_Qty row 2, Allocated_Qty row 5'; },
  'C-NUM two invalid cells on one sheet: one warning naming both columns and both rows');

// ---------- C-RG3: output contract RG3; RG2 specifications accepted; any other specification version refused.
ok(() => RG.VERSION === 'RG3' && RG.SPEC_VERSION === 'RG2', 'C-RG3 the gate exports output contract RG3 and specification version RG2');
{ const o = E.runEngine({ workbook: X.read(NS, { cellDates: true }) }), g = RG.apply(o, { version: 'RG1' }), g3 = RG.apply(o, { version: 'RG3' });
  ok(() => g.version === 'RG3' && g.status === 'refused' && g.result === null && /not RG2/.test(g.notes[0]) && g3.status === 'refused', 'C-RG3 a refused output carries version RG3; an RG1 or RG3 specification is refused (the input is still RG2)'); }

// ---------- C-CMP: compare-snapshots reports an emptied section as a difference, without crashing.
{ const G = path.join(__dirname, 'snapshots', 'v0.5-golden-20261105T101953Z.json'), snap = JSON.parse(fs.readFileSync(G, 'utf8')), core = snap.core || snap;
  const k = Object.keys(core).find(x => x !== 'feas' && Array.isArray(core[x]) && core[x].length); core[k] = []; const tmp = path.join(os.tmpdir(), 'cg-c-cmp-' + process.pid + '.json');
  // both sides are temporary copies, so the golden file's permitted N1 differences (keyed to its own path) do not apply: only the emptied section may differ
  const base = tmp + '.base.json'; fs.writeFileSync(base, fs.readFileSync(G)); fs.writeFileSync(tmp, JSON.stringify(snap));
  const r = cp.spawnSync(process.execPath, [path.join(__dirname, 'compare-snapshots.js'), base, tmp], { encoding: 'utf8' }); fs.unlinkSync(tmp); fs.unlinkSync(base);
  ok(() => r.status === 1 && !/TypeError/.test(r.stderr + r.stdout) && new RegExp('DIFFERENT  ' + k).test(r.stdout) && /1 section\(s\) differ/.test(r.stdout), () => `C-CMP an emptied "${k}" section is reported as DIFFERENT with exit 1 and no crash`); }

console.log(`\nstage3-quality: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
