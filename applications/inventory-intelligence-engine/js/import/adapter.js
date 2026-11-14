/* Chain Genius – Supply Chain Intelligence Engine, Universal Data Import v1, Stage 2 (K3)
 * import/adapter.js — turns an accepted Stage 1 result into the engine's eight-sheet workbook, a gate specification for
 * result-gate.js and a full adapter report. It never runs the engine and never calculates an engine output itself.
 *
 * Plain script, no build step, no asynchronous code, no network access, no browser storage, no engine globals, no global state.
 * Adds CGImport.adapter. Load after canonical.js, mapping.js, validate.js, engine-map.js and engine-workbook.js.
 *
 * build(stage1Result, mapping, options) -> frozen { status, workbook, gate, report }
 *   stage1Result  the frozen result of CGImport.validate.run / importFiles
 *   mapping       the same CG-IMPORT-MAPPING object Stage 1 used (the only record of which fields were supplied)
 *   options       none are approved yet: undefined or {} (any key is refused, ADAPTER_OPTION_UNKNOWN)
 *   status        'refused' (workbook null; report.refusals says why) | 'restricted' | 'complete'
 *
 * Approved rules applied (IMPORT-V1-STAGE2-RECORD.md):
 *   B1   a location counts when its Include_In_Available is Y or blank; N excludes it. A location missing from the locations
 *        file has no flag, so it counts. Stock with no location is "UNASSIGNED", counted and flagged (M1 D5).
 *   B6 Option D  per item over counted locations: physical on-hand = sum of the signed quantities (On_Hand_Qty, also the
 *        valuation basis); usable on-hand = sum of max(quantity, 0) (Usable_On_Hand_Qty); allocated = the sum as entered.
 *        The engine then uses available = usable - allocated. Every counted negative location is reported with the mandatory
 *        text; negatives in excluded locations are listed for information. Excluded locations contribute to nothing.
 *   M1 D14 / E6  sales lines: history = Shipped_Qty in the month of Last_Ship_Date; cancelled unshipped quantity is not
 *        history; open quantity is reported as a commitment, never added to history; a summary demand file must be labelled.
 *   E3   blocked items stay in the engine run; their own outputs are withheld by the gate.  E4  money: see result-gate.js.
 *   E10  rows Stage 1 invented (__placeholder) and held tables never reach the engine.
 * Undecided policies are never assumed: the affected case is refused with POLICY_UNDECIDED_Bn (B4, B7, B9, B14, B17, B18, B19).
 */
