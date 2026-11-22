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

  /* Engine access point: the ONLY place the view layer reads engine state. Everything comes from functions the
   * existing application already uses to draw its 17 tabs, so new screens and the Advanced view share one source. */
  function source() {
    return Object.freeze({
      R: R, CFG: CFG, SETDEF: SETDEF,
      mrp: mrp(), feas: feas(), fc: fcAll(), cred: R.hasF ? fcCredAll() : null,
      qs: qs(), conf: confAreas(), x1Sum: x1Sum,
      /* the same keyed results as rows (id first), so tables can list them; the objects themselves are not altered */
      credRows: R.hasF ? R.fg.filter(x => fcCredAll()[x.id]).map(x => ({ id: x.id, c: fcCredAll()[x.id] })) : [],
      fcRows: R.fg.filter(x => fcAll()[x.id]).map(x => ({ id: x.id, f: fcAll()[x.id] }))
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
      for (const [k, dir, list] of order) {
        const p = field(a, k), q = field(b, k);
        const r = list ? list.indexOf(p) - list.indexOf(q) : (p === q ? 0 : (p == null ? 1 : q == null ? -1 : (p < q ? -1 : 1)));
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
  function table(S, o) {
    /* An unknown number (NaN or infinite) is carried as null, so no screen or chart can show "NaN" (as for exports). */
    const cell = v => (typeof v === 'number' && !isNum(v) ? null : v);
    const rows = resolve(S, o.trace).map(x => ({ ref: x, cells: o.columns.map(c => cell(field(x, c.field))) }));
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
    source, at, items, field, meets, resolve, kpi, total, table, bars, line, confFor, validate
  });
})(typeof window !== 'undefined' ? window : globalThis);
