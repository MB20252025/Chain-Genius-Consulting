import pandas as pd, numpy as np, json, math
import os
f=os.environ.get('NORTHSTAR_XLSX') or os.path.join(os.path.dirname(os.path.abspath(__file__)),'fixtures','northstar','Chain_Genius_Project_001_Northstar_Dataset_1.xlsx')
S={s:pd.read_excel(f,sheet_name=s) for s in pd.ExcelFile(f).sheet_names}
P,M,B,D,I,Su,PO,PR=[S[k] for k in ['Products','Materials','BOM','Demand History','Inventory','Suppliers','Purchase Orders','Production Orders']]
E=json.load(open('dump.json')); snap=I.Snapshot_Date.max(); DPM=365/12
okc=badc=0
def chk(name,cond,detail=''):
    global okc,badc
    if cond: okc+=1
    else: badc+=1
    print(('PASS ' if cond else 'FAIL ')+name+(' '+detail if detail and not cond else ''))
close=lambda a,b,t=1e-6: (a is None and (b is None or (isinstance(b,float) and math.isnan(b)))) or (a is not None and b is not None and abs(a-b)<=t)
# ---------- 1. production attainment ----------
ep={p['id']:p for p in E['pr']}; allbad=[]
for sku,g in PR.groupby('SKU'):
    v=g[(g.Planned_Qty>0)&g.Completed_Qty.notna()]
    avg=(v.Completed_Qty/v.Planned_Qty).mean()*100; w=v.Completed_Qty.sum()/v.Planned_Qty.sum()*100
    e=ep[sku]
    if not(close(avg,e['att'])and close(w,e['wAtt'])and e['planned']==v.Planned_Qty.sum()and e['actual']==v.Completed_Qty.sum()and e['n']==len(g)and e['nQ']==len(v)): allbad.append(sku)
chk('attainment: all %d SKUs match (avg-of-orders, weighted, planned, actual, counts)'%PR.SKU.nunique(),not allbad,str(allbad[:5]))
g=PR[PR.SKU=='FG048']; chk('attainment FG048 = %d/%d units, avg %.1f%% vs weighted %.1f%%'%(g.Completed_Qty.sum(),g.Planned_Qty.sum(),(g.Completed_Qty/g.Planned_Qty).mean()*100,g.Completed_Qty.sum()/g.Planned_Qty.sum()*100),g.Completed_Qty.sum()==398 and g.Planned_Qty.sum()==425 and close(ep['FG048']['att'],92.8,.05) and close(ep['FG048']['wAtt'],93.6,.05))
# ---------- 2. supplier score and at-risk ranking ----------
PO['late']=(PO.Received_Date-PO.Promised_Date).dt.days; PO['lt']=(PO.Received_Date-PO.Order_Date).dt.days
sc=PO[(PO.Received_Date<=snap)&(PO.Order_Date<=snap)]
SP={}
for sid,g in sc.groupby('Supplier_ID'):
    otd=(g.late<=0).mean()*100; fill=g.Received_Qty.sum()/g.Ordered_Qty.sum()*100
    stab=100-min(100,(g['lt'].std(ddof=0)/g['lt'].mean()*200 if g['lt'].mean() else 100)); ls=100-min(100,max(0,g.late.mean())*10)
    SP[sid]=dict(score=.5*otd+.2*stab+.15*min(100,fill)+.15*ls,late=g.late.mean(),n=len(g))
