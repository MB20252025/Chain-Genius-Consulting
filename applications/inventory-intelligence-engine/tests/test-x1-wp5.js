#!/usr/bin/env node
/* X1 WP5 + WP6 (21 Nov 2026; owner decisions D1, D4, D6, D7): engine behaviour for unknown, invalid and prohibited inputs, and calendar-aware demand.
 * Every case proves BOTH sides (owner §6.6): the affected items are Not Assessed with a reason, and every unaffected item is exactly as on clean data.
 * Expected outcomes come from the owner decisions and design v2 §5/§13.1, not from the code. Run from tests/: NODE_PATH=<pinned node_modules> node test-x1-wp5.js
 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const APP = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
const ok = (c, m) => { let v = false, why = ''; try { v = !!(typeof c === 'function' ? c() : c); } catch (e) { why = ' [threw: ' + e.message + ']'; } v ? pass++ : fail++; console.log((v ? 'PASS: ' : 'FAIL: ') + m + why); };
const read = f => fs.readFileSync(path.join(APP, f), 'utf8');
const ctx = vm.createContext({ TextDecoder, Uint8Array, Buffer, console }); ctx.globalThis = ctx;
vm.runInContext(read('assets/xlsx.mini.min.js'), ctx);
for (const f of ['canonical', 'read', 'clean', 'mapping', 'validate', 'engine-map', 'engine-workbook', 'result-gate', 'adapter']) vm.runInContext(read('js/import/' + f + '.js'), ctx, { filename: f + '.js' });
vm.runInContext(read('js/validation/x1-integrity.js'), ctx, { filename: 'x1-integrity.js' });
for (const n of ['calculations', 'forecasting', 'app', 'excel-import', 'engine/engine-api']) vm.runInContext(read('js/' + n + '.js'), ctx, { filename: n + '.js' });
vm.runInContext('globalThis.__E=CGEngine;', ctx); vm.runInContext(read('tests/tools/import-v1/reverse-eight-sheet.js'), ctx);
const X = ctx.XLSX, V = ctx.CGValidation, NS = fs.readFileSync(path.join(__dirname, 'fixtures', 'northstar', 'Chain_Genius_Project_001_Northstar_Dataset_1.xlsx'));
const fresh = () => X.read(NS, { cellDates: true }), rt = w => X.read(Buffer.from(X.write(w, { type: 'buffer', bookType: 'xlsx', cellDates: true })), { type: 'buffer', cellDates: true });
const edit = (w, sh, fn) => { const hdr = X.utils.sheet_to_json(w.Sheets[sh], { header: 1 })[0], r = X.utils.sheet_to_json(w.Sheets[sh], { raw: true, cellDates: true }), h2 = fn(r, hdr) || hdr; w.Sheets[sh] = X.utils.json_to_sheet(r, { header: h2, cellDates: true }); return w; };
const run = (w, settings) => ctx.__E.runEngine(Object.assign({ workbook: rt(w) }, settings ? { settings } : {}));
const items = o => [...o.result.fg, ...o.result.rm], byId = o => Object.fromEntries(items(o).map(x => [x.id, x]));
const K = ['sev', 'score', 'cat', 'cls', 'short', 'exQty', 'av', 'cover', 'fSS', 'fROP', 'fLT', 'fLTp', 'fEx', 'verdict', 'm'];
const sig = x => JSON.stringify(K.map(k => typeof x[k] === 'number' && !isFinite(x[k]) ? 'NF' : x[k]));
const base = run(fresh()), B = byId(base);
const unaffectedSame = (o, affected) => items(o).filter(x => !affected.includes(x.id)).filter(x => sig(x) !== sig(B[x.id])).map(x => x.id);
const NA = x => x.sev === null && x.score === null && x.cat === 'Not Assessed' && x.assess === 'Not Assessed';

// ---------- clean data: everything assessed (CR-06 lesson: no false withholding)
ok(() => items(base).every(x => x.sev !== null && x.assess === 'Assessed' && x.na.length === 0 && x.naD.length === 0), 'Northstar clean: all 150 items Assessed, no reason recorded');
ok(() => Object.entries(base.result.cov).every(([k, v]) => k === 'costZero' ? v === 0 : v === 150), 'Northstar clean: coverage 150 of 150 for stock, value, excess, shortage, demand; 0 zero-cost');
{ const FX = Object.keys(JSON.parse(fs.readFileSync(path.join(__dirname, 'snapshots', 'v0.7-confidence-20261116T034921Z.json'), 'utf8')).fixtures), bad = [];
  for (const f of FX) { const o = ctx.__E.runEngine({ workbook: X.read(fs.readFileSync(path.join(__dirname, 'fixtures', f)), { cellDates: true }) }); const n = items(o).filter(x => x.sev === null).map(x => x.id); if (n.length || o.result.cov.assessed !== o.result.cov.n) bad.push(f + ': ' + n.join(',')); }
  ok(() => bad.length === 0, 'all 17 snapshot fixtures: every item Assessed (' + (bad.join('; ') || 'none Not Assessed') + ')'); }

// ---------- issue 12 fixed: blank allocation no longer looks healthy (RM001 was severity 3, health 42 on clean data; severity 0, health 100 before WP5)
{ const o = run(edit(fresh(), 'Inventory', r => { delete r.find(x => x.Item_ID === 'RM001').Allocated_Qty; })), x = byId(o).RM001;
  ok(() => B.RM001.sev === 3 && B.RM001.score === 42, 'reference: RM001 on clean data is severity 3, health 42');
  ok(() => NA(x) && /Allocated_Qty blank/.test(x.naWhy), 'RM001 allocation blank: severity, health score and category are Not Assessed, reason "Allocated_Qty blank" (was: severity 0, health 100)');
  ok(() => [x.fSS, x.fROP, x.fLT, x.fLTp, x.fEx].every(v => v === null) && !isFinite(x.short) && !isFinite(x.exQty) && !isFinite(x.av) && !isFinite(x.cover), 'RM001: reorder, safety-stock, cover and excess flags null; shortage, excess, available stock and cover non-finite (shown "–"), never 0 or false');
  ok(() => x.cls === 'Not Assessed' && x.why.startsWith('Not Assessed: Allocated_Qty blank'), 'RM001: stock class "Not Assessed" (never "Active"), explanation first in the item reasons');
  ok(() => isFinite(x.val) && x.val === B.RM001.val, 'RM001: stock value still calculated (it does not use allocation)');
  ok(() => unaffectedSame(o, ['RM001']).length === 0, 'every other item (149) identical to clean data');
  ok(() => !isFinite(o.result.shV) && o.result.cov.shortage === 149 && o.result.cov.assessed === 149 && isFinite(o.result.fgV), 'totals: the shortage total is not released as a number (one component unknown); coverage 149 of 150; stock value total still a number');
  const f = o.feas.rows.filter(r => r.bl.concat([]).length >= 0 && (o.result.bomS[r.o.sku] || []).some(l => l.Material_ID === 'RM001'));
  ok(() => f.length > 0 && f.every(r => r.status === 'Insufficient information' && /RM001 stock Not Assessed/.test(r.why)), 'feasibility: every order using RM001 is "Insufficient information" naming RM001 (never a false "Material shortage" from stock read as 0)'); }

// ---------- D1(d): negatives prohibited, never used as numbers (direct route)
{ const o = run(edit(fresh(), 'Inventory', r => { r.find(x => x.Item_ID === 'FG003').Allocated_Qty = -5; r.find(x => x.Item_ID === 'RM004').Reorder_Point_Qty = -10; })), I = byId(o);
  ok(() => NA(I.FG003) && /Allocated_Qty negative \(not allowed\)/.test(I.FG003.naWhy) && !isFinite(I.FG003.av), 'FG003 allocation -5: Not Assessed, "Allocated_Qty negative (not allowed)"; available stock not computed (it used to ADD 5)');
  ok(() => o.result.dq.some(q => q.sev === 'High' && /^Negative quantities/.test(q.msg) && /FG003/.test(q.ex)), 'FG003: the High "Negative quantities" warning is kept');
  ok(() => NA(I.RM004) && /^Not Assessed – Reorder_Point_Qty negative/.test(I.RM004.verdict) && I.RM004.fROP === null, 'RM004 reorder point -10: reorder comparison and risk status Not Assessed (never compared as a number)');
  ok(() => o.result.dq.some(q => q.sev === 'High' && /^Negative reorder point/.test(q.msg) && /RM004/.test(q.ex)), 'RM004: High "Negative reorder point" warning');
  ok(() => unaffectedSame(o, ['FG003', 'RM004']).length === 0, 'every other item identical to clean data'); }
{ const o = run(edit(fresh(), 'Inventory', r => { r.find(x => x.Item_ID === 'RM006').On_Order_Qty = -3; })), o1 = run(edit(fresh(), 'Inventory', r => { r.find(x => x.Item_ID === 'RM006').On_Order_Qty = -3; }), { sup: 1 });
  const m0 = o.mrp.find(r => r.x.id === 'RM006'), m1 = o1.mrp.find(r => r.x.id === 'RM006');
  ok(() => m0.netU === null && m0.st !== 'Not Assessed' && byId(o).RM006.sev !== null, 'RM006 on-order -3, PO-verified supply (default): the inventory-on-order comparison column is withheld; MRP and risk status (which use POs) stay assessed');
  ok(() => m1.st === 'Not Assessed' && /On_Order_Qty unavailable or negative/.test(m1.why) && byId(o1).RM006.sev === null, 'RM006 on-order -3 with inventory on-order as supply (sup 1): MRP row and risk status Not Assessed'); }
{ const o = run(edit(fresh(), 'Inventory', r => { delete r.find(x => x.Item_ID === 'RM007').Reorder_Point_Qty; })), x = byId(o).RM007;
  ok(() => x.verdict === 'No reorder point configured' && x.fROP === false && x.sev !== null && unaffectedSame(o, ['RM007']).length === 0, 'RM007 reorder point blank: "No reorder point configured" (the reorder check does not apply), still Assessed; others unchanged'); }

// ---------- D7: zero unit cost is suspicious
{ const o = run(edit(fresh(), 'Inventory', r => { r.find(x => x.Item_ID === 'RM005').Unit_Cost_GBP = 0; })), x = byId(o).RM005;
  ok(() => x.val === 0 && x.costZero === true && x.sev !== null, 'RM005 zero cost: value £0 kept (recorded value), flagged suspicious, still Assessed');
  ok(() => o.result.cov.costZero === 1 && o.result.cov.valued === 149, 'coverage: 149 of 150 reliably costed, 1 zero-cost');
  ok(() => o.result.dq.some(q => q.sev === 'Medium' && /^Zero unit cost/.test(q.msg) && /RM005/.test(q.ex)), 'Medium "Zero unit cost (treated as suspicious …)" warning names RM005');
  ok(() => o.integrity.suspicious.length === 1 && o.integrity.suspicious[0].record === 'RM005' && o.integrity.report.some(l => /^Unit_Cost_GBP: 1 zero \(suspicious/.test(l)), 'integrity record lists RM005 as suspicious and reports it'); }

// ---------- ABC ranking: one unknown value no longer reclassifies other items (found by the WP7 browser test, 21 Nov 2026)
{ const o = run(edit(fresh(), 'Inventory', r => { r.find(x => x.Item_ID === 'RM003').Unit_Cost_GBP = 'n/a'; })), I = byId(o);
  ok(() => I.RM003.abc === 'Not Assessed' && !isFinite(I.RM003.cum), 'RM003 cost invalid: ABC class Not Assessed (annual value unknown)');
  ok(() => items(o).filter(x => x.id !== 'RM003' && x.abc !== B[x.id].abc).length === 0, 'every other item keeps its ABC class (before the fix 75 materials changed class)'); }

// ---------- D1(b): zero BOM quantity is an invalid line
{ const w = edit(fresh(), 'BOM', r => { r.find(x => x.SKU === 'FG001').Qty_Per_Finished_Unit = 0; });
  const line = X.utils.sheet_to_json(w.Sheets.BOM, { raw: true }).find(x => x.SKU === 'FG001' && x.Qty_Per_Finished_Unit === 0), mat = line.Material_ID, o = run(w), x = byId(o)[mat];
  ok(() => x.m === null && NA(x) && /BOM line FG001 → .*zero \(invalid\)/.test(x.naWhy), mat + ' (FG001 line quantity 0): usage unknown, Not Assessed, reason names the BOM line (never a phantom 0 requirement)');
  ok(() => o.mrp.find(r => r.x.id === mat).st === 'Not Assessed', mat + ': MRP row Not Assessed');
  ok(() => o.feas.rows.filter(r => r.o.sku === 'FG001').every(r => r.status === 'Insufficient information' && /zero \(invalid\)/.test(r.why)), 'feasibility of FG001 orders: "Insufficient information" with the BOM reason');
  ok(() => o.integrity.dependencies['bom-requirement'].withheld.some(q => q.record === 'FG001|' + mat), 'integrity record withholds that BOM line'); }

// ---------- WP6 / D6: missing month = unknown; recorded zero = zero
const fgRows = (r, id) => r.filter(x => x.SKU === id).sort((a, b) => a.Month_Start - b.Month_Start);
{ const o = run(edit(fresh(), 'Demand History', r => { delete fgRows(r, 'FG001')[4].Units_Sold; })), x = byId(o).FG001, F = o.forecasts.FG001;
  ok(() => x.h.length === 11 && x.hc[4] === null && x.hc.filter(v => v !== null).length === 11 && isFinite(x.m), 'FG001 one blank cell: a missing month (calendar slot null), never NaN or 0; average demand from 11 observed months');
  /* SUPERSEDED 27 Nov 2026 (owner approval "Phase 3 – Outstanding Decisions and Completion", item 1; Stage 3B Phase 3 rules D–F; AD-19):
     was: F.n === 7 and "methods use only the last 7 consecutive" (the D6 last-unbroken-run rule). Intent kept: the missing month is unknown,
     never 0, and is stated; no method is computed across it. Now: all 11 recorded months are used at their calendar positions and every
     method is back-tested only where its own months exist (the compared methods on the same months; one that cannot be tested
     around the gap is named and not compared: owner decision 27 Nov 2026, item 3). */
  ok(() => F.ok && F.gaps === 1 && F.n === 11 && F.warn.some(w => /1 missing month\(s\) inside the history are unknown, not zero/.test(w)) && Object.values(F.bt).filter(b => b.pts > 0).length >= 2 && Object.values(F.bt).filter(b => b.pts > 0).every(b => b.pts === F.bt[F.best].pts) && (Object.values(F.bt).every(b => b.pts > 0) || F.warn.some(w => /not tested .* so not compared/.test(w))), 'FG001 forecast: all 11 recorded months used at their calendar positions (the gap is not filled or counted as zero); the warning states the missing month; the compared methods are tested on the same months, and a method that cannot be tested around the gap is named and not compared');
  ok(() => o.forecastCredibility.FG001.missing === 1, 'FG001 credibility counts 1 missing period');
  ok(() => Object.keys(o.forecasts).filter(k => k !== 'FG001').every(k => JSON.stringify(o.forecasts[k]) === JSON.stringify(base.forecasts[k])), 'every other forecast identical to clean data'); }
{ const o = run(edit(fresh(), 'Demand History', r => { const f = fgRows(r, 'FG001'); r.splice(r.indexOf(f[8]), 1); })), F = o.forecasts.FG001;
  /* SUPERSEDED 27 Nov 2026 (same approval): was: no forecast, "insufficient consecutive history", F.n === 3. Intent kept: nothing is
     computed across the gap. Now: a gap alone never prevents a forecast; the 6-month average, whose months include the gap, is not used
     and says why; the 3-month methods use the 3 recorded months after the gap. */
  ok(() => F.ok && F.gaps === 1 && F.n === 11 && !F.meth.includes('ma6') && /6 calendar months before the forecast start/.test(F.na.ma6) && F.meth.includes('ma3') && F.warn.some(w => /1 missing month\(s\) inside the history/.test(w)), 'FG001 gap leaving 3 months after it: still forecast from the 11 recorded months; the 6-month average (it would need the missing month) is not used, with the reason; the gap is stated'); }
{ const o = run(edit(fresh(), 'Demand History', r => { fgRows(r, 'FG001').forEach(x => { delete x.Units_Sold; }); })), x = byId(o).FG001;
  ok(() => x.m === null && NA(x) && x.cls === 'Not Assessed' && /no usable demand history/.test(x.naWhy) && o.forecasts.FG001.ok === false, 'FG001 rows present, every value blank: demand unknown, Not Assessed, no forecast (was NaN)'); }
{ const o = run(edit(fresh(), 'Demand History', r => { fgRows(r, 'FG001').forEach(x => { x.Units_Sold = 0; }); })), x = byId(o).FG001;
  ok(() => x.m === 0 && x.fND === true && x.cls === 'No recorded demand' && x.sev !== null, 'FG001 every month recorded 0: genuine zero demand, "No recorded demand", Assessed (distinct from missing)'); }
{ const o = run(edit(fresh(), 'Demand History', r => { r.splice(0, r.length, ...r.filter(x => x.SKU !== 'FG001')); })), x = byId(o).FG001;
  // task 4 (owner Q1 approval, CR-17): superseded interim expectation "no rows keeps zero demand"
  ok(() => x.m === null && NA(x) && x.cls === 'Not Assessed' && /no usable demand history/.test(x.naWhy) && o.integrity.history.FG001.condition === 'no-rows' && o.result.dq.some(q => /^Stock held with no demand history/.test(q.msg) && /FG001/.test(q.ex)) && unaffectedSame(o, ['FG001', ...X.utils.sheet_to_json(fresh().Sheets.BOM, { raw: true }).filter(b => b.SKU === 'FG001').map(b => b.Material_ID)]).length === 0, 'FG001 with no demand rows at all: demand unknown (D6 + Q1), Not Assessed with the reason, uncommitted stock warned; every item outside FG001 and its materials unchanged');
  const mats = X.utils.sheet_to_json(fresh().Sheets.BOM, { raw: true }).filter(b => b.SKU === 'FG001').map(b => b.Material_ID), only = mats.filter(id => X.utils.sheet_to_json(fresh().Sheets.BOM, { raw: true }).filter(b => b.Material_ID === id).every(b => b.SKU === 'FG001'));
  ok(() => mats.every(id => byId(o)[id].sev === null && /parent FG001 has no demand rows/.test(byId(o)[id].naWhy)), 'materials used by FG001: derived demand unknown, Not Assessed with the reason "parent FG001 has no demand rows" (' + mats.length + ' materials; ' + only.length + ' used only by FG001)'); }
