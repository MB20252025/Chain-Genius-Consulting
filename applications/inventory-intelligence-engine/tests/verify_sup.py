import pandas as pd, numpy as np, json, sys
f,dumpf=sys.argv[1],sys.argv[2]; label=sys.argv[3] if len(sys.argv)>3 else ''
S={s:pd.read_excel(f,sheet_name=s) for s in pd.ExcelFile(f).sheet_names}
P,M,B,D,I,Su,PO,PR=[S[k] for k in ['Products','Materials','BOM','Demand History','Inventory','Suppliers','Purchase Orders','Production Orders']]
if 'Supplier_ID' not in PO.columns:
    PO=pd.DataFrame({c:pd.Series([],dtype='datetime64[ns]' if 'Date' in c else 'float64' if 'Qty' in c else 'object') for c in ['PO_ID','Supplier_ID','Material_ID','Order_Date','Promised_Date','Received_Date','Ordered_Qty','Received_Qty','PO_Status']})
E={e['id']:e for e in json.load(open(dumpf))}; snap=I.Snapshot_Date.max(); DPM=365/12; bad=[]
if len(PO):
    PO['late']=(PO.Received_Date-PO.Promised_Date).dt.days; PO['lt']=(PO.Received_Date-PO.Order_Date).dt.days
    sc=PO[(PO.Received_Date<=snap)&(PO.Order_Date<=snap)]
else: sc=PO
SP={}
for sid,g in sc.groupby('Supplier_ID'):
    otd=(g.late<=0).mean()*100; fill=np.minimum(g.Received_Qty,g.Ordered_Qty).sum()/g.Ordered_Qty.sum()*100; lt=g['lt']
    stab=100-min(100,(lt.std(ddof=0)/lt.mean()*200 if lt.mean() else 100)); ls=100-min(100,max(0,g.late.mean())*10)
    SP[sid]=dict(fill=fill,over=float(np.maximum(g.Received_Qty-g.Ordered_Qty,0).sum()),overN=int((g.Received_Qty>g.Ordered_Qty).sum()),score=.5*otd+.2*stab+.15*min(100,fill)+.15*ls,late=g.late.mean(),n=len(g))
nm=D.Month_Start.nunique(); U=B.merge(D.groupby('SKU').Units_Sold.sum().rename('u'),left_on='SKU',right_index=True); U['use']=U.u*U.Qty_Per_Finished_Unit*(1+U.Scrap_Factor_Pct)
mu=U.groupby('Material_ID').use.sum()/nm
os={}
for _,r in PO.iterrows():
    if not(r.Ordered_Qty>0) or pd.isna(r.Order_Date) or str(r.PO_Status).lower().startswith('cancel') or r.Order_Date>snap: continue
    rb=pd.notna(r.Received_Date) and r.Received_Date<=snap
    if rb or (str(r.PO_Status).lower() in('received','closed','complete','completed') and pd.isna(r.Received_Date)): continue
    os[r.Material_ID]=os.get(r.Material_ID,0)+r.Ordered_Qty
# classify raw materials by Materials-sheet membership (as the app does), not by the Item_Type label, which varies between workbooks
rm=I[I.Item_ID.isin(M.Material_ID)].set_index('Item_ID').join(M.set_index('Material_ID')[['Lead_Time_Days','Default_Supplier_ID']])
rm['d']=mu.reindex(rm.index).fillna(0)/DPM; rm['av']=rm.On_Hand_Qty-rm.Allocated_Qty; rm['oo']=pd.Series(os).reindex(rm.index).fillna(0)
rm['adj']=rm.Lead_Time_Days+rm.Default_Supplier_ID.map(lambda s:max(0,SP[s]['late']) if s in SP else 0)
rm['risk']=((rm.d>0)&(rm.av<=0))|(rm.av<rm.Safety_Stock_Qty)|((rm.d>0)&((rm.av+rm.oo)/rm.d.where(rm.d>0)<rm.adj))
rk=rm.groupby('Default_Supplier_ID').risk.sum().to_dict(); ms=rm.groupby('Default_Supplier_ID').size().to_dict()
ids=set(Su.Supplier_ID)|set(M.Default_Supplier_ID.dropna()); known=set(Su.Supplier_ID)
def evid(n): return 'None' if n==0 else 'Limited' if n<10 else 'Adequate'
def cat(s,n): return 'Not Assessed — Insufficient Evidence' if n==0 else 'Low risk' if s>=75 else 'Medium risk' if s>=60 else 'High risk'
def assess(i):
    n=SP[i]['n'] if i in SP else 0
    if n==0: return 'Insufficient evidence: no PO received by the snapshot' if (PO.Supplier_ID==i).any() else 'Insufficient evidence: no purchase orders on file'
    c=cat(SP[i]['score'],n); return ('Performance problem' if evid(n)=='Adequate' else 'Possible problem, limited history') if c=='High risk' else 'Some concern' if c=='Medium risk' else 'No performance concern'
print('%s: suppliers independent=%d app=%d'%(label,len(ids),len(E)))
if set(E)!=ids: bad.append('supplier set differs: %s'%(set(E)^ids))
for i in ids:
    e=E.get(i); n=SP[i]['n'] if i in SP else 0
    if not e: continue
    exp=dict(n=n,risk=int(rk.get(i,0)),mats=int(ms.get(i,0)),evid=evid(n),cat=cat(SP[i]['score'] if i in SP else None,n),assess=assess(i),known=i in known)
    for k,v in exp.items():
        if e[k]!=v: bad.append('%s %s app=%r indep=%r'%(i,k,e[k],v))
    if i in SP:
        if abs(e['score']-SP[i]['score'])>1e-6: bad.append('%s score'%i)
    elif e['score'] is not None: bad.append('%s score should be null'%i)
order=sorted(ids,key=lambda s:(-int(rk.get(s,0)),SP[s]['score'] if s in SP else 1e9,s))
if order!=[x['id'] for x in json.load(open(dumpf))]: bad.append('ranking order differs')
print('PASS' if not bad else 'FAIL',label,'(%d suppliers; at-risk counts, materials supplied, evidence, class, assessment, score, rank order)'%len(ids),'' if not bad else bad[:6])

sys.exit(1 if bad else 0)
