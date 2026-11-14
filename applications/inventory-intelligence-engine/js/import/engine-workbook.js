/* Chain Genius – Supply Chain Intelligence Engine, Universal Data Import v1, Stage 2 (K2)
 * import/engine-workbook.js — cell writing: turns a canonical dataset into the eight-sheet SheetJS workbook the existing engine
 * reads, using the engine map (engine-map.js). It does not run the engine and does not decide anything: eligibility, aggregation,
 * sales-line conversion and the safety gate belong to the adapter (K3), which calls this module with the rows it has chosen.
 *
 * Plain script, no build step, no asynchronous code, no network access, no browser storage, no engine globals.
 * Uses the bundled SheetJS (global XLSX). Adds CGImport.engineWorkbook. Load after canonical.js and engine-map.js.
 *
 * Cell rules (Stage 2 Solution Design Report, E1):
 *   date field  -> date cell made by this page's own Date constructor at local midnight (the engine's rows() turns it into the
 *                  same calendar date at UTC midnight, exactly as for a date read from a real .xlsx file)
 *   num / pct   -> number cell
 *   id / text / flag / enum -> text cell (leading zeros kept)
 *   null or missing -> NO cell (never "" and never 0)
 *   A column is written only when its canonical field was supplied (mapped), so "column absent" stays distinct from
 *   "column empty": the engine checks every column it is given for empty and missing values.
 * The workbook is built in memory. Writing it to .xlsx and reading it back is a test-only cross-check (tests/test-import-engine-map.js).
 *
 * build(dataset, mapping, options) -> { workbook, report }
 *   dataset  canonical tables { table: [row] } (Stage 1 result.dataset, or rows the adapter has prepared from it)
 *   mapping  the CG-IMPORT-MAPPING object used for the import: the only record of which fields were supplied
 *   options  { supplied: { table: [field] } }  optional; replaces the mapping's field list for the tables it names
 *            (for tables the adapter builds itself, e.g. demand from sales lines)
 *   report   { mapVersion, sheets: [{ sheet, table, rows, columns, omitted: [{ column, why }], duplicateKeys }],
 *              unplaced: [{ table, Item_ID, Replenishment, Is_Sold, reason }] }
 * Fails closed: an invalid argument, a value of the wrong type, or a value in a field the mapping did not supply throws an
 * Error with .code 'ENGINE_WORKBOOK_INPUT' or 'ENGINE_WORKBOOK_VALUE'. Nothing is ever written in its place.
 */
