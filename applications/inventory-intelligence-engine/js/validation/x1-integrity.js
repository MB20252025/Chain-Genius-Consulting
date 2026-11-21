/* Chain Genius – Supply Chain Intelligence Engine, X1 numeric integrity: decision-independent foundations (WP1, WP2, WP4)
 * js/validation/x1-integrity.js — adds globalThis.CGValidation. Plain script, no build step, no dependency, no network, no browser storage,
 * no engine globals read or written (CFG, WB, R are never touched). Works in the browser and in Node tests.
 * Design: stage3-design/X1-NUMERIC-INTEGRITY-DESIGN-v2.md (draft, not approved). Authorised 20 Nov 2026 as decision-independent foundations.
 *
 * What it does: classifies every value of the seven X1 fields into an explicit state, keeps provenance, builds a calendar-indexed demand history
 * that never compresses gaps, and assesses which declared calculations have all their inputs in an accepted state.
 * What it does NOT do: apply unresolved field policies (D1, D3, D4, D6, D7). It never changes an engine figure, never substitutes a value and
 * never labels anything "Verified" (only a future independent CIS may). Text that looks like a number is classified 'invalid' here: the
 * text-number policy (Option C / XCRT) is a separate REVIEW decision.
 *
 * Main API (all results are frozen and JSON-safe; non-finite raw values are recorded as text):
 *   classify(raw, fieldName, { columnPresent })            -> { state, value, raw }
 *   fromDirectWorkbook(workbook, XLSX)                       -> integrity record for the direct route
 *   fromImport(stage1Result, mapping)                        -> integrity record for the import route (Stage 1 rows, issues and sources)
 *   calendarHistory(integrity, months)                       -> per item: one slot per month, gaps kept, and the history condition
 *   createRegistry() / DEFAULT_DEPENDENCIES / assess(integrity, registry, context) -> which calculations are available or withheld per record
 *   withheld(reason, detail)                                 -> { withheld: true, reason, ... } (the shape result-gate.js uses)
 *   forRun({ workbook, XLSX, imported, months, items, demandItems, context }) -> the integrity record
 *   forEngineResult({ workbook, XLSX, result, sup, imported }) -> forRun from an engine result: used by CGEngine.runEngine (out.integrity)
 *                                                              and by app.js run() in the browser (INTEG)
 */