(function (NS) {
  'use strict';
  const C = NS.canonical, V = NS.validate, EM = NS.engineMap, EW = NS.engineWorkbook;
  if (!C || !V || !EM || !EW || typeof V.reliabilityDetail !== 'function') throw new Error('adapter.js needs canonical.js, validate.js, engine-map.js and engine-workbook.js to be loaded first');
  const VERSION = 'AD1', NEG_TEXT = 'treated as 0 for available stock. Please investigate.', UNASSIGNED = 'UNASSIGNED';
  const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  const isDate = v => Object.prototype.toString.call(v) === '[object Date]';
  const deepFreeze = o => { if (o && typeof o === 'object' && !Object.isFrozen(o) && !isDate(o)) { Object.freeze(o); Object.values(o).forEach(deepFreeze); } return o; };
  const num = v => typeof v === 'number' && isFinite(v);
  const round = v => Math.round(v * 1e6) / 1e6;
  const strip = r => Object.fromEntries(Object.entries(r).filter(([k]) => !k.startsWith('__')));
  const src = r => (r && r.__source) ? r.__source : null;
  // Stable fingerprint of the mapping (FNV-1a, 32 bit) for the provenance stamps. Not a security hash.
  const stable = v => Array.isArray(v) ? '[' + v.map(stable).join(',') + ']' : isObj(v) ? '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}' : JSON.stringify(v);
  const fnv = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return ('0000000' + h.toString(16)).slice(-8); };

  function build(stage1Result, mapping, options) {
    const refusals = [], report = { adapterVersion: VERSION, mapVersion: EM.VERSION, canonicalVersion: C.VERSION };
    const refuse = (code, message, items) => refusals.push({ code, message, items: items || [] });
    // The report and gate are frozen deeply; the result object shallowly, so the SheetJS workbook itself stays an ordinary workbook.
    const finish = (status, workbook, gate) => Object.freeze({ status, workbook: status === 'refused' ? null : workbook, gate: status === 'refused' ? null : deepFreeze(gate),
      report: deepFreeze(Object.assign(report, { refusals })) });
    try {
      // ---- Gate 0: input contract
      if (options !== undefined && (!isObj(options) || Object.keys(options).length)) { refuse('ADAPTER_OPTION_UNKNOWN', 'No adapter options are approved yet; received: ' + (isObj(options) ? Object.keys(options).join(', ') : typeof options) + '.'); return finish('refused'); }
      const S1 = stage1Result;
      if (!isObj(S1) || typeof S1.importAccepted !== 'boolean' || !isObj(S1.permissions) || !isObj(S1.dataset) || !isObj(S1.completeness) || !isObj(S1.summary)) { refuse('ADAPTER_INPUT_INVALID', 'The Stage 1 result is missing or malformed.'); return finish('refused'); }
      if (!Object.isFrozen(S1) || !Object.isFrozen(S1.dataset) || !Object.isFrozen(S1.permissions)) { refuse('ADAPTER_INPUT_NOT_FROZEN', 'The Stage 1 result is not frozen, so it may have been changed after validation.'); return finish('refused'); }
      let supplied;
      try { supplied = EW.suppliedFields(mapping); } catch (e) { refuse('ADAPTER_MAPPING_INVALID', 'The mapping is not a CG-IMPORT-MAPPING object.'); return finish('refused'); }
      report.stamps = { importer: 'Universal Import v1 Stage 1 (' + C.VERSION + ')', adapter: VERSION, engineMap: EM.VERSION, mappingName: typeof mapping.name === 'string' ? mapping.name : null, mappingFingerprint: 'fnv1a32:' + fnv(stable(mapping)) };

      // ---- Gate 1: acceptance and dataset permission
      if (!S1.importAccepted) { refuse('IMPORT_NOT_ACCEPTED', 'Stage 1 did not accept the import (Must fix: ' + S1.summary.mustFix + '; blocking: ' + (S1.summary.blocking || []).join(', ') + ').'); return finish('refused'); }
      const P = S1.permissions;
      if (!isObj(P.dataset) || P.dataset.status !== 'allowed') { refuse('DATASET_NOT_ALLOWED', 'The dataset permission is "' + (isObj(P.dataset) ? P.dataset.status : 'missing') + '".'); return finish('refused'); }
      if (!isObj(P.financial) || !isObj(P.analyses) || !isObj(P.items)) { refuse('ADAPTER_INPUT_INVALID', 'The Stage 1 permissions are malformed.'); return finish('refused'); }
      for (const t of ['items', 'stock']) {
        const st = S1.completeness[t];
        if (!Array.isArray(S1.dataset[t]) || !S1.dataset[t].length || (isObj(st) && ['stopped', 'not-built', 'not-supplied'].includes(st.status)))
          refuse('REQUIRED_TABLE_UNAVAILABLE', 'The ' + t + ' table is required and is ' + (isObj(st) ? st.status : 'missing') + '.');
      }
      if (refusals.length) return finish('refused');
      const D = {}; for (const [t, rows] of Object.entries(S1.dataset)) D[t] = rows.filter(r => !(r && r.__placeholder));
      report.excludedPlaceholders = Object.fromEntries(Object.entries(S1.dataset).map(([t, rows]) => [t, rows.filter(r => r && r.__placeholder).length]).filter(([, n]) => n));
      report.heldTables = isObj(S1.held) ? Object.keys(S1.held) : [];

      // ---- Gate 2: item roles (the engine supports Make + sold and Buy + not sold only)
      const role = r => r.Replenishment === 'Make' && r.Is_Sold === 'Y' ? 'fg' : r.Replenishment === 'Buy' && r.Is_Sold === 'N' ? 'rm' : null;
      const unsupported = D.items.filter(r => !role(r));
      if (unsupported.length) refuse('POLICY_UNDECIDED_B14', unsupported.length + ' item(s) have a role the engine cannot analyse yet (bought for resale, or made but not sold). Whether the run is refused or restricted is undecided (B14–B16).', unsupported.map(r => r.Item_ID + ' (' + r.Replenishment + ' + ' + (r.Is_Sold === 'Y' ? 'sold' : 'not sold') + ')'));
      if (refusals.length) return finish('refused');
      const itemRole = new Map(D.items.map(r => [r.Item_ID, role(r)]));

      // ---- Gate 3: Engine View stock (B1, M1 D5, B6 Option D)
      const flag = new Map((D.locations || []).map(l => [l.Location_ID, l.Include_In_Available]));
      const counts = loc => loc === null ? true : !flag.has(loc) || flag.get(loc) !== 'N';
      const groups = new Map();
      for (const r of D.stock) { if (!groups.has(r.Item_ID)) groups.set(r.Item_ID, []); groups.get(r.Item_ID).push(r); }
      const engineStock = [], negatives = [], excludedNegatives = [], recon = [], unknownLocations = new Set();
      const b4 = [], b7 = [], b9 = [], partly = [], snap = [], noHand = [];
      for (const [id, rows] of groups) {
        const inc = rows.filter(r => counts(r.Location_ID)), exc = rows.filter(r => !counts(r.Location_ID));
        rows.forEach(r => { if (r.Location_ID !== null && !flag.has(r.Location_ID) && D.locations) unknownLocations.add(r.Location_ID); });
        exc.forEach(r => {
          if ((num(r.Allocated_Qty) && r.Allocated_Qty !== 0) || (num(r.On_Order_Qty) && r.On_Order_Qty !== 0)) b4.push(id + ' @ ' + r.Location_ID);
          if (num(r.On_Hand_Qty) && r.On_Hand_Qty < 0) excludedNegatives.push({ itemId: id, locationId: r.Location_ID, negativeQty: r.On_Hand_Qty, note: 'Excluded location (Include_In_Available = N): listed for information only; it does not affect any engine figure.', source: src(r) });
        });
        if (!inc.length) { recon.push({ itemId: id, countedLocations: 0, note: 'No counted location: no Engine View stock row is written for this item.' }); continue; }
        if (inc.some(r => !num(r.On_Hand_Qty))) { noHand.push(id); continue; }
        const vals = f => inc.map(r => r[f]);
        const costs = vals('Unit_Cost');
        if (new Set(costs.map(v => v === null ? 'null' : String(v))).size > 1) { b7.push(id); continue; }
        for (const f of ['Reorder_Point_Qty', 'Safety_Stock_Qty']) if (vals(f).filter(v => v !== null).length > 1) { b9.push(id + ' ' + f); }
        for (const f of ['Allocated_Qty', 'On_Order_Qty']) { const v = vals(f); if (v.some(x => x === null) && v.some(x => x !== null)) partly.push(id + ' ' + f); }
        if (new Set(vals('Snapshot_Date')).size > 1) snap.push(id);
        const sum = f => { const v = vals(f).filter(x => x !== null); return v.length ? round(v.reduce((a, b) => a + b, 0)) : null; };
        const one = f => { const v = vals(f).filter(x => x !== null); return v.length ? v[0] : null; };
        const physical = round(inc.reduce((a, r) => a + r.On_Hand_Qty, 0)), usable = round(inc.reduce((a, r) => a + Math.max(r.On_Hand_Qty, 0), 0));
        const allocated = sum('Allocated_Qty'), cost = costs[0];
        const row = { Item_ID: id, Location_ID: null, Snapshot_Date: inc[0].Snapshot_Date, On_Hand_Qty: physical, Allocated_Qty: allocated, On_Order_Qty: sum('On_Order_Qty'),
          Reorder_Point_Qty: one('Reorder_Point_Qty'), Safety_Stock_Qty: one('Safety_Stock_Qty'), Unit_Cost: cost, __derived: { Usable_On_Hand_Qty: usable }, __sources: inc.map(src) };
        engineStock.push(row);
        recon.push({ itemId: id, countedLocations: inc.map(r => r.Location_ID === null ? UNASSIGNED : r.Location_ID), excludedLocations: exc.map(r => r.Location_ID),
          sourcePhysicalSum: physical, enginePhysical: physical, usable });
        const available = allocated === null ? usable : round(usable - allocated), valuation = num(cost) ? round(physical * cost) : null;
        inc.filter(r => r.On_Hand_Qty < 0).forEach(r => negatives.push({
          itemId: id, locationId: r.Location_ID === null ? UNASSIGNED : r.Location_ID, negativeQty: r.On_Hand_Qty,
          physicalOnHandOriginal: physical, physicalOnHandUsedByEngine: physical, usableLocationStock: usable, allocatedQty: allocated,
          availableStockUsedByEngine: available, stockValuationOriginal: valuation, stockValuationUsedByEngine: valuation,
          message: NEG_TEXT, source: src(r) }));
      }
      if (noHand.length) refuse('STOCK_ON_HAND_MISSING', 'A counted stock row has no on-hand quantity; it cannot be summed without inventing a value.', noHand);
      if (b4.length) refuse('POLICY_UNDECIDED_B4', 'An excluded location holds allocated or on-order stock; whether it counts is undecided (B4).', b4);
      if (b7.length) refuse('POLICY_UNDECIDED_B7', 'An item has different unit costs across its counted locations; the valuation rule is undecided (B7).', b7);
      if (b9.length) refuse('POLICY_UNDECIDED_B9', 'More than one counted location gives a reorder point or safety stock; how to combine them is undecided (B9).', b9);
      if (partly.length) refuse('STOCK_FIELD_PARTLY_BLANK', 'Allocated or on-order is blank at some counted locations of an item and filled at others; the sum would invent the missing figures.', partly);
      if (snap.length) refuse('STOCK_SNAPSHOT_DATES_DIFFER', 'An item’s counted locations have different snapshot dates.', snap);
      report.locations = { unknownLocationsCountedAsIncluded: [...unknownLocations], unassignedRows: D.stock.filter(r => r.Location_ID === null).length };
      report.negativeStock = negatives; report.excludedLocationNegatives = excludedNegatives; report.stockReconciliation = recon;

      // ---- Gate 4: demand history (M1 D14, E6)
      const hasDemand = Array.isArray(D.demand) && D.demand.length, hasSales = Array.isArray(D.sales_lines) && D.sales_lines.length;
      let engineDemand = null, demandSupplied = null; const commitments = [];
      if (hasDemand && hasSales) refuse('POLICY_UNDECIDED_B18', 'Both a monthly demand file and sales lines were supplied; which one is the history is undecided (B18).');
      else if (hasDemand) {
        const basis = D.dataset && D.dataset[0] ? D.dataset[0].Demand_Basis : null;
        if (basis === 'orders') refuse('POLICY_UNDECIDED_B19', 'The demand file is labelled "orders"; whether order-based history may be used is undecided (B19).');
        else if (basis !== 'shipments') refuse('DEMAND_BASIS_NOT_LABELLED', 'M1 D14 requires a summary demand file to be labelled as shipments or orders (dataset Demand_Basis); it is not labelled.');
        else {
          // Rows of one item-month are summed only when they come from different locations. Rows without a location pass through
          // exactly as imported (one engine row each), so Stage 1's kept, caveated duplicates are never silently merged or doubled.
          const g = new Map();
          for (const r of D.demand) { const k = r.Item_ID + '|' + r.Period_Start; if (!g.has(k)) g.set(k, []); g.get(k).push(r); }
          const partF = [], mixed = [];
          engineDemand = [];
          for (const rs of g.values()) {
            const locs = rs.map(r => r.Location_ID);
            if (locs.every(l => l === null)) { rs.forEach(r => engineDemand.push(Object.assign({}, r, { __sources: [src(r)] }))); continue; }
            if (locs.some(l => l === null) || new Set(locs).size !== locs.length) { mixed.push(rs[0].Item_ID + ' ' + rs[0].Period_Start); continue; }
            const f = rs.map(r => r.Forecast_Units);
            if (f.some(v => v === null) && f.some(v => v !== null)) partF.push(rs[0].Item_ID + ' ' + rs[0].Period_Start);
            engineDemand.push({ Item_ID: rs[0].Item_ID, Period_Start: rs[0].Period_Start, Units: round(rs.reduce((a, r) => a + r.Units, 0)),
              Forecast_Units: f.every(v => v === null) ? null : round(f.reduce((a, v) => a + (v || 0), 0)), Location_ID: null, __sources: rs.map(src) });
          }
          if (partF.length) refuse('DEMAND_FORECAST_PARTLY_BLANK', 'Forecast_Units is blank at some locations of an item-month and filled at others.', partF);
          if (mixed.length) refuse('DEMAND_LOCATION_ROWS_AMBIGUOUS', 'An item-month mixes rows with and without a location, or repeats a location; the rows cannot be combined without guessing.', mixed);
          report.demand = { basis: 'demand file (labelled shipments)', rows: D.demand.length, engineRows: engineDemand.length, summedAcrossLocations: D.demand.length - engineDemand.length };
        }
      } else if (hasSales) {
        if (!supplied.sales_lines || !supplied.sales_lines.has('Shipped_Qty') || !supplied.sales_lines.has('Last_Ship_Date'))
          refuse('SALES_LINES_SHIPMENTS_NOT_MAPPED', 'Sales lines can only become history when Shipped_Qty and Last_Ship_Date are mapped (M1 D14: completed shipments by ship date).');
        else {
          const noDate = [], negative = [], notStated = [], g = new Map(), months = new Set();
          for (const r of D.sales_lines) {
            const cancelled = r.Cancel_Reason !== null || (typeof r.Status === 'string' && /^\s*cancel/i.test(r.Status));
            if (r.Shipped_Qty !== null && (r.Shipped_Qty < 0 || r.Ordered_Qty < 0)) { negative.push(r.SO_ID + '/' + r.Line_No); continue; }
            if (r.Shipped_Qty === null) notStated.push(r.SO_ID + '/' + r.Line_No);
            const shipped = r.Shipped_Qty || 0;
            if (shipped > 0) {
              if (!r.Last_Ship_Date) { noDate.push(r.SO_ID + '/' + r.Line_No); continue; }
              const m = r.Last_Ship_Date.slice(0, 8) + '01', k = r.Item_ID + '|' + m; months.add(m);
              if (!g.has(k)) g.set(k, { Item_ID: r.Item_ID, Period_Start: m, Units: 0, Forecast_Units: null, Location_ID: null, __sources: [] });
              const e = g.get(k); e.Units = round(e.Units + shipped); e.__sources.push(src(r));
            }
            const open = round(r.Ordered_Qty - shipped);
            if (!cancelled && open > 0) commitments.push({ soId: r.SO_ID, lineNo: r.Line_No, itemId: r.Item_ID, openQty: open, orderDate: r.Order_Date, requestedDate: r.Requested_Date, status: r.Status });
          }
          if (noDate.length) refuse('SALES_LINE_SHIP_DATE_MISSING', 'A line has a shipped quantity but no ship date; it cannot be placed in a month without inventing a date.', noDate);
          if (negative.length) refuse('SALES_LINE_NEGATIVE_QTY', 'A line has a negative ordered or shipped quantity (returns are not part of the approved history rule).', negative);
          // B17: Option A (zero months) and Option B (no row) only agree when every item in the file shipped in every month of the file's span.
          const ms = [...months].sort(), span = [];
          if (ms.length) { let [y, mo] = ms[0].split('-').map(Number); const [y1, m1] = ms[ms.length - 1].split('-').map(Number);
            while (y < y1 || (y === y1 && mo <= m1)) { span.push(y + '-' + String(mo).padStart(2, '0') + '-01'); mo++; if (mo > 12) { mo = 1; y++; } } }
          const salesItems = [...new Set(D.sales_lines.map(r => r.Item_ID))];
          const gaps = salesItems.filter(id => span.some(m => !g.has(id + '|' + m)) || !span.length);
          if (gaps.length && !refusals.length) refuse('POLICY_UNDECIDED_B17', 'Some items have months with no shipments inside the file’s span; whether those months are written as 0 or left out is undecided (B17).', gaps);
          engineDemand = [...g.values()];
          demandSupplied = ['Item_ID', 'Period_Start', 'Units'];
          report.demand = { basis: 'sales lines (M1 D14: shipped quantity by ship month)', lines: D.sales_lines.length, engineRows: engineDemand.length, months: span,
            linesWithoutShippedQty: notStated, note: 'A line shipped across several months is counted in its last ship month (CDv1 keeps one ship date per line).' };
        }
      } else report.demand = { basis: 'none supplied' };
      report.commitments = commitments;
      if (refusals.length) return finish('refused');

      // ---- Build the workbook (K2): only the rows chosen above; the engine runs on the full supported population (E3).
      const ds = {}; for (const t of ['items', 'bom', 'suppliers', 'po_lines', 'production_orders']) if (Array.isArray(D[t])) ds[t] = D[t];
      ds.stock = engineStock; if (engineDemand) ds.demand = engineDemand;
      const sup = {}; if (demandSupplied) sup.demand = demandSupplied;
      let built;
      try { built = EW.build(ds, mapping, { supplied: sup, derived: ['Usable_On_Hand_Qty'] }); }
      catch (e) { refuse(e.code === 'ENGINE_WORKBOOK_INPUT' ? 'ADAPTER_MAPPING_MISMATCH' : 'ADAPTER_VALUE_INVALID', e.message); return finish('refused'); }
      // Reconciliation (hard check): the Engine View physical stock equals the counted source rows, item by item.
      const sheet = built.workbook.Sheets.Inventory, idx = built.report.sheets.find(s => s.sheet === 'Inventory').columns;
      const ci = c => idx.indexOf(c), XL = typeof XLSX !== 'undefined' ? XLSX : null;
      if (XL) {
        const bad = engineStock.filter((r, i) => { const cell = sheet[XL.utils.encode_cell({ r: i + 1, c: ci('On_Hand_Qty') })]; const u = sheet[XL.utils.encode_cell({ r: i + 1, c: ci('Usable_On_Hand_Qty') })];
          return !cell || cell.v !== r.On_Hand_Qty || !u || u.v !== r.__derived.Usable_On_Hand_Qty; });
        if (bad.length) { refuse('ADAPTER_RECONCILIATION_FAILED', 'Engine View stock does not equal the counted source rows.', bad.map(r => r.Item_ID)); return finish('refused'); }
      }
      report.workbook = built.report;
      report.provenance = { Inventory: engineStock.map(r => ({ itemId: r.Item_ID, sources: r.__sources })), 'Demand History': engineDemand ? engineDemand.map(r => ({ itemId: r.Item_ID, month: r.Period_Start, sources: r.__sources || [src(r)] })) : 'as imported (one engine row per canonical row)' };

      // ---- Gate specification for result-gate.js (E3, E4, E7)
      const analyses = {}; ['demand', 'purchasing', 'production', 'materials'].forEach(a => { analyses[a] = typeof P.analyses[a] === 'string' ? P.analyses[a] : 'blocked'; });
      const moneyReasons = [];
      if (P.financial.status !== 'allowed') moneyReasons.push('FINANCIAL_NOT_ALLOWED (' + P.financial.status + ')');
      const noUnit = engineStock.filter(r => !num(r.Unit_Cost)).map(r => r.Item_ID), noStd = D.items.filter(r => !num(r.Standard_Cost)).map(r => r.Item_ID);
      if (P.financial.status === 'allowed' && (noUnit.length || noStd.length)) moneyReasons.push('COST_MISSING (' + [...new Set([...noUnit, ...noStd])].length + ' item(s))');
      const items = {}, ROLE = { fg: ['demand', 'production'], rm: ['materials', 'purchasing'] };
      for (const r of D.items) {
        const id = r.Item_ID, e = { withhold: [], labels: [] };
        for (const a of ROLE[itemRole.get(id)]) {
          const d = V.reliabilityDetail(S1, id, a), codes = d.reasons.map(x => x.code);
          if (d.status === 'blocked') {
            const itemCause = codes.filter(c => ['ITEM_BLOCKED', 'ITEM_ENTRY_MALFORMED', 'CAVEAT_UNRECOGNISED', 'ITEM_NOT_IMPORTED', 'PERMISSIONS_MALFORMED', 'ANALYSIS_UNKNOWN', 'INTERNAL_ERROR'].includes(c));
            if (itemCause.length) e.withhold.push({ analysis: a, reason: itemCause.join('+') });
            else if (analyses[a] !== 'unavailable') e.withhold.push({ analysis: a, reason: 'ANALYSIS_' + analyses[a].toUpperCase() });
            else e.labels.push({ analysis: a, status: 'blocked', code: 'TABLE_NOT_SUPPLIED' });
          }
          d.reasons.filter(x => x.status === 'incomplete' || x.status === 'caveated').forEach(x => e.labels.push({ analysis: a, status: x.status, code: x.code }));
        }
        if (negatives.some(n => n.itemId === id)) e.labels.push({ analysis: 'stock', status: 'labelled', code: 'NEGATIVE_LOCATION_STOCK' });
        if (e.withhold.length || e.labels.length) items[id] = e;
      }
      const gate = { version: 'RG1', money: { withhold: moneyReasons.length > 0, reasons: moneyReasons },
        clientQuestions: { withhold: P.financial.status !== 'allowed', reason: P.financial.status !== 'allowed' ? 'POLICY_UNDECIDED_B11' : null }, analyses, items };
      report.itemsSent = { finishedGoods: D.items.filter(r => itemRole.get(r.Item_ID) === 'fg').length, materials: D.items.filter(r => itemRole.get(r.Item_ID) === 'rm').length };
      const restricted = gate.money.withhold || gate.clientQuestions.withhold || Object.keys(items).length || Object.values(analyses).some(a => a !== 'available') || excludedNegatives.length;
      return finish(restricted ? 'restricted' : 'complete', built.workbook, gate);
    } catch (err) {
      refuse('ADAPTER_INTERNAL', 'Internal adapter error: ' + (err && err.message ? err.message : String(err)));
      return finish('refused');
    }
  }

  NS.adapter = Object.freeze({ VERSION, NEG_TEXT, build });
})(globalThis.CGImport = globalThis.CGImport || {});
