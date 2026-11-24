// Stage 3B Phase 0 (22 Nov 2026): view-model and data-contract tests. Blueprint G, phase 0 acceptance criteria:
//   every view-model number equals its engine field on 3 workbooks; a test fails if a view-model or component file
//   contains arithmetic outside the allowed block; the 17 existing tabs are untouched.
// The trace resolver here is written independently of js/views/contract.js, so a wrong builder cannot vouch for itself.
const fs = require('fs'), path = require('path');
global.XLSX = require('xlsx');
global.document = { querySelector: () => ({ textContent: '', innerHTML: '' }), addEventListener() {}, querySelectorAll: () => [] };
let pass = 0, fail = 0;
const ok = (c, m) => { c ? (pass++, process.env.VERBOSE && console.log('PASS:', m)) : (fail++, console.log('FAIL:', m)); };
const APP = path.join(__dirname, '..'), js = n => fs.readFileSync(path.join(APP, 'js', n), 'utf8');
const VIEW_FILES = fs.readdirSync(path.join(APP, 'js', 'views')).filter(f => f.endsWith('.js')).map(f => 'views/' + f);
const UI_FILES = fs.existsSync(path.join(APP, 'js', 'ui')) ? fs.readdirSync(path.join(APP, 'js', 'ui')).filter(f => f.endsWith('.js')).map(f => 'ui/' + f) : [];
const ORDER_VIEWS = ['contract.js', 'areas.js'].map(f => 'views/' + f).concat(VIEW_FILES.filter(f => !/\/(contract|areas)\.js$/.test(f)));

function load() {
  const src = ['calculations.js', 'forecasting.js', 'app.js', 'excel-import.js', 'engine/engine-api.js'].concat(ORDER_VIEWS).map(js).join('\n'), A = {};
  new Function('XLSX', 'document', 'out', src + `;out.go=(wb)=>{WB=wb;CFG.pol=0;R=analyse();CFG.pol=1;try{R.alt=analyse()}finally{CFG.pol=0}const s0=CFG.sup;CFG.sup=s0===1?0:1;try{R.altS=analyse()}finally{CFG.sup=s0}link();return R};
    out.html=k=>{tab=k;return views[k]()};out.fview=sku=>{tab='Demand forecast';fsku=sku;try{return views['Demand forecast']()}finally{fsku=null}};out.ORDER=ORDER;out.V=CGVM;out.gbp=gbp;out.f=f;`)(XLSX, document, A);
  return A;
}
const WBS = [
  ['Northstar', 'tests/fixtures/northstar/Chain_Genius_Project_001_Northstar_Dataset_1.xlsx'],
  ['faulty Northstar', 'stage3-design/audit-20261121/evidence/workbooks/ns-x1-faults.xlsx'],
  ['Willow', 'tests/fixtures/structure/scenario-willow.xlsx'],
  /* S11 edge cases (Stage 3B Phase 2, synthetic): negative physical on-hand with usable stock; unknown allocation and invalid cost */
  ['S11 edge E6', 'stage3-design/stage3b/refactor-evidence/s11-edge-workbooks/E6-negative-on-hand-no-demand.xlsx'],
  ['S11 edge E5', 'stage3-design/stage3b/refactor-evidence/s11-edge-workbooks/E5-combined.xlsx'],
  /* missing months in demand history (Stage 3B Phase 2 completion, synthetic): tests/fixtures/forecast-gaps/ */
  ['forecast gaps', 'tests/fixtures/forecast-gaps/forecast-gaps.xlsx'],
  /* S12–S15 edge cases (Stage 3B Phase 2 completion, synthetic): invalid product costs; zero/blank/text lead times and
     reorder points; recorded forecasts far from actual (the consistency warning must not show) */
  ['S12–S15 edge Q1', 'stage3-design/stage3b/refactor-evidence/s12-s15-edge-workbooks/Q1-cost-invalid.xlsx'],
  ['S12–S15 edge Q3', 'stage3-design/stage3b/refactor-evidence/s12-s15-edge-workbooks/Q3-leadtime-rop-edge.xlsx'],
  ['S12–S15 edge Q4', 'stage3-design/stage3b/refactor-evidence/s12-s15-edge-workbooks/Q4-low-accuracy.xlsx']
];

// ---- independent resolver -------------------------------------------------------------------------------------
const get = (o, p) => p.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);
const fin = v => typeof v === 'number' && Number.isFinite(v);
const test1 = (x, [k, op, v]) => {
  const a = get(x, k);
  switch (op) {
    case '==': return a === v; case '!=': return a !== v; case '>': return a > v; case '>=': return a >= v;
    case '<': return a < v; case '<=': return a <= v; case 'null': return a === null || a === undefined;
    case 'set': return !(a === null || a === undefined); case 'in': return v.includes(a); case 'nin': return !v.includes(a);
    case 'match': return typeof a === 'string' && new RegExp(v).test(a); case 'num': return fin(a); case 'nonnum': return !fin(a);
    default: throw new Error('unknown op ' + op);
  }
};
const list = (S, roots) => [].concat(...roots.map(r => { const a = get(S, r); return Array.isArray(a) ? a : []; }));
function indep(S, t) {
  if (t.field !== undefined) return get(S, t.field);
  if (t.count) return list(S, t.count).filter(x => (t.where || []).every(w => test1(x, w))).length;
  if (t.partialSum) { const q = list(S, t.partialSum).filter(x => fin(x[t.key])); return { v: q.reduce((s, x) => s + x[t.key], 0), n: q.length, of: list(S, t.partialSum).length }; }
  if (t.shared) { const r = S.shared[t.shared](list(S, t.items).filter(x => (t.where || []).every(w => test1(x, w)))); return t.key ? get(r, t.key) : r; }
  if (t.faConsistency) { // S14, recomputed here from the credibility rows and the settings (not via faStats or the hiAcc flag)
    const ass = S.credRows.filter(r => r.c.dq !== 'Insufficient'), hi = ass.filter(r => r.c.acc !== null && r.c.acc !== undefined && r.c.acc >= S.CFG.fcHighAcc).length;
    return t.faConsistency === 'share' ? hi / ass.length * 100 : ass.length > 0 && hi / ass.length >= S.CFG.fcHighShare / 100;
  }
  if (t.fcSum) return S.R.fg.filter(x => S.fc[x.id] && S.fc[x.id].ok).reduce((q, x) => q + S.fc[x.id][t.fcSum], 0); // S7, summed here independently
  if (t.bands) return S.coverBands(list(S, [t.bands]))[t.key];
  if (t.entry) { const o = get(S, t.entry); return o ? o[t.key] : undefined; }
  if (t.rows) {
    let a = list(S, [t.rows]).filter(x => (t.where || []).every(w => test1(x, w)));
    if (t.order) a = a.map((x, i) => [x, i]).sort((A, B) => { // independent ordering: listed keys, nulls placed as requested, NaN equal, then original order
      for (const [k, dir, lst, nulls] of t.order) {
        const p = get(A[0], k), q = get(B[0], k);
        if (Number.isNaN(p) || Number.isNaN(q)) continue;
        const pn = p === null || p === undefined, qn = q === null || q === undefined;
        if (pn && qn) continue; if (pn) return nulls === 'first' ? -1 : 1; if (qn) return nulls === 'first' ? 1 : -1;
        const d = lst ? lst.indexOf(p) - lst.indexOf(q) : (p < q ? -1 : p > q ? 1 : 0);
        if (d) return dir === 'desc' && !lst ? -d : d;
      }
      return A[1] - B[1];
    }).map(e => e[0]);
    return t.take ? a.slice(0, t.take) : a;
  }
  throw new Error('unknown trace');
}
const sameNum = (a, b) => (a === null && (b === null || b === undefined || !fin(b))) || (fin(a) && fin(b) && a === b);

