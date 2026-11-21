#!/usr/bin/env node
/* X1 material-integrity correction (21 Nov 2026; owner "X1 Final Material Integrity Correction"). A BOM line whose Material_ID is blank,
 * whitespace-only or names no known material could be ANY material. Unless its parent has recorded zero sales in every month (then it provably
 * adds 0), no material's BOM-derived usage is complete: complete materials are Not Assessed with the known part kept apart and labelled, materials
 * with no valid line stay unknown (never a structural 0), and nothing downstream (risk, reorder, safety stock, MRP, excess, ABC/XYZ, exposed £,
 * feasibility) consumes the partial figure. Expected values are computed INDEPENDENTLY from the raw sheets ([indep]); no production formula is called.
 * Run from tests/: NODE_PATH=<pinned node_modules> node test-x1-material-integrity.js
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
// ---------- independent model of BOM-derived usage, from the raw sheets only (no production function) ----------
const SC = v => v === undefined || v === null || v === '' ? 0 : (+v > 1 ? +v / 100 : +v);
const isBlankId = k => k === undefined || k === null || (typeof k === 'string' && k.trim() === '');
const usable = v => v !== undefined && v !== null && !(typeof v === 'string' && v.trim() === '') && isFinite(+v) && +v >= 0;
function indep(w) {
  const bom = rows(w, 'BOM'), dem = rows(w, 'Demand History'), mats = new Set(rows(w, 'Materials').map(r => r.Material_ID)), prods = new Set(rows(w, 'Inventory').map(r => r.Item_ID));
  const months = [...new Set(dem.map(d => +d.Month_Start))].sort((a, b) => a - b), n = ctx.__CFG.basis;
  const sold = sku => months.map(t => { const z = dem.filter(d => d.SKU === sku && +d.Month_Start === t && usable(d.Units_Sold)); return z.length ? z.reduce((a, d) => a + +d.Units_Sold, 0) : null; });
  const bad = bom.filter(b => isBlankId(b.Material_ID) || !mats.has(b.Material_ID));
  const zeroParent = sku => prods.has(sku) && dem.some(d => d.SKU === sku) && sold(sku).every(v => v === 0);
  const adds = bad.filter(b => !zeroParent(b.SKU)), usage = {}, partOf = {};
  for (const m of mats) { const L = bom.filter(b => b.Material_ID === m);
    if (!L.length) { usage[m] = bad.length ? 'unknown' : 0; continue; }
    const mon = months.map((t, i) => L.reduce((a, b) => { const s = sold(b.SKU)[i]; return a === null || s === null ? null : a + s * b.Qty_Per_Finished_Unit * (1 + SC(b.Scrap_Factor_Pct)); }, 0));
    const known = mon.filter(v => v !== null), mean = known.length ? known.slice(-n).reduce((a, b) => a + b, 0) / Math.min(n, known.length) : null;
    if (adds.length) { usage[m] = 'incomplete'; partOf[m] = mean; } else usage[m] = mean; }
  return { usage, partOf, bad, adds };
}
const close = (a, b) => typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(b));
const addLine = (sku, mid) => w => edit(w, 'BOM', r => { const l = Object.assign({}, r.find(b => b.SKU === sku)); if (mid === undefined) delete l.Material_ID; else l.Material_ID = mid; r.push(l); });
const BAD_TXT = /\b(null|undefined|NaN)\b/;
const texts = o => [...items(o).flatMap(x => [...(x.naD || []), ...(x.useNA || []), x.naWhy || '', ...V.reasonsFor(o.integrity, x.id)]), ...o.result.dq.map(q => q.msg + ' ' + String(q.ex || '')), ...o.feas.rows.map(r => r.why || '')];
const RM = 'RM001', parents = bomSheet.filter(b => b.Material_ID === RM).map(b => b.SKU), noFeed = bomSheet.find(b => !parents.includes(b.SKU)).SKU;
// export, as the browser builds it (app.js exportWorkbook with the shared record), captured instead of written
function exportRows(w) { const wb = rt(w); ctx.__wb = wb; vm.runInContext('if(typeof document==="undefined")globalThis.document={querySelector:()=>({textContent:"",innerHTML:"",value:"",style:{}})};WB=__wb;R=analyse();INTEG=CGValidation.forEngineResult({workbook:WB,XLSX,result:R,sup:CFG.sup,pol:CFG.pol});globalThis.__cap=null;{const o=XLSX.writeFile;XLSX.writeFile=w=>{globalThis.__cap=w};try{exportWorkbook()}finally{XLSX.writeFile=o}}', ctx);
  const cap = ctx.__cap, out = {}; for (const n of cap.SheetNames) out[n] = X.utils.sheet_to_json(cap.Sheets[n], { defval: '' }); return out; }

// 1. clean BOM: complete usage, assessed, equal to the independent calculation for all 100 materials
{ const e = indep(fresh()), bad = base.result.rm.filter(x => !close(x.m, e.usage[x.id]));
  ok(() => e.bad.length === 0 && bad.length === 0 && base.result.rm.every(x => x.sev !== null && x.mPart == null && !x.bomInc), '1 clean BOM: all 100 materials assessed, usage = independent calculation, no partial figure (' + (bad.slice(0, 3).map(x => x.id).join(',') || 'no mismatch') + ')');
  const st = {}; base.feas.rows.forEach(r => { st[r.status] = (st[r.status] || 0) + 1; });
  ok(() => JSON.stringify(st) === JSON.stringify({ 'Feasible': 16, 'Material shortage': 33, 'At risk': 1 }) && base.result.dq.every(q => !/blank or unknown Material_ID|no valid BOM line/.test(q.msg)), '1 clean BOM: feasibility as accepted (16 feasible, 33 shortage, 1 at risk); no BOM-identification warning'); }

// 2-5. blank / whitespace / unknown code beside the complete BOM
const blank = run(addLine('FG002', undefined)(fresh())), Bk = byId(blank), eB = indep(addLine('FG002', undefined)(fresh()));
{ const dq = blank.result.dq.find(q => /^BOM lines with a blank or unknown Material_ID/.test(q.msg));
  ok(() => dq && dq.sev === 'High' && /^row \d+ \(FG002 \/ blank\)$/.test(dq.ex), '2 blank Material_ID: High warning names the sheet row and the parent product FG002 (' + (dq ? dq.ex : 'none') + ')');
  ok(() => blank.result.rm.every(x => x.m === null && x.bomInc && NA(x)) && blank.result.rm.every(x => close(x.mPart, eB.partOf[x.id])), '5 every material (each has valid lines) is Not Assessed; its known part equals the independent valid-lines-only calculation');
  ok(() => close(Bk[RM].mPart, eB.partOf[RM]) && /^usage incomplete: known part at least [\d,.]+\/mo from valid BOM lines; BOM line\(s\) naming no known material could add to it: row \d+ \(parent FG002\)$/.test(Bk[RM].useNA[0]), '5 ' + RM + ': known part ' + eB.partOf[RM].toFixed(1) + '/mo kept, labelled "at least … incomplete", with the row and parent');
  ok(() => V.reasonsFor(blank.integrity, RM).some(t => /^Qty_Per_Finished_Unit usage incomplete \(valid BOM lines give a known part only; the full usage cannot be established\) – BOM line\(s\) naming no known material could add to it: row \d+ \(parent FG002\)$/.test(t)), '5 the shared record gives the same reason ("usage incomplete", row, parent): engine and record agree');
  ok(() => blank.result.fg.every(x => sig(x) === sig(B[x.id])), '8 every product unchanged (product demand does not depend on the BOM)');
  ok(() => consistent(blank), 'engine and shared record agree on every item'); }
{ const ws = run(addLine('FG002', '   ')(fresh())), un = run(addLine('FG002', 'RM999')(fresh()));
  ok(() => items(ws).every(x => sig(x) === sig(Bk[x.id]) && x.mPart === Bk[x.id].mPart), '3 whitespace-only Material_ID: treated exactly as missing (every item identical to the blank case)');
  ok(() => items(un).every(x => sig(x) === sig(Bk[x.id]) && x.mPart === Bk[x.id].mPart) && !items(un).some(x => x.id === 'RM999') && un.result.dq.some(q => /^BOM lines with a blank or unknown/.test(q.msg) && /"RM999"/.test(q.ex)), '4 unknown code "RM999": no mapping is guessed (results identical to the blank case; RM999 appears only in the warning)'); }

// 6. material with no valid line + an unidentifiable line: unknown, never 0, no partial figure
{ const w = () => edit(fresh(), 'BOM', r => { r.splice(0, r.length, ...r.filter(b => b.Material_ID !== 'RM050')); }), o = run(addLine('FG002', undefined)(w())), x = byId(o).RM050;
  ok(() => x.m === null && x.mPart === null && NA(x) && x.annual === null && /structural zero cannot be established/.test(x.useNA[0]) && V.reasonsFor(o.integrity, 'RM050').some(t => /usage unknown, not zero/.test(t)), '6 RM050 (no valid line) with an unidentifiable line: usage unknown, not 0, no partial figure; reason on both channels');
  ok(() => o.result.dq.some(q => /^Materials on no valid BOM line \(not shown as unused/.test(q.msg) && q.ex.includes('RM050')) && !o.result.dq.some(q => /^Materials not used in any BOM/.test(q.msg)), '6 the warning no longer calls RM050 "not used in any BOM" while BOM lines are unidentifiable'); }

// 7. several unidentified lines across different parents
{ const o = run(addLine('FG010', 'RM999')(addLine('FG002', undefined)(fresh()))), dq = o.result.dq.find(q => /^BOM lines with a blank or unknown/.test(q.msg));
  ok(() => /FG002 \/ blank/.test(dq.ex) && /FG010 \/ "RM999"/.test(dq.ex) && /parent FG002.*parent FG010/.test(byId(o)[RM].useNA[0]) && o.result.rm.every(x => NA(x)), '7 two unidentifiable lines (FG002 blank, FG010 "RM999"): both rows and parents named; every material incomplete');
  ok(() => V.reasonsFor(o.integrity, RM).some(t => /parent FG002\).*parent FG010\)/.test(t)) && o.feas.rows.filter(r => ['FG002', 'FG010'].includes(r.o.sku)).every(r => r.status === 'Insufficient information'), '7 the record names both parents; both parents\' orders are "Insufficient information"'); }

// 8. no possible exposure: the bad line's parent has recorded zero sales in every month, so it provably adds 0
{ const z = 'FG050', zw = () => edit(fresh(), 'Demand History', r => r.forEach(d => { if (d.SKU === z) d.Units_Sold = 0; })), ref = run(zw()), o = run(addLine(z, undefined)(zw())), e = indep(addLine(z, undefined)(zw()));
  ok(() => e.adds.length === 0 && items(o).every(x => sig(x) === sig(byId(ref)[x.id])) && o.result.rm.every(x => x.sev !== null && close(x.m, e.usage[x.id]) && x.mPart == null), '8 bad line under ' + z + ' (recorded zero sales every month): every material stays assessed, usage = independent calculation, identical to the same data without the line');
  ok(() => o.result.dq.some(q => q.sev === 'High' && /^BOM lines with a blank or unknown/.test(q.msg)) && JSON.stringify(o.feas.rows.map(r => r.status)) === JSON.stringify(ref.feas.rows.map(r => r.status)) && consistent(o), '8 the line is still reported (High); feasibility identical; engine and record agree');
  const o2 = run(addLine(z, undefined)(edit(zw(), 'BOM', r => { r.splice(0, r.length, ...r.filter(b => b.Material_ID !== 'RM050')); })));
  ok(() => byId(o2).RM050.m === null && NA(byId(o2).RM050), '8 even then, a material with no valid BOM line stays unknown (a structural 0 needs a demonstrably complete BOM)'); }

// 9-12. structural zero and existing BOM handling preserved
{ const o = run(edit(fresh(), 'BOM', r => { r.splice(0, r.length, ...r.filter(b => b.Material_ID !== 'RM050')); }));
  ok(() => byId(o).RM050.m === 0 && byId(o).RM050.sev !== null && !byId(o).RM050.bomInc && o.result.dq.some(q => /^Materials not used in any BOM/.test(q.msg)), '9 complete valid BOM, RM050 on no line: structural 0, assessed, "Materials not used in any BOM"'); }
ok(() => { const w = fresh(); delete w.Sheets.BOM; w.SheetNames = w.SheetNames.filter(n => n !== 'BOM'); try { run(w); return false; } catch (e) { return /Missing sheet\(s\): BOM/.test(e.message); } }, '10 BOM sheet missing: analysis refused, no structural 0');
{ const o = run(dropCol('BOM', 'Qty_Per_Finished_Unit')(fresh()));
  ok(() => o.result.rm.every(x => x.m === null && NA(x)) && !o.result.rm.some(x => x.m === 0 || x.annual === 0), '11 BOM quantity column absent: every material unknown, none at 0'); }
for (const [lab, v, re] of [['zero', 0, /zero \(invalid\)/], ['negative', -1, /invalid/], ['invalid "x"', 'x', /invalid/]]) {
  const o = run(edit(fresh(), 'BOM', r => r.filter(b => b.Material_ID === 'RM020').forEach(b => { b.Qty_Per_Finished_Unit = v; })));
  ok(() => NA(byId(o).RM020) && re.test(byId(o).RM020.naWhy) && byId(o).RM020.mPart == null && !byId(o).RM020.bomInc && others(o, ['RM020']).length === 0, '12 ' + lab + ' BOM quantity on every RM020 line: existing handling (Not Assessed, reason), no partial figure, every other item unchanged'); }

// 13. import route: an unidentifiable component never yields a complete figure (Stage 1 refuses: approved route difference, Q5 unchanged)
{ const i = impCsv(csvEdit('bom', (L, h) => L.concat([L[1].split(',').map((c, k) => /Component|Material/i.test(h[k]) ? '' : c).join(',')])));
  const j = impCsv(csvEdit('bom', (L, h) => L.concat([L[1].split(',').map((c, k) => /Component|Material/i.test(h[k]) ? 'RM999' : c).join(',')])));
  ok(() => [i, j].every(r => !r.S1.importAccepted && r.o === null && r.S1.issues.some(q => q.code === 'ROW_REJECTED' && q.table === 'bom')), '13 import route, blank or unknown component: the line is rejected and the import refused, so no usage figure is produced at all');
  const c = imp(fresh());
  ok(() => c.S1.importAccepted && c.o.result.rm.every(x => sig(x) === sig(B[x.id]) && x.mPart == null), '13 import route, clean: every material identical to the direct route and complete'); }

// 14. downstream: nothing consumes the partial figure
{ const x = Bk[RM], mrp = blank.mrp ? blank.mrp.find(r => r.x.id === RM) : null;
  ok(() => [x.d, x.cover, x.ssR, x.ropR, x.exQty, x.ann, x.exposed].every(v => v === null || v === undefined || (typeof v === 'number' && !isFinite(v))) && x.xyz === '–' && x.cls === 'Not Assessed', '14 ' + RM + ': daily usage, cover, recommended safety stock and reorder point, excess, shortage, annual value and exposed £ are all withheld (none is a number); XYZ "–"; dead-stock class Not Assessed');
  const inv = invSheet.find(r => r.Item_ID === RM), avI = inv.On_Hand_Qty - inv.Allocated_Qty;
  ok(() => [x.fEx, x.fLT].every(v => v === null || v === undefined) && x.sev === null && x.abc === 'Not Assessed', '14 ' + RM + ': no excess or lead-time flag from the partial figure; no ABC class');
  ok(() => x.fROP === (avI + x.oo < inv.Reorder_Point_Qty) && x.fSS === (avI < inv.Safety_Stock_Qty) && close(x.short, (inv.Safety_Stock_Qty - avI) * inv.Unit_Cost_GBP), '14 [indep] workbook policy: the reorder-point and safety-stock checks and the shortage £ compare stock with the limits CONFIGURED in the sheet (no usage involved), so they stay: shortage £' + ((inv.Safety_Stock_Qty - avI) * inv.Unit_Cost_GBP).toFixed(2));
  const pol = run(addLine('FG002', undefined)(fresh()), { pol: 1 }), xp = byId(pol)[RM];
  ok(() => xp.fROP === null && xp.fSS === null && !isFinite(xp.short) && !isFinite(xp.ropU) && pol.result.rm.every(m => m.sev === null), '14 recommended policy (limits calculated from usage): the reorder and safety-stock checks and shortage £ are withheld for every material, never computed from the partial figure');
  ok(() => !mrp || (mrp.st === 'Not Assessed' && mrp.gross === null && mrp.net === null), '14 MRP: ' + RM + ' row Not Assessed, no gross or net requirement (' + (mrp ? mrp.st : 'MRP rows not on runEngine output') + ')');
  const rows0 = blank.feas.rows, first = rows0.findIndex(r => r.status === 'Insufficient information');
  ok(() => first >= 0 && rows0.slice(first + 1).every(r => r.status === 'Insufficient information' || r.status === 'Material shortage'), '14 feasibility: after the first order with unknown material use, no later order is shown Feasible or At risk (each is shortage or Insufficient information)');
  ok(() => rows0.slice(first + 1).filter(r => r.status === 'Insufficient information' && r.o.sku !== 'FG002').every(r => /cannot be established: an earlier order's material use is unknown/.test(r.why)) && rows0.slice(0, first).every((r, k) => r.status === base.feas.rows[k].status), '14 feasibility: the reason names the earlier unknown use; orders before it are unchanged');
  ok(() => { const s = ctx.__x1Sum(blank.result.rm, 'ann'); return s.n === 0 && s.of === 100 && blank.result.cov.demand === 50; }, '14 totals: annual material value has 0 of 100 known (shown partial, never a total); demand coverage counts only the 50 products');
  ok(() => blank.result.rm.every(x => x.m !== 0 && x.annual !== 0 && x.exposed !== 0), '14 no affected material shows a misleading 0 usage, annual usage or exposed £'); }

// 15. export: status and explanation preserved, the known part labelled
{ const ex = exportRows(addLine('FG002', undefined)(fresh())), all = Object.values(ex).flat(), r = all.find(q => Object.values(q).includes(RM) && 'AssessmentReason' in q);
  ok(() => r && r.Assessment === 'Not Assessed' && /usage incomplete/.test(r.AssessmentReason) && new RegExp('known part of usage: at least ' + eB.partOf[RM].toLocaleString('en-GB', { maximumFractionDigits: 1, minimumFractionDigits: 1 }).replace(/[.]/g, '\\.') + '/mo, incomplete').test(r.AssessmentReason), '15 export: ' + RM + ' row says Not Assessed, "usage incomplete", and the known part labelled "at least …/mo, incomplete" (' + (r ? String(r.AssessmentReason).slice(0, 90) : 'row not found') + ')');
  ok(() => all.every(q => Object.values(q).every(v => typeof v !== 'string' || !BAD_TXT.test(v))), '15/16 export: no cell reads "null", "undefined" or "NaN"'); }

// 16. no unexplained blanks, null, undefined, NaN or misleading zero in any reason, warning or feasibility text
{ const runs = [blank, run(addLine('FG010', 'RM999')(addLine('FG002', undefined)(fresh())))];
  ok(() => runs.every(o => texts(o).every(t => !BAD_TXT.test(t))), '16 no reason, warning or feasibility text contains "null", "undefined" or "NaN"');
  ok(() => runs.every(o => items(o).filter(x => x.sev === null).every(x => V.reasonsFor(o.integrity, x.id).length > 0)), '16 every Not Assessed item has a reason (no unexplained blank)'); }

// 17. import route: an item Stage 1 identified and then excluded (unit mismatch) is a KNOWN code, not "could be any material"
{ const G = ctx.CGImport, E = ctx.__E, P01 = path.join(__dirname, 'fixtures', 'library', '01-Clean-Manufacturer');
  const csv = t => { const L = t.replace(/\r/g, '').trim().split('\n'), h = L[0].split(','); return { h, rows: L.slice(1).map(l => { const c = l.split(','); return Object.fromEntries(h.map((k, i) => [k, c[i] === undefined ? '' : c[i]])); }) }; };
  const out = (h, rs) => [h.join(','), ...rs.map(r => h.map(k => (r[k] === undefined ? '' : r[k])).join(','))].join('\n') + '\n';
  const pkg = () => { const T = {}; for (const n of fs.readdirSync(P01).filter(n => n.endsWith('.csv'))) T[n.slice(0, -4)] = csv(fs.readFileSync(path.join(P01, n), 'utf8')); T.dataset.h.push('Demand_Basis'); T.dataset.rows[0].Demand_Basis = 'shipments'; return T; };
  const mapFor = T => { const m = { format: 'CG-IMPORT-MAPPING', version: 1, name: 'mi', files: {}, tables: {} }; for (const [t, v] of Object.entries(T)) { const f = t + '.csv'; m.files[f] = Object.assign({ dateFormat: 'ISO' }, G.mapping.moneyFields(t).some(c => v.h.includes(c)) ? { currency: { code: 'GBP', confirmed: true } } : {});
    const cols = {}; for (const h of v.h) { if (G.canonical.field(t, h)) cols[h] = { source: h }; else if (h === 'UOM') cols['@Unit'] = { source: 'UOM' }; } m.tables[t] = { sources: [{ file: f, columns: cols }] }; } return m; };
  const go = T => { const m = mapFor(T), S1 = G.validate.importFiles(m, Object.entries(T).map(([t, v]) => ({ name: t + '.csv', text: out(v.h, v.rows) }))), ad = G.adapter.build(S1, m); return { S1, ad, o: E.runEngine({ workbook: ad.workbook }) }; };
  const mis = () => { const T = pkg(); T.stock.h.push('UOM'); T.stock.rows.forEach(r => { r.UOM = r.Item_ID === 'P0001' ? 'box' : r.Item_ID === 'M0028' ? 'kg' : 'each'; }); return T; };
  const c0 = go(pkg()), c1 = go(mis()), wb = c1.ad.workbook, s2 = x => JSON.stringify([x.m, x.sev, x.cover, x.exQty].map(v => typeof v === 'number' && !isFinite(v) ? 'NF' : v));
  ok(() => Array.isArray(wb.CGExcludedItems) && wb.CGExcludedItems.slice().sort().join() === 'M0028,P0001' && !Object.keys(wb).includes('CGExcludedItems') && !wb.SheetNames.includes('CGExcludedItems'), '17 the adapter tells the engine the excluded codes (M0028, P0001) through a hidden workbook property: no sheet or visible field added');
  const r0 = byId(c0.o), dep = new Set(['M0028', 'M0058', 'M0064']);
  ok(() => c1.o.result.rm.every(x => !x.bomInc && x.mPart == null) && !c1.o.result.dq.some(q => /^BOM lines with a blank or unknown Material_ID/.test(q.msg)) && c1.o.result.rm.filter(x => !dep.has(x.id)).every(x => s2(x) === s2(r0[x.id])), '17 with M0028 excluded: no material is marked incomplete, no unidentifiable-line warning, and every material not tied to P0001/M0028 keeps its usage, status, cover and excess exactly');
  ok(() => c1.o.feas.rows.filter(r => r.o.sku === 'P0018').every(r => r.status === 'Insufficient information' && /M0028 \(excluded from the analysis\)/.test(r.why)) && !c1.o.feas.rows.some(r => /is not a known material/.test(r.why || '')), '17 P0018 orders: "Insufficient information", reason says M0028 is excluded from the analysis (not "unknown material")');
  const plain = { SheetNames: wb.SheetNames.slice(), Sheets: Object.assign({}, wb.Sheets) }, o3 = E.runEngine({ workbook: plain });
  ok(() => o3.result.rm.every(x => x.bomInc) && o3.result.dq.some(q => /^BOM lines with a blank or unknown Material_ID/.test(q.msg)), '17 control: the same sheets WITHOUT the adapter\'s list are read as unidentifiable codes (every material incomplete), so the list, not chance, makes the difference'); }

console.log(`\nx1-material-integrity: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
