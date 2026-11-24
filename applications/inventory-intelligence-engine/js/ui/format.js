/* Stage 3B (23 Nov 2026): display formatting for the new interface. Presentation only: Intl formatting, escaping and
 * labels. No arithmetic (checked by tests/test-view-contract.js). An unknown value is shown as "Unavailable", never 0. */
(function (G) {
  'use strict';
  const nf = o => new Intl.NumberFormat('en-GB', o);
  const N = {
    gbp: nf({ style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }),
    gbpC: nf({ style: 'currency', currency: 'GBP', notation: 'compact', maximumFractionDigits: 1 }),
    n0: nf({ maximumFractionDigits: 0 }), n1: nf({ maximumFractionDigits: 1 }), n2: nf({ maximumFractionDigits: 2 }),
    /* a fraction shown as a percentage (0.124 → 12.4%): Intl's percent style, no arithmetic here */
    pct: nf({ style: 'percent', maximumFractionDigits: 1 })
  };
  /* a calendar month from an engine timestamp. The engine keys months at UTC midnight (calculations.js), so the month is
     read in UTC: in local time a browser west of UTC would show the previous month (fixed 24 Nov 2026). */
  const MONTH = new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  const month = t => (isFinite(t) ? MONTH.format(new Date(t)) : 'Unknown month');
  const MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = s => String(s).replace(/[&<>"']/g, c => MAP[c]);
  const isNum = v => typeof v === 'number' && isFinite(v);
  const UNAV = '<span class="scie-unavail">Unavailable</span>';
  /* fmt: '£' | '£c' (compact) | 'n0' | 'n1' | 'n2' | 'pct' (fraction as %) | 'text' */
  function show(v, fmt) {
    if (v === null || v === undefined) return UNAV;
    if (typeof v === 'number') {
      if (!isNum(v)) return UNAV;
      if (fmt === '£') return N.gbp.format(v);
      if (fmt === '£c') return N.gbpC.format(v);
      if (fmt === 'n1') return N.n1.format(v);
      if (fmt === 'n2') return N.n2.format(v);
      if (fmt === 'pct') return N.pct.format(v);
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
  G.CGFmt = Object.freeze({ esc, show, risk, isNum, SEV, month });
})(typeof window !== 'undefined' ? window : globalThis);
