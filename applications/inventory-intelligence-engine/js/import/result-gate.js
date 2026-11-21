/* Chain Genius – Supply Chain Intelligence Engine, Universal Data Import v1, Stage 2 (K4, revised in K7)
 * import/result-gate.js — withholds or labels engine outputs according to the adapter's gate specification
 * (Stage 2 Solution Design Report, E3 and E4; contract RG2, IMPORT-V1-STAGE2-RECORD.md "K7"). It never edits a number: a withheld
 * output is replaced in a COPY of the engine output by a frozen marker { withheld: true, reason }; a labelled output is listed
 * with its label. The engine's own result is never changed. Later stages (screens, dashboards, exports) must use only
 * gated.result and gated.disclosures, never the raw engine output.
 *
 * Plain script, no build step, no asynchronous code, no network access, no browser storage, no engine globals.
 * Adds CGImport.resultGate. Independent of the other import modules.
 *
 * apply(engineOut, spec) -> frozen { version, status, withheld, labelled, notes, disclosures, result }
 *   engineOut  the object CGEngine.runEngine() returns ({ result, mrp, feas, forecasts, forecastCredibility, clientQuestions, confidence })
 *   spec       the adapter's gate specification (adapter.js), contract RG2:
 *              { version: 'RG2',
 *                money: { withhold: bool, reasons: [code] },            money-derived outputs (E4 list below)
 *                clientQuestions: { withhold: bool, reason: code|null },  questions distorted by withheld currency (B11 pending)
 *                analyses: { demand|purchasing|production|materials: 'available'|'unavailable'|other },
 *                items: { [Item_ID]: { withhold: [{ analysis, reason }], labels: [{ analysis, status, code }] } },
 *                excluded: { [Item_ID]: { reason, role, itemName, itemUnit, sourceStock: [..], hint } },   left out of the Engine View
 *                dependants: { [Item_ID]: { components: [id], parents: [id] } },   for every excluded item, from the canonical BOM
 *                scrap: { column: 'supplied'|'not-mapped', assumed: [{ parent, component, basis, row }], invalid: [] } }   (invalid: always empty since Stage 3, D2; a declared invalid line refuses the result)
 *   status     'refused'    engineOut or spec malformed, or spec and engine output disagree: nothing is released (result null)
 *              'restricted' something is withheld or labelled, or an item was excluded
 *              'complete'   nothing withheld, labelled or excluded
 *
 * Output contract RG3 (Stage 3, 18 Nov 2026) = RG2 plus: a group total (exF, exR, exV, shV, cogsF, cogsR) that RG2 withheld because items
 * of its group were withheld is released as a frozen { value, partial: true, excludedItems: [{ id, reason }] } (owner decision D4);
 * consumers must test it with isPartial() and must never present it as a complete total (it throws on arithmetic and string use).
 * RG2 rules (K7). A released number never depends on a withheld, excluded or invalid input:
 *   R1 cross-check   every excluded item must be absent from the engine output; every item the BOM names but the engine did not
 *                    analyse must be declared excluded; the declared dependants must equal the BOM in the engine output; the
 *                    declared scrap basis must match the Engine View BOM line by line. Any disagreement refuses the whole result.
 *   R2 dependants    components of an excluded or demand-withheld product, have their
 *                    material and purchasing results withheld (their usage is incomplete or unknown).
 *   R3 feasibility   orders are judged in start order against a shared material pool; an order is withheld when its product is
 *                    withheld for production, uses an excluded component, or uses a material whose
 *                    pool was already affected by an excluded or withheld input. Its materials are then treated as affected for
 *                    every later order.
 *   R4 aggregates    group-ranked fields (ABC class, cumulative share) and excess, shortage and annual-value totals are withheld
 *                    for a group when any item in it is withheld for the analysis they come from; the confidence table and client
 *                    questions are withheld when any item's results are withheld. Stock-value totals stay: they use only on-hand
 *                    and cost, which no analysis block changes.
 *   R5 suppliers     supplier rows of any material whose results are withheld, and reconciliation, PO summary and scheduled-receipt
 *                    entries of a purchasing-withheld material, are withheld.
 *   R6 assumptions   results that use an assumed 0% scrap line are labelled SCRAP_ASSUMED_ZERO (caveated, never "complete").
 *   R7 safety net    any non-finite number still present in the released copy is withheld (NON_FINITE_VALUE).
 *   R8 disclosure    gated.disclosures lists the exclusions (reason, source quantities, hint), dependants, withheld totals and
 *                    assumptions, with sentences ready to display. Stage 3 must show them with the results.
 * The money list was established from evidence: every output that changes when costs and prices change (Northstar with
 * per-item cost factors). tests/test-import-adapter.js re-checks this against the engine on every run.
 */
