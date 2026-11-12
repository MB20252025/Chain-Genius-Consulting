"""Reference calculator: reads a Canonical Dataset v1 folder of CSVs and computes expected results
with simple, documented formulas. It does NOT import the generator, so it checks the files as written.

Formulas (also printed in each EXPECTED-RESULTS.md):
  available(item)      = max(0, sum of On_Hand over included locations, negatives counted as 0) - allocated, floored at 0
  stock value          = sum over stock rows (included locations) of max(0, On_Hand) x cost
                         cost = row Unit_Cost if present, else item Standard_Cost, else excluded (counted)
  avg daily demand     = sold items: units in last 12 months / 365
                         materials: sum over BOM parents of parent last-12m units x Qty_Per x (1 + Scrap_Pct) / 365
  lead time            = Make: Production_Lead_Time_Days; Buy: preferred supplier_items lead time, else item
                         Purchase_Lead_Time_Days, else supplier Standard_Lead_Time_Days, else missing
  cover days           = available / avg daily demand (none when demand is zero)
  stock-out risk       = demand > 0 and cover days < lead time
  excess               = cover days > 180; excess qty = available - 180 x avg daily; valued at cost
  dead stock           = on hand > 0 and zero units in last 12 months (sold items only)
  PO line state        = per Deliverable 1 (fully received / partial / open not due / overdue open / cancelled)
  outstanding          = max(0, Ordered - Received) for non-cancelled lines
  OTD received-only    = fully received lines with Last_Receipt_Date <= Promised_Date / fully received lines
  OTD incl. overdue    = same on-time count / (fully received lines + overdue open lines)
"""
import csv, os, json, datetime as dt
from collections import defaultdict

SNAP = None


def rd(folder, name):
    p = os.path.join(folder, name + '.csv')
    if not os.path.exists(p):
        return []
    with open(p, newline='', encoding='utf-8') as f:
        return list(csv.DictReader(f))


def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def date(v):
    return dt.date.fromisoformat(v) if v else None


