"""Compares the ACTUAL application output (engine-live-R.json read from the running page, and the visible tab text)
with every 'Engine results' figure in NORTHSTAR-HUMAN-CHECK-WORKSHEETS.md (release-prep/tag6-20261122, 3f86d9d).
Expected values are transcribed from the worksheet exactly as printed; tolerance = half a unit of the printed rounding."""
import json, re, sys
D='/home/claude/w8/ev/app/'
N=json.load(open(D+'northstar/engine-live-R.json')); F=json.load(open(D+'faults/engine-live-R.json'))
it=lambda R,i: next(x for x in R['fg']+R['rm'] if x['id']==i)
mr=lambda R,i: next(x for x in R['mrp'] if x['id']==i)
tab=lambda name: open(D+'northstar/tab-'+name+'.txt').read()
rows=[]
def c(ws,label,exp,act,dp,field):
    ok = act is not None and abs(act-exp) <= 0.5*10**(-dp)+1e-12
    rows.append((ws,label,exp,act,None if act is None else round(act-exp,dp+3),'AGREE' if ok else 'DISAGREE',field))
def s(ws,label,exp,act,field):
    rows.append((ws,label,exp,act,'','AGREE' if exp==act else 'DISAGREE',field))
x=it(N,'FG001')
c(1,'m',87.25,x['m'],2,'R.fg[FG001].m'); c(1,'sigma',10.7945,x['sg'],4,'R.fg[FG001].sg'); c(1,'d',2.8685,x['d'],4,'R.fg[FG001].d')
c(1,'L',2.6667,x['lt'],4,'R.fg[FG001].lt'); c(1,'SS',5.27,x['ssR'],2,'R.fg[FG001].ssR'); c(1,'ROP',12.92,x['ropR'],2,'R.fg[FG001].ropR')
x=it(N,'RM001')
c(2,'m',386.3822,x['m'],4,'R.rm[RM001].m'); c(2,'sigma',45.5043,x['sg'],4,'R.rm[RM001].sg'); c(2,'d',12.7030,x['d'],4,'R.rm[RM001].d')
c(2,'L',36.85,x['lt'],2,'R.rm[RM001].lt'); c(2,'sigmaL',4.7252,x['ltS'],4,'R.rm[RM001].ltS'); c(2,'SS',128.99,x['ssR'],2,'R.rm[RM001].ssR'); c(2,'ROP',597.09,x['ropR'],2,'R.rm[RM001].ropR')
c(3,'FG value',922703.94,N['fgV'],2,'R.fgV'); c(3,'RM value',1610892.46,N['rmV'],2,'R.rmV'); c(3,'Total',2533596.40,N['tot'],2,'R.tot')
ov=tab('Overview'); s(3,'Overview shows "£2,533,596"',True,'£2,533,596' in ov,'Overview tab text')
r=mr(N,'RM004'); x=it(N,'RM004')
c(4,'m',1113.0450,x['m'],4,'R.rm[RM004].m'); c(4,'gross',3339.13,r['gross'],2,'mrp()[RM004].gross'); c(4,'available',1188,x['av'],0,'R.rm[RM004].av')
c(4,'receipts',0,r['rq'],0,'mrp()[RM004].rq'); c(4,'net',2484.13,r['net'],2,'mrp()[RM004].net'); c(4,'order qty',2500,r['qty'],0,'mrp()[RM004].qty')
c(4,'value',28425.00,r['val'],2,'mrp()[RM004].val'); c(4,'cover days',32.47,(x['av']+r['rq'])/x['d'],2,'(av+rq)/d, the mrpCalc "days" expression')
c(4,'margin days',2.94,(x['av']+r['rq'])/x['d']-x['lt'],2,'days - lt, the mrpCalc "ob" expression'); s(4,'status','Order soon',r['st'],'mrp()[RM004].st')
s(4,'order by','2026-11-02',r['by'],'mrp()[RM004].by'); c(4,'alt net (On_Order 457)',2027.13,r['netU'],2,'mrp()[RM004].netU')
mt=tab('MRP'); s(4,'MRP tab shows RM004 with 2,500 and "Order soon"',True,bool(re.search(r'RM004.{0,400}2,500.{0,200}Order soon',mt,re.S)),'MRP tab text')
cn={x['id']:x.get('abc') for x in N['fg']+N['rm']}; cf={x['id']:x.get('abc') for x in F['fg']+F['rm']}
diff=sorted(i for i in cn if cn[i]!=cf[i]); s(5,'number of items whose class differs',8,len(diff),'R.*[].abc clean vs faulty')
for i,a,b in [('FG007',None,'Not Assessed'),('RM005',None,'Not Assessed'),('RM017',None,'Not Assessed'),('RM042',None,'Not Assessed'),('FG018','B','C'),('FG030','A','B'),('RM020','A','B'),('RM051','C','B')]:
    s(5,i+' faulty class',b,cf[i],'faulty R abc')
    if a: s(5,i+' clean class',a,cn[i],'clean R abc')
s(5,'items that differ, exactly the 8 listed',['FG007','FG018','FG030','RM005','RM017','RM020','RM042','RM051'],diff,'set comparison')
print('ws | figure | worksheet | candidate | diff | result | candidate field'); 
for r_ in rows: print(' | '.join(str(v) for v in r_))
print('TOTAL', len(rows), 'AGREE', sum(r_[5]=='AGREE' for r_ in rows), 'DISAGREE', sum(r_[5]!='AGREE' for r_ in rows))
