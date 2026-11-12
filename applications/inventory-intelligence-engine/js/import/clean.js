/* Chain Genius – Supply Chain Intelligence Engine, v0.7 M1 Stage 1 (A3)
 * import/clean.js — the approved value-cleaning rules (decisions D6, D7, D8, D22). Turns one source text value into one canonical value.
 *
 * Plain script, no build step, no asynchronous code. Adds CGImport.clean. Never guesses: anything unclear is 'invalid' with a reason.
 *
 * Every result (built by res()): { status, value, rule, reason }
 *   status 'ok'        value read as written
 *          'cleaned'   harmless formatting removed (rule says which), meaning unchanged
 *          'missing'   blank in the source; value null (never 0)
 *          'ambiguous' a date that fits both day/month orders; value uses the file's chosen format and must be reported
 *          'conflict'  a date valid only in the OTHER day/month order; value null
 *          'invalid'   cannot be cleaned safely; value null; reason explains
 */
(function (NS) {
  'use strict';
  const res = (status, value, rule, reason) => ({ status, value, rule: rule || null, reason: reason || null });
  const str = v => (v === null || v === undefined) ? '' : String(v);

  // ---------- identifiers (codes) ----------
  // Kept exactly as written apart from surrounding spaces, so 000123 stays 000123. Case is kept; matching ignores case (Stage 2).
  function cleanId(raw, meta) {
    const s = str(raw), t = s.trim();
    if (t === '') return res('missing', null);
    if (/^\d+(\.\d+)?E[+-]?\d+$/i.test(t)) return res('invalid', null, null, 'code looks like scientific notation (e.g. 1.04523E+11): it was probably damaged by a spreadsheet');
    const r = t === s ? res('ok', t) : res('cleaned', t, 'trimmed spaces');
    if (meta && meta.numberCell) r.warning = 'stored as a number in the spreadsheet: leading zeros may already have been lost';
    return r;
  }

  // ---------- numbers (D8) ----------
  // Accepted: 1200, 1200.5, -12, 1,200 (proper groups of three), £5.50, (25) = -25. Rejected: units text, TBC, 1.200,50, 1,5, $5, €5, 1e3.
  function cleanNumber(raw) {
    let t = str(raw).trim();
    if (t === '') return res('missing', null);
    const rules = [];
    let neg = false;
    let m = /^\((.*)\)$/.exec(t);
    if (m) { neg = true; t = m[1].trim(); rules.push('brackets = negative'); }
    if (/^[-]/.test(t)) { if (neg) return res('invalid', null, null, 'two negative signs'); neg = true; t = t.slice(1).trim(); }
    if (/^£/.test(t)) { t = t.slice(1).trim(); rules.push('£ removed'); }
    if (/^-/.test(t) && !neg) { neg = true; t = t.slice(1).trim(); }
    if (/[$€¥]|^[A-Z]{3}\s/i.test(t)) return res('invalid', null, null, 'currency other than £ (no conversion in M1)');
    let n;
    if (/^\d+(\.\d+)?$/.test(t) || /^\d*\.\d+$/.test(t)) n = Number(t);
    else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(t)) { n = Number(t.replace(/,/g, '')); rules.push('thousands separators removed'); }
    else if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t) || /^\d+,\d{1,2}$/.test(t)) return res('invalid', null, null, 'decimal comma or full-stop thousands (e.g. 1.200,50): unclear, not guessed');
    else if (/^\d[\d.,]*\s*[a-z%]/i.test(t)) return res('invalid', null, null, 'number with text attached (e.g. "12 units"): not guessed');
    else return res('invalid', null, null, 'not a number ("' + str(raw).trim() + '")');
    if (!isFinite(n)) return res('invalid', null, null, 'not a finite number');
    if (neg) n = -n;
    if (Object.is(n, -0)) n = 0;
    return rules.length ? res('cleaned', n, rules.join('; ')) : res('ok', n);
  }

  // ---------- percentages (for fields such as BOM scrap) ----------
  // "5%" -> 0.05; 0.05 -> 0.05; a plain number above 1 without % is ambiguous (5 = 5% or 500%?) and rejected.
  function cleanPercent(raw) {
    const t = str(raw).trim();
    if (t === '') return res('missing', null);
    if (/%$/.test(t)) {
      const n = cleanNumber(t.slice(0, -1));
      if (n.status !== 'ok' && n.status !== 'cleaned') return res('invalid', null, null, 'not a percentage');
      return res('cleaned', Math.round(n.value * 1e9) / 1e11, 'percent text converted to a fraction');
    }
    const n = cleanNumber(t);
    if (n.status === 'missing') return n;
    if (n.value === null) return n;
    if (n.value < 0 || n.value > 1) return res('invalid', null, null, 'a plain number outside 0–1 is ambiguous as a percentage; write it with %');
    return n;
  }

  // ---------- dates (D6, D7) ----------
  const pad = n => String(n).padStart(2, '0');
  const ymdOK = (y, m, d) => { const t = new Date(Date.UTC(y, m - 1, d)); return m >= 1 && m <= 12 && t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d; };
  const iso = (y, m, d) => y + '-' + pad(m) + '-' + pad(d);
  const TIME = /([ T]\d{1,2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)$/;

  // format: 'UK' (day/month/year, default), 'US' (month/day/year) or 'ISO' (YYYY-MM-DD only)
  function cleanDate(raw, format) {
    const fmt = format || 'UK';
    let t = str(raw).trim();
    if (t === '') return res('missing', null);
    const rules = [];
    const tm = TIME.exec(t);
    if (tm) { if (!/^[ T]0?0:00(:00(\.0+)?)?(Z|[+-]00:?00)?$/.test(tm[1])) return res('invalid', null, null, 'date with a time of day other than midnight: not guessed'); t = t.slice(0, tm.index); rules.push('midnight time removed'); }
    let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
    if (m) {
      const y = +m[1], mo = +m[2], d = +m[3];
      if (!ymdOK(y, mo, d)) return res('invalid', null, null, 'not a real date');
      const v = iso(y, mo, d);
      if (v !== t) rules.push('padded to YYYY-MM-DD');
      return rules.length ? res('cleaned', v, rules.join('; ')) : res('ok', v);
    }
    if (fmt === 'ISO') return res('invalid', null, null, 'not in YYYY-MM-DD format (this file is set to ISO)');
    m = /^(\d{1,2})([\/.\-])(\d{1,2})\2(\d{2,4})$/.exec(t);
    if (!m) {
      if (/^\d+(\.\d+)?$/.test(t)) return res('invalid', null, null, 'a number where a date was expected (possibly an Excel date number in a text file)');
      return res('invalid', null, null, 'not a recognised date ("' + str(raw).trim() + '")');
    }
    if (m[4].length !== 4) return res('invalid', null, null, 'two-digit year: not guessed');
    const a = +m[1], b = +m[3], y = +m[4];
    const [pd, pm, ad, am] = fmt === 'US' ? [b, a, a, b] : [a, b, b, a];
    const pOK = ymdOK(y, pm, pd), aOK = ymdOK(y, am, ad);
    const fmtRule = (fmt === 'US' ? 'month/day/year' : 'day/month/year') + ' read as YYYY-MM-DD';
    if (pOK) {
      const v = iso(y, pm, pd);
      if (aOK && iso(y, am, ad) !== v) return res('ambiguous', v, fmtRule, 'also a valid date if read the other way round (' + iso(y, am, ad) + ')');
      return res('cleaned', v, [fmtRule].concat(rules).join('; '));
    }
    if (aOK) return res('conflict', null, null, 'only valid as ' + (fmt === 'US' ? 'day/month/year' : 'month/day/year') + ' (' + iso(y, am, ad) + '), which is not this file\'s format');
    return res('invalid', null, null, 'not a real date');
  }

  // D6: under 5% of a column's supplied dates in conflict -> reject those rows; 5% or more -> stop and ask for the file's format.
  function assessDateColumn(results) {
    const c = { supplied: 0, ok: 0, cleaned: 0, ambiguous: 0, conflict: 0, invalid: 0, missing: 0 };
    results.forEach(r => { c[r.status]++; if (r.status !== 'missing') c.supplied++; });
    const share = c.supplied ? c.conflict / c.supplied : 0;
    const decision = c.conflict === 0 ? 'ok' : share < 0.05 ? 'reject-rows' : 'stop';
    return Object.assign(c, { conflictShare: share, decision });
  }

  // ---------- flags, text, enums ----------
  function cleanFlag(raw) {
    const t = str(raw).trim();
    if (t === '') return res('missing', null);
    const u = t.toUpperCase();
    if (u === 'Y' || u === 'N') return t === u ? res('ok', u) : res('cleaned', u, 'upper-cased');
    if (u === 'YES' || u === 'TRUE') return res('cleaned', 'Y', 'yes/true read as Y');
    if (u === 'NO' || u === 'FALSE') return res('cleaned', 'N', 'no/false read as N');
    return res('invalid', null, null, 'not a yes/no value ("' + t + '"); map it as a code if the source uses its own values');
  }
  function cleanText(raw) {
    const s = str(raw), t = s.trim();
    if (t === '') return res('missing', null);
    return t === s ? res('ok', t) : res('cleaned', t, 'trimmed spaces');
  }
  function cleanEnum(raw, values) {
    const t = str(raw).trim();
    if (t === '') return res('missing', null);
    const hit = values.find(v => v.toUpperCase() === t.toUpperCase());
    if (!hit) return res('invalid', null, null, '"' + t + '" is not one of ' + values.join('/') + '; source codes must be mapped (Stage 2)');
    return hit === t ? res('ok', hit) : res('cleaned', hit, 'case matched');
  }

  // ---------- dispatch by canonical field definition ----------
  function cleanValue(field, raw, opts) {
    const o = opts || {};
    let r;
    switch (field.type) {
      case 'id': r = cleanId(raw, o.meta); break;
      case 'num': r = cleanNumber(raw); break;
      case 'pct': r = cleanPercent(raw); break;
      case 'date': r = cleanDate(raw, o.dateFormat); break;
      case 'flag': r = cleanFlag(raw); break;
      case 'enum': r = cleanEnum(raw, field.values); break;
      default: r = cleanText(raw);
    }
    if (field.type === 'num' && r.value !== null && r.value < 0) {
      if (field.neg === 'no') return res('invalid', null, null, 'negative value not allowed in ' + field.name);
      if (field.neg === 'flag') r.flag = 'negative value kept as entered';
    }
    return r;
  }

  // Cleans a whole column; returns per-value results plus a summary (counts by status and by rule) — the basis of the column-level change log.
  function cleanColumn(field, raws, opts) {
    const results = raws.map((v, i) => cleanValue(field, v, Object.assign({}, opts, { meta: opts && opts.metas ? opts.metas[i] : undefined })));
    const summary = { ok: 0, cleaned: 0, missing: 0, ambiguous: 0, conflict: 0, invalid: 0, rules: {}, warnings: 0, flags: 0 };
    results.forEach(r => { summary[r.status]++; if (r.rule) summary.rules[r.rule] = (summary.rules[r.rule] || 0) + 1; if (r.warning) summary.warnings++; if (r.flag) summary.flags++; });
    if (field.type === 'date') summary.dateDecision = assessDateColumn(results);
    return { results, summary };
  }

  NS.clean = Object.freeze({ cleanId, cleanNumber, cleanPercent, cleanDate, assessDateColumn, cleanFlag, cleanText, cleanEnum, cleanValue, cleanColumn });
})(globalThis.CGImport = globalThis.CGImport || {});
