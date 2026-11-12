"""Builds the six M1 test-data packages. Run: python build.py <outdir>"""
import sys
sys.dont_write_bytecode = True  # never leave __pycache__ files in the repository (set before the local modules are imported)
import csv, os, json, copy, shutil, zipfile, datetime as dt
from model import COLS, SNAP, MONTHS, d
from builders import build_manufacturer, build_distributor
import refcalc

OUT = sys.argv[1] if len(sys.argv) > 1 else '../out'
GEN_VERSION = 'M1 test-data library v1.0 (generated 12 Nov 2026, seed-deterministic)'
NOTICE = 'All businesses, people, products and figures in this package are fictional and synthetic. No real company data was used.'


def wcsv(path, cols, rows):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=cols, extrasaction='ignore', lineterminator='\n')
        w.writeheader()
        for r in rows:
            w.writerow(r)


def write_canonical(folder, tables, header):
    for name, cols in COLS.items():
        rows = tables.get(name)
        if rows is None:
            continue
        wcsv(os.path.join(folder, name + '.csv'), cols, rows)
    wcsv(os.path.join(folder, 'dataset.csv'), list(header), [header])


def header(name, btype, files):
    return dict(Format_Version='CDv1', Business_Name=name, Business_Type=btype, Snapshot_Date=d(SNAP), Currency='GBP',
                Date_Format_By_File='ISO (all files)', Source_Files=files, Mapping_Name='canonical (no mapping needed)')


def fmt_money(x):
    return f'£{x:,.2f}'


def expected_md(title, intro, res, seeded, extra=''):
    L = [f'# Expected results — {title}', '', NOTICE, '', intro, '',
         'Figures below were calculated by an independent reference calculator (`refcalc.py`) that reads only the CSV files in this package, '
         'using the formulas listed at the end. They are the agreed reference for M1–M6 tests. Where the engine uses a different, documented method '
         '(for example its own safety-stock or excess rules), engine figures may differ; any difference must be explained, not ignored.', '']
    L += ['## 1. What the importer should load', '', '| Table | Rows |', '| --- | --- |']
    L += [f'| {k} | {v} |' for k, v in res['row_counts'].items()]
    it = res['items']
    L += ['', f"Items: {it['total']} in total — {it['make']} Make, {it['buy_sold']} Buy (sold), {it['buy_not_sold_materials']} purchased materials/components, {it['inactive']} inactive.", '']
    I = res['integrity']
    L += ['Integrity (all should be empty for a clean dataset):', '']
    L += [f"- {k.replace('_', ' ')}: {', '.join(v) if v else 'none'}" for k, v in I.items()]
    s = res['stock']
    L += ['', '## 2. Stock and reconciliation', '', '| Location (included) | On hand |', '| --- | --- |']
    L += [f'| {k} | {v:,.0f} |' for k, v in s['on_hand_by_location_included'].items()]
    L += ['', f"- Business-wide on hand (negatives counted as 0): **{s['business_wide_on_hand_excluding_negatives']:,.0f}**",
          f"- Rows in excluded locations: {s['rows_in_excluded_locations']}",
          f"- Items with negative stock: {', '.join(s['items_with_negative_stock']) or 'none'}",
          f"- Stock value at cost: **{fmt_money(s['stock_value_at_cost_gbp'])}**",
          f"- Items excluded from value (no cost): {', '.join(s['items_excluded_from_value_no_cost']) or 'none'}", '']
    dm = res['demand']
    L += ['## 3. Demand', '', f"- Months of history: {dm['months_of_history']}", f"- Units sold in the last 12 months: **{dm['units_last_12_months_total']:,.0f}**",
          f"- Sold items with no demand history: {', '.join(dm['sold_items_with_no_demand_history']) or 'none'}", '']
    F = res['findings_reference']
    L += ['## 4. Operational findings the engine should identify', '', '### Seeded situations (deliberately built in)', '']
    L += [f'- **{a}** — {b}' for a, b in seeded] + ['']
    L += ['### Reference stock-out risk list (cover below lead time)', '', '| Item | Cover days | Lead time | Lead-time source |', '| --- | --- | --- | --- |']
    L += [f"| {x['item']} | {x['cover_days']} | {x['lead_time_days']:g} | {x['lead_time_source']} |" for x in F['stockout_risk']] or ['| none | | | |']
    L += ['', '### Reference excess (cover above 180 days)', '', '| Item | Cover days | Excess qty | Excess value |', '| --- | --- | --- | --- |']
    L += [f"| {x['item']} | {x['cover_days']} | {x['excess_qty']:,.0f} | {fmt_money(x['excess_value_gbp'])} |" for x in F['excess']] or ['| none | | | |']
    L += ['', f"- Total excess value: **{fmt_money(F['excess_value_gbp'])}** (cash tied up, not a loss)",
          f"- Dead stock (stock but no sales in 12 months): {', '.join(F['dead_stock_items']) or 'none'} — value **{fmt_money(F['dead_stock_value_gbp'])}**",
          f"- Items with no usable lead time: {', '.join(F['items_missing_lead_time']) or 'none'}", '']
    P = res['purchase_orders']
    L += ['## 5. Purchase orders and suppliers', '', '| Line state | Lines |', '| --- | --- |'] + [f'| {k} | {v} |' for k, v in P['line_states'].items()]
    L += ['', f"- Outstanding quantity (ordered − received, open lines): **{P['outstanding_qty_total']:,.0f}**",
          f"- Value of overdue outstanding quantity: **{fmt_money(P['overdue_outstanding_value_gbp'])}** (financial exposure, not a loss)",
          f"- Suppliers referenced but not listed: {', '.join(P['unlisted_suppliers_referenced']) or 'none'}", '',
          '| Supplier | Fully received | On time | Overdue open | OTD received-only | OTD incl. overdue |', '| --- | --- | --- | --- | --- | --- |']
    for sid, v in P['suppliers'].items():
        f = lambda x: '—' if x is None else f'{x}%'
        L.append(f"| {sid}{'' if v['listed'] else ' (unlisted)'} | {v['fully_received']} | {v['on_time']} | {v['overdue_open']} | {f(v['otd_received_only_pct'])} | {f(v['otd_including_overdue_pct'])} |")
    L += ['', extra, '', '## 6. Regression use', '',
          '- The machine-readable copy of every figure is in `expected-results.json`. Future tests compare against it; any change must be explained and approved.',
          '- Re-running `refcalc.py` on these CSVs must reproduce this file exactly.', '',
          '## Formulas used', '', '```', refcalc.__doc__.strip(), '```', '']
    return '\n'.join(L)


def readme(title, business, purpose, files, notes=''):
    L = [f'# {title}', '', NOTICE, '', f'**Business:** {business}', '', f'**Used to test:** {purpose}', '', GEN_VERSION, '',
         '## Files', '', '| File | Contents |', '| --- | --- |'] + [f'| {a} | {b} |' for a, b in files]
    L += ['', 'Dates are ISO (YYYY-MM-DD) unless stated. Money is GBP. Snapshot date: 31 October 2026. Demand history: November 2024 to October 2026 (24 months).',
          '', notes, '', 'Expected results: `EXPECTED-RESULTS.md` (readable) and `expected-results.json` (for automated tests).']
    return '\n'.join(L)


