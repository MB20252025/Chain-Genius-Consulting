// Real Chrome: (a) the Suppliers "Over-delivered units / lines" columns on desktop and narrow screens, (b) the real Excel download: correct, repeatable and non-mutating.
// Usage: node test-suppliers-export-chrome.js   (works on any copy of the project, including one unzipped on its own). Screenshots go to logs/screens-suppliers-*.
// NOTE: desktop Chrome resized/emulating a phone; not a physical Android test.
const {chromium}=require('playwright'),path=require('path'),fs=require('fs'),os=require('os'),http=require('http');global.XLSX=require('xlsx');
const ROOT=path.resolve(__dirname,'..'),NS=path.join(__dirname,'fixtures/northstar/Chain_Genius_Project_001_Northstar_Dataset_1.xlsx'),OS=path.join(__dirname,'fixtures/edge/scenario-overshort.xlsx');
const SH=path.join(__dirname,'logs','screens-suppliers-'+new Date().toISOString().replace(/[-:]/g,'').slice(0,15)+'Z');fs.mkdirSync(SH,{recursive:true});
let pass=0,fail=0;const ok=(c,m)=>{c?(pass++,process.env.VERBOSE&&console.log('PASS:',m)):(fail++,console.log('FAIL:',m))};
// serve over http like GitHub Pages (a project folder, relative links only)
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css'},srv=http.createServer((q,s)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u.endsWith('/'))u+='index.html';const f=path.join(ROOT,u);if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){s.writeHead(404);return s.end('nf')}s.writeHead(200,{'content-type':mime[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(s)});
const sig=w=>JSON.stringify(w.SheetNames)+'|'+w.SheetNames.map(n=>n+':'+require('crypto').createHash('md5').update(XLSX.utils.sheet_to_csv(w.Sheets[n])).digest('hex')).join(',');
(async()=>{await new Promise(r=>srv.listen(0,r));const URL='http://127.0.0.1:'+srv.address().port+'/',b=await chromium.launch();
 const modes=[{n:'desktop 1280',ctx:{viewport:{width:1280,height:800},acceptDownloads:true},click:'click'},{n:'phone 412',ctx:{viewport:{width:412,height:915},deviceScaleFactor:2.6,isMobile:true,hasTouch:true,acceptDownloads:true},click:'tap'},{n:'phone 360',ctx:{viewport:{width:360,height:740},deviceScaleFactor:3,isMobile:true,hasTouch:true,acceptDownloads:true},click:'tap'}];
 for(const m of modes)for(const [wn,wf] of [['Northstar',NS],['over/short scenario',OS]]){const L=m.n+' / '+wn+': ',ctx=await b.newContext(m.ctx),p=await ctx.newPage(),errs=[];p.on('pageerror',e=>errs.push(String(e).slice(0,120)));p.on('console',x=>{if(x.type()==='error')errs.push(x.text().slice(0,120))});
  await p.goto(URL);await p.setInputFiles('#f',wf);await p.waitForFunction(()=>document.querySelector('#st').textContent==='Analysed.',null,{timeout:60000});
  await p[m.click]('#nav [data-t="Suppliers"]');await p.waitForTimeout(150);
  const info=await p.evaluate(()=>{const t=[...document.querySelectorAll('#v table')].find(x=>/Over-delivered units/.test(x.textContent)),h=[...t.querySelectorAll('tr')[0].children],ix=h.findIndex(c=>/Over-delivered units/.test(c.textContent)),il=h.findIndex(c=>/Over-delivered lines/.test(c.textContent)),wrap=t.parentElement,rows=[...t.querySelectorAll('tr')].slice(1),eng=R.supRisk;
   return {ix,il,fill:h.findIndex(c=>/^Fill %/.test(c.textContent.trim())),wrapOverflow:getComputedStyle(wrap).overflowX,wrapScroll:wrap.scrollWidth,wrapClient:wrap.clientWidth,hw:[h[ix],h[il]].map(c=>Math.round(c.getBoundingClientRect().width)),pageScroll:document.documentElement.scrollWidth<=innerWidth+1,
    units:rows.map(r=>r.children[ix].textContent.trim()),lines:rows.map(r=>r.children[il].textContent.trim()),eu:eng.map(s=>String(Math.round(s.over))),el:eng.map(s=>String(s.overN)),n:rows.length}});
  ok(info.il===info.ix+1&&info.ix===info.fill+1,L+'columns sit straight after Fill % (positions '+info.fill+', '+info.ix+', '+info.il+')');
  ok(info.units.every((u,i)=>u.replace(/,/g,'')===info.eu[i])&&info.lines.every((u,i)=>u===info.el[i]),L+'every one of the '+info.n+' rows shows the engine values for units and lines');
  ok(info.hw.every(w=>w>20),L+'both headers have a real width ('+info.hw.join(' and ')+' px)');
  ok(info.pageScroll,L+'the page does not scroll sideways');
  if(m.n!=='desktop 1280'){ok(info.wrapOverflow==='auto'||info.wrapOverflow==='scroll',L+'the table sits in its own horizontal scroller (overflow-x '+info.wrapOverflow+')');ok(info.wrapScroll>info.wrapClient,L+'table is wider than the screen ('+info.wrapScroll+' > '+info.wrapClient+' px), so it scrolls inside its box')}
  // narrow: scroll the table box until the new columns are inside the visible screen
  const reach=await p.evaluate(()=>{const t=[...document.querySelectorAll('#v table')].find(x=>/Over-delivered units/.test(x.textContent)),w=t.parentElement,h=[...t.querySelectorAll('tr')[0].children],c=h.find(x=>/Over-delivered lines/.test(x.textContent));w.scrollLeft=w.scrollWidth;const r=c.getBoundingClientRect();return {left:Math.round(r.left),right:Math.round(r.right),vw:innerWidth}});
  ok(reach.left>=0&&reach.right<=reach.vw+1,L+'after scrolling the table sideways, "Over-delivered lines" is fully on screen ('+reach.left+'-'+reach.right+' of '+reach.vw+' px)');
  const unitsEl=await p.evaluate(()=>{const t=[...document.querySelectorAll('#v table')].find(x=>/Over-delivered units/.test(x.textContent)),w=t.parentElement;w.scrollLeft=w.scrollWidth;return 1});await p.waitForTimeout(100);await p.screenshot({path:path.join(SH,m.n.replace(/ /g,'-')+'-'+wn.replace(/[ /]/g,'-')+'-Suppliers.png')});
  // ---- (b) real download
  if(m.n!=='phone 360'){await p[m.click]('#nav [data-t="Settings"]');const before=await p.evaluate(()=>JSON.stringify(Object.keys(WB.Sheets)));
   const dl=async()=>{const [d]=await Promise.all([p.waitForEvent('download',{timeout:60000}),p[m.click]('#ex')]);const f=path.join(os.tmpdir(),'dl-'+Math.random().toString(36).slice(2)+'.xlsx');await d.saveAs(f);return XLSX.readFile(f,{cellDates:true})};
   const w1=await dl(),after1=await p.evaluate(()=>JSON.stringify(Object.keys(WB.Sheets)));
   ok(before===after1,L+'export leaves the uploaded workbook\'s sheets unchanged in the page ('+JSON.parse(before).length+' sheets)');
   const eng=w1.SheetNames.filter(s=>s.startsWith('ENG_'));ok(eng.length>=9&&w1.SheetNames.slice(0,8).join()===JSON.parse(before).join().split(',').slice(0,8).join(),L+'downloaded file has the original sheets first, then '+eng.length+' ENG_ sheets');
   const rows=XLSX.utils.sheet_to_json(w1.Sheets.ENG_Suppliers),E=await p.evaluate(()=>R.supRisk.map(s=>[s.id,s.over,s.overN,s.score==null?null:+s.score.toFixed(6)]));
   ok(rows.length===E.length&&E.every(([id,ov,on,sc],i)=>{const r=rows.find(q=>Object.values(q).includes(id));return r&&r.OverDeliveredUnits===ov&&r.OverDeliveredLines===on&&(sc==null||Math.abs(r.Score-sc)<1e-4)}),L+'downloaded ENG_Suppliers equals the engine for every supplier (units, lines, score)');
   const nFG=await p.evaluate(()=>R.fg.length),nRM=await p.evaluate(()=>R.rm.length);ok(XLSX.utils.sheet_to_json(w1.Sheets.ENG_FG).length===nFG&&XLSX.utils.sheet_to_json(w1.Sheets.ENG_RM).length===nRM,L+'ENG_FG and ENG_RM hold every record ('+nFG+' and '+nRM+')');
   const w2=await dl();ok(sig(w2)===sig(w1),L+'a second download is identical to the first (names and every cell)');
   await p[m.click]('#rc');await p.waitForTimeout(800);const w3=await dl();ok(sig(w3)===sig(w1),L+'after Recalculate a third download is still identical');
   ok(eng.every(n=>XLSX.utils.sheet_to_json(w1.Sheets[n]).length>=0)&&new Set(w1.SheetNames).size===w1.SheetNames.length,L+'no duplicate sheet names')}
  ok(errs.length===0,L+'no console errors ('+errs.join(' | ')+')');await ctx.close()}
 await b.close();srv.close();console.log(`test-suppliers-export-chrome: ${pass} passed, ${fail} failed`);process.exit(fail?1:0)})();