(function (NS) {
  'use strict';
  const C = NS.canonical, EM = NS.engineMap;
  if (!C || !EM) throw new Error('engine-workbook.js needs CGImport.canonical and CGImport.engineMap to be loaded first');
  const X = () => { if (typeof XLSX === 'undefined') throw new Error('SheetJS (XLSX) is not loaded'); return XLSX; };
  const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  const fail = (code, message) => { const e = new Error(message); e.code = code; return e; };
  const deepFreeze = o => { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); Object.values(o).forEach(deepFreeze); } return o; };

  // Fields the mapping supplied, per canonical table.
  function suppliedFields(mapping) {
    if (!isObj(mapping) || mapping.format !== 'CG-IMPORT-MAPPING' || !isObj(mapping.tables)) throw fail('ENGINE_WORKBOOK_INPUT', 'mapping is not a CG-IMPORT-MAPPING object');
    const out = {};
    for (const [t, spec] of Object.entries(mapping.tables)) {
      const set = new Set();
      ((spec && spec.sources) || []).forEach(s => { if (s && isObj(s.columns)) Object.keys(s.columns).forEach(f => set.add(f)); });
      out[t] = set;
    }
    return out;
  }

  function cellFor(type, v, where) {
    if (type === 'date') {
      if (typeof v !== 'string' || !C.validISO(v)) throw fail('ENGINE_WORKBOOK_VALUE', where + ': expected an ISO date, got ' + JSON.stringify(v));
      const [y, m, d] = v.split('-').map(Number);
      return { t: 'd', v: new Date(y, m - 1, d) };
    }
    if (type === 'num' || type === 'pct') {
      if (typeof v !== 'number' || !isFinite(v)) throw fail('ENGINE_WORKBOOK_VALUE', where + ': expected a number, got ' + JSON.stringify(v));
      return { t: 'n', v };
    }
    if (typeof v !== 'string') throw fail('ENGINE_WORKBOOK_VALUE', where + ': expected text, got ' + JSON.stringify(v));
    return { t: 's', v };
  }

  const matches = (row, select) => !select || Object.entries(select).every(([f, val]) => row[f] === val);

  function build(dataset, mapping, options) {
    const S = X();
    if (!isObj(dataset)) throw fail('ENGINE_WORKBOOK_INPUT', 'dataset must be an object of canonical tables');
    if (options !== undefined && !isObj(options)) throw fail('ENGINE_WORKBOOK_INPUT', 'options must be an object');
    const supplied = suppliedFields(mapping);
    const over = (options && options.supplied) || {};
    if (!isObj(over)) throw fail('ENGINE_WORKBOOK_INPUT', 'options.supplied must be an object of field lists');
    for (const [t, list] of Object.entries(over)) {
      if (!C.TABLES[t] || !Array.isArray(list) || list.some(f => !C.field(t, f))) throw fail('ENGINE_WORKBOOK_INPUT', 'options.supplied.' + t + ' names an unknown table or field');
      supplied[t] = new Set(list);
    }
    for (const [t, rows] of Object.entries(dataset)) {
      if (!C.TABLES[t]) throw fail('ENGINE_WORKBOOK_INPUT', 'unknown canonical table: ' + t);
      if (!Array.isArray(rows)) throw fail('ENGINE_WORKBOOK_INPUT', 'table ' + t + ' is not a list of rows');
      const have = supplied[t] || new Set();
      rows.forEach((r, i) => {
        if (!isObj(r)) throw fail('ENGINE_WORKBOOK_INPUT', t + ' row ' + (i + 1) + ' is not an object');
        for (const [f, v] of Object.entries(r)) {
          if (f.startsWith('__')) continue;
          if (!C.field(t, f)) throw fail('ENGINE_WORKBOOK_INPUT', t + ' row ' + (i + 1) + ': unknown field ' + f);
          if (v !== null && v !== undefined && !have.has(f)) throw fail('ENGINE_WORKBOOK_INPUT', t + ' row ' + (i + 1) + ': field ' + f + ' has a value but the mapping did not supply it');
        }
      });
    }

    const wb = S.utils.book_new(), sheetsReport = [], placed = new Set();
    for (const sh of EM.SHEETS) {
      const have = supplied[sh.table] || new Set(), def = C.TABLES[sh.table];
      const cols = sh.columns.filter(col => col.field !== null && have.has(col.field));
      const omitted = sh.columns.filter(col => !cols.includes(col)).map(col => ({ column: col.column, why: col.field === null ? 'not supplied by the canonical model' : 'field ' + col.field + ' not mapped' }));
      const rows = (dataset[sh.table] || []).filter(r => matches(r, sh.select));
      if (sh.table === 'items') rows.forEach(r => placed.add(r));
      const ws = {};
      cols.forEach((col, ci) => { ws[S.utils.encode_cell({ r: 0, c: ci })] = { t: 's', v: col.column }; });
      rows.forEach((r, ri) => cols.forEach((col, ci) => {
        const v = r[col.field];
        if (v === null || v === undefined) return;
        const type = def.fields.find(f => f.name === col.field).type;
        ws[S.utils.encode_cell({ r: ri + 1, c: ci })] = cellFor(type, v, sh.sheet + ' row ' + (ri + 2) + ' column ' + col.column);
      }));
      if (cols.length) ws['!ref'] = S.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length, c: cols.length - 1 } });
      S.utils.book_append_sheet(wb, ws, sh.sheet);
      const dupes = [];
      if (sh.key && sh.key.every(k => cols.some(col => col.column === k))) {
        const fieldOf = k => sh.columns.find(col => col.column === k).field, seen = new Set();
        rows.forEach(r => { const k = sh.key.map(x => String(r[fieldOf(x)])).join(' / '); if (seen.has(k) && !dupes.includes(k)) dupes.push(k); seen.add(k); });
      }
      sheetsReport.push({ sheet: sh.sheet, table: sh.table, rows: rows.length, columns: cols.map(col => col.column), omitted, duplicateKeys: dupes });
    }
    const unplaced = (dataset.items || []).filter(r => !placed.has(r)).map(r => ({
      table: 'items', Item_ID: r.Item_ID, Replenishment: r.Replenishment, Is_Sold: r.Is_Sold,
      reason: 'No engine sheet holds this item role (' + r.Replenishment + ' + ' + (r.Is_Sold === 'Y' ? 'sold' : 'not sold') + '); not written.' }));
    return { workbook: wb, report: deepFreeze({ mapVersion: EM.VERSION, sheets: sheetsReport, unplaced }) };
  }

  NS.engineWorkbook = Object.freeze({ build, suppliedFields });
})(globalThis.CGImport = globalThis.CGImport || {});