CANON_FILES = [('dataset.csv', 'Import header: format version, business, snapshot date, currency'), ('items.csv', 'Every stocked item with Make/Buy, cost, price, supplier and lead times'),
               ('locations.csv', 'Warehouses and whether they count towards available stock'), ('stock.csv', 'Stock per item per location at the snapshot'),
               ('demand.csv', 'Monthly sales (units) and the forecast that was used'), ('suppliers.csv', 'Supplier list'),
               ('supplier_items.csv', 'Which supplier supplies which item, with lead time and cost'), ('po_lines.csv', 'Purchase-order lines, received and open'),
               ('bom.csv', 'Bill of materials (Make items only)'), ('production_orders.csv', 'Works orders (Make items only)')]


def package(name, folder):
    z = os.path.join(OUT, name + '.zip')
    with zipfile.ZipFile(z, 'w', zipfile.ZIP_DEFLATED) as zf:
        for root, _, files in os.walk(folder):
            for f in sorted(files):
                p = os.path.join(root, f)
                zf.write(p, os.path.join(name, os.path.relpath(p, folder)))
    return z


def finish(folder, title, intro, seeded, extra='', canon=None):
    res = refcalc.compute(canon or folder)
    with open(os.path.join(folder, 'expected-results.json'), 'w') as f:
        json.dump(res, f, indent=1)
    with open(os.path.join(folder, 'EXPECTED-RESULTS.md'), 'w') as f:
        f.write(expected_md(title, intro, res, seeded, extra))
    return res


# =====================================================================================
def ds01():
    locs = [dict(Location_ID='MAIN', Location_Name='Main Stores (raw materials)', Include_In_Available='Y', _rm=1),
            dict(Location_ID='FGW', Location_Name='Finished Goods Warehouse, Halifax', Include_In_Available='Y', _fg=1),
            dict(Location_ID='SHEF', Location_Name='Sheffield satellite store', Include_In_Available='Y', _fg=1)]
    sit = {'P0007': 'risk', 'P0019': 'risk', 'P0031': 'risk', 'P0011': 'excess', 'P0022': 'excess', 'P0028': 'excess', 'P0035': 'excess',
           'P0038': 'dead', 'P0039': 'dead', 'M0012': 'risk'}
    prof = {'S07': dict(name='Kestrel Castings Ltd', ontime=0.45, delay=8, lt=42, open=('overdue', 'overdue', 'partial_overdue')),
            'S03': dict(name='Ridgeway Seals Ltd', ontime=0.72, delay=5, lt=28, open=('notdue', 'overdue'))}
    b = build_manufacturer('Harbour Valve Engineering Ltd', 101, 40, 0, 80, 12, locs, sit, prof)
    seeded = [('P0007, P0019, P0031', 'demand rising about 60% over two years and forecasts 15% low; stock covers less than the production lead time → stock-out risk'),
              ('P0011, P0022, P0028, P0035', 'more than 300 days of cover → excess stock (cash tied up)'),
              ('P0038, P0039', 'no sales in the last 12 months but stock on hand → dead stock'),
              ('M0012', 'material stock below its purchase lead time of demand → material shortage risk for its parent products'),
              ('S07 Kestrel Castings', 'unreliable supplier: about 45% on time historically, plus overdue and part-received open orders'),
              ('S03 Ridgeway Seals', 'middling supplier: about 72% on time, one overdue open order per item')]
    return b, seeded


def ds03():
    locs = [dict(Location_ID='LEEDS', Location_Name='Leeds distribution centre', Include_In_Available='Y'),
            dict(Location_ID='BRIS', Location_Name='Bristol branch', Include_In_Available='Y'),
            dict(Location_ID='QUAR', Location_Name='Quarantine / goods-in inspection', Include_In_Available='N')]
    sit = {'D0005': 'risk', 'D0017': 'risk', 'D0042': 'risk', 'D0009': 'excess', 'D0033': 'excess', 'D0060': 'dead', 'D0061': 'dead'}
    prof = {'S04': dict(name='Tamar Fixings Ltd', ontime=0.5, delay=9, lt=35, open=('overdue', 'overdue')),
            'S09': dict(name='Severn Adhesives Ltd', ontime=0.85, delay=4, lt=21, open=('partial_overdue',))}
    b = build_distributor('Pennine Fastener Supplies Ltd', 303, 120, 10, locs, sit, prof)
    for iid, q in (('D0003', 24), ('D0018', 60), ('D0044', 12)):
        b.put_stock(iid, 'QUAR', q, 0, 0, '', '', next(i['Standard_Cost'] for i in b.items if i['Item_ID'] == iid))
    seeded = [('D0005, D0017, D0042', 'rising demand; stock below the supplier lead time → stock-out risk (lead time comes from the supplier, not a production setting)'),
              ('D0009, D0033', 'excess stock, over 300 days of cover'), ('D0060, D0061', 'dead stock: no sales for 12 months'),
              ('S04 Tamar Fixings', 'unreliable: about 50% on time, two overdue open lines per item supplied'),
              ('S09 Severn Adhesives', 'part-received orders that are now overdue'),
              ('QUAR location', 'quarantine stock for D0003, D0018, D0044 must be excluded from available stock but shown in the location detail')]
    return b, seeded


def ds04():
    locs = [dict(Location_ID='WORKS', Location_Name='Works stores, Brighouse', Include_In_Available='Y', _rm=1, _fg=1),
            dict(Location_ID='DC', Location_Name='Distribution centre, Wakefield', Include_In_Available='Y', _fg=1)]
    sit = {'P0004': 'risk', 'R0003': 'buyrisk', 'R0006': 'buyrisk', 'R0007': 'excess', 'P0015': 'dead', 'P0009': 'excess'}
    prof = {'S02': dict(name='Morland Pumps GmbH', ontime=0.8, delay=6, lt=42, country='Germany', open=('notdue', 'overdue')),
            'S03': dict(name='Halcyon Hydraulics Ltd', ontime=0.9, delay=4, lt=35, open=('notdue',))}
    b = build_manufacturer('Calder Pump Systems Ltd', 404, 20, 12, 40, 8, locs, {k: v for k, v in sit.items() if v != 'buyrisk'}, prof)
    # 'buyrisk': cover between the 7-day production default and the real supplier lead time
    for iid in ('R0003', 'R0006'):
        it = next(i for i in b.items if i['Item_ID'] == iid)
        ad = sum(b.units[iid][12:]) / 365.0
        b.stock = [s for s in b.stock if s['Item_ID'] != iid]
        lt = it['Purchase_Lead_Time_Days']
        avail = int(round(ad * 14)); alloc = int(round(ad * 2))
        b.put_stock(iid, 'WORKS', int((avail + alloc) * 0.6), alloc, sum(max(0, l['Ordered_Qty'] - l['Received_Qty']) for l in b.po_lines if l['Item_ID'] == iid), '', '', it['Standard_Cost'])
        b.put_stock(iid, 'DC', (avail + alloc) - int((avail + alloc) * 0.6), 0, 0, '', '', it['Standard_Cost'])
    seeded = [('P0004 (Make)', 'rising demand, stock below its production lead time → stock-out risk'),
              ('R0003, R0006 (Buy, resale)', 'about 14 days of cover against supplier lead times of 35–42 days → stock-out risk. **Key control:** if the engine wrongly used the 7-day production lead time for these bought-in products, they would NOT be flagged. This is the main test of Make/Buy replenishment.'),
              ('R0007 (Buy) and P0009 (Make)', 'excess stock'), ('P0015 (Make)', 'dead stock'),
              ('MRP / production', 'BOM explosion and production feasibility apply to P-items only; R-items must show "not applicable"')]
    return b, seeded


