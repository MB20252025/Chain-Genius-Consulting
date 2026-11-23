/* Stage 3B (23 Nov 2026): reusable interface components. Each takes a view-model (js/views/contract.js) and returns
 * markup, or mounts a chart from the view-model's own values. Components never calculate (tests/test-view-contract.js).
 * Charts: Chart.js 4.6.1, vendored in assets/vendor (owner decision D-5). */
(function (G) {
  'use strict';
  const F = G.CGFmt, esc = F.esc;
  const ICON = {
    overview: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
    inventory: '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
    planning: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    procurement: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5"/><circle cx="17" cy="9" r="2.5"/><path d="M15 15c3 0 6 2 6 5"/>',
    production: '<path d="M3 21V10l6 4V10l6 4V6h6v15z"/><path d="M7 17h2M12 17h2M17 17h2"/>',
    scenarios: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>',
    reports: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
    data: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    advanced: '<path d="M4 6h16M4 12h16M4 18h10"/>',
    value: '<path d="M4 20V12M10 20V8M16 20v-5M22 20H2"/><path d="M4 9l6-4 6 5 6-6"/>',
    alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>',
    box: '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
    cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l3 12h11l2-8H6"/>',
    handshake: '<path d="M3 12l4-4 5 3 5-3 4 4-9 7z"/>',
    heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
    db: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/>',
    bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>',
    table: '<path d="M3 5h18v14H3zM3 10h18M9 5v14"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>'
  };
  const icon = (k, cls) => `<svg class="${cls || 'scie-ico'}" viewBox="0 0 24 24" aria-hidden="true">${ICON[k] || ICON.chart}</svg>`;

  /* provenance, completeness and confidence badges: the contract's own fields, stated in words */
  function badges(vm) {
    const out = [];
    const p = vm.provenance || {};
    if (p.source && p.source !== 'calculated') out.push(`<span class="scie-badge" data-k="${esc(p.source)}" title="${esc(p.basis || '')}">${esc(p.source)}</span>`);
    const c = vm.completeness || {};
    if (c.status === 'partial') out.push(`<span class="scie-badge" data-k="partial" title="${esc((c.reasons || []).join(' '))}">partial: ${F.show(c.included)} of ${F.show(c.of)}</span>`);
    if (c.status === 'unavailable') out.push(`<span class="scie-badge" data-k="unavailable" title="${esc((c.reasons || []).join(' '))}">unavailable</span>`);
    if (vm.confidence && vm.confidence.rating) out.push(`<span class="scie-badge" title="${esc(vm.confidence.why || '')}">confidence: ${esc(vm.confidence.rating)}</span>`);
    return out.length ? `<div class="scie-badges">${out.join('')}</div>` : '';
  }
  const drillAttr = vm => (vm.drill ? ` data-drill="${esc(JSON.stringify(vm.drill))}"` : '');

  /* KPI card */
  function kpi(vm, tone, ic, fmt) {
    if (!vm) return '';
    const v = vm.value === null ? '–' : F.show(vm.value, fmt || (vm.unit === '£' ? '£c' : vm.unit === 'score' ? 'n1' : 'n0'));
    const meta = vm.completeness && vm.completeness.status === 'unavailable' ? esc((vm.completeness.reasons || [''])[0]) : esc((vm.provenance && vm.provenance.basis) || '');
    return `<button type="button" class="scie-kpi" data-tone="${tone || 'navy'}" data-vm="${esc(vm.id)}"${drillAttr(vm)} title="${meta}">${icon(ic || 'chart', 'scie-kpi-ico')}
      <span class="scie-v">${v}</span><span class="scie-l">${esc(vm.title)}</span>${badges(vm)}</button>`;
  }
  /* Panel with heading, question, body and optional "See original tab" links */
  function panel(o) {
    const orig = o.orig && o.orig.length ? `<p class="scie-note">${o.orig.map(t => `<button type="button" class="scie-link" data-orig="${esc(t)}">See original tab: ${esc(t)}</button>`).join(' · ')}</p>` : '';
    return `<section class="scie-panel ${o.span || 'scie-span-12'}"${o.id ? ` data-vm="${esc(o.id)}"` : ''}><h3>${icon(o.icon || 'chart')}${esc(o.title)}</h3>${o.q ? `<p class="scie-q">${esc(o.q)}</p>` : ''}${o.body}${o.badges || ''}${orig}</section>`;
  }
  /* Table: cells are the view-model's own cells, formatted per column */
  function table(vm, opt) {
    opt = opt || {};
    if (!vm) return '';
    const cols = vm.columns, fmts = opt.fmt || {}, numeric = k => fmts[k] && fmts[k] !== 'text';
    const head = cols.map(c => `<th${numeric(c.field) ? ' class="scie-num"' : ''} scope="col">${esc(c.label)}</th>`).join('');
    const rows = (opt.rows || vm.rows).map(r => {
      const tds = r.cells.map((v, i) => { const k = cols[i].field; if (k === 'sev') return `<td>${F.risk(v)}</td>`; return `<td${numeric(k) ? ' class="scie-num"' : ''}>${F.show(v, fmts[k])}</td>`; }).join('');
      const id = r.ref && (r.ref.id || (r.ref.x && r.ref.x.id));
      return `<tr${opt.items && id ? ` data-item="${esc(id)}" tabindex="0"` : ''}>${tds}</tr>`;
    }).join('');
    const empty = (opt.rows || vm.rows).length ? '' : `<p class="scie-note">${esc(opt.empty || 'No rows.')}</p>`;
    return `<div class="w"><table class="scie-table"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>${empty}`;
  }
  /* Recommendations: the Summary's own list; numbered by a CSS counter */
  function recs(vm) {
    if (!vm || !vm.items.length) return '<p class="scie-note">No recommendations.</p>';
    return `<ol class="scie-recs">${vm.items.map(r => `<li><div><b>${esc(r.title)}</b><p>${esc(r.reason)}</p><p><strong>Action:</strong> ${esc(r.action)} · <strong>Confidence:</strong> ${esc(r.confidence)}</p></div></li>`).join('')}</ol>`;
  }
  /* Confidence list: area and rating from the Data confidence table (engine confAreas), as compact rows */
  function confList(vm) {
    if (!vm || !vm.rows.length) return '<p class="scie-note">No confidence assessment.</p>';
    return `<ul class="scie-conf">${vm.rows.map(r => `<li><span>${esc(r.ref.area)}</span><b class="scie-badge" data-rating="${esc(r.ref.rating)}" title="${esc(r.ref.why || '')}">${esc(r.ref.rating)}</b></li>`).join('')}</ul>`;
  }
  /* Health ring: CSS draws the arc from the engine value (custom property), no script arithmetic */
  function ring(vm, label) {
    if (!vm || vm.value === null) return `<p class="scie-unavail">Unavailable</p>`;
    return `<div class="scie-ring" style="--p:${vm.value}" role="img" aria-label="${esc(label)} ${F.show(vm.value, 'n1')} out of 100"><div><div><b>${F.show(vm.value, 'n1')}</b><span>${esc(label)}</span></div></div></div>`;
  }

  /* Charts: built from the view-model's labels and series. */
  const charts = [];
  let pending = [];
  const cssVar = k => getComputedStyle(document.documentElement).getPropertyValue(k).trim();
  const PALETTE = ['--cg-c1', '--cg-c2', '--cg-c3', '--cg-c4', '--cg-c5', '--cg-c6', '--cg-c7'];
  const RISKC = { Critical: '--cg-crit', High: '--cg-high', Medium: '--cg-med', Low: '--cg-low', 'Not Assessed': '--cg-na' };
  function chart(vm, opt) {
    opt = opt || {};
    if (!vm) return '';
    const key = `${vm.id}-${pending.length}`;
    pending.push({ key, vm, opt });
    const unavailable = vm.series && vm.series.every(s => s.data.every(v => v === null));
    return unavailable ? '<p class="scie-unavail">Unavailable: the engine has no values for this chart.</p>' : `<div class="scie-chart${opt.tall ? ' scie-tall' : ''}"><canvas data-chart="${esc(key)}" role="img" aria-label="${esc(vm.title)}"></canvas></div>`;
  }
  function mount(root) {
    while (charts.length) charts.pop().destroy();
    const todo = pending; pending = [];
    if (typeof G.Chart !== 'function') return;
    /* No 2D canvas (for example a headless DOM without a canvas implementation): show each chart's values as a plain list
       instead of asking for a context the environment cannot provide. Presentation only: the values are the view-model's. */
    if (typeof G.CanvasRenderingContext2D === 'undefined') {
      for (const p of todo) {
        const cv = root.querySelector(`canvas[data-chart="${p.key}"]`);
        if (!cv) continue;
        const items = p.vm.series.map(s => s.data.map((v, i) => `<li>${esc(p.vm.labels[i])}${p.vm.series.length > 1 ? ` (${esc(s.name)})` : ''}: ${F.show(v, p.vm.unit === '£' ? '£c' : 'n1')}</li>`).join('')).join('');
        cv.parentNode.outerHTML = `<ul class="scie-chartlist" aria-label="${esc(p.vm.title)}">${items}</ul>`;
      }
      return;
    }
    const text = cssVar('--cg-muted'), grid = cssVar('--cg-line');
    for (const p of todo) {
      const cv = root.querySelector(`canvas[data-chart="${p.key}"]`);
      if (!cv) continue;
      const vm = p.vm, o = p.opt, type = o.type || (vm.kind === 'line' ? 'line' : 'bar');
      const colours = o.riskColours ? vm.labels.map(l => cssVar(RISKC[l] || '--cg-na')) : null;
      const ds = vm.series.map((s, i) => {
        const c = cssVar(PALETTE[i] || '--cg-c1');
        const d = { label: s.name, data: s.data, backgroundColor: colours || c, borderColor: type === 'doughnut' ? cssVar('--cg-card') : c, borderWidth: type === 'line' ? 2 : 1, spanGaps: false, pointRadius: type === 'line' ? 2 : 0 };
        if (o.band && i) { d.fill = o.band === i ? '-1' : false; d.backgroundColor = 'rgba(31,95,191,.15)'; d.borderColor = 'rgba(31,95,191,.35)'; d.borderDash = [4, 4]; d.pointRadius = 0; }
        return d;
      });
      const money = vm.unit === '£';
      const tick = v => (money ? F.show(v, '£c').replace(/<[^>]+>/g, '') : F.show(v, 'n1').replace(/<[^>]+>/g, ''));
      charts.push(new G.Chart(cv, {
        type, data: { labels: vm.labels, datasets: ds },
        options: {
          responsive: true, maintainAspectRatio: false, animation: false, indexAxis: o.horizontal ? 'y' : 'x',
          plugins: { legend: { display: type === 'doughnut' || ds.length > 1, position: 'bottom', labels: { color: text, boxWidth: 12 } },
            tooltip: { callbacks: { label: c => `${c.dataset.label}: ${c.raw === null ? 'Unavailable' : tick(c.raw)}` } } },
          scales: type === 'doughnut' ? {} : {
            /* only the value axis gets a formatter; the category axis keeps Chart.js's own labels (the engine's names) */
            x: { ticks: Object.assign({ color: text, autoSkip: true, maxRotation: 0 }, o.horizontal ? { callback: v => tick(v) } : {}), grid: { color: grid } },
            y: { ticks: Object.assign({ color: text }, o.horizontal ? {} : { callback: v => tick(v) }), grid: { color: grid }, beginAtZero: true }
          }
        }
      }));
    }
  }
  /* reset the pending list before a screen is drawn (charts of an abandoned render are not mounted) */
  const begin = () => { pending = []; };
  G.CGUI = Object.freeze({ icon, badges, kpi, panel, table, recs, ring, confList, chart, mount, begin });
})(typeof window !== 'undefined' ? window : globalThis);
