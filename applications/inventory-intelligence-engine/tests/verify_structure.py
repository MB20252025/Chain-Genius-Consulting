# Independent expectations for the structurally different workbook (fixtures/structure/scenario-willow.xlsx), computed from the raw sheets with pandas only. Prints JSON.
import pandas as pd, json, sys
f=sys.argv[1]; S=pd.read_excel(f,sheet_name=None)
P,M,I,PO,D,B,Su=[S[n] for n in ['Products','Materials','Inventory','Purchase Orders','Demand History','BOM','Suppliers']]
snap=I.Snapshot_Date.iloc[0]
inv=I.assign(v=I.On_Hand_Qty*I.Unit_Cost_GBP)
fg=inv[inv.Item_ID.isin(P.SKU)]; rm=inv[inv.Item_ID.isin(M.Material_ID)]
po=PO[(PO.Ordered_Qty>0)&PO.Order_Date.notna()&(PO.Order_Date<=snap)&~PO.PO_Status.astype(str).str.lower().str.startswith('cancel')]
rec=po[po.Received_Date.notna()&(po.Received_Date<=snap)]
print(json.dumps(dict(sheets=list(S.keys()),fg_n=int(len(fg)),rm_n=int(len(rm)),fg_value=round(float(fg.v.sum()),2),rm_value=round(float(rm.v.sum()),2),
  po_total=int(len(PO)),po_received_by_snapshot=int(len(rec)),po_cancelled=int(PO.PO_Status.astype(str).str.lower().str.startswith('cancel').sum()),po_open_at_snapshot=int(len(po)-len(rec)),
  suppliers=int(len(Su)),skus=int(len(P)),materials=int(len(M)),demand_months=int(D.Month_Start.nunique()),has_forecast_col=bool('Forecast_Units' in D.columns),
  fg_oh=int(fg.On_Hand_Qty.sum()),rm_oh=int(rm.On_Hand_Qty.sum()))))
