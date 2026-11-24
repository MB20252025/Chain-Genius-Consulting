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
  /* A chart over engine rows with no qualifying row is left out (nothing to draw), never drawn empty or as zeros. */
  const keep = list => list.filter(v => !(v.kind === 'bar' && v.rowsTrace && !v.labels.length));
  const countKpi = (S, o) => V.kpi(S, Object.assign({ unit: 'items' }, o, { trace: { count: o.items, where: o.where || [] } }));

  /* Reorder policy table columns: the original tab's columns, with its 'Why' explanation (days of cover, lead-time demand,
     the gap left before safety stock) from CGShared.ropWhy (S15, proven 24 Nov 2026). */
  const RP_COLS = [{ field: 'id', label: 'Item' }, { field: 'grp', label: 'Group' }, { field: 'd', label: 'Demand / day' }, { field: 'sg', label: 'σ monthly' }, { field: 'lt', label: 'Lead time (days)' }, { field: 'ltInfo.label', label: 'Lead-time source' }, { field: 'ltS', label: 'σLT (days)' }, { field: 'ss', label: 'Safety stock (workbook)' }, { field: 'ssR', label: 'Safety stock (calculated)' }, { field: 'rop', label: 'ROP (workbook)' }, { field: 'ropR', label: 'ROP (calculated)' }, { field: 'ropGap', label: 'Difference' }, { field: 'verdict', label: 'Verdict' }, { field: 'why', label: 'Why' }];
  /* One product's forecast views (Demand forecast): the demand timeline and the back-test comparison of methods. The
     screen calls this for the product chosen in its selector; the tab builder for the first forecast product. */
  function forecastFor(S, id) {
    const r = V.items(S, ['fcRows']).find(y => y.id === id);
    if (!r || !r.f.ok) return [];
    const F = r.f, names = V.at(S, 'methodNames') || {}, est = (basis, fields) => ({ source: 'estimated', basis, fields });
    const meth = F.meth.map(k => ({ k, label: names[k] || k }));
    const labels = meth.map(m => (m.k === F.best ? `${m.label} (selected)` : m.label)).concat(F.wb === null || F.wb === undefined ? [] : ['Existing workbook forecast']);
    const wape = meth.map(m => ({ entry: `fc.${id}.bt.${m.k}`, key: 'wape' })).concat(F.wb === null || F.wb === undefined ? [] : [{ field: `fc.${id}.wb` }]);
    return [
      V.timeline(S, { id: 'df-chart', area: 'Demand & Planning', title: `${id}: demand history and forecast`, question: 'What demand should we plan for?', unit: 'units', row: r.x, fc: F, horizon: HORIZON, item: id, provenance: est(`actual demand by calendar month; statistical forecast (${names[F.best] || F.best}) with an indicative 80% range, based on ${F.bt[F.best].pts} back-test points`, [`R.fg[${id}].hc`, `R.fg[${id}].fc`, `fc.${id}.f`, `fc.${id}.hi`, `fc.${id}.lo`]) }),
      Object.assign(V.bars(S, { id: 'df-methods', area: 'Demand & Planning', title: `${id}: back-test error by method (WAPE)`, question: 'Which method forecasts this product best?', unit: '%', labels, series: [{ name: 'WAPE', trace: wape }], item: id, provenance: calc('back-test: each method forecasts the next month from earlier months only; lower is better', [`fc.${id}.bt`, `fc.${id}.wb`]) }), { scale: 'fraction' }),
      V.kpi(S, { id: 'df-s12', area: 'Demand & Planning', title: `${id}: forecast, next 12 months`, question: 'How much will this product sell next year?', unit: 'units', trace: { field: `fc.${id}.s12` }, item: id, provenance: est(`statistical forecast total (${names[F.best] || F.best}, chosen by back-test)`, [`fc.${id}.s12`, `fc.${id}.best`]), status: F.trend })
    ];
  }

  /* Builders for the two sections moved out of their tabs (N-3). Original source tabs: Data quality, Suppliers. */
  const SECTIONS = {
    'On-order reconciliation'(S) {
      return [
        countKpi(S, { id: 'rc-gap-n', area: 'Procurement & Suppliers', title: 'Materials with more on order than POs support', question: 'Is "on order" backed by real purchase orders?', items: ['R.recon'], where: [['gap', '>', 0]], provenance: calc('inventory on-order vs PO outstanding at the snapshot', ['R.recon[].gap']) }),
        Object.assign(V.kpi(S, { id: 'rc-gap-value', area: 'Procurement & Suppliers', title: 'Gap value at standard cost', question: 'What is the unsupported on-order worth?', unit: '£', trace: { shared: 'reconGapValue', items: ['R.recon'], where: [['gap', '>', 0]] }, provenance: calc('same calculation as the Data quality tab', ['R.recon[].val']) }), {}),
        V.kpi(S, { id: 'rc-top10', area: 'Procurement & Suppliers', title: 'Share of the gap in the 10 largest', question: 'Is the gap systemic or a few bad records?', unit: '%', trace: { shared: 'reconTop10Share', items: ['R.recon'], where: [] }, provenance: calc('same calculation as the Data quality tab', ['R.recon[].gap']) }),
        V.rowBars(S, { id: 'rc-largest', area: 'Procurement & Suppliers', title: 'Largest gaps (£)', question: 'Where is the unsupported on-order?', unit: '£', trace: { rows: 'R.recon', where: [], order: [['gap', 'desc', null, 'last']], take: 15 }, label: 'id', series: [{ name: 'Gap £', field: 'val' }], provenance: calc('per-material reconciliation', ['R.recon']) }),
        V.table(S, { id: 'rc-rows', area: 'Procurement & Suppliers', title: 'Per-material reconciliation', question: 'Which materials, and by how much?', unit: 'text', trace: { rows: 'R.recon', where: [], order: [['gap', 'desc', null, 'last']] }, columns: [{ field: 'id', label: 'Material' }, { field: 'name', label: 'Name' }, { field: 'inv', label: 'Inventory on-order' }, { field: 'po', label: 'PO outstanding at snapshot' }, { field: 'gap', label: 'Gap' }, { field: 'val', label: 'Gap £' }, { field: 'n', label: 'POs on file' }], provenance: calc('per-material reconciliation', ['R.recon']) })
      ];
    },
    'Production schedule adherence and attainment (by SKU)'(S) {
      const t = k => ({ shared: 'prTotals', items: ['R.pr'], where: [], key: k });
      return [
        V.kpi(S, { id: 'pa-orders', area: 'Production', title: 'Production orders', question: 'How much production history is there?', unit: 'orders', trace: t('T.n'), provenance: calc('same calculation as the production section of the Suppliers tab', ['R.pr[].n']) }),
        V.kpi(S, { id: 'pa-planned', area: 'Production', title: 'Total planned quantity', question: 'How much was planned?', unit: 'units', trace: t('T.pl'), provenance: calc('CGShared.prTotals', ['R.pr[].planned']) }),
        V.kpi(S, { id: 'pa-actual', area: 'Production', title: 'Total actual quantity', question: 'How much was produced?', unit: 'units', trace: t('T.ac'), provenance: calc('CGShared.prTotals', ['R.pr[].actual']) }),
        V.kpi(S, { id: 'pa-avg', area: 'Production', title: 'Average order attainment %', question: 'How close do orders come to plan?', unit: '%', trace: t('avg'), provenance: calc('mean attainment across the orders, as on the Suppliers tab', ['R.pr[].att']) }),
        V.kpi(S, { id: 'pa-weighted', area: 'Production', title: 'Overall weighted attainment %', question: 'Total actual against total planned', unit: '%', trace: t('w'), provenance: calc('total actual ÷ total planned, as on the Suppliers tab', ['R.pr[].planned', 'R.pr[].actual']) }),
        V.rowBars(S, { id: 'pa-chart', area: 'Production', title: 'Weighted attainment by product (lowest 12)', question: 'Which products fall short of plan?', unit: '%', trace: { rows: 'R.pr', where: [['wAtt', 'num']], order: [['wAtt', 'asc', null, 'last']], take: 12 }, label: 'id', series: [{ name: 'Weighted attainment %', field: 'wAtt' }], provenance: calc('per-SKU attainment', ['R.pr[].wAtt']) }),
        V.table(S, { id: 'pa-rows', area: 'Production', title: 'Attainment by product', question: 'Per SKU: orders, quantities, lateness', unit: 'text', trace: { rows: 'R.pr', where: [] }, columns: [{ field: 'id', label: 'SKU' }, { field: 'n', label: 'Orders' }, { field: 'nQ', label: 'Orders used' }, { field: 'planned', label: 'Total planned' }, { field: 'actual', label: 'Total actual' }, { field: 'att', label: 'Avg order attainment %' }, { field: 'wAtt', label: 'Weighted attainment %' }, { field: 'exQ', label: 'Excluded' }, { field: 'lateN', label: 'Late orders' }, { field: 'late', label: 'Late %' }, { field: 'slip', label: 'Avg slip d' }], provenance: calc('per-SKU production attainment', ['R.pr']) })
      ];
    }
  };
  const B = {
    Overview(S) {
      const c = V.confFor(S, 'Stock position and shortage risk');
      const SEV = [[3, 'Critical'], [2, 'High'], [1, 'Medium'], [0, 'Low']];
      const topOrder = [['sev', 'desc', null, 'first'], ['cover', 'asc', null, 'last']];
      return [
        V.total(S, { id: 'ov-value', area: 'Overview', title: 'Inventory value', question: 'How much capital is held in stock?', unit: '£', field: 'R.tot', items: ALL, key: 'val', provenance: calc('on-hand quantity × unit cost, all items', ['R.tot', 'R.fg[].val', 'R.rm[].val']), drill: { area: 'Inventory', view: 'stock' } }),
        countKpi(S, { id: 'ov-items', area: 'Overview', title: 'Items analysed', question: 'How much of the range is covered?', items: ALL, provenance: { source: 'workbook', basis: 'products and materials in the workbook', fields: ['R.fg', 'R.rm'] }, drill: { area: 'Inventory', view: 'stock' } }),
        classCount(S, { id: 'ov-high-risk', area: 'Overview', title: 'High or critical risk items', question: 'How many items need attention now?', items: ALL, where: [['sev', '>=', 2]], provenance: calc('risk class from cover vs ROP/SS and lead time', ['R.fg[].sev', 'R.rm[].sev']), confidence: c, drill: { area: 'Inventory', view: 'stock', filter: { sevMin: 2 } } }),
        V.total(S, { id: 'ov-excess', area: 'Overview', title: 'Potential excess value', question: 'How much capital may be tied up in stock we do not need?', unit: '£', field: 'R.exV', items: ALL, key: 'exVal', provenance: calc('stock above the excess threshold (days of cover), valued at cost; an upper bound, not a saving', ['R.exV', 'R.fg[].exVal', 'R.rm[].exVal']), drill: { area: 'Inventory', view: 'excess' } }),
        V.total(S, { id: 'ov-shortage', area: 'Overview', title: 'Shortage value', question: 'How much stock is missing against the reorder policy?', unit: '£', field: 'R.shV', items: ALL, key: 'short', provenance: calc('engine shortage value', ['R.shV']), drill: { area: 'Inventory', view: 'stock', filter: { sevMin: 2 } } }),
        countKpi(S, { id: 'ov-order-now', area: 'Overview', title: 'Materials to order now', question: 'What must be bought immediately?', items: ['mrp'], where: [['st', '==', 'ORDER NOW']], provenance: calc('MRP, PO-verified supply', ['mrp[].st']), drill: { area: 'Procurement & Suppliers', view: 'buy', filter: { st: 'ORDER NOW' } } }),
        countKpi(S, { id: 'ov-sup-high', area: 'Overview', title: 'High-risk suppliers', question: 'Which suppliers put supply at risk?', unit: 'suppliers', items: ['R.sup'], where: [['cat', '==', 'High risk']], provenance: calc('supplier score: on-time, lead-time stability, fill rate', ['R.sup[].cat']), drill: { area: 'Procurement & Suppliers', view: 'suppliers' } }),
        countKpi(S, { id: 'ov-dq-high', area: 'Overview', title: 'High-severity data issues', question: 'Is anything in the data serious enough to distrust results?', unit: 'issues', items: ['R.dq'], where: [['sev', '==', 'High']], provenance: calc('data-quality checks', ['R.dq[].sev']), drill: { area: 'Data Management', view: 'quality' } }),
        Object.assign(V.kpi(S, { id: 'ov-health', area: 'Overview', title: 'Overall stock health', question: 'How healthy is the stock position overall?', unit: 'score', trace: { shared: 'healthMean', items: ALL, where: [['score', 'set']] }, provenance: calc('simple average of item health scores (100 − penalty points), the same calculation as the Health tab', ['R.fg[].score', 'R.rm[].score']), drill: { area: 'Inventory', view: 'health' } }),
          { completeness: V.resolve(S, { count: ALL, where: [['score', 'null']] }) ? { status: 'partial', included: V.resolve(S, { count: ALL, where: [['score', 'set']] }), of: V.resolve(S, { count: ALL, where: [] }), excluded: V.resolve(S, { count: ALL, where: [['score', 'null']] }), reasons: ['items without a health score (Not Assessed) are not in the average'] } : { status: 'complete', reasons: [] } }),
        V.bars(S, { id: 'ov-value-split', area: 'Overview', title: 'Inventory value by type', question: 'Where is the stock value held?', unit: '£', labels: ['Finished goods', 'Raw materials'], series: [{ name: 'Value', trace: [{ field: 'R.fgV' }, { field: 'R.rmV' }] }], provenance: calc('on-hand × unit cost by item type', ['R.fgV', 'R.rmV']), drill: { area: 'Inventory', view: 'stock' } }),
        V.bars(S, { id: 'ov-risk-mix', area: 'Overview', title: 'Items by risk class', question: 'How is risk spread across the range?', unit: 'items', labels: SEV.map(x => x[1]).concat(['Not Assessed']), series: [{ name: 'Items', trace: SEV.map(x => ({ count: ALL, where: [['sev', '==', x[0]]] })).concat([{ count: ALL, where: [['sev', 'null']] }]) }], provenance: calc('risk class per item', ['R.fg[].sev', 'R.rm[].sev']), drill: { area: 'Inventory', view: 'stock' } }),
        V.entryBars(S, { id: 'ov-family', area: 'Overview', title: 'Value by product family', question: 'Which product families hold the value?', unit: '£', entry: 'R.fam', provenance: calc('on-hand value by product family', ['R.fam']) }),
        V.entryBars(S, { id: 'ov-group', area: 'Overview', title: 'Value by material group', question: 'Which material groups hold the value?', unit: '£', entry: 'R.rg', provenance: calc('on-hand value by material group', ['R.rg']) }),
        V.bars(S, { id: 'ov-cover-fg', area: 'Overview', title: 'Stock cover: finished goods', question: 'How many days of demand does product stock cover?', unit: 'items', labels: Object.keys(S.coverBands(V.items(S, ['R.fg']))), series: [{ name: 'Products', trace: Object.keys(S.coverBands(V.items(S, ['R.fg']))).map(k => ({ bands: 'R.fg', key: k })) }], provenance: calc('available ÷ daily demand, banded (the Overview tab\'s bucket())', ['R.fg[].cover']) }),
        V.bars(S, { id: 'ov-cover-rm', area: 'Overview', title: 'Stock cover: raw materials', question: 'How many days of usage does material stock cover?', unit: 'items', labels: Object.keys(S.coverBands(V.items(S, ['R.rm']))), series: [{ name: 'Materials', trace: Object.keys(S.coverBands(V.items(S, ['R.rm']))).map(k => ({ bands: 'R.rm', key: k })) }], provenance: calc('available ÷ daily usage, banded (the Overview tab\'s bucket())', ['R.rm[].cover']) }),
        V.table(S, { id: 'ov-top-fg', area: 'Overview', title: 'Highest-risk products', question: 'Which products are most urgent?', unit: 'text', trace: { rows: 'R.fg', where: [], order: topOrder, take: 6 }, columns: [{ field: 'id', label: 'Item' }, { field: 'sev', label: 'Risk' }, { field: 'cover', label: 'Cover d' }, { field: 'why', label: 'Why' }], provenance: calc('the Overview tab\'s ranking: risk, then lowest cover', ['R.fg']), drill: { area: 'Inventory', view: 'stock' } }),
        V.table(S, { id: 'ov-top-rm', area: 'Overview', title: 'Highest-risk materials', question: 'Which materials are most urgent?', unit: 'text', trace: { rows: 'R.rm', where: [], order: topOrder, take: 8 }, columns: [{ field: 'id', label: 'Item' }, { field: 'sev', label: 'Risk' }, { field: 'cover', label: 'Cover d' }, { field: 'why', label: 'Why' }], provenance: calc('the Overview tab\'s ranking: risk, then lowest cover', ['R.rm']), drill: { area: 'Inventory', view: 'stock' } }),
        V.table(S, { id: 'ov-sup-risk', area: 'Overview', title: 'Supplier risk', question: 'Which suppliers affect the most at-risk materials?', unit: 'text', trace: { rows: 'R.supRisk', where: [] }, columns: [{ field: 'id', label: 'Supplier' }, { field: 'name', label: 'Name' }, { field: 'cat', label: 'Risk class' }, { field: 'score', label: 'Score' }, { field: 'risk', label: 'At-risk materials' }, { field: 'mats', label: 'Materials supplied' }], provenance: calc('suppliers ranked by at-risk materials, then score', ['R.supRisk']), drill: { area: 'Procurement & Suppliers', view: 'suppliers' } }),
        V.table(S, { id: 'ov-confidence', area: 'Overview', title: 'How much can you rely on these results?', question: 'How much weight can each result bear?', unit: 'text', trace: { rows: 'conf', where: [] }, columns: [{ field: 'area', label: 'Area' }, { field: 'rating', label: 'Confidence' }], provenance: calc('evidence behind each area of the analysis', ['conf']), drill: { area: 'Data Management', view: 'confidence' } }),
        V.recommendations(S, { id: 'ov-recs', area: 'Overview', title: 'Recommended actions', question: 'What should management do first?', take: 3, provenance: calc('the management summary\'s prioritised recommendations, exactly as on the Summary tab', ['summaryModel().rec']), drill: { area: 'Scenarios & Recommendations', view: 'recommendations' } })
      ];
    },
    Health(S) {
      const cats = ['Excellent', 'Healthy', 'Monitor', 'At risk', 'Critical'];
      return [
        V.bars(S, { id: 'he-categories', area: 'Inventory', title: 'Stock health by category', question: 'How healthy is the stock position overall?', unit: 'items', labels: cats, series: [{ name: 'Items', trace: cats.map(c => ({ count: ALL, where: [['cat', '==', c], ['score', 'set']] })) }], provenance: calc('health score = 100 − penalty points; category bands', ['R.fg[].cat', 'R.rm[].cat', 'R.fg[].score']), drill: { area: 'Inventory', view: 'health' } }),
        countKpi(S, { id: 'he-not-assessed', area: 'Inventory', title: 'Items without a health score', question: 'How many items could not be scored?', items: ALL, where: [['score', 'null']], provenance: calc('items the engine could not assess', ['R.fg[].score', 'R.rm[].score']), drill: { area: 'Inventory', view: 'health' } }),
        Object.assign(V.kpi(S, { id: 'he-overall', area: 'Inventory', title: 'Overall health', question: 'How healthy is the stock position overall?', unit: 'score', trace: { shared: 'healthMean', items: ALL, where: [['score', 'set']] }, provenance: calc('simple average of item health scores, the same calculation as the Health tab', ['R.fg[].score', 'R.rm[].score']) }), { completeness: V.resolve(S, { count: ALL, where: [['score', 'null']] }) ? { status: 'partial', included: V.resolve(S, { count: ALL, where: [['score', 'set']] }), of: V.resolve(S, { count: ALL, where: [] }), excluded: V.resolve(S, { count: ALL, where: [['score', 'null']] }), reasons: ['items without a health score are not in the average'] } : { status: 'complete', reasons: [] } }),
        V.table(S, { id: 'he-abc-fg', area: 'Inventory', title: 'ABC classification: products', question: 'Which products carry the annual value?', unit: 'text', trace: { rows: 'abcFG.rows', where: [] }, columns: [{ field: 'k', label: 'Class' }, { field: 'n', label: 'Items' }, { field: 'p', label: '% of annual value' }, { field: 'c', label: 'Cumulative %' }, { field: 'pv', label: '% of stock value' }], provenance: calc(`annual consumption value; A ≤ ${V.at(S, 'CFG.abcA')}% cumulative, B ≤ ${V.at(S, 'CFG.abcB')}%, as on the Health tab`, ['abcStats(R.fg)']), thresholds: [{ label: 'A limit', value: V.at(S, 'CFG.abcA'), trace: { field: 'CFG.abcA' } }, { label: 'B limit', value: V.at(S, 'CFG.abcB'), trace: { field: 'CFG.abcB' } }] }),
        V.rowBars(S, { id: 'he-abc-fg-chart', area: 'Inventory', title: 'ABC: share of annual value, products', question: 'How concentrated is product value?', unit: '%', trace: { rows: 'abcFG.rows', where: [] }, label: 'k', series: [{ name: '% of annual value', field: 'p' }, { name: 'Cumulative %', field: 'c' }], provenance: calc('CGShared.abcStats(R.fg)', ['abcStats(R.fg)']) }),
        V.table(S, { id: 'he-abc-rm', area: 'Inventory', title: 'ABC classification: materials', question: 'Which materials carry the annual value?', unit: 'text', trace: { rows: 'abcRM.rows', where: [] }, columns: [{ field: 'k', label: 'Class' }, { field: 'n', label: 'Items' }, { field: 'p', label: '% of annual value' }, { field: 'c', label: 'Cumulative %' }, { field: 'pv', label: '% of stock value' }], provenance: calc('same ABC calculation as the Health tab', ['abcStats(R.rm)']) }),
        V.rowBars(S, { id: 'he-abc-rm-chart', area: 'Inventory', title: 'ABC: share of annual value, materials', question: 'How concentrated is material value?', unit: '%', trace: { rows: 'abcRM.rows', where: [] }, label: 'k', series: [{ name: '% of annual value', field: 'p' }, { name: 'Cumulative %', field: 'c' }], provenance: calc('CGShared.abcStats(R.rm)', ['abcStats(R.rm)']) }),
        V.table(S, { id: 'he-items', area: 'Inventory', title: 'Health score by item', question: 'Which items are least healthy?', unit: 'score', trace: { rows: 'R.fg', where: [['score', 'set']], order: [['score', 'asc']] }, columns: [{ field: 'id', label: 'Item' }, { field: 'score', label: 'Score' }, { field: 'cat', label: 'Category' }], provenance: calc('health score per item', ['R.fg[].score', 'R.fg[].cat']) }),
        V.table(S, { id: 'he-items-rm', area: 'Inventory', title: 'Health score by material', question: 'Which materials are least healthy?', unit: 'score', trace: { rows: 'R.rm', where: [['score', 'set']], order: [['score', 'asc']] }, columns: [{ field: 'id', label: 'Item' }, { field: 'score', label: 'Score' }, { field: 'cat', label: 'Category' }], provenance: calc('health score per item', ['R.rm[].score', 'R.rm[].cat']) })
      ];
    },
    'Finished goods'(S) {
      return [
        countKpi(S, { id: 'fg-count', area: 'Inventory', title: 'Finished goods', question: 'How many products are analysed?', items: ['R.fg'], provenance: calc('products in the workbook', ['R.fg']) }),
        classCount(S, { id: 'fg-high-risk', area: 'Inventory', title: 'Products at high or critical risk', question: 'Which products may run short?', items: ['R.fg'], where: [['sev', '>=', 2]], provenance: calc('risk class per product', ['R.fg[].sev']), drill: { area: 'Inventory', view: 'items', filter: { type: 'FG', sevMin: 2 } } }),
        V.total(S, { id: 'fg-value', area: 'Inventory', title: 'Finished-goods value', question: 'How much capital is in products?', unit: '£', field: 'R.fgV', items: ['R.fg'], key: 'val', provenance: calc('on-hand × unit cost, products', ['R.fgV', 'R.fg[].val']) }),
        V.rowBars(S, { id: 'fg-cover-lt', area: 'Inventory', title: 'Lowest cover against lead time: products', question: 'Which products will run out before a replenishment can arrive?', unit: 'days', trace: { rows: 'R.fg', where: [['cover', 'num']], order: [['cover', 'asc', null, 'last']], take: 20 }, label: 'id', series: [{ name: 'Cover (days)', field: 'cover' }, { name: 'Lead time (days)', field: 'lt' }], provenance: calc('available ÷ daily demand, against the engine lead time; cover below lead time means a stock-out before an order now could arrive', ['R.fg[].cover', 'R.fg[].lt']) }),
        V.table(S, { id: 'fg-items', area: 'Inventory', title: 'Products', question: 'What is each product\'s stock position?', unit: 'text', trace: { rows: 'R.fg', where: [], order: [['sev', 'desc']] }, columns: [{ field: 'id', label: 'Item' }, { field: 'name', label: 'Name' }, { field: 'sev', label: 'Risk' }, { field: 'av', label: 'Available' }, { field: 'pos', label: 'Position' }, { field: 'cover', label: 'Cover (days)' }, { field: 'lt', label: 'Lead time (days)' }, { field: 'ss', label: 'SS (workbook)' }, { field: 'rop', label: 'ROP (workbook)' }, { field: 'ssR', label: 'SS (recommended)' }, { field: 'ropR', label: 'ROP (recommended)' }, { field: 'abc', label: 'ABC' }, { field: 'xyz', label: 'XYZ' }, { field: 'conf', label: 'Confidence' }], provenance: calc('per-product stock position and policy', ['R.fg']) })
      ];
    },
    Materials(S) {
      return [
        countKpi(S, { id: 'rm-count', area: 'Inventory', title: 'Raw materials', question: 'How many materials are analysed?', items: ['R.rm'], provenance: calc('materials in the workbook', ['R.rm']) }),
        classCount(S, { id: 'rm-high-risk', area: 'Inventory', title: 'Materials at high or critical risk', question: 'Which materials threaten production?', items: ['R.rm'], where: [['sev', '>=', 2]], provenance: calc('risk class per material', ['R.rm[].sev']), drill: { area: 'Inventory', view: 'items', filter: { type: 'RM', sevMin: 2 } } }),
        V.total(S, { id: 'rm-value', area: 'Inventory', title: 'Raw-material value', question: 'How much capital is in materials?', unit: '£', field: 'R.rmV', items: ['R.rm'], key: 'val', provenance: calc('on-hand × unit cost, materials', ['R.rmV', 'R.rm[].val']) }),
        V.rowBars(S, { id: 'rm-cover-lt', area: 'Inventory', title: 'Lowest cover against lead time: materials', question: 'Which materials will run out before a replenishment can arrive?', unit: 'days', trace: { rows: 'R.rm', where: [['cover', 'num']], order: [['cover', 'asc', null, 'last']], take: 20 }, label: 'id', series: [{ name: 'Cover (days)', field: 'cover' }, { name: 'Risk-adjusted lead time (days)', field: 'lt' }], provenance: calc('available ÷ daily usage (usage ESTIMATED from BOM × units sold × (1 + scrap)) against risk-adjusted lead time', ['R.rm[].cover', 'R.rm[].lt']) }),
        V.table(S, { id: 'rm-items', area: 'Inventory', title: 'Materials', question: 'What is each material\'s stock position?', unit: 'text', trace: { rows: 'R.rm', where: [], order: [['sev', 'desc']] }, columns: [{ field: 'id', label: 'Item' }, { field: 'name', label: 'Name' }, { field: 'sev', label: 'Risk' }, { field: 'av', label: 'Available' }, { field: 'pos', label: 'Position' }, { field: 'cover', label: 'Cover (days)' }, { field: 'lt', label: 'Risk-adjusted lead time (days)' }, { field: 'm', label: 'Estimated usage / month' }, { field: 'exposed', label: 'Exposed £/month' }, { field: 'sup', label: 'Supplier' }], provenance: { source: 'estimated', basis: 'usage ESTIMATED from BOM × units sold × (1 + scrap)', fields: ['R.rm[].m', 'R.rm'] } })
      ];
    },
    MRP(S) {
      const st = ['Not Assessed', 'ORDER NOW', 'Order soon', 'Plan', 'Covered'], urgent = ['ORDER NOW', 'Order soon'];
      const src = V.at(S, 'CFG.sup') === 1 ? 'inventory-recorded On_Order_Qty (unverified)' : 'POs not received by the snapshot (verified)';
      const basis = `MRP: gross requirement over ${V.at(S, 'CFG.hor')} months of estimated usage (BOM × units sold × (1 + scrap)), plus safety stock, less available stock and scheduled receipts (${src}); suggested quantities rounded up to MOQ`;
      const all = V.resolve(S, { count: ['mrp'], where: [] }), nc = V.resolve(S, { count: ['mrp'], where: [['nc', '==', true]] }), nv = V.resolve(S, { count: ['mrp'], where: [['net', '>', 0], ['val', 'null']] });
      const rep = V.kpi(S, { id: 'mrp-value', area: 'Procurement & Suppliers', title: 'Total replenishment over the horizon', question: 'What will the suggested orders cost at standard cost?', unit: '£', trace: { shared: 'mrpReplenishment', items: ['mrp'], where: [['net', '>', 0]] }, provenance: calc('sum of suggested order values for materials with a net requirement; not a shortage figure; the same calculation as the MRP tab', ['mrp[].val']) });
      const repC = all && nc === all ? { value: null, completeness: { status: 'unavailable', reasons: ['every material is Not Assessed'] } }
        : (nc || nv ? { completeness: { status: 'partial', reasons: [[nc ? `${nc} material(s) Not Assessed` : '', nv ? `${nv} material(s) without a unit cost` : ''].filter(Boolean).join(' and ').replace(/^/, 'excludes ')] } } : {});
      /* suppliers with the most materials to order now or soon (15 at most, so every label can be read; ties by supplier id) */
      const urg = V.items(S, ['mrp']).filter(r => urgent.includes(r.st) && r.x.sup);
      const sups = [...new Set(urg.map(r => r.x.sup))].map(id => ({ id, n: V.resolve(S, { count: ['mrp'], where: [['x.sup', '==', id], ['st', 'in', urgent]] }) }))
        .sort(V.orderBy([['n', 'desc'], ['id', 'asc']])).slice(0, 15).map(x => x.id);
      return [
        countKpi(S, { id: 'mrp-order-now', area: 'Procurement & Suppliers', title: 'Materials to order now', question: 'What must be bought immediately?', items: ['mrp'], where: [['st', '==', 'ORDER NOW']], provenance: calc(basis, ['mrp[].st']), confidence: V.confFor(S, 'Material requirements planning') }),
        countKpi(S, { id: 'mrp-soon', area: 'Procurement & Suppliers', title: 'Materials to order soon', question: 'What must be bought shortly?', items: ['mrp'], where: [['st', '==', 'Order soon']], provenance: calc(basis, ['mrp[].st']) }),
        countKpi(S, { id: 'mrp-net', area: 'Procurement & Suppliers', title: 'Materials with a net requirement', question: 'How many materials need more supply?', items: ['mrp'], where: [['net', '>', 0]], provenance: calc('MRP net requirement', ['mrp[].net']) }),
        Object.assign(rep, repC),
        countKpi(S, { id: 'mrp-na', area: 'Procurement & Suppliers', title: 'Materials Not Assessed', question: 'Where are inputs missing?', items: ['mrp'], where: [['nc', '==', true]], provenance: calc('required inputs missing or invalid (reason in the Status column); never estimated', ['mrp[].nc']) }),
        V.bars(S, { id: 'mrp-status', area: 'Procurement & Suppliers', title: 'Materials by buying status', question: 'How urgent is purchasing overall?', unit: 'items', labels: st, series: [{ name: 'Materials', trace: st.map(k => ({ count: ['mrp'], where: [['st', '==', k]] })) }], provenance: calc('MRP status', ['mrp[].st']) }),
        V.bars(S, { id: 'mrp-by-supplier', area: 'Procurement & Suppliers', title: 'Materials to order now or soon, by supplier (up to 15 with the most)', question: 'Which suppliers need orders?', unit: 'items', labels: sups.length ? sups : ['None'], series: [{ name: 'Order now', trace: (sups.length ? sups : ['None']).map(k => ({ count: ['mrp'], where: [['x.sup', '==', k], ['st', '==', 'ORDER NOW']] })) }, { name: 'Order soon', trace: (sups.length ? sups : ['None']).map(k => ({ count: ['mrp'], where: [['x.sup', '==', k], ['st', '==', 'Order soon']] })) }], provenance: calc('MRP status by default supplier (Default_Supplier_ID); the suppliers with the most materials to order now or soon, up to 15', ['mrp[].st', 'R.rm[].sup']) }),
        V.table(S, { id: 'mrp-urgent', area: 'Procurement & Suppliers', title: 'Order now', question: 'What must be ordered today, from whom, and how much?', unit: 'text', trace: { rows: 'mrp', where: [['st', '==', 'ORDER NOW']], order: [['val', 'desc', null, 'last']] }, columns: [{ field: 'x.id', label: 'Material' }, { field: 'x.name', label: 'Name' }, { field: 'x.sup', label: 'Supplier' }, { field: 'net', label: 'Net requirement' }, { field: 'qty', label: 'Suggested qty' }, { field: 'val', label: 'Value (£)' }, { field: 'out', label: 'Stock-out ~' }, { field: 'by', label: 'Order by' }, { field: 'aff', label: 'Affects' }], provenance: calc(basis, ['mrp']) }),
        V.table(S, { id: 'mrp-rows', area: 'Procurement & Suppliers', title: 'What to buy', question: 'What, how much and by when?', unit: 'text', trace: { rows: 'mrp', where: [], order: [['st', 'asc', st], ['val', 'desc', null, 'last']] }, columns: [{ field: 'x.id', label: 'Material' }, { field: 'st', label: 'Status' }, { field: 'x.sup', label: 'Supplier' }, { field: 'x.av', label: 'Available' }, { field: 'rq', label: 'Receipts (POs)' }, { field: 'gross', label: 'Gross req.' }, { field: 'x.ssU', label: 'Safety' }, { field: 'net', label: 'Net req.' }, { field: 'x.moq', label: 'MOQ' }, { field: 'qty', label: 'Suggested qty' }, { field: 'val', label: 'Value (£)' }, { field: 'out', label: 'Stock-out ~' }, { field: 'by', label: 'Order by' }, { field: 'netU', label: 'Net, other supply source' }, { field: 'aff', label: 'Affects' }], provenance: calc(basis, ['mrp']) })
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
      /* S11: the same listing, values and totals as the original tab (CGShared.excessModel + x1Sum), proven equivalent
         (stage3-design/stage3b/refactor-evidence/verify-s11-refactor.js). */
      const why = 'left out: allocation or unit cost not known (shown as Not Assessed on the original tab)';
      return [
        V.x1Card(S, { id: 'ex-listed-value', area: 'Inventory', title: 'Potential excess value', question: 'What capital is tied up in stock we do not need?', unit: '£', items: ['excess.a'], key: 'exVal', why: 'Not Assessed items are left out (X1 decision D4)', provenance: calc('potential excess of the listed items, at cost; the same total as the original tab', ['R.fg[].exVal', 'R.rm[].exVal']) }),
        V.x1Card(S, { id: 'ex-uncommitted', area: 'Inventory', title: 'Uncommitted stock value', question: 'How much listed stock is not promised to orders?', unit: '£', items: ['excess.uv'], key: '_v', why, provenance: calc('uncommitted quantity × unit cost, for listed items whose allocation and cost are known; the same total as the original tab', ['R.fg[].uncomm', 'R.fg[].al', 'R.fg[].cost', 'R.rm[].uncomm', 'R.rm[].al', 'R.rm[].cost']) }),
        V.x1Card(S, { id: 'ex-physical', area: 'Inventory', title: 'Physical stock value', question: 'What is the listed stock worth at cost?', unit: '£', items: ['excess.pv'], key: 'val', why: 'Not Assessed items are left out (X1 decision D4)', provenance: calc('physical stock × unit cost of the listed items; items with negative on-hand are left out; the same total as the original tab', ['R.fg[].val', 'R.rm[].val']) }),
        V.kpi(S, { id: 'ex-listed', area: 'Inventory', title: 'Items listed', question: 'How many items are excess, slow, obsolete, no-demand or Not Assessed?', unit: 'items', trace: { count: ['excess.a'] }, provenance: calc('items the original tab lists (not Active; Not Assessed only when holding uncommitted stock)', ['R.fg[].cls', 'R.rm[].cls']) }),
        V.kpi(S, { id: 'ex-negative', area: 'Inventory', title: 'Listed items with negative on-hand', question: 'Which stock records need checking?', unit: 'items', trace: { count: ['exRows'], where: [['negOH', '==', true]] }, provenance: calc('negative on-hand is a flag, not a negative £ value (Tag-6 B1)', ['R.fg[].oh', 'R.rm[].oh']) }),
        V.bars(S, { id: 'ex-classes', area: 'Inventory', title: 'Listed items by stock class', question: 'What kind of surplus is it?', unit: 'items', labels: cls, series: [{ name: 'Items', trace: cls.map(c => ({ count: ['excess.a'], where: [['cls', '==', c]] })) }], provenance: calc('dead-stock classes (A2/B1 rules), over the listed items', ['R.fg[].cls', 'R.rm[].cls']) }),
        V.table(S, { id: 'ex-items', area: 'Inventory', title: 'Excess and dead stock', question: 'Which items, and how much?', unit: 'text', trace: { rows: 'exRows' }, columns: [{ field: 'id', label: 'Item' }, { field: 'name', label: 'Description' }, { field: 'cls', label: 'Class' }, { field: 'unc', label: 'Uncommitted' }, { field: 'oh', label: 'Physical' }, { field: 'alShown', label: 'Allocated' }, { field: 'usable', label: 'Usable' }, { field: 'valShown', label: 'Value (£)' }, { field: 'msl', label: 'Months since demand' }, { field: 'cover', label: 'Cover (days)' }, { field: 'exVal', label: 'Potential excess (£)' }, { field: 'act', label: 'Action' }], provenance: calc('the original tab\'s listing, order and quantities (CGShared.excessModel)', ['R.fg', 'R.rm']) })
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
      const z = V.at(S, 'CFG.z'), basis = `calculated: safety stock = z × √(LT×σd² + d²×σLT²), z = ${z}; ROP = d × LT + safety stock; verdict compares workbook and calculated ROP (±20%)`;
      const vk = (id, title, q, v) => countKpi(S, { id, area: 'Demand & Planning', title, question: q, items: ALL, where: [['verdict', '==', v]], provenance: calc(basis, ['R.fg[].verdict', 'R.rm[].verdict']) });
      return keep([
        vk('rp-insufficient', 'Reorder point too low', 'Where could we run out before stock arrives?', vd[0]),
        vk('rp-excessive', 'Reorder point possibly too high', 'Where are we holding more than we need?', vd[1]),
        vk('rp-aligned', 'Broadly aligned', 'Where is the policy about right?', vd[2]),
        countKpi(S, { id: 'rp-no-rop', area: 'Demand & Planning', title: 'No reorder point configured', question: 'Which items have no reorder point in the workbook?', items: ALL, where: [['verdict', '==', 'No reorder point configured']], provenance: calc('items whose workbook reorder point is missing', ['R.fg[].verdict', 'R.rm[].verdict']) }),
        countKpi(S, { id: 'rp-not-assessed', area: 'Demand & Planning', title: 'Items without a policy verdict', question: 'Where can policy not be judged?', items: ALL, where: [['verdict', 'match', '^Not Assessed']], provenance: calc('items the engine could not assess', ['R.fg[].verdict', 'R.rm[].verdict']) }),
        V.bars(S, { id: 'rp-verdicts', area: 'Demand & Planning', title: 'Reorder points vs calculated policy', question: 'Is our reorder policy right?', unit: 'items', labels: vd, series: [{ name: 'Items', trace: vd.map(v => ({ count: ALL, where: [['verdict', '==', v]] })) }], provenance: calc(basis, ['R.fg[].verdict', 'R.rm[].verdict']) }),
        V.rowBars(S, { id: 'rp-low-chart', area: 'Demand & Planning', title: 'Reorder point too low: largest gaps', question: 'Workbook ROP against calculated ROP', unit: 'units', trace: { rows: 'R.fg', where: [['verdict', '==', vd[0]], ['ropGap', 'num']], order: [['ropGap', 'asc']], take: 10 }, label: 'id', series: [{ name: 'Workbook ROP', field: 'rop' }, { name: 'Calculated ROP', field: 'ropR' }], provenance: calc('products whose workbook ROP is furthest below the calculated ROP', ['R.fg[].rop', 'R.fg[].ropR', 'R.fg[].ropGap']) }),
        V.rowBars(S, { id: 'rp-low-chart-rm', area: 'Demand & Planning', title: 'Materials: reorder point too low', question: 'Workbook ROP against calculated ROP', unit: 'units', trace: { rows: 'R.rm', where: [['verdict', '==', vd[0]], ['ropGap', 'num']], order: [['ropGap', 'asc']], take: 10 }, label: 'id', series: [{ name: 'Workbook ROP', field: 'rop' }, { name: 'Calculated ROP', field: 'ropR' }], provenance: calc('materials whose workbook ROP is furthest below the calculated ROP', ['R.rm[].rop', 'R.rm[].ropR', 'R.rm[].ropGap']) }),
        Object.assign(V.table(S, { id: 'rp-items', area: 'Demand & Planning', title: 'Stock policy by item', question: 'Which reorder points need changing?', unit: 'text', trace: { rows: 'rpFG', where: [] }, columns: RP_COLS.filter(c => c.field !== 'ltS'), provenance: calc(basis, ['R.fg']) }), { scaleFields: ['ropGap'] }),
        Object.assign(V.table(S, { id: 'rp-items-rm', area: 'Demand & Planning', title: 'Stock policy by material', question: 'Which reorder points need changing?', unit: 'text', trace: { rows: 'rpRM', where: [] }, columns: RP_COLS, provenance: calc(basis, ['R.rm']) }), { scaleFields: ['ropGap'] })
      ]);
    },
    'Forecast accuracy'(S) {
      if (!V.at(S, 'R.hasF')) return [Object.assign(V.kpi(S, { id: 'fa-unavailable', area: 'Demand & Planning', title: 'Historical forecast accuracy', question: 'Can we trust our existing forecasts?', unit: 'items', trace: { field: 'R.noSuchField' }, provenance: calc('requires Forecast_Units in the workbook', ['R.hasF']) }), { completeness: { status: 'unavailable', reasons: ['No Forecast_Units data in this workbook, so historical forecast accuracy cannot be calculated. Nothing has been inferred.'] } })];
      const cnt = (id, title, q, w, basis, fields) => V.kpi(S, { id, area: 'Demand & Planning', title, question: q, unit: 'items', trace: { count: ['credRows'], where: w }, provenance: calc(basis, fields) });
      const band = V.at(S, 'CFG.fcBias'), hiAcc = V.at(S, 'CFG.fcHighAcc');
      return keep([
        V.kpi(S, { id: 'fa-avg', area: 'Demand & Planning', title: 'Average accuracy (%)', question: 'How close were the recorded forecasts to actual sales?', unit: '%', trace: { shared: 'faStats', items: ['credRows'], key: 'avg' }, provenance: calc('mean accuracy over the assessable products (data quality not Insufficient); the same calculation as the Forecast accuracy tab', ['cred[].acc', 'cred[].dq']) }),
        V.kpi(S, { id: 'fa-assessable', area: 'Demand & Planning', title: 'Assessable products', question: 'How many forecasts have enough history to judge?', unit: 'items', trace: { count: ['credRows'], where: [['c.dq', '!=', 'Insufficient']] }, provenance: calc('products whose data quality is not Insufficient', ['cred[].dq']) }),
        V.kpi(S, { id: 'fa-high-acc', area: 'Demand & Planning', title: `Products at ${hiAcc}% accuracy or more`, question: 'How many forecasts look unusually accurate?', unit: 'items', trace: { shared: 'faStats', items: ['credRows'], key: 'hi' }, provenance: calc(`assessable products with accuracy of ${hiAcc}% or more (a prompt to check how the forecasts were recorded, not evidence of strong forecasting)`, ['cred[].hiAcc']) }),
        Object.assign(V.kpi(S, { id: 'fa-consistency', area: 'Demand & Planning', title: `Share of assessable products at ${hiAcc}% accuracy or more`, question: 'Is accuracy unusually consistent across the dataset?', unit: '%', trace: { faConsistency: 'share' }, provenance: calc(`products at ${hiAcc}% accuracy or more ÷ assessable products × 100; the warning shows at ${V.at(S, 'CFG.fcHighShare')}% or more (Settings); the same calculation as the Forecast accuracy tab (S14, proven 24 Nov 2026)`, ['cred[].acc', 'cred[].dq', 'CFG.fcHighShare']) }), { status: V.resolve(S, { faConsistency: 'many' }) ? 'warning' : 'none' }),
        cnt('fa-over', 'Over-forecast', 'Where do forecasts run high?', [['c.dir', '==', 'Over-forecast']], `bias outside the ±${band}% band, forecast above actual`, ['cred[].dir']),
        cnt('fa-under', 'Under-forecast', 'Where do forecasts run low?', [['c.dir', '==', 'Under-forecast']], `bias outside the ±${band}% band, forecast below actual`, ['cred[].dir']),
        cnt('fa-balanced', 'Balanced', 'Where is there no material bias?', [['c.dir', '==', 'Balanced']], `bias within the ±${band}% band`, ['cred[].dir']),
        cnt('fa-beats', 'Existing forecast beats the statistical methods', 'Where should the existing forecast be kept?', [['c.beats', '==', true]], 'existing forecasts more than twice as accurate as the best simple statistical method on the same months', ['cred[].beats']),
        V.bars(S, { id: 'fa-dq', area: 'Demand & Planning', title: 'Data quality of the history', question: 'Is there enough history to judge?', unit: 'items', labels: ['Adequate', 'Limited', 'Insufficient'], series: [{ name: 'Products', trace: ['Adequate', 'Limited', 'Insufficient'].map(k => ({ count: ['credRows'], where: [['c.dq', '==', k]] })) }], provenance: calc('periods used, missing periods, zeros and outliers', ['cred[].dq']) }),
        V.bars(S, { id: 'fa-conf', area: 'Demand & Planning', title: 'Confidence in the assessment', question: 'How far can the assessment be trusted?', unit: 'items', labels: ['High', 'Medium', 'Low'], series: [{ name: 'Products', trace: ['High', 'Medium', 'Low'].map(k => ({ count: ['credRows'], where: [['c.conf', '==', k]] })) }], provenance: calc('confidence in the information (not whether the forecast is good)', ['cred[].conf']) }),
        V.rowBars(S, { id: 'fa-acc-chart', area: 'Demand & Planning', title: 'Accuracy by product (lowest 15)', question: 'Which forecasts are least accurate?', unit: '%', trace: { rows: 'credRows', where: [['c.acc', 'num']], order: [['c.acc', 'asc']], take: 15 }, label: 'id', series: [{ name: 'Accuracy %', field: 'c.acc' }], provenance: calc('accuracy % by product', ['cred[].acc']) }),
        V.rowBars(S, { id: 'fa-bias-over', area: 'Demand & Planning', title: 'Most over-forecast products (largest 10)', question: 'Where do forecasts run highest above sales?', unit: '%', trace: { rows: 'credRows', where: [['c.bias', 'num'], ['c.dir', '==', 'Over-forecast']], order: [['c.bias', 'desc']], take: 10 }, label: 'id', series: [{ name: 'Bias %', field: 'c.bias' }], provenance: calc(`bias % (forecast above actual), products outside the ±${band}% band`, ['cred[].bias', 'cred[].dir']) }),
        V.rowBars(S, { id: 'fa-bias-under', area: 'Demand & Planning', title: 'Most under-forecast products (largest 10)', question: 'Where do forecasts run furthest below sales?', unit: '%', trace: { rows: 'credRows', where: [['c.bias', 'num'], ['c.dir', '==', 'Under-forecast']], order: [['c.bias', 'asc']], take: 10 }, label: 'id', series: [{ name: 'Bias %', field: 'c.bias' }], provenance: calc(`bias % (forecast below actual), products outside the ±${band}% band`, ['cred[].bias', 'cred[].dir']) }),
        V.table(S, { id: 'fa-items', area: 'Demand & Planning', title: 'Forecast assessment by product', question: 'Which forecasts can be relied on?', unit: 'text', trace: { rows: 'credRows', where: [], order: [['c.acc', 'desc', null, 'first']] }, columns: [{ field: 'id', label: 'SKU' }, { field: 'c.acc', label: 'Accuracy %' }, { field: 'x.wape', label: 'WAPE' }, { field: 'c.bias', label: 'Bias %' }, { field: 'c.dir', label: 'Direction' }, { field: 'x.fcu', label: 'Bias units' }, { field: 'biasGBP', label: 'Bias £ at cost' }, { field: 'c.wb', label: 'Existing WAPE' }, { field: 'c.wbBest', label: 'Best method WAPE' }, { field: 'c.verdict', label: 'Verdict' }, { field: 'c.nV', label: 'Periods used' }, { field: 'c.expected', label: 'Periods expected' }, { field: 'c.missing', label: 'Missing' }, { field: 'c.zeros', label: 'Zero-demand' }, { field: 'c.out', label: 'Outliers' }, { field: 'c.fcMiss', label: 'Forecast gaps' }, { field: 'c.dq', label: 'Data quality' }, { field: 'c.conf', label: 'Confidence' }, { field: 'c.confWhy', label: 'Why' }, { field: 'c.confFix', label: 'To raise confidence' }, { field: 'c.finding', label: 'Finding' }], provenance: calc('the Forecast accuracy tab\'s table, in its order (products without an accuracy first, then most accurate first). Bias £ at cost = bias units × unit cost (S13, proven 24 Nov 2026)', ['cred', 'R.fg[].wape', 'R.fg[].fcu', 'R.fg[].cost']) }),
        V.kpi(S, { id: 'fa-products', area: 'Demand & Planning', title: 'Products with an accuracy assessment', question: 'How many forecasts can be assessed?', unit: 'items', trace: { count: ['credRows'], where: [] }, provenance: calc('products with forecast history', ['cred']) })
      ]);
    },
    'Demand forecast'(S) {
      const ok = V.items(S, ['fcRows']).filter(r => r.f.ok), na = V.items(S, ['fcRows']).filter(r => !r.f.ok);
      if (!ok.length) return [Object.assign(V.kpi(S, { id: 'df-unavailable', area: 'Demand & Planning', title: 'Statistical forecast', question: 'What demand should we plan for?', unit: 'units', trace: { field: 'R.noSuchField' }, provenance: calc('requires at least 6 months of demand history', ['fc']) }), { completeness: { status: 'unavailable', reasons: ['Fewer than 6 months of demand history: no statistical forecast can be produced.'] } })];
      const okIds = ok.map(r => r.id), est = (basis, fields) => ({ source: 'estimated', basis, fields });
      const tot = (id, title, k, q) => V.kpi(S, { id, area: 'Demand & Planning', title, question: q, unit: 'units', trace: { fcSum: k }, provenance: k === 'act12' ? calc('units sold in the last 12 months, over the forecast products (same calculation as the Demand forecast tab)', ['fc[].act12']) : est('statistical forecast total over the forecast products (same calculation as the Demand forecast tab)', [`fc[].${k}`]) });
      const H = V.at(S, 'CFG.fcH'), h = H >= 3 && H <= 12 ? H : (H > 12 ? 12 : (H ? 3 : 12));
      return [
        tot('df-act12', 'Units sold, last 12 months', 'act12', 'How much did we sell?'),
        tot('df-s3', 'Forecast, next 3 months', 's3', 'What demand is coming soon?'),
        tot('df-s6', 'Forecast, next 6 months', 's6', 'What demand is coming this half-year?'),
        tot('df-s12tot', 'Forecast, next 12 months', 's12', 'What demand is coming this year?'),
        V.kpi(S, { id: 'df-skus', area: 'Demand & Planning', title: 'Products with a statistical forecast', question: 'How many products can be forecast?', unit: 'items', trace: { count: ['fcRows'], where: [['f.ok', '==', true]] }, provenance: calc('products with at least 6 months of history', ['fc[].ok']) }),
        V.kpi(S, { id: 'df-short', area: 'Demand & Planning', title: 'Products not forecast (under 6 months of history)', question: 'Which products need more history?', unit: 'items', trace: { count: ['fcRows'], where: [['f.ok', '!=', true]] }, provenance: calc('products with under 6 months of history', ['fc[].ok']) }),
        V.kpi(S, { id: 'df-rising', area: 'Demand & Planning', title: 'Rising trends', question: 'Where is demand growing?', unit: 'items', trace: { count: ['fcRows'], where: [['f.ok', '==', true], ['f.trend', '==', 'Rising']] }, provenance: calc('trend test on the history', ['fc[].trend']) }),
        V.kpi(S, { id: 'df-falling', area: 'Demand & Planning', title: 'Falling trends', question: 'Where is demand shrinking?', unit: 'items', trace: { count: ['fcRows'], where: [['f.ok', '==', true], ['f.trend', '==', 'Falling']] }, provenance: calc('trend test on the history', ['fc[].trend']) }),
        ...forecastFor(S, okIds[0]),
        V.bars(S, { id: 'df-confidence', area: 'Demand & Planning', title: 'Forecast confidence across products', question: 'How far can the forecasts be relied on?', unit: 'items', labels: ['High', 'Medium', 'Low'], series: [{ name: 'Products', trace: ['High', 'Medium', 'Low'].map(c => ({ count: ['fcRows'], where: [['f.ok', '==', true], ['f.conf', '==', c]] })) }], provenance: calc('forecast confidence (history length, back-test error, seasonality test)', ['fc[].conf']) }),
        V.table(S, { id: 'df-attention', area: 'Demand & Planning', title: 'Forecasts that need attention', question: 'Which forecasts should a planner check first?', unit: 'text', trace: { rows: 'fcRows', where: [['f.ok', '==', true], ['f.conf', '==', 'Low']], order: [['f.rel', 'desc', null, 'last']] }, columns: [{ field: 'id', label: 'SKU' }, { field: 'method', label: 'Method' }, { field: 'f.unc', label: 'Uncertainty' }, { field: 'f.conf', label: 'Confidence' }, { field: 'f.confWhy', label: 'Why' }, { field: 'f.rec', label: 'Recommendation' }], provenance: calc('products whose forecast confidence is Low, highest relative error first', ['fc[].conf', 'fc[].rel']) }),
        V.table(S, { id: 'df-rows', area: 'Demand & Planning', title: 'All forecast products', question: 'What should we plan for, product by product?', unit: 'text', trace: { rows: 'fcRows', where: [['f.ok', '==', true]] }, columns: [{ field: 'id', label: 'SKU' }, { field: 'method', label: 'Method' }, { field: 'f.act12', label: 'Last 12m' }, { field: 'f.s3', label: 'Next 3m' }, { field: 'f.s6', label: 'Next 6m' }, { field: 'next', label: `Next ${h}m` }, { field: 'range.lo', label: '3m range, low (80%)' }, { field: 'range.hi', label: '3m range, high (80%)' }, { field: 'f.trend', label: 'Trend' }, { field: 'f.unc', label: 'Uncertainty' }, { field: 'f.wb', label: 'Existing forecast WAPE' }, { field: 'f.wbBest', label: 'Best method WAPE' }, { field: 'f.conf', label: 'Confidence' }, { field: 'f.rec', label: 'Recommendation' }, { field: 'f.confWhy', label: 'Basis' }], provenance: est('statistical forecasts by product, as the Demand forecast tab\'s table. The 3-month range is indicative: next-3-month forecast ± 1.28 × back-test RMSE × √3 (assumes independent monthly errors), floored at 0 (S12, proven 24 Nov 2026)', ['fc', 'fc[].s3', 'fc[].rm']) })
      ];
    },
    Suppliers(S) {
      const cats = ['Low risk', 'Medium risk', 'High risk'], lo = V.at(S, 'CFG.supLow'), med = V.at(S, 'CFG.supMed');
      const basis = `score (0–100) = 50% on-time rate + 20% lead-time stability + 15% fill rate + 15% lateness; risk: ${lo}+ Low, ${med} to under ${lo} Medium, under ${med} High; only POs received by the snapshot are scored`;
      const n = (id, title, q, w, b) => countKpi(S, { id, area: 'Procurement & Suppliers', title, question: q, unit: 'suppliers', items: ['R.sup'], where: w, provenance: calc(b || basis, ['R.sup']) });
      return keep([
        Object.assign(n('su-high', 'High-risk suppliers', 'Which suppliers put supply at risk?', [['cat', '==', 'High risk']]), { confidence: V.confFor(S, 'Supplier performance') }),
        n('su-medium', 'Medium-risk suppliers', 'Which suppliers need watching?', [['cat', '==', 'Medium risk']]),
        n('su-na', 'Suppliers not assessed', 'Which suppliers lack enough evidence?', [['cat', 'match', '^Not Assessed']], 'metric-specific eligibility (Not Assessed — Insufficient Evidence)'),
        n('su-limited', 'Suppliers on limited evidence', 'Whose score rests on few purchase orders?', [['evid', '==', 'Limited']], `fewer than ${V.at(S, 'CFG.supMinPO')} valid PO lines behind at least one metric`),
        n('su-at-risk', 'Suppliers with at-risk materials', 'Whose materials are already at risk?', [['risk', '>', 0]], 'suppliers whose materials include at least one at-risk material'),
        V.bars(S, { id: 'su-cats', area: 'Procurement & Suppliers', title: 'Suppliers by risk', question: 'How is supplier risk spread?', unit: 'suppliers', labels: cats, series: [{ name: 'Suppliers', trace: cats.map(c => ({ count: ['R.sup'], where: [['cat', '==', c]] })) }], provenance: calc('supplier risk class', ['R.sup[].cat']) }),
        V.rowBars(S, { id: 'su-score', area: 'Procurement & Suppliers', title: 'Supplier score (lowest 15)', question: 'Who performs worst?', unit: 'score', trace: { rows: 'R.sup', where: [['score', 'num']], order: [['score', 'asc']], take: 15 }, label: 'id', series: [{ name: 'Score', field: 'score' }], provenance: calc(basis, ['R.sup[].score']) }),
        V.rowBars(S, { id: 'su-otd-fill', area: 'Procurement & Suppliers', title: 'On-time and fill rate (%), lowest on-time 15', question: 'Late, short, or both?', unit: '%', trace: { rows: 'R.sup', where: [['otd', 'num']], order: [['otd', 'asc']], take: 15 }, label: 'id', series: [{ name: 'On-time %', field: 'otd' }, { name: 'Fill %', field: 'fill' }], provenance: calc('on-time rate and fill rate of the received PO lines whose inputs are valid', ['R.sup[].otd', 'R.sup[].fill']) }),
        V.rowBars(S, { id: 'su-lt', area: 'Procurement & Suppliers', title: 'Stated vs observed lead time (days), longest observed 15', question: 'Do suppliers deliver in the time they quote?', unit: 'days', trace: { rows: 'R.sup', where: [['ltA', 'num']], order: [['ltA', 'desc']], take: 15 }, label: 'id', series: [{ name: 'Stated', field: 'stated' }, { name: 'Observed (average)', field: 'ltA' }], provenance: calc('stated lead time from the Suppliers sheet; observed = average order-to-receipt days of received POs', ['R.sup[].stated', 'R.sup[].ltA']) }),
        V.recommendations(S, { id: 'su-recs', area: 'Procurement & Suppliers', title: 'Procurement actions', question: 'What should purchasing do next?', titleMatch: '^(Secure supply|Verify on-order|Manage weak suppliers|Review reorder points)', provenance: calc('the management summary\'s prioritised recommendations that concern purchasing, in its order', ['summary']) }),
        V.table(S, { id: 'su-rows', area: 'Procurement & Suppliers', title: 'Supplier scorecard', question: 'How does each supplier perform?', unit: 'text', trace: { rows: 'R.supRisk', where: [] }, columns: [{ field: 'id', label: 'Supplier' }, { field: 'name', label: 'Name' }, { field: 'score', label: 'Score' }, { field: 'cat', label: 'Risk class' }, { field: 'evid', label: 'Evidence' }, { field: 'assess', label: 'Assessment' }, { field: 'n', label: 'POs scored' }, { field: 'otd', label: 'On-time %' }, { field: 'delayed', label: 'Delayed' }, { field: 'shortN', label: 'Short' }, { field: 'excl', label: 'Outstanding at snapshot' }, { field: 'late', label: 'Avg days late' }, { field: 'stated', label: 'Stated LT' }, { field: 'ltA', label: 'Observed LT' }, { field: 'ltS', label: 'LT σ' }, { field: 'fill', label: 'Fill %' }, { field: 'over', label: 'Over-delivered units' }, { field: 'overN', label: 'Over-delivered lines' }, { field: 'mats', label: 'Materials' }, { field: 'risk', label: 'At-risk materials' }], provenance: calc(`${basis}; ordered by at-risk materials, then score, as the Suppliers tab`, ['R.supRisk']) })
      ]);
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
  function forSub(S, areaId, subId) { const f = find(areaId, subId); if (!f) return []; const out = []; for (const t of f.sub.tabs) for (const vm of forTab(S, t)) out.push(vm); if (f.sub.section && SECTIONS[f.sub.section]) for (const vm of SECTIONS[f.sub.section](S)) out.push(vm); return out; }
  Object.assign(V, { BUILDERS: B, SECTIONS, NAV, forecastFor, hasProduction, primary, find, forTab, forSub });
})(typeof window !== 'undefined' ? window : globalThis);
