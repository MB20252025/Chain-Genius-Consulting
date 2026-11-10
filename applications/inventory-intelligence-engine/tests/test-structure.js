// Import-compatibility test with a structurally different workbook (fixtures/structure/scenario-willow.xlsx).
// Checks: imports through the real file input, all tabs render without errors, totals match an independent pandas recomputation, export works.
const {JSDOM,VirtualConsole}=require('jsdom'),fs=require('fs'),path=require('path'),{spawnSync}=require('child_process'),ROOT=path.join(__dirname,'..'),F=path.join(__dirname,'fixtures/structure/scenario-willow.xlsx');
let pass=0,fail=0;const ok=(c,m)=>{c?(pass++,process.env.VERBOSE&&console.log('PASS:',m)):(fail++,console.log('FAIL:',m))};
const py=spawnSync('python3',[path.join(__dirname,'verify_structure.py'),F],{encoding:'utf8'});ok(py.status===0,'independent pandas expectations computed '+(py.stderr||'').slice(0,100));const E=JSON.parse(py.stdout);
(async()=>{const errs=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(String(e.message).slice(0,140)));
 const dom=await JSDOM.fromFile(path.join(ROOT,'index.html'),{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,virtualConsole:vc});const w=dom.window;await new Promise(r=>w.addEventListener('load',r));
 const $=s=>w.document.querySelector(s),click=el=>el.dispatchEvent(new w.MouseEvent('click',{bubbles:true})),wait=ms=>new Promise(r=>setTimeout(r,ms));
 const buf=fs.readFileSync(F),ab=new w.Uint8Array(buf).buffer;Object.defineProperty($('#f'),'files',{value:[{name:'willow.xlsx',size:buf.length,arrayBuffer:async()=>ab}],configurable:true});$('#f').dispatchEvent(new w.Event('change'));await wait(1200);
 ok($('#st').textContent==='Analysed.','imports and analyses ('+$('#st').textContent.slice(0,80)+')');
 ok(E.sheets[0]==='Read me'&&E.sheets.length===10&&E.sheets.includes('Pivot (old)'),'workbook really differs: extra sheets first/last, shuffled order');
 const g=x=>w.eval(x);
 ok(g('R.fg.length')===E.fg_n,'finished goods count '+g('R.fg.length')+' = '+E.fg_n);ok(g('R.rm.length')===E.rm_n,'materials count '+g('R.rm.length')+' = '+E.rm_n);
 ok(Math.abs(g('R.fgV')-E.fg_value)<.01,'finished-goods stock value '+g('R.fgV').toFixed(2)+' = '+E.fg_value);ok(Math.abs(g('R.rmV')-E.rm_value)<.01,'raw-material stock value '+g('R.rmV').toFixed(2)+' = '+E.rm_value);
 ok(g('R.po.PC.rec.n')===E.po_received_by_snapshot,'POs received by snapshot '+g('R.po.PC.rec.n')+' = '+E.po_received_by_snapshot);ok(g('R.po.PC.can.n')===E.po_cancelled&&E.po_cancelled>0,'cancelled POs excluded: '+g('R.po.PC.can.n')+' = '+E.po_cancelled);ok(g('R.po.PC.open.n')+g('R.po.PC.fut.n')===E.po_open_at_snapshot&&E.po_open_at_snapshot>0,'open POs at snapshot: '+(g('R.po.PC.open.n')+g('R.po.PC.fut.n'))+' = '+E.po_open_at_snapshot);
 ok(g('R.hasF')===E.has_forecast_col,'workbook without Forecast_Units handled (hasF='+g('R.hasF')+')');ok(g('R.sup.length')===E.suppliers,'supplier count '+g('R.sup.length')+' = '+E.suppliers);
 ok(g('R.title')==='willow.xlsx','title uses file name');
 const tabs=[...w.document.querySelectorAll('#nav [data-t]')].map(b=>b.dataset.t);ok(tabs.length===17,'17 tabs present ('+tabs.length+')');
 for(const t of tabs){click($('#nav [data-t="'+t+'"]'));await wait(30);const h=$('#v').innerHTML;ok(h.length>50&&!/undefined|NaN|\[object/.test(h.replace(/<[^>]+>/g,' ')),'tab renders without undefined/NaN/[object]: '+t)}
 let out=null;w.XLSX.writeFile=wb=>{out=wb};click($('#nav [data-t="Settings"]'));await wait(30);click($('#ex'));await wait(100);ok(!!out&&/^Export created/.test($('#st').textContent),'export works ('+$('#st').textContent.slice(0,40)+')');ok(out&&out.SheetNames[0]==='Read me'&&out.SheetNames.includes('ENG_FG'),'export keeps the client\'s own sheets and adds ENG_ sheets');
 ok(errs.length===0,'no script errors ('+errs.join(' | ')+')');
 console.log(`test-structure: ${pass} passed, ${fail} failed`);process.exit(fail?1:0)})();
