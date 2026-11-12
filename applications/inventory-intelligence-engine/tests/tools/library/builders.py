"""Business builders: each returns a Biz with canonical tables filled in, plus its seeded situations."""
import math
from model import Biz, MONTHS, SNAP

GROUPS_MFG = ['Valve Bodies', 'Actuators', 'Manifolds', 'Pump Housings', 'Couplings']
GROUPS_DIST = ['Fasteners', 'Fixings', 'Adhesives', 'Safety', 'Tools', 'Hinges', 'Seals']


def _avg_daily(units):
    return sum(units[12:]) / 365.0


def _sd_month(units):
    u = units[12:]
    m = sum(u) / len(u)
    return math.sqrt(sum((x - m) ** 2 for x in u) / len(u))


def _stock_for(b, iid, units, lt, situation, locs, cost, split=(0.65, 0.35), on_order=0):
    """Place stock so the reference cover lands in the intended band; split across locations."""
    r = b.r
    ad = _avg_daily(units)
    if situation == 'risk':
        cover = lt * r.uniform(0.2, 0.5)
    elif situation == 'excess':
        cover = r.uniform(300, 450)
    elif situation == 'dead':
        total = r.randint(40, 160)
        cover = None
    else:
        cover = lt + r.uniform(25, 60)
    alloc = int(round(ad * r.uniform(2, 5))) if ad > 0 else 0
    if cover is not None:
        total = int(round(ad * cover)) + alloc
    ss = int(round(1.65 * _sd_month(units) * math.sqrt(max(lt, 1) / 30.0)))
    rop = int(round(ad * lt + ss))
    parts = [int(total * f) for f in split[:-1]]
    parts.append(total - sum(parts))
    for k, (loc, q) in enumerate(zip(locs, parts)):
        b.put_stock(iid, loc, q, alloc if k == 0 else 0, on_order if k == 0 else 0, rop if k == 0 else '', ss if k == 0 else '', round(cost, 2))
    return total


def _outstanding(b, iid):
    return sum(max(0, l['Ordered_Qty'] - l['Received_Qty']) for l in b.po_lines if l['Item_ID'] == iid and l['Status'] != 'Cancelled')


