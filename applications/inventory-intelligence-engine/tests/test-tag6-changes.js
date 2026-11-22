#!/usr/bin/env node
/* Tag-6 changes (owner approval of the Tag-6 change plan, 22 Nov 2026; stage3-design/tag6/OWNER-DECISIONS-TAG6.md).
 * One block per approved item:
 *   E-1  totals that sum item values are X1 partial-aware (dead-stock cards, reconciliation gap value): never "£–" for a whole total
 *   A2   unknown allocation (blank, unreadable, negative) while stock is held -> stock class "Not Assessed", never a dead-stock class
 *   A1   stock fully allocated to orders with no recorded demand -> class unchanged ("Active"), plus a Medium warning naming it
 *   A3   availability on usable; dead stock on max(physical, usable) - allocated; NO usable-vs-physical warning (the approved
 *        'usable exceeds physical' warning was stopped: it conflicts with accepted Stage 2 decision B6, where usable legitimately
 *        exceeds physical when a location is negative; see stage3-design/tag6/IMPLEMENTATION-RECORD.md)
 *   B1   dead-stock view: Uncommitted column (blank when the allocation is unknown); export adds Usable and Uncommitted
 *   B2   ABC note "based on N of M items" only when an item is Not Assessed
 *   E-9  the recorded-ZERO-demand path of the dead-stock rule (the Round 2 tests remove demand rows, i.e. unknown demand)
 *   r4 defect A  every export sheet writes an unknown as an EMPTY cell (never NaN, never 0); finite values unchanged
 *   r4 defect B  the demand chart draws history by calendar month, an unknown month as a gap (never 0, never NaN), a recorded 0 at 0
 *   and "unchanged elsewhere": classes and warnings on clean Northstar, Willow and faulty Northstar are exactly those of the
 *   parent candidate 43b6b55 (values recorded from a run of 43b6b55, 22 Nov 2026).
 * Expected outcomes come from the approved rules, not from reading the code. Engine-level; workbooks are edited in memory.
 * Run from tests/:  node test-tag6-changes.js   (no dependencies: uses the bundled SheetJS)
 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');
const APP = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
const ok = (c, m) => { let v = false, why = ''; try { v = !!(typeof c === 'function' ? c() : c); } catch (e) { why = ' [threw: ' + e.message + ']'; }
  let msg; try { msg = typeof m === 'function' ? m() : m; } catch (e) { msg = '(message could not be built: ' + e.message + ')'; }
  v ? pass++ : fail++; console.log((v ? 'PASS: ' : 'FAIL: ') + msg + why); };
const read = f => fs.readFileSync(path.join(APP, f), 'utf8');
const st = { textContent: '' };
const ctx = vm.createContext({ TextDecoder, Uint8Array, Buffer, console, document: { querySelector: () => st, querySelectorAll: () => [], addEventListener() {} } }); ctx.globalThis = ctx;
vm.runInContext(read('assets/xlsx.mini.min.js'), ctx);
vm.runInContext(['validation/x1-integrity', 'calculations', 'forecasting', 'app', 'excel-import', 'engine/engine-api'].map(n => read('js/' + n + '.js')).join('\n') +
  ';globalThis.__E=CGEngine;globalThis.__view=(r,v)=>{const k=R;R=r;try{return views[v]()}finally{R=k}};' +
  'globalThis.__export=(r,wb)=>{const k=R,kw=WB,wf=XLSX.writeFile;let out=null;R=r;WB=wb;XLSX.writeFile=w=>{out=w};try{exportWorkbook()}finally{XLSX.writeFile=wf;R=k;WB=kw}return out};' +
  'globalThis.__chart=(x,F)=>chart(x,F);globalThis.__fview=(r,id)=>{const k=R;R=r;fsku=id;try{return views["Demand forecast"]()}finally{R=k}};', ctx, { filename: 'engine' });
const X = ctx.XLSX, E = ctx.__E;
const FX = path.join(__dirname, 'fixtures'), NSF = path.join(FX, 'northstar', 'Chain_Genius_Project_001_Northstar_Dataset_1.xlsx');
const FAULTY = path.join(APP, 'stage3-design', 'audit-20261121', 'evidence', 'workbooks', 'ns-x1-faults.xlsx');
const load = f => X.read(fs.readFileSync(f), { cellDates: true });
const rt = w => X.read(X.write(w, { type: 'array', bookType: 'xlsx', cellDates: true }), { cellDates: true });
const sheetEdit = (w, sh, fn) => { const r = X.utils.sheet_to_json(w.Sheets[sh], { raw: true, cellDates: true }); fn(r); w.Sheets[sh] = X.utils.json_to_sheet(r, { cellDates: true }); };
const runWb = w => { const b = rt(w); return { R: E.runEngine({ workbook: b }).result, wb: b }; };
// FG050 with recorded ZERO demand in every month (not removed rows) and the given stock fields (undefined = blank cell)
const zeroDem = (stock, usableCol) => { const w = load(NSF);
  sheetEdit(w, 'Inventory', r => r.forEach(x => { if (usableCol) x.Usable_On_Hand_Qty = x.On_Hand_Qty; if (x.Item_ID === 'FG050') for (const [k, v] of Object.entries(stock)) { if (v === undefined) delete x[k]; else x[k] = v; } }));
  sheetEdit(w, 'Demand History', r => r.forEach(x => { if (x.SKU === 'FG050') x.Units_Sold = 0; }));
  const o = runWb(w); o.x = [...o.R.fg, ...o.R.rm].find(y => y.id === 'FG050'); return o; };
const warn = (R, re) => R.dq.find(d => re.test(d.msg));
const names = (R, re) => { const d = warn(R, re); return d ? String(d.ex) : ''; };
const rowOf = (h, id) => { const i = h.indexOf('<td>' + id + '</td>'); return i < 0 ? null : h.slice(i, h.indexOf('</tr>', i)); };
const cellsOf = row => (row.match(/<td[^>]*>([^<]*)/g) || []).map(t => t.replace(/<td[^>]*>/, ''));
const DEAD = 'Excess & dead stock';
const FULLY = /^Stock fully allocated to orders but no recorded demand: check the allocations$/, UOVER = /^Usable on-hand exceeds physical on-hand: check the stock record$/;

// ---------- E-1: X1 partial totals instead of "£–"
{ const R = E.runEngine({ workbook: load(FAULTY) }).result, h = ctx.__view(R, DEAD), top = h.slice(0, h.indexOf('<table'));
  ok(() => !/£–/.test(top) && (top.match(/data-x1="partial">partial<\/strong>: \d+ of \d+ items/g) || []).length >= 2,
    () => 'E-1 faulty Northstar: the dead-stock summary shows partial totals with their coverage, never "£–" (got: ' + top.replace(/<[^>]+>/g, ' ').slice(0, 220) + ')');
  const dq = ctx.__view(R, 'Data quality'), g = dq.slice(dq.indexOf('gap value'), dq.indexOf('gap value') + 200);
  ok(() => dq.includes('gap value') && !/^gap value £–/.test(g) && /gap value £[\d,]+ <strong data-x1="partial">partial<\/strong>: \d+ of \d+ items/.test(g),
    () => 'E-1 faulty Northstar: the reconciliation gap value is a partial total with its coverage, not "£–" (got: ' + g.replace(/<[^>]+>/g, '').slice(0, 120) + ')'); }
{ const R = E.runEngine({ workbook: load(NSF) }).result, h = ctx.__view(R, DEAD), top = h.slice(0, h.indexOf('<table'));
  ok(() => !/partial/.test(top) && /£[\d,]+<\/b><span>Physical stock value/.test(top), 'E-1 clean Northstar: complete totals are shown as plain figures, with no "partial" label'); }

// ---------- A2: unknown allocation -> Not Assessed, never a dead-stock class
for (const [lab, al, why] of [['blank', undefined, /Allocated_Qty blank/], ['"abc"', 'abc', /Allocated_Qty invalid/], ['negative -5', -5, /Allocated_Qty/]]) {
  const o = zeroDem({ On_Hand_Qty: 10, Allocated_Qty: al });
  ok(() => o.x.cls === 'Not Assessed' && o.x.assess === 'Not Assessed' && why.test(o.x.naWhy || ''),
    () => 'A2 FG050 (zero demand, 10 on hand), Allocated ' + lab + ': stock class "Not Assessed" with the reason (got class "' + o.x.cls + '", reason "' + o.x.naWhy + '")'); }
{ const o = zeroDem({ On_Hand_Qty: 10, Allocated_Qty: undefined }), c = cellsOf(rowOf(ctx.__view(o.R, DEAD), 'FG050') || '');
  ok(() => c[2] === '–' && /Allocated –/.test(c[3] || ''), () => 'A2/B1 the dead-stock row of an unknown allocation shows Uncommitted "–" and Allocated "–", not 10 (got ' + c.slice(2, 4).join(' | ') + ')'); }

// ---------- A1: fully allocated, no recorded demand -> unchanged class, plus the warning
{ const o = zeroDem({ On_Hand_Qty: 10, Allocated_Qty: 10 });
  ok(() => o.x.cls === 'Active' && names(o.R, FULLY) === 'FG050' && !rowOf(ctx.__view(o.R, DEAD), 'FG050') && warn(o.R, FULLY).sev === 'Medium',
    () => 'A1 FG050 zero demand, 10 on hand, 10 allocated: not dead stock (class "' + o.x.cls + '", not in the view) and named by the Medium warning (got "' + names(o.R, FULLY) + '")'); }
{ const o = zeroDem({ On_Hand_Qty: 10, Allocated_Qty: 4 });
  ok(() => !names(o.R, FULLY).includes('FG050'), 'A1 FG050 partly allocated (4 of 10): not named by the fully-allocated warning (its 6 uncommitted units are listed as dead stock instead)'); }
{ const R = E.runEngine({ workbook: load(NSF) }).result; ok(() => !warn(R, FULLY), 'A1 clean Northstar: no fully-allocated warning (no item qualifies)'); }

// ---------- A3: usable vs physical
{ const o = zeroDem({ On_Hand_Qty: 10, Usable_On_Hand_Qty: 12, Allocated_Qty: 0 }, true);
  ok(() => !warn(o.R, UOVER) && o.x.av === 12, () => 'A3 usable 12 above physical 10 (legitimate under Stage 2 B6): no usable-vs-physical warning, availability 12 (got "' + names(o.R, UOVER) + '", ' + o.x.av + ')'); }
{ const o = zeroDem({ On_Hand_Qty: 10, Usable_On_Hand_Qty: 6, Allocated_Qty: 2 }, true);
  ok(() => !warn(o.R, UOVER) && o.x.av === 4, () => 'A3 physical 10 above usable 6 (normal quarantine): no warning, and availability uses usable: 6 − 2 = 4 (got ' + o.x.av + ')'); }
{ const o = zeroDem({ On_Hand_Qty: 10, Usable_On_Hand_Qty: 6, Allocated_Qty: 6 }, true);
  ok(() => o.x.uncomm === 4 && o.x.cls === 'No recorded demand', () => 'A3 dead-stock basis stays max(physical, usable) − allocated: max(10, 6) − 6 = 4, still listed (got ' + o.x.uncomm + ', "' + o.x.cls + '")'); }

// ---------- B1: export columns
{ const o = zeroDem({ On_Hand_Qty: 10, Usable_On_Hand_Qty: 6, Allocated_Qty: 2 }, true), out = ctx.__export(o.R, o.wb);
  const rows = out ? X.utils.sheet_to_json(out.Sheets.ENG_FG, { raw: true }) : [], hdr = out ? X.utils.sheet_to_json(out.Sheets.ENG_FG, { header: 1 })[0] : [], r = rows.find(x => x.Item === 'FG050') || {};
  ok(() => hdr.indexOf('Usable') === hdr.indexOf('Allocated') + 1 && hdr.indexOf('Uncommitted') === hdr.indexOf('Usable') + 1 && hdr.indexOf('Available') === hdr.indexOf('Uncommitted') + 1,
    () => 'B1 export ENG_FG columns: Allocated, Usable, Uncommitted, Available in that order (got ' + hdr.slice(3, 8).join(', ') + ')');
  ok(() => r.OnHand === 10 && r.Usable === 6 && r.Allocated === 2 && r.Uncommitted === 8 && r.Available === 4,
    () => 'B1 export FG050: physical 10, usable 6, allocated 2, uncommitted max(10, 6) − 2 = 8, available 6 − 2 = 4 (got ' + JSON.stringify([r.OnHand, r.Usable, r.Allocated, r.Uncommitted, r.Available]) + ')'); }
{ const o = zeroDem({ On_Hand_Qty: 10, Allocated_Qty: undefined }), out = ctx.__export(o.R, o.wb), r = (X.utils.sheet_to_json(out.Sheets.ENG_FG, { raw: true }).find(x => x.Item === 'FG050')) || {};
  ok(() => r.Usable === 10 && (r.Uncommitted === undefined || r.Uncommitted === null), () => 'B1 export, blank allocation: Usable 10 (physical, no usable column) and Uncommitted EMPTY, never 10 (got ' + JSON.stringify([r.Usable, r.Uncommitted]) + ')'); }

// ---------- B2: ABC note
{ const h = ctx.__view(E.runEngine({ workbook: load(FAULTY) }).result, 'Health'), n = (h.match(/<p class="note" data-abc-note="1">[^<]*<\/p>/g) || []).map(s => s.replace(/<[^>]+>/g, ''));
  ok(() => n.length === 2 && n[0] === 'Finished goods: ABC classes are based on 49 of 50 items. 1 item could not be valued and is excluded, so classes near the 80% and 95% limits may change once its value is known.' &&
    n[1] === 'Materials: ABC classes are based on 97 of 100 items. 3 items could not be valued and are excluded, so classes near the 80% and 95% limits may change once their values are known.',
    () => 'B2 faulty Northstar: two ABC notes with the counts 49 of 50 (1 excluded) and 97 of 100 (3 excluded) (got ' + JSON.stringify(n) + ')'); }
{ const h = ctx.__view(E.runEngine({ workbook: load(NSF) }).result, 'Health'); ok(() => !h.includes('data-abc-note'), 'B2 clean Northstar: no ABC note (every item valued)'); }

// ---------- E-9: recorded-zero-demand path of the dead-stock rule
{ const o = zeroDem({ On_Hand_Qty: 10, Allocated_Qty: 0 });
  ok(() => o.x.m === 0 && o.x.cls === 'No recorded demand' && o.x.uncomm === 10 && names(o.R, /^Stock held with no demand$/).split(',').includes('FG050') && !!rowOf(ctx.__view(o.R, DEAD), 'FG050'),
    () => 'E-9 FG050 recorded zero demand, nothing allocated: demand 0 (known, not unknown), "No recorded demand", uncommitted 10, warned and listed (got m ' + o.x.m + ', "' + o.x.cls + '")'); }
{ const o = zeroDem({ On_Hand_Qty: 10, Allocated_Qty: 4 }), c = cellsOf(rowOf(ctx.__view(o.R, DEAD), 'FG050') || '');
  ok(() => o.x.cls === 'No recorded demand' && o.x.uncomm === 6 && c[2] === '6', () => 'E-9 FG050 recorded zero demand, 4 of 10 allocated: listed with uncommitted 6 (got "' + o.x.cls + '", ' + o.x.uncomm + ', cell ' + c[2] + ')'); }

// ---------- r4 defect A: no NaN/Infinity in any export sheet; unknown -> empty, never 0; legitimate values preserved
{ const wb = load(FAULTY), R = E.runEngine({ workbook: wb }).result, out = ctx.__export(R, wb);
  const bad = []; for (const n of out.SheetNames.filter(n => n.startsWith('ENG_'))) X.utils.sheet_to_json(out.Sheets[n], { header: 1 }).forEach((row, i) => row.forEach((v, j) => { if (v === 'NaN' || (typeof v === 'number' && !isFinite(v))) bad.push(n + ' r' + i + ' c' + j); }));
  ok(() => bad.length === 0, () => 'r4-A faulty Northstar: no NaN or Infinity cell in any of the ' + out.SheetNames.filter(n => n.startsWith('ENG_')).length + ' ENG_ export sheets (got ' + bad.slice(0, 5).join(', ') + ')');
  const pr = X.utils.sheet_to_json(out.Sheets.ENG_POReconciliation, { raw: true }), g = id => pr.find(r => r.Material === id) || {};
  ok(() => ['RM005', 'RM017', 'RM042'].every(id => g(id).GapValueGBP === undefined || g(id).GapValueGBP === null) && ['RM005', 'RM017', 'RM042'].every(id => typeof g(id).Gap === 'number'),
    () => 'r4-A GapValueGBP of the three materials with unknown cost is an EMPTY cell, not 0 or NaN; their Gap quantity is still exported (got ' + JSON.stringify(['RM005', 'RM017', 'RM042'].map(id => [g(id).GapValueGBP, g(id).Gap])) + ')');
  const rv = Object.fromEntries(R.recon.map(r => [r.id, r.val])), mism = pr.filter(r => typeof rv[r.Material] === 'number' && isFinite(rv[r.Material]) && r.GapValueGBP !== rv[r.Material]);
  ok(() => mism.length === 0 && pr.filter(r => typeof r.GapValueGBP === 'number').length === R.recon.filter(r => typeof r.val === 'number' && isFinite(r.val)).length,
    () => 'r4-A every known GapValueGBP is exported exactly as the engine calculated it (' + mism.length + ' mismatches)'); }

// ---------- r4 defect B: demand chart by calendar month; unknown = gap; recorded 0 = 0; no NaN
{ const R = E.runEngine({ workbook: load(path.join(FX, 'structure', 'scenario-willow.xlsx')) }).result, h = ctx.__fview(R, 'WF-D656');
  ok(() => !/NaN/.test(h) && /data-chart-gaps="1">1 month of demand history is unknown \(no usable demand record\): shown as a gap in the line, not as zero\./.test(h) && /option value="WF-D656" selected/.test(h),
    () => 'r4-B Willow WF-D656 (first calendar month unknown): chart has no NaN and says the month is a gap, not zero');
  const first = (h.match(/stroke="var\(--a\)" stroke-width="2"\s+points="([\d.]+),/) || [])[1];
  ok(() => first === (34 + 1 * (640 - 68) / (10 + 12 - 1)).toFixed(1), () => 'r4-B WF-D656 history starts at calendar month 2 (x ' + (34 + (640 - 68) / 21).toFixed(1) + '), not shifted to month 1 (got x ' + first + ')'); }
{ const F = { hi: Array(12).fill(12), lo: Array(12).fill(8), f: Array(12).fill(10) }, x = { id: 'T', h: [10, 0, 7, 9], hc: [10, 0, null, 7, 9], fc: [NaN, NaN, NaN, NaN, NaN] }, svg = ctx.__chart(x, F);
  const segs = svg.match(/<polyline[^>]*stroke="var\(--a\)"[^>]*points="([^"]*)"/g) || [], Y0 = (230 - 34).toFixed(1);
  ok(() => !/NaN/.test(svg) && segs.length === 2 && segs[0].includes(',' + Y0 + '"') && !/stroke="var\(--o\)"/.test(svg),
    () => 'r4-B synthetic history 10, 0, unknown, 7, 9: two segments split at the unknown month, the recorded 0 plotted at the baseline y ' + Y0 + ', an all-unknown forecast series draws nothing, no NaN (got ' + segs.length + ' segments)'); }
{ const h = ctx.__fview(E.runEngine({ workbook: load(NSF) }).result, 'FG001'); ok(() => !/NaN/.test(h) && !/data-chart-gaps/.test(h), 'r4-B clean Northstar FG001 chart: no NaN and no gap note (every month known)'); }

// ---------- unchanged elsewhere: classes and warnings equal those of the parent candidate 43b6b55
const sig = R => { const a = [...R.fg, ...R.rm]; return { h: crypto.createHash('sha256').update(a.map(x => x.id + ':' + x.cls).join('|')).digest('hex').slice(0, 16), dq: R.dq.map(d => d.sev + '|' + d.sheet + '|' + d.msg.slice(0, 60)) }; };
const PARENT = {
  northstar: { h: '9c17011b7a6fe7ba', n: 5 }, willow: { h: '25412ff58e5ab553', n: 12 }, faulty: { h: '6ad69b245cae4c55', n: 8 } };
for (const [k, f] of [['northstar', NSF], ['willow', path.join(FX, 'structure', 'scenario-willow.xlsx')], ['faulty', FAULTY]]) {
  const s = sig(E.runEngine({ workbook: load(f) }).result);
  ok(() => s.h === PARENT[k].h && s.dq.length === PARENT[k].n && !s.dq.some(d => /fully allocated|Usable on-hand exceeds/.test(d)),
    () => 'unchanged ' + k + ': every item\'s stock class and the warning list match the parent 43b6b55 (class hash ' + s.h + ', ' + s.dq.length + ' warnings; expected ' + PARENT[k].h + ', ' + PARENT[k].n + ')'); }

console.log(`tag6-changes: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
