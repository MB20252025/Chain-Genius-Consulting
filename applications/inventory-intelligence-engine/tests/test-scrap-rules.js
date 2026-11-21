#!/usr/bin/env node
/* Stage 3 scrap rules (owner decision, 15 Nov 2026), on BOTH routes:
 *   - negative scrap is rejected; scrap above 100% is rejected;
 *   - numeric text is accepted only when unambiguous: a plain decimal 0-1 ("0.05") or a percentage 0%-100% ("5%" = 0.05);
 *   - every text-to-number conversion is disclosed with its row;
 *   - invalid scrap fails the import (direct upload: the analysis is not run; Universal Import: importAccepted is false, with a
 *     Must-fix ROW_REJECTED issue) and names the affected row; nothing is silently skipped;
 *   - a blank scrap cell is a missing value (DR-4), assumed 0% and disclosed (E-1), not rejected.
 * The same case list runs through the direct-upload engine (Northstar BOM row 2, in memory) and through Universal Import Stage 1
 * (library Package 01 bom.csv row 2, in memory). The test asserts that both routes give the same verdict and the same value.
 * Expected values are written here from the policy, never read from the code under test.
 * Not covered here (outside the scrap rules): numeric text in any other field stays as it was.
 * Run from tests/:  NODE_PATH=<pinned test node_modules> node test-scrap-rules.js
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
for (const f of ['canonical', 'read', 'clean', 'mapping', 'validate']) vm.runInContext(read('js/import/' + f + '.js'), ctx, { filename: f + '.js' });
vm.runInContext(['calculations', 'forecasting', 'app', 'excel-import', 'engine/engine-api'].map(n => read('js/' + n + '.js')).join('\n') + ';globalThis.__E=CGEngine;', ctx, { filename: 'engine' });
const X = ctx.XLSX, E = ctx.__E, G = ctx.CGImport;
const NS = fs.readFileSync(path.join(__dirname, 'fixtures', 'northstar', 'Chain_Genius_Project_001_Northstar_Dataset_1.xlsx'));
const P01 = path.join(__dirname, 'fixtures', 'library', '01-Clean-Manufacturer');

// ---------- the case list: value written in the scrap cell of row 2, the policy verdict, and the accepted fraction
//   cell: { n: number } is a numeric cell (direct route; written as the plain number on the import route), { s: text } a text cell.
const CASES = [
  { name: 'numeric 0.05', cell: { n: 0.05 }, ok: true, v: 0.05 },
  { name: 'numeric 0 (boundary)', cell: { n: 0 }, ok: true, v: 0 },
  { name: 'numeric 1 = 100% (boundary)', cell: { n: 1 }, ok: true, v: 1 },
  { name: 'text "0.05"', cell: { s: '0.05' }, ok: true, v: 0.05, conv: true },
  { name: 'text " .5 " (spaces trimmed)', cell: { s: ' .5 ' }, ok: true, v: 0.5, conv: true },
  { name: 'text "5%"', cell: { s: '5%' }, ok: true, v: 0.05, conv: true, pct: true },
  { name: 'text "2.5 %"', cell: { s: '2.5 %' }, ok: true, v: 0.025, conv: true, pct: true },
  { name: 'text "100%" (boundary)', cell: { s: '100%' }, ok: true, v: 1, conv: true, pct: true },
  { name: 'numeric -0.05 (negative)', cell: { n: -0.05 }, ok: false, why: /negative scrap is not allowed/ },
  { name: 'text "-5%" (negative)', cell: { s: '-5%' }, ok: false, why: /negative scrap is not allowed/ },
  { name: 'numeric 1.5 (above 100%)', cell: { n: 1.5 }, ok: false, why: /above 100% or ambiguous/ },
  { name: 'text "150%" (above 100%)', cell: { s: '150%' }, ok: false, why: /above 100% is not allowed/ },
  { name: 'text "100.01%" (just above 100%)', cell: { s: '100.01%' }, ok: false, why: /above 100% is not allowed/ },
  { name: 'text "5" (plain number above 1: ambiguous)', cell: { s: '5' }, ok: false, why: /above 100% or ambiguous/ },
  { name: 'text "abc"', cell: { s: 'abc' }, ok: false, why: /not a plain decimal or a percentage/ },
  { name: 'text "0,05" (decimal comma)', cell: { s: '0,05' }, ok: false, why: /not a plain decimal or a percentage/ },
  { name: 'text "£0.05" (currency)', cell: { s: '£0.05' }, ok: false, why: /not a plain decimal or a percentage/ },
  { name: 'text "(0.05)" (brackets)', cell: { s: '(0.05)' }, ok: false, why: /not a plain decimal or a percentage/ },
  { name: 'text "1e-2" (exponent)', cell: { s: '1e-2' }, ok: false, why: /not a plain decimal or a percentage/ },
  { name: 'text "5 percent"', cell: { s: '5 percent' }, ok: false, why: /not a plain decimal or a percentage/ } ];

// ---------- direct-upload route (Northstar BOM sheet; column Scrap_Factor_Pct; row 2 = FG001 / RM001; row 3 = FG001 / RM028)
const nsBom = X.utils.sheet_to_json(X.read(NS, { cellDates: true }).Sheets.BOM, { raw: true });
const cellOf = c => c.s !== undefined ? { t: 's', v: c.s } : { t: 'n', v: c.n };
const direct = (edits) => { const w = X.read(NS, { cellDates: true }), ws = w.Sheets.BOM, r = X.utils.decode_range(ws['!ref']);
  let col = -1; for (let c = r.s.c; c <= r.e.c; c++) if ((ws[X.utils.encode_cell({ r: 0, c })] || {}).v === 'Scrap_Factor_Pct') col = c;
  for (const [row, cell] of edits) { const a = X.utils.encode_cell({ r: row - 1, c: col }); if (cell === null) delete ws[a]; else ws[a] = cellOf(cell); }
  const wb = X.read(X.write(w, { type: 'array', bookType: 'xlsx', cellDates: true }), { cellDates: true });
  try { return { out: E.runEngine({ workbook: wb }) }; } catch (e) { return { error: e.message }; } };
const row2 = 'row 2 (' + nsBom[0].SKU + ' / ' + nsBom[0].Material_ID + ')', row3 = 'row 3 (' + nsBom[1].SKU + ' / ' + nsBom[1].Material_ID + ')';
const conv = o => o.result.dq.find(q => /^Scrap stored as text was converted to a number/.test(q.msg));
const base = direct([[2, { n: 0.05 }]]);
const sansConv = o => JSON.stringify({ r: Object.assign({}, o.result, { dq: o.result.dq.filter(q => !/^Scrap stored as text/.test(q.msg)), alt: null, altS: null }), m: o.mrp, f: o.feas });

// ---------- Universal Import route (Package 01 bom.csv, column Scrap_Pct; row 2 = P0001 / M0028)
const csv = t => { const L = t.replace(/\r/g, '').trim().split('\n'), h = L[0].split(','); return { h, rows: L.slice(1).map(l => { const c = l.split(','); return Object.fromEntries(h.map((k, i) => [k, c[i] === undefined ? '' : c[i]])); }) }; };
const q = v => /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;   // RFC 4180 quoting, so a value such as "0,05" stays one field
const outCsv = (h, rows) => [h.join(','), ...rows.map(r => h.map(k => q(r[k] === undefined ? '' : String(r[k]))).join(','))].join('\n') + '\n';
const pkg = () => { const T = {}; for (const n of fs.readdirSync(P01).filter(n => n.endsWith('.csv'))) T[n.slice(0, -4)] = csv(fs.readFileSync(path.join(P01, n), 'utf8')); return T; };
const mapFor = T => { const m = { format: 'CG-IMPORT-MAPPING', version: 1, name: 'scrap', files: {}, tables: {} };
  for (const [t, v] of Object.entries(T)) { const f = t + '.csv'; m.files[f] = Object.assign({ dateFormat: 'ISO' }, G.mapping.moneyFields(t).some(c => v.h.includes(c)) ? { currency: { code: 'GBP', confirmed: true } } : {});
    const cols = {}; for (const h of v.h) if (G.canonical.field(t, h)) cols[h] = { source: h }; m.tables[t] = { sources: [{ file: f, columns: cols }] }; }
  return m; };
const imp = (edits) => { const T = pkg(); for (const [row, cell] of edits) T.bom.rows[row - 2].Scrap_Pct = cell === null ? '' : cell.s !== undefined ? cell.s : String(cell.n);
  const files = Object.entries(T).map(([t, v]) => ({ name: t + '.csv', text: outCsv(v.h, v.rows) })); return G.validate.importFiles(mapFor(T), files); };
const issue = (r, code) => r.issues.find(i => i.code === code);
const bomScrap = (r, row) => { const t = r.dataset && r.dataset.bom; const x = t && t.find(b => b.__source && b.__source.row === row); return x ? x.Scrap_Pct : undefined; };
ok(() => { const r = imp([]); return r.importAccepted && bomScrap(r, 2) === 0; }, 'import set-up: Package 01 as supplied is accepted and its row 2 scrap is 0');

for (const c of CASES) {
  const d = direct([[2, c.cell]]), r = imp([[2, c.cell]]);
  if (c.ok) {
    ok(() => d.out && !d.error, `direct, ${c.name}: accepted (the analysis runs)${d.error ? ' — refused: ' + d.error : ''}`);
    ok(() => r.importAccepted && bomScrap(r, 2) === c.v, () => `import, ${c.name}: accepted with scrap ${c.v} (got ${r.importAccepted ? bomScrap(r, 2) : 'refused: ' + (r.summary.blocking || []).join(',')})`);
    ok(() => sansConv(d.out) === sansConv(direct([[2, { n: c.v }]]).out), `direct, ${c.name}: every result equals the run with the number ${c.v} in that cell (correct downstream calculation)`);
    ok(() => c.conv ? !!conv(d.out) && conv(d.out).msg.includes(row2 + ' "' + c.cell.s.trim() + '" → ' + c.v) : !conv(d.out),
      () => `direct, ${c.name}: ${c.conv ? 'the conversion is disclosed with its row (' + (conv(d.out) ? conv(d.out).msg : 'not disclosed') + ')' : 'no conversion is disclosed (the cell was already a number)'}`);
    ok(() => c.pct ? !!issue(r, 'PERCENT_CONVERTED') && issue(r, 'PERCENT_CONVERTED').message.includes('row 2 "' + c.cell.s.trim() + '" → ' + c.v) : !issue(r, 'PERCENT_CONVERTED'),
      () => `import, ${c.name}: ${c.pct ? 'the percentage conversion is disclosed with its row' : 'no percentage conversion is reported (plain decimals in a CSV are its normal form)'}`);
  } else {
    ok(() => d.error && /^Invalid scrap in the BOM sheet, so the analysis was not run/.test(d.error) && d.error.includes(row2) && c.why.test(d.error),
      () => `direct, ${c.name}: the analysis is refused, naming ${row2} and the reason (${d.error ? d.error.slice(0, 160) : 'NOT refused'})`);
    ok(() => { const i = issue(r, 'ROW_REJECTED'); return !r.importAccepted && i && i.category === 'Must fix' && i.rows.some(x => x.row === 2 && x.reasons.some(s => /^Scrap_Pct: /.test(s) && c.why.test(s))); },
      () => `import, ${c.name}: the import is not accepted; a Must-fix ROW_REJECTED issue names row 2 and the reason`);
  }
}
// Blank scrap: a missing value (DR-4), assumed 0% and disclosed (E-1), on both routes; not rejected.
{ const d = direct([[2, { s: '   ' }]]), r = imp([[2, { s: '' }]]);
  ok(() => d.out && d.out.result.dq.some(q => /^Scrap missing on 1 BOM line\(s\): 0% assumed/.test(q.msg)), 'direct, blank scrap: not rejected; assumed 0% and disclosed (E-1)');
  ok(() => r.importAccepted && bomScrap(r, 2) === null, 'import, blank scrap: accepted as a missing value (null, never 0 in Stage 1; the adapter assumes and discloses 0%)'); }
// Mixed rows: one valid and one invalid line fail the whole import, naming only the invalid row; the valid row is not "partly imported".
{ const d = direct([[2, { s: '5%' }], [3, { s: 'abc' }]]), r = imp([[2, { s: '5%' }], [3, { s: 'abc' }]]);
  ok(() => d.error && d.error.includes(row3) && !d.error.includes(row2) && /Correct this line/.test(d.error), () => `direct, mixed rows: the whole analysis is refused, naming only ${row3} (${d.error ? 'refused' : 'NOT refused'})`);
  ok(() => !r.importAccepted && issue(r, 'ROW_REJECTED').rows.map(x => x.row).join() === '3', 'import, mixed rows: the whole import is refused; ROW_REJECTED lists row 3 only');
  const d2 = direct([[2, { n: -1 }], [3, { s: '200%' }]]);
  ok(() => d2.error && d2.error.includes(row2) && d2.error.includes(row3) && /these 2 lines/.test(d2.error), 'direct, two invalid rows: both are named in the refusal'); }
// Downstream: a valid scrap change moves material usage by exactly the scrap difference (independent check on RM001, row 2).
{ const a = direct([[2, { n: 0 }]]).out, b = direct([[2, { n: 0.5 }]]).out, use = o => o.result.rm.find(x => x.id === 'RM001').m, fg = a.result.fg.find(x => x.id === 'FG001').m;
  ok(() => Math.abs((use(b) - use(a)) - 0.5 * nsBom[0].Qty_Per_Finished_Unit * fg) < 1e-6, () => `downstream: RM001 monthly use rises by 0.5 × ${nsBom[0].Qty_Per_Finished_Unit} × FG001 monthly units (${(use(b) - use(a)).toFixed(4)} = ${(0.5 * nsBom[0].Qty_Per_Finished_Unit * fg).toFixed(4)})`); }

console.log(`\nscrap-rules: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