def ds05():
    locs = [dict(Location_ID='YORK', Location_Name='York national DC', Include_In_Available='Y'), dict(Location_ID='HULL', Location_Name='Hull port store', Include_In_Available='Y'),
            dict(Location_ID='DONC', Location_Name='Doncaster trade counter', Include_In_Available='Y')]
    sit5 = {f'X{i:05d}': 'risk' for i in range(250, 5001, 500)}
    sit5.update({f'X{i:05d}': 'excess' for i in range(400, 5001, 500)})
    sit5.update({f'X{i:05d}': 'dead' for i in range(450, 5001, 1000)})
    prof5 = {'S07': dict(name='Wessex Industrial Ltd', ontime=0.5, delay=9, lt=35, open=('overdue', 'partial_overdue'))}
    b = build_distributor('Ouse Valley Industrial Supply Ltd', 505, 5000, 40, locs, sit5, prof5, split=(0.6, 0.25, 0.15), prefix='X', n_hist=3)
    return b, [('X00250, X00750 ... every 500th from 250', 'stock-out risk (10 items)'), ('X00400, X00900 ... every 500th from 400', 'excess (10 items)'),
               ('X00450, X01450, X02450, X03450, X04450', 'dead stock (5 items)'),
               ('S07 Wessex Industrial', 'unreliable supplier with overdue and part-received open orders'), ('Scale', '5,000 sold SKUs, 3 locations, 120,000 demand rows; performance target: import + analysis under the agreed time on a laptop, and a usable result on Android')]