(function (NS) {
  'use strict';
  // Stage 3 C-RG3 (18 Nov 2026): the OUTPUT contract is RG3 (a group total may be a partial-total object, see TOTAL_DEF and isPartial;
  // disclosures.partialTotals; scrap.invalid always empty). The INPUT specification the adapter writes is unchanged and stays RG2.
  const VERSION = 'RG3', SPEC_VERSION = 'RG2';
  const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  const isDate = v => Object.prototype.toString.call(v) === '[object Date]';
  const isStr = v => typeof v === 'string' && v.length > 0;
  const deepFreeze = o => { if (o && typeof o === 'object' && !Object.isFrozen(o) && !isDate(o)) { Object.freeze(o); Object.values(o).forEach(deepFreeze); } return o; };
  const clone = v => isDate(v) ? new Date(v.getTime()) : Array.isArray(v) ? v.map(clone) : isObj(v) ? Object.fromEntries(Object.keys(v).map(k => [k, clone(v[k])])) : v;
  const fin = v => typeof v === 'number' && isFinite(v);
  const uniq = a => [...new Set(a)].sort();

  // Result-level money outputs (in result, result.alt and result.altS).
  const RESULT_MONEY = ['tot', 'fgV', 'rmV', 'exV', 'exF', 'exR', 'shV', 'top', 'top10', 'cogsF', 'cogsR', 'fam', 'rg'];
  // Item-level money outputs: unit cost and price themselves, values, ABC, and the value-weighted health and confidence.
  const ITEM_MONEY = ['cost', 'price', 'val', 'ann', 'exVal', 'short', 'abc', 'cum', 'exposed', 'cat', 'score', 'hp', 'cw', 'conf', 'confWhy'];
  // Kept for an item whose analysis results are withheld: identity, the stock quantities the adapter supplied, and the stock value
  // (on-hand x cost; no analysis block changes it — money withholding still removes it).
  const ITEM_KEEP = new Set(['id', 'name', 'grp', 'sup', 'type', 'oh', 'al', 'ua', 'av', 'oo', 'ooI', 'rop', 'ss', 'moq', 'cost', 'price', 'val']);
  // Fields ranked across a whole group (fg or rm): they depend on every item in the group.
  const GROUP_FIELDS = ['abc', 'cum'];
  // Totals by group, and the analysis each comes from (R4).
  const GROUP_TOTALS = { fg: ['exF', 'shV', 'cogsF'], rm: ['exR', 'cogsR'], both: ['exV'] };
  // Stage 3 (owner decision D4, 16 Nov 2026): each group total is a plain sum of one item field (calculations.js line 172-173). When a
  // group is incomplete, the total is released as a PARTIAL total over the items whose value is released, never as a complete figure.
  const TOTAL_DEF = { exF: { groups: ['fg'], field: 'exVal' }, exR: { groups: ['rm'], field: 'exVal' }, exV: { groups: ['fg', 'rm'], field: 'exVal' },
    shV: { groups: ['fg', 'rm'], field: 'short' }, cogsF: { groups: ['fg'], field: 'ann' }, cogsR: { groups: ['rm'], field: 'ann' } };
  // A partial total: frozen { value, partial: true, excludedItems: [{ id, reason }] }. It cannot be used as a number by accident: any
  // arithmetic or comparison on it throws (non-enumerable valueOf / toPrimitive, so JSON and copies show only the three fields).
  const PARTIAL_MSG = 'partial total: read .value and disclose .excludedItems; it is not a complete total';
  const partialTotal = (value, excludedItems) => { const o = { value, partial: true, excludedItems: Object.freeze(excludedItems.map(e => Object.freeze(e))) };
    const no = () => { throw new TypeError(PARTIAL_MSG); };
    Object.defineProperty(o, 'valueOf', { value: no }); Object.defineProperty(o, Symbol.toPrimitive, { value: no }); return Object.freeze(o); };
  const isPartial = v => v !== null && typeof v === 'object' && v.partial === true && typeof v.value === 'number' && Array.isArray(v.excludedItems);
  // Sections that belong to one analysis (withheld when it is stopped or blocked, labelled when its table was not supplied).
  const SECTIONS = {
    demand: [['forecasts'], ['forecastCredibility'], ['result', 'fcm'], ['result', 'fcc']],
    purchasing: [['result', 'sup'], ['result', 'supRisk'], ['result', 'recon'], ['result', 'po'], ['result', 'sched']],
    production: [['feas'], ['result', 'prRows'], ['result', 'pr']],
    materials: [['mrp'], ['result', 'bom'], ['result', 'bomS']]
  };
  const ROLE_ANALYSES = { fg: ['demand', 'production'], rm: ['materials', 'purchasing'] };

  const idList = a => Array.isArray(a) && a.every(isStr);
  const line = l => isObj(l) && isStr(l.parent) && isStr(l.component) && typeof l.basis === 'string';
  function validSpec(s) {
    if (!isObj(s) || s.version !== SPEC_VERSION || !isObj(s.money) || typeof s.money.withhold !== 'boolean' || !Array.isArray(s.money.reasons)) return false;
    if (!isObj(s.clientQuestions) || typeof s.clientQuestions.withhold !== 'boolean') return false;
    if (!isObj(s.analyses) || !Object.keys(SECTIONS).every(a => typeof s.analyses[a] === 'string')) return false;
    if (!isObj(s.items) || !isObj(s.excluded) || !isObj(s.dependants) || !isObj(s.scrap)) return false;
    if (!Object.values(s.items).every(e => isObj(e) && Array.isArray(e.withhold) && Array.isArray(e.labels) &&
      e.withhold.every(w => isObj(w) && typeof w.analysis === 'string' && typeof w.reason === 'string') &&
      e.labels.every(l => isObj(l) && typeof l.analysis === 'string' && typeof l.status === 'string'))) return false;
    if (!Object.values(s.excluded).every(e => isObj(e) && isStr(e.reason) && Array.isArray(e.sourceStock))) return false;
    if (!Object.values(s.dependants).every(d => isObj(d) && idList(d.components) && idList(d.parents))) return false;
    const sc = s.scrap;
    return (sc.column === 'supplied' || sc.column === 'not-mapped') && Array.isArray(sc.assumed) && Array.isArray(sc.invalid) && sc.assumed.every(line) && sc.invalid.every(line);
  }
  const validOut = o => isObj(o) && isObj(o.result) && Array.isArray(o.result.fg) && Array.isArray(o.result.rm) && Array.isArray(o.mrp) && isObj(o.result.bomS) &&
    isObj(o.feas) && Array.isArray(o.feas.rows) && isObj(o.forecasts) && (o.forecastCredibility === null || isObj(o.forecastCredibility)) && Array.isArray(o.clientQuestions) && Array.isArray(o.confidence);   // forecastCredibility is null when no forecasts were supplied

  // R1: the specification must describe the engine output it is applied to.
  function crossCheck(o, spec) {
    const bad = [];
    const analysed = new Set([...o.result.fg, ...o.result.rm].filter(isObj).map(x => x.id));
    const lines = Object.values(o.result.bomS).flatMap(a => Array.isArray(a) ? a : [null]);
    if (lines.some(l => !isObj(l) || !isStr(l.SKU) || !isStr(l.Material_ID))) { bad.push('the engine BOM is malformed, so dependencies cannot be checked'); return bad; }
    const named = new Set(lines.flatMap(l => [l.SKU, l.Material_ID]));
    for (const id of Object.keys(spec.excluded)) {
      if (analysed.has(id) || (isObj(o.forecasts) && id in o.forecasts) || o.mrp.some(m => isObj(m) && isObj(m.x) && m.x.id === id)) bad.push(id + ' is declared excluded but is present in the engine output');
      if (id in spec.items) bad.push(id + ' is declared excluded but also has item gate entries');
      const d = spec.dependants[id];
      if (!d) { bad.push(id + ' is declared excluded but has no dependants entry'); continue; }
      const comps = uniq(lines.filter(l => l.SKU === id).map(l => l.Material_ID)), pars = uniq(lines.filter(l => l.Material_ID === id).map(l => l.SKU));
      if (JSON.stringify(comps) !== JSON.stringify(uniq(d.components)) || JSON.stringify(pars) !== JSON.stringify(uniq(d.parents)))
        bad.push(id + ': declared BOM dependants (components ' + uniq(d.components).join(',') + '; parents ' + uniq(d.parents).join(',') + ') differ from the engine BOM (components ' + comps.join(',') + '; parents ' + pars.join(',') + ')');
    }
    for (const id of Object.keys(spec.dependants)) if (!(id in spec.excluded)) bad.push(id + ' has a dependants entry but is not declared excluded');
    for (const id of named) if (!analysed.has(id) && !(id in spec.excluded)) bad.push(id + ' is named in the BOM but was neither analysed nor declared excluded');
    for (const id of Object.keys(spec.items)) if (!analysed.has(id) && !(id in spec.excluded)) bad.push(id + ' has item gate entries but is not in the engine output');
    const key = (p, c) => p + '\u0000' + c, byKey = new Map();
    lines.forEach(l => { const k = key(l.SKU, l.Material_ID); if (!byKey.has(k)) byKey.set(k, []); byKey.get(k).push(l.Scrap_Factor_Pct); });
    const assumed = new Set(spec.scrap.assumed.map(l => key(l.parent, l.component))), invalid = new Set(spec.scrap.invalid.map(l => key(l.parent, l.component)));
    for (const k of assumed) { const v = byKey.get(k); if (!v || !v.every(x => x === 0)) bad.push('scrap: line ' + k.replace('\u0000', '/') + ' is declared assumed 0% but the Engine View does not hold 0 for it'); }
    for (const k of invalid) bad.push('scrap: line ' + k.replace('\u0000', '/') + ' is declared invalid; invalid scrap is rejected by Stage 1 since Stage 3 (D2), so a result that declares one is refused');
    for (const [k, v] of byKey) if (v.some(x => !fin(x)) && !invalid.has(k)) bad.push('scrap: line ' + k.replace('\u0000', '/') + ' has no usable scrap value and is not declared invalid');
    if (spec.scrap.column === 'not-mapped') for (const k of byKey.keys()) if (!assumed.has(k)) bad.push('scrap: the column was not supplied, but line ' + k.replace('\u0000', '/') + ' is not declared assumed');
    return bad;
  }

  function apply(engineOut, spec) {
    const refused = (why, extra) => deepFreeze({ version: VERSION, status: 'refused', withheld: [], labelled: [], notes: [why].concat(extra || []), disclosures: null, result: null });
    try {
      if (!validSpec(spec)) return refused('RESULT_GATE_SPEC_INVALID: the gate specification is missing, malformed or not ' + SPEC_VERSION + '; nothing is released.');
      if (!validOut(engineOut)) return refused('RESULT_GATE_ENGINE_OUTPUT_INVALID: the engine output is missing or malformed; nothing is released.');
      const mismatch = crossCheck(engineOut, spec);
      if (mismatch.length) return refused('RESULT_GATE_SPEC_ENGINE_MISMATCH: the gate specification does not describe this engine output (' + mismatch.length + ' difference(s)); nothing is released.', mismatch);
      const out = clone(engineOut), withheld = [], labelled = [], notes = [];
      const W = reason => Object.freeze({ withheld: true, reason });
      const isW = v => isObj(v) && v.withheld === true;
      const hold = (path, reason, count) => withheld.push({ path, reason, count: count === undefined ? 1 : count });
      const label = (path, text) => labelled.push({ path, label: text });
      const results = [['result', out.result], ['result.alt', out.result.alt], ['result.altS', out.result.altS]].filter(([, r]) => isObj(r));
      const itemsIn = r => [...(Array.isArray(r.fg) ? r.fg : []), ...(Array.isArray(r.rm) ? r.rm : []), ...(isObj(r.fgm) ? Object.values(r.fgm) : []), ...(Array.isArray(r.top) ? r.top : [])].filter(isObj);
      const allItems = () => [...results.flatMap(([, r]) => itemsIn(r)), ...out.mrp.map(m => m && m.x).filter(isObj)];
      const fgIds = new Set(engineOut.result.fg.map(x => x.id)), rmIds = new Set(engineOut.result.rm.map(x => x.id));
      const supOf = new Map(engineOut.result.rm.filter(isObj).map(x => [x.id, x.sup]));
      const bomS = engineOut.result.bomS, comps = sku => uniq((bomS[sku] || []).map(l => l.Material_ID));
      const parentsOf = m => uniq(Object.values(bomS).flat().filter(l => l.Material_ID === m).map(l => l.SKU));

      // 0. The engine's internal cache (result.memo) holds copies of plans and item records; it is not an output and is never released.
      let cache = false;
      for (const [, r] of results) if ('memo' in r) { r.memo = W('ENGINE_CACHE_NOT_RELEASED'); cache = true; }
      if (cache) notes.push('The engine’s internal cache (result.memo) is not an output and is never released.');

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
        out.feas.rows.forEach(r => { if (isObj(r) && 'sd' in r) r.sd = W(why); }); hold('feas.rows[*].sd', why, out.feas.rows.length);
        out.confidence = W(why); hold('confidence', why);
        notes.push('Money-derived outputs are withheld (' + spec.money.reasons.join(', ') + '): values, ABC, value rankings, health score and category, confidence and the money parts of the supplier scenarios. Quantities, cover, risk flags, forecasts and plans remain.');
      }
      if (spec.clientQuestions.withhold && !isW(out.clientQuestions)) {
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

      // 3. Items: their own outputs (E3) and, from K7, the items and orders that depend on them (R2).
      const holds = new Map();   // id -> Map(analysis -> reason)
      const addHold = (id, analysis, reason) => { if (!holds.has(id)) holds.set(id, new Map()); if (!holds.get(id).has(analysis)) holds.get(id).set(analysis, reason); };
      for (const [id, e] of Object.entries(spec.items)) {
        e.labels.forEach(l => label('item ' + id + ' / ' + l.analysis, l.status + (l.code ? ' (' + l.code + ')' : '')));
        e.withhold.forEach(w => addHold(id, w.analysis, w.reason));
      }
      const demandHeld = uniq([...holds].filter(([id, m]) => fgIds.has(id) && m.has('demand')).map(([id]) => id));
      const dependantNotes = [];
      const dependOn = (comp, why, cause) => { if (!rmIds.has(comp)) return; addHold(comp, 'materials', why); addHold(comp, 'purchasing', why); dependantNotes.push({ itemId: comp, analyses: ['materials', 'purchasing'], reason: why, cause }); };
      for (const p of Object.keys(spec.excluded)) comps(p).forEach(c => dependOn(c, 'DEPENDS_ON_EXCLUDED_PARENT ' + p, p));
      for (const p of demandHeld) comps(p).forEach(c => dependOn(c, 'DEPENDS_ON_WITHHELD_DEMAND ' + p, p));
      // Stage 3 (D2): withholding on invalid scrap lines retired (a declared invalid line is refused by R1 above).
      const holdItem = (id, why) => {
        let n = 0;
        allItems().filter(x => x.id === id).forEach(x => Object.keys(x).forEach(k => { if (!ITEM_KEEP.has(k) && !isW(x[k])) { x[k] = W(why); n++; } }));
        for (const obj of [out.forecasts, out.forecastCredibility, out.result.fcm, out.result.fcc]) if (isObj(obj) && id in obj && !isW(obj[id])) { obj[id] = W(why); n++; }
        out.mrp.forEach(m => { if (isObj(m) && isObj(m.x) && m.x.id === id) Object.keys(m).forEach(k => { if (k !== 'x' && !isW(m[k])) { m[k] = W(why); n++; } }); });
        return n;
      };
      for (const [id, m] of holds) {
        const why = 'ITEM_WITHHELD: ' + [...m].map(([a, r]) => a + ' ' + r).join('; ');
        hold('item ' + id, why, holdItem(id, why));
      }
      // Production rows of production-withheld products.
      const prodHeld = new Set([...holds].filter(([id, m]) => fgIds.has(id) && m.has('production')).map(([id]) => id));
      for (const [p, r] of results) {
        let a = 0, b = 0;
        if (Array.isArray(r.pr)) r.pr.forEach((x, i) => { if (isObj(x) && prodHeld.has(x.id)) { r.pr[i] = W('ITEM_WITHHELD: production ' + x.id); a++; } });
        if (Array.isArray(r.prRows)) r.prRows.forEach((x, i) => { if (isObj(x) && prodHeld.has(x.SKU)) { r.prRows[i] = W('ITEM_WITHHELD: production ' + x.SKU); b++; } });
        if (a) hold(p + '.pr (' + uniq([...prodHeld]).join(', ') + ')', 'ITEM_WITHHELD: production', a);
        if (b) hold(p + '.prRows (' + uniq([...prodHeld]).join(', ') + ')', 'ITEM_WITHHELD: production', b);
      }

      // R3: feasibility in start order against the shared pool.
      const directOrder = new Map();
      prodHeld.forEach(id => directOrder.set(id, 'PRODUCT_WITHHELD'));
      for (const ex of Object.keys(spec.excluded)) parentsOf(ex).forEach(p => { if (!directOrder.has(p)) directOrder.set(p, 'USES_EXCLUDED_COMPONENT ' + ex); });
      // Stage 3 (D2): no order is withheld for an invalid scrap line (retired; R1 refuses such a result).
      const purchHeld = new Set([...holds].filter(([id, m]) => rmIds.has(id) && m.has('purchasing') && !String(m.get('purchasing')).startsWith('DEPENDS_ON') && !String(m.get('purchasing')).startsWith('SCRAP_')).map(([id]) => id));
      const affected = new Map();   // material -> why its pool is affected
      Object.keys(spec.excluded).forEach(ex => { affected.set(ex, 'EXCLUDED_COMPONENT ' + ex); comps(ex).forEach(c => { if (!affected.has(c)) affected.set(c, 'POOL_WITHOUT_EXCLUDED_PARENT ' + ex); }); });
      purchHeld.forEach(m => { if (!affected.has(m)) affected.set(m, 'RECEIPTS_WITHHELD ' + m); });
      // Stage 3 (D2): invalid-scrap materials retired from the pool chain (R1 refuses such a result).
      let feasHeld = 0;
      if (!isW(out.feas)) out.feas.rows.forEach(r => {
        if (!isObj(r) || !isObj(r.o)) return;
        const sku = r.o.sku, mats = comps(sku);
        const why = directOrder.get(sku) || (mats.find(m => affected.has(m)) ? 'SHARED_POOL ' + affected.get(mats.find(m => affected.has(m))) : null);
        if (!why) return;
        Object.keys(r).forEach(k => { if (k !== 'o' && !isW(r[k])) r[k] = W('ORDER_WITHHELD: ' + why); });
        mats.forEach(m => { if (!affected.has(m)) affected.set(m, 'AFTER_WITHHELD_ORDER ' + r.o.id); });
        feasHeld++;
      });
      if (feasHeld) hold('feas.rows (' + feasHeld + ' orders)', 'ORDER_WITHHELD', feasHeld);

      // R5: suppliers, reconciliation, PO summary and scheduled receipts.
      const heldRm = new Set([...holds.keys()].filter(id => rmIds.has(id)));
      const heldSup = new Set([...heldRm].map(id => supOf.get(id)).filter(isStr));
      for (const [p, r] of results) {
        for (const k of ['sup', 'supRisk']) if (Array.isArray(r[k])) r[k].forEach(s => { if (isObj(s) && heldSup.has(s.id)) Object.keys(s).forEach(f => { if (f !== 'id' && f !== 'name' && !isW(s[f])) s[f] = W('SUPPLIER_DEPENDS_ON_WITHHELD_MATERIAL'); }); });
        if (Array.isArray(r.recon)) r.recon.forEach(x => { if (isObj(x) && purchHeld.has(x.id)) Object.keys(x).forEach(f => { if (f !== 'id' && f !== 'name' && !isW(x[f])) x[f] = W('ITEM_WITHHELD: purchasing'); }); });
        if (purchHeld.size && isObj(r.po)) { r.po = W('PO_SUMMARY_INCLUDES_WITHHELD_MATERIALS: ' + uniq([...purchHeld]).join(', ')); hold(p + '.po', 'PO_SUMMARY_INCLUDES_WITHHELD_MATERIALS'); }
        if (isObj(r.sched)) purchHeld.forEach(m => { if (m in r.sched && !isW(r.sched[m])) r.sched[m] = W('ITEM_WITHHELD: purchasing'); });
      }
      if (heldSup.size) hold('result.sup / supRisk (suppliers ' + uniq([...heldSup]).join(', ') + ')', 'SUPPLIER_DEPENDS_ON_WITHHELD_MATERIAL', heldSup.size);

      // R4: group-ranked fields and group totals.
      const heldFg = uniq([...holds].filter(([id, m]) => fgIds.has(id) && m.has('demand')).map(([id]) => id));
      const heldRmMat = uniq([...holds].filter(([id, m]) => rmIds.has(id) && m.has('materials')).map(([id]) => id));
      const aggregates = [], partials = [];
      // Items of each group left out of the Engine View (spec.excluded): they are in no engine total, so a total without them is incomplete.
      const exclOf = g => Object.entries(spec.excluded).filter(([, e]) => e.role === g).map(([id, e]) => ({ id, reason: 'EXCLUDED_FROM_ENGINE_VIEW: ' + e.reason }));
      for (const [p, r] of results) {
        // Group-ranked fields (ABC class, cumulative share) stay withheld when the group has withheld items, as before (D4 safeguard 4).
        // (Items only EXCLUDED from the Engine View keep the accepted K7 behaviour: ABC recalculated over the analysed items, disclosed.)
        const groups = { fg: heldFg, rm: heldRmMat };
        for (const [g, ids] of Object.entries(groups)) {
          if (!ids.length) continue;
          const why = 'DEPENDS_ON_WITHHELD_ITEMS (' + g + '): ' + ids.join(', ');
          let n = 0;
          itemsIn(r).filter(x => (g === 'fg' ? fgIds : rmIds).has(x.id)).forEach(x => GROUP_FIELDS.forEach(k => { if (k in x && !isW(x[k])) { x[k] = W(why); n++; } }));
          if (p === 'result') out.mrp.forEach(m => { if (isObj(m) && isObj(m.x) && (g === 'fg' ? fgIds : rmIds).has(m.x.id)) GROUP_FIELDS.forEach(k => { if (k in m.x && !isW(m.x[k])) m.x[k] = W(why); }); });
          if (n) hold(p + ' ' + g + ' items [*].abc|cum', why, n);
        }
        // Group totals (D4, the N3 case): where a total used to be withheld because its groups have withheld items, it is released as a
        // partial total over the items whose value is released, naming every left-out item and why (withheld items, and items excluded from
        // the Engine View); with no eligible item it stays withheld (never a misleading 0). Exclusion-only totals keep the accepted K7 form.
        for (const [k, def] of Object.entries(TOTAL_DEF)) {
          if (!(k in r) || isW(r[k]) || !def.groups.some(g => groups[g].length)) continue;
          const rows = def.groups.flatMap(g => Array.isArray(r[g]) ? r[g] : []), eligible = rows.filter(x => typeof x[def.field] === 'number' && isFinite(x[def.field]));
          const excludedItems = [...rows.filter(x => !eligible.includes(x)).map(x => ({ id: x.id, reason: isW(x[def.field]) ? x[def.field].reason : 'VALUE_NOT_AVAILABLE' })), ...def.groups.flatMap(exclOf)];
          if (!excludedItems.length) continue;
          if (!eligible.length) { const why = 'NO_ELIGIBLE_ITEMS: every item of ' + def.groups.join(' and ') + ' is excluded or withheld'; r[k] = W(why); hold(p + '.' + k, why); if (p === 'result') aggregates.push({ path: k, reason: why, becauseOf: excludedItems.map(e => e.id) }); continue; }
          const value = eligible.reduce((a, x) => a + x[def.field], 0);
          r[k] = partialTotal(value, excludedItems);
          labelled.push({ path: p + '.' + k, label: 'PARTIAL_TOTAL: ' + eligible.length + ' of ' + (eligible.length + excludedItems.length) + ' items; excluded: ' + excludedItems.map(e => e.id).join(', ') });
          if (p === 'result') partials.push({ path: k, value, partial: true, items: eligible.length, of: eligible.length + excludedItems.length, excludedItems: excludedItems.slice() });
        }
      }
      if (holds.size) {
        const why = 'DEPENDS_ON_WITHHELD_ITEMS: ' + uniq([...holds.keys()]).join(', ');
        if (!isW(out.confidence)) { out.confidence = W(why); hold('confidence', why); aggregates.push({ path: 'confidence', reason: why, becauseOf: uniq([...holds.keys()]) }); }
        if (!isW(out.clientQuestions)) { out.clientQuestions = W(why); hold('clientQuestions', why); aggregates.push({ path: 'clientQuestions', reason: why, becauseOf: uniq([...holds.keys()]) }); }
        notes.push('Items whose results are withheld stayed in the engine run (their stock quantities and stock value are released). Every result that depends on their withheld analysis is withheld too: dependent materials, orders, suppliers, group rankings and group totals.');
      }

      // R6: assumed 0% scrap.
      const assumedParents = uniq(spec.scrap.assumed.map(l => l.parent)), assumedComps = uniq(spec.scrap.assumed.map(l => l.component));
      if (spec.scrap.assumed.length) {
        const txt = 'caveated (SCRAP_ASSUMED_ZERO): ' + spec.scrap.assumed.length + ' BOM line(s) use an assumed 0% scrap (' + uniq(spec.scrap.assumed.map(l => l.basis)).join('; ') + ')';
        label('feas', txt + '; orders of ' + assumedParents.length + ' product(s)');
        label('mrp', txt + '; requirements of ' + assumedComps.length + ' material(s)');
        assumedComps.forEach(c => label('item ' + c + ' / materials', 'caveated (SCRAP_ASSUMED_ZERO)'));
        assumedParents.forEach(p => label('item ' + p + ' / production', 'caveated (SCRAP_ASSUMED_ZERO)'));
        label('result materials totals and rankings (exR, cogsR, exV, materials abc|cum)', txt + '; material usage is estimated with these lines');
      }

      // R7: nothing non-finite is released.
      let nonFinite = 0;
      const sweep = (o, path, depth) => {
        if (depth > 64 || !o || typeof o !== 'object' || isDate(o) || isW(o)) return;
        for (const k of Object.keys(o)) {
          const v = o[k];
          if (typeof v === 'number' && !isFinite(v)) { if (!Object.isFrozen(o)) { o[k] = W('NON_FINITE_VALUE'); nonFinite++; } }
          else if (v && typeof v === 'object') sweep(v, path + '.' + k, depth + 1);
        }
      };
      sweep(out, '', 0);
      if (nonFinite) { hold('non-finite values', 'NON_FINITE_VALUE', nonFinite); notes.push(nonFinite + ' value(s) that were not finite numbers were withheld (NON_FINITE_VALUE).'); }

      // R8: disclosures, ready for display.
      const exc = Object.entries(spec.excluded).map(([id, e]) => ({ itemId: id, itemName: e.itemName || null, reason: e.reason, analyses: 'all', itemUnit: e.itemUnit === undefined ? null : e.itemUnit,
        sourceStock: e.sourceStock, stockValue: 'not calculated', components: uniq(spec.dependants[id].components), parents: uniq(spec.dependants[id].parents), hint: e.hint || null }));
      const text = [];
      if (exc.length) {
        text.push(exc.length + ' item(s) were excluded from this analysis and from every total: ' + exc.map(x => x.itemId + ' (' + x.reason + ')').join('; ') + '. Totals, value rankings and ABC classes are calculated over the analysed items only, so they can differ from figures that include the excluded items.');
        exc.forEach(x => {
          const stock = x.sourceStock.map(s => s.onHandQty + (s.unitAsSupplied ? ' ' + s.unitAsSupplied : '') + ' at ' + s.locationId).join(', ');
          text.push(x.itemId + (x.itemName ? ' ' + x.itemName : '') + ': ' + x.reason + (x.itemUnit ? ' (item unit "' + x.itemUnit + '")' : '') + '. Source stock as supplied: ' + (stock || 'none') + '. Stock value not calculated.' + (x.hint ? ' ' + x.hint : ''));
          const liveParents = x.parents.filter(p => !(p in spec.excluded));
          if (liveParents.length) text.push('Orders for ' + liveParents.join(', ') + ' use ' + x.itemId + ', so their material feasibility is not shown.');
          if (x.components.length) text.push(x.itemId + ' uses ' + x.components.join(', ') + '; their material requirements would leave out ' + x.itemId + '’s usage, so their material and purchasing results are withheld.');
        });
      }
      const depByItem = new Map(); dependantNotes.forEach(d => { if (!depByItem.has(d.itemId)) depByItem.set(d.itemId, d); });
      const own = Object.entries(spec.items).filter(([, e]) => e.withhold.length).map(([id, e]) => id + ' (' + uniq(e.withhold.map(w => w.analysis)).join(', ') + ')');
      if (own.length) text.push('Results are withheld for ' + own.length + ' item(s) because Stage 1 blocked part of their data: ' + own.join('; ') + '. Their stock quantities and stock value are still shown.');
      if (heldFg.length) text.push('Demand-based results are withheld for ' + heldFg.join(', ') + '; ABC classes for finished goods depend on them and are withheld too; the excess, shortage and annual-value totals are released only as partial totals (see below).');
      if (heldRmMat.length) text.push('Material results are withheld for ' + heldRmMat.join(', ') + '; ABC classes for materials depend on them and are withheld too; the excess and annual-value totals are released only as partial totals (see below).');
      if (feasHeld) text.push(feasHeld + ' production order(s) are not assessed for feasibility because they depend on excluded or withheld information (directly, or through materials shared with an earlier order).');
      if (heldSup.size) text.push('Supplier results for ' + uniq([...heldSup]).join(', ') + ' are withheld because they include withheld materials.');
      if (spec.scrap.assumed.length) text.push('Scrap percentage: ' + (spec.scrap.column === 'not-mapped' ? 'not supplied' : 'blank on ' + spec.scrap.assumed.length + ' BOM line(s)') + '. 0% was assumed for these lines; material requirements, shortages and feasibility that use them are an estimate that assumes no scrap.');
      // Stage 3 (D2): the invalid-scrap disclosure text is retired (R1 refuses a result that declares an invalid line).
      if (partials.length) text.push('Partial totals (not complete totals): ' + partials.map(t => t.path + ' covers ' + t.items + ' of ' + t.of + ' items (excluded: ' + t.excludedItems.map(e => e.id).join(', ') + ')').join('; ') + '. Do not present them as complete exposure or financial totals.');
      const disclosures = { excluded: exc, dependants: [...depByItem.values()], withheldTotals: aggregates, partialTotals: partials, ordersWithheld: feasHeld,
        assumptions: spec.scrap.assumed.length ? [{ kind: 'scrap', value: 0, basis: uniq(spec.scrap.assumed.map(l => l.basis)), lines: spec.scrap.assumed.length, products: assumedParents, materials: assumedComps }] : [],
        invalid: [],   // Stage 3 (D2): always empty
        text };

      const status = withheld.length || labelled.length || exc.length ? 'restricted' : 'complete';
      return deepFreeze({ version: VERSION, status, withheld, labelled, notes, disclosures, result: out });
    } catch (err) { return refused('RESULT_GATE_INTERNAL: ' + (err && err.message ? err.message : String(err))); }
  }

  NS.resultGate = Object.freeze({ VERSION, SPEC_VERSION, apply, isPartial, RESULT_MONEY: Object.freeze(RESULT_MONEY.slice()), ITEM_MONEY: Object.freeze(ITEM_MONEY.slice()), ROLE_ANALYSES: deepFreeze(clone(ROLE_ANALYSES)) });
})(globalThis.CGImport = globalThis.CGImport || {});
