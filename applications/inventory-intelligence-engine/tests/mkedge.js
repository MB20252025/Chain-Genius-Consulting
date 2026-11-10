// Builds edge-case PO scenarios from the Northstar fixture into fixtures/edge/ (never overwrites unless --force).
const path=require('path'),fs=require('fs'),XLSX=require('xlsx');
const NS=process.env.NORTHSTAR_XLSX||path.join(__dirname,'fixtures','northstar','Chain_Genius_Project_001_Northstar_Dataset_1.xlsx'),OUT=path.join(__dirname,'fixtures','edge');fs.mkdirSync(OUT,{recursive:true});
const S=(w,n)=>XLSX.utils.sheet_to_json(w.Sheets[n],{raw:true,cellDates:true}),put=(w,n,a)=>{w.Sheets[n]=XLSX.utils.json_to_sheet(a,{cellDates:true})};
const mk=(name,fn)=>{const f=path.join(OUT,'scenario-'+name+'.xlsx');if(fs.existsSync(f)&&!process.argv.includes('--force')){console.log('exists, NOT overwritten:',f);return}const w=XLSX.readFile(NS,{cellDates:true});const info=fn(w);XLSX.writeFile(w,f,{cellDates:true});console.log('wrote',f,JSON.stringify(info))};
const snap=S(XLSX.readFile(NS,{cellDates:true}),'Inventory')[0].Snapshot_Date;
const recd=a=>a.filter(o=>o.Received_Date instanceof Date&&o.Received_Date<=snap),open_=a=>a.filter(o=>o.Received_Date instanceof Date&&o.Received_Date>snap&&!/cancel/i.test(o.PO_Status)); // outstanding at the snapshot (Northstar's four future-dated receipts)
// A: exact duplicate rows (same PO_ID): two received POs and one open PO duplicated
mk('dupexact',w=>{const a=S(w,'Purchase Orders'),r=recd(a).slice(0,2),o=open_(a).slice(0,1);put(w,'Purchase Orders',[...a,...r.map(x=>({...x})),...o.map(x=>({...x}))]);return{duplicated:[...r,...o].map(x=>x.PO_ID),openQty:o.map(x=>x.Ordered_Qty)}});
// B: same order re-entered under a new PO_ID (same supplier, material, date, qty)
mk('dupkey',w=>{const a=S(w,'Purchase Orders'),r=recd(a).slice(2,4),o=open_(a).slice(1,2),c=[...r,...o].map((x,i)=>({...x,PO_ID:x.PO_ID+'-DUP'+i}));put(w,'Purchase Orders',[...a,...c]);return{rekeyed:c.map(x=>x.PO_ID)}});
// C: received quantity above ordered quantity (3 at 120%, 1 at 300%)
mk('overrec',w=>{const a=S(w,'Purchase Orders'),r=recd(a).filter(x=>x.Received_Qty===x.Ordered_Qty).slice(0,4);r.forEach((x,i)=>x.Received_Qty=Math.round(x.Ordered_Qty*(i<3?1.2:3)));put(w,'Purchase Orders',a);return{overReceived:r.map(x=>[x.PO_ID,x.Supplier_ID,x.Ordered_Qty,x.Received_Qty])}});
// ---- PO-number scenarios (added in the final verification pass) ----
// D: multi-line POs. Pairs of lines from the SAME supplier, DIFFERENT materials, now share one PO number (nothing else changed).
mk('multiline',w=>{const a=S(w,'Purchase Orders'),pairs=[];const bySup={};recd(a).forEach(o=>(bySup[o.Supplier_ID]=bySup[o.Supplier_ID]||[]).push(o));
 Object.values(bySup).forEach(l=>{if(pairs.length>=3)return;const x=l[0],y=l.find(o=>o.Material_ID!==x.Material_ID&&o!==x);if(y){pairs.push([x.PO_ID,y.PO_ID]);y.PO_ID=x.PO_ID}});
 const f=open_(a).slice(0,1),g=a.find(o=>o.Supplier_ID===f[0].Supplier_ID&&o.Material_ID!==f[0].Material_ID&&o!==f[0]&&o.Received_Date>snap);if(f[0]&&g){pairs.push([f[0].PO_ID,g.PO_ID]);g.PO_ID=f[0].PO_ID}
 put(w,'Purchase Orders',a);return{sharedPoNumbers:pairs}});