# ---------------- 02 messy, derived from 01 ----------------
def ds02(b01):
    T = copy.deepcopy(b01.tables())
    issues = []
    def iss(code, file, where, raw, action, why):
        issues.append(dict(Issue=code, File=file, Where=where, Raw_Value=raw, Expected_Action=action, Why=why))
    # --- truth changes (these stay in the expected canonical data)
    for iid in ('P0026', 'M0044'):
        it = next(i for i in T['items'] if i['Item_ID'] == iid); it['Standard_Cost'] = ''
        for s in T['stock']:
            if s['Item_ID'] == iid: s['Unit_Cost'] = ''
        for si in T['supplier_items']:
            if si['Item_ID'] == iid: si['Unit_Cost'] = ''
    for iid in ('P0038', 'P0039'):
        next(i for i in T['items'] if i['Item_ID'] == iid)['Active'] = 'N'
    neg = next(s for s in T['stock'] if s['Item_ID'] == 'M0030'); neg['On_Hand_Qty'] = -12
    s99 = [l for l in T['po_lines'] if l['Supplier_ID'] == 'S05'][:2]
    for l in s99: l['Supplier_ID'] = 'S99'
    p14 = next(s for s in T['stock'] if s['Item_ID'] == 'P0014' and s['Location_ID'] == 'FGW')
    T['stock'].remove(p14)
    for s in T['stock']:
        if s['Item_ID'] in ('P0002', 'P0003', 'P0016', 'P0024', 'P0033') and s['Safety_Stock_Qty'] != '': s['Safety_Stock_Qty'] = ''
    T['suppliers'].append(dict(Supplier_ID='S99', Supplier_Name='Unlisted supplier S99', Standard_Lead_Time_Days='', Country='', Payment_Terms='', Active=''))
    expected = T
    # --- export in messy form
    def uk(v): return dt.date.fromisoformat(v).strftime('%d/%m/%Y') if v else ''
    sup_map = {s['Supplier_ID']: s for s in T['suppliers']}
    items_rows = []
    for it in T['items']:
        cost = it['Standard_Cost']
        items_rows.append({'Part No': it['Item_ID'], 'Description': it['Item_Name'], 'Product Group': it['Item_Group'],
                           'Type': 'FG' if it['Replenishment'] == 'Make' else 'RM', 'Std Cost (£)': (f'£{cost:,.2f}' if cost != '' else 'TBC'),
                           'Sell Price': it['Selling_Price'], 'Supplier': it['Default_Supplier_ID'], 'Lead Time (days)': it['Purchase_Lead_Time_Days'],
                           'Prod LT': it['Production_Lead_Time_Days'], 'MOQ': it['Min_Order_Qty'], 'Status': 'Active' if it['Active'] == 'Y' else 'Obsolete'})
    iss('I01', 'ItemMaster_export.csv', 'Std Cost (£), all rows', '£1,234.56 style', 'Clean to number', 'Currency symbol and thousands separator are unambiguous')
    iss('I02', 'ItemMaster_export.csv', 'P0026 and M0044, Std Cost (£)', 'TBC', 'Keep item; cost missing; flag; exclude from £ totals', 'No cost is ever invented')
    iss('I03', 'ItemMaster_export.csv', 'P0038, P0039, Status', 'Obsolete', 'Map to Active = N', 'Inactive items are kept but excluded from findings')
    iss('I04', 'ItemMaster_export.csv', 'Type column', 'FG / RM', 'Map FG → Make (sold), RM → Buy (material)', 'Source system uses its own type codes')
    stock_rows = []
    for s in T['stock']:
        q = s['On_Hand_Qty']
        stock_rows.append({'Warehouse': s['Location_ID'], 'Part No': s['Item_ID'], 'Bin Location': 'A-' + s['Item_ID'][-2:],
                           'QOH': f'{q:,}' if isinstance(q, int) and abs(q) >= 1000 else q, 'Allocated': s['Allocated_Qty'], 'On Order': s['On_Order_Qty'],
                           'Re-order Level': s['Reorder_Point_Qty'], 'Safety Stock': s['Safety_Stock_Qty'], 'Unit Cost': s['Unit_Cost'], 'Stock Date': uk(s['Snapshot_Date'])})
    big = [r for r in stock_rows if isinstance(r['QOH'], str)]
    iss('I05', 'StockByWarehouse.csv', f'{len(big)} rows, QOH', 'e.g. ' + (big[0]['QOH'] if big else '1,240'), 'Clean to number', 'Thousands separator')
    iss('I06', 'StockByWarehouse.csv', 'P0002, P0003, P0016, P0024, P0033 Safety Stock', '(blank)', 'Accept; keep blank in canonical; flag Medium; Engine View uses 0', 'Optional field')
    iss('I07', 'StockByWarehouse.csv', 'M0030 at MAIN, QOH', '-12', 'Keep as entered; flag High; count as 0 available; exclude from £ value', 'Negative stock is a data-quality signal')
    # injected noise rows
    dup = dict(next(r for r in stock_rows if r['Part No'] == 'P0005'))
    stock_rows.append(dup)
    iss('I08', 'StockByWarehouse.csv', 'P0005 at its first location, second copy (near end of file)', 'identical row', 'Keep one; report 1 exact duplicate removed', 'Whole-row duplicate')
    orig6 = next(r for r in stock_rows if r['Part No'] == 'P0006')
    conf = dict(orig6); conf['QOH'] = (int(str(conf['QOH']).replace(',', '')) + 37)
    stock_rows.append(conf)
    iss('I09', 'StockByWarehouse.csv', 'P0006, same location twice with different QOH', f"second row QOH {conf['QOH']}",
        f'Stop the stock import: conflicting duplicate. No row is chosen automatically (never first or last); listed for the user, who must name the row to keep. Expected figures assume that explicit resolution keeps the row with QOH {orig6["QOH"]}',
        'Two different quantities for one item and location')
    p14r = {'Warehouse': 'FGW', 'Part No': 'P-0014', 'Bin Location': 'A-14', 'QOH': p14['On_Hand_Qty'], 'Allocated': p14['Allocated_Qty'], 'On Order': p14['On_Order_Qty'],
            'Re-order Level': p14['Reorder_Point_Qty'], 'Safety Stock': p14['Safety_Stock_Qty'], 'Unit Cost': p14['Unit_Cost'], 'Stock Date': uk(p14['Snapshot_Date'])}
    stock_rows.append(p14r)
    iss('I10', 'StockByWarehouse.csv', 'Part No P-0014 at FGW', 'P-0014', 'Default: reject as unmatched and SUGGEST P0014. If the user switches on "ignore dashes and spaces", it matches P0014 and is accepted (expected figures below assume the default)', 'Code written differently from the item master')
    stock_rows.append({'Warehouse': 'FGW', 'Part No': 'P0999', 'Bin Location': 'Z-99', 'QOH': 15, 'Allocated': 0, 'On Order': 0, 'Re-order Level': '', 'Safety Stock': '', 'Unit Cost': 42.0, 'Stock Date': uk(d(SNAP))})
    iss('I11', 'StockByWarehouse.csv', 'Part No P0999', 'P0999', 'Reject as unmatched stock; listed', 'Item not in the item master')
    stock_rows.append({'Warehouse': '', 'Part No': 'TOTAL', 'Bin Location': '', 'QOH': f"{sum(int(str(r['QOH']).replace(',', '')) for r in stock_rows if str(r['QOH']).lstrip('-').replace(',', '').isdigit()):,}", 'Allocated': '', 'On Order': '', 'Re-order Level': '', 'Safety Stock': '', 'Unit Cost': '', 'Stock Date': ''})
    iss('I12', 'StockByWarehouse.csv', 'last row', 'TOTAL', 'Reject as unmatched stock (item code "TOTAL" is not in the item master); listed with reason. The importer is not expected to recognise totals rows itself: the ordinary unmatched-item rule rejects it', 'Exports often append totals')
    iss('I13', 'StockByWarehouse.csv', 'Bin Location column', '(extra column)', 'Ignore; not mapped', 'Unused columns must not cause errors')
    iss('I14', 'StockByWarehouse.csv', 'Stock Date', 'DD/MM/YYYY', 'Read as UK dates (file format chosen as UK)', 'Date format differs from other files')
    sales = []
    for x in T['demand']:
        code = x['Item_ID']
        if code == 'P0012':
            code = ' p0012 '
        sales.append({'Month': uk(x['Period_Start']), 'Product Code': code, 'Qty Sold': x['Units'], 'Forecast': x['Forecast_Units']})
    iss('I15', 'Sales_History.csv', 'P0012, all months', "' p0012 ' (spaces, lower case)", 'Trim and match ignoring case → P0012; accepted', 'Formatting only')
    first = next(r for r in sales if r['Product Code'] == 'P0020')
    dupd = dict(first); dupd['Qty Sold'] = int(first['Qty Sold']) + 9
    sales.append(dupd)
    iss('I16', 'Sales_History.csv', f"P0020 {first['Month']} appears twice with different Qty Sold", f"{first['Qty Sold']} and {dupd['Qty Sold']}",
        f"Stop the sales import: conflicting duplicate. No row is chosen automatically (never first or last); listed for the user, who must name the row to keep. Expected figures assume that explicit resolution keeps the row with Qty Sold {first['Qty Sold']}", 'Same as I09')
    iss('I17', 'Sales_History.csv', 'Month', '01/11/2024 style', 'Read as UK dates; all are the 1st of the month so every one is technically ambiguous (day ≤ 12): the report must show the count and the user confirms UK', 'Ambiguous-date handling')
    sups = [{'Supplier Code': s['Supplier_ID'], 'Supplier Name': s['Supplier_Name'], 'Std Lead Time': s['Standard_Lead_Time_Days'], 'Country': s['Country'], 'Terms': s['Payment_Terms']}
            for s in T['suppliers'] if s['Supplier_ID'] != 'S99']
    iss('I18', 'PO_Lines.csv', f"{s99[0]['PO_ID']}, {s99[1]['PO_ID']}", 'Supplier Code S99', 'Keep lines; add placeholder "Unlisted supplier S99"; score only from these 2 lines → Not assessed (too few)', 'Supplier missing from the supplier list')
    po = []
    for l in T['po_lines']:
        po.append({'PO Number': l['PO_ID'], 'Line': l['Line_No'], 'Supplier Code': l['Supplier_ID'], 'Part No': l['Item_ID'], 'Order Date': uk(l['Order_Date']),
                   'Due Date': uk(l['Promised_Date']), 'Qty Ordered': l['Ordered_Qty'], 'Qty Received': l['Received_Qty'], 'Last Received': uk(l['Last_Receipt_Date']),
                   'Price': l['Unit_Cost'], 'Status': l['Status']})
    po.append(dict(po[10]))
    iss('I19', 'PO_Lines.csv', f"{po[10]['PO Number']} line 1, second identical copy at end", 'identical row', 'Keep one; report 1 exact duplicate removed', 'Whole-row duplicate')
    bad1 = dict(po[20]); bad1['PO Number'] = 'PO99901'; bad1['Qty Received'] = '12 units'
    bad2 = dict(po[21]); bad2['PO Number'] = 'PO99902'; bad2['Due Date'] = '11/23/2025'
    po += [bad1, bad2]
    iss('I20', 'PO_Lines.csv', 'PO99901', 'Qty Received = "12 units"', 'Reject the line; listed with reason', 'Unit text in a number field is not guessed')
    iss('I21', 'PO_Lines.csv', 'PO99902', 'Due Date = 11/23/2025', 'Reject the line (date only valid as US month/day); listed. Proposed rule: a few such dates → reject those rows; most dates → stop and ask to change the file format', 'Date format conflict')
    bom = [{'Parent': x['Parent_Item_ID'], 'Component': x['Component_Item_ID'], 'Qty': x['Qty_Per'], 'Scrap %': (f"{x['Scrap_Pct'] * 100:g}%" if x['Scrap_Pct'] else '0%')} for x in T['bom']]
    iss('I22', 'BOM.csv', 'Scrap %', '5% / 2% / 0%', 'Convert percent text to a fraction (5% → 0.05)', 'Unambiguous percentage')
    wo = [{'WO No': p['Production_Order_ID'], 'Product': p['Item_ID'], 'Start': p['Planned_Start_Date'], 'Finish': p['Planned_Finish_Date'], 'Actual Start': p['Actual_Start_Date'],
           'Actual Finish': p['Actual_Finish_Date'], 'Qty': p['Planned_Qty'], 'Qty Done': p['Completed_Qty'], 'Status': p['Status']} for p in T['production_orders']]
    iss('I23', 'Works_Orders.csv', 'all date columns', 'YYYY-MM-DD', 'Read as ISO; this file uses a different format from the others', 'Mixed formats across files')
    return expected, issues, dict(items=items_rows, stock=stock_rows, sales=sales, sups=sups, po=po, bom=bom, wo=wo)


