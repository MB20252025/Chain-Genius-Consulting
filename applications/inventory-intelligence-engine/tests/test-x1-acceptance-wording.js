#!/usr/bin/env node
/* X1 acceptance wording (21 Nov 2026; owner "Master authorisation: X1 completion …"). Pins the three wording corrections that came from the
 * owner's physical Android Test 3 observations and the banner finding:
 *   A. banner: "Not Assessed" sentence only when an item is Not Assessed;
 *   B. Reorder policy "Why": verdict-specific (no "Within ±20%" for an item that was not compared, no "No demand" for unknown demand);
 *   C. Summary: no contradictory zero-count recommendation ("Review reorder points (0 items look too low)" and the like).
 * Rendering only: no calculation is involved or changed. Run from tests/: NODE_PATH=<pinned node_modules> node test-x1-acceptance-wording.js
 */
'use strict';
const fs = require('fs'), path = require('path');
global.XLSX = require('xlsx');
global.document = { querySelector: () => ({ textContent: '', innerHTML: '' }), addEventListener() {}, querySelectorAll: () => [] };
let pass = 0, fail = 0;
const ok = (c, m) => { let v = false, why = ''; try { v = !!(typeof c === 'function' ? c() : c); } catch (e) { why = ' [threw: ' + e.message + ']'; } v ? pass++ : fail++; console.log((v ? 'PASS: ' : 'FAIL: ') + m + why); };
const ROOT = path.join(__dirname, '..'), src = ['validation/x1-integrity', 'calculations', 'forecasting', 'app', 'excel-import'].map(n => fs.readFileSync(ROOT + '/js/' + n + '.js', 'utf8')).join('\n'), o = {};
new Function('XLSX', 'document', 'out', src + ';out.go=wb=>{WB=wb;R=analyse();const p0=CFG.pol;CFG.pol=p0?0:1;try{R.alt=analyse()}finally{CFG.pol=p0}const s0=CFG.sup;CFG.sup=s0===1?0:1;try{R.altS=analyse()}finally{CFG.sup=s0}INTEG=CGValidation.forEngineResult({workbook:WB,XLSX,result:R,sup:CFG.sup,pol:CFG.pol});link();return R};out.html=k=>{tab=k;return views[k]()};out.banner=()=>x1Banner();out.R=()=>R')(XLSX, document, o);
const strip = h => String(h).replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ');
const NS = path.join(__dirname, 'fixtures/northstar/Chain_Genius_Project_001_Northstar_Dataset_1.xlsx');
const read = () => XLSX.read(fs.readFileSync(NS), { cellDates: true });
const edit = (sh, fn) => { const w = read(), hdr = XLSX.utils.sheet_to_json(w.Sheets[sh], { header: 1 })[0], r = XLSX.utils.sheet_to_json(w.Sheets[sh], { raw: true, cellDates: true }), h2 = fn(r, hdr) || hdr; w.Sheets[sh] = XLSX.utils.json_to_sheet(r, { header: h2, cellDates: true }); return XLSX.read(XLSX.write(w, { type: 'buffer', bookType: 'xlsx', cellDates: true }), { type: 'buffer', cellDates: true }); };
const whyRows = () => { const h = o.html('Reorder policy'), rows = [...h.matchAll(/<tr>(.*?)<\/tr>/g)].map(m => [...m[1].matchAll(/<t[dh][^>]*>(.*?)<\/t[dh]>/g)].map(c => strip(c[1]).trim())); const hd = rows[0], iv = hd.indexOf('Verdict'), iw = hd.indexOf('Why'), ii = hd.indexOf('Item'); return rows.slice(1).map(r => ({ id: r[ii], verdict: r[iv], why: r[iw] })); };
const recs = () => { const h = strip(o.html('Summary')); return h; };

// clean Northstar: every original wording kept
{ const R = o.go(read()), S = recs(), W = whyRows(), ins = [...R.fg, ...R.rm].filter(x => x.verdict === 'Existing ROP insufficient').length;
  ok(() => o.banner() === '', 'clean: no missing-input banner');
  ok(() => /Secure supply for the \d+ critical items/.test(S) && /Review excess stock \(\d+ items\)/.test(S) && new RegExp('Review reorder points \\(' + ins + ' items look too low\\)').test(S) && ins > 0, 'clean: the three count-based recommendations keep their original wording (' + ins + ' reorder points look too low)');
  ok(() => W.length === 150 && W.filter(r => r.verdict === 'Broadly aligned').every(r => r.why === 'Within ±20% of the calculated value.') && W.every(r => !/^No workbook reorder point/.test(r.why)), 'clean: Reorder policy "Why" unchanged (aligned items say "Within ±20%")'); }

