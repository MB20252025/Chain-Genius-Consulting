#!/usr/bin/env node
/* Universal Data Import v1, Stage 1: generator for the synthetic test fixtures in tests/fixtures/import-v1/.
 * Run from tests/:  NODE_PATH=<pinned test node_modules> node tools/import-v1/make-stage1-fixtures.js [--out <dir>]
 * Deterministic (no randomness, no dates from the clock). Everything is derived from library Package 01 (fictional data).
 * The generated files are protected in checksums.txt; re-running must reproduce them byte for byte. Never edit them by hand.
 *
 *   layouts/L1-alt-headings/   CSV files in a different layout: renamed and shuffled columns, extra columns, UK dates, £ and
 *                              thousands separators, Yes/No flags, lower-case make/buy. Mapping: mappings/L1-alt-headings.mapping.json
 *   layouts/L2-erp-workbook/   one .xlsx workbook, one sheet per table, ERP-style codes (M/P, S/N, A/I) translated by explicit value maps,
 *                              US text dates, real Excel date cells, numbers stored as numbers. Mapping: mappings/L2-erp-workbook.mapping.json
 *   faults/base/               Package 01 items, stock, demand, suppliers, po_lines (canonical headings)
 *   faults/<case>/             only the files that differ from base, plus mapping.json
 */
'use strict';
const fs = require('fs'), path = require('path'), XF = require('xlsx');
const TESTS = path.resolve(__dirname, '..', '..'), P1 = path.join(TESTS, 'fixtures', 'library', '01-Clean-Manufacturer');
// --out <dir> writes elsewhere (used by the test to prove the committed fixtures are exactly this generator's output).
const OUT = process.argv.indexOf('--out') > 0 ? path.resolve(process.argv[process.argv.indexOf('--out') + 1]) : path.join(TESTS, 'fixtures', 'import-v1');

// ---------- CSV helpers ----------
function readCSV(file) {
  const wb = XF.read(fs.readFileSync(file, 'utf8'), { type: 'string', raw: true });
  const aoa = XF.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: '' }).map(r => r.map(String));
  return { headers: aoa[0], rows: aoa.slice(1) };
}
const q = v => /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
const toCSV = (headers, rows) => [headers, ...rows].map(r => r.map(c => q(String(c))).join(',')).join('\r\n') + '\r\n';
function write(rel, content) { const p = path.join(OUT, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, content); }
const writeJSON = (rel, o) => write(rel, JSON.stringify(o, null, 1) + '\n');
const P = t => readCSV(path.join(P1, t + '.csv'));
const col = (tbl, h) => { const i = tbl.headers.indexOf(h); if (i < 0) throw new Error('no column ' + h); return r => r[i]; };

// ---------- value transforms (meaning unchanged; the importer must undo each one exactly) ----------
const uk = iso => iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : '';
const us = iso => iso ? iso.slice(5, 7) + '/' + iso.slice(8, 10) + '/' + iso.slice(0, 4) : '';
const yesNo = f => f === 'Y' ? 'Yes' : f === 'N' ? 'No' : '';
const pounds = s => { if (s === '') return ''; const [i, d] = s.split('.'); return '£' + i.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (d !== undefined ? '.' + d : ''); };
const pct = s => s === '' ? '' : String(Math.round(Number(s) * 1e6) / 1e4) + '%';

// Builds a new table: spec = [[new heading, fn(row) -> text], ...]
function reshape(src, spec) { return { headers: spec.map(s => s[0]), rows: src.rows.map(r => spec.map(s => s[1](r))) }; }

