// Builds a deterministic large workbook from the Northstar fixture for performance testing (not stored in the project; regenerate on demand).
// Usage: node gen-large-workbook.js <out.xlsx> [copies=100]   (50 SKUs x copies finished goods; 100 materials x copies; suppliers x min(copies,10))
const XLSX=require('xlsx'),path=require('path');
const SRC=process.env.NORTHSTAR_XLSX||path.join(__dirname,'fixtures','northstar','Chain_Genius_Project_001_Northstar_Dataset_1.xlsx');
const IT=(process.argv.find(a=>a.startsWith('--items='))||'').slice(8),ITEMS=IT?+IT:0,nFG=ITEMS?Math.round(ITEMS/3):0,nRM=ITEMS?ITEMS-nFG:0; // --items=N: exactly N items = N/3 finished goods + 2N/3 materials
const OUT=process.argv[2],K=ITEMS?Math.max(Math.ceil(nFG/50),Math.ceil(nRM/100)):+(process.argv[3]||100);if(!OUT){console.error('usage: node gen-large-workbook.js out.xlsx [copies]');process.exit(2)}
const w=XLSX.readFile(SRC,{cellDates:true}),S=n=>XLSX.utils.sheet_to_json(w.Sheets[n],{raw:true,cellDates:true});
let seed=12345;const rnd=()=>(seed=(seed*1664525+1013904223)>>>0)/4294967296,jit=()=>.8+.4*rnd();
const pad=(p,n,l)=>p+String(n).padStart(l,'0'),num=s=>+String(s).replace(/\D/g,'');
const KS=Math.min(K,10),sid=(id,k)=>pad('SUP',(k%KS)*15+num(id),3);
const fg=(id,k)=>pad('FG',k*50+num(id),4),rm=(id,k)=>pad('RM',k*100+num(id),4);
const item=(id,k,type)=>/^FG/.test(id)?fg(id,k):rm(id,k);
const rep=(rows,f)=>{const o=[];for(let k=0;k<K;k++)rows.forEach(r=>o.push(f({...r},k)));return o};
const P=S('Products'),M=S('Materials'),B=S('BOM'),D=S('Demand History'),I=S('Inventory'),Su=S('Suppliers'),PO=S('Purchase Orders'),PR=S('Production Orders');
const q=v=>typeof v==='number'?Math.max(0,Math.round(v*jit())):v;
const out={Products:rep(P,(r,k)=>(r.SKU=fg(r.SKU,k),r)),Materials:rep(M,(r,k)=>(r.Material_ID=rm(r.Material_ID,k),r.Default_Supplier_ID=sid(r.Default_Supplier_ID,k),r)),
 BOM:rep(B,(r,k)=>(r.SKU=fg(r.SKU,k),r.Material_ID=rm(r.Material_ID,k),r)),
 'Demand History':rep(D,(r,k)=>(r.SKU=fg(r.SKU,k),r.Units_Sold=q(r.Units_Sold),typeof r.Forecast_Units==='number'&&(r.Forecast_Units=q(r.Forecast_Units)),r)),
 Inventory:rep(I,(r,k)=>(r.Item_ID=item(r.Item_ID,k),['On_Hand_Qty','Allocated_Qty','On_Order_Qty'].forEach(c=>r[c]=q(r[c])),r)),
 Suppliers:Su.length?(()=>{const o=[];for(let k=0;k<KS;k++)Su.forEach(r=>{const x={...r};x.Supplier_ID=sid(r.Supplier_ID,k);o.push(x)});return o})():[],
 'Purchase Orders':rep(PO,(r,k)=>(r.PO_ID=r.PO_ID+'-'+k,r.Supplier_ID=sid(r.Supplier_ID,k),r.Material_ID=rm(r.Material_ID,k),r.Ordered_Qty=q(r.Ordered_Qty),typeof r.Received_Qty==='number'&&(r.Received_Qty=Math.min(r.Ordered_Qty,q(r.Received_Qty))),r)),
 'Production Orders':rep(PR,(r,k)=>(r.Production_Order_ID=r.Production_Order_ID+'-'+k,r.SKU=fg(r.SKU,k),r.Planned_Qty=q(r.Planned_Qty),typeof r.Completed_Qty==='number'&&(r.Completed_Qty=q(r.Completed_Qty)),r))};
if(ITEMS){const kf=new Set(out.Products.slice(0,nFG).map(r=>r.SKU)),km=new Set(out.Materials.slice(0,nRM).map(r=>r.Material_ID)),ki=new Set([...kf,...km]);
 out.Products=out.Products.filter(r=>kf.has(r.SKU));out.Materials=out.Materials.filter(r=>km.has(r.Material_ID));out.BOM=out.BOM.filter(r=>kf.has(r.SKU)&&km.has(r.Material_ID));
 out['Demand History']=out['Demand History'].filter(r=>kf.has(r.SKU));out.Inventory=out.Inventory.filter(r=>ki.has(r.Item_ID));out['Purchase Orders']=out['Purchase Orders'].filter(r=>km.has(r.Material_ID));out['Production Orders']=out['Production Orders'].filter(r=>kf.has(r.SKU))}
const nw=XLSX.utils.book_new();for(const n of w.SheetNames){const rows=out[n]||S(n);XLSX.utils.book_append_sheet(nw,XLSX.utils.json_to_sheet(rows,{cellDates:true}),n)}
XLSX.writeFile(nw,OUT,{cellDates:true,compression:true});
console.log('wrote',OUT,'| items',out.Products.length+out.Materials.length,'(FG '+out.Products.length+' + RM '+out.Materials.length+') |','| FG',out.Products.length,'RM',out.Materials.length,'BOM',out.BOM.length,'Demand',out['Demand History'].length,'Inv',out.Inventory.length,'Sup',out.Suppliers.length,'PO',out['Purchase Orders'].length,'ProdOrd',out['Production Orders'].length);