months=sorted(D.Month_Start.unique()); nm=len(months)
U=B.merge(D.groupby('SKU').Units_Sold.sum().rename('u'),left_on='SKU',right_index=True); U['use']=U.u*U.Qty_Per_Finished_Unit*(1+U.Scrap_Factor_Pct)
mu=(U.groupby('Material_ID').use.sum()/nm)
oo=PO[(PO.Order_Date<=snap)&(PO.Received_Date>snap)].groupby('Material_ID').Ordered_Qty.sum()
rm=I[I.Item_Type=='Raw_Material'].set_index('Item_ID').join(M.set_index('Material_ID')[['Lead_Time_Days','Default_Supplier_ID']])
rm['d']=mu.reindex(rm.index).fillna(0)/DPM; rm['av']=rm.On_Hand_Qty-rm.Allocated_Qty; rm['oo']=oo.reindex(rm.index).fillna(0)
rm['adj']=rm.Lead_Time_Days+rm.Default_Supplier_ID.map(lambda s:max(0,SP[s]['late']))
rm['risk']=((rm.d>0)&(rm.av<=0))|(rm.av<rm.Safety_Stock_Qty)|((rm.d>0)&((rm.av+rm.oo)/rm.d.where(rm.d>0)<rm.adj))
rk=rm.groupby('Default_Supplier_ID').risk.sum().to_dict(); ms=rm.groupby('Default_Supplier_ID').size().to_dict()
es={s['id']:s for s in E['supRisk']}
chk('supplier score recomputed independently for all %d suppliers'%len(SP),all(close(SP[s]['score'],es[s]['score'],1e-6) for s in SP))
chk('supplier risk class matches thresholds (75/60)',all(es[s]['cat']==('Low risk' if SP[s]['score']>=75 else 'Medium risk' if SP[s]['score']>=60 else 'High risk') for s in SP))
chk('at-risk material counts and materials supplied match for all suppliers',all(es[s]['risk']==rk.get(s,0) and es[s]['mats']==ms.get(s,0) for s in SP),str({s:(es[s]['risk'],rk.get(s,0)) for s in SP if es[s]['risk']!=rk.get(s,0)}))
order=sorted(SP,key=lambda s:(-rk.get(s,0),SP[s]['score'],s)); chk('ranking order (at-risk desc, then score asc, then id) matches app',order==[s['id'] for s in E['supRisk']],str(order[:6])+' vs '+str([s['id'] for s in E['supRisk']][:6]))
print('   independent top-5:',[(s,int(rk.get(s,0)),round(SP[s]['score'],1)) for s in order[:5]])
byScore=sorted(SP,key=lambda s:SP[s]['score']); chk('SUP008 has %d at-risk materials, score %.1f, rank %d by risk (rank %d by score only)'%(rk['SUP008'],SP['SUP008']['score'],order.index('SUP008')+1,byScore.index('SUP008')+1),order.index('SUP008')<5 and byScore.index('SUP008')>=5)
# ---------- 3. lead time ----------
bad=[]
for e in E['lt']:
    g=PR[PR.SKU==e['id']]; d=np.maximum(1,(g.Actual_Finish_Date-g.Actual_Start_Date).dt.days)
    exp_src='Calculated' if len(g)>=5 else 'Estimated'
    if not(close(d.mean(),e['value'])and e['n']==len(g)and e['from']==g.Actual_Start_Date.min().strftime('%Y-%m-%d')and e['to']==g.Actual_Finish_Date.max().strftime('%Y-%m-%d')and e['source']==exp_src and 'minimum 1 day' in e['basis']): bad.append(e['id'])
chk('FG lead time value, order count, date range and provenance label match for all 50 SKUs',not bad,str(bad[:5]))
e27=[e for e in E['lt'] if e['id']=='FG027'][0]; g=PR[PR.SKU=='FG027']
chk('FG027 lead time %.1f d from %d orders (%s to %s) labelled "%s", never "Supplied"'%(e27['value'],e27['n'],e27['from'],e27['to'],e27['label']),e27['label']!='Supplied' and 'Supplied' not in e27['source'])
chk('Products sheet has no lead-time column, so no FG value is labelled Supplied',not any('lead' in c.lower() for c in P.columns) and not any(e['source']=='Supplied' for e in E['lt']))
print('   example basis text:',e27['basis'])
# ---------- 4. forecast bias / accuracy / data quality ----------
bad=[];hi=0;inrange=0;rows=[]
def med(a): return float(np.median(a))
for sku,g in D.groupby('SKU'):
    g=g.sort_values('Month_Start'); v=g.dropna(subset=['Units_Sold','Forecast_Units']); Sa=v.Units_Sold.sum(); Sf=v.Forecast_Units.sum()
    wape=(v.Forecast_Units-v.Units_Sold).abs().sum()/Sa; acc=max(0,(1-wape)*100); bias=(Sf-Sa)/Sa*100
    dr='Over-forecast' if bias>10 else 'Under-forecast' if bias<-10 else 'Balanced'
    share=((v.Forecast_Units>v.Units_Sold).mean() if dr=='Over-forecast' else (v.Forecast_Units<v.Units_Sold).mean() if dr=='Under-forecast' else 0)*100
    h=g.Units_Sold.values; md=med(h); mad=med(np.abs(h-md)); fl=list((np.abs(h-md)/(1.4826*mad)>3.5)) if mad>0 else [False]*len(h); out=sum(1 for i,x in enumerate(fl) if x and not(i>0 and fl[i-1]) and not(i<len(fl)-1 and fl[i+1])); shift=sum(fl)-out; zeros=int((h<=0).sum())
    iss=(len(h)<12)+(len(g.Month_Start.unique())<nm)+(zeros>0)+(out>0)+(len(h)-len(v)>0)
    dq='Insufficient' if len(h)<6 or len(v)<6 else 'Limited' if iss else 'Adequate'
    h95=acc>=95; pts=(len(h)<24)+(dq=='Limited')+3*(dq=='Insufficient')+h95+(shift>0); conf='High' if pts==0 else 'Medium' if pts==1 else 'Low'
    cons=dr!='Balanced' and share>=75
    finding=('Unusually high accuracy – validate source' if h95 else 'Balanced') if dr=='Balanced' else (('Consistent '+dr.lower() if cons else 'Biased overall, but not consistent period to period')+(' (data limited)' if dq=='Limited' else ''))
    e=[x for x in E['fc'] if x['id']==sku][0]
    if not(close(acc,e['acc'],1e-6)and close(bias,e['bias'],1e-6)and e['dir']==dr and e['dq']==dq and e['out']==out and e['shift']==shift and e['zeros']==zeros and e['conf']==conf and e['hiAcc']==h95 and e['finding']==finding): bad.append(sku)
    hi+=h95; inrange+=(94<=acc<=98.0001); rows.append((sku,acc,bias,dr))
