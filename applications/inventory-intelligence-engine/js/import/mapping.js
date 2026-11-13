/* Chain Genius – Supply Chain Intelligence Engine, Universal Data Import v1, Stage 1
 * import/mapping.js — the mapping file format (v1), safe file loading, and applying a mapping to read tables.
 *
 * Plain script, no build step, no asynchronous code, no network access, no browser storage. Adds CGImport.mapping.
 * Needs CGImport.canonical and CGImport.read (load canonical.js, read.js, clean.js, then this file, then validate.js).
 * It never guesses: a column is used only if the mapping names it, and a source code is translated only by an explicit map.
 *
 * Mapping format v1 (JSON):
 * { "format": "CG-IMPORT-MAPPING", "version": 1, "name": "…",
 *   "files":  { "<file name>": { "dateFormat": "UK"|"US"|"ISO",
 *                                "currency": { "code": "GBP", "confirmed": true } } },   // required when the file feeds a money field
 *   "tables": { "<canonical table>": { "sources": [ {                                  // a LIST (A7); Stage 1 accepts one source
 *        "file": "<file name>", "sheet": "<sheet name, Excel only>",
 *        "columns": { "<canonical field or @Unit>": { "source": "<heading>", "position": 0, "profile": {…},
 *                                                     "values": { "<source code>": "<standard value>" } }
 *                     // reserved: { "type": "constant", "value": … } (A12) — refused in Stage 1 with a clear message
 *        },
 *        "ignore": [ "<heading>", … ] } ] } },
 *   "dataset": { "Business_Name": "…", "Business_Type": "…", "Snapshot_Date": "YYYY-MM-DD", "Demand_Basis": "shipments"|"orders" } }
 *
 * Currency rule (owner decision, 13 Nov 2026): a file feeding any money field must declare its currency, and the declaration must
 * be ACTIVELY confirmed ("confirmed": true). A pre-selected GBP that the user did not confirm counts as undeclared. A later screen
 * may pre-fill "GBP" but must set "confirmed" only on a user action.
 */