// ================= L1: alternative headings (CSV) =================
{
  const it = P('items'), g = h => col(it, h);
  const L = {};
  L['Products.csv'] = reshape(it, [['Status', r => yesNo(g('Active')(r))], ['Code', g('Item_ID')], ['Title', g('Item_Name')], ['Category', g('Item_Group')],
    ['Sold?', r => yesNo(g('Is_Sold')(r))], ['Make or Buy', r => g('Replenishment')(r).toLowerCase()], ['UoM', g('Unit_of_Measure')], ['Cost', r => pounds(g('Standard_Cost')(r))],
    ['Price', r => pounds(g('Selling_Price')(r))], ['Vendor', g('Default_Supplier_ID')], ['Buy LT', g('Purchase_Lead_Time_Days')], ['Make LT', g('Production_Lead_Time_Days')],
    ['Min Qty', g('Min_Order_Qty')], ['Multiple', g('Order_Multiple')], ['Notes', () => 'n/a']]);
  const st = P('stock'), s = h => col(st, h);
  L['Stock_Report.csv'] = reshape(st, [['Site', s('Location_ID')], ['On Hand', r => { const v = s('On_Hand_Qty')(r); return /^\d{4,}$/.test(v) ? Number(v).toLocaleString('en-GB') : v; }],
    ['Item', s('Item_ID')], ['Bin', () => 'A-01'], ['Allocated Qty', s('Allocated_Qty')], ['Incoming', s('On_Order_Qty')], ['ROP', s('Reorder_Point_Qty')], ['SS', s('Safety_Stock_Qty')],
    ['Cost Each', r => pounds(s('Unit_Cost')(r))], ['As At', r => uk(s('Snapshot_Date')(r))]]);
  const de = P('demand'), d = h => col(de, h);
  L['Monthly_Sales.csv'] = reshape(de, [['Period', r => uk(d('Period_Start')(r))], ['SKU', d('Item_ID')], ['Sold', d('Units')], ['Forecast Qty', d('Forecast_Units')],
    ['Customer Segment', () => 'Trade'], ['Location ID', d('Location_ID')]]);
  const su = P('suppliers'), u = h => col(su, h);
  L['Vendors.csv'] = reshape(su, [['Vendor Ref', u('Supplier_ID')], ['Vendor', u('Supplier_Name')], ['Terms', u('Payment_Terms')], ['Country', u('Country')],
    ['Lead Days', u('Standard_Lead_Time_Days')], ['Live', r => yesNo(u('Active')(r))]]);
  const si = P('supplier_items'), v = h => col(si, h);
  L['Vendor_Parts.csv'] = reshape(si, [['Part', v('Item_ID')], ['Vendor Ref', v('Supplier_ID')], ['Price Each', r => pounds(v('Unit_Cost')(r))], ['LT', v('Lead_Time_Days')],
    ['MOQ', v('Min_Order_Qty')], ['Main Vendor', r => yesNo(v('Preferred')(r))]]);
  const lo = P('locations'), l = h => col(lo, h);
  L['Sites.csv'] = reshape(lo, [['Site Name', l('Location_Name')], ['Site', l('Location_ID')], ['Counts As Available', r => yesNo(l('Include_In_Available')(r))]]);
  const po = P('po_lines'), p = h => col(po, h);
  L['Purchase_Orders.csv'] = reshape(po, [['Order No', p('PO_ID')], ['Ln', p('Line_No')], ['Ordered', r => uk(p('Order_Date')(r))], ['Vendor Ref', p('Supplier_ID')], ['Part', p('Item_ID')],
    ['Due', r => uk(p('Promised_Date')(r))], ['Qty', p('Ordered_Qty')], ['Qty In', p('Received_Qty')], ['Last In', r => uk(p('Last_Receipt_Date')(r))],
    ['Cost', r => pounds(p('Unit_Cost')(r))], ['State', p('Status')], ['Deliver To', p('Location_ID')]]);
  const bo = P('bom'), b = h => col(bo, h);
  L['Recipes.csv'] = reshape(bo, [['Makes', b('Parent_Item_ID')], ['Uses', b('Component_Item_ID')], ['Per Unit', b('Qty_Per')], ['Waste', r => pct(b('Scrap_Pct')(r))]]);
  const wo = P('production_orders'), w = h => col(wo, h);
  L['Jobs.csv'] = reshape(wo, [['Job', w('Production_Order_ID')], ['Product', w('Item_ID')], ['Qty', w('Planned_Qty')], ['Done', w('Completed_Qty')], ['Plan Start', r => uk(w('Planned_Start_Date')(r))],
    ['Plan End', r => uk(w('Planned_Finish_Date')(r))], ['Started', r => uk(w('Actual_Start_Date')(r))], ['Finished', r => uk(w('Actual_Finish_Date')(r))], ['Job Status', w('Status')]]);
  for (const [n, t] of Object.entries(L)) write('layouts/L1-alt-headings/' + n, toCSV(t.headers, t.rows));
  const GBP = { code: 'GBP', confirmed: true };
  const c = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { source: v }]));
  writeJSON('mappings/L1-alt-headings.mapping.json', { format: 'CG-IMPORT-MAPPING', version: 1, name: 'L1 alternative headings (synthetic, from Package 01)',
    files: { 'Products.csv': { dateFormat: 'UK', currency: GBP }, 'Stock_Report.csv': { dateFormat: 'UK', currency: GBP }, 'Monthly_Sales.csv': { dateFormat: 'UK' },
      'Vendors.csv': { dateFormat: 'UK' }, 'Vendor_Parts.csv': { dateFormat: 'UK', currency: GBP }, 'Sites.csv': { dateFormat: 'UK' },
      'Purchase_Orders.csv': { dateFormat: 'UK', currency: GBP }, 'Recipes.csv': { dateFormat: 'UK' }, 'Jobs.csv': { dateFormat: 'UK' } },
    tables: {
      items: { sources: [{ file: 'Products.csv', columns: c({ Item_ID: 'Code', Item_Name: 'Title', Item_Group: 'Category', Is_Sold: 'Sold?', Replenishment: 'Make or Buy', Unit_of_Measure: 'UoM',
        Standard_Cost: 'Cost', Selling_Price: 'Price', Default_Supplier_ID: 'Vendor', Purchase_Lead_Time_Days: 'Buy LT', Production_Lead_Time_Days: 'Make LT', Min_Order_Qty: 'Min Qty',
        Order_Multiple: 'Multiple', Active: 'Status' }), ignore: ['Notes'] }] },
      stock: { sources: [{ file: 'Stock_Report.csv', columns: c({ Item_ID: 'Item', Location_ID: 'Site', Snapshot_Date: 'As At', On_Hand_Qty: 'On Hand', Allocated_Qty: 'Allocated Qty',
        On_Order_Qty: 'Incoming', Reorder_Point_Qty: 'ROP', Safety_Stock_Qty: 'SS', Unit_Cost: 'Cost Each' }) }] },
      demand: { sources: [{ file: 'Monthly_Sales.csv', columns: c({ Item_ID: 'SKU', Period_Start: 'Period', Units: 'Sold', Forecast_Units: 'Forecast Qty' }) }] },
      suppliers: { sources: [{ file: 'Vendors.csv', columns: c({ Supplier_ID: 'Vendor Ref', Supplier_Name: 'Vendor', Standard_Lead_Time_Days: 'Lead Days', Country: 'Country', Payment_Terms: 'Terms', Active: 'Live' }) }] },
      supplier_items: { sources: [{ file: 'Vendor_Parts.csv', columns: c({ Supplier_ID: 'Vendor Ref', Item_ID: 'Part', Lead_Time_Days: 'LT', Unit_Cost: 'Price Each', Min_Order_Qty: 'MOQ', Preferred: 'Main Vendor' }) }] },
      locations: { sources: [{ file: 'Sites.csv', columns: c({ Location_ID: 'Site', Location_Name: 'Site Name', Include_In_Available: 'Counts As Available' }) }] },
      po_lines: { sources: [{ file: 'Purchase_Orders.csv', columns: c({ PO_ID: 'Order No', Line_No: 'Ln', Supplier_ID: 'Vendor Ref', Item_ID: 'Part', Order_Date: 'Ordered', Promised_Date: 'Due',
        Ordered_Qty: 'Qty', Received_Qty: 'Qty In', Last_Receipt_Date: 'Last In', Unit_Cost: 'Cost', Status: 'State', Location_ID: 'Deliver To' }) }] },
      bom: { sources: [{ file: 'Recipes.csv', columns: c({ Parent_Item_ID: 'Makes', Component_Item_ID: 'Uses', Qty_Per: 'Per Unit', Scrap_Pct: 'Waste' }) }] },
      production_orders: { sources: [{ file: 'Jobs.csv', columns: c({ Production_Order_ID: 'Job', Item_ID: 'Product', Planned_Start_Date: 'Plan Start', Planned_Finish_Date: 'Plan End',
        Actual_Start_Date: 'Started', Actual_Finish_Date: 'Finished', Planned_Qty: 'Qty', Completed_Qty: 'Done', Status: 'Job Status' }) }] } },
    dataset: { Business_Name: 'Harbour Valve Engineering Ltd', Business_Type: 'Manufacturer', Snapshot_Date: '2026-10-31' } });
}

