// Phase 4 gap-closing browser test (added in Phase 4; no application code touched). Real headless Chrome with a resized window; NOT a physical Android test.
// For desktop (1280x800), 412x915 and 360x800: every tab renders without console/page errors and without horizontal PAGE overflow; wide tables scroll inside their own container;
// Suppliers shows the over-delivery columns; Not Assessed suppliers/null scores display correctly (nohist fixture and a blanked-quantity Northstar); rotation keeps the tab; an unapplied Settings value survives tab switching.
const {chromium}=require('playwright'),path=require('path'),os=require('os'),fs=require('fs');global.XLSX=require('xlsx');
const ROOT=path.resolve(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'p4-')),NA='Not Assessed — Insufficient Evidence';let pass=0,fail=0;const ok=(c,m)=>{c?(pass++,process.env.VERBOSE&&console.log('PASS:',m)):(fail++,console.log('FAIL:',m))};
const NS=path.join(__dirname,'fixtures/northstar/Chain_Genius_Project_001_Northstar_Dataset_1.xlsx');
const blank=path.join(tmp,'ns-blank-received.xlsx');{const wb=XLSX.readFile(NS,{cellDates:true}),r=XLSX.utils.sheet_to_json(wb.Sheets['Purchase Orders'],{raw:true,cellDates:true});{const x=r.filter(q=>q.Supplier_ID==='SUP008'&&q.Received_Date)[1];delete x.Received_Qty};wb.Sheets['Purchase Orders']=XLSX.utils.json_to_sheet(r,{cellDates:true});XLSX.writeFile(wb,blank,{cellDates:true})}
const WBS=[['Northstar',NS],['nohist fixture',path.join(__dirname,'fixtures/suppliers/scenario-nohist.xlsx')],['Northstar, one SUP008 received quantity blank',blank]];
(async()=>{const b=await chromium.launch();
 for(const [wn,wf] of WBS)for(const [vn,W,H] of [['desktop 1280x800',1280,800],['412x915',412,915],['360x800',360,800]]){
  const ctx=await b.newContext({viewport:{width:W,height:H}}),p=await ctx.newPage(),errs=[];p.on('pageerror',e=>errs.push(String(e).slice(0,160)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,160))});const T='['+wn+' @ '+vn+'] ';
  await p.goto('file://'+ROOT+'/index.html');await p.setInputFiles('#f',wf);await p.waitForFunction(()=>document.querySelector('#st').textContent==='Analysed.',null,{timeout:120000});
  const tabs=await p.$$eval('#nav [data-t]',e=>e.map(x=>x.dataset.t));ok(tabs.length===17,T+'17 tabs present ('+tabs.length+')');
  const over=[],bad=[],wide=[];
  for(const t of tabs){await p.click('#nav [data-t="'+t+'"]');await p.waitForTimeout(60);
   const m=await p.evaluate(()=>{const de=document.documentElement,txt=document.querySelector('#v').innerText;const tw=[...document.querySelectorAll('#v table')].filter(t=>t.scrollWidth>innerWidth+1).map(t=>{let e=t.parentElement,c=null;while(e&&e!==document.body){const o=getComputedStyle(e).overflowX;if(o==='auto'||o==='scroll'){c=e;break}e=e.parentElement}return !!c});return {sw:de.scrollWidth,iw:innerWidth,bad:/NaN|undefined|Infinity|\[object/.test(txt),tw}});
   if(m.sw>m.iw+1)over.push(t+' ('+m.sw+'>'+m.iw+')');if(m.bad)bad.push(t);if(m.tw.some(x=>!x))wide.push(t)}
  ok(!over.length,T+'no horizontal PAGE overflow on any tab'+(over.length?': '+over.join(', '):''));ok(!bad.length,T+'no NaN/undefined/Infinity text on any tab'+(bad.length?': '+bad.join(', '):''));ok(!wide.length,T+'every table wider than the screen scrolls inside its own container'+(wide.length?': '+wide.join(', '):''));
  await p.click('#nav [data-t="Suppliers"]');const sh=await p.$eval('#v table',t=>t.innerText);ok(/Over-delivered units/i.test(sh)&&/Over-delivered lines/i.test(sh),T+'Suppliers table shows the over-delivered units and lines columns');
  const sup=await p.$eval('#v',e=>e.innerText);
  if(wn==='nohist fixture'){ok(sup.includes(NA)&&!/NaN/.test(sup),T+'Suppliers shows '+NA+' for suppliers without history, no NaN')}
  if(wn.startsWith('Northstar, one SUP008')){const row=(await p.$$eval('#v table tr',r=>r.map(x=>x.innerText.replace(/\s+/g,' ')))).find(x=>/SUP008/.test(x));ok(!!row&&!/NaN/.test(row)&&/Medium risk/.test(row),T+'SUP008 row: real score, Medium risk, no NaN ('+(row||'').slice(0,90)+')')}
  await p.click('#nav [data-t="Overview"]');const ov=await p.$eval('#v',e=>e.innerText);if(wn==='nohist fixture')ok(ov.includes(NA),T+'Overview supplier-risk table shows '+NA);
  // Settings: unapplied value survives switching tabs
  await p.click('#nav [data-t="Settings"]');await p.fill('input[data-k="z"]','1.9');await p.click('#nav [data-t="Overview"]');await p.click('#nav [data-t="Settings"]');const kept=await p.$eval('input[data-k="z"]',e=>e.value);ok(kept==='1.9',T+'unapplied Settings value (1.9) after Overview and back: "'+kept+'"');
  // rotation keeps tab
  await p.click('#nav [data-t="Suppliers"]');await p.setViewportSize({width:H,height:W});await p.waitForTimeout(450);ok(await p.evaluate(()=>tab)==='Suppliers'&&(await p.evaluate(()=>document.documentElement.scrollWidth))<=H+1,T+'rotated to '+H+'x'+W+': still on Suppliers, no horizontal page overflow');
  ok(!errs.length,T+'no console or page errors'+(errs.length?': '+errs.slice(0,2).join(' | '):''));await ctx.close()}
 await b.close();console.log(`test-p4-chrome: ${pass} passed, ${fail} failed`);process.exit(fail?1:0)})().catch(e=>{console.log('CRASH',e);process.exit(2)});