// Test 3 workbook: Reorder_Point_Qty column absent (issue 26: every item still assessed)
{ const R = o.go(edit('Inventory', (r, h) => { r.forEach(x => delete x.Reorder_Point_Qty); return h.filter(k => k !== 'Reorder_Point_Qty'); })), S = recs(), W = whyRows(), b = strip(o.banner()), n = R.fg.length + R.rm.length;
  ok(() => [...R.fg, ...R.rm].every(x => x.sev !== null) && /Missing or invalid input data: Reorder_Point_Qty/.test(b) && /Every item is still assessed/.test(b) && !/Not Assessed/.test(b), 'A banner, no item Not Assessed: names Reorder_Point_Qty, says every item is still assessed, does not say "Not Assessed"');
  ok(() => /Reorder points not checked/.test(S) && new RegExp('No workbook reorder points were supplied \\(' + n + ' item\\(s\\)\\)').test(S) && !/Review reorder points \(0 items/.test(S), 'C Summary: "Reorder points not checked … no workbook reorder points were supplied (' + n + ' items)", never "Review reorder points (0 items look too low)"');
  ok(() => W.length === n && W.every(r => r.verdict === 'No reorder point configured' && /^No workbook reorder point to compare/.test(r.why) && !/±20%/.test(r.why)), 'B Reorder policy: all ' + n + ' rows say "No workbook reorder point to compare", none "Within ±20%"');
  ok(() => W.every(r => /The calculated ROP \([\d,]+\) is indicative only\.$/.test(r.why) || /the calculated ROP is not available either\.$/.test(r.why)), 'B each row names the calculated ROP as indicative (or says it is not available)'); }

// banner with Not Assessed items: the protected D4 sentence is kept exactly
{ const R = o.go(edit('Inventory', r => { delete r.find(x => x.Item_ID === 'RM001').Allocated_Qty; })), b = o.banner();
  ok(() => R.rm.find(x => x.id === 'RM001').sev === null && /Affected items stay in every list with the status <b>Not Assessed<\/b> and the reason; their unknown figures are left out of totals, which say how many items they cover\./.test(b), 'A banner with a Not Assessed item: the D4 sentence is unchanged'); }

// Test 4 workbook: blank Material_ID beside the complete BOM (every material Not Assessed, usage incomplete)
{ const R = o.go(edit('BOM', r => { const l = Object.assign({}, r.find(b => b.SKU === 'FG002')); delete l.Material_ID; r.push(l); })), W = whyRows(), S = recs();
  const rmW = W.filter(r => /^RM/.test(r.id));
  ok(() => rmW.length === 100 && rmW.every(r => /^Not Assessed/.test(r.verdict) && /usage incomplete/.test(r.why) && r.why !== 'No demand, so no calculation.'), 'B Reorder policy: the 100 Not Assessed materials show their reason ("usage incomplete"), not "No demand, so no calculation." (their demand is unknown, not zero)');
  ok(() => !/Review reorder points \(0 items/.test(S) && (R.fg.concat(R.rm).some(x => x.verdict === 'Existing ROP insufficient') ? /Review reorder points \(\d+ items look too low\)/.test(S) : /Reorder points: none look too low/.test(S)), 'C Summary: no "(0 items look too low)"; the reorder-point line matches the actual count'); }

// zero-count recommendations: rendering check with the counts forced to zero (state injected after analysis; nothing recalculated)
{ const R = o.go(read()); [...R.fg, ...R.rm].forEach(x => { if (x.sev === 3) x.sev = 2; x.fEx = false; }); const S = recs();
  ok(() => /No critical items/.test(S) && !/Secure supply for the 0 critical items/.test(S), 'C Summary with no critical items: "No critical items", never "Secure supply for the 0 critical items ()"');
  ok(() => /No excess stock/.test(S) && !/Review excess stock \(0 items\)/.test(S), 'C Summary with no excess items: "No excess stock", never "Review excess stock (0 items)"'); }

console.log(`\nx1-acceptance-wording: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
