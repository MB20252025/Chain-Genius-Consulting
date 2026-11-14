/* Chain Genius – Supply Chain Intelligence Engine, Universal Data Import v1, Stage 2 (K1)
 * import/engine-map.js — the engine map: which canonical table and field fills each column of the eight-sheet workbook the
 * existing engine reads (js/calculations.js analyse()), and which canonical fields the engine never consumes.
 *
 * DATA ONLY. No logic, no asynchronous code, no network access, no browser storage, no engine globals. Adds CGImport.engineMap.
 * Read by engine-workbook.js (K2), the adapter (K3) and the Stage 2 tests (K5). Load after canonical.js.
 *
 * Sheets and columns are listed in the engine's sheet order and in the column order of the standard (Northstar) workbook.
 * Each column entry:
 *   column  the engine workbook column name
 *   field   the canonical field of the sheet's table that fills it, or null when the canonical model cannot supply it
 *   read    'name'    the engine reads this column by name (js/calculations.js)
 *           'generic' the engine reads it only through its whole-sheet checks (empty and missing values in every column,
 *                     whole-row comparison of purchase-order lines) and the raw rows it keeps; never by name
 *   reason  why a column is not supplied (field null only)
 * A sheet's `select` lists the canonical values a row must have to belong on that sheet. A row of the table that matches no
 * sheet is not written by engine-workbook.js; it is reported, never silently dropped.
 */