# ---------------- 06 edge cases ----------------
def mini(name, items=None, stock=None, demand=None, pos=None, sups=None, locs=None, months=12):
    S = sups or [dict(Supplier_ID='S1', Supplier_Name='Edge Supplier One Ltd', Standard_Lead_Time_Days=14, Country='United Kingdom', Payment_Terms='30 days', Active='Y')]
    I = items or [dict(Item_ID='A1', Item_Name='Edge item A1', Item_Group='Test', Is_Sold='Y', Replenishment='Buy', Unit_of_Measure='each', Standard_Cost=10, Selling_Price=15,
                       Default_Supplier_ID='S1', Purchase_Lead_Time_Days=14, Production_Lead_Time_Days='', Min_Order_Qty='', Order_Multiple='', Active='Y'),
                  dict(Item_ID='A2', Item_Name='Edge item A2', Item_Group='Test', Is_Sold='Y', Replenishment='Buy', Unit_of_Measure='each', Standard_Cost=5, Selling_Price=8,
                       Default_Supplier_ID='S1', Purchase_Lead_Time_Days=14, Production_Lead_Time_Days='', Min_Order_Qty='', Order_Multiple='', Active='Y')]
    L = locs or [dict(Location_ID='W1', Location_Name='Warehouse 1', Include_In_Available='Y')]
    ST = stock if stock is not None else [dict(Item_ID='A1', Location_ID='W1', Snapshot_Date=d(SNAP), On_Hand_Qty=60, Allocated_Qty=0, On_Order_Qty=0, Reorder_Point_Qty='', Safety_Stock_Qty='', Unit_Cost=10),
                                          dict(Item_ID='A2', Location_ID='W1', Snapshot_Date=d(SNAP), On_Hand_Qty=100, Allocated_Qty=0, On_Order_Qty=0, Reorder_Point_Qty='', Safety_Stock_Qty='', Unit_Cost=5)]
    DM = demand if demand is not None else [dict(Item_ID=i, Period_Start=d(m), Units=u, Forecast_Units=u, Location_ID='') for m in MONTHS[-months:] for i, u in (('A1', 30), ('A2', 60))]
    P = pos if pos is not None else [dict(PO_ID=f'E{k:03d}', Line_No=1, Supplier_ID='S1', Item_ID='A1', Order_Date=d(SNAP - dt.timedelta(days=200 - 30 * k)),
                                          Promised_Date=d(SNAP - dt.timedelta(days=186 - 30 * k)), Ordered_Qty=30, Received_Qty=30, Last_Receipt_Date=d(SNAP - dt.timedelta(days=187 - 30 * k)),
                                          Unit_Cost=10, Status='Received', Location_ID='') for k in range(1, 6)]
    SI = [dict(Supplier_ID=i['Default_Supplier_ID'], Item_ID=i['Item_ID'], Lead_Time_Days=i['Purchase_Lead_Time_Days'], Unit_Cost=i['Standard_Cost'], Min_Order_Qty='', Preferred='Y') for i in I if i['Default_Supplier_ID']]
    return dict(items=I, locations=L, stock=ST, demand=DM, suppliers=S, supplier_items=SI, po_lines=P, bom=[], production_orders=[])