def build_manufacturer(name, seed, n_make, n_buy, n_mat, n_sup, locs, situations, sup_profiles, prefix=('P', 'R', 'M')):
    """situations: dict item_id -> 'risk'|'excess'|'dead'|'rising'; sup_profiles: dict supplier_id -> profile"""
    b = Biz(name, seed, locs)
    sids = b.add_suppliers(n_sup, sup_profiles)
    r = b.r
    fg_loc = [l['Location_ID'] for l in locs if l.get('_fg')] or [locs[0]['Location_ID']]
    rm_loc = [l['Location_ID'] for l in locs if l.get('_rm')] or [locs[0]['Location_ID']]
    mats = []
    for i in range(1, n_mat + 1):
        sid = sids[(i - 1) % len(sids)]
        lt = b.sup(sid)['Standard_Lead_Time_Days'] + r.choice([0, 0, 7])
        mid = f'{prefix[2]}{i:04d}'
        b.add_item(mid, f'{r.choice(["Steel", "Brass", "Nitrile", "Aluminium", "PTFE", "Cast iron"])} {r.choice(["plate", "bar", "seal", "housing", "spring", "bolt set", "gasket"])} {i:03d}',
                   'Materials', False, 'Buy', r.uniform(0.5, 40), supplier=sid, plt=lt, moq=r.choice([10, 25, 50, 100]))
        mats.append(mid)
    made, bought = [], []
    for i in range(1, n_make + 1):
        pid = f'{prefix[0]}{i:04d}'
        g = GROUPS_MFG[(i - 1) % len(GROUPS_MFG)]
        cost = r.uniform(25, 220)
        b.add_item(pid, f'{g[:-1] if g.endswith("s") else g} model {i:03d}', g, True, 'Make', cost, cost * r.uniform(1.3, 1.8), prodlt=r.choice([5, 7, 10, 14]))
        made.append(pid)
        comps = r.sample(mats, min(len(mats), r.randint(2, 4)))
        for c in comps:
            b.bom.append(dict(Parent_Item_ID=pid, Component_Item_ID=c, Qty_Per=r.choice([0.5, 1, 1, 2, 2, 3, 4]), Scrap_Pct=r.choice([0, 0, 0.02, 0.05])))
    used = {l['Component_Item_ID'] for l in b.bom}
    for c in mats:
        if c not in used:
            b.bom.append(dict(Parent_Item_ID=r.choice(made), Component_Item_ID=c, Qty_Per=r.choice([1, 1, 2]), Scrap_Pct=0))
    for i in range(1, n_buy + 1):
        pid = f'{prefix[1]}{i:04d}'
        sid = sids[(i * 3) % len(sids)]
        cost = r.uniform(8, 120)
        lt = b.sup(sid)['Standard_Lead_Time_Days']
        b.add_item(pid, f'Resale {r.choice(["gauge", "filter", "hose kit", "seal kit", "valve key", "bracket"])} {i:03d}', 'Resale', True, 'Buy',
                   cost, cost * r.uniform(1.25, 1.6), supplier=sid, plt=lt, moq=r.choice([10, 20, 50]))
        bought.append(pid)
    items = {it['Item_ID']: it for it in b.items}
    units = {}
    for pid in made + bought:
        sit = situations.get(pid, 'normal')
        base = r.uniform(20, 160)
        units[pid] = b.gen_demand(pid, base, trend=(0.6 if sit in ('risk', 'rising') else r.uniform(-0.1, 0.1)), dead_last12=(sit == 'dead'),
                                  forecast_bias=(-0.15 if sit in ('risk', 'rising') else 0.0))
    # production for Make items, purchasing for Buy items
    for pid in made:
        it = items[pid]
        monthly = sum(units[pid][12:]) / 12
        lt = it['Production_Lead_Time_Days']
        open_q = int(round(monthly / 2 / 10.0)) * 10 if situations.get(pid) not in ('dead', 'excess') and monthly > 0 else 0
        if monthly > 0:
            b.gen_production(pid, monthly, lt, n=10, open_qty=open_q or None)
        _stock_for(b, pid, units[pid], lt, situations.get(pid, 'normal'), fg_loc, it['Standard_Cost'], on_order=open_q)
    for pid in bought:
        it = items[pid]
        monthly = sum(units[pid][12:]) / 12
        sid, lt = it['Default_Supplier_ID'], it['Purchase_Lead_Time_Days']
        pat = sup_profiles.get(sid, {}).get('open', ('notdue',))
        if situations.get(pid) == 'dead':
            pat = ()
        b.gen_pos(pid, sid, monthly, it['Standard_Cost'], lt, n_hist=6, open_pattern=pat)
        _stock_for(b, pid, units[pid], lt, situations.get(pid, 'normal'), fg_loc, it['Standard_Cost'], on_order=_outstanding(b, pid))
    # dependent demand for materials
    need = {m: 0.0 for m in mats}
    for line in b.bom:
        p = line['Parent_Item_ID']
        need[line['Component_Item_ID']] += sum(units[p][12:]) / 12 * line['Qty_Per'] * (1 + line['Scrap_Pct'])
    for mid in mats:
        it = items[mid]
        sid, lt = it['Default_Supplier_ID'], it['Purchase_Lead_Time_Days']
        pat = sup_profiles.get(sid, {}).get('open', ('notdue',))
        b.gen_pos(mid, sid, need[mid], it['Standard_Cost'], lt, n_hist=8, open_pattern=pat)
        ad = need[mid] * 12 / 365.0
        sit = situations.get(mid, 'normal')
        cover = lt * r.uniform(0.25, 0.5) if sit == 'risk' else lt + r.uniform(20, 50)
        total = int(round(ad * cover))
        ss = int(round(ad * 10))
        b.put_stock(mid, rm_loc[0], total, 0, _outstanding(b, mid), int(round(ad * lt + ss)), ss, it['Standard_Cost'])
    b.made, b.bought, b.mats, b.units = made, bought, mats, units
    return b


def build_distributor(name, seed, n_items, n_sup, locs, situations, sup_profiles, split=(0.6, 0.4), prefix='D', n_hist=6):
    b = Biz(name, seed, locs)
    sids = b.add_suppliers(n_sup, sup_profiles)
    r = b.r
    loc_ids = [l['Location_ID'] for l in locs if l['Include_In_Available'] == 'Y']
    units = {}
    for i in range(1, n_items + 1):
        pid = f'{prefix}{i:05d}' if n_items > 999 else f'{prefix}{i:04d}'
        g = GROUPS_DIST[(i - 1) % len(GROUPS_DIST)]
        sid = sids[(i - 1) % len(sids)]
        lt = b.sup(sid)['Standard_Lead_Time_Days']
        cost = r.uniform(0.8, 60)
        b.add_item(pid, f'{g} line {i:04d}', g, True, 'Buy', cost, cost * r.uniform(1.3, 1.9), supplier=sid, plt=lt, moq=r.choice([10, 50, 100, 250]))
        sit = situations.get(pid, 'normal')
        units[pid] = b.gen_demand(pid, r.uniform(15, 400), trend=(0.6 if sit in ('risk', 'rising') else r.uniform(-0.1, 0.1)),
                                  dead_last12=(sit == 'dead'), forecast_bias=(-0.15 if sit in ('risk', 'rising') else 0.0))
        pat = sup_profiles.get(sid, {}).get('open', ('notdue',)) if sit != 'dead' else ()
        b.gen_pos(pid, sid, sum(units[pid][12:]) / 12, cost, lt, n_hist=n_hist, open_pattern=pat)
        _stock_for(b, pid, units[pid], lt, sit, loc_ids, cost, split=split, on_order=_outstanding(b, pid))
    b.units = units
    return b