// raw-material derived demand: calendar-aligned
{ const w = edit(fresh(), 'Demand History', r => { delete fgRows(r, 'FG001')[4].Units_Sold; }), o = run(w);
  const used = X.utils.sheet_to_json(w.Sheets.BOM, { raw: true }).filter(b => b.SKU === 'FG001').map(b => b.Material_ID);
  ok(() => used.length > 0 && used.every(id => byId(o)[id].hc[4] === null && byId(o)[id].hc.filter(v => v === null).length === 1 && byId(o)[id].sev !== null), 'materials used by FG001: month 5 usage unknown (null), the other 11 months known, still Assessed');
  ok(() => used.every(id => B[id].hc.every(v => v !== null)) && items(o).filter(x => x.type === 'RM' && !used.includes(x.id)).every(x => JSON.stringify(x.hc) === JSON.stringify(B[x.id].hc)), 'other materials: usage history identical to clean data'); }

// ---------- engine and shared record agree (owner §6.2/§6.3): availability exactly; risk status in the safe direction
for (const [lab, fn] of [['clean', w => w], ['blank allocation RM001', w => edit(w, 'Inventory', r => { delete r.find(x => x.Item_ID === 'RM001').Allocated_Qty; })],
  ['negative allocation FG003 + negative ROP RM004', w => edit(w, 'Inventory', r => { r.find(x => x.Item_ID === 'FG003').Allocated_Qty = -5; r.find(x => x.Item_ID === 'RM004').Reorder_Point_Qty = -10; })],
  ['column absent', w => edit(w, 'Inventory', (r, h) => { r.forEach(x => delete x.Allocated_Qty); return h.filter(c => c !== 'Allocated_Qty'); })],
  ['FG001 all demand blank', w => edit(w, 'Demand History', r => { fgRows(r, 'FG001').forEach(x => { delete x.Units_Sold; }); })]]) {
  const o = run(fn(fresh())), D = o.integrity.dependencies, held = c => new Set(D[c].withheld.map(q => String(q.record).split('|')[0]));
  const av = held('available-stock'), rs = held('risk-status');
  const m1 = items(o).filter(x => (x.na.length > 0) !== av.has(x.id)).map(x => x.id), m2 = items(o).filter(x => x.sev === null && !rs.has(x.id)).map(x => x.id), m3 = items(o).filter(x => !rs.has(x.id) && x.sev === null).map(x => x.id);
  ok(() => m1.length === 0 && m2.length === 0 && m3.length === 0, 'consistency, ' + lab + ': engine availability Not Assessed exactly where the shared record withholds it; every Not Assessed severity is withheld in the record (' + [...m1, ...m2].slice(0, 5).join(',') + ')');
  ok(() => items(o).filter(x => x.sev === null).every(x => V.reasonsFor(o.integrity, x.id).length > 0), 'reasons, ' + lab + ': every Not Assessed item has a user-facing reason from the shared record');
}

