// Regression test: large tables are drawn in pages, but no data is dropped.
// Checks: small workbooks show no pager; a 1,500-item workbook draws 200 rows at a time with a visible "Showing X of N" note;
// "Show more" / "Show all" reveal the rest; results (R) are identical before and after; the Excel export holds every row.
const {JSDOM,VirtualConsole}=require('jsdom'),fs=require('fs'),os=require('os'),path=require('path'),{spawnSync}=require('child_process'),ROOT=path.join(__dirname,'..');
const NS=process.env.NORTHSTAR_XLSX||path.join(__dirname,'fixtures/northstar/Chain_Genius_Project_001_Northstar_Dataset_1.xlsx');
let pass=0,fail=0;const ok=(c,m)=>{c?(pass++,process.env.VERBOSE&&console.log('PASS:',m)):(fail++,console.log('FAIL:',m))};
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'paging-')),BIG=path.join(tmp,'items-1500.xlsx');
const g=spawnSync('node',[path.join(__dirname,'gen-large-workbook.js'),BIG,'--items=1500'],{encoding:'utf8'});ok(g.status===0,'1,500-item workbook generated: '+(g.stdout||g.stderr).trim().slice(-120));
async function open(file,name){const errs=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(String(e.message).slice(0,140)));
 const dom=await JSDOM.fromFile(path.join(ROOT,'index.html'),{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,virtualConsole:vc});const w=dom.window;await new Promise(r=>w.addEventListener('load',r));w.scrollTo=()=>{}; // jsdom does not implement scrollTo; scroll preservation is checked in real Chrome (test-paging-chrome.js)
 const $=s=>w.document.querySelector(s),wait=ms=>new Promise(r=>setTimeout(r,ms)),click=el=>el.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
 const buf=fs.readFileSync(file),ab=new w.Uint8Array(buf).buffer;Object.defineProperty($('#f'),'files',{value:[{name,size:buf.length,arrayBuffer:async()=>ab}],configurable:true});$('#f').dispatchEvent(new w.Event('change'));
 for(let i=0;i<120&&$('#st').textContent!=='Analysed.';i++)await wait(250);return {w,$,wait,click,errs,tab:async t=>{click($('#nav [data-t="'+t+'"]'));await wait(30)},rows:()=>$('#v').querySelectorAll('tr').length}}
(async()=>{
 // 1. small workbook: nothing is paged
 {const a=await open(NS,'northstar.xlsx');ok(a.$('#st').textContent==='Analysed.','Northstar analysed');const tabs=[...a.w.document.querySelectorAll('#nav [data-t]')].map(b=>b.dataset.t);let pagers=0;
  for(const t of tabs){await a.tab(t);pagers+=a.$('#v').querySelectorAll('[data-more]').length}
  ok(pagers===0,'Northstar: no table is paged on any of the '+tabs.length+' tabs (largest table is 150 rows)');ok(a.errs.length===0,'Northstar: no script errors')}
 // 2. large workbook
 const b=await open(BIG,'items-1500.xlsx');ok(b.$('#st').textContent==='Analysed.','1,500-item workbook analysed ('+b.$('#st').textContent.slice(0,50)+')');
 const nRM=b.w.eval('R.rm.length'),nFG=b.w.eval('R.fg.length');ok(nRM===1000&&nFG===500,'engine holds every record: '+nFG+' finished goods, '+nRM+' materials');
 const snapR=()=>b.w.eval('JSON.stringify([R.fg.map(x=>[x.id,x.sev,x.act]),R.rm.map(x=>[x.id,x.sev,x.act]),R.sup.map(x=>[x.id,x.score]),R.tot])');const before=snapR();
 await b.tab('Materials');const body=()=>b.$('#v').querySelectorAll('table tr').length-1;
 ok(body()===200,'Materials: first 200 of 1,000 rows drawn ('+body()+')');ok(/Showing the first 200 of 1000 rows\. All 1000 rows are used in the calculations and are included in the Excel export\./.test(b.$('#v').textContent),'Materials: visible note says 200 of 1000, all used and exported');
 const lastId=b.w.eval('R.rm[999].id'),midId=b.w.eval('R.rm[500].id');
 const hasId=id=>b.$('#v').textContent.includes(id);
 const more=()=>b.$('#v [data-more]:not([data-all])'),all=()=>b.$('#v [data-more][data-all]');ok(!!more()&&!!all(),'Materials: "Show more" and "Show all" buttons present');
 // find a row beyond the first page, in whatever order the table sorts
 b.click(more());await b.wait(50);ok(body()===400,'Materials: Show 200 more -> 400 rows ('+body()+')');
 b.click(all());await b.wait(100);ok(body()===1000,'Materials: Show all -> all 1,000 rows ('+body()+')');ok(b.$('#v [data-more]')===null,'Materials: pager gone once everything is shown');
 ok(hasId(lastId)&&hasId(midId),'Materials: a record from deep in the list ('+midId+', '+lastId+') is visible after Show all');
 // leaving and returning keeps the choice; recalculation resets to the first page
 await b.tab('Overview');await b.tab('Materials');ok(body()===1000,'Materials: choice kept when returning to the tab');
 // 3. results untouched by paging
 ok(snapR()===before,'results (items, risk classes, actions, suppliers, totals) identical before and after paging');
 // 4. export holds every row regardless of what is drawn
 await b.tab('Settings');let wb=null;b.w.XLSX.writeFile=x=>{wb=x};b.click(b.$('#ex'));await b.wait(500);
 ok(!!wb&&/^Export created/.test(b.$('#st').textContent),'export created');const cnt=n=>wb&&wb.Sheets[n]?b.w.XLSX.utils.sheet_to_json(wb.Sheets[n]).length:-1;
 ok(cnt('ENG_RM')===1000&&cnt('ENG_FG')===500,'export: ENG_RM has '+cnt('ENG_RM')+' rows and ENG_FG '+cnt('ENG_FG')+' (every record)');ok(cnt('ENG_Suppliers')===b.w.eval('R.sup.length'),'export: every supplier row present');
 // 5. paging in the other big tabs, and a fresh drawing starts at the first page
 b.click([...b.w.document.querySelectorAll('#nav [data-t]')].find(x=>x.dataset.t==='Settings'));await b.tab('Settings');b.click(b.$('#rc'));await b.wait(500);await b.tab('Materials');ok(body()===200,'after Recalculate the table starts again at the first page ('+body()+')');
 for(const t of ['Reorder policy','MRP','Finished goods']){await b.tab(t);const n=b.$('#v').querySelectorAll('table tr').length-1,note=/Showing the first (\d+) of (\d+) rows/.exec(b.$('#v').textContent);ok(n<=200+1&&(!note||+note[1]===200),t+': drawn rows capped ('+n+')'+(note?', note "'+note[0]+'"':''))}
 ok(b.errs.length===0,'no script errors ('+b.errs.join(' | ')+')');
 console.log(`test-paging: ${pass} passed, ${fail} failed`);process.exit(fail?1:0)})();