(function (NS) {
  'use strict';
  const C = NS.canonical, RD = NS.read;
  if (!C || !RD) throw new Error('mapping.js needs canonical.js and read.js to be loaded first');

  const FORMAT = 'CG-IMPORT-MAPPING', VERSION = 1;
  const DATE_FORMATS = ['UK', 'US', 'ISO'];
  // Money fields (financial values). Withheld from financial analysis when their file's currency is not safe.
  const MONEY = Object.freeze({ items: ['Standard_Cost', 'Selling_Price'], stock: ['Unit_Cost'], supplier_items: ['Unit_Cost'],
    po_lines: ['Unit_Cost'], po_headers: ['Freight', 'Tax', 'Header_Total'] });
  // Check-only targets: not part of the standard tables; kept as provenance (__unit) and compared with the item's unit.
  const CHECK_ONLY = Object.freeze({ '@Unit': ['stock', 'demand', 'sales_lines', 'po_lines'] });

  const CAT = Object.freeze({ MUST: 'Must fix', CHECK: 'Please check', INFO: 'For information' });
  // One issue. scope = what a Must fix blocks: dataset | table | item | financial | file | none.
  function issue(code, category, scope, message, extra) {
    return Object.assign({ code, category, scope, message }, extra || {});
  }
  const moneyFields = t => MONEY[t] || [];
  const norm = s => String(s).toLowerCase().replace(/[\s_]+/g, '');

  // ---------- 1. safe loading of one file ----------
  // input: { name, text } for CSV text, or { name, bytes } (ArrayBuffer/Uint8Array/Buffer). Never throws.
  // returns { ok, file, kind, tables, issues }
  function loadFile(input) {
    const name = input && input.name ? String(input.name) : '(unnamed file)';
    const out = (ok, kind, tables, issues) => ({ ok, file: name, kind, tables: tables || [], issues: issues || [] });
    const fail = (code, msg) => out(false, null, [], [issue(code, CAT.MUST, 'file', msg, { file: name })]);
    const ext = (/\.([a-z0-9]+)$/i.exec(name) || [])[1];
    const kind = ext ? ext.toLowerCase() : '';
    if (!['csv', 'xlsx', 'xlsm'].includes(kind)) return fail('FILE_WRONG_TYPE', name + ' is not a CSV or Excel (.xlsx) file. Save it as .csv or .xlsx and try again.');
    let bytes = input.bytes;
    if (bytes && !(bytes instanceof Uint8Array)) bytes = new Uint8Array(bytes);
    if (input.text === undefined && (!bytes || bytes.length === 0)) return fail('FILE_EMPTY', name + ' is empty (no bytes or only blank lines). Check that the right file was chosen.');
    try {
      let tables;
      if (kind === 'csv') {
        const text = input.text !== undefined ? String(input.text) : new TextDecoder('utf-8').decode(bytes);
        if (text.replace(/^﻿/, '').trim() === '') return fail('FILE_EMPTY', name + ' is empty (no bytes or only blank lines). Check that the right file was chosen.');
        tables = [RD.fromCSVText(text, name)];
      } else {
        if (!bytes || bytes.length === 0) return fail('FILE_EMPTY', name + ' is empty (no bytes or only blank lines). Check that the right file was chosen.');
        // An .xlsx file is a ZIP archive: it must start with "PK\x03\x04". Anything else is not a readable workbook.
        if (!(bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04)) return fail('FILE_UNREADABLE', name + ' could not be read as an Excel workbook (the file is damaged or is not really .xlsx).');
        tables = RD.fromWorkbook(RD.readWorkbook(bytes), name);
      }
      if (!tables.some(t => t.headers.length)) return fail('FILE_EMPTY', name + ' contains no data.');
      // Headings with no data rows is a valid file (e.g. "no purchase orders"); whether that matters is decided per table
      // in validate.js (TABLE_EMPTY: Must fix for items or stock, Please check otherwise).
      return out(true, kind, tables, []);
    } catch (e) {
      return fail('FILE_UNREADABLE', name + ' could not be read (' + (e && e.message ? e.message : 'unknown error') + ').');
    }
  }

  // ---------- 2. checking the mapping itself ----------
  // Returns issues. MAP_INVALID means the mapping cannot be applied at all.
  function checkMapping(m) {
    const iss = [], bad = msg => iss.push(issue('MAP_INVALID', CAT.MUST, 'dataset', 'Mapping problem: ' + msg));
    if (!m || typeof m !== 'object') { bad('not a mapping object'); return iss; }
    if (m.format !== FORMAT || m.version !== VERSION) bad('format must be "' + FORMAT + '" version ' + VERSION);
    const files = m.files && typeof m.files === 'object' ? m.files : null;
    if (!files) bad('"files" section missing');
    else for (const [f, s] of Object.entries(files)) {
      if (!s || !DATE_FORMATS.includes(s.dateFormat)) bad('file ' + f + ': dateFormat must be UK, US or ISO');
      if (s && s.currency !== undefined && (typeof s.currency !== 'object' || s.currency === null || typeof s.currency.code !== 'string')) bad('file ' + f + ': currency must be { "code": "…", "confirmed": true|false }');
    }
    const tables = m.tables && typeof m.tables === 'object' ? m.tables : null;
    if (!tables) { bad('"tables" section missing'); return iss; }
    for (const [t, spec] of Object.entries(tables)) {
      const def = C.TABLES[t];
      if (!def) { bad('unknown table "' + t + '"'); continue; }
      if (!spec || !Array.isArray(spec.sources) || spec.sources.length === 0) { bad(t + ': "sources" must be a non-empty list'); continue; }
      if (spec.sources.length > 1) iss.push(issue('MULTI_SOURCE', CAT.MUST, 'table', 'Combining several files into one table (' + t + ') is not supported yet. Use one file per table.', { table: t }));
      spec.sources.forEach((src, si) => {
        const where = t + ' source ' + (si + 1);
        if (!src || typeof src.file !== 'string') { bad(where + ': "file" missing'); return; }
        if (files && !files[src.file]) bad(where + ': file "' + src.file + '" is not listed under "files"');
        const cols = src.columns && typeof src.columns === 'object' ? src.columns : null;
        if (!cols) { bad(where + ': "columns" missing'); return; }
        const used = new Set();
        for (const [target, cs] of Object.entries(cols)) {
          const isCheck = Object.prototype.hasOwnProperty.call(CHECK_ONLY, target);
          if (isCheck && !CHECK_ONLY[target].includes(t)) bad(where + ': ' + target + ' cannot be used in ' + t);
          else if (!isCheck && !def.fields.some(f => f.name === target)) bad(where + ': "' + target + '" is not a field of ' + t);
          if (!cs || typeof cs !== 'object') { bad(where + ': column spec for ' + target + ' missing'); continue; }
          if (cs.type === 'constant') { iss.push(issue('CONSTANT_UNSUPPORTED', CAT.MUST, 'table', 'One value for every row (' + t + '.' + target + ') is not supported yet. Add the column to the file instead.', { table: t, field: target })); continue; }
          if (cs.type !== undefined && cs.type !== 'column') { bad(where + ': unknown column type "' + cs.type + '" for ' + target); continue; }
          if (typeof cs.source !== 'string' || cs.source.trim() === '') { bad(where + ': ' + target + ' has no source heading'); continue; }
          used.add(cs.source);
          if (cs.values !== undefined) {
            if (!cs.values || typeof cs.values !== 'object' || Array.isArray(cs.values)) bad(where + ': ' + target + ' "values" must be an object');
            else {
              const seen = {};
              for (const [k, v] of Object.entries(cs.values)) {
                if (typeof v !== 'string') bad(where + ': ' + target + ' value for "' + k + '" must be text');
                const kk = k.trim().toUpperCase();
                if (seen[kk]) bad(where + ': ' + target + ' maps "' + seen[kk] + '" and "' + k + '", which differ only in case or spaces');
                seen[kk] = k;
              }
            }
          }
        }
        const ign = src.ignore === undefined ? [] : src.ignore;
        if (!Array.isArray(ign) || ign.some(h => typeof h !== 'string')) bad(where + ': "ignore" must be a list of headings');
        else ign.forEach(h => { if (used.has(h)) bad(where + ': heading "' + h + '" is both mapped and ignored'); });
        // A required field with no column at all. (A constant for a required field is already refused above.)
        def.fields.filter(f => f.req && !cols[f.name]).forEach(f => iss.push(issue('REQUIRED_UNMAPPED', CAT.MUST, 'table', t + ': the required field ' + f.name + ' is not mapped to any column.', { table: t, field: f.name })));
      });
    }
    if (m.dataset !== undefined && (typeof m.dataset !== 'object' || m.dataset === null)) bad('"dataset" must be an object');
    return iss;
  }

  // ---------- 3. column profile (recorded in the mapping so a later stage can repair a changed heading) ----------
  function profileColumn(table, header) {
    const i = RD.column(table, header);
    if (i < 0) return null;
    const vals = table.rows.map(r => String(r.cells[i]).trim()).filter(v => v !== '');
    const n = vals.length;
    const share = re => n ? vals.filter(v => re.test(v)).length / n : 0;
    const num = share(/^[-(]?£?\s*\d[\d,]*(\.\d+)?\)?%?$/), date = share(/^(\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})$/);
    const lens = vals.map(v => v.length).sort((a, b) => a - b);
    const kind = !n ? 'empty' : date >= 0.9 ? 'date' : num >= 0.9 ? 'number' : share(/^[A-Za-z0-9\-_.\/]{1,20}$/) >= 0.9 ? 'code' : 'text';
    return { kind, filled: n, typicalLength: n ? lens[Math.floor(n / 2)] : 0 };
  }
  // Returns a NEW mapping with position and profile filled in for every mapped column (the input is not changed).
  function recordProfiles(m, loaded) {
    const copy = JSON.parse(JSON.stringify(m));
    for (const [, spec] of Object.entries(copy.tables || {})) for (const src of spec.sources || []) {
      const tbl = findTable(loaded, src);
      if (!tbl) continue;
      for (const cs of Object.values(src.columns || {})) if (cs && typeof cs.source === 'string') { cs.position = tbl.headers.indexOf(cs.source); cs.profile = profileColumn(tbl, cs.source); }
    }
    return copy;
  }

  function findTable(loaded, src) {
    const lf = loaded && loaded[src.file];
    if (!lf || !lf.tables || !lf.tables.length) return null;
    if (src.sheet === undefined || src.sheet === null) return lf.tables.length === 1 ? lf.tables[0] : null;
    return lf.tables.find(t => t.sheet === src.sheet) || null;
  }

  // ---------- 4. applying the mapping ----------
  // loaded: { "<file name>": result of loadFile }. Returns { tables: { t: {file, sheet, rows, mappedFields} }, issues }.
  // Each row: { src: {file, sheet, row}, cells (all source cells), raw: {field: text}, meta: {field: meta}, codeMiss: {field: code} }
  function applyMapping(m, loaded) {
    const issues = [], tables = {}, usedByFileSheet = new Map();
    for (const [t, spec] of Object.entries(m.tables)) {
      const src = spec.sources[0];
      const lf = loaded[src.file];
      if (!lf) { issues.push(issue('FILE_MISSING', CAT.MUST, 'table', 'The file ' + src.file + ' (for ' + t + ') was not supplied.', { table: t, file: src.file })); continue; }
      if (!lf.ok) continue; // its own load issue is already reported
      const tbl = findTable(loaded, src);
      if (!tbl) { issues.push(issue('SHEET_MISSING', CAT.MUST, 'table', 'Sheet ' + (src.sheet || '(not named; the workbook has several)') + ' was not found in ' + src.file + '.', { table: t, file: src.file })); continue; }
      const key = src.file + '\u0001' + (tbl.sheet || '');
      if (!usedByFileSheet.has(key)) usedByFileSheet.set(key, { tbl, used: new Set(), ignored: new Set() });
      const u = usedByFileSheet.get(key);
      (src.ignore || []).forEach(h => u.ignored.add(h));
      const cols = [];
      let missing = false;
      for (const [target, cs] of Object.entries(src.columns)) {
        if (!cs || cs.type === 'constant' || typeof cs.source !== 'string') continue;
        const idx = tbl.headers.indexOf(cs.source);
        if (idx < 0) { missing = true; issues.push(issue('COLUMN_MISSING', CAT.MUST, 'table', 'Column "' + cs.source + '" (for ' + t + '.' + target + ') is not in ' + src.file + (tbl.sheet ? ' / ' + tbl.sheet : '') + '.', { table: t, field: target, file: src.file, sheet: tbl.sheet })); continue; }
        u.used.add(cs.source);
        let vmap = null;
        if (cs.values) { vmap = new Map(); for (const [k, v] of Object.entries(cs.values)) vmap.set(k.trim().toUpperCase(), v); }
        cols.push({ target, idx, vmap });
      }
      if (missing) { tables[t] = { file: src.file, sheet: tbl.sheet, rows: null, mappedFields: [], missingColumns: true }; continue; }
      const rows = tbl.rows.map(r => {
        const raw = {}, meta = {}, codeMiss = {};
        for (const c of cols) {
          let v = r.cells[c.idx];
          if (c.vmap && String(v).trim() !== '') {
            const hit = c.vmap.get(String(v).trim().toUpperCase());
            if (hit === undefined) codeMiss[c.target] = String(v).trim(); else v = hit;
          }
          raw[c.target] = v; meta[c.target] = r.metas[c.idx];
        }
        return { src: { file: src.file, sheet: tbl.sheet, row: r.row }, cells: r.cells, raw, meta, codeMiss };
      });
      tables[t] = { file: src.file, sheet: tbl.sheet, rows, mappedFields: cols.map(c => c.target), headers: tbl.headers };
    }
    // Unmapped columns: every heading neither mapped nor ignored, per file and sheet. Values are NOT kept.
    const names = new Map();
    C.tableNames.forEach(t => C.TABLES[t].fields.forEach(f => names.set(norm(f.name), f.name)));
    for (const { tbl, used, ignored } of usedByFileSheet.values()) {
      const un = tbl.headers.filter(h => !used.has(h) && !ignored.has(h));
      if (!un.length) continue;
      const looksLike = {};
      un.forEach(h => { const n = names.get(norm(h)); if (n) looksLike[h] = n; });
      issues.push(issue('COLUMN_UNMAPPED', CAT.CHECK, 'none', un.length + ' column' + (un.length > 1 ? 's' : '') + ' in ' + tbl.file + (tbl.sheet ? ' / ' + tbl.sheet : '') + ' will not be imported: ' + un.join(', ') +
        (Object.keys(looksLike).length ? '. Possibly meant to be imported: ' + Object.entries(looksLike).map(([h, n]) => h + ' (looks like ' + n + ')').join(', ') : '') + '. Their values are not kept.',
        { file: tbl.file, sheet: tbl.sheet, columns: un, looksLike }));
    }
    return { tables, issues };
  }

  NS.mapping = Object.freeze({ FORMAT, VERSION, DATE_FORMATS, MONEY, CHECK_ONLY, CAT, issue, moneyFields, loadFile, checkMapping, profileColumn, recordProfiles, findTable, applyMapping });
})(globalThis.CGImport = globalThis.CGImport || {});
