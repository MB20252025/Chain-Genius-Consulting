const X=require('xlsx'),fs=require('fs');const wb=X.read(fs.readFileSync('fixtures/northstar/Chain_Genius_Project_001_Northstar_Dataset_1.xlsx'),{cellDates:true});
const IDS=['Item_ID','SKU','Material_ID','Parent_SKU','Component_ID','PO_Number','PO_ID','Production_Order_ID','PO_Line'];const out=X.utils.book_new();
for(const n of wb.SheetNames){const r=X.utils.sheet_to_json(wb.Sheets[n],{raw:true,cellDates:true}),hdr=X.utils.sheet_to_json(wb.Sheets[n],{header:1})[0]||[];
 const rep=n==='Suppliers'?1:34,rows=[];for(let k=0;k<rep;k++)for(const x of r){const y=Object.assign({},x);if(k)for(const c of IDS)if(y[c]!==undefined)y[c]=String(y[c])+'-'+k;rows.push(y)}
 X.utils.book_append_sheet(out,X.utils.json_to_sheet(rows,{header:hdr,cellDates:true}),n)}
X.writeFile(out,'/tmp/northstar-x34.xlsx');console.log('written');