def edge_cases():
    E = []
    snap = SNAP
    def po(n, rq, oq, prom_days, rec_days=None, status=None, sup='S1', item='A1'):
        pdt = snap + dt.timedelta(days=prom_days)
        return dict(PO_ID=n, Line_No=1, Supplier_ID=sup, Item_ID=item, Order_Date=d(pdt - dt.timedelta(days=14)), Promised_Date=d(pdt), Ordered_Qty=oq, Received_Qty=rq,
                    Last_Receipt_Date=d(snap + dt.timedelta(days=rec_days)) if rec_days is not None else '', Unit_Cost=10,
                    Status=status or ('Received' if rq >= oq else 'Part received' if rq else 'Open'), Location_ID='')
    base = mini('base')
    def variant(**kw):
        t = copy.deepcopy(base); t.update(kw); return t
    E.append(('E01-no-demand-history', 'A2 is a sold item with no demand rows at all.',
              variant(demand=[x for x in base['demand'] if x['Item_ID'] == 'A1']),
              ['A2 listed under "sold items with no demand history"', 'No forecast, cover or risk for A2 (not zero, not an error: "no history")', 'A1 unaffected: 30/month → cover 60 / (360/365) ≈ 60.8 days']))
    E.append(('E02-no-purchase-history', 'No purchase-order lines at all.', variant(po_lines=[]),
              ['Purchasing and supplier-performance analysis reported as "not available: no purchase orders"', 'Lead time still available from item/supplier (14 days)', 'Supplier S1: no score ("Not assessed"), never 0% or 100%']))
    t = variant(); t['items'][1]['Standard_Cost'] = ''; t['stock'][1]['Unit_Cost'] = ''; t['supplier_items'][1]['Unit_Cost'] = ''
    E.append(('E03-missing-costs', 'A2 has no cost anywhere.', t,
              ['A2 kept; flagged "cost missing"', 'Stock value = A1 only: 60 × £10 = £600.00; A2 listed as excluded from value', 'Any £ finding states that 1 item is excluded']))
    t = variant(locations=[dict(Location_ID='W1', Location_Name='Warehouse 1', Include_In_Available='Y'), dict(Location_ID='W2', Location_Name='Warehouse 2', Include_In_Available='Y')])
    t['stock'].append(dict(Item_ID='A1', Location_ID='W2', Snapshot_Date=d(snap), On_Hand_Qty=-15, Allocated_Qty=0, On_Order_Qty=0, Reorder_Point_Qty='', Safety_Stock_Qty='', Unit_Cost=10))
    E.append(('E04-negative-stock', 'A1 has −15 at W2 and 60 at W1.', t,
              ['Row kept as entered; flagged High "negative stock"', 'A1 available = 60 (the −15 counts as 0, not as −15 → not 45)', 'Stock value: A1 60 × £10 + A2 100 × £5 = £1,100.00 (negative row excluded)']))
    t = variant(po_lines=[po('P1', 40, 100, 10, -1), po('P2', 100, 100, -20, -21), po('P3', 60, 50, -40, -41)])
    E.append(('E05-partial-receipts', 'P1 part-received and not yet due; P2 fully received on time; P3 over-received.', t,
              ['P1: partially received (not due), outstanding 60', 'P2: fully received, on time', 'P3: fully received, outstanding 0, over-receipt of 10 reported separately (never offsets another line)', 'Total outstanding = 60']))
    t = variant(po_lines=[po(f'Q{k}', 30, 30, -100 + 15 * k, -101 + 15 * k) for k in range(1, 5)] + [po('Q5', 0, 30, -12)])
    E.append(('E06-overdue-open-pos', 'Four lines received on time, one line 12 days overdue and unreceived.', t,
              ['Q5 state: overdue open; outstanding 30; overdue value £300.00', 'S1 OTD received-only = 100% (4/4); OTD including overdue = 80% (4/5)', 'M2 rule: supplier performance must use the 80% figure']))
    t = variant(po_lines=base['po_lines'] + [po('U1', 30, 30, -50, -48, sup='S9'), po('U2', 30, 30, -20, -20, sup='S9')])
    E.append(('E07-missing-suppliers', 'Two lines reference supplier S9, which is not in suppliers.csv.', t,
              ['S9 added as "Unlisted supplier S9" placeholder; lines kept', 'S9 not scored (2 lines is below the minimum evidence) → "Not assessed"; no name, lead time or risk invented', 'S1 unaffected']))
    t = variant(); t['stock'].append(dict(t['stock'][0])); t['po_lines'].append(dict(t['po_lines'][0])); t['items'].append(dict(t['items'][0]))
    t['demand'].append(dict(t['demand'][0], Units=99))
    E.append(('E08-duplicate-records', 'Exact duplicate stock row, exact duplicate PO line, duplicate item row, and a conflicting demand row (same month, different units).', t,
              ['Stock: one copy kept → A1 on hand 60 (not 120)', 'PO: one copy kept → 5 lines, not 6', 'Item: one kept, flagged', 'Demand: conflicting duplicate (A1, same month, Units 30 and 99) → the demand import STOPS; no row is chosen automatically (never first or last). The Stage 2 test must assert the stop. Resolving a conflict in canonical input is deferred to M1b',
               'Import report counts: 3 exact duplicates removed, 1 conflicting duplicate stopping the demand import'],
              ))
    t = variant(locations=[dict(Location_ID='W1', Location_Name='Warehouse 1', Include_In_Available='Y'), dict(Location_ID='W2', Location_Name='Warehouse 2', Include_In_Available='Y'),
                           dict(Location_ID='QC', Location_Name='Quality hold', Include_In_Available='N')])
    t['stock'] += [dict(Item_ID='A1', Location_ID='W2', Snapshot_Date=d(snap), On_Hand_Qty=40, Allocated_Qty=0, On_Order_Qty=0, Reorder_Point_Qty='', Safety_Stock_Qty='', Unit_Cost=10),
                   dict(Item_ID='A1', Location_ID='QC', Snapshot_Date=d(snap), On_Hand_Qty=25, Allocated_Qty=0, On_Order_Qty=0, Reorder_Point_Qty='', Safety_Stock_Qty='', Unit_Cost=10),
                   dict(Item_ID='A2', Location_ID='', Snapshot_Date=d(snap), On_Hand_Qty=7, Allocated_Qty=0, On_Order_Qty=0, Reorder_Point_Qty='', Safety_Stock_Qty='', Unit_Cost=5)]
    E.append(('E09-multiple-warehouses', 'A1: 60 at W1, 40 at W2, 25 in quality hold (excluded). A2: 100 at W1 plus 7 on a row with no warehouse.', t,
              ['A1 business-wide available = 100 (W1 60 + W2 40); QC 25 shown in detail but excluded', 'A2 row with blank warehouse: flagged "missing warehouse"; proposed default: assign to a single "UNASSIGNED" location, included, so A2 = 107 (needs approval — see Deliverable 4)',
               'Reconciliation: included rows sum = 60 + 40 + 100 + 7 = 207 = Engine View total']))
    t = variant(demand=[dict(x, Units=0, Forecast_Units=0) if x['Item_ID'] == 'A2' else x for x in base['demand']])
    E.append(('E10-zero-demand', 'A2 has 12 months of demand rows, all zero, and 100 in stock.', t,
              ['A2 is dead stock: 100 × £5 = £500.00', 'No cover or risk figure for A2 (no division by zero; not "infinite")', 'Forecast for A2 = 0 with a "no recent demand" note, not an error']))
    t = variant(); t['items'][1]['Active'] = 'N'
    E.append(('E11-inactive-products', 'A2 is marked inactive but still has 100 in stock.', t,
              ['A2 excluded from risk, excess and actions', 'A2 still counted in stock value (£500.00) and listed as "inactive with stock" so the cash is visible', 'Total stock value = £1,100.00']))
    return E


