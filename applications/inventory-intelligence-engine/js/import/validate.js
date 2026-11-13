/* Chain Genius – Supply Chain Intelligence Engine, Universal Data Import v1, Stage 1
 * import/validate.js — turns mapped source rows into standard (CDv1) tables, with an issue report, per-table completeness and
 * analysis permissions. Implements the owner's Stage 1 decisions of 13 Nov 2026 (A6 duplicates, A11 categories, partial-import
 * thresholds, currency confirmation). See IMPORT-V1-STAGE1-RECORD.md.
 *
 * Plain script, no build step, no asynchronous code, no network access, no browser storage. Adds CGImport.validate.
 * Needs canonical.js, read.js, clean.js and mapping.js. Pure: it never changes its inputs and returns a deep-frozen result.
 *
 * Two separate decisions are always reported:
 *   result.importAccepted     — may the import be accepted at all (no Must fix that blocks the dataset, a table or a file)
 *   result.permissions        — which analyses may use which items (an accepted import is not automatically safe for every analysis)
 * Every Must fix has a scope saying what it blocks: dataset | table | file | item | financial.
 *
 * Stage 1 correction pass (owner, 13 Nov 2026): D1 money-field currency classification (moneyCurrency/cleanMoney), Q2/Q13 linking of
 * rejected history rows to a single suggested item, Q3 Option A analysis blocking, Q4 duplicate caveats, Q5 sales-line duplicates,
 * Q6 future-dated history, Q14 stock-date check, and the reliabilityOf() helper for later stages.
 */