// ================= L2: ERP-style workbook (.xlsx, several sheets) =================
{
  const num = v => v === '' ? null : Number(v);
  const xdate = iso => { if (!iso) return null; const [y, m, d] = iso.split('-').map(Number); return { t: 'n', v: (Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 864e5, z: 'dd/mm/yyyy' }; };
  const sheets = {};
  const mk = (tbl, spec) => [spec.map(s => s[0]), ...tbl.rows.map(r => spec.map(s => s[1](r)))];
  const it = P('items'), g = h => col(it, h);
  sheets.ITEMS = mk(it, [['ITEM_NO', g('Item_ID')], ['DESCR', g('Item_Name')], ['CLASS', g('Item_Group')], ['SRC', r => g('Replenishment')(r) === 'Make' ? 'M' : 'P'],
    ['SALE', r => g('Is_Sold')(r) === 'Y' ? 'S' : 'N'], ['STAT', r => g('Active')(r) === 'Y' ? 'A' : 'I'], ['UOM', g('Unit_of_Measure')], ['STDCOST', r => num(g('Standard_Cost')(r))],
    ['LISTPRICE', r => num(g('Selling_Price')(r))], ['PRIMVEND', g('Default_Supplier_ID')], ['PLT', r => num(g('Purchase_Lead_Time_Days')(r))], ['MLT', r => num(g('Production_Lead_Time_Days')(r))],
    ['MOQ', r => num(g('Min_Order_Qty')(r))], ['MULT', r => num(g('Order_Multiple')(r))]]);
  const st = P('stock'), s = h => col(st, h);
  sheets.ONHAND = mk(st, [['WHSE', s('Location_ID')], ['ITEM_NO', s('Item_ID')], ['QOH', r => num(s('On_Hand_Qty')(r))], ['ALLOC', r => num(s('Allocated_Qty')(r))], ['ONORD', r => num(s('On_Order_Qty')(r))],
    ['ROP', r => num(s('Reorder_Point_Qty')(r))], ['SS', r => num(s('Safety_Stock_Qty')(r))], ['AVGCOST', r => num(s('Unit_Cost')(r))], ['ASOF', r => xdate(s('Snapshot_Date')(r))]]);
  const de = P('demand'), d = h => col(de, h);
  sheets.SALES = mk(de, [['ITEM_NO', d('Item_ID')], ['PERIOD', r => xdate(d('Period_Start')(r))], ['QTY', r => num(d('Units')(r))], ['FCST', r => num(d('Forecast_Units')(r))]]);
  const su = P('suppliers'), u = h => col(su, h);
  sheets.VENDORS = mk(su, [['VEND_NO', u('Supplier_ID')], ['VEND_NAME', u('Supplier_Name')], ['LT', r => num(u('Standard_Lead_Time_Days')(r))], ['CTRY', u('Country')], ['TERMS', u('Payment_Terms')],
    ['STAT', r => u('Active')(r) === 'Y' ? 'A' : 'I']]);
  const si = P('supplier_items'), v = h => col(si, h);
  sheets.VENDOR_ITEMS = mk(si, [['VEND_NO', v('Supplier_ID')], ['ITEM_NO', v('Item_ID')], ['LT', r => num(v('Lead_Time_Days')(r))], ['COST', r => num(v('Unit_Cost')(r))], ['MOQ', r => num(v('Min_Order_Qty')(r))],
    ['PRIMARY', v('Preferred')]]);
  const lo = P('locations'), l = h => col(lo, h);
  sheets.LOCATIONS = mk(lo, [['WHSE', l('Location_ID')], ['WHSE_NAME', l('Location_Name')], ['NETTABLE', l('Include_In_Available')]]);
  const po = P('po_lines'), p = h => col(po, h);
  sheets.PURCH = mk(po, [['PO_NO', p('PO_ID')], ['LINE', r => num(p('Line_No')(r))], ['VEND_NO', p('Supplier_ID')], ['ITEM_NO', p('Item_ID')], ['PO_DATE', r => us(p('Order_Date')(r))],
    ['PROMISE', r => us(p('Promised_Date')(r))], ['QTY_ORD', r => num(p('Ordered_Qty')(r))], ['QTY_RCV', r => num(p('Received_Qty')(r))], ['LAST_RCV', r => us(p('Last_Receipt_Date')(r))],
    ['PRICE', r => num(p('Unit_Cost')(r))], ['PO_STAT', p('Status')], ['SHIP_TO', p('Location_ID')]]);
  const bo = P('bom'), b = h => col(bo, h);
  sheets.BOM = mk(bo, [['PARENT', b('Parent_Item_ID')], ['COMP', b('Component_Item_ID')], ['QTY_PER', r => num(b('Qty_Per')(r))], ['SCRAP', r => num(b('Scrap_Pct')(r))]]);
  const wo = P('production_orders'), w = h => col(wo, h);
  sheets.WORKORDERS = mk(wo, [['WO_NO', w('Production_Order_ID')], ['ITEM_NO', w('Item_ID')], ['SCHED_START', r => xdate(w('Planned_Start_Date')(r))], ['SCHED_END', r => xdate(w('Planned_Finish_Date')(r))],
    ['ACT_START', r => xdate(w('Actual_Start_Date')(r))], ['ACT_END', r => xdate(w('Actual_Finish_Date')(r))], ['QTY', r => num(w('Planned_Qty')(r))], ['QTY_DONE', r => num(w('Completed_Qty')(r))], ['WO_STAT', w('Status')]]);
  const wb = XF.utils.book_new();
  for (const [n, aoa] of Object.entries(sheets)) {
    const ws = XF.utils.aoa_to_sheet(aoa.map(r => r.map(c => c && typeof c === 'object' ? null : c)));
    aoa.forEach((r, ri) => r.forEach((c, ci) => { if (c && typeof c === 'object') ws[XF.utils.encode_cell({ r: ri, c: ci })] = c; }));
    XF.utils.book_append_sheet(wb, ws, n);
  }
  // Fixed workbook properties so the file is byte-for-byte reproducible.
  wb.Props = { Title: 'L2 ERP workbook (synthetic)', CreatedDate: new Date(Date.UTC(2026, 10, 13)), ModifiedDate: new Date(Date.UTC(2026, 10, 13)) };
  write('layouts/L2-erp-workbook/ERP_Extract.xlsx', XF.write(wb, { type: 'buffer', bookType: 'xlsx', compression: false }));
  const GBP = { code: 'GBP', confirmed: true }, F = 'ERP_Extract.xlsx';
  const c = (o, vals) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, vals && vals[k] ? { source: v, values: vals[k] } : { source: v }]));
  writeJSON('mappings/L2-erp-workbook.mapping.json', { format: 'CG-IMPORT-MAPPING', version: 1, name: 'L2 ERP workbook (synthetic, from Package 01)',
    files: { [F]: { dateFormat: 'US', currency: GBP } },
    tables: {
      items: { sources: [{ file: F, sheet: 'ITEMS', columns: c({ Item_ID: 'ITEM_NO', Item_Name: 'DESCR', Item_Group: 'CLASS', Is_Sold: 'SALE', Replenishment: 'SRC', Unit_of_Measure: 'UOM',
        Standard_Cost: 'STDCOST', Selling_Price: 'LISTPRICE', Default_Supplier_ID: 'PRIMVEND', Purchase_Lead_Time_Days: 'PLT', Production_Lead_Time_Days: 'MLT', Min_Order_Qty: 'MOQ',
        Order_Multiple: 'MULT', Active: 'STAT' }, { Is_Sold: { S: 'Y', N: 'N' }, Replenishment: { M: 'Make', P: 'Buy' }, Active: { A: 'Y', I: 'N' } }) }] },
      stock: { sources: [{ file: F, sheet: 'ONHAND', columns: c({ Item_ID: 'ITEM_NO', Location_ID: 'WHSE', Snapshot_Date: 'ASOF', On_Hand_Qty: 'QOH', Allocated_Qty: 'ALLOC', On_Order_Qty: 'ONORD',
        Reorder_Point_Qty: 'ROP', Safety_Stock_Qty: 'SS', Unit_Cost: 'AVGCOST' }) }] },
      demand: { sources: [{ file: F, sheet: 'SALES', columns: c({ Item_ID: 'ITEM_NO', Period_Start: 'PERIOD', Units: 'QTY', Forecast_Units: 'FCST' }) }] },
      suppliers: { sources: [{ file: F, sheet: 'VENDORS', columns: c({ Supplier_ID: 'VEND_NO', Supplier_Name: 'VEND_NAME', Standard_Lead_Time_Days: 'LT', Country: 'CTRY', Payment_Terms: 'TERMS', Active: 'STAT' },
        { Active: { A: 'Y', I: 'N' } }) }] },
      supplier_items: { sources: [{ file: F, sheet: 'VENDOR_ITEMS', columns: c({ Supplier_ID: 'VEND_NO', Item_ID: 'ITEM_NO', Lead_Time_Days: 'LT', Unit_Cost: 'COST', Min_Order_Qty: 'MOQ', Preferred: 'PRIMARY' }) }] },
      locations: { sources: [{ file: F, sheet: 'LOCATIONS', columns: c({ Location_ID: 'WHSE', Location_Name: 'WHSE_NAME', Include_In_Available: 'NETTABLE' }) }] },
      po_lines: { sources: [{ file: F, sheet: 'PURCH', columns: c({ PO_ID: 'PO_NO', Line_No: 'LINE', Supplier_ID: 'VEND_NO', Item_ID: 'ITEM_NO', Order_Date: 'PO_DATE', Promised_Date: 'PROMISE',
        Ordered_Qty: 'QTY_ORD', Received_Qty: 'QTY_RCV', Last_Receipt_Date: 'LAST_RCV', Unit_Cost: 'PRICE', Status: 'PO_STAT', Location_ID: 'SHIP_TO' }) }] },
      bom: { sources: [{ file: F, sheet: 'BOM', columns: c({ Parent_Item_ID: 'PARENT', Component_Item_ID: 'COMP', Qty_Per: 'QTY_PER', Scrap_Pct: 'SCRAP' }) }] },
      production_orders: { sources: [{ file: F, sheet: 'WORKORDERS', columns: c({ Production_Order_ID: 'WO_NO', Item_ID: 'ITEM_NO', Planned_Start_Date: 'SCHED_START', Planned_Finish_Date: 'SCHED_END',
        Actual_Start_Date: 'ACT_START', Actual_Finish_Date: 'ACT_END', Planned_Qty: 'QTY', Completed_Qty: 'QTY_DONE', Status: 'WO_STAT' }) }] } },
    dataset: { Business_Name: 'Harbour Valve Engineering Ltd', Business_Type: 'Manufacturer', Snapshot_Date: '2026-10-31' } });
}

