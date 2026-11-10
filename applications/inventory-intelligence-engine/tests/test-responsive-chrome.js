// Candidate 4 (item 4): responsive pagination in real Chrome. 200 rows above 600 px, 50 rows at or below 600 px.
// Crossing the line redraws the current tab once, ~150 ms after resizing stops, keeps "Show all", the scroll position and view-local choices
// (Demand forecast SKU selector, Settings inputs), and does nothing when the page size is unchanged.  NOTE: desktop Chrome resized to phone widths, not a physical Android test.
const {chromium}=require('playwright'),path=require('path'),os=require('os'),fs=require('fs'),{spawnSync}=require('child_process');
const ROOT=path.resolve(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'rs-')),BIG=path.join(tmp,'items-1500.xlsx');let pass=0,fail=0;const ok=(c,m)=>{c?(pass++,process.env.VERBOSE&&console.log('PASS:',m)):(fail++,console.log('FAIL:',m))};
(async()=>{const g=spawnSync('node',[path.join(__dirname,'gen-large-workbook.js'),BIG,'--items=1500'],{encoding:'utf8'});ok(g.status===0,'generated 1,500-item workbook');
 const b=await chromium.launch(),ctx=await b.newContext({viewport:{width:1280,height:800}}),p=await ctx.newPage(),errs=[];p.on('pageerror',e=>errs.push(String(e).slice(0,120)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,120))});
 await p.goto('file://'+ROOT+'/index.html');await p.setInputFiles('#f',BIG);await p.waitForFunction(()=>document.querySelector('#st').textContent==='Analysed.',null,{timeout:120000});
 // count redraws
 await p.evaluate(()=>{window.__n=0;const o=window.show;window.show=function(){window.__n++;return o.apply(this,arguments)}});
 const renders=()=>p.evaluate(()=>window.__n),reset=()=>p.evaluate(()=>{window.__n=0}),rows=()=>p.$$eval('#v table tr',r=>r.length-1),tab=t=>p.click('#nav [data-t="'+t+'"]'),size=async w=>{await p.setViewportSize({width:w,height:800})},settle=()=>p.waitForTimeout(450);
 await tab('Materials');await reset();
 // A. 1280 -> 600: 200 -> 50
 ok(await rows()===200,'A1 wide (1280 px): Materials draws 200 rows ('+await rows()+')');await size(600);await settle();ok(await rows()===50,'A2 resized to exactly 600 px: 50 rows ('+await rows()+')');ok(await renders()===1,'A3 one redraw for the crossing ('+await renders()+')');
 await size(601);await settle();ok(await rows()===200,'A4 resized to 601 px: back to 200 rows ('+await rows()+')');
 // B. same band: no redraw
 await reset();await size(900);await settle();await size(1100);await settle();ok(await renders()===0,'B1 resizing inside the wide band (601 -> 900 -> 1100 px) causes no redraw ('+await renders()+')');
 await size(500);await settle();await reset();await size(380);await settle();await size(320);await settle();ok(await renders()===0,'B2 resizing inside the narrow band (500 -> 380 -> 320 px) causes no redraw');
 // C. debounce: a burst of resizes across the line gives one redraw, after the burst
 await size(1280);await settle();await reset();
 for(const w of [900,500,700,450,800,560]){await p.setViewportSize({width:w,height:800});await p.waitForTimeout(20)}
 ok(await renders()===0,'C1 no redraw while the burst is still in progress ('+await renders()+')');await settle();ok(await renders()===1&&await rows()===50,'C2 exactly one redraw after the burst, at the final width (560 px): 50 rows ('+await renders()+' redraw, '+await rows()+' rows)');
 const t0=await p.evaluate(()=>new Promise(res=>{const t=performance.now();let c=0;const o=window.show;window.show=function(){const d=performance.now()-t;window.show=o;res(d);return o.apply(this,arguments)};window.dispatchEvent(new Event('resize'));setTimeout(()=>res(-1),600)}));ok(t0===-1,'C3 a resize event that does not change the page size does not redraw');
 await size(1280);await settle();
 // D. "Show all" survives a crossing in both directions
 await tab('Materials');await p.click('#v [data-more][data-all]');await p.waitForTimeout(500);ok(await rows()===1000,'D1 Show all -> 1,000 rows');await size(480);await settle();ok(await rows()===1000,'D2 narrow: Show all kept (1,000 rows)');await size(1280);await settle();ok(await rows()===1000,'D3 wide again: Show all kept (1,000 rows)');ok(await p.$('#v [data-more]')===null,'D4 no pager while everything is shown');
 // E. "Show more" count kept; scroll position restored
 await size(480);await settle();await tab('Finished goods');await p.waitForTimeout(100);const n0=await rows();ok(n0===50,'E1 Finished goods at 480 px: 50 rows ('+n0+')');
 await p.click('#v [data-more]:not([data-all])');await p.waitForTimeout(300);ok(await rows()===100,'E2 Show more -> 100 rows');
 await p.evaluate(()=>window.scrollTo(0,1500));await p.waitForTimeout(100);const y0=await p.evaluate(()=>Math.round(scrollY));ok(y0>1000,'E3 scrolled down ('+y0+' px)');
 await size(1280);await settle();const y1=await p.evaluate(()=>Math.round(scrollY));ok(Math.abs(y1-y0)<=2,'E4 scroll position kept across the redraw ('+y0+' -> '+y1+' px)');ok(await rows()===200,'E5 wide: at least a full page of 200 rows ('+await rows()+')');
 await p.evaluate(()=>window.scrollTo(0,1200));await p.waitForTimeout(100);const y2=await p.evaluate(()=>Math.round(scrollY));await size(480);await settle();const y3=await p.evaluate(()=>Math.round(scrollY));ok(Math.abs(y3-y2)<=2,'E6 scroll position kept going back to narrow ('+y2+' -> '+y3+' px)');
 // F. view-local choices: Demand forecast SKU selector, policy filter
 await size(1280);await settle();await tab('Demand forecast');const opts=await p.$$eval('#fsel option',o=>o.map(x=>x.value));ok(opts.length>=3,'F1 Demand forecast has a SKU selector ('+opts.length+' SKUs)');
 const pick=opts[2];await p.selectOption('#fsel',pick);await p.waitForTimeout(300);ok(await p.$eval('#fsel',e=>e.value)===pick,'F2 selected SKU '+pick);
 await reset();await size(480);await settle();ok(await p.evaluate(()=>tab)==='Demand forecast','F3 still on the Demand forecast tab after the crossing');ok(await p.$eval('#fsel',e=>e.value)===pick,'F4 SKU selector keeps '+pick+' after narrow ('+await p.$eval('#fsel',e=>e.value)+')');
 await size(1280);await settle();ok(await p.$eval('#fsel',e=>e.value)===pick,'F5 SKU selector keeps '+pick+' after wide again');
 const dfN=await rows();ok(await p.evaluate(()=>tab)==='Demand forecast','F6 tab unchanged ('+dfN+' table rows)');
 // G. tabs with no long table are not redrawn, so typed Settings values are not lost
 await tab('Settings');await p.fill('input[data-k="z"]','1.9');await reset();await size(480);await settle();ok(await renders()===0,'G1 Settings tab: no redraw on the crossing ('+await renders()+')');ok(await p.$eval('input[data-k="z"]',e=>e.value)==='1.9','G2 an edited but unapplied Settings value (1.9) is kept');
 await size(1280);await settle();ok(await p.$eval('input[data-k="z"]',e=>e.value)==='1.9','G3 ...and kept after widening');
 await tab('Overview');await reset();await size(480);await settle();ok(await renders()===0,'G4 Overview (no table over 50 rows): no redraw');
 // H. data untouched
 ok(await p.evaluate(()=>R.rm.length===1000&&R.fg.length===500),'H1 engine still holds all 500 finished goods and 1,000 materials');
 ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'H2 no sideways page scroll at 480 px');
 // I. tab switch after a crossing uses the new page size
 await tab('Reorder policy');ok(await rows()===50,'I1 switching to Reorder policy (not yet touched) at 480 px draws 50 rows ('+await rows()+')');await size(1280);await settle();ok(await rows()===200,'I2 ...and 200 after widening ('+await rows()+')');
 ok(errs.length===0,'no console errors ('+errs.join(' | ')+')');await b.close();console.log(`test-responsive-chrome: ${pass} passed, ${fail} failed`);process.exit(fail?1:0)})();