def main():
    if os.path.exists(OUT):
        shutil.rmtree(OUT)
    os.makedirs(OUT)
    summary = {}
    # 01
    b1, seeded1 = ds01()
    f1 = os.path.join(OUT, '01-Clean-Manufacturer')
    write_canonical(f1, b1.tables(), header(b1.name, 'Manufacturer', 'canonical CSVs'))
    with open(os.path.join(f1, 'README.md'), 'w') as f:
        f.write(readme('01 — Clean Manufacturer', 'Harbour Valve Engineering Ltd (fictional): makes 40 valve and actuator products from 80 purchased materials; 12 suppliers; three stock locations (raw-material stores and two finished-goods stores).',
                       'M1 canonical import and Engine View (must analyse with today\'s engine, all Make), M2 findings and money rules, M3 screens, M4 report, M5 scenarios.', CANON_FILES,
                       'Clean: canonical column names, ISO dates, no deliberate errors. It is the "truth" from which 02 Messy Manufacturer is derived.'))
    summary['01'] = finish(f1, '01 Clean Manufacturer', 'A clean, internally consistent manufacturer. Every figure here should be reproduced exactly by the importer + reference rules.', seeded1)
    # 02
    exp, issues, M = ds02(b1)
    f2 = os.path.join(OUT, '02-Messy-Manufacturer')
    src = os.path.join(f2, 'source-export')
    wcsv(os.path.join(src, 'ItemMaster_export.csv'), list(M['items'][0]), M['items'])
    wcsv(os.path.join(src, 'StockByWarehouse.csv'), list(M['stock'][0]), M['stock'])
    wcsv(os.path.join(src, 'Sales_History.csv'), list(M['sales'][0]), M['sales'])
    wcsv(os.path.join(src, 'Supplier_List.csv'), list(M['sups'][0]), M['sups'])
    wcsv(os.path.join(src, 'PO_Lines.csv'), list(M['po'][0]), M['po'])
    wcsv(os.path.join(src, 'BOM.csv'), list(M['bom'][0]), M['bom'])
    wcsv(os.path.join(src, 'Works_Orders.csv'), list(M['wo'][0]), M['wo'])
    canon2 = os.path.join(f2, 'expected-canonical')
    write_canonical(canon2, exp, header(b1.name + ' (messy export)', 'Manufacturer', 'source-export/*.csv'))
    wcsv(os.path.join(f2, 'DATA-ISSUES.csv'), list(issues[0]), issues)
    with open(os.path.join(f2, 'DATA-ISSUES.md'), 'w') as f:
        f.write('# Deliberate data issues — 02 Messy Manufacturer\n\n' + NOTICE + '\n\nEach issue is intentional. The importer must take the "Expected action". Machine-readable copy: `DATA-ISSUES.csv`.\n\n'
                '| Issue | File | Where | Raw value | Expected action | Why |\n| --- | --- | --- | --- | --- | --- |\n' +
                '\n'.join(f"| {i['Issue']} | {i['File']} | {i['Where']} | {i['Raw_Value']} | {i['Expected_Action']} | {i['Why']} |" for i in issues) + '\n')
    with open(os.path.join(f2, 'README.md'), 'w') as f:
        f.write(readme('02 — Messy Manufacturer', 'The same business as 01 (Harbour Valve Engineering Ltd, fictional), exported from a typical small-business system with realistic problems.',
                       'M1 mapping screen, cleaning rules, duplicate/unmatched handling, import report and preview decisions.',
                       [('source-export/ItemMaster_export.csv', 'Products and materials in one file; own column names; £ and "TBC" in cost'),
                        ('source-export/StockByWarehouse.csv', 'Stock per warehouse; UK dates; thousands separators; duplicates; unknown codes; a TOTAL row'),
                        ('source-export/Sales_History.csv', 'Monthly sales; UK dates; one code with spaces/lower case; one conflicting duplicate'),
                        ('source-export/Supplier_List.csv', 'Suppliers (S99 is missing on purpose)'), ('source-export/PO_Lines.csv', 'PO lines; UK dates; a duplicate; unit text; a US-format date'),
                        ('source-export/BOM.csv', 'BOM with scrap as "5%" text'), ('source-export/Works_Orders.csv', 'Works orders; ISO dates'),
                        ('expected-canonical/*.csv', 'What the importer must produce after applying the expected actions (the comparison target)'),
                        ('DATA-ISSUES.md / .csv', '23 documented issues with expected actions')],
                       'Expected figures assume default import choices: UK dates for the UK-format files, "ignore dashes and spaces" OFF. Conflicting duplicates (I09, I16) stop the import until the user names the row to keep; the expected figures assume the explicit resolutions stated in DATA-ISSUES.md.'))
    rj = dict(stock_rows_rejected=['P-0014 (unmatched; suggest P0014)', 'P0999 (unmatched)', 'TOTAL (unmatched)'], stock_exact_duplicates_removed=1, stock_conflicts_requiring_resolution=1,
              demand_conflicts_requiring_resolution=1, po_rows_rejected=['PO99901 (unit text)', 'PO99902 (US-only date)'], po_exact_duplicates_removed=1, supplier_placeholders=['S99'],
              items_cost_missing=['P0026', 'M0044'], items_inactive=['P0038', 'P0039'], negative_stock=['M0030 at MAIN (−12)'])
    extra2 = '## Import report the importer must show\n\n```\n' + json.dumps(rj, indent=1) + '\n```\n\nAfter import, the canonical data must equal `expected-canonical/` row for row (ignoring row order), and all figures above are calculated from it.'
    summary['02'] = finish(f2, '02 Messy Manufacturer', 'Calculated on `expected-canonical/`: the data as it should be after the importer applies every expected action in DATA-ISSUES.md.',
                           [x for x in seeded1 if not x[0].startswith('P0038')] +
                           [('P0038, P0039', 'marked Obsolete in the export (I03), so inactive: excluded from dead-stock and other findings, but their stock value is still counted'),
                            ('M0030', 'negative stock (I07) counts as 0 available, so it also appears as a stock-out risk: correct behaviour; the root cause is the data error'),
                            ('All other issues', 'see DATA-ISSUES.md')], extra2, canon=canon2)
    with open(os.path.join(f2, 'expected-import-report.json'), 'w') as f:
        json.dump(rj, f, indent=1)
    # 03
    b3, seeded3 = ds03()
    f3 = os.path.join(OUT, '03-Distributor')
    T3 = b3.tables(); T3['bom'] = []; T3['production_orders'] = []
    write_canonical(f3, {k: v for k, v in T3.items() if k not in ('bom', 'production_orders')}, header(b3.name, 'Distributor', 'canonical CSVs'))
    with open(os.path.join(f3, 'README.md'), 'w') as f:
        f.write(readme('03 — Distributor Without Manufacturing', 'Pennine Fastener Supplies Ltd (fictional): buys 120 fastener and fixing lines from 10 suppliers and sells from Leeds and Bristol, with a quarantine area.',
                       'Distributor mode: no BOM or production files; Buy replenishment from supplier lead times; warehouse aggregation with an excluded location.',
                       [x for x in CANON_FILES if x[0] not in ('bom.csv', 'production_orders.csv')],
                       'There is deliberately NO bom.csv and NO production_orders.csv. Analyses that must show "Not applicable": BOM, MRP, production feasibility, production attainment. Everything else must work.'))
    summary['03'] = finish(f3, '03 Distributor', 'A clean distributor: every item is Buy; no manufacturing data exists.', seeded3,
                           '## Analyses that must be unavailable\n\nBOM, MRP, production feasibility and production attainment must show "Not applicable: no manufactured items" — not errors, zeros or empty tables.')
    # 04
    b4, seeded4 = ds04()
    f4 = os.path.join(OUT, '04-Mixed-Make-Buy')
    write_canonical(f4, b4.tables(), header(b4.name, 'Manufacturer (mixed make/buy)', 'canonical CSVs'))
    with open(os.path.join(f4, 'README.md'), 'w') as f:
        f.write(readme('04 — Mixed Make/Buy Business', 'Calder Pump Systems Ltd (fictional): manufactures 20 pump products (P-items) from 40 materials and also buys 12 finished products for resale (R-items).',
                       'Per-item Make/Buy replenishment (the Option B engine change), PO matching to bought-in products, manufacturing-only analysis limited to Make items.', CANON_FILES,
                       'R-items have POs and supplier lead times of 21–42 days; P-items have production lead times of 5–14 days.'))
    summary['04'] = finish(f4, '04 Mixed Make/Buy', 'Validates replenishment logic at item level.', seeded4)
    # 05
    b5, seeded5 = ds05()
    f5 = os.path.join(OUT, '05-Performance-Dataset')
    T5 = b5.tables()
    write_canonical(f5, {k: v for k, v in T5.items() if k not in ('bom', 'production_orders')}, header(b5.name, 'Distributor', 'canonical CSVs'))
    with open(os.path.join(f5, 'README.md'), 'w') as f:
        f.write(readme('05 — Performance Dataset', 'Ouse Valley Industrial Supply Ltd (fictional): 5,000 sold SKUs, 40 suppliers, three locations.',
                       'Import and analysis speed, memory on Android, paging of large tables.', [x for x in CANON_FILES if x[0] not in ('bom.csv', 'production_orders.csv')],
                       'Not intended for checking individual findings; check totals and timing. Existing known limitation: about 1 s analysis at 5,000 items on desktop; tab switching slower on low-power devices.'))
    summary['05'] = finish(f5, '05 Performance', 'Totals for a large distributor; used to confirm nothing is lost at scale.', seeded5,
                           '## Performance expectations (to be agreed)\n\n- Import + analysis on a laptop: target under 10 seconds.\n- Android: completes without crashing; first screen usable.\n- Totals above must match exactly at scale.')
    # 06
    f6 = os.path.join(OUT, '06-Edge-Cases')
    idx = []
    for code, desc, t, exp_lines in edge_cases():
        ef = os.path.join(f6, code)
        write_canonical(os.path.join(ef, 'input'), t, header('Edge case ' + code, 'Distributor', 'canonical CSVs'))
        res = refcalc.compute(os.path.join(ef, 'input'))
        with open(os.path.join(ef, 'expected-results.json'), 'w') as f:
            json.dump(res, f, indent=1)
        with open(os.path.join(ef, 'EXPECTED.md'), 'w') as f:
            f.write(f'# {code}\n\n{NOTICE}\n\n**Situation:** {desc}\n\n## Expected behaviour (hand-specified)\n\n' + '\n'.join(f'- {x}' for x in exp_lines) +
                    '\n\n## Reference calculator output on the raw input\n\n`expected-results.json` is `refcalc.py` run on `input/` **as supplied**. For cases with duplicates or blank warehouses (E08, E09) the raw figures double-count or include the blank row on purpose: the hand-specified expectations above are what the importer must produce after cleaning.\n')
        idx.append((code, desc))
    with open(os.path.join(f6, 'README.md'), 'w') as f:
        f.write('# 06 — Edge Cases\n\n' + NOTICE + '\n\nSmall, separate datasets (two items, one supplier) that each isolate one condition. Base case: A1 sells 30/month, A2 60/month; A1 60 in stock at £10, A2 100 at £5; supplier S1, 14-day lead time.\n\n| Case | Situation |\n| --- | --- |\n' +
                '\n'.join(f'| {a} | {b} |' for a, b in idx) + '\n\nEach folder: `input/` (canonical CSVs), `EXPECTED.md` (hand-specified expected behaviour) and `expected-results.json` (reference calculator on the raw input).\n')
    # master index
    with open(os.path.join(OUT, 'MASTER-INDEX.md'), 'w') as f:
        f.write(MASTER)
    zips = [package(n, os.path.join(OUT, n)) for n in ['01-Clean-Manufacturer', '02-Messy-Manufacturer', '03-Distributor', '04-Mixed-Make-Buy', '05-Performance-Dataset', '06-Edge-Cases']]
    gz = os.path.join(OUT, '00-Generator-Scripts.zip')
    with zipfile.ZipFile(gz, 'w', zipfile.ZIP_DEFLATED) as zf:
        for fn in ['model.py', 'builders.py', 'refcalc.py', 'build.py']:
            zf.write(os.path.join(os.path.dirname(os.path.abspath(__file__)), fn), '00-Generator-Scripts/' + fn)
    with open(os.path.join(OUT, 'summary.json'), 'w') as f:
        json.dump({k: {'rows': v['row_counts'], 'value': v['stock']['stock_value_at_cost_gbp'], 'risk': [x['item'] for x in v['findings_reference']['stockout_risk']],
                       'excess': [x['item'] for x in v['findings_reference']['excess']], 'dead': v['findings_reference']['dead_stock_items'],
                       'po': v['purchase_orders']['line_states']} for k, v in summary.items()}, f, indent=1)
    print('\n'.join(zips + [gz]))


