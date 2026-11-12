/* Chain Genius – Supply Chain Intelligence Engine, v0.7 M1 Stage 1 (A2)
 * import/canonical.js — Canonical Dataset v1 (CDv1): table and field definitions, and a structural check of canonical rows.
 *
 * Plain script, no build step, no asynchronous code. Works in the browser and in Node tests. Adds CGImport.canonical.
 * It does not touch the engine or any engine global (CFG, WB, R).
 *
 * Canonical values are plain JavaScript values:
 *   id    : string, kept exactly as supplied after trimming (leading zeros preserved)
 *   text  : string
 *   num   : finite number
 *   date  : ISO 'YYYY-MM-DD' string (never a Date object, so no time-zone shift is possible)
 *   flag  : 'Y' or 'N'
 *   enum  : one of the listed values
 *   pct   : fraction 0..1 (5% is 0.05)
 * Missing values are null. A missing value is never replaced by 0.
 *
 * onInvalid says what happens when a supplied value cannot be cleaned (decided in the approved design):
 *   'reject-row'  the row is rejected and listed (quantities, dates, identifiers)
 *   'blank-flag'  the row is kept, the field becomes null and is flagged (costs, prices, descriptive fields)
 * neg: 'no' (negative is invalid), 'flag' (kept as entered and flagged, e.g. negative stock), 'yes' (allowed)
 */
