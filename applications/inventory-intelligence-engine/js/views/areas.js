/* Stage 3B Phase 0 (22 Nov 2026): view-models for the 17 existing analytical areas, and the approved six-area map.
 * Owner decisions D-4 (navigation), D-6 (the 17 tabs stay as the Advanced view) and D-7 (scenarios stay in M5),
 * recorded in stage3-design/stage3b/ARCHITECTURE-DECISIONS.md.
 * Each builder takes the engine source S = CGVM.source() and returns an array of contract objects (see contract.js).
 * No arithmetic here: values come from engine fields, counts via traces, and money totals via CGVM.total (X1/D4).
 */
(function (G) {
  'use strict';
  const V = G.CGVM;
  const ALL = ['R.fg', 'R.rm'];
  const calc = (basis, fields) => ({ source: 'calculated', basis, fields });
  /* Forecast-month labels. Calendar labels need date arithmetic, which the view layer may not do; Phase 4 takes them
   * from an engine-provided label list instead (recorded in the implementation record as deferred). */
  const HORIZON = ['+1 month', '+2 months', '+3 months', '+4 months', '+5 months', '+6 months', '+7 months', '+8 months', '+9 months', '+10 months', '+11 months', '+12 months', '+13 months', '+14 months', '+15 months', '+16 months', '+17 months', '+18 months', '+19 months', '+20 months', '+21 months', '+22 months', '+23 months', '+24 months'];

  /* A count of items in a class. Items the engine could not assess are not counted and are reported as excluded. */
  function classCount(S, o) {
    const n = V.resolve(S, { count: o.items, where: o.where });
    const ex = V.resolve(S, { count: o.items, where: [[o.naField || 'sev', 'null']] });
    const of = V.resolve(S, { count: o.items, where: [] });
    return Object.assign(V.kpi(S, Object.assign({ unit: 'items' }, o, { trace: { count: o.items, where: o.where } })), {
      value: n,
      completeness: ex ? { status: 'partial', included: V.resolve(S, { count: o.items, where: [[o.naField || 'sev', 'set']] }), of, excluded: ex, reasons: ['Not Assessed items cannot be placed in a class and are not counted'] }
        : { status: 'complete', included: of, of, excluded: 0, reasons: [] }
    });
  }
  const countKpi = (S, o) => V.kpi(S, Object.assign({ unit: 'items' }, o, { trace: { count: o.items, where: o.where || [] } }));

  const B = {
    Overview(S) {
      const c = V.confFor(S, 'Stock position and shortage risk');
      return [
        V.total(S, { id: 'ov-value', area: 'Overview', title: 'Inventory value', question: 'How much capital is held in stock?', unit: '£', field: 'R.tot', items: ALL, key: 'val', provenance: calc('on-hand quantity × unit cost, all items', ['R.tot', 'R.fg[].val', 'R.rm[].val']), drill: { area: 'Inventory', view: 'items' } }),
        classCount(S, { id: 'ov-high-risk', area: 'Overview', title: 'High or critical risk items', question: 'How many items need attention now?', items: ALL, where: [['sev', '>=', 2]], provenance: calc('risk class from cover vs ROP/SS and lead time', ['R.fg[].sev', 'R.rm[].sev']), confidence: c, drill: { area: 'Inventory', view: 'items', filter: { sevMin: 2 } } }),
        V.total(S, { id: 'ov-excess', area: 'Overview', title: 'Potential excess value', question: 'How much capital may be tied up in stock we do not need?', unit: '£', field: 'R.exV', items: ALL, key: 'exVal', provenance: calc('stock above the excess threshold (days of cover), valued at cost', ['R.exV', 'R.fg[].exVal', 'R.rm[].exVal']), drill: { area: 'Inventory', view: 'excess' } }),
        V.total(S, { id: 'ov-shortage', area: 'Overview', title: 'Shortage value', question: 'How much stock is missing against the reorder policy?', unit: '£', field: 'R.shV', items: ALL, key: 'short', provenance: calc('engine shortage value', ['R.shV']), drill: { area: 'Inventory', view: 'items', filter: { sevMin: 2 } } }),
        countKpi(S, { id: 'ov-dq-high', area: 'Overview', title: 'High-severity data issues', question: 'Is anything in the data serious enough to distrust results?', unit: 'issues', items: ['R.dq'], where: [['sev', '==', 'High']], provenance: calc('data-quality checks', ['R.dq[].sev']), drill: { area: 'Data Management', view: 'quality' } }),
        V.bars(S, { id: 'ov-value-split', area: 'Overview', title: 'Inventory value by type', question: 'Where is the stock value held?', unit: '£', labels: ['Finished goods', 'Raw materials'], series: [{ name: 'Value', trace: [{ field: 'R.fgV' }, { field: 'R.rmV' }] }], provenance: calc('on-hand × unit cost by item type', ['R.fgV', 'R.rmV']), drill: { area: 'Inventory', view: 'items' } }),
        V.table(S, { id: 'ov-top-risk', area: 'Overview', title: 'Top risk items', question: 'Which items are most urgent?', unit: 'text', trace: { rows: 'R.top', where: [] }, columns: [{ field: 'id', label: 'Item' }, { field: 'name', label: 'Name' }, { field: 'sev', label: 'Risk' }, { field: 'cover', label: 'Cover (days)' }, { field: 'why', label: 'Reason' }], provenance: calc('engine top-risk list', ['R.top']), drill: { area: 'Inventory', view: 'items' } })
      ];
    },
    Health(S) {
      const cats = ['Excellent', 'Healthy', 'Monitor', 'At risk', 'Critical'];
      return [
        V.bars(S, { id: 'he-categories', area: 'Inventory', title: 'Stock health by category', question: 'How healthy is the stock position overall?', unit: 'items', labels: cats, series: [{ name: 'Items', trace: cats.map(c => ({ count: ALL, where: [['cat', '==', c], ['score', 'set']] })) }], provenance: calc('health score = 100 − penalty points; category bands', ['R.fg[].cat', 'R.rm[].cat', 'R.fg[].score']), drill: { area: 'Inventory', view: 'health' } }),
        countKpi(S, { id: 'he-not-assessed', area: 'Inventory', title: 'Items without a health score', question: 'How many items could not be scored?', items: ALL, where: [['score', 'null']], provenance: calc('items the engine could not assess', ['R.fg[].score', 'R.rm[].score']), drill: { area: 'Inventory', view: 'health' } }),
        V.table(S, { id: 'he-items', area: 'Inventory', title: 'Health score by item', question: 'Which items are least healthy?', unit: 'score', trace: { rows: 'R.fg', where: [['score', 'set']], order: [['score', 'asc']] }, columns: [{ field: 'id', label: 'Item' }, { field: 'score', label: 'Score' }, { field: 'cat', label: 'Category' }], provenance: calc('health score per item', ['R.fg[].score', 'R.fg[].cat']) }),
        V.table(S, { id: 'he-items-rm', area: 'Inventory', title: 'Health score by material', question: 'Which materials are least healthy?', unit: 'score', trace: { rows: 'R.rm', where: [['score', 'set']], order: [['score', 'asc']] }, columns: [{ field: 'id', label: 'Item' }, { field: 'score', label: 'Score' }, { field: 'cat', label: 'Category' }], provenance: calc('health score per item', ['R.rm[].score', 'R.rm[].cat']) })
      ];
    },
    'Finished goods'(S) {
      return [
        countKpi(S, { id: 'fg-count', area: 'Inventory', title: 'Finished goods', question: 'How many products are analysed?', items: ['R.fg'], provenance: calc('products in the workbook', ['R.fg']) }),
        classCount(S, { id: 'fg-high-risk', area: 'Inventory', title: 'Products at high or critical risk', question: 'Which products may run short?', items: ['R.fg'], where: [['sev', '>=', 2]], provenance: calc('risk class per product', ['R.fg[].sev']), drill: { area: 'Inventory', view: 'items', filter: { type: 'FG', sevMin: 2 } } }),
        V.total(S, { id: 'fg-value', area: 'Inventory', title: 'Finished-goods value', question: 'How much capital is in products?', unit: '£', field: 'R.fgV', items: ['R.fg'], key: 'val', provenance: calc('on-hand × unit cost, products', ['R.fgV', 'R.fg[].val']) }),
        V.table(S, { id: 'fg-items', area: 'Inventory', title: 'Products', question: 'What is each product\'s stock position?', unit: 'text', trace: { rows: 'R.fg', where: [], order: [['sev', 'desc']] }, columns: [{ field: 'id', label: 'Item' }, { field: 'name', label: 'Name' }, { field: 'sev', label: 'Risk' }, { field: 'av', label: 'Available' }, { field: 'pos', label: 'Position' }, { field: 'cover', label: 'Cover (days)' }, { field: 'lt', label: 'Lead time (days)' }, { field: 'ss', label: 'SS (workbook)' }, { field: 'rop', label: 'ROP (workbook)' }, { field: 'ssR', label: 'SS (recommended)' }, { field: 'ropR', label: 'ROP (recommended)' }, { field: 'abc', label: 'ABC' }, { field: 'xyz', label: 'XYZ' }, { field: 'conf', label: 'Confidence' }], provenance: calc('per-product stock position and policy', ['R.fg']) })
      ];
    },
    Materials(S) {
      return [
        countKpi(S, { id: 'rm-count', area: 'Inventory', title: 'Raw materials', question: 'How many materials are analysed?', items: ['R.rm'], provenance: calc('materials in the workbook', ['R.rm']) }),
        classCount(S, { id: 'rm-high-risk', area: 'Inventory', title: 'Materials at high or critical risk', question: 'Which materials threaten production?', items: ['R.rm'], where: [['sev', '>=', 2]], provenance: calc('risk class per material', ['R.rm[].sev']), drill: { area: 'Inventory', view: 'items', filter: { type: 'RM', sevMin: 2 } } }),
        V.total(S, { id: 'rm-value', area: 'Inventory', title: 'Raw-material value', question: 'How much capital is in materials?', unit: '£', field: 'R.rmV', items: ['R.rm'], key: 'val', provenance: calc('on-hand × unit cost, materials', ['R.rmV', 'R.rm[].val']) }),
        V.table(S, { id: 'rm-items', area: 'Inventory', title: 'Materials', question: 'What is each material\'s stock position?', unit: 'text', trace: { rows: 'R.rm', where: [], order: [['sev', 'desc']] }, columns: [{ field: 'id', label: 'Item' }, { field: 'name', label: 'Name' }, { field: 'sev', label: 'Risk' }, { field: 'av', label: 'Available' }, { field: 'pos', label: 'Position' }, { field: 'cover', label: 'Cover (days)' }, { field: 'lt', label: 'Risk-adjusted lead time (days)' }, { field: 'm', label: 'Estimated usage / month' }, { field: 'exposed', label: 'Exposed £/month' }, { field: 'sup', label: 'Supplier' }], provenance: { source: 'estimated', basis: 'usage ESTIMATED from BOM × units sold × (1 + scrap)', fields: ['R.rm[].m', 'R.rm'] } })
      ];
    },
    MRP(S) {
      const st = ['Not Assessed', 'ORDER NOW', 'Order soon', 'Plan', 'Covered'];
      return [
        countKpi(S, { id: 'mrp-order-now', area: 'Procurement & Suppliers', title: 'Materials to order now', question: 'What must be bought immediately?', items: ['mrp'], where: [['st', '==', 'ORDER NOW']], provenance: calc('MRP: net requirement over the horizon vs receipts, MOQ', ['mrp[].st']), confidence: V.confFor(S, 'Material requirements planning'), drill: { area: 'Procurement & Suppliers', view: 'what-to-buy', filter: { st: 'ORDER NOW' } } }),
        countKpi(S, { id: 'mrp-net', area: 'Procurement & Suppliers', title: 'Materials with a net requirement', question: 'How many materials need more supply?', items: ['mrp'], where: [['net', '>', 0]], provenance: calc('MRP net requirement', ['mrp[].net']) }),
        V.bars(S, { id: 'mrp-status', area: 'Procurement & Suppliers', title: 'Materials by buying status', question: 'How urgent is purchasing overall?', unit: 'items', labels: st, series: [{ name: 'Materials', trace: st.map(s => ({ count: ['mrp'], where: [['st', '==', s]] })) }], provenance: calc('MRP status', ['mrp[].st']) }),
        V.table(S, { id: 'mrp-rows', area: 'Procurement & Suppliers', title: 'What to buy', question: 'What, how much and by when?', unit: 'text', trace: { rows: 'mrp', where: [], order: [['st', 'asc', st], ['val', 'desc']] }, columns: [{ field: 'x.id', label: 'Material' }, { field: 'st', label: 'Status' }, { field: 'net', label: 'Net requirement' }, { field: 'qty', label: 'Suggested quantity' }, { field: 'val', label: 'Value (£)' }, { field: 'by', label: 'Order by' }], provenance: calc('MRP rows', ['mrp']) })
      ];
    },
    'Production feasibility'(S) {
      const st = ['Feasible', 'Feasible with incoming materials', 'At risk', 'Material shortage', 'Insufficient information'];
      return [
        V.bars(S, { id: 'pf-status', area: 'Production', title: 'Production orders by feasibility', question: 'Can we build what is planned?', unit: 'orders', labels: st, series: [{ name: 'Orders', trace: st.map(s => ({ count: ['feas.rows'], where: [['status', '==', s]] })) }], provenance: { source: V.at(S, 'feas.sim') ? 'simulated' : 'calculated', basis: V.at(S, 'feas.sim') ? 'SIMULATED orders (no open production orders in the workbook)' : 'open production orders vs shared stock and receipts', fields: ['feas.rows[].status', 'feas.sim'] }, confidence: V.confFor(S, 'Production feasibility') }),
        V.table(S, { id: 'pf-rows', area: 'Production', title: 'Production orders', question: 'Which orders are blocked, and by what?', unit: 'text', trace: { rows: 'feas.rows', where: [] }, columns: [{ field: 'o.id', label: 'Order' }, { field: 'o.sku', label: 'Product' }, { field: 'o.q', label: 'Quantity' }, { field: 'status', label: 'Status' }, { field: 'delay', label: 'Delay (days)' }, { field: 'why', label: 'Why' }], provenance: { source: V.at(S, 'feas.sim') ? 'simulated' : 'calculated', basis: 'feasibility per order', fields: ['feas.rows'] } })
      ];
    },
    'Excess & dead stock'(S) {
      const cls = ['Excess stock', 'Slow-moving', 'Obsolete', 'No demand', 'Not Assessed'];
      const listed = [['cls', '!=', 'Active']];
      return [
        V.total(S, { id: 'ex-value', area: 'Inventory', title: 'Potential excess value', question: 'What capital is tied up in stock we do not need?', unit: '£', field: 'R.exV', items: ALL, key: 'exVal', provenance: calc('uncommitted stock above the excess threshold, at cost', ['R.exV']) }),
        V.bars(S, { id: 'ex-classes', area: 'Inventory', title: 'Items by stock class', question: 'What kind of surplus is it?', unit: 'items', labels: cls, series: [{ name: 'Items', trace: cls.map(c => ({ count: ALL, where: [['cls', '==', c]] })) }], provenance: calc('dead-stock classes (A2/B1 rules)', ['R.fg[].cls', 'R.rm[].cls']) }),
        V.table(S, { id: 'ex-items', area: 'Inventory', title: 'Excess and dead stock', question: 'Which items, and how much?', unit: 'text', trace: { rows: 'R.fg', where: listed, order: [['exVal', 'desc']] }, columns: [{ field: 'id', label: 'Item' }, { field: 'cls', label: 'Class' }, { field: 'oh', label: 'Physical' }, { field: 'al', label: 'Allocated' }, { field: 'uncomm', label: 'Uncommitted' }, { field: 'exVal', label: 'Excess value (£)' }], provenance: calc('per-item excess (products)', ['R.fg']) }),
        V.table(S, { id: 'ex-items-rm', area: 'Inventory', title: 'Excess and dead stock: materials', question: 'Which materials, and how much?', unit: 'text', trace: { rows: 'R.rm', where: listed, order: [['exVal', 'desc']] }, columns: [{ field: 'id', label: 'Item' }, { field: 'cls', label: 'Class' }, { field: 'oh', label: 'Physical' }, { field: 'al', label: 'Allocated' }, { field: 'uncomm', label: 'Uncommitted' }, { field: 'exVal', label: 'Excess value (£)' }], provenance: calc('per-item excess (materials)', ['R.rm']) })
      ];
    },
    'Policy comparison'(S) {
      return [
        V.table(S, { id: 'pc-alt', area: 'Scenarios & Recommendations', title: 'Risk under the other policy', question: 'Does the policy choice change the risk picture?', unit: 'text', trace: { rows: 'R.alt.fg', where: [] }, columns: [{ field: 'id', label: 'Item' }, { field: 'sev', label: `Risk (${V.at(S, 'CFG.pol') ? 'workbook' : 'recommended'} policy)` }], provenance: calc('the same analysis re-run with the other safety-stock policy', ['R.alt']) }),
        V.table(S, { id: 'pc-alt-rm', area: 'Scenarios & Recommendations', title: 'Risk under the other policy: materials', question: 'Does the policy choice change the risk picture?', unit: 'text', trace: { rows: 'R.alt.rm', where: [] }, columns: [{ field: 'id', label: 'Item' }, { field: 'sev', label: `Risk (${V.at(S, 'CFG.pol') ? 'workbook' : 'recommended'} policy)` }], provenance: calc('the same analysis re-run with the other safety-stock policy', ['R.alt']) })
      ];
    },
    'Reorder policy'(S) {
      const vd = ['Existing ROP insufficient', 'Existing ROP possibly excessive', 'Broadly aligned'];
      return [
        V.bars(S, { id: 'rp-verdicts', area: 'Demand & Planning', title: 'Reorder points vs calculated policy', question: 'Is our reorder policy right?', unit: 'items', labels: vd, series: [{ name: 'Items', trace: vd.map(v => ({ count: ALL, where: [['verdict', '==', v]] })) }], provenance: calc('workbook ROP vs calculated ROP (z, LT, σd, σLT)', ['R.fg[].verdict', 'R.rm[].verdict']), drill: { area: 'Demand & Planning', view: 'stock-policy' } }),
        countKpi(S, { id: 'rp-not-assessed', area: 'Demand & Planning', title: 'Items without a policy verdict', question: 'Where can policy not be judged?', items: ALL, where: [['verdict', 'match', '^Not Assessed']], provenance: calc('items the engine could not assess', ['R.fg[].verdict']) }),
        V.table(S, { id: 'rp-items', area: 'Demand & Planning', title: 'Stock policy by item', question: 'Which reorder points need changing?', unit: 'text', trace: { rows: 'R.fg', where: [] }, columns: [{ field: 'id', label: 'Item' }, { field: 'd', label: 'Demand / day' }, { field: 'lt', label: 'Lead time (days)' }, { field: 'ss', label: 'SS (workbook)' }, { field: 'ssR', label: 'SS (calculated)' }, { field: 'rop', label: 'ROP (workbook)' }, { field: 'ropR', label: 'ROP (calculated)' }, { field: 'verdict', label: 'Verdict' }], provenance: calc('safety stock and reorder point per item', ['R.fg']) })
      ];
    },
    'Forecast accuracy'(S) {
      if (!V.at(S, 'R.hasF')) return [Object.assign(V.kpi(S, { id: 'fa-unavailable', area: 'Demand & Planning', title: 'Historical forecast accuracy', question: 'Can we trust our existing forecasts?', unit: 'items', trace: { field: 'R.noSuchField' }, provenance: calc('requires Forecast_Units in the workbook', ['R.hasF']) }), { completeness: { status: 'unavailable', reasons: ['No Forecast_Units data in this workbook, so historical forecast accuracy cannot be calculated. Nothing has been inferred.'] } })];
      return [
        V.table(S, { id: 'fa-items', area: 'Demand & Planning', title: 'Forecast accuracy by product', question: 'Which forecasts can be relied on?', unit: 'text', trace: { rows: 'credRows', where: [] }, columns: [{ field: 'id', label: 'Item' }, { field: 'c.acc', label: 'Accuracy' }, { field: 'c.bias', label: 'Bias' }, { field: 'c.verdict', label: 'Verdict' }, { field: 'c.conf', label: 'Confidence' }], provenance: calc('historical forecast vs actual (workbook Forecast_Units)', ['cred[].acc', 'cred[].bias', 'cred[].verdict']), confidence: V.confFor(S, 'Forecast accuracy assessment') }),
        V.kpi(S, { id: 'fa-products', area: 'Demand & Planning', title: 'Products with an accuracy assessment', question: 'How many forecasts can be assessed?', unit: 'items', trace: { count: ['credRows'], where: [] }, provenance: calc('products with forecast history', ['cred']) })
      ];
    },
    'Demand forecast'(S) {
      const ok = V.items(S, ['R.fg']).filter(x => { const f = S.fc[x.id]; return f && f.ok; });
      if (!ok.length) return [Object.assign(V.kpi(S, { id: 'df-unavailable', area: 'Demand & Planning', title: 'Statistical forecast', question: 'What demand should we plan for?', unit: 'units', trace: { field: 'R.noSuchField' }, provenance: calc('requires at least 6 months of demand history', ['fc']) }), { completeness: { status: 'unavailable', reasons: ['Fewer than 6 months of demand history: no statistical forecast can be produced.'] } })];
      const id = ok[0].id;
      return [
        V.kpi(S, { id: 'df-skus', area: 'Demand & Planning', title: 'Products with a statistical forecast', question: 'How many products can be forecast?', unit: 'items', trace: { count: ['R.fg'], where: [['id', 'in', ok.map(x => x.id)]] }, provenance: calc('products with at least 6 months of history', ['fc[].ok']) }),
        V.kpi(S, { id: 'df-s12', area: 'Demand & Planning', title: `${id}: forecast, next 12 months`, question: 'How much will we sell next year?', unit: 'units', trace: { field: `fc.${id}.s12` }, provenance: calc('statistical forecast total (method chosen by back-test)', [`fc.${id}.s12`, `fc.${id}.meth`]), status: S.fc[id].meth }),
        V.line(S, { id: 'df-chart', area: 'Demand & Planning', title: `${id}: monthly forecast with 80% range`, question: 'What demand should we plan for?', unit: 'units', labels: HORIZON.slice(0, S.fc[id].f.length), series: [{ name: 'Forecast', field: `fc.${id}.f` }, { name: 'High (80%)', field: `fc.${id}.hi` }, { name: 'Low (80%)', field: `fc.${id}.lo` }], provenance: calc('statistical forecast and 80% range', [`fc.${id}.f`, `fc.${id}.hi`, `fc.${id}.lo`]) })
      ];
    },
    Suppliers(S) {
      const cats = ['Low risk', 'Medium risk', 'High risk'];
      return [
        countKpi(S, { id: 'su-high', area: 'Procurement & Suppliers', title: 'High-risk suppliers', question: 'Which suppliers put supply at risk?', unit: 'suppliers', items: ['R.sup'], where: [['cat', '==', 'High risk']], provenance: calc('supplier score: on-time, lead-time stability, fill rate', ['R.sup[].cat']), confidence: V.confFor(S, 'Supplier performance'), drill: { area: 'Procurement & Suppliers', view: 'suppliers', filter: { cat: 'High risk' } } }),
        countKpi(S, { id: 'su-na', area: 'Procurement & Suppliers', title: 'Suppliers not assessed', question: 'Which suppliers lack enough evidence?', unit: 'suppliers', items: ['R.sup'], where: [['cat', 'match', '^Not Assessed']], provenance: calc('metric-specific eligibility (Not Assessed — Insufficient Evidence)', ['R.sup[].cat']) }),
        V.bars(S, { id: 'su-cats', area: 'Procurement & Suppliers', title: 'Suppliers by risk', question: 'How is supplier risk spread?', unit: 'suppliers', labels: cats, series: [{ name: 'Suppliers', trace: cats.map(c => ({ count: ['R.sup'], where: [['cat', '==', c]] })) }], provenance: calc('supplier risk class', ['R.sup[].cat']) }),
        V.table(S, { id: 'su-rows', area: 'Procurement & Suppliers', title: 'Supplier scorecard', question: 'How does each supplier perform?', unit: 'text', trace: { rows: 'R.sup', where: [], order: [['score', 'asc']] }, columns: [{ field: 'id', label: 'Supplier' }, { field: 'name', label: 'Name' }, { field: 'score', label: 'Score' }, { field: 'cat', label: 'Risk' }, { field: 'otd', label: 'On-time' }, { field: 'fill', label: 'Fill rate' }, { field: 'assess', label: 'Assessment' }], provenance: calc('supplier scorecard', ['R.sup']) })
      ];
    },
    'Data quality'(S) {
      const sev = ['High', 'Medium', 'Low'];
      return [
        V.bars(S, { id: 'dq-sev', area: 'Data Management', title: 'Data issues by severity', question: 'Can the data be relied on?', unit: 'issues', labels: sev, series: [{ name: 'Issues', trace: sev.map(s => ({ count: ['R.dq'], where: [['sev', '==', s]] })) }], provenance: calc('data-quality checks on every sheet', ['R.dq[].sev']) }),
        V.table(S, { id: 'dq-rows', area: 'Data Management', title: 'Data issues', question: 'What must be fixed in the source data?', unit: 'text', trace: { rows: 'R.dq', where: [], order: [['sev', 'asc', sev]] }, columns: [{ field: 'sev', label: 'Severity' }, { field: 'kind', label: 'Type' }, { field: 'sheet', label: 'Sheet' }, { field: 'msg', label: 'Issue' }], provenance: calc('data-quality checks', ['R.dq']) })
      ];
    },
    'Client questions'(S) {
      return [
        countKpi(S, { id: 'cq-count', area: 'Data Management', title: 'Questions for the business', question: 'What must we ask the client?', unit: 'questions', items: ['qs'], provenance: calc('generated from discrepancies, each with its evidence', ['qs']) }),
        V.table(S, { id: 'cq-rows', area: 'Data Management', title: 'Client questions', question: 'What must we ask the client?', unit: 'text', trace: { rows: 'qs', where: [] }, columns: [{ field: 'pri', label: 'Priority' }, { field: 'q', label: 'Question' }, { field: 'why', label: 'Why it matters' }, { field: 'ev', label: 'Evidence' }], provenance: calc('client questions', ['qs']) })
      ];
    },
    'Data confidence'(S) {
      return [
        V.table(S, { id: 'dc-areas', area: 'Data Management', title: 'How much can you rely on these results?', question: 'How much weight can each result bear?', unit: 'text', trace: { rows: 'conf', where: [] }, columns: [{ field: 'area', label: 'Area' }, { field: 'rating', label: 'Confidence' }, { field: 'why', label: 'Why' }], provenance: calc('evidence behind each area of the analysis', ['conf']) })
      ];
    },
    Summary(S) {
      // Phase 0 exposes the figures the Summary is built from. The prioritised recommendation list itself is rendered by
      // the Summary tab today; it moves into a view-model in Phase 5 (blueprint E) without duplicating its logic.
      return [
        classCount(S, { id: 'sm-critical', area: 'Scenarios & Recommendations', title: 'Critical items', question: 'What needs action first?', items: ALL, where: [['sev', '==', 3]], provenance: calc('risk class', ['R.fg[].sev', 'R.rm[].sev']) }),
        countKpi(S, { id: 'sm-order-now', area: 'Scenarios & Recommendations', title: 'Materials to order now', question: 'What must be bought now?', items: ['mrp'], where: [['st', '==', 'ORDER NOW']], provenance: calc('MRP status', ['mrp[].st']) }),
        countKpi(S, { id: 'sm-sup-high', area: 'Scenarios & Recommendations', title: 'High-risk suppliers', question: 'Which suppliers need a review?', unit: 'suppliers', items: ['R.sup'], where: [['cat', '==', 'High risk']], provenance: calc('supplier risk class', ['R.sup[].cat']) }),
        countKpi(S, { id: 'sm-excess', area: 'Scenarios & Recommendations', title: 'Items flagged as excess', question: 'Where can buying stop?', items: ALL, where: [['fEx', '==', true]], provenance: calc('excess flag (days of cover above the threshold)', ['R.fg[].fEx', 'R.rm[].fEx']) }),
        countKpi(S, { id: 'sm-rop-low', area: 'Scenarios & Recommendations', title: 'Reorder points too low', question: 'Where is the policy exposing us?', items: ALL, where: [['verdict', '==', 'Existing ROP insufficient']], provenance: calc('reorder-policy verdict', ['R.fg[].verdict', 'R.rm[].verdict']) })
      ];
    },
    Settings(S) {
      return [
        V.table(S, { id: 'st-thresholds', area: 'Settings', title: 'Thresholds and assumptions', question: 'How was this calculated?', unit: 'text', trace: { rows: 'SETDEF', where: [] }, columns: [{ field: '0', label: 'Setting' }, { field: '1', label: 'Description' }, { field: '5', label: 'Section' }, { field: '6', label: 'What it does' }], provenance: { source: 'workbook', basis: 'engine settings (CFG) and their documented defaults', fields: ['SETDEF', 'CFG'] } })
      ];
    }
  };

  /* Approved navigation: SCIE-NAVIGATION-AND-SCREEN-SPEC-v1 (owner decisions D-4, D-6, N-1 to N-6; 23 Nov 2026).
   * Six primary areas (Overview is a direct destination), three separate utility areas, and the Advanced view with all
   * 17 original tabs unchanged. Each of the 17 tabs has exactly one home. `original` names the tab whose content a
   * subsection shows; for the two moved sections it is the tab they came from (N-3), so "See original tab" always opens
   * the real source. Filters are scoped to one primary area (spec v1 §10.7): kept between its subsections, reset when the
   * area changes, never global. Superseded Phase 0 map (D-4 version): see IMPLEMENTATION-RECORD.md, "Navigation map v1". */
  const NAV = Object.freeze({
    primary: [
      { id: 'overview', area: 'Overview', direct: true, subs: [{ id: 'dashboard', label: 'Executive dashboard', tabs: ['Overview'], original: ['Overview'] }] },
      { id: 'inventory', area: 'Inventory', subs: [
        { id: 'stock', label: 'Stock position', tabs: ['Finished goods', 'Materials'], original: ['Finished goods', 'Materials'] },
        { id: 'health', label: 'Stock health & ABC', tabs: ['Health'], original: ['Health'] },
        { id: 'excess', label: 'Excess & dead stock', tabs: ['Excess & dead stock'], original: ['Excess & dead stock'] }] },
      { id: 'planning', area: 'Demand & Planning', subs: [
        { id: 'forecast', label: 'Demand forecast', tabs: ['Demand forecast'], original: ['Demand forecast'] },
        { id: 'accuracy', label: 'Forecast accuracy', tabs: ['Forecast accuracy'], original: ['Forecast accuracy'] },
        { id: 'policy', label: 'Safety stock & reorder points', tabs: ['Reorder policy'], original: ['Reorder policy'] }] },
      { id: 'procurement', area: 'Procurement & Suppliers', subs: [
        { id: 'buy', label: 'What to buy', tabs: ['MRP'], original: ['MRP'] },
        { id: 'suppliers', label: 'Supplier performance', tabs: ['Suppliers'], original: ['Suppliers'] },
        { id: 'reconciliation', label: 'On-order reconciliation', tabs: [], section: 'On-order reconciliation', original: ['Data quality'] }] },
      { id: 'production', area: 'Production', conditional: 'production', subs: [
        { id: 'feasibility', label: 'Production feasibility', tabs: ['Production feasibility'], original: ['Production feasibility'] },
        { id: 'attainment', label: 'Schedule attainment', tabs: [], section: 'Production schedule adherence and attainment (by SKU)', original: ['Suppliers'] }] },
      { id: 'scenarios', area: 'Scenarios & Recommendations', subs: [
        { id: 'recommendations', label: 'Recommendations & management summary', tabs: ['Summary'], original: ['Summary'] },
        { id: 'comparison', label: 'Policy & supply-source comparison', tabs: ['Policy comparison'], original: ['Policy comparison'] }] }
    ],
    utility: [
      { id: 'reports', area: 'Reports', subs: [
        { id: 'report', label: 'Management report', tabs: [], source: 'Summary', original: ['Summary'] },
        { id: 'workbook', label: 'Engine output workbook', tabs: [], original: ['Settings'] }] },
      { id: 'data', area: 'Data Management', subs: [
        { id: 'load', label: 'Load workbook', tabs: [], original: [] },
        { id: 'quality', label: 'Data quality', tabs: ['Data quality'], original: ['Data quality'] },
        { id: 'questions', label: 'Client questions', tabs: ['Client questions'], original: ['Client questions'] },
        { id: 'confidence', label: 'Data confidence', tabs: ['Data confidence'], original: ['Data confidence'] }] },
      { id: 'settings', area: 'Settings', subs: [{ id: 'thresholds', label: 'Thresholds & assumptions', tabs: ['Settings'], original: ['Settings'] }] }
    ],
    advanced: { id: 'advanced', area: 'Advanced view' },
    filterScope: 'area'
  });
  /* Production is shown only when the business has production: a BOM, production history or production orders. */
  function hasProduction(S) {
    return V.resolve(S, { count: ['R.pr'], where: [] }) > 0 || V.resolve(S, { count: ['feas.rows'], where: [] }) > 0 || Object.keys(V.at(S, 'R.bom') || {}).length > 0;
  }
  /* Primary areas visible for this business (Production hidden without production data; spec v1 §10.8). */
  function primary(S) { return NAV.primary.filter(a => !a.conditional || hasProduction(S)); }
  function find(areaId, subId) { const a = NAV.primary.concat(NAV.utility).find(x => x.id === areaId); const sub = a && (a.subs.find(x => x.id === subId) || a.subs[0]); return a ? { a, sub } : null; }
  function forTab(S, tab) { const b = B[tab]; if (!b) throw new Error(`no view-model for tab ${tab}`); return b(S); }
  /* View-models for one subsection: those of its tabs; moved sections have their own builders (added with their screens). */
  function forSub(S, areaId, subId) { const f = find(areaId, subId); if (!f) return []; const out = []; for (const t of f.sub.tabs) for (const vm of forTab(S, t)) out.push(vm); return out; }
  Object.assign(V, { BUILDERS: B, NAV, hasProduction, primary, find, forTab, forSub });
})(typeof window !== 'undefined' ? window : globalThis);
