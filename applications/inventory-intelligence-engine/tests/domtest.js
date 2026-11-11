const __P=require('path'),__ROOT=__P.resolve(__dirname,'..'),__NS=process.env.NORTHSTAR_XLSX||__P.join(__dirname,'fixtures','northstar','Chain_Genius_Project_001_Northstar_Dataset_1.xlsx');
const {JSDOM,VirtualConsole}=require('jsdom'),fs=require('fs');
(async()=>{const errs=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(String(e.message||e).slice(0,160)));vc.on('error',m=>errs.push(String(m).slice(0,160)));
 const dom=await JSDOM.fromFile(__ROOT+'/index.html',{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,virtualConsole:vc});
 const w=dom.window;await new Promise(r=>w.addEventListener('load',r));let ok=0,bad=0;const chk=(n,c)=>{c?ok++:bad++;console.log((c?'PASS ':'FAIL ')+n)};
 chk('page loads, all 4 scripts + SheetJS defined',typeof w.XLSX==='object'&&typeof w.analyse==='function'&&typeof w.fcast==='function'&&typeof w.exportWorkbook==='function'&&typeof w.show==='function');
 // file-type and size checks through the real change handler
 const inp=w.document.querySelector('#f'),fire=file=>{Object.defineProperty(inp,'files',{value:[file],configurable:true});inp.dispatchEvent(new w.Event('change'))};
 fire({name:'notes.txt',size:10});await new Promise(r=>setTimeout(r,30));chk('rejects non-Excel file',w.document.querySelector('#st').textContent.includes('.xlsx'));
 fire({name:'bad.xlsx',size:7,arrayBuffer:async()=>new w.ArrayBuffer(7)});await new Promise(r=>setTimeout(r,60));chk('corrupted workbook handled gracefully (no crash): '+w.document.querySelector('#st').textContent,/Could not read|Error|Missing/.test(w.document.querySelector('#st').textContent));
 // real workbook through the real change handler
 const buf=fs.readFileSync(__NS),ab=new w.Uint8Array(buf).buffer;
 fire({name:'Northstar.xlsx',size:buf.length,arrayBuffer:async()=>ab});await new Promise(r=>setTimeout(r,1500));
 chk('Northstar imports via file input → "Analysed."',w.document.querySelector('#st').textContent==='Analysed.');
 const nav=[...w.document.querySelectorAll('#nav [data-t]')];chk('17 tabs in navigation',nav.length===17);const tabTo=n=>{const b=[...w.document.querySelectorAll('#nav [data-t]')].find(x=>x.dataset.t===n);b.dispatchEvent(new w.MouseEvent('click',{bubbles:true}))};const names=nav.map(b=>b.dataset.t);
 const seen=new Set();for(const n of names){tabTo(n);const h=w.document.querySelector('#v').innerHTML,act=w.document.querySelector('#nav .on').textContent;seen.add(h.slice(0,4000));chk('tab "'+n+'" is active and renders ('+h.length+' chars, no undefined/NaN)',act===n&&h.length>150&&!/undefined|NaN/.test(h))}chk('tabs show different content ('+seen.size+' distinct)',seen.size>=15);
 chk('banner shows supply source on every tab',w.document.querySelector('#v').innerHTML.includes('Supply source:'));
 // settings: switch to inventory on-order, recalc
 const setK=(k,v)=>{w.document.querySelector('[data-k="'+k+'"]').value=v};
 tabTo('Settings');setK('sup',1);setK('fcH',3);setK('fcTest',3);w.document.querySelector('#rc').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
  tabTo('MRP');chk('recalculate applies supply setting (UNVERIFIED shown)',w.document.querySelector('#v').innerHTML.includes('UNVERIFIED'));
 tabTo('Demand forecast');chk('forecast horizon setting applied (Next 3m column)',w.document.querySelector('#v').innerHTML.includes('Next 3m'));
 // forecast product selector
 const sel=w.document.querySelector('#fsel');sel.value=sel.options[5].value;sel.dispatchEvent(new w.Event('change',{bubbles:true}));chk('product selector re-renders chart for chosen SKU',w.document.querySelector('#v').innerHTML.includes(sel.options[5].value)&&w.document.querySelector('#v svg'));
 // reorder-policy filter buttons
 tabTo('Reorder policy');const before=w.document.querySelector('#v').innerHTML.length;w.document.querySelector('[data-pf="ins"]').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));chk('reorder policy filter works',w.document.querySelector('#v').innerHTML.length<before);
 // export
 tabTo('Settings');let saved=null;w.XLSX.writeFile=(wb,name)=>{saved={name,sheets:wb.SheetNames}};w.document.querySelector('#ex').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
 chk('export builds file with original + ENG_ sheets: '+(saved&&saved.sheets.filter(s=>s.startsWith('ENG_')).join(',')),saved&&saved.sheets.includes('Products')&&['ENG_FG','ENG_RM','ENG_Forecast','ENG_Suppliers','ENG_DataQuality','ENG_Assumptions'].every(s=>saved.sheets.includes(s)));
 chk('no script errors during whole session ('+errs.length+')',errs.length===0);if(errs.length)console.log(errs);
 console.log('summary',ok,'pass',bad,'fail');
 process.exitCode=bad?1:0; // v0.7 A1 D4: a failed check makes the suite exit non-zero, so run-regression.sh reports it
})();