def compute(folder):
    T = {n: rd(folder, n) for n in ['dataset', 'items', 'locations', 'stock', 'demand', 'suppliers', 'supplier_items', 'po_lines', 'bom', 'production_orders']}
    snap = date(T['dataset'][0]['Snapshot_Date']) if T['dataset'] else max(date(s['Snapshot_Date']) for s in T['stock'])
    items = {i['Item_ID']: i for i in T['items']}
    sups = {s['Supplier_ID']: s for s in T['suppliers']}
    incl = {l['Location_ID']: l.get('Include_In_Available', 'Y') == 'Y' for l in T['locations']} or defaultdict(lambda: True)
    out = {'row_counts': {k: len(v) for k, v in T.items() if k != 'dataset'}}
    out['items'] = {
        'total': len(items),
        'make': sum(1 for i in items.values() if i['Replenishment'] == 'Make'),
        'buy_sold': sum(1 for i in items.values() if i['Replenishment'] == 'Buy' and i['Is_Sold'] == 'Y'),
        'buy_not_sold_materials': sum(1 for i in items.values() if i['Replenishment'] == 'Buy' and i['Is_Sold'] == 'N'),
        'inactive': sum(1 for i in items.values() if i.get('Active', 'Y') == 'N'),
    }
    # ---- stock and reconciliation
    oh = defaultdict(float); al = defaultdict(float); by_loc = defaultdict(float); neg = []; value = 0.0; no_cost = set(); excluded_rows = 0
    for s in T['stock']:
        q = num(s['On_Hand_Qty']) or 0
        if not incl.get(s['Location_ID'], True):
            excluded_rows += 1
            continue
        by_loc[s['Location_ID']] += q
        if q < 0:
            neg.append(s['Item_ID'])
        oh[s['Item_ID']] += max(0, q)
        al[s['Item_ID']] += num(s['Allocated_Qty']) or 0
        c = num(s['Unit_Cost'])
        if c is None:
            c = num(items.get(s['Item_ID'], {}).get('Standard_Cost'))
        if c is None:
            no_cost.add(s['Item_ID'])
        else:
            value += max(0, q) * c
    out['stock'] = {'on_hand_by_location_included': {k: round(v, 2) for k, v in sorted(by_loc.items())},
                    'business_wide_on_hand_excluding_negatives': round(sum(oh.values()), 2),
                    'rows_in_excluded_locations': excluded_rows, 'items_with_negative_stock': sorted(set(neg)),
                    'stock_value_at_cost_gbp': round(value, 2), 'items_excluded_from_value_no_cost': sorted(no_cost)}
    # ---- demand
    months = sorted({x['Period_Start'] for x in T['demand']})
    last12 = set(months[-12:])
    u12 = defaultdict(float); hist = defaultdict(int)
    for x in T['demand']:
        hist[x['Item_ID']] += 1
        if x['Period_Start'] in last12:
            u12[x['Item_ID']] += num(x['Units']) or 0
    sold = [i for i in items.values() if i['Is_Sold'] == 'Y']
    daily = {i['Item_ID']: u12[i['Item_ID']] / 365.0 for i in sold}
    for b in T['bom']:
        p, c = b['Parent_Item_ID'], b['Component_Item_ID']
        daily[c] = daily.get(c, 0) + u12[p] * num(b['Qty_Per']) * (1 + (num(b['Scrap_Pct']) or 0)) / 365.0
    out['demand'] = {'months_of_history': len(months), 'units_last_12_months_total': round(sum(u12.values()), 2),
                     'sold_items_with_no_demand_history': sorted(i['Item_ID'] for i in sold if hist[i['Item_ID']] == 0)}
    # ---- lead times
    pref = {}
    for si in T['supplier_items']:
        if si.get('Preferred', 'Y') == 'Y' and num(si.get('Lead_Time_Days')) is not None:
            pref[si['Item_ID']] = (num(si['Lead_Time_Days']), 'supplier_items')
    def lt(i):
        if i['Replenishment'] == 'Make':
            v = num(i.get('Production_Lead_Time_Days'))
            return (v, 'item production lead time') if v is not None else (7.0, 'assumed global 7 days')
        if i['Item_ID'] in pref:
            return pref[i['Item_ID']]
        if num(i.get('Purchase_Lead_Time_Days')) is not None:
            return (num(i['Purchase_Lead_Time_Days']), 'item purchase lead time')
        s = sups.get(i.get('Default_Supplier_ID'))
        if s and num(s.get('Standard_Lead_Time_Days')) is not None:
            return (num(s['Standard_Lead_Time_Days']), 'supplier standard')
        return (None, 'missing')
    # ---- cover, risk, excess, dead
    risk, excess, dead, ltmiss = [], [], [], []
    excess_val = dead_val = 0.0
    for iid, it in sorted(items.items()):
        if it.get('Active', 'Y') == 'N':
            continue
        avail = max(0.0, oh[iid] - al[iid])
        cost = num(it.get('Standard_Cost'))
        L, src = lt(it)
        if L is None:
            ltmiss.append(iid)
        dd = daily.get(iid, 0.0)
        if it['Is_Sold'] == 'Y' and oh[iid] > 0 and u12[iid] == 0:
            dead.append(iid); dead_val += oh[iid] * (cost or 0)
        if dd <= 0:
            continue
        cov = avail / dd
        if L is not None and cov < L:
            risk.append({'item': iid, 'cover_days': round(cov, 1), 'lead_time_days': L, 'lead_time_source': src})
        if cov > 180:
            xq = avail - 180 * dd
            excess.append({'item': iid, 'cover_days': round(cov, 1), 'excess_qty': round(xq, 1), 'excess_value_gbp': round(xq * (cost or 0), 2)})
            excess_val += xq * (cost or 0)
    out['findings_reference'] = {'stockout_risk': risk, 'excess': excess, 'excess_value_gbp': round(excess_val, 2),
                                 'dead_stock_items': dead, 'dead_stock_value_gbp': round(dead_val, 2), 'items_missing_lead_time': ltmiss}
    # ---- purchase orders
    st = defaultdict(int); outstanding = 0.0; overdue_val = 0.0
    per = defaultdict(lambda: {'fully_received': 0, 'on_time': 0, 'overdue_open': 0, 'partial': 0, 'open_not_due': 0})
    for l in T['po_lines']:
        o, rq = num(l['Ordered_Qty']) or 0, num(l['Received_Qty']) or 0
        pdt, lr = date(l['Promised_Date']), date(l['Last_Receipt_Date'])
        sid = l['Supplier_ID']
        if l.get('Status', '').lower().startswith('cancel'):
            st['cancelled'] += 1
            continue
        ost = max(0.0, o - rq)
        outstanding += ost
        if rq >= o:
            k = 'fully_received'; per[sid]['fully_received'] += 1
            if lr and pdt and lr <= pdt:
                per[sid]['on_time'] += 1
        elif pdt and pdt < snap:
            k = 'overdue_open'; per[sid]['overdue_open'] += 1; overdue_val += ost * (num(l['Unit_Cost']) or 0)
            if rq > 0:
                per[sid]['partial'] += 1
        elif rq > 0:
            k = 'partially_received_not_due'; per[sid]['partial'] += 1
        else:
            k = 'open_not_due'; per[sid]['open_not_due'] += 1
        st[k] += 1
    sup_out = {}
    for sid in sorted(per):
        p = per[sid]
        fr, ot, od = p['fully_received'], p['on_time'], p['overdue_open']
        sup_out[sid] = dict(p, listed=sid in sups,
                            otd_received_only_pct=round(100 * ot / fr, 1) if fr else None,
                            otd_including_overdue_pct=round(100 * ot / (fr + od), 1) if fr + od else None)
    out['purchase_orders'] = {'line_states': dict(sorted(st.items())), 'outstanding_qty_total': round(outstanding, 2),
                              'overdue_outstanding_value_gbp': round(overdue_val, 2), 'suppliers': sup_out,
                              'unlisted_suppliers_referenced': sorted({l['Supplier_ID'] for l in T['po_lines']} - set(sups))}
    # ---- integrity checks the importer must also pass
    ids = set(items)
    out['integrity'] = {
        'stock_rows_unmatched_item': sorted({s['Item_ID'] for s in T['stock']} - ids),
        'demand_rows_unmatched_item': sorted({x['Item_ID'] for x in T['demand']} - ids),
        'po_lines_unmatched_item': sorted({l['Item_ID'] for l in T['po_lines']} - ids),
        'bom_unmatched': sorted({b['Parent_Item_ID'] for b in T['bom']} - ids | {b['Component_Item_ID'] for b in T['bom']} - ids),
        'po_lines_for_make_items': sorted({l['Item_ID'] for l in T['po_lines'] if items.get(l['Item_ID'], {}).get('Replenishment') == 'Make'}),
    }
    return out


if __name__ == '__main__':
    import sys
    print(json.dumps(compute(sys.argv[1]), indent=1)[:4000])
