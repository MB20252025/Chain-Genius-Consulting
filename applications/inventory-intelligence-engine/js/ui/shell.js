/* Stage 3B (23 Nov 2026): the application shell for the approved navigation (SCIE-NAVIGATION-AND-SCREEN-SPEC-v1).
 * - Builds the sidebar (six primary areas, then Reports, Data Management, Settings, then the Advanced view), the top bar
 *   and the screen area AFTER the original #app in the page, so the original 17 tabs (#nav, #v) stay exactly as they were.
 * - New screens are the principal view. Choosing an original tab (#nav), a "See original tab" link or the Advanced view
 *   switches to the original tab; choosing an area switches back.
 * - Filters belong to one primary area: kept between its subsections, reset when the area changes, never global (§10.7).
 * - Production is listed only when the business has production data (§10.8).
 * - The item panel only presents existing engine values (§10.6). Nothing in this file calculates.
 * Engine state is read only through CGVM.source() → CGEngine.current() (A1 rule). */
(function (G) {
  'use strict';
  const d = G.document, V = G.CGVM, U = G.CGUI, F = G.CGFmt, esc = F.esc;
  if (!d || !V || !U || !G.CGScreens) return;
  const st = { area: 'overview', sub: 'dashboard', mode: 'new', filters: {}, open: {}, last: null };
  let side, top, view, panel;

  const ICONS = { overview: 'overview', inventory: 'inventory', planning: 'planning', procurement: 'procurement', production: 'production', scenarios: 'scenarios', reports: 'reports', data: 'data', settings: 'settings' };
  const LOGO = '<svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="#2f8f4e"/><path d="M13 20a7 7 0 0 1 7-7h5M27 20a7 7 0 0 1-7 7h-5" stroke="#fff" stroke-width="3.2" fill="none" stroke-linecap="round"/><circle cx="25" cy="13" r="2.2" fill="#fff"/><circle cx="15" cy="27" r="2.2" fill="#fff"/></svg>';
  const WAVE = '<svg class="scie-wave" viewBox="0 0 200 26" preserveAspectRatio="none" aria-hidden="true"><path d="M0 20 C40 4 80 4 120 14 S180 26 200 8" stroke="#2f8f4e" stroke-width="2" fill="none"/><path d="M0 24 C50 12 90 14 130 20 S180 24 200 16" stroke="#436c47" stroke-width="1.5" fill="none" opacity=".7"/></svg>';

  function source() { try { return V.source(); } catch (e) { return null; } }
  const allAreas = S => V.primary(S).concat(V.NAV.utility);
  const findArea = (S, id) => allAreas(S).find(a => a.id === id);

  function build() {
    if (d.getElementById('scie-side')) return;
    const main = d.querySelector('main'), app = d.getElementById('app');
    if (!main || !app) return;
    side = d.createElement('div'); side.id = 'scie-side-wrap';
    side.innerHTML = '';
    const nav = d.createElement('nav'); nav.id = 'scie-side'; nav.setAttribute('aria-label', 'Main navigation');
    top = d.createElement('div'); top.id = 'scie-top';
    view = d.createElement('div'); view.id = 'scie-view'; view.setAttribute('role', 'region'); view.setAttribute('aria-live', 'polite');
    panel = d.createElement('aside'); panel.id = 'scie-item'; panel.setAttribute('aria-label', 'Item detail');
    const advHead = d.createElement('div'); advHead.id = 'scie-advhead';
    advHead.innerHTML = '<b>Advanced view</b><span>The original 17 analyses, unchanged. Choose one to open it; choose an area on the left to return.</span>';
    app.insertBefore(advHead, app.firstChild);
    main.appendChild(top); main.appendChild(view); main.appendChild(nav); main.appendChild(panel);
    side = nav;
    d.addEventListener('click', onClick);
    /* Capture phase: the original click handler re-renders #nav, which detaches the clicked button before a bubbling
       listener sees it. Choosing one of the original 17 tabs always opens the Advanced view (the original screen). */
    d.addEventListener('click', e => { if (e.target.closest && e.target.closest('#nav [data-t]')) enterAdv(); }, true);
    d.addEventListener('input', onInput);
    d.addEventListener('change', onInput);
    d.addEventListener('keydown', e => { if (e.key === 'Escape') closeItem(); if ((e.key === 'Enter' || e.key === ' ') && e.target.closest && e.target.closest('tr[data-item]')) { e.preventDefault(); openItem(e.target.closest('tr[data-item]').dataset.item); } });
  }

  function drawSide(S) {
    const sub = a => (a.direct ? '' : `<ul class="scie-subs"${st.area === a.id ? '' : ' hidden'}>${a.subs.map(s => `<li><button type="button" data-go="${a.id}/${s.id}"${st.mode === 'new' && st.area === a.id && st.sub === s.id ? ' aria-current="true"' : ''}>${esc(s.label)}</button></li>`).join('')}</ul>`);
    const btn = a => `<li><button type="button" class="scie-area" data-go="${a.id}/${a.subs[0].id}"${st.mode === 'new' && st.area === a.id ? ' aria-current="page"' : ''}>${U.icon(ICONS[a.id])}<span>${esc(a.area)}</span>${a.direct ? '' : '<span class="scie-chev" aria-hidden="true">›</span>'}</button>${sub(a)}</li>`;
    side.innerHTML = `<div class="scie-brand">${LOGO}<div><b>Chain Genius</b><span>SCIE</span></div></div>
      <ul class="scie-group">${V.primary(S).map(btn).join('')}</ul><div class="scie-sep" role="separator"></div>
      <ul class="scie-group">${V.NAV.utility.map(btn).join('')}<li><button type="button" class="scie-area" data-adv="1"${st.mode === 'adv' ? ' aria-current="page"' : ''}>${U.icon('advanced')}<span>Advanced view</span></button></li></ul>
      <div class="scie-sidefoot"><b>SCIE v0.7 · development build</b>Chain Genius Consulting${WAVE}</div>`;
  }
  function drawTop(S) {
    const demo = V.at(S, 'R.demo'), snap = V.at(S, 'R.snap');
    top.innerHTML = `<div><h1>SCIE – Supply Chain Intelligence Engine</h1><p>Runs in your browser. Your file never leaves your device. All figures are calculated, not AI-generated.</p></div>
      <span class="scie-pill${demo ? ' scie-demo' : ''}">${demo ? 'Demonstration data · ' : ''}Snapshot ${esc(snap instanceof Date ? snap.toISOString().slice(0, 10) : '')}</span>`;
  }
  function draw() {
    const S = source();
    if (!S) return;
    st.last = S.R;
    if (!findArea(S, st.area)) { st.area = 'overview'; st.sub = 'dashboard'; }
    const a = findArea(S, st.area), s = a.subs.find(x => x.id === st.sub) || a.subs[0];
    st.sub = s.id;
    d.body.classList.toggle('scie-load', st.mode === 'new' && a.id === 'data' && s.id === 'load');
    drawSide(S); drawTop(S);
    if (st.mode !== 'new') return;
    const f = st.filters[a.id] || (st.filters[a.id] = {});
    const tabs = a.direct ? '' : `<ul class="scie-tabs" aria-label="${esc(a.area)} sections">${a.subs.map(x => `<li><button type="button" data-go="${a.id}/${x.id}"${x.id === s.id ? ' aria-current="true"' : ''}>${esc(x.label)}</button></li>`).join('')}</ul>`;
    let html;
    try { html = G.CGScreens.render({ S, area: a, sub: s, filters: f }); }
    catch (e) { html = `<div class="scie-wip"><b>This screen could not be drawn.</b><p>${esc(e.message)}</p><p>The original analyses are available in the Advanced view.</p></div>`; if (G.console) G.console.error(e); }
    view.innerHTML = `${tabs}${html}`;
    U.mount(view);
  }

  function go(areaId, subId) {
    if (areaId === 'settings') { st.area = 'settings'; st.sub = 'thresholds'; openOriginal('Settings', true); return; }
    if (areaId !== st.area) st.filters = {}; // filters reset between areas (never global)
    st.area = areaId; st.sub = subId; st.mode = 'new';
    d.body.classList.remove('scie-adv');
    closeItem(); draw();
    if (view.scrollIntoView && G.matchMedia && G.matchMedia('(max-width:820px)').matches) view.scrollIntoView({ block: 'start' });
  }
  function openOriginal(tab, keepArea) {
    const b = d.querySelector(`#nav [data-t="${tab}"]`);
    st.mode = 'adv'; d.body.classList.add('scie-adv');
    if (!keepArea) st.area = st.area; // the area stays highlighted only for Settings, which uses the original form
    if (b) b.click();
    drawSide(source() || { R: {} });
  }
  function closeItem() { if (panel) { panel.classList.remove('scie-open'); panel.innerHTML = ''; } }

  /* Item detail: existing values of one item, grouped; presentation only. */
  function openItem(id) {
    const S = source(); if (!S) return;
    const x = S.R.fg.find(i => i.id === id) || S.R.rm.find(i => i.id === id);
    if (!x) return;
    const isFG = S.R.fg.includes(x), m = S.mrp.find(r => r.x && r.x.id === id), fc = S.fc[id], cr = S.cred && S.cred[id], sup = x.sup ? S.R.sup.find(s => s.id === x.sup) : null;
    const row = (l, v, f) => `<dt>${esc(l)}</dt><dd>${v === undefined ? '–' : F.show(v, f)}</dd>`;
    const sec = (t, ...rows) => (rows.length ? `<h4>${esc(t)}</h4><dl>${rows.join('')}</dl>` : '');
    panel.innerHTML = `<button type="button" class="scie-btn scie-ghost" data-close-item="1">Close</button>
      <h3>${esc(x.id)} · ${esc(x.name || '')}</h3><p>${F.risk(x.sev)} ${x.why ? esc(x.why) : ''}</p>
      ${sec('Stock position', row('Available', x.av, 'n0'), row('Position', x.pos, 'n0'), row('Physical on hand', x.oh, 'n0'), row('Allocated', x.al, 'n0'), row('Cover (days)', x.cover, 'n1'), row('Value', x.val, '£'), row('Health score', x.score, 'n0'), row('Health category', x.cat))}
      ${sec('Reorder policy', row('Lead time (days)', x.lt, 'n1'), row('Lead-time source', x.ltSrc), row('Safety stock (workbook)', x.ss, 'n0'), row('Safety stock (recommended)', x.ssR, 'n0'), row('ROP (workbook)', x.rop, 'n0'), row('ROP (recommended)', x.ropR, 'n0'), row('Policy check', x.verdict), row('ABC / XYZ', `${x.abc || '–'} / ${x.xyz || '–'}`))}
      ${isFG && fc ? sec('Demand forecast', row('Method', fc.meth), row('Next 3 months', fc.s3, 'n0'), row('Next 6 months', fc.s6, 'n0'), row('Next 12 months', fc.s12, 'n0'), row('Trend', fc.trend)) : ''}
      ${isFG && cr ? sec('Forecast accuracy', row('Accuracy %', cr.acc, 'n1'), row('Bias %', cr.bias, 'n1'), row('Verdict', cr.verdict), row('Confidence', cr.conf)) : ''}
      ${m ? sec('What to buy (MRP)', row('Status', m.st), row('Net requirement', m.net, 'n0'), row('Suggested quantity', m.qty, 'n0'), row('Value', m.val, '£'), row('Order by', m.by)) : ''}
      ${sup ? sec('Supplier', row('Supplier', `${sup.id} · ${sup.name}`), row('Score', sup.score, 'n0'), row('Risk class', sup.cat), row('On-time %', sup.otd, 'n1'), row('Fill %', sup.fill, 'n1')) : ''}
      ${sec('Excess stock', row('Stock class', x.cls), row('Uncommitted', x.uncomm, 'n0'), row('Potential excess value', x.exVal, '£'))}
      ${sec('Confidence', row('Confidence', x.conf), row('Basis', x.confWhy), row('Suggested action', x.act))}
      <p class="scie-note">All values come from the engine for this item; nothing here is recalculated. Unknown values are shown as "Unavailable".</p>`;
    panel.classList.add('scie-open');
    const c = panel.querySelector('[data-close-item]'); if (c && c.focus) c.focus();
  }

  function onClick(e) {
    const t = e.target.closest ? e.target : null; if (!t) return;
    const navT = t.closest('#nav [data-t]');
    if (navT) { enterAdv(); return; }
    const goEl = t.closest('[data-go]'); if (goEl) { const [a, s] = goEl.dataset.go.split('/'); go(a, s); return; }
    if (t.closest('[data-adv]')) { openOriginal((d.querySelector('#nav .on') || {}).dataset ? d.querySelector('#nav .on').dataset.t : 'Overview'); return; }
    const orig = t.closest('[data-orig]'); if (orig) { openOriginal(orig.dataset.orig); return; }
    const kp = t.closest('[data-drill]'); if (kp) { try { const dr = JSON.parse(kp.dataset.drill), a = (allAreas(source()).find(x => x.area === dr.area) || {}); if (a.id) { go(a.id, dr.view || a.subs[0].id); if (dr.filter) { const f = st.filters[a.id] || (st.filters[a.id] = {}); if (dr.filter.type) f.type = dr.filter.type; draw(); } } } catch (err) { /* ignore malformed drill */ } return; }
    const set = t.closest('[data-set]'); if (set) { const [k, v] = set.dataset.set.split('='); (st.filters[st.area] || (st.filters[st.area] = {}))[k] = v; draw(); return; }
    if (t.closest('[data-filter-clear]')) { const f = st.filters[st.area] || {}; const keep = f.type; st.filters[st.area] = keep ? { type: keep } : {}; draw(); return; }
    if (t.closest('[data-close-item]')) { closeItem(); return; }
    const tr = t.closest('#scie-view tr[data-item]'); if (tr) { openItem(tr.dataset.item); return; }
    const act = t.closest('[data-act]');
    if (act && act.dataset.act === 'print') { openOriginal('Summary'); G.setTimeout(() => G.print(), 50); return; }
    if (act && act.dataset.act === 'export') { if (typeof G.exportWorkbook === 'function') { G.exportWorkbook(); const s = view.querySelector('[data-export-status]'), m = d.getElementById('st'); if (s && m) s.textContent = m.textContent; } return; }
  }
  function onInput(e) {
    const el = e.target; if (!el || !el.dataset || !el.dataset.filter || !el.closest('#scie-view')) return;
    if (e.type === 'input' && el.tagName === 'SELECT') return;
    const f = st.filters[st.area] || (st.filters[st.area] = {});
    f[el.dataset.filter] = el.value;
    const pos = el.selectionStart, key = el.dataset.filter;
    draw();
    const again = view.querySelector(`[data-filter="${key}"]`); if (again && again.tagName === 'INPUT') { again.focus(); if (again.setSelectionRange && pos !== null) again.setSelectionRange(pos, pos); }
  }

  /* Start when an analysis exists; redraw when a new analysis replaces it (recalculation or a new workbook). */
  function enterAdv() { st.mode = 'adv'; d.body.classList.add('scie-adv'); closeItem(); if (side) drawSide(source() || { R: {} }); }
  function sync() {
    /* CGEngine is a top-level const (engine-api.js), so it is a global name but not a window property */
    const r = typeof CGEngine !== 'undefined' && CGEngine.currentResult ? CGEngine.currentResult() : null;
    if (!r) return;
    if (!d.body.classList.contains('scie-on')) { build(); d.body.classList.add('scie-on'); draw(); return; }
    if (r !== st.last) draw();
  }
  function start() {
    build();
    const app = d.getElementById('app');
    const nav = d.getElementById('nav');
    if (G.MutationObserver) { if (app) new G.MutationObserver(sync).observe(app, { attributes: true, attributeFilter: ['hidden'] }); if (nav) new G.MutationObserver(sync).observe(nav, { childList: true }); }
    sync();
  }
  G.CGShell = Object.freeze({ go, state: () => JSON.parse(JSON.stringify({ area: st.area, sub: st.sub, mode: st.mode, filters: st.filters })), openItem });
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', start); else start();
})(typeof window !== 'undefined' ? window : globalThis);