// E: split delivery. One received line becomes two lines (same PO number, same material) with half the quantity each and different received dates.
mk('splitline',w=>{const a=S(w,'Purchase Orders'),x=recd(a).find(o=>o.Ordered_Qty>=20&&o.Received_Qty===o.Ordered_Qty),h=Math.floor(x.Ordered_Qty/2),y={...x,Ordered_Qty:x.Ordered_Qty-h,Received_Qty:x.Received_Qty-h,Received_Date:new Date(+x.Received_Date+3*864e5)};x.Ordered_Qty=h;x.Received_Qty=h;put(w,'Purchase Orders',[...a,y]);return{splitPo:x.PO_ID,qty:[x.Ordered_Qty,y.Ordered_Qty]}});
// F: one PO number used by two different suppliers.
mk('posupconflict',w=>{const a=S(w,'Purchase Orders'),x=recd(a)[0],y=recd(a).find(o=>o.Supplier_ID!==x.Supplier_ID);y.PO_ID=x.PO_ID;put(w,'Purchase Orders',a);return{po:x.PO_ID,suppliers:[x.Supplier_ID,y.Supplier_ID]}});

// ---- candidate 3 scenarios: per-line fill cap ----
// G: partial deliveries and shortages only. Four received lines delivered at 60%, 80%, 90%, 50% of the order.
mk('partial',w=>{const a=S(w,'Purchase Orders'),r=recd(a).filter(x=>x.Received_Qty===x.Ordered_Qty&&x.Ordered_Qty>=10).slice(0,4);r.forEach((x,i)=>x.Received_Qty=Math.floor(x.Ordered_Qty*[.6,.8,.9,.5][i]));put(w,'Purchase Orders',a);return{short:r.map(x=>[x.PO_ID,x.Supplier_ID,x.Ordered_Qty,x.Received_Qty])}});
// H: over-receipt on one line and a shortage on another line of the SAME supplier (the case the per-line cap exists for): +50% on one, -50% on the other.
mk('overshort',w=>{const a=S(w,'Purchase Orders'),bySup={};recd(a).filter(x=>x.Received_Qty===x.Ordered_Qty&&x.Ordered_Qty>=10).forEach(o=>(bySup[o.Supplier_ID]=bySup[o.Supplier_ID]||[]).push(o));const out=[];
 Object.entries(bySup).forEach(([k,l])=>{if(out.length>=3||l.length<2)return;l[0].Received_Qty=Math.round(l[0].Ordered_Qty*1.5);l[1].Received_Qty=Math.round(l[1].Ordered_Qty*.5);out.push([k,l[0].PO_ID,l[1].PO_ID])});put(w,'Purchase Orders',a);return{pairs:out}});
// I: combined. Multi-line PO with an over-receipt on one line and a shortage on the other, plus a split delivery and an exact duplicate row.
mk('combined',w=>{const a=S(w,'Purchase Orders'),bySup={};recd(a).filter(x=>x.Received_Qty===x.Ordered_Qty&&x.Ordered_Qty>=10).forEach(o=>(bySup[o.Supplier_ID]=bySup[o.Supplier_ID]||[]).push(o));const out=[];
 Object.entries(bySup).forEach(([k,l])=>{if(out.length>=2)return;const x=l[0],y=l.find(o=>o.Material_ID!==x.Material_ID);if(!y)return;y.PO_ID=x.PO_ID;x.Received_Qty=Math.round(x.Ordered_Qty*1.3);y.Received_Qty=Math.floor(y.Ordered_Qty*.6);out.push([k,x.PO_ID])});
 const z=recd(a).find(o=>o.Received_Qty===o.Ordered_Qty&&!out.some(p=>p[1]===o.PO_ID)),dup={...z};put(w,'Purchase Orders',[...a,dup]);return{sharedLines:out,duplicated:z.PO_ID}});
