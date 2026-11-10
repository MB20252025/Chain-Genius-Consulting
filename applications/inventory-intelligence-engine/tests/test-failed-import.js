// Regression test: a failed or rejected import must not leave WB/WBNAME out of step with the analysed data R.
// Run: NODE_PATH=<node_modules> node tests/test-failed-import.js
const {JSDOM,VirtualConsole}=require('jsdom'),fs=require('fs'),path=require('path'),ROOT=path.join(__dirname,'..');
let pass=0,fail=0;const ok=(c,m)=>{c?(pass++,process.env.VERBOSE&&console.log('PASS:',m)):(fail++,console.log('FAIL:',m))};
(async()=>{const errs=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(String(e.message).slice(0,120)));
 const dom=await JSDOM.fromFile(path.join(ROOT,'index.html'),{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,virtualConsole:vc});const w=dom.window;await new Promise(r=>w.addEventListener('load',r));
 const $=s=>w.document.querySelector(s),click=el=>el.dispatchEvent(new w.MouseEvent('click',{bubbles:true})),wait=ms=>new Promise(r=>setTimeout(r,ms)),tab=n=>click([...w.document.querySelectorAll('#nav [data-t]')].find(b=>b.dataset.t===n));
 const up=async f=>{Object.defineProperty($('#f'),'files',{value:[f],configurable:true});$('#f').dispatchEvent(new w.Event('change'));await wait(900)};
 const buf=fs.readFileSync(path.join(ROOT,'tests/fixtures/northstar/Chain_Genius_Project_001_Northstar_Dataset_1.xlsx')),ab=new w.Uint8Array(buf).buffer;
 const good=n=>({name:n,size:buf.length,arrayBuffer:async()=>ab});
 // before any file: a failed first import must leave nothing half-loaded
 await up({name:'Unreadable0.xlsx',size:5,arrayBuffer:async()=>{throw new Error('NotReadableError')}});
 ok(w.eval('WBNAME')==='','first import unreadable: WBNAME stays empty');ok(w.eval('typeof R')==='undefined'||w.eval('R')===undefined,'first import unreadable: no analysis');
 await up(good('A.xlsx'));ok($('#st').textContent==='Analysed.','good file A analysed');ok(w.eval('WBNAME')==='A.xlsx'&&w.eval('R.title')==='A.xlsx','A: WBNAME and R.title agree');
 const sheetsA=w.eval('WB.SheetNames.join()');
 // readable but wrong workbook
 const txt=new w.TextEncoder().encode('a,b\n1,2').buffer;await up({name:'Wrong.xlsx',size:8,arrayBuffer:async()=>txt});
 ok(/Missing sheet/.test($('#st').textContent),'wrong workbook: error shown');ok(/previous analysis \(A\.xlsx\) is unchanged/.test($('#st').textContent),'wrong workbook: says previous analysis kept');
 ok(w.eval('WBNAME')==='A.xlsx','wrong workbook: WBNAME restored');ok(w.eval('WB.SheetNames.join()')===sheetsA,'wrong workbook: WB restored');ok(w.eval('R.title')==='A.xlsx','wrong workbook: R unchanged');
 // unreadable from device
 await up({name:'Unreadable.xlsx',size:5,arrayBuffer:async()=>{throw new Error('NotReadableError')}});
 ok(/could not be read from your device/.test($('#st').textContent),'unreadable: message shown');ok(w.eval('WBNAME')==='A.xlsx'&&w.eval('WB.SheetNames.join()')===sheetsA,'unreadable: WB/WBNAME unchanged');
 // corrupt bytes that SheetJS rejects or reads as a non-workbook
 const junk=new w.Uint8Array(200).map((_,i)=>(i*37)%251).buffer;await up({name:'Corrupt.xlsx',size:200,arrayBuffer:async()=>junk});
 ok(w.eval('WBNAME')==='A.xlsx'&&w.eval('R.title')==='A.xlsx','corrupt: WBNAME and R still agree on A');
 // recalculate and export stay consistent with A
 tab('Settings');click($('#rc'));await wait(300);ok($('#st').textContent==='Analysed.','recalculate after failures: Analysed');ok(w.eval('R.title')==='A.xlsx','recalculate after failures: still A');
 let sheets=null;w.XLSX.writeFile=wb=>{sheets=wb.SheetNames};click($('#ex'));await wait(100);
 ok(sheets&&sheets[0]==='START HERE'&&!sheets.includes('Sheet1'),'export after failures: Northstar sheets, no stray Sheet1');ok(sheets&&sheets.includes('ENG_Confidence'),'export after failures: ENG sheets present');
 // success path still replaces
 await up(good('B.xlsx'));ok($('#st').textContent==='Analysed.'&&w.eval('WBNAME')==='B.xlsx'&&w.eval('R.title')==='B.xlsx','second good file B replaces A');
 ok(errs.length===0,'no script errors ('+errs.join('|')+')');
 console.log(`test-failed-import: ${pass} passed, ${fail} failed`);process.exit(fail?1:0)})();
