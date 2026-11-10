// v0.7 checkpoint A1: escaping test with a hostile workbook, in a simulated page (jsdom).
// Run from tests/: NODE_PATH=<node_modules with xlsx and jsdom> node test-a1-escaping.js [appRoot]
// Builds a copy of the Northstar workbook in which workbook text carries HTML: a product name, a product family,
// a material name, a supplier name, a supplier ID (changed everywhere it is used), an extra column header,
// a notes sheet ("QA ..."), a sheet name and the file name. Loads it through the real file picker, opens all 17 tabs,
// and checks that no planted element or attribute ever appears, while the planted text does appear as plain text
// (so the test cannot pass just because the text never reached the page).
const {JSDOM,VirtualConsole}=require('jsdom'),fs=require('fs'),path=require('path'),XLSX=require('xlsx');
const ROOT=path.resolve(process.argv[2]||path.join(__dirname,'..')),NS=path.join(__dirname,'fixtures','northstar','Chain_Genius_Project_001_Northstar_Dataset_1.xlsx');
let pass=0,fail=0;const ok=(c,m)=>{c?pass++:fail++;if(!c||process.env.VERBOSE)console.log((c?'PASS ':'FAIL ')+m)};
const P=n=>`"'><img id="pwn-${n}" src="x" onerror="window.__pwn=(window.__pwn||0)+1">`; // breaks out of attributes and text alike
const FIELDS={product:'Product name',family:'Product family',material:'Material name',supplier:'Supplier name',supid:'Supplier ID',header:'Column header',note:'Notes sheet',sheet:'Sheet name',file:'File name'};

// --- build the hostile workbook
const wb=XLSX.readFile(NS,{cellDates:true}),rd=n=>XLSX.utils.sheet_to_json(wb.Sheets[n],{raw:true,defval:null}),wr=(n,rows)=>{wb.Sheets[n]=XLSX.utils.json_to_sheet(rows)};
const prod=rd('Products');prod[0].Product_Name='Widget '+P('product');prod[1].Product_Family='Family '+P('family');
prod.forEach(r=>{r['Notes '+P('header')]=null});wr('Products',prod); // an all-blank extra column: reported by name in Data quality
const mat=rd('Materials');mat[0].Material_Name='Steel '+P('material');
const sup=rd('Suppliers');const oldId=sup[0].Supplier_ID,newId='SUP'+P('supid');sup[0].Supplier_ID=newId;sup[1].Supplier_Name='Acme '+P('supplier');wr('Suppliers',sup);
mat.forEach(r=>{if(r.Default_Supplier_ID===oldId)r.Default_Supplier_ID=newId});wr('Materials',mat);
const po=rd('Purchase Orders');po.forEach(r=>{if(r.Supplier_ID===oldId)r.Supplier_ID=newId});wr('Purchase Orders',po);
const noteSheet='QA notes';XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['This is synthetic test data '+P('note')],['Second line '+P('note2')]]),noteSheet);
const evilSheet='QA <b id=pwn-sheet>x';XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['scenario note']]),evilSheet);
const buf=XLSX.write(wb,{type:'buffer',bookType:'xlsx'});

(async()=>{
 const errs=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(String(e.message||e).slice(0,160)));
 const dom=await JSDOM.fromFile(path.join(ROOT,'index.html'),{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,virtualConsole:vc});
 const w=dom.window,d=w.document;await new Promise(r=>w.addEventListener('load',r));
 const inp=d.querySelector('#f'),ab=new w.Uint8Array(buf).buffer;
 Object.defineProperty(inp,'files',{value:[{name:'evil'+P('file')+'.xlsx',size:buf.length,arrayBuffer:async()=>ab}],configurable:true});
 inp.dispatchEvent(new w.Event('change'));for(let i=0;i<100&&!/Analysed/.test(d.querySelector('#st').textContent);i++)await new Promise(r=>setTimeout(r,50));
 ok(/Analysed/.test(d.querySelector('#st').textContent),'hostile workbook analysed ('+d.querySelector('#st').textContent.slice(0,60)+')');
 const planted=()=>d.querySelectorAll('[id^="pwn-"]').length+d.querySelectorAll('[onerror]').length;
 const seen={};const order=[...d.querySelectorAll('#nav [data-t]')].map(b=>b.dataset.t);
 ok(order.length===17,'17 tabs present ('+order.length+')');
 const status=d.querySelector('#st').textContent;if(status.includes(P('file')))seen.file=['status line'];
 for(const t of order){const b=[...d.querySelectorAll('#nav [data-t]')].find(x=>x.dataset.t===t);b.click();await new Promise(r=>setTimeout(r,5));
  // also expand every "Show all" so rows beyond the first page are rendered
  for(let k=0;k<5;k++){const all=d.querySelector('[data-all="1"]');if(!all)break;all.click();await new Promise(r=>setTimeout(r,5))}
  const html=d.querySelector('#v').innerHTML,text=d.querySelector('#v').textContent;
  ok(planted()===0&&!w.__pwn,`tab "${t}": no planted element or event attribute`);
  for(const k of Object.keys(FIELDS))if(text.includes(P(k))||(k==='note'&&text.includes(P('note2'))))(seen[k]=seen[k]||[]).push(t);
  if(text.includes('pwn-sheet'))(seen.sheet=seen.sheet||[]).push(t);
  ok(!/<img[^>]*pwn-/i.test(html),`tab "${t}": planted markup appears only as escaped text`)}
 for(const [k,label] of Object.entries(FIELDS)){
  if(k==='file')ok(!!seen.file,`${label}: shown only as plain text in the status line (textContent), never as HTML`);
  else ok(!!seen[k],`${label}: planted text reached the page as plain text (tabs: ${(seen[k]||['none']).slice(0,3).join(', ')})`)}
 ok(errs.length===0,'no page errors ('+errs.join(' | ').slice(0,200)+')');
 console.log(`test-a1-escaping: ${pass} passed, ${fail} failed`);process.exit(fail?1:0)})().catch(e=>{console.log('FAIL crashed: '+e.stack);process.exit(1)});