(function (NS) {
  'use strict';
  const F = (name, type, req, extra) => Object.assign({ name, type, req: !!req, onInvalid: 'reject-row', neg: 'no' }, extra || {});
  const cost = (name) => F(name, 'num', false, { onInvalid: 'blank-flag' });

  const TABLES = {
    dataset: { key: [], required: true, fields: [
      F('Format_Version', 'text', true), F('Business_Name', 'text', false, { onInvalid: 'blank-flag' }),
      F('Business_Type', 'text', false, { onInvalid: 'blank-flag' }), F('Snapshot_Date', 'date', true), F('Currency', 'enum', true, { values: ['GBP'] }),
      F('Demand_Basis', 'enum', false, { values: ['shipments', 'orders'], onInvalid: 'blank-flag' }),
      F('Date_Format_By_File', 'text', false, { onInvalid: 'blank-flag' }), F('Source_Files', 'text', false, { onInvalid: 'blank-flag' }),
      F('Mapping_Name', 'text', false, { onInvalid: 'blank-flag' })] },
    items: { key: ['Item_ID'], required: true, fields: [
      F('Item_ID', 'id', true), F('Item_Name', 'text', true, { onInvalid: 'blank-flag' }), F('Item_Group', 'text', false, { onInvalid: 'blank-flag' }),
      F('Is_Sold', 'flag', true), F('Replenishment', 'enum', true, { values: ['Make', 'Buy'] }), F('Unit_of_Measure', 'text', false, { onInvalid: 'blank-flag' }),
      cost('Standard_Cost'), cost('Selling_Price'), F('Default_Supplier_ID', 'id', false, { onInvalid: 'blank-flag' }),
      F('Purchase_Lead_Time_Days', 'num', false, { onInvalid: 'blank-flag' }), F('Production_Lead_Time_Days', 'num', false, { onInvalid: 'blank-flag' }),
      F('Min_Order_Qty', 'num', false, { onInvalid: 'blank-flag' }), F('Order_Multiple', 'num', false, { onInvalid: 'blank-flag' }),
      F('Active', 'flag', false, { onInvalid: 'blank-flag' })] },
    locations: { key: ['Location_ID'], required: false, fields: [
      F('Location_ID', 'id', true), F('Location_Name', 'text', false, { onInvalid: 'blank-flag' }), F('Include_In_Available', 'flag', false, { onInvalid: 'blank-flag' })] },
    stock: { key: ['Item_ID', 'Location_ID'], required: true, fields: [
      F('Item_ID', 'id', true), F('Location_ID', 'id', false), F('Snapshot_Date', 'date', true),
      F('On_Hand_Qty', 'num', true, { neg: 'flag' }), F('Allocated_Qty', 'num', false), F('On_Order_Qty', 'num', false),
      F('Reorder_Point_Qty', 'num', false), F('Safety_Stock_Qty', 'num', false), cost('Unit_Cost')] },
    demand: { key: ['Item_ID', 'Period_Start', 'Location_ID'], required: false, fields: [
      F('Item_ID', 'id', true), F('Period_Start', 'date', true), F('Units', 'num', true), F('Forecast_Units', 'num', false, { onInvalid: 'blank-flag' }),
      F('Location_ID', 'id', false)] },
    sales_lines: { key: ['SO_ID', 'Line_No'], required: false, fields: [
      F('SO_ID', 'id', true), F('Line_No', 'id', false), F('Customer_ID', 'id', false, { onInvalid: 'blank-flag' }), F('Item_ID', 'id', true),
      F('Order_Date', 'date', true), F('Requested_Date', 'date', false), F('Ordered_Qty', 'num', true), F('Shipped_Qty', 'num', false),
      F('Last_Ship_Date', 'date', false), F('Status', 'text', false), F('Cancel_Reason', 'text', false, { onInvalid: 'blank-flag' })] },
    suppliers: { key: ['Supplier_ID'], required: false, fields: [
      F('Supplier_ID', 'id', true), F('Supplier_Name', 'text', false, { onInvalid: 'blank-flag' }),
      F('Standard_Lead_Time_Days', 'num', false, { onInvalid: 'blank-flag' }), F('Country', 'text', false, { onInvalid: 'blank-flag' }),
      F('Payment_Terms', 'text', false, { onInvalid: 'blank-flag' }), F('Active', 'flag', false, { onInvalid: 'blank-flag' })] },
    supplier_items: { key: ['Supplier_ID', 'Item_ID'], required: false, fields: [
      F('Supplier_ID', 'id', true), F('Item_ID', 'id', true), F('Lead_Time_Days', 'num', false, { onInvalid: 'blank-flag' }), cost('Unit_Cost'),
      F('Min_Order_Qty', 'num', false, { onInvalid: 'blank-flag' }), F('Preferred', 'flag', false, { onInvalid: 'blank-flag' })] },
    po_headers: { key: ['PO_ID'], required: false, fields: [
      F('PO_ID', 'id', true), F('Supplier_ID', 'id', true), F('Order_Date', 'date', true), F('Currency', 'text', false, { onInvalid: 'blank-flag' }),
      cost('Freight'), cost('Tax'), cost('Header_Total'), F('Status', 'text', false)] },
    po_lines: { key: ['PO_ID', 'Line_No'], required: false, fields: [
      F('PO_ID', 'id', true), F('Line_No', 'id', false), F('Supplier_ID', 'id', true), F('Item_ID', 'id', true), F('Order_Date', 'date', true),
      F('Promised_Date', 'date', false), F('Ordered_Qty', 'num', true), F('Received_Qty', 'num', false), F('Last_Receipt_Date', 'date', false),
      cost('Unit_Cost'), F('Status', 'text', false), F('Location_ID', 'id', false)] },
    bom: { key: ['Parent_Item_ID', 'Component_Item_ID'], required: false, fields: [
      F('Parent_Item_ID', 'id', true), F('Component_Item_ID', 'id', true), F('Qty_Per', 'num', true), F('Scrap_Pct', 'pct', false, { onInvalid: 'blank-flag' })] },
    production_orders: { key: ['Production_Order_ID'], required: false, fields: [
      F('Production_Order_ID', 'id', true), F('Item_ID', 'id', true), F('Planned_Start_Date', 'date', false), F('Planned_Finish_Date', 'date', false),
      F('Actual_Start_Date', 'date', false), F('Actual_Finish_Date', 'date', false), F('Planned_Qty', 'num', true), F('Completed_Qty', 'num', false),
      F('Status', 'text', false)] }
  };
  Object.values(TABLES).forEach(t => { t.fields.forEach(Object.freeze); Object.freeze(t.fields); Object.freeze(t.key); });

  const ISO = /^\d{4}-\d{2}-\d{2}$/;
  const validISO = s => { if (!ISO.test(s)) return false; const [y, m, d] = s.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1, d)); return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d; };

  /* Structural check of rows that are already canonical (typed). Relationships, duplicate resolution and code mapping are Stage 2.
   * Returns { ok, problems: [{row, field, problem}], duplicateKeys: [key strings] }  ('row' is the index in the array). */
  function checkTable(name, rows) {
    const t = TABLES[name];
    if (!t) throw new Error('Unknown canonical table: ' + name);
    const problems = [], seen = new Map(), dup = [];
    rows.forEach((r, i) => {
      for (const k of Object.keys(r)) if (!t.fields.some(f => f.name === k) && !k.startsWith('__')) problems.push({ row: i, field: k, problem: 'unknown field' });
      for (const f of t.fields) {
        const v = r[f.name];
        if (v === null || v === undefined) { if (f.req) problems.push({ row: i, field: f.name, problem: 'required value missing' }); continue; }
        let bad = null;
        if (f.type === 'id' || f.type === 'text') { if (typeof v !== 'string' || (f.type === 'id' && (v === '' || v !== v.trim()))) bad = 'not a valid ' + f.type; }
        else if (f.type === 'num') { if (typeof v !== 'number' || !isFinite(v)) bad = 'not a number'; else if (v < 0 && f.neg === 'no') bad = 'negative not allowed'; }
        else if (f.type === 'pct') { if (typeof v !== 'number' || !(v >= 0 && v <= 1)) bad = 'not a fraction 0..1'; }
        else if (f.type === 'date') { if (typeof v !== 'string' || !validISO(v)) bad = 'not an ISO date'; }
        else if (f.type === 'flag') { if (v !== 'Y' && v !== 'N') bad = 'not Y/N'; }
        else if (f.type === 'enum') { if (!f.values.includes(v)) bad = 'not one of ' + f.values.join('/'); }
        if (bad) problems.push({ row: i, field: f.name, problem: bad });
      }
      if (t.key.length) {
        const k = t.key.map(x => r[x] == null ? '' : String(r[x]).toUpperCase()).join('\u0001');
        if (seen.has(k)) dup.push(t.key.map(x => r[x]).join(' / ')); else seen.set(k, i);
      }
    });
    return { ok: problems.length === 0, problems, duplicateKeys: dup };
  }

  NS.canonical = Object.freeze({ VERSION: 'CDv1', TABLES, tableNames: Object.keys(TABLES), field: (t, f) => TABLES[t].fields.find(x => x.name === f), checkTable, validISO });
})(globalThis.CGImport = globalThis.CGImport || {});
