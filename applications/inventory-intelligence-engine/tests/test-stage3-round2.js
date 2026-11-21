#!/usr/bin/env node
/* Stage 3 Round 2 (18 Nov 2026) corrections, one block per change ID in STAGE3-CHANGE-REGISTER.md (all attributed to Baseline B):
 *   R2-STK   dead-stock flags test UNCOMMITTED stock = max(physical On_Hand_Qty, usable on-hand) - Allocated_Qty (owner direction:
 *            allocated stock committed to firm orders is never excess or obsolete); potential excess stays on unallocated usable.
 *   R2-VIEW  the "Excess & dead stock" view shows Physical, Allocated, Usable and Unallocated usable separately.
 *   F-A1/A2  negative planned or completed quantity (High); completed above planned (Medium). Detection only.
 *   F-A3     negative lead time on Materials or Suppliers (High). Detection only.
 *   F-A4     the BOM quantity warning no longer talks about scrap (invalid scrap already stops the analysis).
 * Engine-level; Northstar changed in memory. Expected outcomes are written from the rules above, never read from the code.
 * Run from tests/:  NODE_PATH=<pinned test node_modules> node test-stage3-round2.js
 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const APP = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
const ok = (c, m) => { let v = false, why = ''; try { v = !!(typeof c === 'function' ? c() : c); } catch (e) { why = ' [threw: ' + e.message + ']'; }
  let msg; try { msg = typeof m === 'function' ? m() : m; } catch (e) { msg = '(message could not be built: ' + e.message + ')'; }
  v ? pass++ : fail++; console.log((v ? 'PASS: ' : 'FAIL: ') + msg + why); };
const read = f => fs.readFileSync(path.join(APP, f), 'utf8');
const ctx = vm.createContext({ TextDecoder, Uint8Array, Buffer, console }); ctx.globalThis = ctx;
vm.runInContext(read('assets/xlsx.mini.min.js'), ctx);
for (const f of ['canonical', 'read', 'clean', 'mapping', 'validate', 'engine-map', 'engine-workbook', 'result-gate', 'adapter']) vm.runInContext(read('js/import/' + f + '.js'), ctx, { filename: f + '.js' });
vm.runInContext(['calculations', 'forecasting', 'app', 'excel-import', 'engine/engine-api'].map(n => read('js/' + n + '.js')).join('\n') +
  ';globalThis.__E=CGEngine;globalThis.__view=r=>{const k=R;R=r;try{return views["Excess & dead stock"]()}finally{R=k}};', ctx, { filename: 'engine' });
vm.runInContext(read('tests/tools/import-v1/reverse-eight-sheet.js'), ctx, { filename: 'reverse-eight-sheet.js' });
const X = ctx.XLSX, E = ctx.__E, G = ctx.CGImport, REV = ctx.CGTestTools.reverseEightSheet;
const NS = fs.readFileSync(path.join(__dirname, 'fixtures', 'northstar', 'Chain_Genius_Project_001_Northstar_Dataset_1.xlsx'));
const rt = w => X.read(X.write(w, { type: 'array', bookType: 'xlsx', cellDates: true }), { cellDates: true });
const sheetEdit = (w, sh, fn) => { const r = X.utils.sheet_to_json(w.Sheets[sh], { raw: true, cellDates: true }); fn(r); w.Sheets[sh] = X.utils.json_to_sheet(r, { cellDates: true }); };
const run = w => E.runEngine({ workbook: rt(w) }).result;
const warned = (r, re, id) => r.dq.some(q => re.test(q.msg) && (id === undefined || q.ex.includes(id)));

// ---------- R2-STK: FG050 with the stock, usable and allocated figures given; demand removed (or sold only 9+ months ago when obsolete).
const stk = (id, oh, ua, al, mode) => { const w = X.read(NS, { cellDates: true });
  sheetEdit(w, 'Inventory', r => r.forEach(x => { x.Usable_On_Hand_Qty = x.On_Hand_Qty; if (x.Item_ID === id) { const set = (k, v) => { if (v === undefined) delete x[k]; else x[k] = v; }; set('On_Hand_Qty', oh); set('Usable_On_Hand_Qty', ua); set('Allocated_Qty', al); } }));
  sheetEdit(w, 'Demand History', r => { if (mode === 'obsolete') r.filter(x => x.SKU === id).sort((a, b) => a.Month_Start - b.Month_Start).forEach((x, i) => { x.Units_Sold = i < 3 ? 40 : 0; });
    else if (mode === 'nodemand') r.splice(0, r.length, ...r.filter(x => x.SKU !== id)); });
  const r = run(w); return { r, x: [...r.fg, ...r.rm].find(y => y.id === id), w: warned(r, /Stock held with no demand/, id) }; };
const inViewOf = s => ctx.__view(s.r).includes('<td>FG050</td>');
// SUPERSEDED (X1 Q1, owner approval 21 Nov 2026; X1-CHANGE-RECORD.md CR-17). D6 applies to items with no usable demand history: FG050/FG014 here have their
// 12 positive demand rows REMOVED (fixture evidence: Northstar FG050 and FG014 each have 12 rows, 0 recorded zeros), so demand is UNKNOWN, not zero.
// Class 'No recorded demand'/'Active' and excess N are replaced by 'Not Assessed' and excess not a number; the warning/listing expectations are kept
// unchanged (uncommitted stock is never hidden: separate warning 'Stock held with no demand history'). Original lines kept below as comments.
// [original] for (const [oh, ua, al, cls, w, ex, why] of [
// [original]   [10, 10, 0, 'No recorded demand', true, 10, 'nothing allocated: all 10 uncommitted'],
// [original]   [10, 10, 10, 'Active', false, 0, 'all 10 allocated to firm orders: nothing uncommitted, so not dead stock'],
// [original]   [10, 10, 4, 'No recorded demand', true, 6, '4 of 10 allocated: 6 uncommitted, excess 6'],
// [original]   [-2, 10, 0, 'No recorded demand', true, 10, 'physical -2 (locations net), usable 10, none allocated'],
// [original]   [10, 0, 0, 'No recorded demand', true, 0, 'physical 10 held/quarantined, none usable or allocated: still listed (excess is measured on usable stock, so 0)'],
// [original]   [10, 0, 10, 'Active', false, 0, 'physical 10, none usable, 10 allocated: fully committed'],
// [original]   [0, 0, 0, 'Active', false, 0, 'no stock at all']]) {
for (const [oh, ua, al, cls, w, ex, why] of [
  [10, 10, 0, 'Not Assessed', true, null, 'nothing allocated: all 10 uncommitted'],
  [10, 10, 10, 'Not Assessed', false, null, 'all 10 allocated to firm orders: nothing uncommitted, so not dead stock'],
  [10, 10, 4, 'Not Assessed', true, null, '4 of 10 allocated: 6 uncommitted, excess 6'],
  [-2, 10, 0, 'Not Assessed', true, null, 'physical -2 (locations net), usable 10, none allocated'],
  [10, 0, 0, 'Not Assessed', true, null, 'physical 10 held/quarantined, none usable or allocated: still listed (excess is measured on usable stock, so 0)'],
  [10, 0, 10, 'Not Assessed', false, null, 'physical 10, none usable, 10 allocated: fully committed'],
  [0, 0, 0, 'Not Assessed', false, null, 'no stock at all']]) {
// SUPERSEDED (X1 Q1, CR-17): excess is not a number when demand is unknown (ex === null).
// [original]   ok(() => { const s = stk('FG050', oh, ua, al, 'nodemand'); return s.x.cls === cls && s.w === w && Math.round(s.x.exQty) === ex; },
  ok(() => { const s = stk('FG050', oh, ua, al, 'nodemand'); return s.x.cls === cls && s.w === w && (ex === null ? !isFinite(s.x.exQty) : Math.round(s.x.exQty) === ex); },
    () => { const s = stk('FG050', oh, ua, al, 'nodemand'); return `R2-STK FG050 no demand, ${why}: "${cls}", no-demand warning ${w ? 'yes' : 'no'}, excess ${ex} (got "${s.x.cls}", ${s.w ? 'yes' : 'no'}, ${Math.round(s.x.exQty)})`; });
}
ok(() => { const s = stk('FG050', 10, 10, 10, 'obsolete'); return s.x.cls === 'Active' && !ctx.__view(s.r).includes('<td>FG050</td>') && stk('FG050', 10, 10, 4, 'obsolete').x.cls === 'Potentially obsolete'; },
  () => 'R2-STK obsolete (last sale 9 months ago): fully allocated stock is "Active" and not listed in the dead-stock view (got "' + stk('FG050', 10, 10, 10, 'obsolete').x.cls + '"); partly allocated stock is still "Potentially obsolete"');
// Round 2 review additions: allocation read the same way as available stock; blanks; allocation above stock.
for (const [oh, ua, al, listed, why] of [
  [10, 10, '10', false, 'allocation stored as text "10" (read as 10, as available stock reads it): fully committed'],
  [10, 10, -5, true, 'negative allocation -5 (flagged High): uncommitted 15, the same figure as unallocated usable'],
  [10, 10, 15, false, 'allocation 15 above stock 10: nothing uncommitted'],
  [undefined, 10, 0, true, 'On_Hand_Qty blank, usable 10: the usable stock is not hidden'],
  [10, 4, 6, true, 'physical 10, usable 4, allocated 6: listed (uncommitted = larger of physical and usable minus allocated = 4; documented assumption)']]) {
// SUPERSEDED (X1 Q1, CR-17): with demand rows removed the class is 'Not Assessed' (D6); listed-in-view and warned expectations unchanged.
// [original]   ok(() => { const s = stk('FG050', oh, ua, al, 'nodemand'), inView = ctx.__view(s.r).includes('<td>FG050</td>'); return (s.x.cls !== 'Active') === listed && inView === listed && s.w === listed; },
  ok(() => { const s = stk('FG050', oh, ua, al, 'nodemand'), inView = ctx.__view(s.r).includes('<td>FG050</td>'); return s.x.cls === 'Not Assessed' && inView === listed && s.w === listed; },
    () => { const s = stk('FG050', oh, ua, al, 'nodemand'); return `R2-STK FG050 no demand, ${why}: ${listed ? 'listed and warned' : 'not listed, not warned'} (got "${s.x.cls}", view ${ctx.__view(s.r).includes('<td>FG050</td>') ? 'listed' : 'not listed'}, warning ${s.w ? 'yes' : 'no'})`; });
}
// SUPERSEDED (X1 Q1, CR-17): class 'Not Assessed' (demand rows removed, D6); still listed, available stock unknown, High warning kept.
// [original] ok(() => { const s = stk('FG050', 10, 10, 'abc', 'nodemand'); return s.x.cls === 'No recorded demand' && inViewOf(s) && !isFinite(s.x.av) && s.r.dq.some(q => q.sev === 'High' && /Allocated_Qty row \d+ "abc"/.test(q.msg)); },
ok(() => { const s = stk('FG050', 10, 10, 'abc', 'nodemand'); return s.x.cls === 'Not Assessed' && inViewOf(s) && !isFinite(s.x.av) && s.r.dq.some(q => q.sev === 'High' && /Allocated_Qty row \d+ "abc"/.test(q.msg)); },
  'R2-STK unreadable allocation "abc": available stock is unknown, so the item stays listed (counted as nothing allocated) beside the High warning naming the cell (documented limitation, Round 2 review)');
ok(() => { const s = stk('FG050', 0, 0, 0, 'obsolete'); return s.x.cls === 'Active' && !inViewOf(s); }, 'R2-STK no stock at all and demand that stopped 9 months ago: "Active", not listed (nothing to be dead or slow-moving)');
// SUPERSEDED (X1 Q2, owner approval 21 Nov 2026; CR-18): owner decision D1(d) prohibits negative Allocated_Qty on both routes and forbids normalising it into a
// valid number; the original expectation (a negative allocation ADDS 5, giving 15) is the behaviour D1(d) removed. Original kept below.
// [original] ok(() => { const s = stk('FG050', 10, 10, -5, 'nodemand'); return s.x.av === 15 && Math.round(s.x.exQty) === 15 && warned(s.r, /^Negative quantities/, 'FG050'); }, 'R2-STK a negative allocation is flagged High and gives the same uncommitted figure (15) in classification, unallocated usable and excess');
ok(() => { const s = stk('FG050', 10, 10, -5, 'nodemand'); return !isFinite(s.x.av) && /Allocated_Qty negative \(not allowed\)/.test(s.x.naWhy) && s.x.uncomm === 10 && !isFinite(s.x.exQty) && warned(s.r, /^Negative quantities/, 'FG050'); }, 'R2-STK (superseded by D1(d)) a negative allocation is flagged High and is never used as a number: available stock not assessed, uncommitted 10 (the -5 no longer adds), excess not assessed');
// SUPERSEDED (X1 Q1, CR-17): FG014 has 12 positive demand rows in Northstar (0 recorded zeros); removing them makes demand unknown (D6).
// [original] ok(() => { const s = stk('FG014', 882, 882, 882, 'nodemand'); return s.x.cls === 'Active' && !s.w && s.x.exVal === 0; }, 'R2-STK FG014 (real item) with demand removed and all 882 allocated: not dead stock, excess £0');
ok(() => { const s = stk('FG014', 882, 882, 882, 'nodemand'); return s.x.cls === 'Not Assessed' && !s.w && !isFinite(s.x.exVal) && !inViewOf(s) === true; }, 'R2-STK (superseded by D6/Q1) FG014 (real item) with demand removed and all 882 allocated: Not Assessed, not warned, excess not assessed, not listed as dead stock');
ok(() => { const s = stk('RM009', 4060, 4060, 258); return s.x.cls === 'Excess stock' && Math.round(s.x.exQty) === 1618 && s.x.av === 3802; },
  'R2-STK RM009 (real item, as supplied): still "Excess stock", 1,618 excess units measured on unallocated usable stock 3,802 (unchanged)');
ok(() => { const a = stk('FG050', 10, 10, 4, 'nodemand').x, b = stk('FG050', 10, 10, 0, 'nodemand').x; return a.val === b.val && a.val === 10 * a.cost; }, 'R2-STK stock value is unchanged by allocation: physical × cost');

// ---------- R2-VIEW: four quantities shown separately, in this order, with the values of the item.
{ const s = stk('FG050', -2, 10, 3, 'nodemand'), h = ctx.__view(s.r);
  const heads = (h.match(/<th[^>]*>([^<]*)/g) || []).map(t => t.replace(/<th[^>]*>/, ''));
  ok(() => ['Physical', 'Allocated', 'Usable', 'Unallocated usable'].every((k, i, a) => heads.indexOf(k) >= 0 && (i === 0 || heads.indexOf(k) === heads.indexOf(a[i - 1]) + 1)) && !heads.includes('Qty'),
    () => 'R2-VIEW columns Physical, Allocated, Usable, Unallocated usable appear side by side (got: ' + heads.join(', ') + ')');
  const row = h.slice(h.indexOf('<td>FG050</td>'), h.indexOf('</tr>', h.indexOf('<td>FG050</td>'))), cells = (row.match(/<td[^>]*>([^<]*)/g) || []).map(t => t.replace(/<td[^>]*>/, ''));
  ok(() => cells[2] === '-2' && cells[3] === '3' && cells[4] === '10' && cells[5] === '7', () => 'R2-VIEW FG050 row shows physical -2, allocated 3, usable 10, unallocated usable 7 (got ' + cells.slice(2, 6).join(', ') + ')');
  ok(() => /physical stock value/.test(h) && /never treated as excess or obsolete/.test(h), 'R2-VIEW the summary says "physical stock value" and the note explains that allocated stock is never excess or obsolete'); }
{ const s = stk('FG050', 10, 10, 10, 'nodemand'), h = ctx.__view(s.r); ok(() => !h.includes('<td>FG050</td>'), 'R2-VIEW a fully allocated no-demand item is not listed in the dead-stock view'); }

// ---------- F-A1..F-A4: detection only.
const edit = (sh, fn) => { const w = X.read(NS, { cellDates: true }); sheetEdit(w, sh, fn); return run(w); };
const PO1 = (() => { const w = X.read(NS, { cellDates: true }); return X.utils.sheet_to_json(w.Sheets['Production Orders'], { raw: true })[0].Production_Order_ID; })();
ok(() => warned(edit('Production Orders', r => { r[0].Planned_Qty = -10; }), /^Negative planned or completed quantity/, PO1), `F-A1 a negative Planned_Qty (${PO1}) is reported (High)`);
ok(() => warned(edit('Production Orders', r => { r[0].Completed_Qty = -1; }), /^Negative planned or completed quantity/, PO1), 'F-A1 a negative Completed_Qty is reported');
ok(() => { const r = edit('Production Orders', r => { r[0].Completed_Qty = (r[0].Planned_Qty || 0) + 500; }); return warned(r, /^Completed quantity exceeds planned quantity/, PO1) && r.dq.find(q => /^Completed quantity exceeds/.test(q.msg)).sev === 'Medium'; },
  'F-A2 Completed_Qty above Planned_Qty is reported (Medium: may be genuine over-production)');
ok(() => { const r = edit('Production Orders', r => { r[0].Completed_Qty = r[0].Planned_Qty; }); return !warned(r, /^Completed quantity exceeds|^Negative planned/); }, 'F-A2 completed equal to planned is not reported');
ok(() => { const r = edit('Materials', r => { r[0].Lead_Time_Days = -5; }); const q = r.dq.find(d => /^Negative lead times/.test(d.msg)); return q && q.sev === 'High' && /Materials RM\d+ \(-5 d\)/.test(q.ex); }, 'F-A3 a negative Materials.Lead_Time_Days is reported explicitly (High), naming the material and value');
ok(() => { const r = edit('Suppliers', r => { r[0].Standard_Lead_Time_Days = -3; }); return warned(r, /^Negative lead times/, 'Suppliers'); }, 'F-A3 a negative Suppliers.Standard_Lead_Time_Days is reported');
ok(() => !warned(run(X.read(NS, { cellDates: true })), /^Negative lead times|^Negative planned|^Completed quantity exceeds/), 'F-A1..A3 Northstar as supplied: none of the new warnings');
ok(() => { const r = edit('BOM', r => { r[0].Qty_Per_Finished_Unit = 0; }); return warned(r, /^BOM quantity per finished unit is zero, negative or not a number$/) && !r.dq.some(q => /Scrap outside/.test(q.msg)); }, 'F-A4 BOM quantity 0: the warning names the quantity, not scrap');
ok(() => { try { edit('BOM', r => { r[0].Scrap_Factor_Pct = 5; }); return false; } catch (e) { return /Invalid scrap/.test(e.message); } }, 'F-A4 scrap 5 (above 100%) still stops the analysis before that warning, so the scrap wording was unreachable');

// ---------- Import route (same input through reverse -> Stage 1 -> adapter): each new direct-route check has a counterpart there.
const viaImport = w => { const rv = REV(w), imp = G.validate.importFiles(rv.mapping, rv.files); const ad = imp.importAccepted ? G.adapter.build(imp, rv.mapping) : null;
  return { imp, codes: (imp.issues || []).map(i => i.code), out: ad && ad.workbook ? E.runEngine({ workbook: ad.workbook }).result : null }; };
const wbEdit = (sh, fn) => { const w = X.read(NS, { cellDates: true }); sheetEdit(w, sh, fn); return rt(w); };
ok(() => { const r = viaImport(wbEdit('Production Orders', r => { r[0].Planned_Qty = -10; })); return r.imp.importAccepted && r.codes.includes('ROW_REJECTED'); }, 'import route: a negative Planned_Qty row is rejected by Stage 1 (ROW_REJECTED) instead of warned');
ok(() => { const r = viaImport(wbEdit('Production Orders', r => { r[0].Completed_Qty = r[0].Planned_Qty + 500; })); return r.out && warned(r.out, /^Completed quantity exceeds planned quantity/); }, 'import route: completed above planned gives the same Medium warning');
ok(() => { const r = viaImport(wbEdit('Materials', r => { r[0].Lead_Time_Days = -5; })); return r.codes.includes('FIELD_BLANKED') && r.out && !warned(r.out, /^Negative lead times/); }, 'import route: a negative lead time is blanked by Stage 1 (FIELD_BLANKED), so it never reaches the engine');

// Wider implications (no calculated figure moves) are checked across trees, Baseline B against this tree, in the Round 2 evidence
// (STAGE3-CHANGE-REGISTER.md), because one tree cannot hold both versions.

console.log(`\nstage3-round2: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