// ---------- import route: the same items are Not Assessed (engine route parity where Stage 1 permits)
{ const w = edit(fresh(), 'Inventory', r => { delete r.find(x => x.Item_ID === 'RM001').Allocated_Qty; });
  const G = ctx.CGImport, rv = ctx.CGTestTools.reverseEightSheet(rt(w)), imp = G.validate.importFiles(rv.mapping, rv.files), ad = G.adapter.build(imp, rv.mapping);
  const o = ctx.__E.runEngine({ workbook: ad.workbook, integrity: V.fromImport(imp, rv.mapping) }), x = byId(o).RM001;
  ok(() => imp.importAccepted && NA(x) && items(o).filter(z => z.sev === null).map(z => z.id).join() === 'RM001', 'import route, RM001 allocation blank: RM001 alone Not Assessed, as on the direct route');
  ok(() => V.reasonsFor(o.integrity, 'RM001').some(t => /^Allocated_Qty blank \(stock\.csv row \d+\)$/.test(t)), 'import route reason names the source file and row'); }

// ---------- owner D1(a) / Q4 (21 Nov 2026): a bad stock row of an identified item is quarantined, the import proceeds, the item is Not Assessed
{ const G = ctx.CGImport, imp0 = (files, rv) => { const imp = G.validate.importFiles(rv.mapping, files); const ad = imp.importAccepted ? G.adapter.build(imp, rv.mapping) : null; return { imp, ad, o: ad && ad.workbook ? ctx.__E.runEngine({ workbook: ad.workbook, integrity: V.fromImport(imp, rv.mapping) }) : null }; };
  const rv = ctx.CGTestTools.reverseEightSheet(rt(fresh())), clean = imp0(rv.files, rv);
  const edit = (fn) => rv.files.map(f => { if (!/stock/i.test(f.name)) return f; const L = f.text.split(/\r?\n/), h = L[0].split(','), out = fn(L, h); return Object.assign({}, f, { text: out.join('\n') }); });
  const neg = imp0(edit((L, h) => L.map(l => { const c = l.split(','); if (c[h.indexOf('Item_ID')] === 'RM001') c[h.indexOf('Allocated_Qty')] = '-5'; return c.join(','); })), rv);
  const q = neg.imp.issues.find(i => i.code === 'ROW_QUARANTINED' && i.table === 'stock'), CI = byId(clean.o), NI = neg.o ? byId(neg.o) : {};
  ok(() => neg.imp.importAccepted && q && q.rows.length === 1 && q.rows[0].item === 'RM001' && !neg.imp.issues.some(i => i.code === 'ROW_REJECTED' && i.table === 'stock') && neg.ad.workbook, 'import route, RM001 allocation -5: the row is QUARANTINED (reason and row kept); the import is accepted, not refused');
  ok(() => NA(NI.RM001) && !isFinite(NI.RM001.oh === undefined ? NaN : NI.RM001.oh) && V.reasonsFor(neg.o.integrity, 'RM001').some(t => /stock row quarantined/.test(t)), 'RM001 is in the analysis as Not Assessed, with no stock value, and the on-screen reason says the stock row was quarantined');
  ok(() => items(neg.o).filter(x => x.id !== 'RM001').every(x => sig(x) === sig(CI[x.id])) && items(neg.o).length === items(clean.o).length, 'every other item (149) identical to the clean import; no item disappears');
  const two = imp0(edit((L, h) => { const li = h.indexOf('Location_ID'), r = L.find(l => l.split(',')[h.indexOf('Item_ID')] === 'RM001'); if (li < 0 || !r) return L; const good = r.split(','); good[li] = 'LOC-X1'; const bad = r.split(','); bad[h.indexOf('On_Hand_Qty')] = 'abc'; return L.map(l => l === r ? bad.join(',') : l).concat([good.join(',')]); }), rv);
  ok(() => two.imp.importAccepted && two.o && two.imp.issues.some(i => i.code === 'ROW_QUARANTINED') && (NA(byId(two.o).RM001) && !isFinite(byId(two.o).RM001.oh === undefined ? NaN : byId(two.o).RM001.oh)), 'RM001 with one quarantined location row and one valid location row: NOT partly summed into a balance; Not Assessed'); }

console.log(`\nx1-wp5: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
