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

  const BESPOKE = { 'overview/dashboard': overview, 'inventory/stock': stock, 'inventory/health': health, 'inventory/excess': excess, 'reports/report': reportScreen, 'reports/workbook': workbookScreen, 'data/load': loadScreen };
  function render(ctx) {
    U.begin();
    const key = `${ctx.area.id}/${ctx.sub.id}`;
    if (BESPOKE[key]) return BESPOKE[key](ctx);
    return generic(ctx, V.forSub(ctx.S, ctx.area.id, ctx.sub.id), '');
  }
  G.CGScreens = Object.freeze({ render, BESPOKE });
})(typeof window !== 'undefined' ? window : globalThis);
