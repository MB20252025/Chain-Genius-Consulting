/* Chain Genius – Supply Chain Intelligence Engine, v0.7 M1 Stage 1 (A3)
 * import/read.js — Stage "Read": turns a CSV text or an Excel workbook into plain tables of TEXT, without interpreting anything (decision D22).
 *
 * Plain script, no build step, no asynchronous code (the caller reads the file bytes). Uses the bundled SheetJS (global XLSX). Adds CGImport.read.
 *
 * Every reader returns the same TABLE shape, so a future JSON reader (D15) plugs in without changing later stages:
 *   { file, sheet, headers: [text], rows: [{ row, cells: [text], metas: [meta|undefined] }], report }
 *   row   = the spreadsheet row number as the user sees it (header = row 1 for a CSV)
 *   cells = text exactly as stored ('' for blank). Excel date cells are given as YYYY-MM-DD from the workbook's own date number (no time zone involved).
 *   metas[i].numberCell = true when an Excel cell was stored as a number (a code in it may already have lost leading zeros)
 *   report = { blankRowsSkipped, duplicateHeaders, blankHeaders, numberCells, errorCells, dateCells }
 */
(function (NS) {
  'use strict';
  const X = () => { if (typeof XLSX === 'undefined') throw new Error('SheetJS (XLSX) is not loaded'); return XLSX; };

  function finishTable(file, sheet, grid, firstRow, metaGrid) {
    const report = { blankRowsSkipped: 0, duplicateHeaders: [], blankHeaders: [], numberCells: 0, errorCells: 0, dateCells: 0 };
    let h = 0;
    while (h < grid.length && grid[h].every(c => String(c).trim() === '')) { h++; report.blankRowsSkipped++; }
    const rawHead = (grid[h] || []).map(c => String(c).trim());
    const seen = {}, headers = rawHead.map((n, i) => {
      let name = n;
      if (name === '') { name = 'Column_' + (i + 1); report.blankHeaders.push(name); }
      if (seen[name]) { seen[name]++; const nn = name + '_' + seen[name]; report.duplicateHeaders.push(name + ' → ' + nn); return nn; }
      seen[name] = 1; return name;
    });
    const rows = [];
    for (let i = h + 1; i < grid.length; i++) {
      const cells = headers.map((_, j) => grid[i][j] === undefined || grid[i][j] === null ? '' : String(grid[i][j]));
      if (cells.every(c => c.trim() === '')) { report.blankRowsSkipped++; continue; }
      const metas = metaGrid ? headers.map((_, j) => metaGrid[i] && metaGrid[i][j]) : headers.map(() => undefined);
      rows.push({ row: firstRow + i + 1, cells, metas });
    }
    if (metaGrid) metaGrid.forEach(r => (r || []).forEach(m => { if (m && m.numberCell) report.numberCells++; if (m && m.error) report.errorCells++; if (m && m.date) report.dateCells++; }));
    return { file, sheet, headers, rows, report };
  }

  // CSV: read with raw:true so SheetJS keeps every value as written (default reading turns 000123 into 123 and 03/04/2026 into a US date).
  function fromCSVText(text, file) {
    let t = String(text);
    if (t.charCodeAt(0) === 0xFEFF) t = t.slice(1);
    const wb = X().read(t, { type: 'string', raw: true, cellDates: false });
    const ws = wb.Sheets[wb.SheetNames[0]];
    if (!ws || !ws['!ref']) return finishTable(file, null, [], 0, null);
    const rng = X().utils.decode_range(ws['!ref']);
    const grid = [];
    for (let r = rng.s.r; r <= rng.e.r; r++) {
      const line = [];
      for (let c = 0; c <= rng.e.c; c++) { const cell = ws[X().utils.encode_cell({ r, c })]; line.push(cell ? String(cell.v === undefined ? '' : cell.v) : ''); }
      grid.push(line);
    }
    return finishTable(file, null, grid, rng.s.r, null);
  }

  const pad = n => String(n).padStart(2, '0');

  // Excel: each sheet becomes a table. Read the workbook with readWorkbook() so number formats are available.
  function sheetToTable(ws, file, sheet) {
    if (!ws || !ws['!ref']) return finishTable(file, sheet, [], 0, []);
    const U = X().utils, rng = U.decode_range(ws['!ref']), grid = [], metas = [];
    for (let r = rng.s.r; r <= rng.e.r; r++) {
      const line = [], ml = [];
      for (let c = rng.s.c; c <= rng.e.c; c++) {
        const cell = ws[U.encode_cell({ r, c })];
        let text = '', meta;
        if (!cell || cell.t === 'z') text = '';
        else if (cell.t === 's') text = String(cell.v);
        else if (cell.t === 'b') text = cell.v ? 'TRUE' : 'FALSE';
        else if (cell.t === 'e') { text = ''; meta = { error: cell.w || '#ERROR' }; }
        else if (cell.t === 'd') { const d = cell.v; text = d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); meta = { date: true }; }
        else if (cell.t === 'n') {
          const fmt = cell.z || '';
          if (fmt && X().SSF.is_date(fmt)) { const p = X().SSF.parse_date_code(cell.v); text = p.y + '-' + pad(p.m) + '-' + pad(p.d); meta = { date: true, time: (p.H || p.M || p.S) ? true : undefined }; }
          else { text = String(cell.v); meta = { numberCell: true }; }
        } else text = String(cell.v);
        line.push(text); ml.push(meta);
      }
      grid.push(line); metas.push(ml);
    }
    return finishTable(file, sheet, grid, rng.s.r, metas);
  }

  // bytes: ArrayBuffer/Uint8Array (browser) or Buffer (Node)
  function readWorkbook(bytes) { return X().read(bytes, { type: (typeof Buffer !== 'undefined' && Buffer.isBuffer && Buffer.isBuffer(bytes)) ? 'buffer' : 'array', cellDates: false, cellNF: true, raw: false }); }
  function fromWorkbook(wb, file) { return wb.SheetNames.map(n => sheetToTable(wb.Sheets[n], file, n)); }

  // Column lookup helper used by later stages: header name -> index (exact match on the trimmed header text).
  const column = (table, header) => table.headers.indexOf(header);
  const values = (table, header) => { const i = column(table, header); if (i < 0) throw new Error('Column not found in ' + table.file + ': ' + header); return table.rows.map(r => r.cells[i]); };
  const metasOf = (table, header) => { const i = column(table, header); return table.rows.map(r => r.metas[i]); };

  NS.read = Object.freeze({ fromCSVText, readWorkbook, fromWorkbook, sheetToTable, column, values, metasOf });
})(globalThis.CGImport = globalThis.CGImport || {});
