/* Stage 3B (23 Nov 2026): the screens of the approved navigation (SCIE-NAVIGATION-AND-SCREEN-SPEC-v1).
 * Each screen is drawn from view-models (CGVM) with the shared components (CGUI). Screens select, filter and lay out;
 * they never calculate (tests/test-view-contract.js). Bespoke layouts: Overview, Inventory. Every other subsection uses
 * the generic layout (its KPIs, charts, tables and recommendations) until its bespoke layout is built.
 * ctx: { S, area, sub, filters (this area's filters only), set(key, value) }. */
(function (G) {
  'use strict';
  const V = G.CGVM, U = G.CGUI, F = G.CGFmt, esc = F.esc;
  const pick = (vms, id) => vms.find(v => v.id === id);
  const head = (title, intro, orig) => `<div class="scie-head"><div><h2>${esc(title)}</h2>${intro ? `<p>${esc(intro)}</p>` : ''}</div>${orig && orig.length ? `<div class="scie-orig">${orig.map(t => `<button type="button" class="scie-btn scie-ghost" data-orig="${esc(t)}">See original tab: ${esc(t)}</button>`).join(' ')}</div>` : ''}</div>`;
  const grid = (...parts) => `<div class="scie-grid">${parts.join('')}</div>`;
  const kpis = list => `<div class="scie-kpis">${list.join('')}</div>`;
  const FMT_EX = { unc: 'n0', oh: 'n0', alShown: 'n0', usable: 'n0', valShown: '£', msl: 'n0', cover: 'n1', exVal: '£', name: 'text', cls: 'text', act: 'text', id: 'text' };
  const FMT_ITEM = { av: 'n0', pos: 'n0', cover: 'n1', lt: 'n1', ss: 'n0', rop: 'n0', ssR: 'n0', ropR: 'n0', m: 'n1', exposed: '£', val: '£', exVal: '£', oh: 'n0', al: 'n0', uncomm: 'n0', score: 'n0', n: 'n0', p: 'n1', c: 'n1', pv: 'n1', inv: 'n0', po: 'n0', gap: 'n0', net: 'n0', qty: 'n0', d: 'n2', planned: 'n0', actual: 'n0', att: 'n1', wAtt: 'n1', exQ: 'n0', lateN: 'n0', late: 'n1', slip: 'n1', nQ: 'n0', otd: 'n1', fill: 'n1', risk: 'n0', mats: 'n0' };
  const TONES = ['navy', 'green', 'blue', 'orange', 'purple', 'teal'];

  /* Filters (spec v1 §10.7): rows are kept or dropped by existing fields only. */
  function applyFilters(vm, f) {
    if (!vm) return [];
    return vm.rows.filter(r => {
      const x = r.ref || {};
      if (f.sev === 'na' && !(x.sev === null || x.sev === undefined)) return false;
      if (f.sev && f.sev !== 'na' && String(x.sev) !== f.sev) return false;
      if (f.grp && x.grp !== f.grp) return false;
      if (f.q && !`${x.id || ''} ${x.name || ''}`.toLowerCase().includes(f.q.toLowerCase())) return false;
      return true;
    });
  }
  const groups = vm => (vm ? [...new Set(vm.rows.map(r => r.ref && r.ref.grp).filter(Boolean))].sort() : []);
  function filterBar(f, vm, extra) {
    const opt = (v, l, cur) => `<option value="${esc(v)}"${cur === v ? ' selected' : ''}>${esc(l)}</option>`;
    return `<div class="scie-filters" role="group" aria-label="Filters">${extra || ''}
      <label>Risk <select data-filter="sev">${opt('', 'All', f.sev || '')}${opt('3', 'Critical', f.sev)}${opt('2', 'High', f.sev)}${opt('1', 'Medium', f.sev)}${opt('0', 'Low', f.sev)}${opt('na', 'Not Assessed', f.sev)}</select></label>
      <label>Group <select data-filter="grp">${opt('', 'All', f.grp || '')}${groups(vm).map(g => opt(g, g, f.grp)).join('')}</select></label>
      <label>Search <input type="search" data-filter="q" value="${esc(f.q || '')}" placeholder="Item code or name" size="16"></label>
      <button type="button" class="scie-link" data-filter-clear="1">Clear filters</button></div>`;
  }

  /* ---- generic layout: every view-model of a subsection, in contract order ----------------------------------------- */
  function generic(ctx, vms, intro) {
    const k = vms.filter(v => v.kind === 'kpi');
    const charts = vms.filter(v => v.kind === 'bar' || v.kind === 'line');
    const tables = vms.filter(v => v.kind === 'table');
    const rec = vms.filter(v => v.kind === 'recommendation');
    const tone = new Map(k.map((v, i) => [v.id, TONES[i] || 'navy']));
    return `${head(ctx.sub.label, intro, ctx.sub.original)}
      ${k.length ? kpis(k.map(v => U.kpi(v, tone.get(v.id), 'chart'))) : ''}
      ${grid(charts.map(v => U.panel({ id: v.id, title: v.title, q: v.question, icon: 'chart', span: charts.length > 1 ? 'scie-span-6' : 'scie-span-12', body: U.chart(v, { horizontal: v.labels.length > 8, band: v.kind === 'line' ? 1 : 0 }), badges: U.badges(v) })).join('')
,
        rec.map(v => U.panel({ id: v.id, title: v.title, q: v.question, icon: 'bulb', body: U.recs(v), badges: U.badges(v) })).join(''),
        tables.map(v => U.panel({ id: v.id, title: v.title, q: v.question, icon: 'table', body: U.table(v, { fmt: FMT_ITEM, items: true }), badges: U.badges(v) })).join(''))}`;
  }

  /* ---- Overview: executive dashboard ----------------------------------------------------------------------------------- */
  function overview(ctx) {
    const S = ctx.S, vms = V.forSub(S, 'overview', 'dashboard'), v = id => pick(vms, id);
    const demo = V.at(S, 'R.demo');
    return `${head('Executive dashboard', `Snapshot analysis of the loaded workbook${demo ? ' (demonstration data: simulated, not a real client)' : ''}. Every figure is calculated by the engine; select a card to see the detail behind it.`, ['Overview'])}
      ${kpis([U.kpi(v('ov-value'), 'navy', 'value'), U.kpi(v('ov-high-risk'), 'orange', 'alert'), U.kpi(v('ov-excess'), 'purple', 'box'), U.kpi(v('ov-order-now'), 'blue', 'cart'), U.kpi(v('ov-sup-high'), 'red', 'handshake'), U.kpi(v('ov-dq-high'), 'teal', 'db')])}
      ${grid(
        U.panel({ id: 'ov-health', title: 'Overall stock health', q: v('ov-health').question, icon: 'heart', span: 'scie-span-4', body: `${U.ring(v('ov-health'), 'health score')}<p class="scie-note">${esc(v('ov-health').provenance.basis)}</p><button type="button" class="scie-link" data-go="inventory/health">Stock health &amp; ABC →</button>`, badges: U.badges(v('ov-health')) }),
        U.panel({ id: 'ov-risk-mix', title: 'Items by risk class', q: v('ov-risk-mix').question, icon: 'alert', span: 'scie-span-4', body: U.chart(v('ov-risk-mix'), { type: 'doughnut', riskColours: true }) }),
        U.panel({ id: 'ov-value-split', title: 'Inventory value by type', q: v('ov-value-split').question, icon: 'value', span: 'scie-span-4', body: `${U.chart(v('ov-value-split'))}<p class="scie-note">Shortage value: ${F.show(v('ov-shortage').value, '£')} · Items analysed: ${F.show(v('ov-items').value)}</p>` })
      )}
      ${grid(
        U.panel({ id: 'ov-top-fg', title: 'Highest-risk products', q: 'Ranked as on the original Overview: risk, then lowest cover.', icon: 'alert', span: 'scie-span-6', body: U.table(v('ov-top-fg'), { fmt: FMT_ITEM, items: true }) }),
        U.panel({ id: 'ov-top-rm', title: 'Highest-risk materials', q: 'Ranked as on the original Overview: risk, then lowest cover.', icon: 'alert', span: 'scie-span-6', body: U.table(v('ov-top-rm'), { fmt: FMT_ITEM, items: true }) })
      )}
      ${grid(
        U.panel({ id: 'ov-recs', title: 'Recommended actions', q: 'The first three of the management summary\'s prioritised recommendations.', icon: 'bulb', span: 'scie-span-8', body: `${U.recs(v('ov-recs'))}<button type="button" class="scie-btn" data-go="scenarios/recommendations">All recommendations</button>` }),
        U.panel({ id: 'ov-confidence', title: 'How much can you rely on this?', q: 'Confidence by area of the analysis.', icon: 'db', span: 'scie-span-4', body: `${U.confList(v('ov-confidence'))}<button type="button" class="scie-link" data-go="data/confidence">What would raise confidence →</button>` })
      )}
      ${grid(
        U.panel({ id: 'ov-family', title: 'Value by product family', icon: 'value', span: 'scie-span-6', body: U.chart(v('ov-family'), { horizontal: true }) }),
        U.panel({ id: 'ov-group', title: 'Value by material group', icon: 'value', span: 'scie-span-6', body: U.chart(v('ov-group'), { horizontal: true }) }),
        U.panel({ id: 'ov-cover-fg', title: 'Stock cover: finished goods', q: 'Products by days of cover (available ÷ daily demand).', icon: 'chart', span: 'scie-span-6', body: U.chart(v('ov-cover-fg')) }),
        U.panel({ id: 'ov-cover-rm', title: 'Stock cover: raw materials', q: 'Materials by days of cover.', icon: 'chart', span: 'scie-span-6', body: U.chart(v('ov-cover-rm')) }),
        U.panel({ id: 'ov-sup-risk', title: 'Supplier risk', q: v('ov-sup-risk').question, icon: 'handshake', span: 'scie-span-12', body: U.table(v('ov-sup-risk'), { fmt: FMT_ITEM }) })
      )}
      <div class="scie-strip"><b>${F.show(v('ov-high-risk').value)} items at high or critical risk · ${F.show(v('ov-order-now').value)} materials to order now</b><span>Snapshot ${esc(String(V.at(S, 'R.snap') instanceof Date ? V.at(S, 'R.snap').toISOString().slice(0, 10) : ''))} · calculated in your browser; your file never leaves this device.</span>${RACK}</div>`;
  }
  const RACK = '<svg class="scie-rack" viewBox="0 0 260 80" aria-hidden="true" fill="none" stroke="#436c47" stroke-width="2"><path d="M20 78V8M90 78V8M160 78V8M230 78V8M20 28h70M20 52h70M90 28h70M90 52h70M160 28h70M160 52h70"/><rect x="28" y="12" width="22" height="14"/><rect x="56" y="34" width="26" height="16"/><rect x="98" y="12" width="18" height="14"/><rect x="122" y="34" width="30" height="16"/><rect x="168" y="12" width="26" height="14"/><rect x="200" y="56" width="22" height="20"/><rect x="34" y="58" width="20" height="18"/></svg>';

  /* ---- Inventory ---------------------------------------------------------------------------------------------------------- */
  function stock(ctx) {
    const S = ctx.S, f = ctx.filters, type = f.type === 'RM' ? 'RM' : 'FG', vms = V.forSub(S, 'inventory', 'stock'), v = id => pick(vms, id);
    const P = type === 'FG' ? 'fg' : 'rm', items = v(`${P}-items`), rows = applyFilters(items, f);
    const seg = `<span class="scie-seg" role="group" aria-label="Item type"><button type="button" data-set="type=FG" aria-pressed="${type === 'FG'}">Products</button><button type="button" data-set="type=RM" aria-pressed="${type === 'RM'}">Materials</button></span>`;
    return `${head('Stock position', 'What each product or material holds, how long it lasts and whether it will run short. Risk is driven by the policy selected in Settings; both policies are on Safety stock & reorder points.', [type === 'FG' ? 'Finished goods' : 'Materials'])}
      ${kpis([U.kpi(v(`${P}-count`), 'navy', 'box'), U.kpi(v(`${P}-high-risk`), 'orange', 'alert'), U.kpi(v(`${P}-value`), 'green', 'value')])}
      ${grid(U.panel({ id: `${P}-cover-lt`, title: v(`${P}-cover-lt`).title, q: v(`${P}-cover-lt`).question, icon: 'chart', body: U.chart(v(`${P}-cover-lt`), { tall: true }), badges: U.badges(v(`${P}-cover-lt`)) }))}
      ${grid(U.panel({ id: `${P}-items`, title: type === 'FG' ? 'Products' : 'Materials', q: `Showing ${F.show(rows.length)} of ${F.show(items.rows.length)}. Select a row for the item's full detail.`, icon: 'table', body: `${filterBar(f, items, seg)}${U.table(items, { rows, fmt: FMT_ITEM, items: true, empty: 'No items match these filters.' })}`, badges: U.badges(items) }))}`;
  }
  function health(ctx) {
    const S = ctx.S, vms = V.forSub(S, 'inventory', 'health'), v = id => pick(vms, id);
    return `${head('Stock health & ABC', 'How healthy each item\'s stock position is (100 minus penalty points), and where annual value concentrates.', ['Health'])}
      ${grid(
        U.panel({ id: 'he-overall', title: 'Overall health', q: v('he-overall').question, icon: 'heart', span: 'scie-span-4', body: `${U.ring(v('he-overall'), 'average score')}<p class="scie-note">Items without a score: ${F.show(v('he-not-assessed').value)}</p>`, badges: U.badges(v('he-overall')) }),
        U.panel({ id: 'he-categories', title: 'Items by health category', q: v('he-categories').question, icon: 'chart', span: 'scie-span-8', body: U.chart(v('he-categories')) })
      )}
      ${grid(
        U.panel({ id: 'he-abc-fg-chart', title: 'ABC: products', q: v('he-abc-fg').provenance.basis, icon: 'chart', span: 'scie-span-6', body: `${U.chart(v('he-abc-fg-chart'))}${U.table(v('he-abc-fg'), { fmt: FMT_ITEM })}` }),
        U.panel({ id: 'he-abc-rm-chart', title: 'ABC: materials', q: v('he-abc-rm').provenance.basis, icon: 'chart', span: 'scie-span-6', body: `${U.chart(v('he-abc-rm-chart'))}${U.table(v('he-abc-rm'), { fmt: FMT_ITEM })}` })
      )}
      ${grid(
        U.panel({ id: 'he-items', title: 'Lowest-scoring products', icon: 'table', span: 'scie-span-6', body: U.table(v('he-items'), { rows: v('he-items').rows.slice(0, 12), fmt: FMT_ITEM, items: true }) }),
        U.panel({ id: 'he-items-rm', title: 'Lowest-scoring materials', icon: 'table', span: 'scie-span-6', body: U.table(v('he-items-rm'), { rows: v('he-items-rm').rows.slice(0, 12), fmt: FMT_ITEM, items: true }) })
      )}`;
  }
  function excess(ctx) {
    const S = ctx.S, vms = V.forSub(S, 'inventory', 'excess'), v = id => pick(vms, id);
    return `${head('Excess & dead stock', 'Capital tied up in stock the business does not need. Potential excess is an upper bound, not a saving.', ['Excess & dead stock'])}
      ${kpis([U.kpi(v('ex-listed-value'), 'purple', 'box'), U.kpi(v('ex-uncommitted'), 'navy', 'value'), U.kpi(v('ex-physical'), 'teal', 'db'), U.kpi(v('ex-listed'), 'blue', 'table'), U.kpi(v('ex-negative'), 'orange', 'alert')])}
      <p class="scie-note">Only stock not committed to orders can be dead stock. Uncommitted = the larger of physical and usable on-hand, minus allocated; it is shown only when the allocation is known. Negative on-hand is a flag to check the stock record, never a negative £ value.</p>
      ${grid(U.panel({ id: 'ex-classes', title: 'Listed items by stock class', q: v('ex-classes').question, icon: 'chart', span: 'scie-span-4', body: U.chart(v('ex-classes')) }),
        U.panel({ id: 'ex-items', title: 'Items listed', q: 'Not Assessed first, then highest stock value, as on the original tab.', icon: 'table', span: 'scie-span-8', body: U.table(v('ex-items'), { fmt: FMT_EX, items: true, empty: 'No item is listed as excess or dead stock.' }) }))}`;
  }


  /* ---- utility areas ------------------------------------------------------------------------------------------------------- */
  function reportScreen(ctx) {
    const vms = V.forSub(ctx.S, 'scenarios', 'recommendations');
    return `${head('Management report', 'Prints the management summary exactly as the Summary produces it (one source of truth). Links are not printed; the print uses the browser\'s "Save as PDF".', ['Summary'])}
      ${grid(U.panel({ title: 'Print or save as PDF', icon: 'reports', body: '<p class="scie-note">Reporting rule: the printed report is the Summary in full (figures, recommendations, limitations). Nothing is recalculated or omitted.</p><button type="button" class="scie-btn" data-act="print">Print management report</button>' }))}
      ${generic(Object.assign({}, ctx, { sub: { label: 'Contents of the report', original: [] } }), vms.filter(x => x.kind !== 'table'), '')}`;
  }
  function workbookScreen(ctx) {
    return `${head('Engine output workbook', 'A copy of your workbook with ten ENG_ result sheets added. Unknown values are left empty, never written as 0 or NaN.', [])}
      ${grid(U.panel({ title: 'Export to Excel', icon: 'table', body: '<p class="scie-note">Sheets: ENG_Assumptions, ENG_Attainment, ENG_Confidence, ENG_DataQuality, ENG_FG, ENG_Forecast, ENG_ForecastCredibility, ENG_POReconciliation, ENG_RM, ENG_Suppliers. The file is created in your browser.</p><button type="button" class="scie-btn" data-act="export">Export engine output workbook</button><p class="scie-note" data-export-status></p>' }))}`;
  }
  function loadScreen() {
    return `${head('Load workbook', 'Choose a workbook to analyse. It is read in your browser and never uploaded.', [])}<p class="scie-note">The file picker is shown above this text.</p>`;
  }

  /* ---- Demand & Planning (Phase 2) -------------------------------------------------------------------------------- */
  const FMT_FC = { 'f.act12': 'n0', 'f.s3': 'n0', 'f.s6': 'n0', next: 'n0', 'range.lo': 'n0', 'range.hi': 'n0', 'f.wb': 'pct', 'f.wbBest': 'pct', id: 'text', method: 'text', 'f.trend': 'text', 'f.unc': 'text', 'f.conf': 'text', 'f.rec': 'text', 'f.confWhy': 'text' };
  const sel = (key, label, cur, opts) => `<label>${esc(label)} <select data-filter="${key}">${opts.map(([v, l]) => `<option value="${esc(v)}"${cur === v ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
  const unavailableScreen = (title, intro, orig, vm) => `${head(title, intro, orig)}${grid(U.panel({ id: vm.id, title: vm.title, icon: 'alert', body: `<p class="scie-unavail">${esc(vm.completeness.reasons[0])}</p>` }))}`;
  function forecast(ctx) {
    const S = ctx.S, f = ctx.filters, vms = V.forSub(S, 'planning', 'forecast'), v = id => pick(vms, id);
    if (v('df-unavailable')) return unavailableScreen('Demand forecast', '', ['Demand forecast'], v('df-unavailable'));
    const rows = v('df-rows'), ids = rows.rows.map(r => r.ref.id), cur = ids.includes(f.sku) ? f.sku : ids[0];
    const one = V.forecastFor(S, cur), o = id => pick(one, id), F1 = rows.rows.find(r => r.ref.id === cur).ref;
    const conf = f.conf || '', list = conf ? rows.rows.filter(r => r.ref.f.conf === conf) : rows.rows;
    const chooser = `<div class="scie-filters" role="group" aria-label="Product">${sel('sku', 'Product', cur, ids.map(i => [i, `${i} ${(rows.rows.find(r => r.ref.id === i).ref.x.name || '')}`]))}</div>`;
    return `${head('Demand forecast', 'What demand to plan for, product by product, and how sure that is. Estimates from statistical methods; accuracy is measured only by back-testing on past months, never assumed.', ['Demand forecast'])}
      ${kpis([U.kpi(v('df-act12'), 'navy', 'chart'), U.kpi(v('df-s3'), 'green', 'chart'), U.kpi(v('df-s6'), 'teal', 'chart'), U.kpi(v('df-s12tot'), 'blue', 'chart'), U.kpi(v('df-rising'), 'purple', 'chart'), U.kpi(v('df-falling'), 'orange', 'alert')])}
      <p class="scie-note">${esc(F.show(v('df-skus').value))} products forecast · ${esc(F.show(v('df-short').value))} with under 6 months of history, not forecast. These are estimates, not guaranteed demand; the 80% range assumes roughly normal, independent errors.</p>
      ${grid(U.panel({ id: 'df-chart', title: o('df-chart').title, q: `Trend: ${F1.f.trend} · Seasonality: ${F1.f.seas ? (F1.f.seas.det ? 'detected' : 'not detected') : 'not testable'} · Confidence: ${F1.f.conf}`, icon: 'chart', body: `${chooser}${U.chart(o('df-chart'), { tall: true })}`, badges: U.badges(o('df-chart')) }))}
      ${grid(U.panel({ id: 'df-methods', title: 'Which method fits best', q: o('df-methods').question, icon: 'chart', span: 'scie-span-7', body: `${U.chart(o('df-methods'), { horizontal: true })}<p class="scie-note">${esc(F1.f.rec)}</p>`, badges: U.badges(o('df-methods')) }),
        U.panel({ id: 'df-confidence', title: v('df-confidence').title, q: v('df-confidence').question, icon: 'chart', span: 'scie-span-5', body: U.chart(v('df-confidence')) }))}
      ${grid(U.panel({ id: 'df-attention', title: v('df-attention').title, q: 'Low confidence, highest relative error first. Select a row for the product’s full detail.', icon: 'alert', body: U.table(v('df-attention'), { fmt: FMT_FC, items: true, empty: 'No forecast has Low confidence.' }) }))}
      ${grid(U.panel({ id: 'df-rows', title: 'All forecast products', q: `Showing ${F.show(list.length)} of ${F.show(rows.rows.length)}. The 3-month range is indicative (80%): it assumes roughly normal, independent monthly errors.`, icon: 'table', body: `<div class="scie-filters" role="group" aria-label="Filters">${sel('conf', 'Confidence', conf, [['', 'All'], ['High', 'High'], ['Medium', 'Medium'], ['Low', 'Low']])}<button type="button" class="scie-link" data-filter-clear="1">Clear filters</button></div>${U.table(rows, { rows: list, fmt: FMT_FC, items: true })}`, badges: U.badges(rows) }))}`;
  }
  const FMT_FA = { 'c.acc': 'n1', 'x.wape': 'pct', 'c.bias': 'n1', 'x.fcu': 'n0', biasGBP: '£', 'c.wb': 'pct', 'c.wbBest': 'pct', 'c.nV': 'n0', 'c.expected': 'n0', 'c.missing': 'n0', 'c.zeros': 'n0', 'c.out': 'n0', 'c.fcMiss': 'n0' };
  function accuracy(ctx) {
    const S = ctx.S, f = ctx.filters, vms = V.forSub(S, 'planning', 'accuracy'), v = id => pick(vms, id);
    if (v('fa-unavailable')) return unavailableScreen('Forecast accuracy', 'Whether the business’s existing forecasts can be trusted.', ['Forecast accuracy'], v('fa-unavailable'));
    const t = v('fa-items'), dir = f.dir || '', dq = f.dq || '', list = t.rows.filter(r => (!dir || r.ref.c.dir === dir) && (!dq || r.ref.c.dq === dq));
    const chart = (id, span) => (v(id) ? U.panel({ id, title: v(id).title, q: v(id).question, icon: 'chart', span, body: U.chart(v(id), { horizontal: true, tall: true }), badges: U.badges(v(id)) }) : '');
    return `${head('Forecast accuracy', 'How close the workbook’s recorded forecasts came to actual sales. Forecast performance, data quality and confidence in the information are kept apart: strong accuracy on thin or unusually consistent data is not reported as excellent forecasting.', ['Forecast accuracy'])}
      ${kpis([U.kpi(v('fa-avg'), 'green', 'chart'), U.kpi(v('fa-assessable'), 'navy', 'table'), U.kpi(v('fa-over'), 'orange', 'alert'), U.kpi(v('fa-under'), 'red', 'alert'), U.kpi(v('fa-balanced'), 'teal', 'chart'), U.kpi(v('fa-high-acc'), 'purple', 'chart')])}
      ${v('fa-consistency').status === 'warning' ? `<div class="scie-warn" role="note"><b>Unusually consistent accuracy.</b> ${esc(F.show(v('fa-high-acc').value))} of ${esc(F.show(v('fa-assessable').value))} assessable products (${esc(F.show(v('fa-consistency').value, 'n0'))}%) are at ${esc(String(V.at(S, 'CFG.fcHighAcc')))}% accuracy or more. Not treated as a problem, but not evidence of strong forecasting on its own: check whether the forecasts were recorded before each period or derived from actual sales.</div>` : ''}
      <p class="scie-note">${esc(F.show(v('fa-beats').value))} existing forecasts were more than twice as accurate as the best simple statistical method on the same months: verify how they were recorded before relying on them. Workbook notes are read, not used in any calculation.</p>
      ${grid(chart('fa-acc-chart', 'scie-span-6'), chart('fa-bias-chart', 'scie-span-6'))}
      ${grid(U.panel({ id: 'fa-dq', title: v('fa-dq').title, q: v('fa-dq').question, icon: 'chart', span: 'scie-span-6', body: U.chart(v('fa-dq')) }), U.panel({ id: 'fa-conf', title: v('fa-conf').title, q: v('fa-conf').question, icon: 'chart', span: 'scie-span-6', body: U.chart(v('fa-conf')) }))}
      ${grid(U.panel({ id: 'fa-items', title: t.title, q: `Showing ${F.show(list.length)} of ${F.show(t.rows.length)}. Bias £ at cost = bias units × unit cost; positive means forecasts ran above actual sales.`, icon: 'table', body: `<div class="scie-filters" role="group" aria-label="Filters">${sel('dir', 'Bias', dir, [['', 'All'], ['Over-forecast', 'Over-forecast'], ['Under-forecast', 'Under-forecast'], ['Balanced', 'Balanced']])}${sel('dq', 'Data quality', dq, [['', 'All'], ['Adequate', 'Adequate'], ['Limited', 'Limited'], ['Insufficient', 'Insufficient']])}<button type="button" class="scie-link" data-filter-clear="1">Clear filters</button></div>${U.table(t, { rows: list, fmt: FMT_FA, items: true })}`, badges: U.badges(t) }))}`;
  }
  const FMT_RP = { d: 'n1', sg: 'n1', lt: 'n1', ltS: 'n1', ss: 'n0', ssR: 'n0', rop: 'n0', ropR: 'n0', ropGap: 'pct' };
  function policy(ctx) {
    const S = ctx.S, f = ctx.filters, type = f.type === 'RM' ? 'RM' : 'FG', vms = V.forSub(S, 'planning', 'policy'), v = id => pick(vms, id);
    const t = v(type === 'FG' ? 'rp-items' : 'rp-items-rm'), vd = f.verdict || '', list = vd ? t.rows.filter(r => r.ref.verdict === vd) : t.rows;
    const seg = `<span class="scie-seg" role="group" aria-label="Item type"><button type="button" data-set="type=FG" aria-pressed="${type === 'FG'}">Products</button><button type="button" data-set="type=RM" aria-pressed="${type === 'RM'}">Materials</button></span>`;
    const low = v(type === 'FG' ? 'rp-low-chart' : 'rp-low-chart-rm');
    return `${head('Safety stock & reorder points', `Whether each item’s reorder point and safety stock are right. ${v('rp-verdicts').provenance.basis}. Indicative, not a recommendation; the service level is set in Settings.`, ['Reorder policy'])}
      ${kpis([U.kpi(v('rp-insufficient'), 'red', 'alert'), U.kpi(v('rp-excessive'), 'orange', 'box'), U.kpi(v('rp-aligned'), 'green', 'chart'), U.kpi(v('rp-no-rop'), 'navy', 'table'), U.kpi(v('rp-not-assessed'), 'teal', 'db')])}
      ${grid(U.panel({ id: 'rp-verdicts', title: v('rp-verdicts').title, q: v('rp-verdicts').question, icon: 'chart', span: low ? 'scie-span-5' : 'scie-span-12', body: U.chart(v('rp-verdicts')), badges: U.badges(v('rp-verdicts')) }),
        low ? U.panel({ id: low.id, title: low.title, q: low.question, icon: 'chart', span: 'scie-span-7', body: U.chart(low, { horizontal: true }), badges: U.badges(low) }) : '')}
      ${grid(U.panel({ id: t.id, title: t.title, q: `Showing ${F.show(list.length)} of ${F.show(t.rows.length)}.`, icon: 'table', body: `<div class="scie-filters" role="group" aria-label="Filters">${seg}${sel('verdict', 'Verdict', vd, [['', 'All'], ['Existing ROP insufficient', 'Insufficient'], ['Existing ROP possibly excessive', 'Possibly excessive'], ['Broadly aligned', 'Aligned'], ['No reorder point configured', 'No reorder point']])}<button type="button" class="scie-link" data-filter-clear="1">Clear filters</button></div>${U.table(t, { rows: list, fmt: FMT_RP, items: true })}`, badges: U.badges(t) }))}`;
  }

  /* ---- Procurement & Suppliers (Phase 2) ---------------------------------------------------------------------------- */
  const FMT_MRP = { 'x.av': 'n0', rq: 'n0', gross: 'n0', 'x.ssU': 'n0', net: 'n0', 'x.moq': 'n0', qty: 'n0', val: '£', netU: 'n0' };
  function buy(ctx) {
    const S = ctx.S, f = ctx.filters, vms = V.forSub(S, 'procurement', 'buy'), v = id => pick(vms, id);
    const t = v('mrp-rows'), stF = f.st || '', sup = f.sup || '', list = t.rows.filter(r => (!stF || r.ref.st === stF) && (!sup || r.ref.x.sup === sup));
    const sups = [...new Set(t.rows.map(r => r.ref.x.sup).filter(Boolean))].sort();
    const avail = pick(V.forTab(S, 'Materials'), 'rm-cover-lt');
    return `${head('What to buy', `What must be ordered, how much and by when. ${v('mrp-order-now').provenance.basis}. Confirm supplier terms before ordering.`, ['MRP'])}
      ${kpis([U.kpi(v('mrp-order-now'), 'red', 'cart'), U.kpi(v('mrp-soon'), 'orange', 'cart'), U.kpi(v('mrp-net'), 'blue', 'table'), U.kpi(v('mrp-value'), 'navy', 'value'), U.kpi(v('mrp-na'), 'teal', 'db')])}
      ${grid(U.panel({ id: 'mrp-urgent', title: 'Order now', q: v('mrp-urgent').question, icon: 'cart', body: U.table(v('mrp-urgent'), { fmt: FMT_MRP, items: true, empty: 'Nothing has to be ordered now.' }), badges: U.badges(v('mrp-urgent')) }))}
      ${grid(U.panel({ id: 'mrp-status', title: v('mrp-status').title, q: v('mrp-status').question, icon: 'chart', span: 'scie-span-6', body: U.chart(v('mrp-status')) }),
        U.panel({ id: 'mrp-by-supplier', title: v('mrp-by-supplier').title, q: v('mrp-by-supplier').question, icon: 'chart', span: 'scie-span-6', body: U.chart(v('mrp-by-supplier')) }))}
      ${avail ? grid(U.panel({ id: avail.id, title: 'Material availability: cover against lead time', q: 'The 20 materials with the least cover: days of stock against the days a replenishment takes.', icon: 'chart', body: U.chart(avail, { tall: true }), badges: U.badges(avail) })) : ''}
      ${grid(U.panel({ id: 'mrp-rows', title: 'All materials', q: `Showing ${F.show(list.length)} of ${F.show(t.rows.length)}, by status then value.`, icon: 'table', body: `<div class="scie-filters" role="group" aria-label="Filters">${sel('st', 'Status', stF, [['', 'All'], ['ORDER NOW', 'Order now'], ['Order soon', 'Order soon'], ['Plan', 'Plan'], ['Covered', 'Covered'], ['Not Assessed', 'Not Assessed']])}${sel('sup', 'Supplier', sup, [['', 'All']].concat(sups.map(x => [x, x])))}<button type="button" class="scie-link" data-filter-clear="1">Clear filters</button></div>${U.table(t, { rows: list, fmt: FMT_MRP, items: true })}`, badges: U.badges(t) }))}`;
  }
  const FMT_SU = { score: 'n1', n: 'n0', otd: 'n1', delayed: 'n0', shortN: 'n0', excl: 'n0', late: 'n1', stated: 'n0', ltA: 'n1', ltS: 'n1', fill: 'n1', over: 'n0', overN: 'n0', mats: 'n0', risk: 'n0' };
  function suppliers(ctx) {
    const S = ctx.S, f = ctx.filters, vms = V.forSub(S, 'procurement', 'suppliers'), v = id => pick(vms, id);
    const t = v('su-rows'), cat = f.cat || '', list = cat ? t.rows.filter(r => r.ref.cat === cat || (cat === 'na' && /^Not Assessed/.test(r.ref.cat))) : t.rows;
    const ch = (id, span, o) => (v(id) ? U.panel({ id, title: v(id).title, q: v(id).question, icon: 'chart', span, body: U.chart(v(id), o || {}), badges: U.badges(v(id)) }) : '');
    return `${head('Supplier performance', `Which suppliers put supply at risk, and on what evidence. ${v('su-high').provenance.basis}. A supplier without enough valid lines is Not Assessed — Insufficient Evidence, not scored.`, ['Suppliers'])}
      ${kpis([U.kpi(v('su-high'), 'red', 'handshake'), U.kpi(v('su-medium'), 'orange', 'handshake'), U.kpi(v('su-at-risk'), 'purple', 'alert'), U.kpi(v('su-limited'), 'navy', 'table'), U.kpi(v('su-na'), 'teal', 'db')])}
      ${grid(ch('su-score', 'scie-span-6', { horizontal: true, tall: true }), ch('su-otd-fill', 'scie-span-6', { horizontal: true, tall: true }))}
      ${grid(ch('su-lt', 'scie-span-7', { horizontal: true, tall: true }), U.panel({ id: 'su-recs', title: v('su-recs').title, q: v('su-recs').question, icon: 'bulb', span: 'scie-span-5', body: U.recs(v('su-recs')) }))}
      ${grid(U.panel({ id: 'su-rows', title: t.title, q: `Showing ${F.show(list.length)} of ${F.show(t.rows.length)}, ordered by at-risk materials then score.`, icon: 'table', body: `<div class="scie-filters" role="group" aria-label="Filters">${sel('cat', 'Risk class', cat, [['', 'All'], ['High risk', 'High'], ['Medium risk', 'Medium'], ['Low risk', 'Low'], ['na', 'Not Assessed']])}<button type="button" class="scie-link" data-filter-clear="1">Clear filters</button></div>${U.table(t, { rows: list, fmt: FMT_SU })}`, badges: U.badges(t) }))}`;
  }
  const FMT_RC = { inv: 'n0', po: 'n0', gap: 'n0', val: '£', n: 'n0' };
  function reconciliation(ctx) {
    const S = ctx.S, f = ctx.filters, vms = V.forSub(S, 'procurement', 'reconciliation'), v = id => pick(vms, id);
    const t = v('rc-rows'), sign = f.gap || '', list = t.rows.filter(r => !sign || (sign === 'over' ? r.ref.gap > 0 : r.ref.gap < 0));
    return `${head('On-order reconciliation', 'Whether the “on order” quantities in the inventory record are backed by real purchase orders at the snapshot date. A difference is a data-reconciliation finding, not by itself lost stock or a purchasing error.', ['Data quality'])}
      ${kpis([U.kpi(v('rc-gap-n'), 'orange', 'alert'), U.kpi(v('rc-gap-value'), 'navy', 'value'), U.kpi(v('rc-top10'), 'purple', 'chart')])}
      ${v('rc-largest') ? grid(U.panel({ id: 'rc-largest', title: v('rc-largest').title, q: v('rc-largest').question, icon: 'chart', body: U.chart(v('rc-largest'), { horizontal: true, tall: true }), badges: U.badges(v('rc-largest')) })) : ''}
      ${grid(U.panel({ id: 'rc-rows', title: t.title, q: `Showing ${F.show(list.length)} of ${F.show(t.rows.length)}.`, icon: 'table', body: `<div class="scie-filters" role="group" aria-label="Filters">${sel('gap', 'Gap', sign, [['', 'All'], ['over', 'More on order than POs'], ['under', 'Fewer on order than POs']])}<button type="button" class="scie-link" data-filter-clear="1">Clear filters</button></div>${U.table(t, { rows: list, fmt: FMT_RC, items: true })}`, badges: U.badges(t) }))}`;
  }

  const BESPOKE = { 'planning/forecast': forecast, 'planning/accuracy': accuracy, 'planning/policy': policy, 'procurement/buy': buy, 'procurement/suppliers': suppliers, 'procurement/reconciliation': reconciliation, 'overview/dashboard': overview, 'inventory/stock': stock, 'inventory/health': health, 'inventory/excess': excess, 'reports/report': reportScreen, 'reports/workbook': workbookScreen, 'data/load': loadScreen };
  function render(ctx) {
    U.begin();
    const key = `${ctx.area.id}/${ctx.sub.id}`;
    if (BESPOKE[key]) return BESPOKE[key](ctx);
    return generic(ctx, V.forSub(ctx.S, ctx.area.id, ctx.sub.id), '');
  }
  G.CGScreens = Object.freeze({ render, BESPOKE });
})(typeof window !== 'undefined' ? window : globalThis);