// ---- 1-4. contract, traces, anchors, no mutation, old views unchanged ---------------------------------------------
for (const [label, rel] of WBS) {
  const A = load(), V = A.V, R = A.go(XLSX.readFile(path.join(APP, rel), { cellDates: true }));
  const htmlBefore = A.ORDER.map(k => A.html(k));
  const snap = JSON.stringify({ fg: R.fg, rm: R.rm, sup: R.sup, dq: R.dq, tot: R.tot, exV: R.exV });
  const S = V.source();
  const all = [];
  for (const tab of A.ORDER) {
    let vms;
    try { vms = V.forTab(S, tab); } catch (e) { ok(false, `${label} / ${tab}: builder threw ${e.message}`); continue; }
    ok(Array.isArray(vms) && vms.length > 0, `${label} / ${tab}: at least one view-model`);
    for (const vm of vms) { vm._tab = tab; all.push(vm); }
  }
  ok(all.length >= 17, `${label}: view-models for every one of the 17 tabs (${all.length} in total)`);
  for (const [sec, b] of Object.entries(V.SECTIONS)) { let vms = []; try { vms = b(S); } catch (e) { ok(false, `${label} / section ${sec}: builder threw ${e.message}`); } ok(vms.length > 0, `${label} / section ${sec}: view-models built`); for (const vm of vms) { vm._section = sec; all.push(vm); } }
  const ids = all.map(v => v.id);
  ok(new Set(ids).size === ids.length, `${label}: view-model ids are unique`);
  let probs = [];
  for (const vm of all) probs = probs.concat(V.validate(vm));
  ok(probs.length === 0, `${label}: every view-model meets the data contract${probs.length ? ' — ' + probs.slice(0, 5).join(' | ') : ''}`);

  // every number equals what its trace names, resolved independently
  let bad = [];
  for (const vm of all) {
    if (vm.kind === 'kpi') {
      const t = vm.trace, r = indep(S, t);
      const want = t.partialSum ? (r.n ? r.v : null) : r;
      if (!sameNum(vm.value, want)) bad.push(`${vm.id}: ${vm.value} vs ${want}`);
      /* x1 totals: complete only when every item has a value (x1Card); otherwise partial, with the counts left out */
      if (t.partialSum && r.n) { const full = r.n === r.of, c = vm.completeness; if (!(c.status === (full ? 'complete' : 'partial') && c.included === r.n && c.of === r.of && (full || c.excluded === r.of - r.n))) bad.push(`${vm.id}: partial counts`); }
    }
    if (vm.kind === 'bar' && !vm.rowsTrace) for (const s of vm.series) s.trace.forEach((t, i) => { const w = indep(S, t); if (!sameNum(s.data[i], fin(w) ? w : null)) bad.push(`${vm.id}[${i}]: ${s.data[i]} vs ${w}`); });
    if (vm.kind === 'bar' && vm.rowsTrace) { const src = indep(S, vm.rowsTrace); if (vm.labels.length !== src.length) bad.push(`${vm.id}: bars vs rows`); for (const s of vm.series) s.data.forEach((v, i) => { const w = get(src[i], s.trace[i].field); if (!sameNum(v, fin(w) ? w : null)) bad.push(`${vm.id}/${s.name}[${i}]`); }); }
    if (vm.kind === 'recommendation') { const rec = S.shared.summaryModel().rec.filter(r => !vm.trace.titleMatch || new RegExp(vm.trace.titleMatch).test(r[0])), n = vm.trace.summaryRec === 'all' ? rec.length : vm.trace.summaryRec; if (vm.items.length !== Math.min(n, rec.length) || vm.items.some((r, i) => r.title !== rec[i][0] || r.reason !== rec[i][1] || r.action !== rec[i][2] || r.confidence !== rec[i][3])) bad.push(`${vm.id}: recommendations differ from the Summary's own list`); }
    if (vm.kind === 'line' && vm.timeline) { // demand timeline, rebuilt here from the engine row, forecast and dated rows, independently
      const tr0 = vm.series[0].trace[0], x = R.fg.find(y => y.id === tr0.row), F = S.fc[tr0.row], cal = Array.isArray(x.hc) && x.hc.length >= x.h.length;
      const months = cal ? R.months : x.hd, hist = cal ? x.hc : x.h, nul = v => (fin(v) ? v : null);
      // forecast start: after the last observed calendar month when the history ends with missing months (engine: F.trail)
      let start = months.length; if (cal && F.trail > 0) { start = -1; hist.forEach((v, i) => { if (fin(v)) start = i + 1; }); }
      const total = Math.max(months.length, start + F.f.length), at = (arr, i) => (i >= start && i - start < arr.length ? nul(arr[i - start]) : null);
      const rec = i => { if (i >= months.length || !Array.isArray(x.fc)) return null; if (!cal) return nul(x.fc[i]); const rows = x.hd.map((t, k) => (t === months[i] ? k : -1)).filter(k => k >= 0); return rows.length === 1 ? nul(x.fc[rows[0]]) : null; };
      const idx = [...Array(total).keys()];
      const want = { 'Actual demand': idx.map(i => (i < months.length ? nul(hist[i]) : null)), 'Existing workbook forecast (recorded)': idx.map(rec),
        'Statistical forecast': idx.map(i => at(F.f, i)), 'High (80%)': idx.map(i => at(F.hi, i)), 'Low (80%)': idx.map(i => at(F.lo, i)) };
      for (const s of vm.series) if (!want[s.name] || s.data.length !== total || s.data.some((v, i) => !sameNum(v, want[s.name][i]))) bad.push(`${vm.id}/${s.name}`);
      if (vm.labels.length !== total || vm.labels.slice(0, months.length).some((l, i) => l.month !== months[i])) bad.push(`${vm.id}: month labels`);
    } else     if (vm.kind === 'line') for (const s of vm.series) { const w = get(S, s.trace[0].field) || []; if (s.data.length !== w.length || s.data.some((v, i) => !sameNum(v, fin(w[i]) ? w[i] : null))) bad.push(`${vm.id}/${s.name}`); }
    if (vm.kind === 'table') {
      const src = indep(S, vm.trace), refs = new Set(src);
      if (vm.rows.length !== (vm.trace.take ? Math.min(vm.trace.take, src.length) : src.length)) bad.push(`${vm.id}: ${vm.rows.length} rows vs ${src.length}`);
      for (const r of vm.rows) { if (!refs.has(r.ref)) { bad.push(`${vm.id}: row not from its source`); break; } if (r.cells.some((c, i) => { const w = get(r.ref, vm.columns[i].field); return typeof w === 'number' && !fin(w) ? c !== null : c !== w; })) { bad.push(`${vm.id}: cell differs from its engine field`); break; } }
    }
  }
  ok(bad.length === 0, `${label}: every KPI, chart value and table cell equals its engine field${bad.length ? ' — ' + bad.slice(0, 6).join(' | ') : ''}`);

  // anchors: the builders chose the right engine fields (expectations written here, not taken from the traces)
  const by = id => all.find(v => v.id === id);
  const items = [...R.fg, ...R.rm];
  if (fin(R.tot)) ok(by('ov-value').value === R.tot && by('ov-value').completeness.status === 'complete', `${label}: Inventory value is R.tot (complete)`);
  else {
    const q = items.filter(x => fin(x.val));
    ok(by('ov-value').completeness.status === 'partial' && by('ov-value').value === q.reduce((s, x) => s + x.val, 0) && by('ov-value').completeness.excluded === items.length - q.length, `${label}: Inventory value is a partial total of ${q.length} of ${items.length} items, never a full total or zero`);
  }
  if (fin(R.exV)) ok(by('ov-excess').value === R.exV, `${label}: Potential excess is R.exV`);
  else ok(by('ov-excess').completeness.status !== 'complete', `${label}: Potential excess is not shown as complete when the engine total is unknown`);
  ok(by('ov-high-risk').value === items.filter(x => x.sev >= 2).length, `${label}: high-risk count`);
  ok(by('ov-high-risk').completeness.status === (items.some(x => x.sev == null) ? 'partial' : 'complete'), `${label}: high-risk count says partial exactly when items are Not Assessed`);
  ok(by('mrp-order-now').value === S.mrp.filter(r => r.st === 'ORDER NOW').length, `${label}: materials to order now`);
  const origTop = (x, n) => [...x].sort((p, q) => (q.sev ?? 4) - (p.sev ?? 4) || (p.cover ?? 1e9) - (q.cover ?? 1e9)).slice(0, n).map(i => i.id).join();
  ok(by('ov-top-fg').rows.map(r => r.ref.id).join() === origTop(R.fg, 6) && by('ov-top-rm').rows.map(r => r.ref.id).join() === origTop(R.rm, 8), `${label}: Overview top-risk lists match the original tab's ranking exactly`);
  ok(by('ov-health').value === S.shared.healthMean(items.filter(x => x.score != null)), `${label}: overall health comes from the shared function the Health tab uses`);
  ok(by('ov-recs').items.length > 0 && by('ov-recs').items[0].title === S.shared.summaryModel().rec[0][0], `${label}: recommended actions are the Summary's own list`);
  ok(by('su-high').value === R.sup.filter(s => s.cat === 'High risk').length, `${label}: high-risk suppliers`);
  ok(by('dq-sev').series[0].data[0] === R.dq.filter(d => d.sev === 'High').length, `${label}: High data issues`);
  ok(by('fg-items').rows.length === R.fg.length && by('rm-items').rows.length === R.rm.length, `${label}: item tables list every product and material`);
  if (R.hasF) ok(by('fa-items').rows.length > 0 && !by('fa-unavailable'), `${label}: forecast accuracy available`);
  else ok(by('fa-unavailable') && by('fa-unavailable').completeness.status === 'unavailable' && by('fa-unavailable').value === null, `${label}: forecast accuracy shown as unavailable, not zero (no Forecast_Units)`);
  ok(all.every(v => v.kind !== 'kpi' || v.value === null || fin(v.value)), `${label}: no KPI is NaN or infinite`);
  if (label === 'Northstar') { const miss = []; for (const vm of all.filter(v => v.kind === 'table' && v.rows.length)) for (const c of vm.columns) if (!vm.rows.some(r => get(r.ref, c.field) !== undefined)) miss.push(`${vm.id}.${c.field}`); ok(miss.length === 0, `${label}: every table column names a field that exists in the engine rows${miss.length ? ' — ' + miss.join(', ') : ''}`); }
  ok(all.every(v => v.kind !== 'table' || v.rows.every(r => r.cells.every(c => typeof c !== 'number' || fin(c)))), `${label}: no table cell is NaN or infinite`);
  ok(all.filter(v => v.kind === 'kpi' && v.value === null).every(v => v.completeness.status === 'unavailable' && v.completeness.reasons.length), `${label}: every missing KPI is marked unavailable with a reason`);

  // the view layer reads, never writes
  ok(JSON.stringify({ fg: R.fg, rm: R.rm, sup: R.sup, dq: R.dq, tot: R.tot, exV: R.exV }) === snap, `${label}: building view-models does not change the engine results`);
  ok(A.ORDER.every((k, i) => A.html(k) === htmlBefore[i]), `${label}: all 17 existing tabs render identically after the view-models are built`);
  ok(V.primary(S).some(a => a.area === 'Production') === true, `${label}: Production is shown (this workbook has production data)`);
  const homeOf = t => V.NAV.primary.concat(V.NAV.utility).find(a => a.subs.some(s => s.tabs.includes(t))).area;
  const homeOfSection = sec => V.NAV.primary.concat(V.NAV.utility).find(a => a.subs.some(s => s.section === sec)).area;
  ok(all.every(vm => vm.area === (vm._section ? homeOfSection(vm._section) : homeOf(vm._tab))), `${label}: every view-model is labelled with the area its tab or moved section lives in`);
  ok(V.forSub(S, 'procurement', 'reconciliation').some(v => v.id === 'rc-rows') && V.forSub(S, 'production', 'attainment').some(v => v.id === 'pa-rows'), `${label}: the moved sections' view-models are delivered by their new subsections`);
  const g = R.recon.filter(x => x.gap > 0);
  ok(sameNum(by('rc-gap-value').value, g.reduce((q, x) => q + x.val, 0)) && by('rc-gap-n').value === g.length, `${label}: reconciliation gap value equals the sum over materials with a positive gap`);
  const PT = S.shared.prTotals(R.pr);
  ok(by('pa-orders').value === PT.T.n && sameNum(by('pa-weighted').value, PT.w) && sameNum(by('pa-avg').value, PT.avg), `${label}: attainment figures are the Suppliers section's own totals (CGShared.prTotals)`);
  /* Phase 2 (Demand & Planning, Procurement): the new screens' headline figures are the original tabs' own figures, read from
     the original tabs' rendered HTML (figure text next to its label), not from the view-models or their traces. */
  const cardTxt = (html, lbl) => { const m = html.match(new RegExp('<b[^>]*>([^<]*)</b><span>' + lbl)); return m ? m[1] : null; };
  const vtxt = (id, d) => { const v = by(id); return v && v.value !== null ? A.f(v.value, d) : null; };
  const dfH = A.html('Demand forecast');
  if (by('df-unavailable')) ok(/no statistical forecast/.test(dfH), `${label}: Demand forecast unavailable on both screens`);
  else {
    ok(['Units sold, last 12 months', 'Forecast, next 3 months', 'Next 6 months', 'Next 12 months'].every((l, i) => cardTxt(dfH, l) === vtxt(['df-act12', 'df-s3', 'df-s6', 'df-s12tot'][i])), `${label}: Demand forecast totals are the tab's cards (${cardTxt(dfH, 'Units sold, last 12 months')} sold)`);
    ok(cardTxt(dfH, 'Rising / falling trends') === `${by('df-rising').value}/${by('df-falling').value}`, `${label}: rising / falling trend counts are the tab's`);
    const okF = R.fg.filter(x => S.fc[x.id].ok), H = S.CFG.fcH, h = Math.min(12, Math.max(3, H || 12));
    ok(by('df-skus').value === okF.length && by('df-short').value === R.fg.length - okF.length, `${label}: forecast / not forecast product counts`);
    ok(by('df-rows').rows.length === okF.length && by('df-rows').rows.every(r => r.ref.next === S.fc[r.ref.id].f.slice(0, h).reduce((q, v) => q + v, 0)), `${label}: next-${h}-month column equals the forecast summed over the display horizon (S8), recomputed here`);
    let fbad = 0; for (const x of okF) { for (const vm of V.forecastFor(S, x.id)) { if (V.validate(vm).length) fbad++; if (vm.kind === 'bar') vm.series[0].data.forEach((v, i) => { const t = vm.series[0].trace[i], w = t.field ? get(S, t.field) : get(S, t.entry)[t.key]; if (!sameNum(v, fin(w) ? w : null)) fbad++; }); } }
    ok(fbad === 0, `${label}: every forecast product's chart and method comparison meet the contract and equal the engine's back-test (${okF.length} products)`);
  }
  if (R.hasF) {
    const faH = A.html('Forecast accuracy');
    ok(cardTxt(faH, 'Average accuracy') === `${vtxt('fa-avg', 1)}%`, `${label}: average accuracy is the tab's card (${cardTxt(faH, 'Average accuracy')})`);
    ok(cardTxt(faH, 'Over / under / balanced') === `${by('fa-over').value}/${by('fa-under').value}/${by('fa-balanced').value}`, `${label}: over / under / balanced counts are the tab's`);
    const dqT = by('fa-dq').series[0].data.join('/'), cfT = by('fa-conf').series[0].data.join('/');
    ok(cardTxt(faH, 'Data quality adequate') === dqT && cardTxt(faH, 'Confidence high') === cfT, `${label}: data-quality and confidence counts are the tab's (${dqT}; ${cfT})`);
    const C = S.cred, ord = R.fg.map(x => ({ x, c: C[x.id] })).sort((p, q) => (q.c.acc == null) - (p.c.acc == null) || (q.c.acc ?? 0) - (p.c.acc ?? 0)).map(r => r.x.id);
    ok(JSON.stringify(by('fa-items').rows.map(r => r.ref.id)) === JSON.stringify(ord), `${label}: accuracy table in the tab's order (the tab's own comparator, run here)`);
  }
  const vds = ['Existing ROP insufficient', 'Existing ROP possibly excessive', 'Broadly aligned'];
  ok(['rp-insufficient', 'rp-excessive', 'rp-aligned'].every((id, i) => by(id).value === items.filter(x => x.verdict === vds[i]).length) && by('rp-items').rows.length === R.fg.length && by('rp-items-rm').rows.length === R.rm.length, `${label}: reorder-policy verdict counts and tables cover every item`);
  const mrpH = A.html('MRP');
  ok(cardTxt(mrpH, 'Order now') === String(by('mrp-order-now').value) && cardTxt(mrpH, 'Materials with net requirement') === String(by('mrp-net').value), `${label}: MRP order-now and net-requirement counts are the tab's (${cardTxt(mrpH, 'Order now')}, ${cardTxt(mrpH, 'Materials with net requirement')})`);
  const repT = cardTxt(mrpH, 'Total replenishment'), rv = by('mrp-value');
  ok(rv.value === null ? repT === '–' : repT === A.gbp(rv.value), `${label}: total replenishment is the tab's card (${repT})`);
  ok((rv.completeness.status === 'partial') === /Total replenishment[^<]*<strong data-x1="partial">/.test(mrpH) || rv.value === null, `${label}: total replenishment is partial exactly when the tab says so`);
  ok(by('mrp-rows').rows.length === S.mrp.length && by('mrp-urgent').rows.length === S.mrp.filter(r => r.st === 'ORDER NOW').length, `${label}: What to buy lists every MRP line; Order now lists the ORDER NOW lines`);
  ok(JSON.stringify(by('su-rows').rows.map(r => r.ref.id)) === JSON.stringify(R.supRisk.map(x => x.id)), `${label}: supplier scorecard in the Suppliers tab's order (R.supRisk)`);
  { // orders by supplier: at most 15 suppliers, most urgent materials first (recounted here from the MRP lines), ties by id
    const vm = by('mrp-by-supplier'), urgent = ['ORDER NOW', 'Order soon'], cnt = id => S.mrp.filter(r => r.x.sup === id && urgent.includes(r.st)).length;
    const all = [...new Set(S.mrp.filter(r => urgent.includes(r.st) && r.x.sup).map(r => r.x.sup))].sort((a, b) => cnt(b) - cnt(a) || (a < b ? -1 : 1)).slice(0, 15);
    ok(vm.labels.length <= 15 && (all.length ? JSON.stringify(vm.labels) === JSON.stringify(all) : vm.labels[0] === 'None'), `${label}: orders-by-supplier chart shows the ${vm.labels.length} suppliers with the most materials to order now or soon, most first`);
  }
  const recT = S.shared.summaryModel().rec.map(r => r[0]);
  ok(by('su-recs').items.every(r => recT.includes(r.title)) && by('su-recs').items.map(r => recT.indexOf(r.title)).every((v, i, a) => !i || v > a[i - 1]), `${label}: procurement actions are Summary recommendations, in the Summary's order (${by('su-recs').items.length})`);
  /* S12–S15 (proven 24 Nov 2026): each value on the new screens is recomputed here from its documented formula and the
     engine's inputs (not through CGShared), and compared with the original tab's own rendered text where the tab shows it. */
  const rowOf = (html, id) => { const i = html.indexOf(`<tr><td>${id}</td>`); return i < 0 ? null : html.slice(i, html.indexOf('</tr>', i)); };
  if (!by('df-unavailable')) {
    const dfH2 = A.html('Demand forecast'); let n12 = 0, seen12 = 0;
    const cl = by('df-rows').columns.findIndex(c => c.field === 'range.lo'), ch = by('df-rows').columns.findIndex(c => c.field === 'range.hi');
    for (const r of by('df-rows').rows) { const F = r.ref.f, lo = Math.max(0, F.s3 - 1.28 * F.rm * Math.sqrt(3)), hi = F.s3 + 1.28 * F.rm * Math.sqrt(3);
      if (!sameNum(r.cells[cl], lo) || !sameNum(r.cells[ch], hi)) n12++; const row = rowOf(dfH2, r.ref.id); if (row) { seen12++; if (!row.includes(`${A.f(lo)}–${A.f(hi)}`)) n12++; } }
    ok(n12 === 0 && seen12 > 0, `${label}: S12 3-month range = max(0, s3 − 1.28·RMSE·√3) to s3 + 1.28·RMSE·√3, recomputed here for ${by('df-rows').rows.length} products; the ${seen12} on the tab's first page show the same text`);
  }
  if (R.hasF) {
    const faH2 = A.html('Forecast accuracy'); let n13 = 0, seen13 = 0;
    const c13 = by('fa-items').columns.findIndex(c => c.field === 'biasGBP'); let unk13 = 0;
    for (const r of by('fa-items').rows) { const v = r.ref.x.fcu * r.ref.x.cost; if (!fin(v)) unk13++; if (!sameNum(r.cells[c13], v)) n13++; const row = rowOf(faH2, r.ref.id); if (row) { seen13++; if (!row.includes(`<td>${A.gbp(v)}</td>`)) n13++; } }
    ok(n13 === 0 && seen13 > 0, `${label}: S13 bias £ at cost = bias units × unit cost, recomputed here for ${by('fa-items').rows.length} products (${unk13} without a cost or bias, shown as unavailable); the ${seen13} on the tab's first page show the same £ text`);
    const cs = by('fa-consistency'), warn = /Unusually consistent accuracy/.test(faH2), m = faH2.match(/products \(([^)]*)%\) show accuracy of/);
    ok((cs.status === 'warning') === warn && (!warn || (m && m[1] === A.f(cs.value))), `${label}: S14 consistency warning ${warn ? `shown, ${m && m[1]}% as on the tab` : 'not shown, as on the tab'}`);
  }
  { const V15 = { ins: 'Existing ROP insufficient', exc: 'Existing ROP possibly excessive' }; let n15 = 0, k15 = 0;
    for (const id of ['rp-items', 'rp-items-rm']) for (const r of by(id).rows) { const x = r.ref; if (/^Not Assessed/.test(x.verdict) || x.verdict === 'No reorder point configured' || !(x.d > 0)) continue; k15++;
      const dl = x.d * x.lt, want = x.verdict === V15.ins ? `Workbook ROP covers ${A.f(x.rop / x.d, 1)} days of demand but lead time is ${A.f(x.lt, 1)} d: demand during lead time is ${A.f(dl)} units, leaving ${A.f(x.rop - dl)} before any safety stock.`
        : x.verdict === V15.exc ? `Workbook ROP covers ${A.f(x.rop / x.d, 1)} days of demand against a ${A.f(x.lt, 1)} d lead time (${A.f(x.rop / (dl || 1), 1)}× lead-time demand); calculated ROP is ${A.f(x.ropR)}.` : 'Within ±20% of the calculated value.';
      if (r.cells[r.cells.length - 1] !== want) n15++; }
    ok(n15 === 0 && k15 > 0, `${label}: S15 'Why' rebuilt here from demand, lead time and reorder points (days of cover = ROP ÷ demand/day; lead-time demand = demand/day × lead time; gap = ROP − lead-time demand) for ${k15} items`); }
  /* S11 (Stage 3B Phase 2): the Excess screen's cards are the original tab's own cards. Expected values are read from the
     original tab's rendered HTML (label, £ figure, partial counts), not from the view-models or their traces. */
  const exHtml = A.html('Excess & dead stock'), card = lbl => { const m = exHtml.match(new RegExp('<div><b>([^<]*)</b><span>' + lbl + '[^<]*(?:<strong data-x1="partial">partial</strong>: (\\d+) of (\\d+) items)?')); return m && { txt: m[1], n: m[2] ? +m[2] : null, of: m[3] ? +m[3] : null }; };
  for (const [id, lbl] of [['ex-uncommitted', 'Uncommitted stock value'], ['ex-physical', 'Physical stock value'], ['ex-listed-value', 'Potential excess value']]) {
    const o = card(lbl), vm = by(id), c = vm.completeness;
    const shown = vm.value === null ? null : A.gbp(vm.value);
    ok(o && shown === o.txt && (o.n === null ? c.status === 'complete' : (c.status === 'partial' && c.included === o.n && c.of === o.of)), `${label}: ${id} shows the original Excess tab's "${lbl}" card (${o ? o.txt + (o.n === null ? ', complete' : `, partial ${o.n} of ${o.of}`) : 'card not found'})`);
  }
  const exM = S.shared.excessModel(), cnt = exHtml.match(/^<div class="card"><div class="k"><div><b>(\d+)<\/b>/);
  ok(cnt && by('ex-listed').value === +cnt[1] && by('ex-items').rows.length === +cnt[1], `${label}: items listed and table rows equal the original tab's count (${cnt && cnt[1]})`);
  ok(JSON.stringify(by('ex-items').rows.map(r => r.ref.id)) === JSON.stringify(exM.a.map(x => x.id)), `${label}: Excess table lists the original tab's items in the original order`);
  ok(by('ex-items').rows.every((r, i) => sameNum(r.cells[3], exM.uc(exM.a[i])) && (exM.neg(exM.a[i]) ? r.cells[7] === null : sameNum(r.cells[7], exM.a[i].val))), `${label}: Excess table uncommitted quantity and value cells are the tab's own (unknown allocation and negative on-hand shown as unavailable)`);
  ok(all.every(vm => !vm.drill || V.NAV.primary.concat(V.NAV.utility).some(a => a.area === vm.drill.area)), `${label}: every drill-down targets an approved area`);
  ok(fin(S.shared.healthMean([...R.fg, ...R.rm].filter(x => x.score != null))) && S.shared.summaryModel().rec.length >= 1, `${label}: the view layer reaches the shared derived figures through CGEngine.current().shared`);
}

