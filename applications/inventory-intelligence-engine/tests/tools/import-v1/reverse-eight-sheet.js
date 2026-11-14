/* Chain Genius – Universal Data Import v1, Stage 2 (K5) — TEST-ONLY tool. Never loaded by the application (index.html).
 * tests/tools/import-v1/reverse-eight-sheet.js — turns an existing eight-sheet engine workbook (Northstar layout) into canonical
 * CSV texts plus an identity mapping, in memory, so Proof A can send the same data through Stage 1 and the adapter and compare
 * the engine's answer with the direct upload. It writes no files.
 *
 * Load into the SAME JavaScript context as the bundled SheetJS and the import modules (the browser's single context).
 * Adds globalThis.CGTestTools.reverseEightSheet(workbook) -> { files: [{ name, text }], mapping, counts }.
 *
 * Rules (each one is a test assumption, recorded here so it can be challenged):
 *  - Products -> items (Replenishment Make, Is_Sold Y); Materials -> items (Buy, N). Column renames follow engine-map.js.
 *  - A canonical column is written only when the source sheet has the source column, so "absent" stays "absent".
 *  - Inventory.Location values become locations with Include_In_Available Y (every Northstar-layout location is in use).
 *  - Purchase Orders get Line_No "1": the engine layout has one row per order line and no line number.
 *  - dataset.Demand_Basis = "shipments": the engine's Demand History column is Units_Sold, which the direct upload treats as
 *    history. M1 D14 requires the label; the engine layout cannot carry it, so the test states it here.
 *  - Dates: a date cell becomes its calendar date (the engine's own calDate rule), ISO text.
 */
