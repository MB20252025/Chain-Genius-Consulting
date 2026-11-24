/* Stage 3B Phase 0 (22 Nov 2026): the visualisation data contract and engine access point.
 * Blueprint: stage3-design/stage3b-readiness/STAGE3B-BLUEPRINT.md, section C. Architecture record: stage3-design/stage3b/ARCHITECTURE-DECISIONS.md.
 *
 * Rule: CHARTS NEVER CALCULATE. Every number in a view-model is taken from an engine output that already exists
 * (R, mrp(), feas(), fcAll(), fcCredAll(), qs(), confAreas(), x1Sum) and carries a `trace` saying exactly where it
 * came from. A view-model may select, filter, sort, label and count. It may not derive a business metric.
 * The only arithmetic in the view layer is inside the CGVM-ALLOW block below (counting items and sort order);
 * tests/test-view-contract.js fails the build if arithmetic appears anywhere else in js/views/ or js/ui/.
 *
 * Contract (every view-model object):
 *   { id, area, title, question, kind: 'kpi'|'bar'|'line'|'table'|'alert'|'recommendation', unit,
 *     value | {labels, series:[{name, data, trace:[...]}]} | {columns, rows},
 *     trace,                                    // where the number(s) came from (see TRACE below)
 *     provenance: { source: 'calculated'|'workbook'|'estimated'|'simulated', basis, fields: [...] },
 *     completeness: { status: 'complete'|'partial'|'unavailable', included, of, excluded, reasons: [...] },
 *     confidence: { rating, why } | null,       // from confAreas(); null when no confidence area applies
 *     thresholds: [{ label, value, trace }],    // optional reference lines, each traced like any value
 *     status: <engine status string> | null,    // e.g. a risk class; never invented
 *     drill: { area, view, filter } | null }
 * TRACE forms (resolved independently by the contract tests):
 *   {field:'R.exV'}                                     a value at a path
 *   {count:['R.fg','R.rm'], where:[['sev','>=',2]]}     number of items meeting every condition
 *   {partialSum:['R.fg','R.rm'], key:'val'}             x1Sum over the items (D4 partial total)
 *   {rows:'mrp', where:[...], order:[...], take:n}      table rows: each row keeps `ref` (the engine item) and cells
 *                                                       are the item's own fields named by the columns
 */