(function (G) {
  'use strict';
  const VERSION = 'X1-F1', CONTRACT = 'NV1-draft';

  // ---- field-state model (design v2 §4) -------------------------------------------------------------------------------------------------
  const STATES = Object.freeze(['valid', 'zero', 'blank', 'column-absent', 'not-supplied', 'invalid', 'non-finite', 'negative-prohibited', 'assumed', 'not-applicable']);
  const ACCEPTED_DEFAULT = Object.freeze(['valid', 'zero']);   // states a calculation may use without any assumption (design v2 §10)

  // ---- the seven fields: descriptive facts only (CDv1 contract and engine column names). No unresolved policy is encoded here. -------------
  // negative: 'allowed' where the import contract keeps negatives (On_Hand_Qty: B6 Option D), otherwise 'prohibited' as in CDv1 (neg: 'no').
  // record: how a record is identified on the direct route (sheet columns) and on the import route (canonical fields).
  const F = (name, sheet, column, table, field, negative, status, direct, imported) => Object.freeze({ name, sheet, column, canonical: Object.freeze({ table, field }), negative, status, record: Object.freeze({ direct, imported }) });
  const FIELDS = Object.freeze({
    On_Hand_Qty: F('On_Hand_Qty', 'Inventory', 'On_Hand_Qty', 'stock', 'On_Hand_Qty', 'allowed', 'required', ['Item_ID'], ['Item_ID', 'Location_ID']),
    Allocated_Qty: F('Allocated_Qty', 'Inventory', 'Allocated_Qty', 'stock', 'Allocated_Qty', 'prohibited', 'optional at source; required for availability', ['Item_ID'], ['Item_ID', 'Location_ID']),
    On_Order_Qty: F('On_Order_Qty', 'Inventory', 'On_Order_Qty', 'stock', 'On_Order_Qty', 'prohibited', 'optional', ['Item_ID'], ['Item_ID', 'Location_ID']),
    Reorder_Point_Qty: F('Reorder_Point_Qty', 'Inventory', 'Reorder_Point_Qty', 'stock', 'Reorder_Point_Qty', 'prohibited', 'optional', ['Item_ID'], ['Item_ID', 'Location_ID']),
    Unit_Cost_GBP: F('Unit_Cost_GBP', 'Inventory', 'Unit_Cost_GBP', 'stock', 'Unit_Cost', 'prohibited', 'optional at source; required for money', ['Item_ID'], ['Item_ID', 'Location_ID']),
    Units_Sold: F('Units_Sold', 'Demand History', 'Units_Sold', 'demand', 'Units', 'prohibited', 'required where demand is supplied', ['SKU', 'Month_Start'], ['Item_ID', 'Period_Start']),
    Qty_Per_Finished_Unit: F('Qty_Per_Finished_Unit', 'BOM', 'Qty_Per_Finished_Unit', 'bom', 'Qty_Per', 'prohibited', 'required where a BOM is supplied', ['SKU', 'Material_ID'], ['Parent_Item_ID', 'Component_Item_ID'])
  });
  const FIELD_NAMES = Object.freeze(Object.keys(FIELDS));

  // ---- JSON-safe raw values: a record must survive JSON export unchanged (CIS needs the original input) --------------------------------------
  const isDate = v => Object.prototype.toString.call(v) === '[object Date]';
  function jsonSafe(v) {
    if (v === undefined) return { absent: true };
    if (v === null) return null;
    if (typeof v === 'number') return isFinite(v) ? v : { nonFinite: String(v) };
    if (isDate(v)) return isNaN(v.getTime()) ? { invalidDate: true } : { date: v.toISOString() };
    if (typeof v === 'string' || typeof v === 'boolean') return v;
    return { text: String(v) };
  }

  // ---- classification (WP1) ------------------------------------------------------------------------------------------------------------------
  // raw: the value as the route holds it (undefined = no cell; null = canonical missing value). columnPresent: false -> 'column-absent'.
  function classify(raw, fieldName, opts) {
    const f = FIELDS[fieldName]; if (!f) throw new Error('CGValidation.classify: unknown field ' + fieldName);
    const o = opts || {}, safe = jsonSafe(raw);
    const out = (state, value) => Object.freeze({ state, value: value === undefined ? null : value, raw: safe });
    if (o.columnPresent === false) return out('column-absent');
    if (raw === undefined || raw === null || (typeof raw === 'string' && raw.trim() === '')) return out('blank');
    if (typeof raw !== 'number') return out('invalid');                      // text, dates, booleans: never a quantity or cost here
    if (!isFinite(raw)) return out('non-finite');
    if (raw === 0) return out('zero', 0);
    if (raw < 0 && f.negative === 'prohibited') return out('negative-prohibited');
    return out('valid', raw);
  }

  // ---- provenance record (WP1): { field, record, route, source, state, value, raw, transformations, assumptions, reasons } -------------------
  function provenance(field, recordKey, route, source, cls, extra) {
    const e = extra || {};
    return Object.freeze({ field, record: recordKey, route, source: Object.freeze(Object.assign({}, source)), state: cls.state, value: cls.value, raw: cls.raw,
      transformations: Object.freeze((e.transformations || []).map(t => Object.freeze(Object.assign({}, t)))), assumptions: Object.freeze((e.assumptions || []).slice()),
      reasons: Object.freeze((e.reasons || []).slice()) });
  }
  const PERIOD_COLS = ['Month_Start', 'Period_Start'];   // period columns become the engine's month key on both routes (Date on direct, ISO text on import)
  const keyOf = (row, cols, exact) => cols.map(c => { const v = row[c]; if (PERIOD_COLS.includes(c) && (isDate(v) || typeof v === 'string')) { const k = periodKey(v); return k === null ? 'invalid-date' : k; } return v === undefined || v === null ? '' : exact ? String(v) : String(v).trim(); }).join('|');   // X1 completion: the direct route keeps identifiers exactly as the engine matches them (no trimming, so "RM050 " is not silently read as RM050)

  // ---- calendar periods: the SAME rule as the engine's reader (js/excel-import.js line 10, calDate): a cell date becomes UTC midnight of its
  // calendar day, whatever the machine's time zone. So the keys equal result.months exactly (e.g. 1 Nov 2025 = 1761955200000 in every zone).
  // Text dates (import route) are ISO dates read as UTC midnight. Nothing is rounded to a month: a mid-month date keeps its own day.
  const calDate = d => Math.round((d.getTime() - d.getTimezoneOffset() * 6e4) / 864e5) * 864e5;
  function periodKey(v) {
    if (isDate(v)) return isNaN(v.getTime()) ? null : calDate(v);
    if (typeof v === 'string') { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v.trim()); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : null; }
    return null;
  }

  function summarise(fields, records) {
    const out = {};
    for (const n of FIELD_NAMES) {
      const counts = {}; STATES.forEach(s => { counts[s] = 0; });
      records.filter(r => r.field === n).forEach(r => { counts[r.state]++; });
      out[n] = Object.freeze(Object.assign({}, fields[n], { counts: Object.freeze(counts) }));
    }
    return Object.freeze(out);
  }

  // ---- direct route adapter (WP4): reads the workbook the engine reads -----------------------------------------------------------------------
  function fromDirectWorkbook(wb, XL) {
    if (!wb || !wb.Sheets || !XL || !XL.utils) throw new Error('CGValidation.fromDirectWorkbook: a SheetJS workbook and XLSX are required');
    const fields = {}, records = [];
    const bySheet = {};
    for (const n of FIELD_NAMES) { const f = FIELDS[n]; (bySheet[f.sheet] = bySheet[f.sheet] || []).push(f); }
    for (const [sheet, fs] of Object.entries(bySheet)) {
      const ws = wb.Sheets[sheet];
      if (!ws) { fs.forEach(f => { fields[f.name] = { column: 'not-supplied', sheet }; }); continue; }
      const header = (XL.utils.sheet_to_json(ws, { header: 1 })[0] || []).map(h => String(h).trim());
      const rows = XL.utils.sheet_to_json(ws, { raw: true, cellDates: true });
      for (const f of fs) {
        const present = header.includes(f.column);
        fields[f.name] = { column: present ? 'present' : 'absent', sheet };
        if (!present) { records.push(provenance(f.name, '*', 'direct', { sheet, row: null, column: f.column }, classify(undefined, f.name, { columnPresent: false }), { reasons: ['the column is not in the sheet'] })); continue; }
        rows.forEach(r => {
          const row = r.__rowNum__ !== undefined ? r.__rowNum__ + 1 : null;
          records.push(provenance(f.name, keyOf(r, f.record.direct, true), 'direct', { sheet, row, column: f.column }, classify(r[f.column], f.name, { columnPresent: true })));
        });
      }
    }
    return Object.freeze({ version: VERSION, contract: CONTRACT, route: 'direct', fields: summarise(fields, records), records: Object.freeze(records) });
  }

  // ---- import route adapter (WP4): Stage 1 result + mapping. Stage 1 is not changed; its own decisions are recorded as transformations -------
  function fromImport(S1, mapping) {
    if (!S1 || typeof S1 !== 'object' || !S1.dataset || !mapping || !mapping.tables) throw new Error('CGValidation.fromImport: a Stage 1 result and its mapping are required');
    const fields = {}, records = [], issues = Array.isArray(S1.issues) ? S1.issues : [];
    const fileOf = t => { const m = mapping.tables[t]; return m && Array.isArray(m.sources) && m.sources[0] ? m.sources[0].file : null; };
    const mapped = (t, fld) => { const m = mapping.tables[t]; return !!(m && Array.isArray(m.sources) && m.sources.some(s => s && s.columns && Object.prototype.hasOwnProperty.call(s.columns, fld))); };
    for (const n of FIELD_NAMES) {
      const f = FIELDS[n], t = f.canonical.table, fld = f.canonical.field, file = fileOf(t);
      const supplied = !!mapping.tables[t], rows = Array.isArray(S1.dataset[t]) ? S1.dataset[t].filter(r => r && !r.__placeholder) : [];
      if (!supplied) { fields[n] = { column: 'not-supplied', table: t }; records.push(provenance(n, '*', 'import', { file: null, table: t, row: null, column: fld }, Object.freeze({ state: 'not-supplied', value: null, raw: { absent: true } }), { reasons: ['the ' + t + ' table was not supplied'] })); continue; }
      const present = mapped(t, fld);
      fields[n] = { column: present ? 'present' : 'absent', table: t, file };
      if (!present) { records.push(provenance(n, '*', 'import', { file, table: t, row: null, column: fld }, classify(undefined, n, { columnPresent: false }), { reasons: ['the field is not mapped to any column'] })); continue; }
      rows.forEach(r => {
        const src = r.__source || {};
        records.push(provenance(n, keyOf(r, f.record.imported), 'import', { file: src.file || file, table: t, row: src.row === undefined ? null : src.row, column: fld, location: r.Location_ID === undefined ? null : r.Location_ID },
          classify(r[fld], n, { columnPresent: true }), { transformations: [{ rule: 'Stage 1 CDv1 cleaning', ruleVersion: 'CDv1', from: 'source text', to: 'canonical value' }] }));
      });
      // Stage 1's own decisions on values that never reached the dataset: blanked costs and rejected rows (recorded, not re-decided)
      issues.filter(i => i && i.code === 'FIELD_BLANKED' && i.table === t && i.field === fld).forEach(i => (Array.isArray(i.rows) ? i.rows : []).forEach(b => {
        records.push(provenance(n, 'row ' + b.row, 'import', { file, table: t, row: b.row, column: fld }, Object.freeze({ state: 'invalid', value: null, raw: jsonSafe(b.value) }),
          { transformations: [{ rule: 'Stage 1 FIELD_BLANKED', ruleVersion: 'CDv1', from: 'unreadable value', to: 'blank' }], reasons: [String(b.reason || 'could not be read')] }));
      }));
      // owner D1(a)/Q4: a quarantined stock row makes its ITEM's stock unknown; recorded against the item key so the dependency check and the reasons see it
      if (t === 'stock' && n === 'On_Hand_Qty') issues.filter(i => i && i.code === 'ROW_QUARANTINED' && i.table === 'stock').forEach(i => (Array.isArray(i.rows) ? i.rows : []).forEach(x => {
        const qid = x.linkedItem || x.item; if (!qid) return;
        const why = (Array.isArray(x.reasons) ? x.reasons : []).map(q => typeof q === 'string' ? q : JSON.stringify(q));
        records.push(provenance(n, qid + '|', 'import', { file, table: t, row: x.row, column: fld }, Object.freeze({ state: 'invalid', value: null, raw: { quarantinedRow: true } }),
          { transformations: [{ rule: 'Stage 1 ROW_QUARANTINED (owner D1(a))', ruleVersion: 'CDv1', from: 'row', to: 'quarantined: not imported, item Not Assessed' }], reasons: ['stock row quarantined: ' + (why.join('; ') || 'invalid row')] }));
      }));
      issues.filter(i => i && i.code === 'ROW_REJECTED' && i.table === t).forEach(i => (Array.isArray(i.rows) ? i.rows : []).forEach(x => {
        const why = (Array.isArray(x.reasons) ? x.reasons : []).map(q => typeof q === 'string' ? q : JSON.stringify(q));
        if (!why.some(w => w.indexOf(fld) >= 0)) return;     // only rows rejected because of this field
        records.push(provenance(n, (x.item || '') + ' (row ' + x.row + ')', 'import', { file, table: t, row: x.row, column: fld }, Object.freeze({ state: 'invalid', value: null, raw: { rejectedRow: true } }),
          { transformations: [{ rule: 'Stage 1 ROW_REJECTED', ruleVersion: 'CDv1', from: 'row', to: 'not imported' }], reasons: why }));
      }));
    }
    return Object.freeze({ version: VERSION, contract: CONTRACT, route: 'import', fields: summarise(fields, records), records: Object.freeze(records) });
  }

  // ---- calendar-indexed demand history (WP1/D-foundation): gaps keep their position; nothing is filled ---------------------------------------
  // months: the analysis window exactly as the engine holds it (result.months). Condition per item (design v2 §9, C3):
  //   'complete'            every month usable (valid or recorded zero) and at least one valid quantity
  //   'recorded-zero'       every month usable and every one a recorded zero (genuine zero history)
  //   'partial'             some months usable, some missing
  //   'no-usable-history'   no usable month (no rows, or every value blank/invalid/non-finite/negative)
  // 'missing' is a slot state here; WHAT a missing month means (unknown or zero) is owner decision D6 and is not applied.
  function calendarHistory(integrity, months, items) {
    const win = (Array.isArray(months) ? months : []).filter(m => typeof m === 'number' && isFinite(m)), out = {};
    const usable = s => s === 'valid' || s === 'zero';
    const recs = integrity.records.filter(r => r.field === 'Units_Sold' && r.record !== '*');
    const byItem = new Map();
    recs.forEach(r => {
      const parts = String(r.record).split('|'), item = parts[0], period = parts.length > 1 && parts[1] !== '' && isFinite(+parts[1]) ? +parts[1] : null;
      if (!byItem.has(item)) byItem.set(item, []); byItem.get(item).push({ period, r });
    });
    const ids = new Set([...(items || []), ...byItem.keys()]);
    for (const id of ids) {
      const obs = byItem.get(id) || [], outside = obs.filter(o => o.period === null || !win.includes(o.period));
      const slots = win.map(m => {
        const here = obs.filter(o => o.period === m);
        if (!here.length) return Object.freeze({ period: m, state: 'missing', value: null, cause: 'no row', sources: Object.freeze([]) });
        const use = here.filter(o => usable(o.r.state));
        const st = use.length ? (use.every(o => o.r.state === 'zero') ? 'zero' : 'valid') : 'missing';
        const value = use.length ? use.reduce((a, o) => a + o.r.value, 0) : null;
        return Object.freeze({ period: m, state: st, value, cause: use.length ? null : here.map(o => o.r.state).join('+'), rows: here.length, sources: Object.freeze(here.map(o => o.r.source)) });
      });
      const nUse = slots.filter(s => s.state !== 'missing').length;
      // 'no-rows': the item has no demand row at all; 'no-usable-history': rows exist, none usable. Both mean demand UNKNOWN (owner D6 and Q1,
      // 21 Nov 2026); the two names are kept apart only so a report can say which it was.
      const condition = !win.length ? 'no-window' : !obs.length ? 'no-rows' : nUse === 0 ? 'no-usable-history' : nUse < slots.length ? 'partial' : slots.every(s => s.state === 'zero') ? 'recorded-zero' : 'complete';
      out[id] = Object.freeze({ condition, months: win.length, usable: nUse, missing: slots.length - nUse, zeros: slots.filter(s => s.state === 'zero').length, slots: Object.freeze(slots), outsideWindow: outside.length });
    }
    return Object.freeze(out);
  }

  // ---- dependency registry (WP2) ---------------------------------------------------------------------------------------------------------
  // declare(id, { label, scope: 'item' | 'bom-line' | 'dataset', inputs: fieldName[] | (context) => fieldName[], accepts?: { field: state[] } })
  function createRegistry() {
    const defs = new Map();
    return Object.freeze({
      declare(id, spec) {
        if (defs.has(id)) throw new Error('CGValidation registry: ' + id + ' is already declared');
        if (!spec || !['item', 'bom-line', 'dataset'].includes(spec.scope) || !(Array.isArray(spec.inputs) || typeof spec.inputs === 'function')) throw new Error('CGValidation registry: invalid declaration for ' + id);
        (Array.isArray(spec.inputs) ? spec.inputs : []).forEach(n => { if (!FIELDS[n]) throw new Error('CGValidation registry: unknown field ' + n); });
        defs.set(id, Object.freeze(Object.assign({ id }, spec)));
        return this;
      },
      list: () => [...defs.values()],
      get: id => defs.get(id)
    });
  }

  // Declarations follow the engine's actual formulas (design v2 §8, js/calculations.js lines 153–158, 179, 185); context.sup is CFG.sup.
  // They describe dependencies; they decide no policy. Fields outside X1 (usable on-hand, safety stock, lead time, scrap) are not listed.
  const DEFAULT_DEPENDENCIES = (() => {
    const reg = createRegistry(), sup1 = c => !!(c && c.sup === 1);
    reg.declare('stock-quantity', { label: 'Physical on-hand quantity', scope: 'item', inputs: ['On_Hand_Qty'] });
    reg.declare('valuation', { label: 'Stock value (physical quantity × unit cost)', scope: 'item', inputs: ['On_Hand_Qty', 'Unit_Cost_GBP'] });
    reg.declare('available-stock', { label: 'Available stock (usable − allocated)', scope: 'item', inputs: ['On_Hand_Qty', 'Allocated_Qty'] });
    reg.declare('stock-position', { label: 'Stock position (available + on-order)', scope: 'item', inputs: c => sup1(c) ? ['On_Hand_Qty', 'Allocated_Qty', 'On_Order_Qty'] : ['On_Hand_Qty', 'Allocated_Qty'] });
    reg.declare('shortage', { label: 'Shortage against safety stock', scope: 'item', inputs: ['On_Hand_Qty', 'Allocated_Qty'] });
    reg.declare('excess', { label: 'Excess quantity (current 90-day definition)', scope: 'item', inputs: ['On_Hand_Qty', 'Allocated_Qty', 'Units_Sold'] });
    reg.declare('excess-value', { label: 'Excess value', scope: 'item', inputs: ['On_Hand_Qty', 'Allocated_Qty', 'Units_Sold', 'Unit_Cost_GBP'] });
    reg.declare('reorder-comparison', { label: 'Reorder point compared with the recommended one', scope: 'item', inputs: ['Reorder_Point_Qty', 'Units_Sold'] });
    reg.declare('mrp-net', { label: 'MRP net requirement, order quantity and dates', scope: 'item', inputs: c => sup1(c) ? ['On_Hand_Qty', 'Allocated_Qty', 'On_Order_Qty', 'Units_Sold'] : ['On_Hand_Qty', 'Allocated_Qty', 'Units_Sold'] });
    reg.declare('po-reconciliation', { label: 'Inventory on-order reconciled with open purchase orders', scope: 'item', inputs: ['On_Order_Qty'] });
    reg.declare('bom-requirement', { label: 'Material requirement from a BOM line', scope: 'bom-line', inputs: ['Qty_Per_Finished_Unit'], accepts: { Qty_Per_Finished_Unit: ['valid'] } /* owner D1(b): zero is invalid */ });
    // Risk status = severity, health score and the reorder, safety-stock, cover and excess flags (calculations.js risk()). A blank or absent reorder point
    // under the workbook policy means 'not configured' (the reorder check does not apply), so it is accepted here, exactly as in the engine.
    reg.declare('risk-status', { label: 'Risk status: severity, health score, reorder, safety-stock, cover and excess flags', scope: 'item',
      inputs: c => [...(sup1(c) ? ['On_Hand_Qty', 'Allocated_Qty', 'On_Order_Qty'] : ['On_Hand_Qty', 'Allocated_Qty']), 'Units_Sold', ...(c && c.pol ? [] : ['Reorder_Point_Qty'])],
      accepts: { Reorder_Point_Qty: ['valid', 'zero', 'blank', 'column-absent'] } });
    reg.declare('forecast', { label: 'Demand forecast', scope: 'item', inputs: ['Units_Sold'] });
    reg.declare('supplier-performance', { label: 'Supplier on-time and risk scores', scope: 'dataset', inputs: [] });
    return reg;
  })();

  // assess: for each declared calculation and each record of its scope, 'available' when every input of that record is in an accepted state,
  // otherwise 'withheld' with the reasons (field, state, source). Item-scoped Units_Sold uses the item's history condition: a calculation that
  // needs demand is withheld only when the item has no usable history; 'partial' is reported, not withheld (what a gap MEANS is D6).
  function assess(integrity, registry, context) {
    const reg = registry || DEFAULT_DEPENDENCIES, ctx = context || {}, out = {};
    const byField = new Map(FIELD_NAMES.map(n => [n, new Map()])), columnLevel = new Map();
    integrity.records.forEach(r => {
      if (r.record === '*') { columnLevel.set(r.field, r); return; }
      const item = String(r.record).split('|')[0], m = byField.get(r.field);
      if (r.field === 'Units_Sold' || r.field === 'Qty_Per_Finished_Unit') { if (!m.has(r.record)) m.set(r.record, []); m.get(r.record).push(r); return; }
      if (!m.has(item)) m.set(item, []); m.get(item).push(r);
    });
    const history = ctx.history || null;
    const itemIds = new Set([...byField.get('On_Hand_Qty').keys(), ...byField.get('Allocated_Qty').keys(), ...byField.get('Unit_Cost_GBP').keys(), ...(ctx.items || [])]);
    const accepts = (def, field) => (def.accepts && def.accepts[field]) || ACCEPTED_DEFAULT;
    // Raw-material demand is DERIVED (parent Units_Sold × BOM, calendar-aligned; calculations.js line 120). It is unknown when a BOM line is invalid
    // (D1(b)) or when every month has at least one parent with a missing month. A parent with no demand rows at all contributes 0 (interim, Q1).
    // indexed by material and cached per item: computed once, not once per calculation (fixed 21 Nov 2026 after a quadratic slowdown at 1,500 items)
    const bomByMat = new Map();
    for (const r of [...byField.get('Qty_Per_Finished_Unit').values()].flat()) { const k = String(r.record).split('|')[1]; if (!bomByMat.has(k)) bomByMat.set(k, []); bomByMat.get(k).push(r); }
    const knownItems = new Set(ctx.materialItems || ctx.items || []), demandSet = new Set(ctx.demandItems || []), ddCache = new Map(), derivedDemand = id => { if (!ddCache.has(id)) ddCache.set(id, derivedDemand0(id)); return ddCache.get(id); };
    const derivedDemand0 = id => {
      const lines = bomByMat.get(id) || [];
      // X1 completion: a material with NO valid BOM line is "used by no product" (structural 0, owner Q6) only if every BOM line names a known material
      if (!lines.length) { const unident = [...bomByMat.keys()].filter(k => k === '' || !knownItems.has(k)); return unident.length ? [{ field: 'Qty_Per_Finished_Unit', state: 'bom-unidentifiable', source: null, why: 'BOM line(s) with a blank or unknown Material_ID: ' + unident.map(k => k === '' ? '(blank)' : JSON.stringify(k)).join(', ') }] : []; }
      const res = derivedFromLines(id, lines);
      // X1 material-integrity correction (21 Nov 2026): a BOM line naming no known material could be ANY material. Unless its parent has recorded zero
      // sales in every month (then it provably adds 0), no material's BOM-derived usage is complete: the known part is kept apart, never shown as complete.
      return unidentAdds.length ? [...res, { field: 'Qty_Per_Finished_Unit', state: 'bom-incomplete', source: null, why: 'BOM line(s) naming no known material could add to it: ' + unidentAdds.map(r => (r.source && r.source.row ? 'row ' + r.source.row + ' ' : '') + '(parent ' + (String(r.record).split('|')[0] || 'blank') + ')').join(', ') }] : res;
    };
    const unidentLines = [...bomByMat.keys()].filter(k => k === '' || !knownItems.has(k)).flatMap(k => bomByMat.get(k));
    const unidentAdds = unidentLines.filter(r => { const p = String(r.record).split('|')[0]; return !(demandSet.has(p) && history && history[p] && history[p].condition === 'recorded-zero'); });
    const derivedFromLines = (id, lines) => {
      if (!history) return [];
      const bad = lines.filter(r => r.state !== 'valid').map(r => ({ field: 'Qty_Per_Finished_Unit', state: r.state, source: r.source, record: r.record }));
      if (bad.length) return bad;
      const parents = [...new Set(lines.map(r => String(r.record).split('|')[0]))].map(k => ({ k, h: history[k] }));
      const noRows = parents.filter(p => !p.h || p.h.condition === 'no-rows').map(p => p.k);   // D6 + Q1: a parent with no demand rows = unknown
      if (noRows.length) return [{ field: 'Units_Sold', state: 'derived-demand-unknown', source: null, parents: noRows }];
      const n = parents[0].h.slots.length, known = Array.from({ length: n }, (_, i) => parents.every(p => p.h.slots[i] && p.h.slots[i].state !== 'missing')).filter(Boolean).length;
      return known ? [] : [{ field: 'Units_Sold', state: 'derived-demand-unknown', source: null, parents: parents.filter(p => p.h.missing).map(p => p.k) }];
    };
    for (const def of reg.list()) {
      const inputs = typeof def.inputs === 'function' ? def.inputs(ctx) : def.inputs, res = { label: def.label, scope: def.scope, inputs: inputs.slice(), available: 0, withheld: [] };
      const check = (field, recs) => {
        const col = columnLevel.get(field);
        if (col) return accepts(def, field).includes(col.state) ? [] : [{ field, state: col.state, source: col.source }];   // issue 26 fix: honour accepts for column-level absence
        return recs.filter(r => !accepts(def, field).includes(r.state)).map(r => ({ field, state: r.state, source: r.source, why: r.reasons && r.reasons.length ? r.reasons[0] : undefined }));
      };
      if (def.scope === 'dataset') { res.available = 1; out[def.id] = Object.freeze(res); continue; }
      if (def.scope === 'bom-line') {
        const lines = byField.get('Qty_Per_Finished_Unit'), col = columnLevel.get('Qty_Per_Finished_Unit');
        if (col) res.withheld.push({ record: '*', reasons: [{ field: 'Qty_Per_Finished_Unit', state: col.state, source: col.source }] });
        else for (const [k, recs] of lines) { const why = check('Qty_Per_Finished_Unit', recs); why.length ? res.withheld.push({ record: k, reasons: why }) : res.available++; }
        out[def.id] = Object.freeze(res); continue;
      }
      for (const id of itemIds) {
        const why = [];
        for (const field of inputs) {
          if (field === 'Units_Sold') {
            const col = columnLevel.get('Units_Sold');
            if (col) { why.push({ field, state: col.state, source: col.source }); continue; }
            const h = history && history[id];
            if (h) { if (h.condition === 'no-usable-history' || h.condition === 'no-rows') why.push({ field, state: h.condition, source: null }); continue; }
            why.push(...derivedDemand(id));   // a raw material: demand is derived from its parents through the BOM (WP6)
            continue;
          }
          why.push(...check(field, byField.get(field).get(id) || []));
        }
        why.length ? res.withheld.push({ record: id, reasons: why }) : res.available++;
      }
      out[def.id] = Object.freeze(res);
    }
    return Object.freeze(out);
  }

  const withheld = (reason, detail) => Object.freeze(Object.assign({ withheld: true, reason }, detail || {}));

  // ---- what runEngine attaches (WP4). Status vocabulary of design v2 §10 / §14.4; never 'Verified'. --------------------------------------------
  function forRun(o) {
    const opt = o || {};
    const integrity = opt.imported ? opt.imported : fromDirectWorkbook(opt.workbook, opt.XLSX);
    if (!integrity || !Array.isArray(integrity.records)) throw new Error('CGValidation.forRun: no integrity record');
    // History is built for DEMAND items only (items with their own Units_Sold rows: finished goods). Raw materials have no demand rows by design;
    // their usage comes from parent demand through the BOM, so they get no history entry and no direct Units_Sold dependency (fixed 21 Nov 2026,
    // CR-06: before, every raw material was reported 'no-usable-history' and falsely withheld). The indirect dependency is WP6 work.
    const history = calendarHistory(integrity, opt.months || [], opt.demandItems || opt.items || []);
    const dependencies = assess(integrity, DEFAULT_DEPENDENCIES, Object.assign({}, opt.context || {}, { history, items: opt.items || [], materialItems: opt.materialItems && opt.workbook && Array.isArray(opt.workbook.CGExcludedItems) ? [...opt.materialItems, ...opt.workbook.CGExcludedItems] : opt.materialItems, demandItems: opt.demandItems }));
    const notOk = integrity.records.filter(r => !ACCEPTED_DEFAULT.includes(r.state) && !(r.state === 'valid'));
    // owner D7: a zero unit cost is kept and used as £0, but it is SUSPICIOUS and is not counted as reliably costed
    const suspicious = Object.freeze(integrity.records.filter(r => r.field === 'Unit_Cost_GBP' && r.state === 'zero').map(r => Object.freeze({ field: r.field, record: r.record, source: r.source, reason: 'zero unit cost (suspicious, owner D7)' })));
    return Object.freeze({ version: VERSION, contract: CONTRACT, route: integrity.route, status: notOk.length ? 'inputs-not-all-valid' : 'inputs-valid',
      verification: 'not performed (X1 does not verify; only an independent CIS can)', fields: integrity.fields, records: integrity.records,
      history, dependencies, suspicious, report: Object.freeze([...describe(integrity, dependencies), ...(suspicious.length ? ['Unit_Cost_GBP: ' + suspicious.length + ' zero (suspicious: shown as £0 but not counted as reliably costed) (' + suspicious.slice(0, 3).map(r => (r.source.sheet || r.source.file || r.source.table || '') + (r.source.row ? ' row ' + r.source.row : '')).join('; ') + ').'] : [])]) });
  }

  // ---- one call for both callers (engine-api.js runEngine and app.js run in the browser), so the arguments are built in one place ----------
  // result: the engine's R after analyse(); sup: CFG.sup at the time; imported: a fromImport record (import route) or undefined (direct route).
  function forEngineResult(o) {
    const opt = o || {}, res = opt.result;
    if (!res || !Array.isArray(res.fg) || !Array.isArray(res.rm)) throw new Error('CGValidation.forEngineResult: an engine result (R) is required');
    return forRun({ workbook: opt.workbook, XLSX: opt.XLSX, imported: opt.imported, months: res.months, items: [...res.fg, ...res.rm].map(x => x.id), demandItems: res.fg.map(x => x.id), materialItems: res.rm.map(x => x.id), context: { sup: opt.sup, pol: opt.pol } });
  }

  // ---- report text: specific, scoped to the field and the calculations it affects ------------------------------------------------------------
  function describe(integrity, dependencies) {
    const lines = [], name = { 'blank': 'blank', 'column-absent': 'column not supplied', 'not-supplied': 'not supplied', 'invalid': 'invalid', 'non-finite': 'not a finite number', 'negative-prohibited': 'negative (not allowed for this field)', 'assumed': 'assumed', 'not-applicable': 'not applicable' };
    for (const n of FIELD_NAMES) {
      const c = integrity.fields[n].counts, bad = Object.keys(name).filter(s => c[s]);
      if (!bad.length) continue;
      const examples = integrity.records.filter(r => r.field === n && bad.includes(r.state)).slice(0, 3).map(r => (r.source.sheet || r.source.file || r.source.table || '') + (r.source.row ? ' row ' + r.source.row : ''));
      const affected = Object.entries(dependencies).filter(([, d]) => d.withheld.some(w => w.reasons.some(q => q.field === n))).map(([, d]) => d.label);
      lines.push(n + ': ' + bad.map(s => (s === 'column-absent' || s === 'not-supplied' ? '' : c[s] + ' ') + name[s]).join(', ') + (examples.length ? ' (' + examples.join('; ') + ')' : '') +
        (affected.length ? '. Depends on it: ' + affected.join('; ') + '.' : '.'));
    }
    return lines;
  }

  // ---- reasonsFor: the ONE user-facing explanation channel (owner §6.3, 21 Nov 2026). Every on-screen reason for an item (MRP row, Not Assessed status,
  // banner) is built here from the shared field-state record and the dependency assessment; the engine's own reason text stays for traceability only.
  const STATE_TEXT = { 'blank': 'blank', 'column-absent': 'column not supplied', 'not-supplied': 'not supplied', 'invalid': 'invalid', 'non-finite': 'not a finite number',
    'negative-prohibited': 'negative (not allowed)', 'zero': 'zero (invalid here)', 'no-usable-history': 'no usable month (missing months are unknown)', 'bom-incomplete': 'usage incomplete (valid BOM lines give a known part only; the full usage cannot be established)', 'bom-unidentifiable': 'usage unknown, not zero (this material is on no valid BOM line, but some BOM lines name no known material, so "used by no product" cannot be established)', 'derived-demand-unknown': 'derived demand unknown (a parent has no demand rows, or parent demand is missing in every month)', 'no-rows': 'no demand rows (demand unknown, not zero)' };
  function reasonsFor(integ, id, calcs) {
    if (!integ || !integ.dependencies) return [];
    const out = [], seen = new Set(), ids = calcs || Object.keys(integ.dependencies);
    for (const c of ids) { const d = integ.dependencies[c]; if (!d) continue;
      for (const w of d.withheld) { const rid = String(w.record), key = rid.split('|')[0];
        if (!(key === id || rid === '*')) continue;
        for (const q of w.reasons) { const src = (q.source && (q.source.row ? ' (' + (q.source.sheet || q.source.file || q.source.table) + ' row ' + q.source.row + ')' : q.source.sheet || q.source.table ? ' (' + (q.source.sheet || q.source.table) + ')' : '')) || '';   // X1 completion: a reason with no source no longer prints "null"
          const t = (q.state === 'zero' && q.field === 'Qty_Per_Finished_Unit' ? 'BOM ' + (q.record || '').replace('|', ' → ') + ': ' : '') + q.field + ' ' + (STATE_TEXT[q.state] || q.state) + (q.parents && q.parents.length ? ': ' + q.parents.join(', ') : '') + src + (q.why ? ' – ' + q.why : '');
          if (!seen.has(t)) { seen.add(t); out.push(t); } } } }
    return out;
  }

  G.CGValidation = Object.freeze({ reasonsFor, VERSION, CONTRACT, STATES, ACCEPTED_DEFAULT, FIELDS, FIELD_NAMES, classify, jsonSafe, provenance, periodKey, fromDirectWorkbook, fromImport,
    calendarHistory, createRegistry, DEFAULT_DEPENDENCIES, assess, withheld, forRun, forEngineResult, describe });
})(globalThis);