(function (NS) {
  'use strict';
  const deepFreeze = o => { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); Object.values(o).forEach(deepFreeze); } return o; };
  const c = (column, field, read, reason) => (reason ? { column, field, read, reason } : { column, field, read });

  const SHEETS = [
    { sheet: 'Products', table: 'items', select: { Replenishment: 'Make', Is_Sold: 'Y' }, key: ['SKU'], columns: [
      c('SKU', 'Item_ID', 'name'), c('Product_Name', 'Item_Name', 'name'), c('Product_Family', 'Item_Group', 'name'),
      c('Unit_of_Measure', 'Unit_of_Measure', 'name'), c('Standard_Cost_GBP', 'Standard_Cost', 'name'),
      c('Selling_Price_GBP', 'Selling_Price', 'name'), c('Active_YN', 'Active', 'generic')] },
    { sheet: 'Materials', table: 'items', select: { Replenishment: 'Buy', Is_Sold: 'N' }, key: ['Material_ID'], columns: [
      c('Material_ID', 'Item_ID', 'name'), c('Material_Name', 'Item_Name', 'name'), c('Unit_of_Measure', 'Unit_of_Measure', 'name'),
      c('Standard_Cost_GBP', 'Standard_Cost', 'name'), c('Default_Supplier_ID', 'Default_Supplier_ID', 'name'),
      c('Lead_Time_Days', 'Purchase_Lead_Time_Days', 'name'), c('Minimum_Order_Qty', 'Min_Order_Qty', 'name'),
      c('Active_YN', 'Active', 'generic')] },
    { sheet: 'BOM', table: 'bom', key: ['SKU', 'Material_ID'], columns: [
      c('SKU', 'Parent_Item_ID', 'name'), c('Material_ID', 'Component_Item_ID', 'name'),
      c('Qty_Per_Finished_Unit', 'Qty_Per', 'name'), c('Scrap_Factor_Pct', 'Scrap_Pct', 'name')] },
    { sheet: 'Demand History', table: 'demand', key: ['SKU', 'Month_Start'], columns: [
      c('Month_Start', 'Period_Start', 'name'), c('SKU', 'Item_ID', 'name'), c('Units_Sold', 'Units', 'name'),
      c('Customer_Orders', null, 'generic', 'No canonical field holds a count of customer orders, and the engine never reads this column by name.'),
      c('Forecast_Units', 'Forecast_Units', 'name')] },
    { sheet: 'Inventory', table: 'stock', key: ['Item_ID'], columns: [
      c('Snapshot_Date', 'Snapshot_Date', 'name'),
      c('Item_Type', null, 'generic', 'The engine never reads it by name and places items by sheet. Writing it would mean deriving a value the source did not supply.'),
      c('Item_ID', 'Item_ID', 'name'), c('On_Hand_Qty', 'On_Hand_Qty', 'name'), c('Allocated_Qty', 'Allocated_Qty', 'name'),
      c('On_Order_Qty', 'On_Order_Qty', 'name'), c('Reorder_Point_Qty', 'Reorder_Point_Qty', 'name'),
      c('Safety_Stock_Qty', 'Safety_Stock_Qty', 'name'), c('Unit_Cost_GBP', 'Unit_Cost', 'name'),
      c('Location', null, 'generic', 'The engine never reads it by name, and the Engine View holds one row per item summed over eligible locations (B1, B6), so no single location applies. Locations stay in the canonical stock rows and the adapter report.')] },
    { sheet: 'Suppliers', table: 'suppliers', key: ['Supplier_ID'], columns: [
      c('Supplier_ID', 'Supplier_ID', 'name'), c('Supplier_Name', 'Supplier_Name', 'name'), c('Country', 'Country', 'generic'),
      c('Standard_Lead_Time_Days', 'Standard_Lead_Time_Days', 'name'), c('Payment_Terms', 'Payment_Terms', 'generic'),
      c('Active_YN', 'Active', 'generic')] },
    { sheet: 'Purchase Orders', table: 'po_lines', key: null, columns: [
      c('PO_ID', 'PO_ID', 'name'), c('Supplier_ID', 'Supplier_ID', 'name'), c('Material_ID', 'Item_ID', 'name'),
      c('Order_Date', 'Order_Date', 'name'), c('Promised_Date', 'Promised_Date', 'name'), c('Received_Date', 'Last_Receipt_Date', 'name'),
      c('Ordered_Qty', 'Ordered_Qty', 'name'), c('Received_Qty', 'Received_Qty', 'name'), c('Unit_Cost_GBP', 'Unit_Cost', 'name'),
      c('PO_Status', 'Status', 'name')] },
    { sheet: 'Production Orders', table: 'production_orders', key: ['Production_Order_ID'], columns: [
      c('Production_Order_ID', 'Production_Order_ID', 'name'), c('SKU', 'Item_ID', 'name'),
      c('Planned_Start_Date', 'Planned_Start_Date', 'name'), c('Planned_Finish_Date', 'Planned_Finish_Date', 'name'),
      c('Actual_Start_Date', 'Actual_Start_Date', 'name'), c('Actual_Finish_Date', 'Actual_Finish_Date', 'name'),
      c('Planned_Qty', 'Planned_Qty', 'name'), c('Completed_Qty', 'Completed_Qty', 'name'),
      c('Production_Line_ID', null, 'generic', 'No canonical field holds a production line, and the engine never reads this column by name.'),
      c('Order_Status', 'Status', 'name')] }
  ];

  // Canonical fields used only to choose a row's sheet (never written as a column).
  const SELECTORS = [
    { table: 'items', field: 'Is_Sold', reason: 'Chooses Products (sold) or Materials (not sold).' },
    { table: 'items', field: 'Replenishment', reason: 'Chooses Products (Make) or Materials (Buy).' }
  ];

  // Canonical fields the engine never consumes. Every canonical field is mapped, a selector or listed here.
  const nc = (table, field, reason) => ({ table, field, reason });
  const DATASET = 'Dataset-level metadata. The engine has no dataset sheet; the adapter report and provenance carry it.';
  const NOT_CONSUMED = [
    ...['Format_Version', 'Business_Name', 'Business_Type', 'Snapshot_Date', 'Currency', 'Demand_Basis', 'Date_Format_By_File', 'Source_Files', 'Mapping_Name']
      .map(f => nc('dataset', f, f === 'Currency' ? 'The engine assumes GBP. Financial permission comes from permissions.financial, never from this label (Stage 1 record, D7).'
        : f === 'Snapshot_Date' ? 'The engine takes the snapshot date from the Inventory sheet (stock.Snapshot_Date).' : DATASET)),
    nc('items', 'Production_Lead_Time_Days', 'The Products sheet has no lead-time column; the engine uses production history or its 7-day setting.'),
    nc('items', 'Order_Multiple', 'The Materials sheet has no order-multiple column.'),
    ...['Location_ID', 'Location_Name', 'Include_In_Available'].map(f => nc('locations', f, 'The engine has no locations sheet. The adapter uses it to decide which stock rows count (B1).')),
    nc('stock', 'Location_ID', 'The adapter sums an item\'s eligible locations into one Engine View row (B1, B6); the engine has no location column it reads.'),
    nc('demand', 'Location_ID', 'The engine\'s demand history has no location; per-location rows are summed by the adapter.'),
    ...['SO_ID', 'Line_No', 'Customer_ID', 'Item_ID', 'Order_Date', 'Requested_Date', 'Ordered_Qty', 'Shipped_Qty', 'Last_Ship_Date', 'Status', 'Cancel_Reason']
      .map(f => nc('sales_lines', f, 'The engine has no sales-line sheet. The adapter converts shipped quantities into monthly demand (M1 D14).')),
    ...['Supplier_ID', 'Item_ID', 'Lead_Time_Days', 'Unit_Cost', 'Min_Order_Qty', 'Preferred']
      .map(f => nc('supplier_items', f, 'The engine has no supplier-item sheet.')),
    ...['PO_ID', 'Supplier_ID', 'Order_Date', 'Currency', 'Freight', 'Tax', 'Header_Total', 'Status']
      .map(f => nc('po_headers', f, 'The engine reads purchase-order lines only.')),
    nc('po_lines', 'Line_No', 'The engine\'s Purchase Orders sheet has no line-number column; it treats each row as one order line.'),
    nc('po_lines', 'Location_ID', 'The engine\'s Purchase Orders sheet has no location column.')
  ];

  NS.engineMap = deepFreeze({
    VERSION: 'EM1',
    CANONICAL_VERSION: 'CDv1',
    ENGINE: 'v0.7 js/calculations.js analyse()',
    SHEETS, SELECTORS, NOT_CONSUMED
  });
})(globalThis.CGImport = globalThis.CGImport || {});
