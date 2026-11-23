/* Stage 3B (23 Nov 2026): display formatting for the new interface. Presentation only: Intl formatting, escaping and
 * labels. No arithmetic (checked by tests/test-view-contract.js). An unknown value is shown as "Unavailable", never 0. */
(function (G) {
  'use strict';
  const nf = o => new Intl.NumberFormat('en-GB', o);
  const N = {
    gbp: nf({ style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }),
    gbpC: nf({ style: 'currency', currency: 'GBP', notation: 'compact', maximumFractionDigits: 1 }),
    n0: nf({ maximumFractionDigits: 0 }), n1: nf({ maximumFractionDigits: 1 }), n2: nf({ maximumFractionDigits: 2 })
  };
  const MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = s => String(s).replace(/[&<>"']/g, c => MAP[c]);
  const isNum = v => typeof v === 'number' && isFinite(v);
  const UNAV = '<span class="scie-unavail">Unavailable</span>';
  /* fmt: '£' | '£c' (compact) | 'n0' | 'n1' | 'n2' | 'text' */
  function show(v, fmt) {
    if (v === null || v === undefined) return UNAV;
    if (typeof v === 'number') {
      if (!isNum(v)) return UNAV;
      if (fmt === '£') return N.gbp.format(v);
      if (fmt === '£c') return N.gbpC.format(v);
      if (fmt === 'n1') return N.n1.format(v);
      if (fmt === 'n2') return N.n2.format(v);
      return N.n0.format(v);
    }
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    if (v instanceof Date) return esc(v.toISOString().slice(0, 10));
    return esc(v);
  }
  const SEV = { 3: 'Critical', 2: 'High', 1: 'Medium', 0: 'Low' };
  /* Risk pill from the engine's own class (sev 0–3, or null = Not Assessed). */
  function risk(sev) {
    if (sev === null || sev === undefined || !SEV[sev]) return '<span class="scie-risk" data-sev="na">Not Assessed</span>';
    return `<span class="scie-risk" data-sev="${sev}">${SEV[sev]}</span>`;
  }
  G.CGFmt = Object.freeze({ esc, show, risk, isNum, SEV });
})(typeof window !== 'undefined' ? window : globalThis);