// ================= Fault cases =================
{
  const base = ['items', 'stock', 'demand', 'suppliers', 'po_lines'];
  const T = {}; base.forEach(t => { T[t] = P(t); write('faults/base/' + t + '.csv', fs.readFileSync(path.join(P1, t + '.csv'))); });
  const GBP = { code: 'GBP', confirmed: true };
  const ident = (tables, files) => ({ format: 'CG-IMPORT-MAPPING', version: 1, name: 'fault case',
    files: Object.assign({ 'items.csv': { dateFormat: 'ISO', currency: GBP }, 'stock.csv': { dateFormat: 'ISO', currency: GBP }, 'demand.csv': { dateFormat: 'ISO' },
      'suppliers.csv': { dateFormat: 'ISO' }, 'po_lines.csv': { dateFormat: 'ISO', currency: GBP } }, files || {}),
    tables: Object.fromEntries(tables.map(t => [t, { sources: [{ file: t + '.csv', columns: Object.fromEntries(T[t].headers.map(h => [h, { source: h }])) }] }])),
    dataset: { Business_Name: 'Fault case (synthetic, from Package 01)', Business_Type: 'Manufacturer', Snapshot_Date: '2026-10-31' } });
  const caseOut = (name, files, mapping) => { for (const [f, tbl] of Object.entries(files)) write('faults/' + name + '/' + f, typeof tbl === 'string' ? tbl : toCSV(tbl.headers, tbl.rows)); writeJSON('faults/' + name + '/mapping.json', mapping); };
  const edit = (t, fn) => { const c = { headers: T[t].headers.slice(), rows: T[t].rows.map(r => r.slice()) }; fn(c); return c; };
  const ALL = ['items', 'stock', 'demand', 'suppliers', 'po_lines'];
  const dIdx = h => T.demand.headers.indexOf(h);
  const soldItems = [...new Set(T.demand.rows.map(r => r[dIdx('Item_ID')]))]; // in file order
  const rowsOf = (id, n) => T.demand.rows.map((r, i) => [r, i]).filter(([r]) => r[dIdx('Item_ID')] === id).slice(0, n).map(([, i]) => i);

  // Partial imports
  caseOut('F01-stock-bad-row', { 'stock.csv': edit('stock', c => { c.rows[5][c.headers.indexOf('On_Hand_Qty')] = 'abc'; }) }, ident(ALL));
  caseOut('F02-demand-2pct', { 'demand.csv': edit('demand', c => { soldItems.slice(0, 19).forEach(id => { c.rows[rowsOf(id, 8)[7]][dIdx('Units')] = 'n/a'; }); }) }, ident(ALL));
  caseOut('F03-demand-10pct', { 'demand.csv': edit('demand', c => { soldItems.slice(0, 24).forEach(id => rowsOf(id, 4).forEach(i => { c.rows[i][dIdx('Units')] = 'n/a'; })); }) }, ident(ALL));
  caseOut('F04-item-months', { 'demand.csv': edit('demand', c => { rowsOf(soldItems[0], 2).forEach(i => { c.rows[i][dIdx('Units')] = 'n/a'; }); c.rows[rowsOf(soldItems[1], 1)[0]][dIdx('Units')] = 'n/a'; }) }, ident(ALL));
  // Small table (10 items x 12 months = 120 rows): 6 bad rows = exactly 5.0% (crossed); 5 bad rows = 4.2% (not crossed). One month per item.
  {
    const ten = soldItems.slice(0, 10);
    const small = edit('demand', c => { c.rows = c.rows.filter(r => ten.includes(r[dIdx('Item_ID')]) && r[dIdx('Period_Start')] >= '2025-11-01'); });
    const bad = n => { const x = { headers: small.headers, rows: small.rows.map(r => r.slice()) }; ten.slice(0, n).forEach(id => { x.rows[x.rows.findIndex(r => r[dIdx('Item_ID')] === id)][dIdx('Units')] = 'n/a'; }); return x; };
    caseOut('F05a-small-table-5pct', { 'demand.csv': bad(6) }, ident(ALL));
    caseOut('F05b-small-table-4pct', { 'demand.csv': bad(5) }, ident(ALL));
  }
  caseOut('F06-no-po-table', {}, ident(['items', 'stock', 'demand', 'suppliers']));
  caseOut('F07-cost-tbc', { 'items.csv': edit('items', c => { c.rows[3][c.headers.indexOf('Standard_Cost')] = 'TBC'; }) }, ident(ALL));
  // Duplicates
  caseOut('F08-dup-demand-identical', { 'demand.csv': edit('demand', c => { c.rows.push(c.rows[30].slice()); }) }, ident(ALL));
  {
    const withBin = edit('stock', c => { c.headers.push('Bin'); c.rows.forEach(r => r.push('A-01')); const copy = c.rows[2].slice(); copy[copy.length - 1] = 'B-07'; c.rows.push(copy); });
    const m = ident(ALL); m.tables.stock.sources[0].ignore = ['Bin']; delete m.tables.stock.sources[0].columns.Bin;
    caseOut('F09-dup-differs-unmapped', { 'stock.csv': withBin }, m);
  }
  caseOut('F10-dup-po-with-id', { 'po_lines.csv': edit('po_lines', c => { c.rows.push(c.rows[7].slice()); }) }, ident(ALL));
  {
    const noLine = edit('po_lines', c => { const li = c.headers.indexOf('Line_No'); c.headers.splice(li, 1); c.rows.forEach(r => r.splice(li, 1)); c.rows.push(c.rows[7].slice()); });
    const m = ident(ALL); delete m.tables.po_lines.sources[0].columns.Line_No;
    caseOut('F11-dup-po-no-id', { 'po_lines.csv': noLine }, m);
  }
  caseOut('F12-dup-item-conflict', { 'items.csv': edit('items', c => { const x = c.rows[0].slice(); x[c.headers.indexOf('Item_Name')] = 'Different name'; c.rows.push(x); c.rows.push(c.rows[1].slice()); }) }, ident(ALL));
  // Currency
  caseOut('F13-currency-usd', {}, ident(ALL, { 'items.csv': { dateFormat: 'ISO', currency: { code: 'USD', confirmed: true } } }));
  caseOut('F14-currency-dollar-value', { 'stock.csv': edit('stock', c => { c.rows[0][c.headers.indexOf('Unit_Cost')] = '$46.10'; }) }, ident(ALL));
  caseOut('F15-currency-unconfirmed', {}, ident(ALL, { 'po_lines.csv': { dateFormat: 'ISO', currency: { code: 'GBP', confirmed: false } } }));
  caseOut('F16-currency-undeclared', {}, ident(ALL, { 'stock.csv': { dateFormat: 'ISO' } }));
  {
    const m = ident(ALL, { 'items.csv': { dateFormat: 'ISO' }, 'stock.csv': { dateFormat: 'ISO' }, 'po_lines.csv': { dateFormat: 'ISO' } });
    delete m.tables.items.sources[0].columns.Standard_Cost; delete m.tables.items.sources[0].columns.Selling_Price; m.tables.items.sources[0].ignore = ['Standard_Cost', 'Selling_Price'];
    delete m.tables.stock.sources[0].columns.Unit_Cost; m.tables.stock.sources[0].ignore = ['Unit_Cost'];
    delete m.tables.po_lines.sources[0].columns.Unit_Cost; m.tables.po_lines.sources[0].ignore = ['Unit_Cost'];
    caseOut('F17-no-money-no-currency', {}, m);
  }
  // Units: stock file with a unit column; P0001 rows in 'box', M0001 rows 'EA', everything else 'each'
  {
    const withUnit = edit('stock', c => { const ii = c.headers.indexOf('Item_ID'); c.headers.push('UOM'); c.rows.forEach(r => r.push(r[ii] === 'P0001' ? 'box' : r[ii] === 'M0001' ? 'EA' : 'Each')); });
    const m = ident(ALL); m.tables.stock.sources[0].columns['@Unit'] = { source: 'UOM' };
    caseOut('F18-unit-mismatch', { 'stock.csv': withUnit }, m);
  }
  // Failure and recovery
  // The items source is renamed to the faulty file in these mappings, so the failure reaches the import as it would for a user.
  const itemsFrom = (file, fmt) => { const m = ident(ALL); delete m.files['items.csv']; m.files[file] = { dateFormat: 'ISO', currency: GBP }; m.tables.items.sources[0].file = file; return m; };
  caseOut('F19-corrupt-xlsx', { 'items.xlsx': 'PK\u0003\u0004 this is not a real workbook ' + 'x'.repeat(200) }, itemsFrom('items.xlsx'));
  caseOut('F20-not-a-zip-xlsx', { 'items.xlsx': 'Item_ID,Item_Name\r\nP1,Thing\r\n' }, itemsFrom('items.xlsx'));
  caseOut('F21-wrong-type', { 'items.pdf': '%PDF-1.4 not a spreadsheet\n' }, itemsFrom('items.pdf'));
  caseOut('F22-empty-file', { 'items.csv': '' }, ident(ALL));
  caseOut('F23-headings-only', { 'items.csv': T.items.headers.join(',') + '\r\n' }, ident(ALL));
  caseOut('F24-missing-column', { 'stock.csv': edit('stock', c => { const k = c.headers.indexOf('On_Hand_Qty'); c.headers.splice(k, 1); c.rows.forEach(r => r.splice(k, 1)); }) }, ident(ALL));

  // ---- Stage 1 correction pass (owner, 13 Nov 2026) ----
  // D1 currency classification of money fields (stock Unit_Cost / items Standard_Cost); the numbers are the base values.
  const sCost = T.stock.headers.indexOf('Unit_Cost'), iCost = T.items.headers.indexOf('Standard_Cost');
  const costRows = T.stock.rows.map((r, i) => [r, i]).filter(([r]) => r[sCost] !== '').map(([, i]) => i);
  const stockCost = fns => edit('stock', c => fns.forEach((fn, k) => { const i = costRows[k]; c.rows[i][sCost] = fn(c.rows[i][sCost]); }));
  caseOut('F25-currency-gbp-codes', { 'stock.csv': stockCost([v => 'GBP ' + v, v => v + ' GBP', v => v + 'GBP', v => 'gbp ' + v, v => v + ' £']) }, ident(ALL));
  caseOut('F26-currency-code-after', { 'stock.csv': stockCost([v => v + ' USD']) }, ident(ALL));
  caseOut('F27-currency-ordinary-text', { 'stock.csv': stockCost([v => v + ' apples', () => 'BOX 12', () => '46p']) }, ident(ALL));
  caseOut('F28-currency-separate-files', { 'items.csv': edit('items', c => { c.rows[0][iCost] = 'EUR ' + c.rows[0][iCost]; }) }, ident(ALL));
  caseOut('F29-currency-contradictory', { 'stock.csv': stockCost([v => '£' + v + ' USD', v => 'GBP ' + v + ' USD']) }, ident(ALL));
  // Q2/Q13: P0001's first 3 months written "P-0001" (one candidate); one row written "Q1" where items "Q-1" and "Q 1" both exist (two candidates).
  {
    const iId = T.items.headers.indexOf('Item_ID');
    const items2 = edit('items', c => { ['Q-1', 'Q 1'].forEach(id => { const x = c.rows[0].slice(); x[iId] = id; c.rows.push(x); }); });
    const dem = edit('demand', c => { rowsOf(soldItems[0], 3).forEach(i => { c.rows[i][dIdx('Item_ID')] = 'P-0001'; }); c.rows[rowsOf(soldItems[1], 1)[0]][dIdx('Item_ID')] = 'Q1'; });
    caseOut('F30-history-suggested-code', { 'items.csv': items2, 'demand.csv': dem }, ident(ALL));
  }
  // Q3 Option A: rejected rows whose codes match no item (no candidate) at 6.04% (58/960), 3.96% (38/960) and exactly 5.0% (6/120).
  const unknownCodes = (c, n) => { for (let i = 0; i < n; i++) c.rows[i][dIdx('Item_ID')] = 'ZZ' + String(i + 1).padStart(3, '0'); };
  caseOut('F31-history-unlinked-6pct', { 'demand.csv': edit('demand', c => unknownCodes(c, 58)) }, ident(ALL));
  caseOut('F32-history-unlinked-4pct', { 'demand.csv': edit('demand', c => unknownCodes(c, 38)) }, ident(ALL));
  {
    const ten = soldItems.slice(0, 10);
    const small = edit('demand', c => { c.rows = c.rows.filter(r => ten.includes(r[dIdx('Item_ID')]) && r[dIdx('Period_Start')] >= '2025-11-01'); unknownCodes(c, 6); });
    caseOut('F35-history-unlinked-5pct-exact', { 'demand.csv': small }, ident(ALL));
  }
  // Q3 with every rejected row linked through a single suggestion (58/960 = 6.04%): items blocked individually, analysis not blocked.
  caseOut('F36-history-linked-6pct', { 'demand.csv': edit('demand', c => { for (let i = 0; i < 58; i++) c.rows[i][dIdx('Item_ID')] = c.rows[i][dIdx('Item_ID')].replace(/^P/, 'P-'); }) }, ident(ALL));
  // Q6: demand rows after the snapshot (2026-10-31), incl. blank Units (future forecast rows) and an unreadable quantity.
  caseOut('F33-future-dated', { 'demand.csv': edit('demand', c => { c.rows.push(['P0001', '2026-11-01', '500', '500', ''], ['P0001', '2026-12-01', '', '300', ''], ['P0002', '2027-01-01', '', '250', ''], ['P0003', '2026-12-01', 'n/a', '', '']); }) }, ident(ALL));
  // Q14: one stock row dated the day before the snapshot.
  caseOut('F34-stock-date-mismatch', { 'stock.csv': edit('stock', c => { c.rows[0][c.headers.indexOf('Snapshot_Date')] = '2026-10-30'; }) }, ident(ALL));
}
console.log('fixtures written to ' + OUT);
