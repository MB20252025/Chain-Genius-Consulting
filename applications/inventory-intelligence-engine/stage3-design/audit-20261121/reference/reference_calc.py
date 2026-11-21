"""Separate reference calculation for SCIE high-risk figures (Claude, 21 Nov 2026).
Written from the workbook and the published formulas, NOT from the engine's code paths. Inputs taken from the
engine are listed explicitly (lead time lt, lead-time s.d. ltS), because those are verified by verify.py section 3.
Usage: python3 reference_calc.py <workbook.xlsx> <engine-items.json>"""
import sys, json, math
import pandas as pd, numpy as np
wb, ej = sys.argv[1], sys.argv[2]
S = {s: pd.read_excel(wb, sheet_name=s) for s in ['Products','Materials','BOM','Demand History','Inventory']}
E = json.load(open(ej)); T = E['totals']; z = T['cfg']['z']; DPM = 365/12; EXD = T['cfg']['excess']
months = pd.to_datetime(T['months'], unit='ms')
D = S['Demand History'].copy(); D['Month_Start'] = pd.to_datetime(D['Month_Start'])
D = D[D.Month_Start.isin(months)]
inv = S['Inventory'].groupby('Item_ID').agg(oh=('On_Hand_Qty','sum'), al=('Allocated_Qty','sum'), cost=('Unit_Cost_GBP','first'))
res = []; tol = 1e-6
DDOF = int(sys.argv[3]) if len(sys.argv) > 3 else 0  # 0 = population s.d. (the engine's definition), 1 = sample s.d.
def cmp(item, field, ref, eng):
    ok = (ref is None and eng is None) or (ref is not None and eng is not None and abs(ref-eng) <= tol*max(1,abs(ref)))
    res.append((item, field, ref, eng, ok))
# Finished goods: monthly units sold over the engine's 12 calendar months
fgm = D.pivot_table(index='SKU', columns='Month_Start', values='Units_Sold', aggfunc='sum').reindex(columns=months)
for x in E['fg']:
    u = fgm.loc[x['id']].astype(float); m = u.mean(); sg = u.std(ddof=DDOF); d = m*12/365
    oh, al, cost = inv.loc[x['id'], ['oh','al','cost']]
    ss = z*sg*math.sqrt(x['lt']/DPM); rop = d*x['lt'] + ss
    for f, r in [('m', m), ('sg', sg), ('annual', m*12), ('d', d), ('av', oh-al), ('val', oh*cost), ('ssR', ss), ('ropR', rop)]:
        cmp(x['id'], f, r, x.get(f))
# Raw materials: calendar-month usage = sum over SKUs of units sold x qty per unit x (1 + scrap%)
B = S['BOM'].copy(); B['k'] = B.Qty_Per_Finished_Unit*(1+B.Scrap_Factor_Pct.fillna(0))  # scrap is a fraction 0-1 (engine scrapParse; column name says Pct)
use = B.merge(D[['Month_Start','SKU','Units_Sold']], on='SKU'); use['q'] = use.k*use.Units_Sold
rmm = use.pivot_table(index='Material_ID', columns='Month_Start', values='q', aggfunc='sum').reindex(columns=months).fillna(0)
for x in E['rm']:
    u = rmm.loc[x['id']] if x['id'] in rmm.index else pd.Series([0.0]*12); m = u.mean(); sg = u.std(ddof=DDOF); d = m*12/365
    oh, al, cost = inv.loc[x['id'], ['oh','al','cost']]
    ss = z*math.sqrt((x['lt']/DPM)*sg**2 + (d*x['ltS'])**2) if x.get('ltS') is not None else None
    rop = d*x['lt'] + ss if ss is not None else None
    for f, r in [('m', m), ('annual', m*12), ('d', d), ('av', oh-al), ('val', oh*cost), ('ssR', ss), ('ropR', rop)]:
        cmp(x['id'], f, r, x.get(f))
# Headline totals
cmp('TOTAL', 'fgV', sum(inv.loc[x['id'],'oh']*inv.loc[x['id'],'cost'] for x in E['fg']), T['fgV'])
cmp('TOTAL', 'rmV', sum(inv.loc[x['id'],'oh']*inv.loc[x['id'],'cost'] for x in E['rm']), T['rmV'])
cmp('TOTAL', 'tot', T['fgV']+T['rmV'], T['tot'])
bad = [r for r in res if not r[4]]
by = {}
for r in res: by.setdefault(r[1], [0,0])[0 if r[4] else 1] += 1
print('reference checks: %d, agree %d, differ %d' % (len(res), len(res)-len(bad), len(bad)))
for f,(a,b) in sorted(by.items()): print('  %-7s agree %4d differ %3d' % (f,a,b))
for r in bad[:15]: print('  DIFF', r)
