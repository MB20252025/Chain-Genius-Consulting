#!/usr/bin/env node
/* X1 completion (21 Nov 2026; owner "X1 Final Completion Authorisation"). Closes every evidence gap of X1-VERIFICATION-REPORT.md §3, issue 26, Q6 and
 * the blank/unknown Material_ID decision. Expected values are computed INDEPENDENTLY from the raw sheets where feasible (marked [indep]), never by
 * calling the production formula. Every case checks both sides: the affected items, and that every unaffected item is exactly as on clean data.
 * Run from tests/: NODE_PATH=<pinned node_modules> node test-x1-completion.js
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
vm.runInContext(read('js/validation/x1-integrity.js'), ctx);
for (const n of ['calculations', 'forecasting', 'app', 'excel-import', 'engine/engine-api']) vm.runInContext(read('js/' + n + '.js'), ctx, { filename: n + '.js' });
vm.runInContext('globalThis.__E=CGEngine;globalThis.__x1Sum=x1Sum;globalThis.__CFG=CFG;', ctx); vm.runInContext(read('tests/tools/import-v1/reverse-eight-sheet.js'), ctx);
const X = ctx.XLSX, V = ctx.CGValidation, NS = fs.readFileSync(path.join(__dirname, 'fixtures', 'northstar', 'Chain_Genius_Project_001_Northstar_Dataset_1.xlsx'));
const fresh = () => X.read(NS, { cellDates: true }), rt = w => X.read(Buffer.from(X.write(w, { type: 'buffer', bookType: 'xlsx', cellDates: true })), { type: 'buffer', cellDates: true });
const rows = (w, sh) => X.utils.sheet_to_json(w.Sheets[sh], { raw: true, cellDates: true });
const edit = (w, sh, fn) => { const hdr = X.utils.sheet_to_json(w.Sheets[sh], { header: 1 })[0], r = rows(w, sh), h2 = fn(r, hdr) || hdr; w.Sheets[sh] = X.utils.json_to_sheet(r, { header: h2, cellDates: true }); return w; };
const dropCol = (sh, c) => w => edit(w, sh, (r, h) => { r.forEach(x => delete x[c]); return h.filter(k => k !== c); });
const run = (w, settings) => ctx.__E.runEngine(Object.assign({ workbook: rt(w) }, settings ? { settings } : {}));
const items = o => [...o.result.fg, ...o.result.rm], byId = o => Object.fromEntries(items(o).map(x => [x.id, x]));
const K = ['sev', 'score', 'cat', 'cls', 'short', 'exQty', 'av', 'cover', 'fSS', 'fROP', 'verdict', 'm', 'val', 'abc'];
const sig = x => JSON.stringify(K.map(k => typeof x[k] === 'number' && !isFinite(x[k]) ? 'NF' : x[k]));
const base = run(fresh()), B = byId(base), others = (o, aff) => items(o).filter(x => !aff.includes(x.id) && sig(x) !== sig(B[x.id])).map(x => x.id);
const NA = x => x.sev === null && x.score === null && x.cat === 'Not Assessed';
const imp = w => { const G = ctx.CGImport, rv = ctx.CGTestTools.reverseEightSheet(rt(w)), S1 = G.validate.importFiles(rv.mapping, rv.files), ad = S1.importAccepted ? G.adapter.build(S1, rv.mapping) : null;
  return { S1, ad, o: ad && ad.workbook ? ctx.__E.runEngine({ workbook: ad.workbook, integrity: V.fromImport(S1, rv.mapping) }) : null, rv }; };
const impCsv = (fn) => { const G = ctx.CGImport, rv = ctx.CGTestTools.reverseEightSheet(rt(fresh())), files = rv.files.map(f => { const m = fn(f); return m ? Object.assign({}, f, { text: m }) : f; });
  const S1 = G.validate.importFiles(rv.mapping, files), ad = S1.importAccepted ? G.adapter.build(S1, rv.mapping) : null; return { S1, ad, o: ad && ad.workbook ? ctx.__E.runEngine({ workbook: ad.workbook, integrity: V.fromImport(S1, rv.mapping) }) : null }; };
const csvEdit = (name, fn) => f => { if (!new RegExp(name, 'i').test(f.name)) return null; const L = f.text.split(/\r?\n/), h = L[0].split(','); return fn(L, h).join('\n'); };
const setCsv = (name, id, col, v, idCol) => impCsv(csvEdit(name, (L, h) => L.map((l, i) => { if (!i) return l; const c = l.split(','); if (c[h.indexOf(idCol || 'Item_ID')] === id) c[h.indexOf(col)] = v; return c.join(','); })));
const consistent = o => { const D = o.integrity.dependencies, held = c => new Set(D[c].withheld.map(q => String(q.record).split('|')[0]));
  return items(o).every(x => (x.na.length > 0) === held('available-stock').has(x.id)) && items(o).every(x => x.sev !== null || held('risk-status').has(x.id)) && items(o).filter(x => x.sev === null).every(x => V.reasonsFor(o.integrity, x.id).length > 0); };
const invSheet = rows(fresh(), 'Inventory'), bomSheet = rows(fresh(), 'BOM'), demSheet = rows(fresh(), 'Demand History');

// ================= independent recalculations on clean data (cross-checks of separate paths)
{ // [indep] raw-material usage by CALENDAR month, from the raw sheets: sum over BOM lines of parent Units_Sold x qty x (1 + scrap)
  const months = [...new Set(demSheet.map(d => +d.Month_Start))].sort((a, b) => a - b), sc = v => v === undefined || v === null || v === '' ? 0 : (+v > 1 ? +v / 100 : +v);
  const bad = [];
  for (const x of base.result.rm) { const lines = bomSheet.filter(b => b.Material_ID === x.id); if (!lines.length) continue;
    const exp = months.map(t => lines.reduce((s, b) => s + demSheet.filter(d => d.SKU === b.SKU && +d.Month_Start === t).reduce((q, d) => q + d.Units_Sold, 0) * b.Qty_Per_Finished_Unit * (1 + sc(b.Scrap_Factor_Pct)), 0));
    if (exp.some((v, i) => Math.abs(v - x.hc[i]) > 1e-6 * Math.max(1, v))) bad.push(x.id); }
  ok(() => bad.length === 0 && base.result.rm.length === 100, '[indep] all 100 materials: monthly usage equals an independent calendar-month recalculation from the raw BOM and demand sheets (' + (bad.slice(0, 3).join(',') || 'no mismatch') + ')');
  // [indep] hand calculation: FG001 average monthly demand = mean of its last CFG.basis recorded months
  const f = demSheet.filter(d => d.SKU === 'FG001').sort((a, b) => a.Month_Start - b.Month_Start).map(d => d.Units_Sold), n = ctx.__CFG.basis, e = f.slice(-n).reduce((a, b) => a + b, 0) / Math.min(n, f.length);
  ok(() => Math.abs(B.FG001.m - e) < 1e-9, '[indep] FG001 average demand ' + e.toFixed(3) + ' = hand calculation over the last ' + n + ' months');
  // [indep] inventory value = sum of On_Hand x Unit_Cost from the Inventory sheet
  const tot = invSheet.reduce((s, r) => s + r.On_Hand_Qty * r.Unit_Cost_GBP, 0);
  ok(() => Math.abs(base.result.tot - tot) < 1e-6, '[indep] inventory value £' + tot.toFixed(2) + ' = sum of on-hand x cost from the sheet'); }

// ================= §5.1 On_Hand_Qty: column absent (direct), import route behaviour
{ const o = run(dropCol('Inventory', 'On_Hand_Qty')(fresh()));
  ok(() => items(o).every(NA) && o.result.cov.stock === 0 && !isFinite(o.result.tot) && o.integrity.report.some(l => /^On_Hand_Qty: column not supplied/.test(l)), '§5.1 On_Hand_Qty column absent (direct): every item Not Assessed, stock coverage 0 of 150, value total not a number, integrity line names the column');
  ok(() => items(o).every(x => /On_Hand_Qty blank/.test(x.naWhy)) && consistent(o), '§5.1: every reason names On_Hand_Qty; engine and shared record agree');
  const i = impCsv(csvEdit('stock', (L, h) => L.map(l => { const c = l.split(','); c.splice(h.indexOf('On_Hand_Qty'), 1); return c.join(','); })));
  ok(() => !i.S1.importAccepted && i.S1.issues.some(q => q.code === 'REQUIRED_UNMAPPED' || /On_Hand_Qty/.test(q.msg || q.message || '')), '§5.1 import route, On_Hand_Qty column absent: Stage 1 refuses (REQUIRED_UNMAPPED, D3 Stage 1 part deferred: documented route difference), never a 0'); }

// ================= §5.3 Unit_Cost_GBP: negative value, column absent; partial totals [indep]
{ const o = run(edit(fresh(), 'Inventory', r => { r.find(x => x.Item_ID === 'RM005').Unit_Cost_GBP = -3; })), x = byId(o).RM005;
  const indep = invSheet.filter(r => r.Item_ID !== 'RM005').reduce((s, r) => s + r.On_Hand_Qty * r.Unit_Cost_GBP, 0), ps = ctx.__x1Sum(items(o), 'val');
  ok(() => !isFinite(x.val) && !isFinite(x.exVal) && x.sev !== null && o.result.cov.valued === 149 && !isFinite(o.result.tot), '§5.3 negative cost RM005: value and excess value not a number (never a negative £), quantities still assessed, valued coverage 149 of 150, total not released as a number');
  ok(() => Math.abs(ps.v - indep) < 1e-6 && ps.n === 149 && ps.of === 150, '§5.3 [indep] the partial value total shown equals the independent sum over the other 149 items (£' + indep.toFixed(2) + ')');
  ok(() => o.integrity.fields.Unit_Cost_GBP.counts['negative-prohibited'] === 1 && others(o, ['RM005']).length === 0, '§5.3 integrity record: 1 negative-prohibited cost; every other item identical'); }
{ const o = run(dropCol('Inventory', 'Unit_Cost_GBP')(fresh()));
  ok(() => items(o).every(x => !isFinite(x.val) && x.sev !== null) && o.result.cov.valued === 0 && items(o).every(x => x.sev === B[x.id].sev), '§5.3 Unit_Cost_GBP column absent: every value withheld, every risk status still assessed and unchanged (it does not use cost)'); }

// ================= §5.4 Units_Sold column absent
{ const o = run(dropCol('Demand History', 'Units_Sold')(fresh()));
  ok(() => items(o).every(NA) && o.result.cov.demand === 0 && Object.values(o.forecasts).every(f => !f.ok) && o.integrity.report.some(l => /^Units_Sold: column not supplied/.test(l)), '§5.4 Units_Sold column absent: demand unknown for all 50 products and (derived) all 100 materials, Not Assessed, no forecast, integrity line names the column');
  ok(() => items(o).every(x => x.m === null) && consistent(o), '§5.4: no demand is read as 0 (m null for every item); engine and record agree'); }

// ================= §5.5 BOM quantity: column absent; zero via import (D1(b))
{ const o = run(dropCol('BOM', 'Qty_Per_Finished_Unit')(fresh()));
  ok(() => o.result.rm.every(NA) && o.result.fg.every(x => x.sev === B[x.id].sev) && o.feas.rows.every(r => r.status === 'Insufficient information'), '§5.5 BOM quantity column absent: every material Not Assessed (usage unknown), every product unchanged, every order "Insufficient information"'); }
{ const line = bomSheet.find(b => b.SKU === 'FG001'), i = setCsv('bom', 'FG001', bomQtyCol(), '0', bomParentCol());
  function bomQtyCol() { const f = ctx.CGTestTools.reverseEightSheet(rt(fresh())).files.find(f => /bom/i.test(f.name)); return f.text.split(/\r?\n/)[0].split(',').find(c => /Qty/i.test(c)); }
  function bomParentCol() { const f = ctx.CGTestTools.reverseEightSheet(rt(fresh())).files.find(f => /bom/i.test(f.name)); return f.text.split(/\r?\n/)[0].split(',')[0]; }
  const zeroMats = i.o ? i.o.result.rm.filter(x => x.sev === null).map(x => x.id) : [];
  ok(() => i.S1.importAccepted && zeroMats.length > 0 && zeroMats.every(id => /zero \(invalid\)/.test(byId(i.o)[id].naWhy)) && i.o.feas.rows.filter(r => r.o.sku === 'FG001').every(r => r.status === 'Insufficient information'), 'D1(b) import route: zero BOM quantities for FG001 are invalid lines: the materials they would feed are Not Assessed ("zero (invalid)"), FG001 orders "Insufficient information", never a phantom 0 requirement'); }

// ================= §5.6 On_Order_Qty: blank with sup 1; negative via import (D1(d))
{ const w = () => edit(fresh(), 'Inventory', r => { delete r.find(x => x.Item_ID === 'RM006').On_Order_Qty; }), o1 = run(w(), { sup: 1 }), o0 = run(w());
  ok(() => NA(byId(o1).RM006) && /On_Order_Qty blank/.test(byId(o1).RM006.naWhy) && others(o1, ['RM006']).filter(id => sig(byId(o1)[id]) !== sig(byId(run(fresh(), { sup: 1 }))[id])).length === 0, '§5.6 blank On_Order_Qty, supply = inventory on-order (sup 1): RM006 Not Assessed ("On_Order_Qty blank", never 0); every other item as on clean data with sup 1');
  ok(() => byId(o0).RM006.sev !== null && sig(byId(o0).RM006) === sig(B.RM006), '§5.6 same blank with the default PO-verified supply (sup 0): RM006 assessed and unchanged (On_Order_Qty is not its supply)'); }
{ const i = setCsv('stock', 'RM006', 'On_Order_Qty', '-3');
  ok(() => i.S1.importAccepted && i.S1.issues.some(q => q.code === 'ROW_QUARANTINED' && q.rows.some(r => r.item === 'RM006')) && NA(byId(i.o).RM006) && V.reasonsFor(i.o.integrity, 'RM006').some(t => /stock row quarantined/.test(t)), 'D1(d) import route, On_Order_Qty -3 (RM006): row quarantined, RM006 Not Assessed with the quarantine reason, never used as a number'); }

// ================= §5.7 Reorder_Point_Qty: issue 26 (column absent) and invalid value; negative via import
{ const o = run(dropCol('Inventory', 'Reorder_Point_Qty')(fresh())), D = o.integrity.dependencies;
  ok(() => items(o).every(x => x.verdict === 'No reorder point configured' && x.sev !== null) && D['risk-status'].withheld.length === 0 && D['reorder-comparison'].withheld.length === 150, 'issue 26 fixed: ROP column absent: engine "No reorder point configured" and assessed; the shared record withholds ONLY the reorder comparison (150), not risk status');
  ok(() => !o.integrity.report.some(l => /Risk status/.test(l)) && o.integrity.report.some(l => /^Reorder_Point_Qty: column not supplied.*Reorder point compared/.test(l)) && consistent(o), 'issue 26: the notice no longer claims risk status depends on the absent column; it names the comparison only; engine and record agree'); }
{ const o = run(edit(fresh(), 'Inventory', r => { r.find(x => x.Item_ID === 'RM004').Reorder_Point_Qty = 'abc'; })), x = byId(o).RM004;
  ok(() => NA(x) && /^Not Assessed – Reorder_Point_Qty invalid/.test(x.verdict) && others(o, ['RM004']).length === 0 && consistent(o), '§5.7 invalid ROP "abc" (RM004): Not Assessed, verdict names it; others unchanged; engine and record agree'); }
{ const i = setCsv('stock', 'RM004', 'Reorder_Point_Qty', '-10');
  ok(() => i.S1.importAccepted && i.S1.issues.some(q => q.code === 'ROW_QUARANTINED' && q.rows.some(r => r.item === 'RM004')) && NA(byId(i.o).RM004), 'D1(d) import route, Reorder_Point_Qty -10 (RM004): row quarantined, RM004 Not Assessed'); }

// ================= Q6 structural zero vs unknown, and the blank / unknown Material_ID decision
const lineMats = m => bomSheet.filter(b => b.Material_ID === m);
const target = 'RM050', unrelated = 'RM001';
const noUse = () => edit(fresh(), 'BOM', r => { r.splice(0, r.length, ...r.filter(b => b.Material_ID !== target)); });
{ const o = run(noUse()), x = byId(o)[target];
  ok(() => lineMats(target).length > 0 && x.m === 0 && x.sev !== null && o.result.dq.some(q => /^Materials not used in any BOM/.test(q.msg) && q.ex.includes(target)) && sig(byId(o)[unrelated]) === sig(B[unrelated]), 'Q6 complete valid BOM, no line consumes ' + target + ': structural 0 demand, assessed, "Materials not used in any BOM" names it; ' + unrelated + ' unchanged'); }
for (const [lab, v] of [['blank', undefined], ['whitespace-only', '   '], ['unknown code "RM999"', 'RM999'], ['code with a trailing space "RM050 " (never trimmed or guessed)', 'RM050 ']]) {
  const o = run(edit(noUse(), 'BOM', r => { const l = Object.assign({}, r.find(b => b.SKU === 'FG001')); if (v === undefined) delete l.Material_ID; else l.Material_ID = v; r.push(l); })), x = byId(o)[target];
  ok(() => x.m === null && NA(x) && /structural zero cannot be established/.test(x.naWhy) && V.reasonsFor(o.integrity, target).some(t => /^Qty_Per_Finished_Unit usage unknown, not zero .* – BOM line\(s\) with a blank or unknown Material_ID/.test(t)), 'Material_ID ' + lab + ' on one BOM line, ' + target + ' otherwise unused: Not Assessed (structural zero cannot be established), reason on screen');
  ok(() => o.result.dq.some(q => q.sev === 'High' && /^BOM lines with a blank or unknown Material_ID/.test(q.msg)) && o.feas.rows.filter(r => r.o.sku === 'FG001').every(r => r.status === 'Insufficient information' && /Material_ID|not a known material/.test(r.why)), 'Material_ID ' + lab + ': High warning names the row; FG001 orders "Insufficient information" with the reason');
  // [superseded 21 Nov 2026, owner "X1 Final Material Integrity Correction" (CR-28): a line naming no known material could be ANY material, so a material
  //  with valid lines no longer keeps its usage as complete. The assertion below replaces the original, which is kept as a comment.]
  // [original] ok(() => o.result.rm.filter(m => m.id !== target).every(m => sig(m) === sig(byId(run(noUse()))[m.id])) && o.result.fg.every(f => sig(f) === sig(B[f.id])) && consistent(o), 'Material_ID ' + lab + ': every material with a valid BOM line and every product unchanged (no unnecessary withholding); engine and record agree'); }
  ok(() => o.result.rm.filter(m => m.id !== target).every(m => m.sev === null && m.m === null && m.bomInc && typeof m.mPart === 'number' && /^usage incomplete/.test(m.useNA[0])) && o.result.fg.every(f => sig(f) === sig(B[f.id])) && consistent(o), 'Material_ID ' + lab + ': every material with a valid BOM line is Not Assessed (usage incomplete; known part kept apart and labelled); every product unchanged; engine and record agree'); }
{ const o = run(edit(fresh(), 'BOM', r => { const l = Object.assign({}, r.find(b => b.SKU === 'FG001')); delete l.Material_ID; r.push(l); }));
  // [superseded 21 Nov 2026, CR-28: see above]
  // [original] ok(() => items(o).every(x => sig(x) === sig(B[x.id])) && o.result.dq.some(q => /^BOM lines with a blank or unknown Material_ID/.test(q.msg)), 'mixture: one blank Material_ID line beside the complete valid BOM: every material (all have valid lines) and product unchanged; the line is reported, not silently dropped');
  ok(() => o.result.fg.every(x => sig(x) === sig(B[x.id])) && o.result.rm.every(x => x.sev === null && x.m === null && Math.abs(x.mPart - B[x.id].m) < 1e-9) && o.result.dq.some(q => /^BOM lines with a blank or unknown Material_ID/.test(q.msg)), 'mixture: one blank Material_ID line beside the complete valid BOM: every product unchanged; every material Not Assessed with its known part equal to its clean usage; the line is reported, not silently dropped');
  ok(() => { const v = run(edit(fresh(), 'BOM', r => { r.find(b => b.SKU === 'FG001').Material_ID = 'RM001'; })); return v.result.dq.every(q => !/^BOM lines with a blank or unknown/.test(q.msg)); }, 'a valid material code raises no unidentifiable-line warning'); }
for (const [lab, fn, want] of [['missing parent (every line of ' + target + ' has a blank SKU)', w => edit(w, 'BOM', r => r.filter(b => b.Material_ID === target).forEach(b => { delete b.SKU; })), 'unknown'],
  ['quantity column absent', dropCol('BOM', 'Qty_Per_Finished_Unit'), 'unknown'], ['invalid quantity "x" on every line of ' + target, w => edit(w, 'BOM', r => r.filter(b => b.Material_ID === target).forEach(b => { b.Qty_Per_Finished_Unit = 'x'; })), 'unknown'],
  ['zero quantity on every line of ' + target, w => edit(w, 'BOM', r => r.filter(b => b.Material_ID === target).forEach(b => { b.Qty_Per_Finished_Unit = 0; })), 'unknown']]) {
  const o = run(fn(fresh())); ok(() => byId(o)[target].m === null && NA(byId(o)[target]), 'Q6 ' + lab + ': derived demand unknown, Not Assessed (never an unjustified 0)'); }
ok(() => { const w = fresh(); delete w.Sheets.BOM; w.SheetNames = w.SheetNames.filter(n => n !== 'BOM'); try { run(w); return false; } catch (e) { return /Missing sheet\(s\): BOM/.test(e.message); } }, 'Q6 BOM sheet missing: the analysis is refused ("Missing sheet(s): BOM"), never a structural 0');
ok(() => { try { run(edit(fresh(), 'BOM', r => { r.find(b => b.Material_ID === target).Scrap_Factor_Pct = 'abc'; })); return false; } catch (e) { return /Invalid scrap in the BOM sheet/.test(e.message); } }, 'Q6 invalid scrap: the analysis is refused, never a silent 0');
{ const i = impCsv(csvEdit('bom', (L, h) => L.concat([L[1].split(',').map((c, k) => /Component|Material/i.test(h[k]) ? '' : c).join(',')])));
  const j = impCsv(csvEdit('bom', (L, h) => L.concat([L[1].split(',').map((c, k) => /Component|Material/i.test(h[k]) ? 'RM999' : c).join(',')])));
  ok(() => !i.S1.importAccepted && !j.S1.importAccepted && [i, j].every(r => r.S1.issues.some(q => q.code === 'ROW_REJECTED' && q.table === 'bom')), 'import route, BOM line with a blank or unknown component: Stage 1 rejects the line and refuses the import (bom must be complete; Q5 rules unchanged): never a false structural 0'); }

// ================= downstream: "Exposed £/mo" on the Materials screen (defect found in the completion review, CR-25)
{ const prod = rows(fresh(), 'Products'), price = Object.fromEntries(prod.map(r => [r.SKU, r.Selling_Price_GBP]));
  const fgMean = sku => { const f = demSheet.filter(d => d.SKU === sku).sort((a, b) => a.Month_Start - b.Month_Start).map(d => d.Units_Sold), n = ctx.__CFG.basis; return f.slice(-n).reduce((a, b) => a + b, 0) / Math.min(n, f.length); };
  const mat = 'RM001', e = bomSheet.filter(b => b.Material_ID === mat).reduce((a, b) => a + fgMean(b.SKU) * price[b.SKU], 0);
  ok(() => Math.abs(B[mat].exposed - e) < 1e-6 * Math.max(1, e), '[indep] ' + mat + ' exposed £/mo ' + e.toFixed(2) + ' = sum over its parents of (hand-calculated average demand x selling price)');
  const parent = bomSheet.find(b => b.Material_ID === mat).SKU, o = run(edit(fresh(), 'Demand History', r => { r.splice(0, r.length, ...r.filter(d => d.SKU !== parent)); }));
  const usesP = new Set(bomSheet.filter(b => b.SKU === parent).map(b => b.Material_ID)), rmO = o.result.rm;
  ok(() => rmO.filter(x => usesP.has(x.id)).every(x => !isFinite(x.exposed)) && rmO.filter(x => !usesP.has(x.id)).every(x => Math.abs(x.exposed - B[x.id].exposed) < 1e-9), 'parent ' + parent + ' with no demand rows: exposed £ of every material it uses is unknown (shown "–", never a smaller number); every other material unchanged');
  const blankRun = run(edit(noUse(), 'BOM', r => { const l = Object.assign({}, r.find(b => b.SKU === 'FG001')); delete l.Material_ID; r.push(l); }));
  ok(() => [o, blankRun].every(q => items(q).every(x => V.reasonsFor(q.integrity, x.id).every(t => !/\bnull\b|undefined|NaN/.test(t)))) && V.reasonsFor(blankRun.integrity, target).length > 0, 'on-screen reasons never print "null", "undefined" or "NaN" (defect found in the completion browser check, CR-25)'); }

// ================= text-number policy: existing behaviour preserved and flagged (not converted by X1)
{ const o = run(edit(fresh(), 'Inventory', r => { r.find(x => x.Item_ID === 'FG005').Allocated_Qty = '3'; })), x = byId(o).FG005;
  const al0 = invSheet.find(r => r.Item_ID === 'FG005').Allocated_Qty;
  ok(() => Math.abs(x.av - (B.FG005.av + al0 - 3)) < 1e-9 && x.sev !== null, 'text-number: an allocation stored as text "3" keeps the engine\'s existing numeric reading (policy pending; X1 does not change it)');
  ok(() => o.integrity.fields.Allocated_Qty.counts.invalid === 1, 'text-number: the shared record still flags it "invalid", so the user is warned (documented divergence, issue register)'); }

console.log(`\nx1-completion: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
