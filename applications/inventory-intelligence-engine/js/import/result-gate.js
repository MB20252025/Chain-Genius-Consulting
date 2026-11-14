/* Chain Genius – Supply Chain Intelligence Engine, Universal Data Import v1, Stage 2 (K4)
 * import/result-gate.js — withholds or labels engine outputs according to the adapter's gate specification
 * (Stage 2 Solution Design Report, E3 and E4). It never edits a number: a withheld output is replaced in a COPY of the engine
 * output by a frozen marker { withheld: true, reason }; a labelled output is listed with its label. The engine's own result is
 * never changed. Later stages (screens, dashboards, exports) must use only gated.result, never the raw engine output.
 *
 * Plain script, no build step, no asynchronous code, no network access, no browser storage, no engine globals.
 * Adds CGImport.resultGate. Independent of the other import modules.
 *
 * apply(engineOut, spec) -> frozen { status, withheld, labelled, notes, result }
 *   engineOut  the object CGEngine.runEngine() returns ({ result, mrp, feas, forecasts, forecastCredibility, clientQuestions, confidence })
 *   spec       the adapter's gate specification (adapter.js):
 *              { version: 'RG1',
 *                money: { withhold: bool, reasons: [code] },            money-derived outputs (E4 list below)
 *                clientQuestions: { withhold: bool, reason: code|null },  questions distorted by withheld currency (B11 pending)
 *                analyses: { demand|purchasing|production|materials: 'available'|'unavailable'|other },
 *                items: { [Item_ID]: { withhold: [{ analysis, reason }], labels: [{ analysis, status, code }] } } }
 *   status     'refused'    engineOut or spec malformed: nothing is released (result null)
 *              'restricted' something is withheld or labelled
 *              'complete'   nothing withheld or labelled
 * The money list was established from evidence: every output that changes when costs and prices change (Northstar with
 * per-item cost factors) — values, ABC, value rankings, health score and category, confidence, the dataset confidence table,
 * the value-ordered top list, supplier and reconciliation values, MRP values, feasibility shortage detail and the two
 * supplier-scenario variants (alt, altS). tests/test-import-adapter.js re-checks this against the engine on every run.
 */
