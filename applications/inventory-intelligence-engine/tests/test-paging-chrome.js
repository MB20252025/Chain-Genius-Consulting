// Real-Chrome check of paging: a phone-sized screen (<=600 px wide) draws 50 rows at a time, a wide screen 200.
// Checks: pager visible, taps reveal rows, scroll position kept, touch-target size, no sideways scroll, no console errors, all data still exported.
// Usage: node test-paging-chrome.js   (generates a 1,500-item workbook; needs playwright + NODE_PATH for xlsx)
// NOTE: this is desktop Chrome emulating a phone screen. It is not a physical Android test.
const {chromium}=require('playwright'),path=require('path'),os=require('os'),fs=require('fs'),{spawnSync}=require('child_process');
const ROOT=path.resolve(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'pg-')),BIG=path.join(tmp,'items-1500.xlsx');let pass=0,fail=0;const ok=(c,m)=>{c?(pass++,process.env.VERBOSE&&console.log('PASS:',m)):(fail++,console.log('FAIL:',m))};
const modes=[{name:'phone 412 px',ctx:{viewport:{width:412,height:915},deviceScaleFactor:2.6,isMobile:true,hasTouch:true},page:50,touch:true},{name:'phone 360 px',ctx:{viewport:{width:360,height:740},deviceScaleFactor:3,isMobile:true,hasTouch:true},page:50,touch:true},{name:'phone 600 px (edge of the narrow rule)',ctx:{viewport:{width:600,height:900}},page:50},{name:'tablet 601 px (just above the rule)',ctx:{viewport:{width:601,height:900}},page:200},{name:'desktop 1280 px',ctx:{viewport:{width:1280,height:800}},page:200}];
(async()=>{const g=spawnSync('node',[path.join(__dirname,'gen-large-workbook.js'),BIG,'--items=1500'],{encoding:'utf8'});ok(g.status===0,'generated 1,500-item workbook');
 const b=await chromium.launch();
 for(const m of modes){const ctx=await b.newContext(m.ctx),p=await ctx.newPage(),errs=[],N=m.page,L=m.name+': ';p.on('pageerror',e=>errs.push(String(e).slice(0,120)));p.on('console',x=>{if(x.type()==='error')errs.push(x.text().slice(0,120))});
  await p.goto('file://'+ROOT+'/index.html');await p.setInputFiles('#f',BIG);await p.waitForFunction(()=>document.querySelector('#st').textContent==='Analysed.',null,{timeout:120000});
  const press=l=>m.touch?l.tap():l.click();await press(p.locator('#nav [data-t="Materials"]'));const rows=()=>p.$$eval('#v table tr',r=>r.length-1);
  ok(await rows()===N,L+'Materials draws '+N+' of 1,000 rows ('+await rows()+')');
  const NT=await p.$eval('#v',e=>e.textContent);ok(new RegExp('Showing the first '+N+' of 1000 rows\\. All 1000 rows are used in the calculations and are included in the Excel export\\.').test(NT),L+'note says '+N+' of 1000, all used and exported');
  ok(NT.includes('Show '+N+' more'),L+'button reads "Show '+N+' more"');
  const more=p.locator('#v [data-more]:not([data-all])');await more.scrollIntoViewIfNeeded();const y0=await p.evaluate(()=>Math.round(scrollY));
  const bx=await more.boundingBox();ok(bx.height>=40&&bx.width>=40,L+'Show more button is a usable target ('+Math.round(bx.width)+' x '+Math.round(bx.height)+' px)');
  await press(more);await p.waitForTimeout(400);ok(await rows()===2*N,L+'Show more -> '+2*N+' rows ('+await rows()+')');const y1=await p.evaluate(()=>Math.round(scrollY));ok(Math.abs(y1-y0)<=2,L+'scroll position kept after Show more ('+y0+' -> '+y1+' px)');
  await press(p.locator('#v [data-more][data-all]'));await p.waitForTimeout(600);ok(await rows()===1000,L+'Show all -> 1,000 rows');ok(await p.$('#v [data-more]')===null,L+'pager gone when all rows are shown');
  ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),L+'no sideways page scroll');
  // the engine and the export still hold every record whatever is drawn
  ok(await p.evaluate(()=>R.rm.length===1000&&R.fg.length===500),L+'engine holds all 500 finished goods and 1,000 materials');
  ok(errs.length===0,L+'no console errors ('+errs.join(' | ')+')');await ctx.close()}
 // narrow screen on a small table: nothing paged when the table has fewer rows than a page; Northstar tables are <=150 rows so tables over 50 rows are paged on a phone, none on desktop
 {const ctx=await b.newContext(modes[0].ctx),p=await ctx.newPage();await p.goto('file://'+ROOT+'/index.html');await p.setInputFiles('#f',path.join(__dirname,'fixtures/northstar/Chain_Genius_Project_001_Northstar_Dataset_1.xlsx'));await p.waitForFunction(()=>document.querySelector('#st').textContent==='Analysed.',null,{timeout:60000});
  await p.tap('#nav [data-t="Materials"]');const n=await p.$$eval('#v table tr',r=>r.length-1);ok(n===50,'phone, Northstar Materials (100 rows): first 50 drawn ('+n+')');ok(/Showing the first 50 of 100 rows/.test(await p.$eval('#v',e=>e.textContent)),'phone, Northstar Materials: note says 50 of 100');
  await p.tap('#v [data-more][data-all]');await p.waitForTimeout(200);ok(await p.$$eval('#v table tr',r=>r.length-1)===100,'phone, Northstar Materials: Show all gives all 100');
  await ctx.close()}
 await b.close();console.log(`test-paging-chrome: ${pass} passed, ${fail} failed`);process.exit(fail?1:0)})();