(function (G) {
  'use strict';
  const isDate = v => Object.prototype.toString.call(v) === '[object Date]';
  const iso = d => isDate(d) ? new Date(Math.round((d.getTime() - d.getTimezoneOffset() * 6e4) / 864e5) * 864e5).toISOString().slice(0, 10) : d;
  const cell = v => v === undefined || v === null ? '' : (s => /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s)(String(iso(v)));

  function reverseEightSheet(wb) {
    const X = G.XLSX, I = G.CGImport;
    const S = n => wb.Sheets[n] ? X.utils.sheet_to_json(wb.Sheets[n], { raw: true, cellDates: true }) : [];
    const H = n => wb.Sheets[n] ? (X.utils.sheet_to_json(wb.Sheets[n], { header: 1 })[0] || []) : [];
    const T = {};
    // spec: [canonical column, source sheet column | constant fn]; a source column absent from the sheet drops the canonical column.
    const put = (table, sheet, spec, rows, always) => {
      const h = H(sheet), cols = spec.filter(([cc, s]) => typeof s === 'function' || h.includes(s) || (always || []).includes(cc));
      const out = rows.map(r => cols.map(([, s]) => typeof s === 'function' ? s(r) : r[s]));
      if (!T[table]) T[table] = { cols: cols.map(c => c[0]), rows: [] };
      else if (T[table].cols.join() !== cols.map(c => c[0]).join()) {   // items from two sheets: align on the union of columns
        const all = [...new Set([...T[table].cols, ...cols.map(c => c[0])])];
        T[table].rows = T[table].rows.map(r => all.map(cc => { const i = T[table].cols.indexOf(cc); return i < 0 ? undefined : r[i]; }));
        T[table].cols = all;
      }
      T[table].rows.push(...out.map(r => T[table].cols.map(cc => { const i = cols.findIndex(c => c[0] === cc); return i < 0 ? undefined : r[i]; })));
    };
    put('items', 'Products', [['Item_ID', 'SKU'], ['Item_Name', 'Product_Name'], ['Item_Group', 'Product_Family'], ['Is_Sold', () => 'Y'], ['Replenishment', () => 'Make'],
      ['Unit_of_Measure', 'Unit_of_Measure'], ['Standard_Cost', 'Standard_Cost_GBP'], ['Selling_Price', 'Selling_Price_GBP'], ['Active', 'Active_YN']], S('Products'));
    put('items', 'Materials', [['Item_ID', 'Material_ID'], ['Item_Name', 'Material_Name'], ['Is_Sold', () => 'N'], ['Replenishment', () => 'Buy'],
      ['Unit_of_Measure', 'Unit_of_Measure'], ['Standard_Cost', 'Standard_Cost_GBP'], ['Default_Supplier_ID', 'Default_Supplier_ID'],
      ['Purchase_Lead_Time_Days', 'Lead_Time_Days'], ['Min_Order_Qty', 'Minimum_Order_Qty'], ['Active', 'Active_YN']], S('Materials'));
    const inv = S('Inventory'), locs = [...new Set(inv.map(r => r.Location).filter(v => v !== undefined && v !== null && v !== ''))];
    if (locs.length) T.locations = { cols: ['Location_ID', 'Location_Name', 'Include_In_Available'], rows: locs.map(l => [l, l, 'Y']) };
    put('stock', 'Inventory', [['Item_ID', 'Item_ID'], ['Location_ID', 'Location'], ['Snapshot_Date', 'Snapshot_Date'], ['On_Hand_Qty', 'On_Hand_Qty'], ['Allocated_Qty', 'Allocated_Qty'],
      ['On_Order_Qty', 'On_Order_Qty'], ['Reorder_Point_Qty', 'Reorder_Point_Qty'], ['Safety_Stock_Qty', 'Safety_Stock_Qty'], ['Unit_Cost', 'Unit_Cost_GBP']], inv);
    put('demand', 'Demand History', [['Item_ID', 'SKU'], ['Period_Start', 'Month_Start'], ['Units', 'Units_Sold'], ['Forecast_Units', 'Forecast_Units']], S('Demand History'));
    put('suppliers', 'Suppliers', [['Supplier_ID', 'Supplier_ID'], ['Supplier_Name', 'Supplier_Name'], ['Standard_Lead_Time_Days', 'Standard_Lead_Time_Days'],
      ['Country', 'Country'], ['Payment_Terms', 'Payment_Terms'], ['Active', 'Active_YN']], S('Suppliers'));
    put('po_lines', 'Purchase Orders', [['PO_ID', 'PO_ID'], ['Line_No', () => '1'], ['Supplier_ID', 'Supplier_ID'], ['Item_ID', 'Material_ID'], ['Order_Date', 'Order_Date'],
      ['Promised_Date', 'Promised_Date'], ['Ordered_Qty', 'Ordered_Qty'], ['Received_Qty', 'Received_Qty'], ['Last_Receipt_Date', 'Received_Date'], ['Unit_Cost', 'Unit_Cost_GBP'], ['Status', 'PO_Status']], S('Purchase Orders'));
    put('bom', 'BOM', [['Parent_Item_ID', 'SKU'], ['Component_Item_ID', 'Material_ID'], ['Qty_Per', 'Qty_Per_Finished_Unit'], ['Scrap_Pct', 'Scrap_Factor_Pct']], S('BOM'));
    put('production_orders', 'Production Orders', [['Production_Order_ID', 'Production_Order_ID'], ['Item_ID', 'SKU'], ['Planned_Start_Date', 'Planned_Start_Date'],
      ['Planned_Finish_Date', 'Planned_Finish_Date'], ['Actual_Start_Date', 'Actual_Start_Date'], ['Actual_Finish_Date', 'Actual_Finish_Date'],
      ['Planned_Qty', 'Planned_Qty'], ['Completed_Qty', 'Completed_Qty'], ['Status', 'Order_Status']], S('Production Orders'));
    const snap = inv.find(r => r.Snapshot_Date !== undefined);
    T.dataset = { cols: ['Format_Version', 'Snapshot_Date', 'Currency', 'Demand_Basis'], rows: [['CDv1', snap ? snap.Snapshot_Date : undefined, 'GBP', 'shipments']] };
    for (const t of Object.keys(T)) if (!T[t].rows.length && t !== 'dataset') delete T[t];
    const files = Object.entries(T).map(([t, { cols, rows }]) => ({ name: t + '.csv', text: [cols.join(','), ...rows.map(r => r.map(cell).join(','))].join('\n') + '\n' }));
    const mapping = { format: 'CG-IMPORT-MAPPING', version: 1, name: 'reverse-eight-sheet (test)', files: {}, tables: {} };
    for (const f of files) {
      const t = f.name.slice(0, -4), tbl = I.read.fromCSVText(f.text, f.name);
      mapping.files[f.name] = Object.assign({ dateFormat: 'ISO' }, I.mapping.moneyFields(t).some(c => tbl.headers.includes(c)) ? { currency: { code: 'GBP', confirmed: true } } : {});
      mapping.tables[t] = { sources: [{ file: f.name, columns: Object.fromEntries(tbl.headers.filter(h => I.canonical.field(t, h)).map(h => [h, { source: h }])) }] };
    }
    return { files, mapping, counts: Object.fromEntries(Object.entries(T).map(([t, v]) => [t, v.rows.length])) };
  }
  G.CGTestTools = Object.freeze(Object.assign({}, G.CGTestTools || {}, { reverseEightSheet }));
})(globalThis);