MASTER = """# M1 Test-Data Library — Master Index

All data is fictional and synthetic. No real company (including any employer) data was used. Generated with free tools only (Python standard library); the generator scripts are in `00-Generator-Scripts.zip`, so every file can be recreated exactly.

| Package | Business | Main purpose | M1 | M2 | M3 | M4 | M5 | M6 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 01-Clean-Manufacturer | Harbour Valve Engineering (make only, 3 locations) | Clean reference; Engine View must run on today's engine | Import, Engine View, reconciliation | Findings, £ rules, top 10 | Screens | Report, cause rules | Lead-time and demand scenarios | Investigator test cases |
| 02-Messy-Manufacturer | Same business, messy export | Mapping, cleaning, duplicates, unmatched, import report | **Primary** | — | Data screen | Data-confidence statement | — | Missing-information labelling |
| 03-Distributor | Pennine Fastener Supplies (buy only, quarantine location) | No BOM/production; Buy lead times | Distributor import | Supplier £ exposure | "Not applicable" screens | Distributor report | Supplier lead-time scenarios | — |
| 04-Mixed-Make-Buy | Calder Pump Systems (make + resale) | Per-item Make/Buy replenishment | Make/Buy detection | Correct risk for bought-in items | — | Cause rules across make/buy | Alternative-supplier scenario | Cross-area investigation |
| 05-Performance-Dataset | Ouse Valley Industrial Supply (5,000 SKUs) | Speed and scale | Import speed | Ranking at scale | Paging, Android | Report size | Scenario speed | Evidence size limits |
| 06-Edge-Cases | Two-item mini datasets | One condition each | Every rule | Missing-cost, negative-stock £ rules | Empty and N/A states | Wording of limitations | — | Fact vs missing information |

Regression baseline: Northstar (`tests/fixtures/northstar`) stays the protected baseline and is not part of this library.

## How the expected results were produced

`refcalc.py` reads only the CSVs in each package and applies the documented reference formulas. It does not use the generator's internal values, so it checks what is actually in the files. Edge cases also have hand-specified expectations. For 02, figures are calculated on `expected-canonical/`, the data as it should be after the importer applies every documented action.
"""

if __name__ == '__main__':
    main()