(function (NS) {
  'use strict';
  const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  const isDate = v => Object.prototype.toString.call(v) === '[object Date]';
  const deepFreeze = o => { if (o && typeof o === 'object' && !Object.isFrozen(o) && !isDate(o)) { Object.freeze(o); Object.values(o).forEach(deepFreeze); } return o; };
  const clone = v => isDate(v) ? new Date(v.getTime()) : Array.isArray(v) ? v.map(clone) : isObj(v) ? Object.fromEntries(Object.keys(v).map(k => [k, clone(v[k])])) : v;

  // Result-level money outputs (in result, result.alt and result.altS).
  const RESULT_MONEY = ['tot', 'fgV', 'rmV', 'exV', 'exF', 'exR', 'shV', 'top', 'top10', 'cogsF', 'cogsR', 'fam', 'rg'];
  // Item-level money outputs: unit cost and price themselves, values, ABC, and the value-weighted health and confidence.
  const ITEM_MONEY = ['cost', 'price', 'val', 'ann', 'exVal', 'short', 'abc', 'cum', 'exposed', 'cat', 'score', 'hp', 'cw', 'conf', 'confWhy'];
  // Kept for a withheld item: identity and the stock quantities the adapter supplied (not analysis outputs).
  const ITEM_KEEP = new Set(['id', 'name', 'grp', 'sup', 'type', 'oh', 'al', 'ua', 'av', 'oo', 'ooI', 'rop', 'ss', 'moq', 'cost', 'price']);
  // Sections that belong to one analysis (withheld when it is stopped or blocked, labelled when its table was not supplied).
  const SECTIONS = {
    demand: [['forecasts'], ['forecastCredibility']],
    purchasing: [['result', 'sup'], ['result', 'supRisk'], ['result', 'recon'], ['result', 'po']],
    production: [['feas'], ['result', 'sched'], ['result', 'prRows']],
    materials: [['mrp'], ['result', 'bom'], ['result', 'bomS']]
  };
  const ROLE_ANALYSES = { fg: ['demand', 'production'], rm: ['materials', 'purchasing'] };

  function validSpec(s) {
    if (!isObj(s) || s.version !== 'RG1' || !isObj(s.money) || typeof s.money.withhold !== 'boolean' || !Array.isArray(s.money.reasons)) return false;
    if (!isObj(s.clientQuestions) || typeof s.clientQuestions.withhold !== 'boolean') return false;
    if (!isObj(s.analyses) || !Object.keys(SECTIONS).every(a => typeof s.analyses[a] === 'string')) return false;
    if (!isObj(s.items)) return false;
    return Object.values(s.items).every(e => isObj(e) && Array.isArray(e.withhold) && Array.isArray(e.labels) &&
      e.withhold.every(w => isObj(w) && typeof w.analysis === 'string' && typeof w.reason === 'string') &&
      e.labels.every(l => isObj(l) && typeof l.analysis === 'string' && typeof l.status === 'string'));
  }
  const validOut = o => isObj(o) && isObj(o.result) && Array.isArray(o.result.fg) && Array.isArray(o.result.rm) && Array.isArray(o.mrp) &&
    isObj(o.feas) && isObj(o.forecasts) && (o.forecastCredibility === null || isObj(o.forecastCredibility)) && Array.isArray(o.clientQuestions) && Array.isArray(o.confidence);   // forecastCredibility is null when no forecasts were supplied

  function apply(engineOut, spec) {
    const refused = why => deepFreeze({ status: 'refused', withheld: [], labelled: [], notes: [why], result: null });
    try {
      if (!validSpec(spec)) return refused('RESULT_GATE_SPEC_INVALID: the gate specification is missing or malformed; nothing is released.');
      if (!validOut(engineOut)) return refused('RESULT_GATE_ENGINE_OUTPUT_INVALID: the engine output is missing or malformed; nothing is released.');
      const out = clone(engineOut), withheld = [], labelled = [], notes = [];
      const W = reason => Object.freeze({ withheld: true, reason });
      const hold = (path, reason, count) => withheld.push({ path, reason, count: count === undefined ? 1 : count });
      const label = (path, text) => labelled.push({ path, label: text });
      const results = [['result', out.result], ['result.alt', out.result.alt], ['result.altS', out.result.altS]].filter(([, r]) => isObj(r));
      const itemsIn = r => [...(Array.isArray(r.fg) ? r.fg : []), ...(Array.isArray(r.rm) ? r.rm : []), ...(isObj(r.fgm) ? Object.values(r.fgm) : []), ...(Array.isArray(r.top) ? r.top : [])].filter(isObj);
      const allItems = () => [...results.flatMap(([, r]) => itemsIn(r)), ...out.mrp.map(m => m && m.x).filter(isObj)];

      // 0. The engine's internal cache (result.memo) holds copies of plans and item records; it is not an output and is never released.
      let cache = false;
      for (const [, r] of results) if ('memo' in r) { r.memo = W('ENGINE_CACHE_NOT_RELEASED'); cache = true; }
      if (cache) notes.push('The engine\u2019s internal cache (result.memo) is not an output and is never released.');

      // 1. Money (E4).
      if (spec.money.withhold) {
        const why = 'MONEY_WITHHELD: ' + spec.money.reasons.join(', ');
        for (const [p, r] of results) {
          RESULT_MONEY.forEach(k => { if (k in r) { r[k] = W(why); hold(p + '.' + k, why); } });
          ['recon', 'sup', 'supRisk'].forEach(k => { if (Array.isArray(r[k])) { r[k].forEach(x => { if (isObj(x) && 'val' in x) x.val = W(why); }); hold(p + '.' + k + '[*].val', why, r[k].length); } });
          if (p !== 'result' && 'dq' in r) { r.dq = W(why); hold(p + '.dq', why); }
        }
        let n = 0;
        allItems().forEach(x => ITEM_MONEY.forEach(k => { if (k in x) { x[k] = W(why); n++; } }));
        hold('item records [*].' + ITEM_MONEY.join('|'), why, n);
        out.mrp.forEach(m => { if (isObj(m) && 'val' in m) m.val = W(why); });
        hold('mrp[*].val', why, out.mrp.length);
        label('mrp', 'Row order is partly value-based; it is not meaningful while money is withheld.');
        if (Array.isArray(out.feas.rows)) { out.feas.rows.forEach(r => { if (isObj(r) && 'sd' in r) r.sd = W(why); }); hold('feas.rows[*].sd', why, out.feas.rows.length); }
        out.confidence = W(why); hold('confidence', why);
        notes.push('Money-derived outputs are withheld (' + spec.money.reasons.join(', ') + '): values, ABC, value rankings, health score and category, confidence and the money parts of the supplier scenarios. Quantities, cover, risk flags, forecasts and plans remain.');
      }
      if (spec.clientQuestions.withhold) {
        out.clientQuestions = W(spec.clientQuestions.reason || 'CLIENT_QUESTIONS_WITHHELD'); hold('clientQuestions', spec.clientQuestions.reason || 'CLIENT_QUESTIONS_WITHHELD');
      }

      // 2. Analyses (dataset level).
      for (const [a, paths] of Object.entries(SECTIONS)) {
        const st = spec.analyses[a];
        if (st === 'available') continue;
        for (const pth of paths) {
          const targets = pth[0] === 'result' ? results.map(([p, r]) => [p + '.' + pth[1], r, pth[1]]) : [[pth[0], out, pth[0]]];
          for (const [where, obj, key] of targets) {
            if (!(key in obj)) continue;
            if (st === 'unavailable') label(where, a + ' analysis not available: its table was not supplied');
            else { obj[key] = W('ANALYSIS_' + a.toUpperCase() + '_' + st.toUpperCase()); hold(where, 'ANALYSIS_' + a.toUpperCase() + '_' + st.toUpperCase()); }
          }
        }
      }

      // 3. Items (E3: the engine ran on the full population; only the blocked item's own outputs are withheld).
      for (const [id, e] of Object.entries(spec.items)) {
        e.labels.forEach(l => label('item ' + id + ' / ' + l.analysis, l.status + (l.code ? ' (' + l.code + ')' : '')));
        if (!e.withhold.length) continue;
        const why = 'ITEM_WITHHELD: ' + e.withhold.map(w => w.analysis + ' ' + w.reason).join('; ');
        let n = 0;
        allItems().filter(x => x.id === id).forEach(x => Object.keys(x).forEach(k => { if (!ITEM_KEEP.has(k) && !(x[k] && x[k].withheld === true)) { x[k] = W(why); n++; } }));
        if (isObj(out.forecasts) && id in out.forecasts) { out.forecasts[id] = W(why); n++; }
        if (isObj(out.forecastCredibility) && id in out.forecastCredibility) { out.forecastCredibility[id] = W(why); n++; }
        if (Array.isArray(out.mrp)) out.mrp.forEach(m => { if (isObj(m) && isObj(m.x) && m.x.id === id) Object.keys(m).forEach(k => { if (k !== 'x' && !(m[k] && m[k].withheld === true)) { m[k] = W(why); n++; } }); });
        if (isObj(out.feas) && Array.isArray(out.feas.rows)) out.feas.rows.forEach(r => { if (isObj(r) && isObj(r.o) && r.o.SKU === id) Object.keys(r).forEach(k => { if (k !== 'o' && !(r[k] && r[k].withheld === true)) { r[k] = W(why); n++; } }); });
        hold('item ' + id, why, n);
      }
      if (Object.values(spec.items).some(e => e.withhold.length))
        notes.push('Withheld items stayed in the engine run, so other items’ results are unchanged by the withholding; materials that depend on a withheld product through the BOM still include its demand.');
      const status = withheld.length || labelled.length ? 'restricted' : 'complete';
      return deepFreeze({ status, withheld, labelled, notes, result: out });
    } catch (err) { return refused('RESULT_GATE_INTERNAL: ' + (err && err.message ? err.message : String(err))); }
  }

  NS.resultGate = Object.freeze({ apply, RESULT_MONEY: Object.freeze(RESULT_MONEY.slice()), ITEM_MONEY: Object.freeze(ITEM_MONEY.slice()), ROLE_ANALYSES: deepFreeze(clone(ROLE_ANALYSES)) });
})(globalThis.CGImport = globalThis.CGImport || {});