(function (NS) {
  'use strict';
  const C = NS.canonical, CL = NS.clean, M = NS.mapping;
  if (!C || !CL || !M) throw new Error('validate.js needs canonical.js, clean.js and mapping.js to be loaded first');
  const { CAT, issue } = M;

  // Processing order: master tables first, so references can be checked.
  const ORDER = ['dataset', 'items', 'suppliers', 'locations', 'supplier_items', 'stock', 'demand', 'sales_lines', 'po_headers', 'po_lines', 'bom', 'production_orders'];
  // History tables: the only tables where some rejected rows may be accepted (owner decision on partial imports).
  const HISTORY = Object.freeze({ demand: 'demand', sales_lines: 'demand', po_lines: 'purchasing', production_orders: 'production' });
  const ANALYSIS_TABLES = Object.freeze({ demand: ['demand', 'sales_lines'], purchasing: ['po_lines'], production: ['production_orders'], materials: ['bom'] });
  // A6 (owner decision): exact-duplicate rule per table. 'remove' = keep one copy and report each removed row;
  // 'remove-if-id' = remove only when the listed ID fields are mapped and filled, otherwise keep both and flag;
  // 'keep' = keep every copy and flag (identical sales/demand rows can be genuine). Conflicts (same key, different rows) always stop the table.
  const DUP_RULES = Object.freeze({
    dataset: { exact: 'remove' }, items: { exact: 'remove' }, suppliers: { exact: 'remove' }, locations: { exact: 'remove' },
    supplier_items: { exact: 'remove' }, bom: { exact: 'remove' }, stock: { exact: 'remove' },
    po_headers: { exact: 'remove-if-id', id: ['PO_ID'] }, po_lines: { exact: 'remove-if-id', id: ['PO_ID', 'Line_No'] },
    production_orders: { exact: 'remove-if-id', id: ['Production_Order_ID'] },
    // Q5 (owner, 13 Nov 2026): sales lines follow the PO-line rule — removed only when order number AND line number are present
    // and the whole source row is identical; otherwise kept and flagged (Q4 caveat). Monthly demand is always kept (Q4).
    demand: { exact: 'keep' }, sales_lines: { exact: 'remove-if-id', id: ['SO_ID', 'Line_No'] } });
  // Rows whose key would be incomplete without these fields are not compared by key (a PO number alone does not identify a line).
  const KEY_NEEDS = Object.freeze({ po_lines: ['Line_No'], sales_lines: ['Line_No'] });
  // Partial-import thresholds (owner decision). Crossed when the rejected share is 5% or more (same convention as date rule D6),
  // or when an item loses MORE than one month of demand (2 or more months). Either one blocks the affected item.
  const THRESHOLDS = Object.freeze({ tableShare: 0.05, itemMonthsAllowed: 1 });
  const ITEM_REFS = Object.freeze({ stock: ['Item_ID'], demand: ['Item_ID'], sales_lines: ['Item_ID'], supplier_items: ['Item_ID'], po_lines: ['Item_ID'],
    bom: ['Parent_Item_ID', 'Component_Item_ID'], production_orders: ['Item_ID'] });
  // Q6: the date that decides whether a history row is future-dated. Q4: the quantity used for the possible extra quantity.
  const FUTURE_FIELD = Object.freeze({ demand: 'Period_Start', sales_lines: 'Order_Date' });
  const CAVEAT_QTY = Object.freeze({ demand: 'Units', sales_lines: 'Ordered_Qty' });
  const CAVEAT_DUP = 'based_on_possibly_duplicated_rows';

  const up = v => String(v).trim().toUpperCase();
  const strip = v => up(v).replace(/[-\s]+/g, '');
  const unitNorm = v => String(v).trim().toLowerCase();
  const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
  const vb = (n, one, many) => n === 1 ? one : many;
  const freeze = o => { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); Object.values(o).forEach(freeze); } return o; };

  // ---------- D1 (owner, 13 Nov 2026): currency classification of MONEY fields only ----------
  // Currency codes: ISO 4217 List One active currencies minus precious metals (XAU XAG XPT XPD), fund codes (BOV CHE CHW CLF COU
  // MXV USN UYI UYW) and testing codes (XTS XXX), plus the approved withdrawn codes ANG BGN CUC HRK SLL ZWL. 169 codes.
  // Source and verification status: IMPORT-V1-STAGE1-RECORD.md Part F (built from a mirror of SIX List One dated 2026-09-17;
  // NOT yet verified against the official SIX file — mandatory before Stage 2).
  const ISO_CODES = new Set(('AED AFN ALL AMD ANG AOA ARS AUD AWG AZN BAM BBD BDT BGN BHD BIF BMD BND BOB BRL BSD BTN BWP BYN BZD CAD CDF CHF CLP ' +
    'CNY COP CRC CUC CUP CVE CZK DJF DKK DOP DZD EGP ERN ETB EUR FJD FKP GBP GEL GHS GIP GMD GNF GTQ GYD HKD HNL HRK HTG HUF IDR ILS INR IQD ' +
    'IRR ISK JMD JOD JPY KES KGS KHR KMF KPW KRW KWD KYD KZT LAK LBP LKR LRD LSL LYD MAD MDL MGA MKD MMK MNT MOP MRU MUR MVR MWK MXN MYR ' +
    'MZN NAD NGN NIO NOK NPR NZD OMR PAB PEN PGK PHP PKR PLN PYG QAR RON RSD RUB RWF SAR SBD SCR SDG SEK SGD SHP SLE SLL SOS SRD SSP STN ' +
    'SVC SYP SZL THB TJS TMT TND TOP TRY TTD TWD TZS UAH UGX USD UYU UZS VED VES VND VUV WST XAD XAF XBA XBB XBC XBD XCD XCG XDR XOF XPF ' +
    'XSU XUA YER ZAR ZMW ZWG ZWL').split(' '));
  // Codes count only in CAPITALS, except these three, which count in any case ("gbp", "Eur", "usd").
  const ANY_CASE = new Set(['GBP', 'EUR', 'USD']);
  // Foreign symbols, longest first so "US$" is found before "$". Every form of "$" is foreign. £ is GBP.
  const FOREIGN_SYMBOLS = ['US$', 'NZ$', 'HK$', 'A$', 'C$', 'S$', 'R$', '$', '€', '¥', '￥', '₹', '₩', '₽', '₺', '₪', '₫', '₱', '₦', '฿', '₴', '₸', '¢'];
  // Foreign currency words: exact spelling (an optional full stop is allowed), as separate words only. Single letters never count.
  const FOREIGN_WORDS = new Set(['kr', 'zł', 'Kč', 'Ft', 'Rs', 'Rp', 'RM', 'lei']);

  // moneyCurrency(raw) → { currency: 'GBP' | 'foreign' | 'none', indicators: [...], amount: text with GBP indicators removed }
  // The ONE function deciding the currency of a money value. Both the file-level currency check and row building use it
  // (through cleanMoney), so the two can never disagree. Contradictory indicators (GBP and foreign) are 'foreign'.
  function moneyCurrency(raw) {
    const s0 = raw === null || raw === undefined ? '' : String(raw).trim();
    const gbp = [], foreign = [];
    let s = s0;
    for (const sym of FOREIGN_SYMBOLS) if (s.includes(sym)) { foreign.push(sym); s = s.split(sym).join(' '); }
    if (s.includes('£')) gbp.push('£');
    // words = maximal runs of letters (any script); a full stop directly after a word is part of it ("kr.", "Rs.")
    const words = s.match(/[\p{L}]+\.?/gu) || [];
    for (const w0 of words) {
      const w = w0.replace(/\.$/, '');
      if (FOREIGN_WORDS.has(w)) { foreign.push(w); continue; }
      if (w.length !== 3) continue;
      const W = w.toUpperCase();
      if (!ISO_CODES.has(W)) continue;
      if (w !== W && !ANY_CASE.has(W)) continue; // e.g. "all", "cup", "try", "pen" are ordinary words
      (W === 'GBP' ? gbp : foreign).push(w);
    }
    if (foreign.length) return { currency: 'foreign', indicators: gbp.concat(foreign), amount: null };
    if (!gbp.length) return { currency: 'none', indicators: [], amount: s0 };
    const amount = s0.replace(/£/g, ' ').replace(/(^|[^\p{L}])gbp(?![\p{L}])/giu, '$1 ').replace(/\s+/g, ' ').trim();
    return { currency: 'GBP', indicators: gbp, amount };
  }

  // cleanMoney(field, raw) → the clean.js-style result plus .currency. The final decision for a money field is made HERE:
  // the unchanged cleaner only reads the number. A cleaner reason "currency other than £" is never trusted for money fields
  // (it comes from the cleaner's rule that any 3 letters before a number are a currency, e.g. "BOX 12").
  const TEXT_ATTACHED = 'number with text attached (e.g. "12 units"): not guessed';
  function cleanMoney(field, raw) {
    const mc = moneyCurrency(raw);
    if (mc.currency === 'foreign') return { status: 'invalid', value: null, rule: null, reason: 'currency other than £ (' + mc.indicators.join(', ') + '): withheld, never converted', currency: 'foreign', indicators: mc.indicators };
    let r;
    if (mc.currency === 'GBP') {
      if (mc.amount === '') return { status: 'invalid', value: null, rule: null, reason: 'currency indicator without an amount', currency: 'GBP', indicators: mc.indicators };
      // A GBP value the unchanged cleaner already reads (e.g. "£1,234.56") is handled exactly as before; only values it cannot
      // read ("GBP 46.10", "46.10 GBP", "46.10 £") have the GBP indicator removed and the remaining amount cleaned.
      r = Object.assign({}, CL.cleanValue(field, raw));
      if (r.status !== 'ok' && r.status !== 'cleaned' && r.status !== 'missing') {
        const r2 = CL.cleanValue(field, mc.amount);
        if (r2.status === 'ok' || r2.status === 'cleaned') r = Object.assign({}, r2, { status: 'cleaned', rule: ['GBP indicator removed'].concat(r2.rule ? [r2.rule] : []).join('; ') });
        else r = Object.assign({}, r2);
      }
    } else r = Object.assign({}, CL.cleanValue(field, raw));
    if (r.status === 'invalid' && /^currency other than/.test(r.reason || '')) r.reason = TEXT_ATTACHED;
    r.currency = mc.currency; r.indicators = mc.indicators;
    return r;
  }

  function run(mapping, loaded) {
    const issues = [], add = i => issues.push(i);
    loaded = loaded || {};
    for (const lf of Object.values(loaded)) (lf && lf.issues || []).forEach(add);
    M.checkMapping(mapping).forEach(add);
    if (issues.some(i => i.code === 'MAP_INVALID')) return finish({ issues, state: {}, dataset: {}, held: {}, permissions: null });

    const ap = M.applyMapping(mapping, loaded);
    ap.issues.forEach(add);
    const blockedTables = new Set(issues.filter(i => i.table && ['MULTI_SOURCE', 'CONSTANT_UNSUPPORTED', 'REQUIRED_UNMAPPED', 'COLUMN_MISSING', 'FILE_MISSING', 'SHEET_MISSING'].includes(i.code)).map(i => i.table));
    const state = {}, work = {};
    for (const t of ORDER) {
      if (!mapping.tables[t]) { state[t] = { table: t, status: 'not-supplied' }; continue; }
      const at = ap.tables[t];
      const file = mapping.tables[t].sources[0].file;
      if (!at || !at.rows || blockedTables.has(t) || (loaded[file] && !loaded[file].ok)) { state[t] = { table: t, file, status: 'not-built' }; continue; }
      work[t] = at;
    }

    // ---- currency: decided per file BEFORE any row is built, so unsafe money values are never placed in a standard table
    const currency = {}; // file -> { safe, withheld, reasons }
    const moneyFiles = new Map();
    for (const [t, at] of Object.entries(work)) for (const f of M.moneyFields(t)) if (at.mappedFields.includes(f)) { if (!moneyFiles.has(at.file)) moneyFiles.set(at.file, []); moneyFiles.get(at.file).push([t, f, at]); }
    for (const [file, list] of moneyFiles) {
      const decl = mapping.files[file] && mapping.files[file].currency;
      const fields = [...new Set(list.map(([t, f]) => t + '.' + f))];
      const reasons = [];
      if (!decl) { reasons.push('not declared'); add(issue('CURRENCY_UNCONFIRMED', CAT.MUST, 'financial', file + ' contains money values (' + fields.join(', ') + ') but its currency has not been declared. The importer cannot tell the currency of plain numbers: please confirm it.', { file, fields })); }
      else if (decl.confirmed !== true) { reasons.push('not confirmed'); add(issue('CURRENCY_UNCONFIRMED', CAT.MUST, 'financial', file + ': the currency ' + decl.code + ' is pre-selected but has not been confirmed. The importer cannot tell the currency of plain numbers: please confirm it.', { file, fields })); }
      if (decl && up(decl.code) !== 'GBP') { reasons.push('unsupported ' + decl.code); add(issue('CURRENCY_UNSUPPORTED', CAT.MUST, 'financial', file + ' is declared as ' + decl.code + '. Only GBP is supported; values are never converted.', { file, fields, currency: decl.code })); }
      const foreign = [];
      let other = 0;
      for (const [t, f, at] of list) at.rows.forEach(r => {
        const raw = r.raw[f]; if (raw === undefined || String(raw).trim() === '') return;
        const x = cleanMoney(C.field(t, f), raw); // the same function row building uses (no drift)
        if (x.currency === 'foreign') foreign.push({ row: r.src.row, field: f, value: String(raw).trim(), indicators: x.indicators }); else other++;
      });
      if (foreign.length) {
        reasons.push('foreign currency values');
        add(issue('CURRENCY_FOREIGN_VALUE', CAT.MUST, 'financial', file + ': ' + plural(foreign.length, 'money value') + ' ' + vb(foreign.length, 'carries', 'carry') + ' a currency other than £' + (other ? ' alongside ' + other + ' £/plain values (mixed currencies)' : '') + '. Conversion is not supported.', { file, rows: foreign, mixed: other > 0 }));
      }
      currency[file] = { safe: reasons.length === 0, reasons, fields };
      if (reasons.length === 0) add(issue('CURRENCY_CONFIRMED', CAT.INFO, 'none', file + ': money values are treated as GBP because GBP was confirmed for this file. The importer cannot detect the currency of plain numbers itself.', { file }));
    }

    // ---- Q6: establish the snapshot date FIRST (from the mapping's dataset section or a mapped dataset file; never the clock)
    if (!mapping.tables.dataset) state.dataset = buildDatasetRow(mapping, add);
    else if (work.dataset) state.dataset = buildTable('dataset', work.dataset, mapping, currency, add, null);
    const dsr = state.dataset && state.dataset.status === 'complete' && state.dataset.rows && state.dataset.rows.length === 1 ? state.dataset.rows[0] : null;
    const snapshot = dsr && typeof dsr.Snapshot_Date === 'string' && C.validISO(dsr.Snapshot_Date) ? dsr.Snapshot_Date : null;
    if (!snapshot && (work.demand || work.sales_lines)) add(issue('FUTURE_CHECK_NOT_RUN', CAT.CHECK, 'none', 'The snapshot date is not established, so demand and sales rows could not be checked for dates after it.', {}));

    // ---- build each table: exact duplicates, cleaning, row decisions
    for (const t of ORDER) if (work[t] && t !== 'dataset') state[t] = buildTable(t, work[t], mapping, currency, add, snapshot);

    // ---- references
    // References are checked only against an item list that exists and has rows; otherwise the items problem itself is reported
    // (Must fix) and every other row is not also rejected as "unmatched".
    const items = state.items && state.items.rows && state.items.rows.length ? state.items : null;
    const itemIndex = new Map(), stripIndex = new Map(), itemUnit = new Map(), itemRow = new Map();
    if (items) for (const r of items.rows) {
      const k = up(r.Item_ID); if (!itemIndex.has(k)) itemIndex.set(k, r.Item_ID);
      const s = strip(r.Item_ID); stripIndex.set(s, (stripIndex.get(s) || new Set()).add(r.Item_ID));
      itemUnit.set(r.Item_ID, r.Unit_of_Measure); itemRow.set(r.Item_ID, r);
    }
    const resolveItem = raw => raw === null || raw === undefined ? null : itemIndex.get(up(raw)) || null;
    for (const t of ORDER) {
      const st = state[t]; if (!st || !st.rows) continue;
      if (items && ITEM_REFS[t]) {
        let caseFixed = 0;
        st.rows = st.rows.filter(r => {
          const bad = [];
          for (const f of ITEM_REFS[t]) {
            const v = r[f]; if (v === null) continue;
            const hit = resolveItem(v);
            if (hit) { if (hit !== v) { r[f] = hit; caseFixed++; } continue; }
            const cands = stripIndex.get(strip(v));
            const suggest = cands && cands.size === 1 ? [...cands][0] : null;
            bad.push({ field: f, value: v, suggest });
          }
          if (!bad.length) return true;
          st.rejectedRows.push({ row: r.__source.row, rawItem: (bad.find(b => b.field === 'Item_ID') || bad[0]).value, item: null, period: periodOf(t, r), reasons: bad.map(b => b.field + ' "' + b.value + '" is not in the item list' + (b.suggest ? ' (did you mean ' + b.suggest + '? not applied)' : '')), unmatched: bad });
          return false;
        });
        if (caseFixed) add(issue('REF_CASE_MATCHED', CAT.INFO, 'none', t + ': ' + plural(caseFixed, 'item code') + ' ' + vb(caseFixed, 'matches', 'match') + ' the item list after ignoring case and spaces (e.g. " p0012 " → P0012).', { table: t, count: caseFixed }));
      }
    }
    // Default supplier on items: reported, kept.
    const suppliers = state.suppliers && state.suppliers.rows ? state.suppliers : null;
    const supIndex = new Map(); if (suppliers) suppliers.rows.forEach(r => { if (!supIndex.has(up(r.Supplier_ID))) supIndex.set(up(r.Supplier_ID), r.Supplier_ID); });
    if (items && suppliers) {
      const unk = items.rows.filter(r => r.Default_Supplier_ID !== null && !supIndex.has(up(r.Default_Supplier_ID)));
      if (unk.length) add(issue('REF_DEFAULT_SUPPLIER_UNKNOWN', CAT.CHECK, 'none', plural(unk.length, 'item') + ' ' + vb(unk.length, 'names', 'name') + ' a default supplier that is not in the supplier list (kept as written).', { table: 'items', items: unk.map(r => r.Item_ID + ' → ' + r.Default_Supplier_ID) }));
    }
    // supplier-items: a master table, so an unknown supplier rejects the row.
    if (suppliers && state.supplier_items && state.supplier_items.rows) {
      const st = state.supplier_items;
      st.rows = st.rows.filter(r => { const hit = supIndex.get(up(r.Supplier_ID)); if (hit) { r.Supplier_ID = hit; return true; }
        st.rejectedRows.push({ row: r.__source.row, item: r.Item_ID, reasons: ['Supplier_ID "' + r.Supplier_ID + '" is not in the supplier list'] }); return false; });
    }
    // PO lines/headers with an unlisted supplier: lines kept, a placeholder supplier is added (documented action, issue I18 / E07).
    if (suppliers) {
      const ph = new Map();
      for (const t of ['po_headers', 'po_lines']) { const st = state[t]; if (!st || !st.rows) continue;
        st.rows.forEach(r => { const hit = supIndex.get(up(r.Supplier_ID)); if (hit) { r.Supplier_ID = hit; return; }
          const k = up(r.Supplier_ID); if (!ph.has(k)) ph.set(k, { code: r.Supplier_ID, lines: 0 }); ph.get(k).lines++; r.Supplier_ID = ph.get(k).code; }); }
      for (const p of ph.values()) {
        const row = Object.fromEntries(C.TABLES.suppliers.fields.map(f => [f.name, null]));
        row.Supplier_ID = p.code; row.Supplier_Name = 'Unlisted supplier ' + p.code; row.__placeholder = true; row.__source = null;
        suppliers.rows.push(row); suppliers.placeholders.push(p.code);
      }
      if (ph.size) add(issue('SUPPLIER_PLACEHOLDER', CAT.CHECK, 'none', plural(ph.size, 'supplier') + ' ' + vb(ph.size, 'is', 'are') + ' used on purchase orders but missing from the supplier list: ' + [...ph.values()].map(p => p.code + ' (' + plural(p.lines, 'line') + ')').join(', ') + '. Lines kept; a placeholder "Unlisted supplier" was added. No name, lead time or rating is invented.', { table: 'suppliers', codes: [...ph.values()].map(p => p.code) }));
    }
    // Locations: checked only when a locations table was supplied; a blank location is flagged, never filled in.
    const locations = state.locations && state.locations.rows ? state.locations : null;
    const locIndex = new Set(locations ? locations.rows.map(r => up(r.Location_ID)) : []);
    for (const t of ['stock', 'demand', 'po_lines']) {
      const st = state[t]; if (!st || !st.rows || !st.mapped.includes('Location_ID')) continue;
      if (t === 'stock') { const blank = st.rows.filter(r => r.Location_ID === null);
        if (blank.length) add(issue('LOCATION_MISSING', CAT.CHECK, 'none', 'stock: ' + plural(blank.length, 'row') + ' ' + vb(blank.length, 'has', 'have') + ' no location. Kept and flagged; no location is assigned automatically.', { table: t, rows: blank.map(r => r.__source.row) })); }
      if (locations) { const unk = st.rows.filter(r => r.Location_ID !== null && !locIndex.has(up(r.Location_ID)));
        if (unk.length) add(issue('LOCATION_UNKNOWN', CAT.CHECK, 'none', t + ': ' + plural(unk.length, 'row') + ' ' + vb(unk.length, 'uses', 'use') + ' a location not in the locations list (kept).', { table: t, rows: unk.map(r => r.__source.row) })); }
    }

    // ---- key conflicts (A6): same key, rows not identical → the table stops; no row is chosen
    for (const t of ORDER) {
      const st = state[t]; if (!st || !st.rows) continue;
      const key = C.TABLES[t].key, needs = KEY_NEEDS[t] || [];
      if (t === 'dataset') { if (st.rows.length > 1) { st.status = 'stopped'; add(issue('DATASET_ROWS', CAT.MUST, 'table', 'The dataset file must have exactly one row; it has ' + st.rows.length + '.', { table: t })); } continue; }
      if (!key.length) continue;
      const groups = new Map();
      st.rows.forEach(r => { if (needs.some(f => r[f] === null)) return; const k = key.map(f => r[f] === null ? '' : up(r[f])).join('\u0001'); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); });
      const conflicts = [];
      for (const g of groups.values()) if (g.length > 1 && new Set(g.map(r => r.__cells)).size > 1) conflicts.push(g);
      if (conflicts.length) {
        st.status = 'stopped';
        const bad = new Set(conflicts.flat());
        st.conflicts = conflicts.map(g => ({ key: key.map(f => g[0][f]).join(' / '), rows: g.map(r => r.__source.row) }));
        st.held = st.rows.filter(r => !bad.has(r));
        add(issue('DUP_CONFLICT', CAT.MUST, 'table', t + ': ' + plural(conflicts.length, 'record') + ' ' + vb(conflicts.length, 'appears', 'appear') + ' more than once with different values (' + st.conflicts.map(c => c.key + ' rows ' + c.rows.join(' & ')).join('; ') + '). The ' + t + ' import is stopped until you say which row is right. No row is chosen automatically.', { table: t, conflicts: st.conflicts }));
      }
    }

    // ---- rejected rows: report, attribute to items, apply the partial-import rules
    const permItems = {};
    const itemEntry = id => (permItems[id] = permItems[id] || { blocked: {}, incomplete: {}, caveats: {} });
    const analysisBlocked = {}; // Q3: analysis -> reason
    const uniqueSuggestion = raw => { const c = stripIndex.get(strip(raw)); return c && c.size === 1 ? [...c][0] : null; };
    let datasetBlocked = [];
    for (const t of ORDER) {
      const st = state[t]; if (!st || !st.rejectedRows || !st.rejectedRows.length) continue;
      const hist = HISTORY[t];
      // Q2/Q13 (owner, 13 Nov 2026): a rejected HISTORY row whose code is not in the item list but has exactly one candidate after
      // ignoring dashes and spaces is linked to that item for permissions only. The row stays rejected; its code is not rewritten.
      st.rejectedRows.forEach(x => {
        if (x.item) return;
        const raw = x.rawItem !== undefined && x.rawItem !== null && x.rawItem !== '' ? x.rawItem : null;
        x.item = resolveItem(raw);
        if (!x.item && hist && raw && items) { const sgt = uniqueSuggestion(raw); if (sgt) { x.item = sgt; x.linkedBy = 'suggested'; x.originalCode = raw; } }
      });
      const list = st.rejectedRows.map(x => {
        const o = { row: x.row, item: x.linkedBy ? x.originalCode : (x.item || x.rawItem || (x.unmatched ? x.unmatched[0].value : null)), reasons: x.reasons,
          suggest: x.unmatched ? (x.unmatched.find(u => u.suggest) || {}).suggest || null : null };
        if (x.linkedBy) { o.linkedItem = x.item; o.linkReason = 'only one item matches "' + x.originalCode + '" after ignoring dashes and spaces; counted against ' + x.item + ' for permissions only (row not imported)'; }
        return o;
      });
      if (!hist) {
        add(issue('ROW_REJECTED', CAT.MUST, 'dataset', t + ': ' + plural(list.length, 'row') + ' could not be imported. ' + t + ' must be complete, so analysis is blocked until the file is corrected.', { table: t, rows: list }));
        datasetBlocked.push(t + ' has rejected rows');
        continue;
      }
      add(issue('ROW_REJECTED', CAT.CHECK, 'none', t + ': ' + plural(list.length, 'row') + ' could not be imported (listed with reasons).', { table: t, rows: list }));
      const links = new Map();
      list.filter(o => o.linkedItem).forEach(o => { const k = o.item + ' → ' + o.linkedItem; links.set(k, (links.get(k) || 0) + 1); });
      if (links.size) add(issue('HISTORY_SUGGESTED_LINK', CAT.CHECK, 'item', t + ': rejected rows with an unknown code were counted against the only matching item, for permissions only (the rows are still not imported): ' +
        [...links].map(([k, n]) => k + ' (' + plural(n, 'row') + ')').join(', ') + '.', { table: t, links: [...links].map(([k, n]) => ({ link: k, rows: n })) }));
      // Q6: rows excluded as future-dated are not history, so they are left out of the share (numerator and denominator).
      const historyRows = st.sourceRows - (st.futureRows ? st.futureRows.length : 0);
      const share = historyRows > 0 ? list.length / historyRows : 0;
      const tableCrossed = share >= THRESHOLDS.tableShare;
      const byItem = new Map(); let unattributed = 0;
      st.rejectedRows.forEach(x => { if (!x.item) { unattributed++; return; } if (!byItem.has(x.item)) byItem.set(x.item, { rows: 0, months: new Set(), unknownMonths: 0 }); const e = byItem.get(x.item); e.rows++;
        if (x.period) e.months.add(x.period.slice(0, 7)); else e.unknownMonths++; });
      const blocked = [], incomplete = [];
      for (const [id, e] of byItem) {
        const months = e.months.size + e.unknownMonths;
        const itemCrossed = hist === 'demand' && months > THRESHOLDS.itemMonthsAllowed;
        const why = [];
        if (tableCrossed) why.push(Math.round(share * 1000) / 10 + '% of ' + t + ' rows rejected (threshold 5%)');
        if (itemCrossed) why.push(months + ' months of demand lost (threshold: more than 1)');
        if (why.length) { itemEntry(id).blocked[hist] = t + ': ' + why.join('; '); blocked.push(id); }
        else { itemEntry(id).incomplete[hist] = t + ': based on incomplete history (' + plural(e.rows, 'row') + ' rejected)'; incomplete.push(id); }
      }
      st.share = share; st.tableThresholdCrossed = tableCrossed; st.historyRows = historyRows; st.unattributed = unattributed;
      if (blocked.length) add(issue('HISTORY_THRESHOLD', CAT.CHECK, 'item', plural(blocked.length, 'item') + ' excluded from the ' + hist + ' analysis because too much of their ' + t + ' history was rejected: ' + blocked.join(', ') + '.', { table: t, analysis: hist, items: blocked, share }));
      if (incomplete.length) add(issue('HISTORY_INCOMPLETE', CAT.CHECK, 'item', plural(incomplete.length, 'item') + ' ' + vb(incomplete.length, 'has', 'have') + ' ' + hist + ' results based on incomplete history (below the thresholds): ' + incomplete.join(', ') + '.', { table: t, analysis: hist, items: incomplete, share }));
      if (unattributed) add(issue('HISTORY_UNATTRIBUTED', CAT.CHECK, 'none', t + ': ' + plural(unattributed, 'rejected row') + ' could not be linked to a known item, so no item can be marked; they count towards the ' + Math.round(share * 1000) / 10 + '% rejected share.', { table: t, count: unattributed }));
      // Q3 Option A (owner, 13 Nov 2026): threshold reached AND at least one rejected row not linked to any item → the whole
      // related analysis is blocked (it cannot be known which items are reliable). Import acceptance is not affected.
      if (tableCrossed && unattributed) {
        analysisBlocked[hist] = t + ': ' + Math.round(share * 1000) / 10 + '% of rows rejected (threshold 5%) and ' + plural(unattributed, 'rejected row') + ' could not be linked to any item';
        add(issue('HISTORY_ANALYSIS_BLOCKED', CAT.CHECK, 'analysis', 'The ' + hist + ' analysis is blocked: ' + analysisBlocked[hist] + ', so it cannot be known which items have reliable history. The import itself can still be accepted; correct the codes in the file to restore the analysis.', { table: t, analysis: hist, share, unattributed }));
      }
    }

    // ---- Q4 (owner, 13 Nov 2026): identical demand/sales rows kept under the duplicate rules → the item stays in the analysis,
    // marked "based_on_possibly_duplicated_rows", with the rows and the possible extra quantity (only when it is reliably known).
    for (const t of ['demand', 'sales_lines']) {
      const st = state[t]; if (!st || !st.rows || !st.keptDuplicates.length) continue;
      const qf = CAVEAT_QTY[t], bySrc = new Map(st.rows.map(r => [r.__source.row, r]));
      const perItem = new Map(), noted = [];
      for (const g of st.keptDuplicates) {
        const acc = g.map(n => bySrc.get(n)).filter(Boolean);
        if (acc.length < 2) { noted.push('rows ' + g.join(' & ') + ' (not all copies are in the history: some were rejected or are future-dated)'); continue; }
        const id = acc[0].Item_ID, q = acc[0][qf];
        const extra = typeof q === 'number' && isFinite(q) && acc.every(r => r[qf] === q) ? (acc.length - 1) * q : null;
        const d = { table: t, rows: acc.map(r => r.__source.row), copies: acc.length, period: periodOf(t, acc[0]), quantity: typeof q === 'number' ? q : null, possibleExtra: extra };
        if (!perItem.has(id)) perItem.set(id, []);
        perItem.get(id).push(d);
        const e = itemEntry(id); e.caveats.demand = CAVEAT_DUP; (e.caveatDetails = e.caveatDetails || { demand: [] }).demand.push(d);
      }
      const what = t === 'demand' ? 'demand' : 'sales';
      const lines = [...perItem].map(([id, ds]) => {
        const tot = ds.every(d => d.possibleExtra !== null) ? ds.reduce((a, d) => a + d.possibleExtra, 0) : null;
        return 'Item ' + id + ' — ' + ds.map(d => d.copies + ' identical ' + what + ' rows for ' + (d.period || 'an unknown date') + ' (rows ' + d.rows.join(' & ') + ')' +
          (d.quantity !== null ? ', ' + d.quantity + ' units each' : '')).join('; ') + '. ' + (tot !== null ? 'Possible extra quantity: ' + tot + ' units.' : 'The quantity could not be established, so no extra quantity is estimated.');
      });
      add(issue('DUP_EXACT_KEPT', CAT.CHECK, 'item', t + ': possible duplicate rows were kept, because identical ' + what + ' rows can be genuine repeat transactions' +
        (DUP_RULES[t].exact === 'remove-if-id' ? ' and there is no order number and line number to prove they are copies' : '') + '. Analysis is still available for ' +
        (perItem.size ? 'these items, but their results may be overstated if the rows are copies: ' + lines.join(' ') : 'the affected items.') +
        (noted.length ? ' Also identical: ' + noted.join('; ') + '.' : '') + ' Please investigate the affected records and confirm whether they are genuine transactions or copies.',
        { table: t, groups: st.keptDuplicates, items: [...perItem.keys()], caveat: CAVEAT_DUP, details: [...perItem].map(([item, ds]) => ({ item, sets: ds })) }));
    }

    // ---- Q14 (owner, 13 Nov 2026): stock rows dated differently from the snapshot are reported and kept (date not changed)
    if (snapshot && state.stock && state.stock.rows) {
      const diff = state.stock.rows.filter(r => r.Snapshot_Date !== null && r.Snapshot_Date !== snapshot);
      if (diff.length) add(issue('STOCK_DATE_DIFFERS', CAT.CHECK, 'none', 'stock: ' + plural(diff.length, 'row') + ' ' + vb(diff.length, 'has', 'have') + ' a stock date different from the snapshot date (' + snapshot + '): ' +
        diff.slice(0, 5).map(r => 'row ' + r.__source.row + ' (' + r.Item_ID + ', ' + r.Snapshot_Date + ')').join(', ') + (diff.length > 5 ? ', …' : '') + '. The rows are kept with their own dates; please check that the stock figures are from the same day.', { table: 'stock', rows: diff.map(r => ({ row: r.__source.row, item: r.Item_ID, date: r.Snapshot_Date })), snapshot }));
    }

    // ---- units (check-only column compared with the item's unit; never converted)
    const unitBad = new Map(), unitUnknown = new Map();
    for (const t of ['stock', 'demand', 'sales_lines', 'po_lines']) {
      const st = state[t]; if (!st || !st.rows) continue;
      if (!st.mapped.includes('@Unit')) { add(issue('UNIT_NOT_CHECKED', CAT.INFO, 'none', t + ': no unit column was mapped, so quantities are assumed to be in each item\'s own unit. This cannot be verified.', { table: t })); continue; }
      st.rows.forEach(r => { if (r.__unit === null) return; const iu = itemUnit.get(r.Item_ID);
        if (iu === null || iu === undefined) { if (!unitUnknown.has(r.Item_ID)) unitUnknown.set(r.Item_ID, []); unitUnknown.get(r.Item_ID).push(t + ' row ' + r.__source.row); return; }
        if (unitNorm(iu) !== unitNorm(r.__unit)) { if (!unitBad.has(r.Item_ID)) unitBad.set(r.Item_ID, []); unitBad.get(r.Item_ID).push(t + ' row ' + r.__source.row + ': "' + r.__unit + '" vs item unit "' + iu + '"'); } });
    }
    for (const [id, where] of unitBad) {
      itemEntry(id).blocked.all = 'unit mismatch';
      add(issue('UNIT_MISMATCH', CAT.MUST, 'item', id + ': quantities in a different unit from the item (' + where.slice(0, 3).join('; ') + (where.length > 3 ? '; …' : '') + '). Units are never converted, so ' + id + ' is excluded from every analysis.', { item: id, rows: where }));
    }
    if (unitUnknown.size) add(issue('UNIT_UNVERIFIABLE', CAT.CHECK, 'none', plural(unitUnknown.size, 'item') + ' ' + vb(unitUnknown.size, 'has', 'have') + ' a unit in a transaction file but no unit in the item list, so the unit cannot be checked: ' + [...unitUnknown.keys()].join(', ') + '.', { items: [...unitUnknown.keys()] }));

    // ---- other reported conditions
    if (items) {
      const inactive = items.rows.filter(r => r.Active === 'N').map(r => r.Item_ID);
      if (inactive.length) add(issue('ITEMS_INACTIVE', CAT.INFO, 'none', plural(inactive.length, 'item') + ' marked inactive (kept): ' + inactive.join(', ') + '.', { items: inactive }));
      if (items.mapped.includes('Standard_Cost') && currency[items.file] && currency[items.file].safe) {
        const noCost = items.rows.filter(r => r.Standard_Cost === null).map(r => r.Item_ID);
        if (noCost.length) add(issue('COST_MISSING', CAT.CHECK, 'none', plural(noCost.length, 'item') + ' ' + vb(noCost.length, 'has', 'have') + ' no standard cost and will be left out of £ totals: ' + noCost.join(', ') + '.', { items: noCost }));
      }
    }
    const dateOrder = (t, a, b, label) => { const st = state[t]; if (!st || !st.rows) return; const bad = st.rows.filter(r => r[a] && r[b] && r[b] < r[a]);
      if (bad.length) add(issue('DATE_ORDER', CAT.CHECK, 'none', t + ': ' + plural(bad.length, 'row') + ' ' + vb(bad.length, 'has', 'have') + ' ' + label + ' (kept).', { table: t, rows: bad.map(r => r.__source.row) })); };
    dateOrder('production_orders', 'Planned_Start_Date', 'Planned_Finish_Date', 'a planned finish before the planned start');
    dateOrder('production_orders', 'Actual_Start_Date', 'Actual_Finish_Date', 'an actual finish before the actual start');
    dateOrder('po_lines', 'Order_Date', 'Last_Receipt_Date', 'a receipt before the order date');


    // ---- availability of analyses and item-level permissions
    const analyses = {};
    for (const [a, ts] of Object.entries(ANALYSIS_TABLES)) {
      const sts = ts.map(t => state[t]).filter(s => s && s.status !== 'not-supplied');
      analyses[a] = !sts.length ? 'unavailable' : sts.some(s => s.status === 'stopped' || s.status === 'not-built') ? 'stopped' : sts.some(s => s.rows && s.rows.length) ? 'available' : 'unavailable';
      if (analysisBlocked[a] && analyses[a] !== 'stopped') analyses[a] = 'blocked';
      if (!sts.length) add(issue('TABLE_NOT_SUPPLIED', CAT.CHECK, 'none', 'No ' + ts.join(' or ') + ' data was supplied, so the ' + a + ' analysis is not available.', { analysis: a }));
    }
    if (analyses.demand === 'available' && items) {
      const has = new Set(); ['demand', 'sales_lines'].forEach(t => { if (state[t] && state[t].rows) state[t].rows.forEach(r => has.add(r.Item_ID)); });
      const none = items.rows.filter(r => r.Is_Sold === 'Y' && !has.has(r.Item_ID)).map(r => r.Item_ID);
      none.forEach(id => { itemEntry(id).noDemandHistory = true; });
      if (none.length) add(issue('NO_DEMAND_HISTORY', CAT.CHECK, 'none', plural(none.length, 'sold item') + ' ' + vb(none.length, 'has', 'have') + ' no demand history, so no forecast or cover can be given for them: ' + none.join(', ') + '.', { items: none }));
    }
    for (const t of ['items', 'stock', 'dataset']) { const s = state[t]; if (!s || s.status !== 'complete') datasetBlocked.push(t + ' is ' + (s ? s.status : 'missing')); }
    if (!mapping.tables.items || !mapping.tables.stock) ['items', 'stock'].filter(t => !mapping.tables[t]).forEach(t => add(issue('TABLE_MISSING_REQUIRED', CAT.MUST, 'dataset', 'The ' + t + ' table is required and has not been mapped.', { table: t })));
    issues.filter(i => i.category === CAT.MUST && (i.scope === 'dataset' || i.scope === 'file')).forEach(i => datasetBlocked.push(i.code));
    const unsafe = Object.entries(currency).filter(([, c]) => !c.safe);
    const permissions = {
      dataset: { status: datasetBlocked.length ? 'blocked' : 'allowed', reasons: [...new Set(datasetBlocked)] },
      financial: { status: unsafe.length ? 'withheld' : 'allowed', reasons: unsafe.map(([f, c]) => f + ': ' + c.reasons.join(', ')),
        withheldFields: unsafe.flatMap(([, c]) => c.fields) },
      analyses,
      analysisReasons: analysisBlocked,
      items: permItems
    };
    return finish({ issues, state, permissions });
  }

  function periodOf(t, r) { const v = t === 'sales_lines' ? r.Order_Date : r.Period_Start; return v || null; }

  // Builds one standard table from its mapped source rows.
  // snapshot: the dataset snapshot date (YYYY-MM-DD) or null when it is not established (then the future-date check is not run).
  function buildTable(t, at, mapping, currency, add, snapshot) {
    const def = C.TABLES[t], rule = DUP_RULES[t], fileSet = mapping.files[at.file];
    const st = { table: t, file: at.file, sheet: at.sheet, status: 'complete', sourceRows: at.rows.length, mapped: at.mappedFields.slice(), rows: [], rejectedRows: [],
      removedDuplicates: [], keptDuplicates: [], placeholders: [], futureRows: [] };
    if (!at.rows.length) {
      st.status = t === 'items' || t === 'stock' ? 'not-built' : 'complete';
      add(issue('TABLE_EMPTY', t === 'items' || t === 'stock' ? CAT.MUST : CAT.CHECK, t === 'items' || t === 'stock' ? 'dataset' : 'none', t + ': the source has headings but no data rows.', { table: t }));
      return st;
    }
    // exact duplicates: every source cell equal after trimming spaces (mapped and unmapped columns)
    const cellKey = r => r.cells.map(c => String(c).trim()).join('\u0001');
    const groups = new Map();
    at.rows.forEach((r, i) => { const k = cellKey(r); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(i); });
    const removed = new Set();
    for (const idx of groups.values()) {
      if (idx.length < 2) continue;
      let mode = rule.exact;
      if (mode === 'remove-if-id') mode = rule.id.every(f => at.mappedFields.includes(f) && String(at.rows[idx[0]].raw[f]).trim() !== '') ? 'remove' : 'keep';
      if (mode === 'remove') idx.slice(1).forEach(i => { removed.add(i); st.removedDuplicates.push({ row: at.rows[i].src.row, sameAs: at.rows[idx[0]].src.row }); });
      else st.keptDuplicates.push(idx.map(i => at.rows[i].src.row));
    }
    if (st.removedDuplicates.length) add(issue('DUP_EXACT_REMOVED', CAT.INFO, 'none', t + ': ' + plural(st.removedDuplicates.length, 'exact duplicate row') + ' removed (one copy kept): ' + st.removedDuplicates.map(d => 'row ' + d.row + ' = row ' + d.sameAs).join(', ') + '.', { table: t, rows: st.removedDuplicates }));
    // Demand and sales lines: reported after references are resolved, with the Q4 caveat and the possible extra quantity.
    if (st.keptDuplicates.length && !CAVEAT_QTY[t]) add(issue('DUP_EXACT_KEPT', CAT.CHECK, 'none', t + ': ' + plural(st.keptDuplicates.length, 'set') + ' of identical rows kept, because they can be genuine separate records' + (rule.exact === 'remove-if-id' ? ' (no ID column to prove they are copies)' : '') + ': ' + st.keptDuplicates.map(g => 'rows ' + g.join(' & ')).join(', ') + '. Please check whether they are real.', { table: t, groups: st.keptDuplicates }));

    const live = at.rows.map((_, i) => i).filter(i => !removed.has(i));
    const fields = def.fields.filter(f => at.mappedFields.includes(f.name));
    const money = M.moneyFields(t), withheld = !!(currency[at.file] && !currency[at.file].safe);
    const res = {};
    for (const f of fields) {
      const arr = new Array(at.rows.length);
      for (const i of live) {
        const r = at.rows[i];
        arr[i] = r.codeMiss[f.name] !== undefined ? { status: 'invalid', value: null, rule: null, reason: '"' + r.codeMiss[f.name] + '" is not in the mapping\'s list of values for ' + f.name }
          : money.includes(f.name) ? cleanMoney(f, r.raw[f.name]) // D1: money fields decided by moneyCurrency()
          : CL.cleanValue(f, r.raw[f.name], { dateFormat: fileSet.dateFormat, meta: r.meta[f.name] });
      }
      if (f.type === 'date') {
        const a = CL.assessDateColumn(live.map(i => arr[i]));
        if (a.decision === 'stop') { st.status = 'stopped'; add(issue('DATE_FORMAT_STOP', CAT.MUST, 'table', t + '.' + f.name + ': ' + Math.round(a.conflictShare * 1000) / 10 + '% of dates are only valid in the other day/month order. Check the date format chosen for ' + at.file + ' (' + fileSet.dateFormat + ').', { table: t, field: f.name })); }
        if (a.ambiguous) add(issue('DATE_AMBIGUOUS', CAT.CHECK, 'none', t + '.' + f.name + ': ' + plural(a.ambiguous, 'date') + ' could be read either way round; read as ' + fileSet.dateFormat + ' (' + (fileSet.dateFormat === 'US' ? 'month/day/year' : 'day/month/year') + '). Please confirm the format.', { table: t, field: f.name, count: a.ambiguous }));
      }
      res[f.name] = arr;
    }
    // Q6 (owner, 13 Nov 2026): demand/sales rows dated after the snapshot date are excluded from history BEFORE any
    // required-field rejection (future forecast rows may have blank Units); they are listed, never counted as rejected.
    const futureField = snapshot ? FUTURE_FIELD[t] : null;
    const blanked = {}, rules = {}, negRows = [], zeroRows = [];
    for (const i of live) {
      if (futureField && res[futureField]) {
        const d = res[futureField][i];
        if (d && typeof d.value === 'string' && d.value > snapshot) {
          const ri = at.rows[i].raw.Item_ID;
          st.futureRows.push({ row: at.rows[i].src.row, item: ri === undefined ? null : String(ri).trim(), date: d.value });
          continue;
        }
      }
      const r = at.rows[i], row = Object.fromEntries(def.fields.map(f => [f.name, null])), reasons = [];
      for (const f of fields) {
        const x = res[f.name][i];
        if (money.includes(f.name) && withheld) continue; // withheld: unsafe currency (reported per file)
        if (x.status === 'invalid' || x.status === 'conflict') {
          if (money.includes(f.name) && x.currency === 'foreign') continue; // reported under CURRENCY_FOREIGN_VALUE (same function)
          if (f.onInvalid === 'reject-row') reasons.push(f.name + ': ' + x.reason);
          else (blanked[f.name] = blanked[f.name] || []).push({ row: r.src.row, value: String(r.raw[f.name]).trim(), reason: x.reason });
          continue;
        }
        row[f.name] = x.value;
        if (x.rule) rules[x.rule] = (rules[x.rule] || 0) + 1;
        if (x.flag) negRows.push({ row: r.src.row, field: f.name, value: x.value });
        if (x.warning) zeroRows.push(r.src.row);
      }
      def.fields.forEach(f => { if (f.req && row[f.name] === null && !reasons.some(s => s.startsWith(f.name + ':'))) reasons.push(f.name + ': required value missing'); });
      if (at.mappedFields.includes('@Unit')) row.__unit = String(r.raw['@Unit'] === undefined ? '' : r.raw['@Unit']).trim() || null;
      row.__source = { file: r.src.file, sheet: r.src.sheet, row: r.src.row };
      Object.defineProperty(row, '__cells', { value: r.cells.map(c => String(c).trim()).join('\u0001'), enumerable: false });
      if (reasons.length) {
        const rawItem = r.raw.Item_ID !== undefined ? String(r.raw.Item_ID).trim() : (r.raw.Parent_Item_ID !== undefined ? String(r.raw.Parent_Item_ID).trim() : null);
        st.rejectedRows.push({ row: r.src.row, rawItem: rawItem || null, item: null, period: periodOf(t, row), reasons });
      } else st.rows.push(row);
    }
    for (const [f, list] of Object.entries(blanked)) add(issue('FIELD_BLANKED', CAT.CHECK, 'none', t + '.' + f + ': ' + plural(list.length, 'value') + ' could not be read and ' + vb(list.length, 'was', 'were') + ' left blank (rows kept): ' + list.slice(0, 5).map(b => 'row ' + b.row + ' "' + b.value + '"').join(', ') + (list.length > 5 ? ', …' : '') + '.', { table: t, field: f, rows: list }));
    if (negRows.length) add(issue('NEGATIVE_KEPT', CAT.CHECK, 'none', t + ': ' + plural(negRows.length, 'negative value') + ' kept as entered and flagged: ' + negRows.map(n => 'row ' + n.row + ' ' + n.field + ' ' + n.value).join(', ') + '.', { table: t, rows: negRows }));
    if (zeroRows.length) add(issue('LEADING_ZEROS', CAT.CHECK, 'none', t + ': ' + plural(zeroRows.length, 'code') + ' ' + vb(zeroRows.length, 'was', 'were') + ' stored as numbers in the spreadsheet, so leading zeros may already have been lost.', { table: t, rows: zeroRows }));
    if (st.futureRows.length) add(issue('FUTURE_DATED', CAT.CHECK, 'none', t + ': ' + plural(st.futureRows.length, 'row') + ' dated after the snapshot date (' + snapshot + ') ' + vb(st.futureRows.length, 'was', 'were') + ' left out of the history: ' + st.futureRows.slice(0, 5).map(f => 'row ' + f.row + ' (' + (f.item || '?') + ', ' + f.date + ')').join(', ') + (st.futureRows.length > 5 ? ', …' : '') + '. They are not counted as rejected rows.', { table: t, rows: st.futureRows, snapshot }));
    if (Object.keys(rules).length) add(issue('CLEANED', CAT.INFO, 'none', t + ': formatting tidied without changing meaning: ' + Object.entries(rules).sort().map(([k, n]) => k + ' (' + n + ')').join(', ') + '.', { table: t, rules }));
    return st;
  }

  function buildDatasetRow(mapping, add) {
    const d = mapping.dataset || {}, def = C.TABLES.dataset;
    const row = Object.fromEntries(def.fields.map(f => [f.name, null]));
    const st = { table: 'dataset', status: 'complete', sourceRows: 0, mapped: [], rows: [row], rejectedRows: [], removedDuplicates: [], keptDuplicates: [], placeholders: [] };
    row.Format_Version = C.VERSION; row.Currency = 'GBP';
    const sd = CL.cleanDate(d.Snapshot_Date === undefined ? '' : d.Snapshot_Date, 'ISO');
    if (sd.status === 'ok') row.Snapshot_Date = sd.value;
    else { st.status = 'not-built'; add(issue('SNAPSHOT_DATE_MISSING', CAT.MUST, 'dataset', 'The snapshot date (the date the stock figures refer to) must be given as YYYY-MM-DD.', { table: 'dataset' })); }
    for (const f of ['Business_Name', 'Business_Type']) if (d[f] !== undefined) row[f] = CL.cleanText(d[f]).value;
    if (d.Demand_Basis !== undefined) { const x = CL.cleanEnum(d.Demand_Basis, def.fields.find(f => f.name === 'Demand_Basis').values); row.Demand_Basis = x.value; }
    const files = Object.keys(mapping.files).sort();
    row.Date_Format_By_File = files.map(f => f + ': ' + mapping.files[f].dateFormat).join('; ');
    row.Source_Files = files.join('; ');
    row.Mapping_Name = mapping.name === undefined ? null : String(mapping.name);
    row.__source = null;
    return st;
  }

  const ORDER_CAT = [CAT.MUST, CAT.CHECK, CAT.INFO];
  function finish({ issues, state, permissions }) {
    const dataset = {}, held = {}, completeness = {};
    for (const [t, s] of Object.entries(state || {})) {
      completeness[t] = { status: s.status, sourceRows: s.sourceRows || 0, accepted: s.rows ? s.rows.length - (s.placeholders ? s.placeholders.length : 0) : 0,
        rejected: s.rejectedRows ? s.rejectedRows.length : 0, duplicatesRemoved: s.removedDuplicates ? s.removedDuplicates.length : 0,
        duplicateSetsKept: s.keptDuplicates ? s.keptDuplicates.length : 0, placeholders: s.placeholders ? s.placeholders.length : 0, futureExcluded: s.futureRows ? s.futureRows.length : 0 };
      if (s.share !== undefined) { completeness[t].rejectedShare = s.share; completeness[t].thresholdCrossed = s.tableThresholdCrossed; completeness[t].historyRows = s.historyRows; completeness[t].unlinkedRejected = s.unattributed; }
      if (s.status === 'complete' && s.rows) dataset[t] = s.rows;
      else if (s.status === 'stopped') { held[t] = { rows: s.held || s.rows || [], conflicts: s.conflicts || [] }; completeness[t].accepted = 0; }
    }
    const sorted = issues.map((i, n) => [i, n]).sort((a, b) => ORDER_CAT.indexOf(a[0].category) - ORDER_CAT.indexOf(b[0].category) || a[1] - b[1]).map(x => x[0]);
    const count = c => sorted.filter(i => i.category === c).length;
    const blocking = sorted.filter(i => i.category === CAT.MUST && ['dataset', 'table', 'file'].includes(i.scope));
    return freeze({
      importAccepted: blocking.length === 0 && permissions !== null,
      summary: { mustFix: count(CAT.MUST), pleaseCheck: count(CAT.CHECK), forInformation: count(CAT.INFO), blocking: blocking.map(i => i.code) },
      issues: sorted, completeness, dataset, held,
      permissions: permissions || { dataset: { status: 'blocked', reasons: ['mapping invalid'] }, financial: { status: 'withheld', reasons: ['mapping invalid'], withheldFields: [] }, analyses: {}, items: {} }
    });
  }

  // Convenience: load the files, then run. inputs: [{ name, text } | { name, bytes }].
  function importFiles(mapping, inputs) {
    const loaded = {};
    (inputs || []).forEach(inp => { const lf = M.loadFile(inp); loaded[lf.file] = lf; });
    return run(mapping, loaded);
  }

  // ---------- reliability helper (owner, 13 Nov 2026): one decision for Stage 2 and Stage 4 ----------
  // reliabilityOf(result, item, analysis) → 'available' | 'incomplete' | 'caveated' | 'blocked' (most to least reliable).
  // The most conservative applicable status wins. Anything missing, unknown or malformed → 'blocked' (fail-safe): a status this
  // function does not recognise can never be read as reliable. analysis: one of ANALYSIS_TABLES (demand, purchasing, production, materials).
  const RELIABILITY = Object.freeze(['available', 'incomplete', 'caveated', 'blocked']);
  const ITEM_KEYS = new Set(['blocked', 'incomplete', 'caveats', 'caveatDetails', 'noDemandHistory']);
  const isObj = o => o !== null && typeof o === 'object' && !Array.isArray(o);
  function reliabilityOf(result, item, analysis) {
    try {
      const p = result && result.permissions;
      if (!isObj(p) || !isObj(p.dataset) || !isObj(p.analyses) || !isObj(p.items)) return 'blocked';
      if (typeof analysis !== 'string' || !Object.prototype.hasOwnProperty.call(ANALYSIS_TABLES, analysis)) return 'blocked';
      if (p.dataset.status !== 'allowed') return 'blocked';
      if (p.analyses[analysis] !== 'available') return 'blocked'; // 'unavailable', 'stopped', 'blocked', missing or unknown
      const rows = result.dataset && result.dataset.items;
      if (!Array.isArray(rows) || !rows.some(r => r && r.Item_ID === item)) return 'blocked'; // not an imported item
      if (!Object.prototype.hasOwnProperty.call(p.items, item)) return 'available';
      const e = p.items[item];
      if (!isObj(e) || Object.keys(e).some(k => !ITEM_KEYS.has(k))) return 'blocked';
      for (const k of ['blocked', 'incomplete', 'caveats']) {
        if (e[k] === undefined) continue;
        if (!isObj(e[k])) return 'blocked';
        if (Object.keys(e[k]).some(a => !(Object.prototype.hasOwnProperty.call(ANALYSIS_TABLES, a) || (k === 'blocked' && a === 'all')))) return 'blocked';
      }
      if (e.blocked && (e.blocked.all !== undefined || e.blocked[analysis] !== undefined)) return 'blocked';
      if (e.caveats && Object.values(e.caveats).some(v => v !== CAVEAT_DUP)) return 'blocked'; // an unrecognised caveat
      if (e.noDemandHistory !== undefined && e.noDemandHistory !== true) return 'blocked';
      if (e.caveats && e.caveats[analysis] !== undefined) return 'caveated';
      if (e.incomplete && e.incomplete[analysis] !== undefined) return 'incomplete';
      if (analysis === 'demand' && e.noDemandHistory === true) return 'incomplete';
      return 'available';
    } catch (err) { return 'blocked'; }
  }

  NS.validate = Object.freeze({ DUP_RULES, KEY_NEEDS, HISTORY, THRESHOLDS, ANALYSIS_TABLES, CAVEAT_DUP, RELIABILITY,
    CURRENCY_CODES: Object.freeze([...ISO_CODES].sort()), FOREIGN_SYMBOLS: Object.freeze(FOREIGN_SYMBOLS.slice()), FOREIGN_WORDS: Object.freeze([...FOREIGN_WORDS]),
    moneyCurrency, cleanMoney, reliabilityOf, run, importFiles });
})(globalThis.CGImport = globalThis.CGImport || {});