(function (G) {
  'use strict';
  const KINDS = ['kpi', 'bar', 'line', 'table', 'alert', 'recommendation'];
  const SOURCES = ['calculated', 'workbook', 'estimated', 'simulated'];
  const STATUSES = ['complete', 'partial', 'unavailable'];
  const UNITS = ['£', 'units', 'days', '%', 'items', 'orders', 'suppliers', 'issues', 'questions', 'score', 'units/month', 'text'];
  const isNum = v => typeof v === 'number' && isFinite(v);

  /* Engine access point: the ONLY place the view layer reads engine state. It goes through the engine's own API
   * (CGEngine.current() in js/engine/engine-api.js), because only the engine files may touch CFG, R or WB
   * (tests/test-a1-static.js). current() hands over exactly what the existing 17 tabs already use, without re-running
   * the analysis, so the new screens and the Advanced view share one result and no calculation is duplicated. */
  function source() {
    const c = CGEngine.current(), cred = c.forecastCredibility, fc = c.forecasts, fg = c.result.fg, ex = c.shared.excessModel();
    const memo = {}, lazy = (k, f) => (k in memo ? memo[k] : (memo[k] = f()));
    /* each reorder-policy row is a copy of its engine row whose 'Why' text is built the first time it is read. A copy, not
       an object inheriting from the engine row: an object used as a prototype is switched by V8 to a slower internal form,
       which made every later read of the engine rows slower (found 24 Nov 2026: source() 13.6 -> 36.2 ms at 5,000 items). */
    const withWhy = x => { let w; return Object.defineProperty(Object.assign({}, x), 'why', { enumerable: true, get() { return w === undefined ? (w = c.shared.ropWhy(x)) : w; } }); };
    return Object.freeze({
      R: c.result, CFG: c.settings, SETDEF: c.settingDefs,
      mrp: c.mrp, feas: c.feas, fc: fc, cred: cred,
      qs: c.clientQuestions, conf: c.confidence, x1Sum: c.x1Sum, shared: c.shared, coverBands: c.coverBands,
      /* the same keyed results as rows (id first), so tables can list them; the objects themselves are not altered */
      /* S13 (proven 24 Nov 2026): bias £ at cost per product, CGShared.biasValue, the function the Forecast accuracy tab calls */
      credRows: cred ? fg.filter(x => cred[x.id]).map(x => ({ id: x.id, c: cred[x.id], x, biasGBP: c.shared.biasValue(x) })) : [],
      /* Phase 2: each product row also carries its engine row (x), the forecast method's name, and S8 (the forecast over the
         display horizon, CGShared.fcNextSum, the function the Demand forecast tab calls) for products that are forecast;
         S12 (proven 24 Nov 2026): the indicative 80% range for the next 3 months, CGShared.fcRange3 */
      fcRows: fg.filter(x => fc[x.id]).map(x => ({ id: x.id, f: fc[x.id], x, method: c.methodNames[fc[x.id].best] || null, next: fc[x.id].ok ? c.shared.fcNextSum(fc[x.id]) : null, range: fc[x.id].ok ? c.shared.fcRange3(fc[x.id]) : null })),
      methodNames: c.methodNames,
      /* the Health tab's ABC figures, from the same shared function the tab calls (abcRows(R.fg,'FG'), abcRows(R.rm,'RM')) */
      abcFG: c.shared.abcStats(c.result.fg), abcRM: c.shared.abcStats(c.result.rm),
      /* S11: the Excess & dead stock tab's own listing and per-item values (CGShared.excessModel, the function the tab
         calls), and one row per listed item carrying the tab's displayed quantities. Selection only: each extra field is
         one of the tab's own helper results (uc, alK, neg) or a choice between existing fields, never a new figure. */
      /* S15 (proven 24 Nov 2026): reorder-policy rows carrying the tab's own 'Why' text (CGShared.ropWhy); built on first use */
      get rpFG() { return lazy('rpFG', () => c.result.fg.map(withWhy)); },
      get rpRM() { return lazy('rpRM', () => c.result.rm.map(withWhy)); },
      excess: ex,
      exRows: ex.a.map(x => Object.assign({}, x, {
        unc: ex.uc(x), alShown: ex.alK(x) ? x.al : null, usable: isNum(x.ua) ? x.ua : x.oh,
        negOH: ex.neg(x), valShown: ex.neg(x) ? null : x.val
      }))
    });
  }

  /* Path lookup: 'R.exV', 'feas.rows', 'fc.FG001.f'. Selection only. */
  function at(S, path) {
    let o = S;
    for (const k of path.split('.')) { if (o == null) return undefined; o = o[k]; }
    return o;
  }
  function items(S, list) {
    const out = [];
    for (const p of list) { const a = at(S, p); if (Array.isArray(a)) for (const x of a) out.push(x); }
    return out;
  }
  const ops = {
    '==': (a, b) => a === b, '!=': (a, b) => a !== b, '>': (a, b) => a > b, '>=': (a, b) => a >= b,
    '<': (a, b) => a < b, '<=': (a, b) => a <= b, 'null': a => a == null, 'set': a => a != null,
    'num': a => isNum(a), 'nonnum': a => !isNum(a),
    'in': (a, b) => b.indexOf(a) >= 0, 'nin': (a, b) => b.indexOf(a) < 0, 'match': (a, b) => typeof a === 'string' && new RegExp(b).test(a)
  };
  function field(x, k) { let o = x; for (const p of k.split('.')) { if (o == null) return undefined; o = o[p]; } return o; }
  function meets(x, where) {
    for (const [k, op, v] of where || []) if (!ops[op](field(x, k), v)) return false;
    return true;
  }

  // CGVM-ALLOW-BEGIN (counting and sort order only; tests/test-view-contract.js checks nothing else is here)
  function countWhere(arr, where) { let n = 0; for (const x of arr) if (meets(x, where)) n++; return n; }
  function orderBy(order) {
    return (a, b) => {
      for (const [k, dir, list, nulls] of order) {
        const p = field(a, k), q = field(b, k), pn = p == null, qn = q == null;
        if (p !== p || q !== q) continue; // NaN compares as equal (as the original tab comparators do: NaN - x is NaN, treated as 0)
        if (pn || qn) { if (pn && qn) continue; const first = nulls === 'first' ? -1 : 1; return pn ? first : -first; }
        const r = list ? list.indexOf(p) - list.indexOf(q) : (p === q ? 0 : (p < q ? -1 : 1));
        if (r) return dir === 'desc' && !list ? -r : r;
      }
      return 0;
    };
  }
  // CGVM-ALLOW-END

  function resolve(S, trace) {
    if (trace.field) return at(S, trace.field);
    if (trace.count) return countWhere(items(S, trace.count), trace.where);
    if (trace.partialSum) return S.x1Sum(items(S, trace.partialSum), trace.key);
    if (trace.shared) { const r = S.shared[trace.shared](items(S, trace.items).filter(x => meets(x, trace.where))); return trace.key ? field(r, trace.key) : r; }
    /* S14: the Forecast accuracy tab's consistency check, CGShared.faConsistency over faStats(credRows), as the tab calls it */
    if (trace.faConsistency) { const st = S.shared.faStats(S.credRows); return S.shared.faConsistency(st.ass, st.hi)[trace.faConsistency]; }
    /* S7: the Demand forecast tab's totals, CGShared.fcSum over the products it forecasts (R.fg with fc ok), as the tab calls it */
    if (trace.fcSum) return S.shared.fcSum(S.R.fg.filter(x => S.fc[x.id] && S.fc[x.id].ok), S.fc, trace.fcSum);
    if (trace.bands) return S.coverBands(items(S, [trace.bands]))[trace.key];
    if (trace.entry) { const o = at(S, trace.entry); return o ? o[trace.key] : undefined; }
    if (trace.rows) {
      let a = items(S, [trace.rows]).filter(x => meets(x, trace.where));
      if (trace.order) a = a.slice().sort(orderBy(trace.order));
      return trace.take ? a.slice(0, trace.take) : a;
    }
    throw new Error('unknown trace form');
  }

  /* Builders: package values; they never compute them. */
  function kpi(S, o) {
    const v = resolve(S, o.trace);
    return Object.assign({ kind: 'kpi', thresholds: [], status: null, drill: null, confidence: null }, o, {
      value: isNum(v) ? v : null,
      completeness: o.completeness || (isNum(v) ? { status: 'complete', reasons: [] } : { status: 'unavailable', reasons: ['the engine has no value for this figure'] })
    });
  }
  /* A money total under the X1/D4 rule: the engine total when it exists; otherwise the x1Sum partial total of the
   * assessable items, marked partial with the count excluded (never shown as a zero or as complete). */
  function total(S, o) {
    const v = at(S, o.field);
    if (isNum(v)) return kpi(S, Object.assign({}, o, { trace: { field: o.field } }));
    const t = S.x1Sum(items(S, o.items), o.key);
    const tr = { partialSum: o.items, key: o.key };
    if (!t.n) return Object.assign(kpi(S, Object.assign({}, o, { trace: tr })), { value: null, completeness: { status: 'unavailable', included: 0, of: t.of, excluded: t.of, reasons: ['no item can be valued'] } });
    return Object.assign({ kind: 'kpi', thresholds: [], status: null, drill: null, confidence: null }, o, {
      trace: tr, value: t.v,
      completeness: { status: 'partial', included: t.n, of: t.of, excluded: countWhere(items(S, o.items), [[o.key, 'nonnum']]), reasons: ['Not Assessed items are excluded from this total (X1 decision D4)'] }
    });
  }
  /* Product demand timeline (Demand forecast): history by calendar month, then the forecast horizon. Selection only:
   * every value is an engine field; the series are padded with nulls so history and forecast sit side by side.
   * History uses the calendar-aligned series (x.hc, the engine's D6 alignment, gaps as unknown) when it exists, as the
   * original chart does; the recorded workbook forecast (x.fc, one value per valid history row x.hd) is placed on its
   * own month by matching x.hd to the calendar month. */
  function timeline(S, o) {
    const x = o.row, F = o.fc, cal = Array.isArray(x.hc) && x.hc.length >= x.h.length;
    const keys = cal ? (V_at(S, 'R.months') || []) : x.hd, hist = cal ? x.hc : x.h;
    const num = v => (isNum(v) ? v : null);
    /* Recorded workbook forecast (x.fc, one value per usable history row, dated by x.hd). Calendar axis: each value on its
       own month; a month recorded on more than one row has no single recorded value (gap). Row axis (a month recorded twice
       makes the engine treat each row as a period): row by row, as the engine and the original chart do. */
    const wb = Array.isArray(x.fc) ? (cal ? keys.map(t => { const k = (x.hd || []).indexOf(t); return k >= 0 && x.hd.lastIndexOf(t) === k ? num(x.fc[k]) : null; }) : x.fc.map(num)) : keys.map(() => null);
    /* Statistical forecast placement (engine rule, forecasting.js gapSeg/fcast): with missing month(s) at the end (F.trail),
       the forecast starts the month after the last observed month, so its first values fall on those missing months. */
    const trail = cal && F.trail > 0, lastObs = trail ? hist.map((v, i) => (isNum(v) ? i : null)).filter(i => i !== null).pop() : null;
    const place = arr => { const q = arr.slice(); const inCal = keys.map((t, i) => (trail && lastObs !== null && i > lastObs ? num(q.shift()) : null)); return inCal.concat(q.map(num)); };
    const fS = place(F.f), fH = place(F.hi), fL = place(F.lo), extra = fS.slice(keys.length).map(() => null);
    const tr = (field, placeAs) => ({ row: x.id, field, place: placeAs, cal, trail: trail ? F.trail : 0 });
    const series = [
      { name: 'Actual demand', trace: [tr(cal ? 'hc' : 'h', 'history')], data: hist.map(num).concat(extra) },
      { name: 'Existing workbook forecast (recorded)', trace: [tr('fc', cal ? 'history-by-month' : 'history-by-row')], data: wb.concat(extra) },
      { name: 'Statistical forecast', trace: [tr('f', 'forecast')], data: fS },
      { name: 'High (80%)', trace: [tr('hi', 'forecast')], data: fH },
      { name: 'Low (80%)', trace: [tr('lo', 'forecast')], data: fL }
    ];
    const notes = [cal ? '' : 'A month is recorded on more than one row: the engine treats each row as a period, so the chart does too.', trail ? `The last ${F.trail} month(s) have no usable demand record: the forecast starts the month after the last observed month, as the engine computes it.` : ''].filter(Boolean);
    return Object.assign({ kind: 'line', thresholds: [], status: null, drill: null, confidence: null, completeness: { status: 'complete', reasons: [] } }, o, {
      row: undefined, fc: undefined, labels: keys.map(t => ({ month: t })).concat(o.horizon.slice(0, extra.length)), labelKind: 'month', series, timeline: true, notes
    });
  }
  const V_at = (S, p) => at(S, p);
  /* A money card exactly as the original tab's x1 card: the x1Sum total of the given items, complete when every item
   * has a value, otherwise partial with the count left out (never shown as a zero or as complete). */
  function x1Card(S, o) {
    const t = S.x1Sum(items(S, o.items), o.key), tr = { partialSum: o.items, key: o.key };
    const base = Object.assign({ kind: 'kpi', thresholds: [], status: null, drill: null, confidence: null }, o, { trace: tr });
    if (!t.n) return Object.assign(base, { value: null, completeness: { status: 'unavailable', included: 0, of: t.of, excluded: t.of, reasons: [o.why || 'no item can be valued'] } });
    if (t.n === t.of) return Object.assign(base, { value: t.v, completeness: { status: 'complete', included: t.n, of: t.of, reasons: [] } });
    return Object.assign(base, { value: t.v, completeness: { status: 'partial', included: t.n, of: t.of, excluded: countWhere(items(S, o.items), [[o.key, 'nonnum']]), reasons: [o.why || 'items without a value are left out'] } });
  }
  function table(S, o) {
    /* An unknown number (NaN or infinite) is carried as null, so no screen or chart can show "NaN" (as for exports). */
    const cell = v => (typeof v === 'number' && !isNum(v) ? null : v);
    /* cells are built when a row is first read, so a long table costs only the rows a screen draws (the screens show the
       first 100 until 'Show all'); the values are the same whenever they are read (24 Nov 2026, performance) */
    const rows = resolve(S, o.trace).map(x => { let cs = null; return { ref: x, get cells() { return cs || (cs = o.columns.map(c => cell(field(x, c.field)))); } }; });
    return Object.assign({ kind: 'table', thresholds: [], status: null, drill: null, confidence: null, completeness: { status: 'complete', reasons: [] } }, o, { rows });
  }
  function bars(S, o) {
    const series = o.series.map(s => ({ name: s.name, trace: s.trace, data: s.trace.map(t => { const v = resolve(S, t); return isNum(v) ? v : null; }) }));
    return Object.assign({ kind: 'bar', thresholds: [], status: null, drill: null, confidence: null, completeness: { status: 'complete', reasons: [] } }, o, { series });
  }
  function line(S, o) {
    const series = o.series.map(s => { const d = at(S, s.field); return { name: s.name, trace: [{ field: s.field }], data: Array.isArray(d) ? d.map(v => (isNum(v) ? v : null)) : [] }; });
    return Object.assign({ kind: 'line', thresholds: [], status: null, drill: null, confidence: null, completeness: { status: 'complete', reasons: [] } }, o, { series });
  }
  /* Bars over the keys of an engine object (e.g. R.fam: value by product family), largest first. */
  function entryBars(S, o) {
    const obj = at(S, o.entry) || {};
    const keys = Object.keys(obj).map(k => ({ k, v: obj[k] })).sort(orderBy([['v', 'desc', null, 'last']])).map(e => e.k);
    const take = o.take ? keys.slice(0, o.take) : keys;
    return bars(S, Object.assign({}, o, { labels: take, series: [{ name: o.seriesName || 'Value', trace: take.map(k => ({ entry: o.entry, key: k })) }] }));
  }
  /* Bars over engine rows (one bar per item), each series an existing field of the row. */
  function rowBars(S, o) {
    const rows = resolve(S, o.trace);
    const labels = rows.map(x => field(x, o.label));
    const series = o.series.map(s => ({ name: s.name, trace: rows.map(x => ({ row: field(x, o.label), field: s.field })), data: rows.map(x => { const v = field(x, s.field); return isNum(v) ? v : null; }) }));
    return Object.assign({ kind: 'bar', thresholds: [], status: null, drill: null, confidence: null, completeness: { status: 'complete', reasons: [] } }, o, { labels, series, rowsTrace: o.trace });
  }
  /* Prioritised recommendations: exactly the Summary's own list (CGShared.summaryModel().rec), not a second implementation. */
  function recommendations(S, o) {
    /* o.titleMatch (Phase 2): only the Summary's recommendations whose title matches, in the Summary's order (selection) */
    const rec = S.shared.summaryModel().rec.filter(r => !o.titleMatch || new RegExp(o.titleMatch).test(r[0]));
    const take = o.take ? rec.slice(0, o.take) : rec;
    return Object.assign({ kind: 'recommendation', unit: 'text', thresholds: [], status: null, drill: null, confidence: null, completeness: { status: 'complete', reasons: [] }, trace: { summaryRec: o.take || 'all', titleMatch: o.titleMatch || null } }, o, {
      items: take.map(r => ({ title: r[0], reason: r[1], action: r[2], confidence: r[3] }))
    });
  }
  function confFor(S, name) {
    for (const c of S.conf) if (c.area === name) return { rating: c.rating, why: c.why };
    return null;
  }

  /* Contract validator: returns a list of problems (empty = valid). Used by tests and, in development, by the UI. */
  function validate(vm) {
    const e = [], need = (c, m) => { if (!c) e.push(`${vm && vm.id}: ${m}`); };
    need(vm && typeof vm === 'object', 'not an object');
    if (!vm) return e;
    for (const k of ['id', 'area', 'title', 'question']) need(typeof vm[k] === 'string' && vm[k].length, `missing ${k}`);
    need(KINDS.indexOf(vm.kind) >= 0, `bad kind ${vm.kind}`);
    need(UNITS.indexOf(vm.unit) >= 0, `bad unit ${vm.unit}`);
    need(vm.provenance && SOURCES.indexOf(vm.provenance.source) >= 0, 'provenance.source missing or invalid');
    need(vm.provenance && typeof vm.provenance.basis === 'string' && vm.provenance.basis.length, 'provenance.basis missing');
    need(vm.provenance && Array.isArray(vm.provenance.fields) && vm.provenance.fields.length, 'provenance.fields missing');
    need(vm.completeness && STATUSES.indexOf(vm.completeness.status) >= 0, 'completeness.status invalid');
    need(vm.completeness && Array.isArray(vm.completeness.reasons), 'completeness.reasons missing');
    if (vm.completeness && vm.completeness.status !== 'complete') need(vm.completeness.reasons.length, 'a partial or unavailable figure must say why');
    need(vm.confidence === null || (vm.confidence && typeof vm.confidence.rating === 'string'), 'confidence must be null or {rating, why}');
    need(Array.isArray(vm.thresholds), 'thresholds must be an array');
    need(vm.drill === null || (vm.drill && typeof vm.drill.area === 'string'), 'drill must be null or {area, ...}');
    if (vm.kind === 'kpi') {
      need(vm.value === null || isNum(vm.value), 'kpi value must be a finite number or null');
      need(vm.trace && typeof vm.trace === 'object', 'kpi needs a trace');
      if (vm.value === null) need(vm.completeness && vm.completeness.status === 'unavailable', 'a null value must be marked unavailable (never shown as zero)');
    }
    if (vm.kind === 'bar' || vm.kind === 'line') {
      need(Array.isArray(vm.labels) && vm.labels.length, 'chart needs labels');
      need(Array.isArray(vm.series) && vm.series.length, 'chart needs series');
      for (const s of vm.series || []) {
        need(s.data.length === vm.labels.length, `series ${s.name}: ${s.data.length} values for ${vm.labels.length} labels`);
        need(s.data.every(v => v === null || isNum(v)), `series ${s.name}: values must be finite numbers or null (gaps)`);
        need(Array.isArray(s.trace) && s.trace.length, `series ${s.name}: missing trace`);
      }
    }
    if (vm.kind === 'recommendation') {
      need(Array.isArray(vm.items), 'recommendations need items');
      for (const r of vm.items || []) need(typeof r.title === 'string' && typeof r.reason === 'string' && typeof r.action === 'string', 'each recommendation needs title, reason and action');
    }
    if (vm.kind === 'table') {
      need(Array.isArray(vm.columns) && vm.columns.length, 'table needs columns');
      for (const c of vm.columns || []) need(typeof c.field === 'string' && typeof c.label === 'string', 'column needs field and label');
      need(Array.isArray(vm.rows), 'table needs rows');
      for (const r of vm.rows || []) need(r.ref && Array.isArray(r.cells) && r.cells.length === vm.columns.length, 'row needs ref and one cell per column');
      need((vm.rows || []).every(r => r.cells.every(c => typeof c !== 'number' || isNum(c))), 'table cells must not be NaN or infinite (use null for unknown)');
      need(vm.trace && vm.trace.rows, 'table needs a rows trace');
    }
    return e;
  }

  G.CGVM = Object.assign(G.CGVM || {}, {
    version: '3B-0', KINDS, SOURCES, STATUSES, UNITS,
    source, at, items, field, meets, orderBy, resolve, kpi, total, x1Card, timeline, table, bars, line, entryBars, rowBars, recommendations, confFor, validate
  });
})(typeof window !== 'undefined' ? window : globalThis);