chk('forecast accuracy, bias %, direction, data-quality class, outliers, zero periods, confidence and finding match for all 50 SKUs',not bad,str(bad[:5]))
print('   independent: accuracy>=95%%: %d of 50; within 94-98%%: %d of 50; over/under/balanced: %s'%(hi,inrange,tuple(sum(1 for r in rows if r[3]==k) for k in ['Over-forecast','Under-forecast','Balanced'])))
print('   independent: accuracy range %.1f–%.1f%%; direction counts by app: %s'%(min(r[1] for r in rows),max(r[1] for r in rows),{k:sum(1 for x in E['fc'] if x['dir']==k) for k in ['Over-forecast','Under-forecast','Balanced']}))
# ---------- 5. PO reconciliation ----------
c=dict(rec_n=0,rec_ord=0,rec_qty=0,rec_short=0,fut_n=0,fut_q=0,open_n=0,open_q=0,after_n=0,after_q=0)
for _,r in PO.iterrows():
    if r.Order_Date>snap: c['after_n']+=1;c['after_q']+=r.Ordered_Qty;continue
    if r.Received_Date<=snap: c['rec_n']+=1;c['rec_ord']+=r.Ordered_Qty;c['rec_qty']+=r.Received_Qty;c['rec_short']+=max(0,r.Ordered_Qty-r.Received_Qty);continue
    if str(r.PO_Status).lower()=='received': c['fut_n']+=1;c['fut_q']+=r.Ordered_Qty
    else: c['open_n']+=1;c['open_q']+=r.Ordered_Qty
inv=I[I.Item_Type=='Raw_Material'].On_Order_Qty.sum(); ver=c['fut_q']+c['open_q']; gap=inv-ver
p=E['po'];pc=p['PC']
chk('PO: received-by-snapshot POs excluded (count, ordered, received, short balance)',pc['rec']['n']==c['rec_n'] and pc['rec']['ord']==c['rec_ord'] and pc['rec']['qty']==c['rec_qty'] and pc['rec']['short']==c['rec_short'],str((pc['rec'],c)))
chk('PO: future-dated supply %d units (%d POs) and open POs %d units'%(c['fut_q'],c['fut_n'],c['open_q']),pc['fut']['q']==c['fut_q'] and pc['fut']['n']==c['fut_n'] and pc['open']['q']==c['open_q'])
chk('PO: no PO is counted in two categories (%d total = %d)'%(sum(c[k] for k in ['rec_n','fut_n','open_n','after_n']),len(PO)),pc['rec']['n']+pc['fut']['n']+pc['open']['n']+pc['after']['n']+pc['can']['n']+pc['bad']['n']==len(PO))
chk('PO: inventory on-order %d, verified supply %d, unreconciled %d'%(inv,ver,gap),p['invRM']==inv and p['snap']==ver and p['gap']==gap)
chk('PO: status text for %.1f%% explained'%(ver/inv*100),p['status']=='Largely unreconciled' and ver/inv<.1)
fut=PO[PO.Received_Date>snap]; chk('PO: the %d future-dated POs are exactly those with Received_Date after %s'%(len(fut),snap.date()),sorted(pc['fut']['ids'])==sorted(fut.PO_ID))
print('   future-dated POs:',fut[['PO_ID','Promised_Date','Received_Date','Ordered_Qty']].to_dict('records'))
print('summary',okc,'pass',badc,'fail')

import sys; sys.exit(1 if badc else 0)
