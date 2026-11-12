"""Synthetic business generator for the Chain Genius M1 test-data library.

Everything is fictional. Deterministic: the same seed always gives the same files.
Produces canonical tables (Canonical Dataset v1 column names) as lists of dicts.
"""
import random, math, datetime as dt

SNAP = dt.date(2026, 10, 31)
MONTHS = [dt.date(2024 + (10 + i) // 12, (10 + i) % 12 + 1, 1) for i in range(24)]  # Nov 2024 .. Oct 2026
LAST12 = MONTHS[12:]


def d(x):
    return x.isoformat() if x else ''


class Biz:
    def __init__(self, name, seed, locations):
        self.name, self.r = name, random.Random(seed)
        self.locations = locations  # list of dicts Location_ID, Location_Name, Include_In_Available
        self.items, self.suppliers, self.supplier_items = [], [], []
        self.demand, self.stock, self.po_lines, self.bom, self.prod = [], [], [], [], []
        self.seeded = []  # (item/supplier, situation)
        self.pos, self.wos = [0], [0]

    # ---------------- master data ----------------
    def add_suppliers(self, n, profiles=None, prefix='S'):
        r = self.r
        for i in range(1, n + 1):
            sid = f'{prefix}{i:02d}'
            p = (profiles or {}).get(sid, {})
            self.suppliers.append(dict(Supplier_ID=sid, Supplier_Name=p.get('name', f'{r.choice(SUPN)} {r.choice(SUPS)} Ltd'),
                                       Standard_Lead_Time_Days=p.get('lt', r.choice([14, 21, 28, 35, 42])),
                                       Country=p.get('country', r.choice(['United Kingdom'] * 4 + ['Germany', 'Poland', 'China'])),
                                       Payment_Terms=r.choice(['30 days', '60 days', '30 days EOM']), Active='Y',
                                       _ontime=p.get('ontime', r.uniform(0.82, 0.97)), _delay=p.get('delay', r.randint(2, 6))))
        return [s['Supplier_ID'] for s in self.suppliers]

    def sup(self, sid):
        return next(s for s in self.suppliers if s['Supplier_ID'] == sid)

    def add_item(self, iid, name, group, sold, repl, cost, price=None, supplier=None, plt=None, prodlt=None, moq=None, active='Y'):
        it = dict(Item_ID=iid, Item_Name=name, Item_Group=group, Is_Sold='Y' if sold else 'N', Replenishment=repl,
                  Unit_of_Measure='each', Standard_Cost=round(cost, 2), Selling_Price=round(price, 2) if price else '',
                  Default_Supplier_ID=supplier or '', Purchase_Lead_Time_Days=plt if plt is not None else '',
                  Production_Lead_Time_Days=prodlt if prodlt is not None else '', Min_Order_Qty=moq or '', Order_Multiple='', Active=active)
        self.items.append(it)
        if supplier:
            self.supplier_items.append(dict(Supplier_ID=supplier, Item_ID=iid, Lead_Time_Days=plt or self.sup(supplier)['Standard_Lead_Time_Days'],
                                            Unit_Cost=round(cost, 2), Min_Order_Qty=moq or '', Preferred='Y'))
        return it

    # ---------------- demand ----------------
    def gen_demand(self, iid, base, trend=0.0, season=0.15, noise=0.18, dead_last12=False, never=False, forecast_bias=0.0):
        r = self.r
        out = []
        for k, m in enumerate(MONTHS):
            if never:
                u = 0
            elif dead_last12 and k >= 12:
                u = 0
            else:
                mu = base * (1 + trend * (k - 11.5) / 12) * (1 + season * math.sin(2 * math.pi * (m.month - 3) / 12))
                u = max(0, int(round(r.gauss(mu, max(1.0, mu * noise)))))
            out.append(u)
        for k, m in enumerate(MONTHS):
            prev = out[max(0, k - 3):k] or [out[0]]
            fc = round(sum(prev) / len(prev) * (1 + forecast_bias)) if not never else 0
            self.demand.append(dict(Item_ID=iid, Period_Start=d(m), Units=out[k], Forecast_Units=fc, Location_ID=''))
        return out

    # ---------------- stock ----------------
    def put_stock(self, iid, loc, oh, alloc=0, on_order=0, rop='', ss='', cost=''):
        self.stock.append(dict(Item_ID=iid, Location_ID=loc, Snapshot_Date=d(SNAP), On_Hand_Qty=oh, Allocated_Qty=alloc,
                               On_Order_Qty=on_order, Reorder_Point_Qty=rop, Safety_Stock_Qty=ss, Unit_Cost=cost))

    # ---------------- purchasing ----------------
    def gen_pos(self, iid, sid, monthly_need, cost, lt, n_hist=8, open_pattern=('notdue',)):
        po_seq = self.pos
        """History of received POs plus a defined set of open lines at the snapshot.
        open_pattern items: 'notdue' | 'overdue' | 'partial_overdue' | 'partial_notdue'."""
        r, s = self.r, self.sup(sid)
        qty = max(10, int(round(monthly_need * 2 / 10.0)) * 10) if monthly_need > 0 else 50
        lines = []
        start = SNAP - dt.timedelta(days=360)
        step = 330 // max(1, n_hist)
        for j in range(n_hist):
            od = start + dt.timedelta(days=j * step + r.randint(0, 6))
            pd_ = od + dt.timedelta(days=lt)
            late = r.random() > s['_ontime']
            rd = pd_ + dt.timedelta(days=(r.randint(1, s['_delay'] * 2) if late else -r.randint(0, 3)))
            if rd > SNAP - dt.timedelta(days=5):
                rd = SNAP - dt.timedelta(days=5)
                if rd < od:
                    continue
            lines.append(self._po(sid, iid, od, pd_, qty, qty, rd, cost, 'Received', po_seq))
        for kind in open_pattern:
            if kind == 'notdue':
                od = SNAP - dt.timedelta(days=max(3, lt // 3)); pd_ = od + dt.timedelta(days=lt)
                lines.append(self._po(sid, iid, od, pd_, qty, 0, None, cost, 'Open', po_seq))
            elif kind == 'overdue':
                od = SNAP - dt.timedelta(days=lt + r.randint(8, 25)); pd_ = od + dt.timedelta(days=lt)
                lines.append(self._po(sid, iid, od, pd_, qty, 0, None, cost, 'Open', po_seq))
            elif kind == 'partial_overdue':
                od = SNAP - dt.timedelta(days=lt + r.randint(10, 20)); pd_ = od + dt.timedelta(days=lt)
                lines.append(self._po(sid, iid, od, pd_, qty, qty // 2, pd_ + dt.timedelta(days=1), cost, 'Part received', po_seq))
            elif kind == 'partial_notdue':
                od = SNAP - dt.timedelta(days=max(10, lt // 2)); pd_ = od + dt.timedelta(days=lt)
                lines.append(self._po(sid, iid, od, pd_, qty, qty // 4, SNAP - dt.timedelta(days=2), cost, 'Part received', po_seq))
        self.po_lines.extend(lines)
        return lines

    def _po(self, sid, iid, od, pd_, oq, rq, rd, cost, status, po_seq):
        po_seq[0] += 1
        return dict(PO_ID=f'PO{po_seq[0]:05d}', Line_No=1, Supplier_ID=sid, Item_ID=iid, Order_Date=d(od), Promised_Date=d(pd_),
                    Ordered_Qty=oq, Received_Qty=rq, Last_Receipt_Date=d(rd), Unit_Cost=round(cost, 2), Status=status, Location_ID='')

    # ---------------- production ----------------
    def gen_production(self, iid, monthly, prodlt, n=10, open_qty=None):
        r, seq = self.r, self.wos
        for j in range(n):
            ps = SNAP - dt.timedelta(days=330 - j * 33)
            pf = ps + dt.timedelta(days=prodlt)
            q = max(10, int(round(monthly / 10.0)) * 10)
            seq[0] += 1
            late = r.random() < 0.15
            af = pf + dt.timedelta(days=r.randint(1, 4) if late else 0)
            if af > SNAP:
                af = None
            self.prod.append(dict(Production_Order_ID=f'WO{seq[0]:05d}', Item_ID=iid, Planned_Start_Date=d(ps), Planned_Finish_Date=d(pf),
                                  Actual_Start_Date=d(ps), Actual_Finish_Date=d(af), Planned_Qty=q,
                                  Completed_Qty=(q if af else 0) if not late else (q - r.randint(0, q // 10) if af else 0),
                                  Status='Complete' if af else 'In progress'))
        if open_qty:
            seq[0] += 1
            ps = SNAP - dt.timedelta(days=2)
            self.prod.append(dict(Production_Order_ID=f'WO{seq[0]:05d}', Item_ID=iid, Planned_Start_Date=d(ps),
                                  Planned_Finish_Date=d(ps + dt.timedelta(days=prodlt)), Actual_Start_Date=d(ps), Actual_Finish_Date='',
                                  Planned_Qty=open_qty, Completed_Qty=0, Status='In progress'))

    def tables(self):
        clean = lambda rows: [{k: v for k, v in x.items() if not k.startswith('_')} for x in rows]
        return dict(items=self.items, locations=self.locations, stock=self.stock, demand=self.demand, suppliers=clean(self.suppliers),
                    supplier_items=self.supplier_items, po_lines=self.po_lines, bom=self.bom, production_orders=self.prod)


SUPN = ['Apex', 'Kestrel', 'Ridgeway', 'Morland', 'Halcyon', 'Brook', 'Tamar', 'Wessex', 'Northgate', 'Severn', 'Lindum', 'Corbridge', 'Ashdown', 'Fenwick']
SUPS = ['Metals', 'Components', 'Plastics', 'Engineering', 'Fasteners', 'Seals', 'Castings', 'Packaging', 'Electrics', 'Supplies']

COLS = dict(
    items=['Item_ID', 'Item_Name', 'Item_Group', 'Is_Sold', 'Replenishment', 'Unit_of_Measure', 'Standard_Cost', 'Selling_Price', 'Default_Supplier_ID',
           'Purchase_Lead_Time_Days', 'Production_Lead_Time_Days', 'Min_Order_Qty', 'Order_Multiple', 'Active'],
    locations=['Location_ID', 'Location_Name', 'Include_In_Available'],
    stock=['Item_ID', 'Location_ID', 'Snapshot_Date', 'On_Hand_Qty', 'Allocated_Qty', 'On_Order_Qty', 'Reorder_Point_Qty', 'Safety_Stock_Qty', 'Unit_Cost'],
    demand=['Item_ID', 'Period_Start', 'Units', 'Forecast_Units', 'Location_ID'],
    suppliers=['Supplier_ID', 'Supplier_Name', 'Standard_Lead_Time_Days', 'Country', 'Payment_Terms', 'Active'],
    supplier_items=['Supplier_ID', 'Item_ID', 'Lead_Time_Days', 'Unit_Cost', 'Min_Order_Qty', 'Preferred'],
    po_lines=['PO_ID', 'Line_No', 'Supplier_ID', 'Item_ID', 'Order_Date', 'Promised_Date', 'Ordered_Qty', 'Received_Qty', 'Last_Receipt_Date', 'Unit_Cost', 'Status', 'Location_ID'],
    bom=['Parent_Item_ID', 'Component_Item_ID', 'Qty_Per', 'Scrap_Pct'],
    production_orders=['Production_Order_ID', 'Item_ID', 'Planned_Start_Date', 'Planned_Finish_Date', 'Actual_Start_Date', 'Actual_Finish_Date', 'Planned_Qty', 'Completed_Qty', 'Status'],
)
