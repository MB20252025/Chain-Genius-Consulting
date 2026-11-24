// Renders all 17 original tabs with two app.js versions over every proof workbook and both policy modes, and reports
// every difference. The engine is run exactly as in refactor-evidence/verify-shared-refactor.js (both policy modes, with
// the alternative runs the Policy comparison tab needs). A difference is "chart-only" when the two renders are identical once the Demand forecast chart's
// <svg>…</svg> (and its gap note) is removed. Usage: node compare-renders.js <app-dir> <old app.js> <new app.js>
const fs = require('fs'), path = require('path');
global.XLSX = require('xlsx'); global.document = { querySelector: () => ({ textContent: '', innerHTML: '' }), addEventListener() {}, querySelectorAll: () => [] };
const [APP, OLD, NEW] = process.argv.slice(2), js = n => fs.readFileSync(path.join(APP, 'js', n), 'utf8');
const INJ = `;out.go=(wb,pol)=>{WB=wb;CFG.pol=pol;R=analyse();CFG.pol=pol?0:1;try{R.alt=analyse()}finally{CFG.pol=pol}const s0=CFG.sup;CFG.sup=s0===1?0:1;try{R.altS=analyse()}finally{CFG.sup=s0}link();return R};
out.charts=()=>R.fg.map(x=>{const A=fcAll();if(!A[x.id].ok)return null;tab='Demand forecast';fsku=x.id;try{const h=views['Demand forecast']();const i=h.indexOf('<svg viewBox="0 0 640 230"');return [x.id,h.slice(i,h.indexOf('</svg>',i)),!!(Array.isArray(x.hc)&&x.hc.some(v=>v===null)),A[x.id].trail||0]}finally{fsku=null}}).filter(Boolean);
out.tabs=()=>ORDER.map(k=>{tab=k;let h;try{h=views[k]()}catch(e){h='THREW '+e.message}return [k,h]});`;
const mk = appSrc => { const A = {}; new Function('XLSX', 'document', 'out', [js('calculations.js'), js('forecasting.js'), appSrc, js('excel-import.js')].join('\n') + INJ)(XLSX, document, A); return A; };
const O = mk(fs.readFileSync(OLD, 'utf8')), N = mk(fs.readFileSync(NEW, 'utf8'));
const dirs = ['tests/fixtures', 'stage3-design/audit-20261121/evidence/workbooks', 'stage3-design/stage3b/refactor-evidence/s11-edge-workbooks'];
const books = []; const walk = d => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (f.endsWith('.xlsx')) books.push(p); } };
dirs.forEach(d => fs.existsSync(path.join(APP, d)) && walk(path.join(APP, d)));
const strip = h => h.replace(/<svg viewBox="0 0 640 230"[\s\S]*?<\/svg>(<p class="note" data-chart-gaps[^<]*<\/p>)?/g, '[CHART]');
let renders = 0, same = 0, chartOnly = [], other = [], skipped = 0;
for (const b of books.sort()) for (const p of [0, 1]) {
  let to, tn; try { O.go(XLSX.readFile(b, { cellDates: true }), p); to = O.tabs(); } catch (e) { to = null; O.err = e.message; } try { N.go(XLSX.readFile(b, { cellDates: true }), p); tn = N.tabs(); } catch (e) { tn = null; N.err = e.message; }
  if (!to || !tn) { if (!!to !== !!tn) other.push([path.relative(APP, b), p, 'one version could not analyse']); else skipped++; continue; }
  to.forEach(([k, h], i) => { renders++; const h2 = tn[i][1]; if (h === h2) same++; else if (strip(h) === strip(h2) && k === 'Demand forecast') chartOnly.push(`${path.relative(APP, b)} [policy ${p}]`); else other.push([path.relative(APP, b), p, k]); });
}
// every forecast product's chart, old vs new: a difference is expected only for a product with an unknown month in its
// calendar history (defect A) or missing month(s) at the end (defect B); any other difference is reported
const perProduct = { charts: 0, identical: 0, changedWithGap: [], unexpected: [] };
for (const b of books) { let co, cn; try { O.go(XLSX.readFile(b, { cellDates: true }), 0); co = O.charts(); N.go(XLSX.readFile(b, { cellDates: true }), 0); cn = N.charts(); } catch (e) { continue; }
  co.forEach(([id, svg, gap, trail], i) => { perProduct.charts++; if (svg === cn[i][1]) perProduct.identical++; else if (gap || trail) perProduct.changedWithGap.push(`${path.relative(APP, b)} ${id}${trail ? ' (trailing gap)' : ''}`); else perProduct.unexpected.push(`${path.relative(APP, b)} ${id}`); }); }
if (perProduct.unexpected.length) other.push(['per-product charts', 0, perProduct.unexpected.join(', ')]);
console.log(JSON.stringify({ books: books.length, renders, identical: same, chartOnlyDifferences: chartOnly, otherDifferences: other, workbookRunsNotAnalysedByEither: skipped, perProduct }, null, 1));
process.exit(other.length ? 1 : 0);