// ---- 5. approved navigation: SCIE-NAVIGATION-AND-SCREEN-SPEC-v1 (D-4, D-6, N-1 to N-6) ---------------------------------
{
  const A = load(), V = A.V, N = V.NAV;
  ok(JSON.stringify(N.primary.map(a => a.area)) === JSON.stringify(['Overview', 'Inventory', 'Demand & Planning', 'Procurement & Suppliers', 'Production', 'Scenarios & Recommendations']), 'six primary areas, in the approved order');
  ok(JSON.stringify(N.utility.map(a => a.area)) === JSON.stringify(['Reports', 'Data Management', 'Settings']), 'three separate utility areas outside the six: Reports, Data Management, Settings');
  ok(N.advanced && N.advanced.area === 'Advanced view', 'an Advanced view exists');
  const ov = N.primary[0];
  ok(ov.direct === true && ov.subs.length === 1 && ov.subs[0].tabs.join() === 'Overview', 'Overview is a direct destination (one subsection, no dropdown): the executive dashboard');
  ok(N.primary.slice(1).every(a => !a.direct && a.subs.length >= 2), 'the other five primary areas have subsections');
  const want = {
    'Inventory': [['stock', 'Finished goods,Materials'], ['health', 'Health'], ['excess', 'Excess & dead stock']],
    'Demand & Planning': [['forecast', 'Demand forecast'], ['accuracy', 'Forecast accuracy'], ['policy', 'Reorder policy']],
    'Procurement & Suppliers': [['buy', 'MRP'], ['suppliers', 'Suppliers'], ['reconciliation', '']],
    'Production': [['feasibility', 'Production feasibility'], ['attainment', '']],
    'Scenarios & Recommendations': [['recommendations', 'Summary'], ['comparison', 'Policy comparison']],
    'Reports': [['report', ''], ['workbook', '']],
    'Data Management': [['load', ''], ['quality', 'Data quality'], ['questions', 'Client questions'], ['confidence', 'Data confidence']],
    'Settings': [['thresholds', 'Settings']]
  };
  for (const a of N.primary.concat(N.utility)) if (want[a.area]) ok(JSON.stringify(a.subs.map(s => [s.id, s.tabs.join()])) === JSON.stringify(want[a.area]), `${a.area}: approved subsections and tab mapping`);
  const homes = [].concat(...N.primary.concat(N.utility).map(a => [].concat(...a.subs.map(s => s.tabs))));
  ok(homes.length === 17 && new Set(homes).size === 17 && A.ORDER.every(t => homes.includes(t)), 'each of the 17 original tabs has exactly one home');
  ok(N.primary.find(a => a.area === 'Scenarios & Recommendations').subs.some(s => s.tabs.includes('Policy comparison')), 'N-2: Policy comparison is under Scenarios & Recommendations');
  const rec = N.primary.find(a => a.area === 'Procurement & Suppliers').subs.find(s => s.id === 'reconciliation'), att = N.primary.find(a => a.area === 'Production').subs.find(s => s.id === 'attainment');
  ok(rec.original.join() === 'Data quality' && att.original.join() === 'Suppliers', 'N-3: moved sections link to their real source tabs (reconciliation → Data quality, attainment → Suppliers)');
  ok(N.primary.concat(N.utility).every(a => a.subs.every(s => Array.isArray(s.original) && s.original.every(t => A.ORDER.includes(t)))), 'every "See original tab" target is one of the 17 original tabs');
  ok(N.utility.find(a => a.area === 'Reports').subs.find(s => s.id === 'report').source === 'Summary', 'Reports › Management report uses the Summary source (one source of truth)');
  ok(N.filterScope === 'area', 'filters are scoped to one primary area (kept between its subsections, reset between areas)');
  const noProd = { R: { pr: [], bom: {} }, feas: { rows: [] } };
  ok(V.hasProduction(noProd) === false && !V.primary(noProd).some(a => a.area === 'Production') && V.primary(noProd).length === 5, 'Production (with Schedule attainment) is hidden when there is no BOM, no production history and no production orders (synthetic source)');
  ok(V.hasProduction({ R: { pr: [{}], bom: {} }, feas: { rows: [] } }) === true && V.hasProduction({ R: { pr: [], bom: { FG1: [] } }, feas: { rows: [] } }) === true && V.hasProduction({ R: { pr: [], bom: {} }, feas: { rows: [{}] } }) === true, 'Production is shown when production history, a BOM or production orders exist (each on its own)');
  ok(Object.isFrozen(N), 'the navigation map is frozen (cannot be changed at run time)');
}
// ---- 6. contract validator rejects bad view-models ------------------------------------------------------------------
{
  const V = load().V;
  const good = { id: 'x', area: 'Overview', title: 't', question: 'q', kind: 'kpi', unit: '£', value: 1, trace: { field: 'R.tot' }, provenance: { source: 'calculated', basis: 'b', fields: ['R.tot'] }, completeness: { status: 'complete', reasons: [] }, confidence: null, thresholds: [], drill: null };
  ok(V.validate(good).length === 0, 'validator accepts a valid KPI');
  const bads = [['NaN value', { value: NaN }], ['null value marked complete', { value: null }], ['no provenance', { provenance: undefined }], ['unknown source', { provenance: { source: 'guessed', basis: 'b', fields: ['x'] } }], ['partial without a reason', { completeness: { status: 'partial', reasons: [] } }], ['bad kind', { kind: 'pie' }], ['bad unit', { unit: 'parsecs' }]];
  for (const [n, d] of bads) ok(V.validate(Object.assign({}, good, d)).length > 0, `validator rejects: ${n}`);
  const chart = Object.assign({}, good, { kind: 'bar', labels: ['a', 'b'], series: [{ name: 's', data: [1], trace: [{ field: 'R.tot' }] }] });
  ok(V.validate(chart).length > 0, 'validator rejects a chart whose values do not match its labels');
  const tbl = Object.assign({}, good, { kind: 'table', unit: 'text', trace: { rows: 'R.fg' }, columns: [{ field: 'x', label: 'X' }], rows: [{ ref: {}, cells: [NaN] }] });
  ok(V.validate(tbl).length > 0, 'validator rejects a NaN table cell');
}

// ---- 7. no arithmetic in the view layer (blueprint G, phase 0) -------------------------------------------------------
function codeOnly(src) {
  // strip comments, strings, regex literals and template text (keeping ${...} expressions), so only code remains
  let o = '', i = 0, prev = '';
  const regexOk = () => /(^|[(,=:\[!&|?{};]|return|typeof|=>)\s*$/.test(o.slice(-12));
  while (i < src.length) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { i = src.indexOf('*/', i + 2) + 2; if (i < 2) break; continue; }
    if (c === '"' || c === "'") { i++; while (i < src.length && src[i] !== c) { if (src[i] === '\\') i++; i++; } i++; o += '""'; continue; }
    if (c === '`') { // template literal: drop its text, keep each ${...} expression and strip that expression recursively
      i++; o += '""';
      while (i < src.length && src[i] !== '`') {
        if (src[i] === '\\') { i += 2; continue; }
        if (src[i] === '$' && src[i + 1] === '{') {
          i += 2; let depth = 1, j = i, q = null;
          while (j < src.length && depth) { const ch = src[j]; if (q) { if (ch === '\\') j++; else if (ch === q) q = null; } else if (ch === "'" || ch === '"' || ch === '`') q = ch; else if (ch === '{') depth++; else if (ch === '}') depth--; j++; }
          o += '(' + codeOnly(src.slice(i, j - 1)) + ')'; i = j; continue;
        }
        i++;
      }
      i++; continue;
    }
    if (c === '/' && regexOk()) { i++; let cls = false; while (i < src.length && (src[i] !== '/' || cls)) { if (src[i] === '\\') i++; else if (src[i] === '[') cls = true; else if (src[i] === ']') cls = false; i++; } i++; while (/[a-z]/i.test(src[i] || '')) i++; o += 'RE'; continue; }
    o += c; i++;
  }
  return o;
}
function arithmetic(src) {
  const code = codeOnly(src), hits = [];
  const re = /\+\+|--|[+\-*/%](?!>)|\bMath\.|\.reduce\(|\bNumber\(|\bparseFloat\(|\bparseInt\(/g;
  let m; while ((m = re.exec(code))) { const before = code.slice(Math.max(0, m.index - 1), m.index); if (m[0] === '-' && before === '=') continue; hits.push(code.slice(Math.max(0, m.index - 25), m.index + 15).replace(/\s+/g, ' ')); }
  return hits;
}
ok(arithmetic('const a = b + c;').length === 1 && arithmetic('const f = (x) => x.y;').length === 0 && arithmetic('const s = `a + ${x.n}`; // 1+1').length === 0 && arithmetic('x.reduce((s,v)=>s,0)').length === 1 && arithmetic('const t = n * 2').length === 1 && arithmetic("if (/a+b/.test(s)) q();").length === 0, 'the arithmetic detector finds planted arithmetic and ignores strings, comments, regexes and arrows');
for (const f of VIEW_FILES.concat(UI_FILES)) {
  let src = js(f);
  if (f === 'views/contract.js') {
    const a = src.indexOf('// CGVM-ALLOW-BEGIN'), b = src.indexOf('// CGVM-ALLOW-END');
    ok(a > 0 && b > a && src.split('CGVM-ALLOW-BEGIN').length === 2, 'contract.js has exactly one allowed-arithmetic block');
    const block = src.slice(a, b);
    ok(/^\/\/ CGVM-ALLOW-BEGIN[^\n]*\n\s*function countWhere\(arr, where\) \{ let n = 0; for \(const x of arr\) if \(meets\(x, where\)\) n\+\+; return n; \}\n\s*function orderBy\(order\) \{/.test(block) && (block.match(/function /g) || []).length === 2, 'the allowed block contains only countWhere and orderBy');
    src = src.slice(0, a) + src.slice(b);
  }
  const h = arithmetic(src);
  ok(h.length === 0, `${f}: no arithmetic outside the allowed block${h.length ? ' — ' + h.slice(0, 3).join(' | ') : ''}`);
}

// ---- 8. the Stage 3B loader and its files (the checks check-globals gives index.html scripts) ------------------------------
{
  const app = js('app.js'), m = app.match(/const SCIE_UI=\[([^\]]*)\]/);
  ok(!!m, 'app.js declares the Stage 3B file list (SCIE_UI)');
  const files = m ? [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]) : [];
  ok(JSON.stringify(files) === JSON.stringify(['assets/vendor/chartjs-4.6.1/chart.umd.min.js', 'js/views/contract.js', 'js/views/areas.js', 'js/ui/format.js', 'js/ui/components.js', 'js/ui/screens.js', 'js/ui/shell.js']), 'loader order: Chart.js, contract, areas, format, components, screens, shell');
  ok(files.every(f => fs.existsSync(path.join(APP, f))), 'every loaded file exists');
  ok(fs.existsSync(path.join(APP, 'css/scie.css')) && /scie\.css/.test(app), 'the stylesheet exists and is loaded');
  ok(/if\(!D\|\|typeof D\.createElement!=='function'\|\|!D\.head\)return;/.test(app), 'the loader does nothing where there is no DOM (test harnesses)');
  ok(!/<script[^>]*(chart|views\/|ui\/)/.test(fs.readFileSync(path.join(APP, 'index.html'), 'utf8')), 'index.html script list unchanged (no Stage 3B tags)');
  const core = ['calculations.js', 'forecasting.js', 'app.js', 'excel-import.js', 'validation/x1-integrity.js', 'engine/engine-api.js'].map(js).join('\n');
  const ns = { 'views/contract.js': 'CGVM', 'views/areas.js': 'CGVM', 'ui/format.js': 'CGFmt', 'ui/components.js': 'CGUI', 'ui/screens.js': 'CGScreens', 'ui/shell.js': 'CGShell' };
  for (const [f, name] of Object.entries(ns)) {
    const src = js(f), code = codeOnly(src).trim();
    ok(/^\(function \(G\) \{/.test(code) && /\}\)\(typeof window !== "" \? window : globalThis\);$/.test(code), `${f}: one self-contained function (no top-level names of its own)`);
    ok(new RegExp(`G\\.${name}\\b`).test(src) && !new RegExp(`(const|let|var|function)\\s+${name}\\b`).test(core), `${f}: exposes ${name}, which no original file declares`);
  }
  ok(/\bChart\b/.test(js('ui/components.js')) && !/\bChart\s*=/.test(core), 'Chart.js is used only by the components, and no original file declares Chart');
}

// ---- 9. missing months in demand history: both demand charts put every value on its own month ----------------------------
// Truth comes from the fixture's dated Demand History rows, read here with SheetJS (not from the engine): for each calendar
// month, the product's rows; a month with exactly one usable row (Units_Sold a number >= 0) carries that row's recorded
// forecast; the statistical forecast starts the month after the last month with a usable row (the engine's documented
// rule for missing months at the end, forecasting.js gapSeg). The original chart's SVG points are converted back to slots.
{
  const FX = path.join(APP, 'tests/fixtures/forecast-gaps/forecast-gaps.xlsx'), A = load(), wb = XLSX.readFile(FX, { cellDates: true });
  const R = A.go(wb), S = A.V.source(), V = A.V;
  /* the sheet's dates are read here in local time; the engine keys months at UTC midnight: compare by calendar month */
  const rows = XLSX.utils.sheet_to_json(wb.Sheets['Demand History'], { defval: null }), ymL = d => `${d.getFullYear()}-${d.getMonth()}`, ymU = ms => { const d = new Date(ms); return `${d.getUTCFullYear()}-${d.getUTCMonth()}`; };
  const cal = [...new Set(rows.map(r => ymL(r.Month_Start)))].sort((a, b) => { const [ya, ma] = a.split('-').map(Number), [yb, mb] = b.split('-').map(Number); return ya - yb || ma - mb; });
  const usable = r => typeof r.Units_Sold === 'number' && isFinite(r.Units_Sold) && r.Units_Sold >= 0;
  const truth = id => cal.map(t => rows.filter(r => r.SKU === id && ymL(r.Month_Start) === t));
  const slotsOf = (svg, colour, n) => { const N = n + 12, slot = X => Math.round((X - 34) * (N - 1) / (640 - 68)), o = []; const re = new RegExp(`(?:<polyline[^>]*stroke="var\\(--${colour}\\)"[^>]*points="([^"]*)"|<circle cx="([\\d.]+)"[^>]*fill="var\\(--${colour}\\)")`, 'g'); let m; while ((m = re.exec(svg))) { if (m[1]) m[1].split(' ').forEach(q => o.push([slot(+q.split(',')[0]), q])); else o.push([slot(+m[2]), m[2]]); } return o; };
  const yOf = (svg, v, mx) => (230 - 34 - v / mx * (230 - 68)).toFixed(1);
  for (const id of ['FG001', 'FG002', 'FG003', 'FG004', 'FG007']) {
    const t = truth(id), recWant = t.map(rs => (rs.length === 1 && usable(rs[0]) && typeof rs[0].Forecast_Units === 'number' ? rs[0].Forecast_Units : null));
    const lastUse = t.map((rs, i) => (rs.some(usable) ? i : -1)).filter(i => i >= 0).pop(), statStart = lastUse + 1;
    const vm = V.forecastFor(S, id).find(v => v.id === 'df-chart'), ser = n => vm.series.find(s => s.name === n).data;
    ok(cal.every((m, i) => ymU(vm.labels[i].month) === m) && recWant.every((v, i) => ser('Existing workbook forecast (recorded)')[i] === v),
      `forecast gaps ${id}: new chart puts each recorded forecast on its own dated month (${recWant.filter(v => v !== null).length} of ${cal.length} months carry one)`);
    const F = S.fc[id], fs = ser('Statistical forecast');
    ok(fs.slice(0, statStart).every(v => v === null) && F.f.every((v, j) => fs[statStart + j] === v), `forecast gaps ${id}: new chart starts the statistical forecast at month ${statStart + 1} of the calendar (the month after the last usable month)`);
    const svg = A.fview(id), n = cal.length, rec = slotsOf(svg, 'o', n), st = slotsOf(svg, 'g', n);
    const recSlots = recWant.map((v, i) => (v === null ? -1 : i)).filter(i => i >= 0);
    ok(JSON.stringify(rec.map(r => r[0])) === JSON.stringify(recSlots), `forecast gaps ${id}: original chart draws the recorded forecast at slots ${JSON.stringify(recSlots)} (got ${JSON.stringify(rec.map(r => r[0]))})`);
    ok(st.length && Math.min(...st.map(q => q[0])) === lastUse && st.map(q => q[0]).sort((a, b) => a - b)[1] === statStart, `forecast gaps ${id}: original chart joins the forecast to the last usable month (slot ${lastUse}) and starts it at slot ${statStart}`);
  }
  { // FG005: one month recorded on two rows. The engine treats each row as a period (no gap, so the full row series is used);
    // both charts therefore use a row axis, and each row keeps its own recorded forecast.
    const id = 'FG005', t = truth(id), dupe = t.findIndex(rs => rs.length > 1), x = R.fg.find(y => y.id === id);
    const vm = V.forecastFor(S, id).find(v => v.id === 'df-chart'), recS = vm.series.find(s => s.name === 'Existing workbook forecast (recorded)').data;
    const byRow = rows.filter(r => r.SKU === id && usable(r)).map(r => r.Forecast_Units);
    ok(dupe >= 0 && x.h.length === cal.length + 1 && byRow.every((v, i) => recS[i] === v) && vm.notes.some(n => /more than one row/.test(n)), `forecast gaps FG005: duplicate month: new chart shows each row's own recorded forecast (${byRow.slice(dupe, dupe + 2).join(' and ')}) on a row axis and says why`);
    const svg = A.fview(id), rec = slotsOf(svg, 'o', x.h.length);
    ok(rec.length === byRow.length && rec.every((r, i) => r[0] === i), 'forecast gaps FG005: original chart draws the recorded forecast row by row, unchanged');
  }
  { // month labels: the engine keys months at UTC midnight; the label must name the same month in any browser time zone
    const got = ['America/New_York', 'Pacific/Auckland', 'UTC'].map(tz => require('child_process').execFileSync(process.execPath, ['-e', `globalThis.window=globalThis;${fs.readFileSync(path.join(APP, 'js/ui/format.js'), 'utf8')};process.stdout.write(window.CGFmt.month(${R.months[0]}))`], { env: Object.assign({}, process.env, { TZ: tz }) }).toString());
    ok(got.every(g => g === 'Nov 2025'), `chart month labels name the engine's month in any time zone (New York, Auckland, UTC: ${got.join(', ')})`);
  }
  { // FG006: two gaps leave only a 2-month final run: no statistical forecast, so no chart for it on either screen
    ok(!S.fc.FG006.ok && V.forecastFor(S, 'FG006').length === 0, 'forecast gaps FG006: under 6 consecutive months after the last gap: not forecast, no chart');
  }
}

console.log(`test-view-contract: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
