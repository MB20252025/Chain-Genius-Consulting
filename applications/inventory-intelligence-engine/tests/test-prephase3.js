// Pre-Phase 3 check (approved cleanup items B.1, B.2, B.4): static evidence from the source, plus real-Chrome orientation checks.
// Static: one live Forecast accuracy view; the Math.min(100,fill) guard and the per-line cap are present; 200/50 rows at the 600 px line; debounced resize handler that keeps view state.
// Runtime (Chrome device emulation with a real orientation change, not a physical phone): rotating 412x915 <-> 915x412 and 360x800 <-> 800x360 redraws once, keeps Show all, the scroll position and the Demand forecast SKU.
const fs=require('fs'),path=require('path'),os=require('os'),{spawnSync}=require('child_process');const ROOT=path.resolve(__dirname,'..');let pass=0,fail=0;const ok=(c,m)=>{c?(pass++,process.env.VERBOSE&&console.log('PASS:',m)):(fail++,console.log('FAIL:',m))};
const app=fs.readFileSync(ROOT+'/js/app.js','utf8'),calc=fs.readFileSync(ROOT+'/js/calculations.js','utf8'),css=fs.readFileSync(ROOT+'/css/styles.css','utf8');
const line=(s,re)=>{const i=s.split('\n').findIndex(l=>re.test(l));return i<0?-1:i+1};
// B.1
ok((app.match(/views\['Forecast accuracy'\]\s*=/g)||[]).length===1,'B.1a exactly one views[\'Forecast accuracy\'] assignment (app.js line '+line(app,/views\['Forecast accuracy'\]\s*=/)+')');
ok(!/^\s*'Forecast accuracy'\s*\(\)\s*\{/m.test(app)&&!/\bviews\s*=\s*\{[^}]*'Forecast accuracy'/.test(app),'B.1b no object-literal or second definition of Forecast accuracy');
const names=[...app.matchAll(/^views(?:\.([A-Za-z]+)|\['([^']+)'\])\s*=/gm)].map(m=>m[1]||m[2]);ok(names.length===new Set(names).size,'B.1c no view name is assigned twice ('+names.length+' views assigned, '+new Set(names).size+' distinct)');
// B.2
ok(/Math\.min\(100,fill\)/.test(calc),'B.2a Math.min(100,fill) remains in the supplier score (calculations.js line '+line(calc,/Math\.min\(100,fill\)/)+')');
ok(/fill=aq\.length\?aq\.reduce\(\(s,r\)=>s\+Math\.min\(r\.Received_Qty,r\.Ordered_Qty\),0\)/.test(calc),'B.2b per-line cap Math.min(Received_Qty,Ordered_Qty) is still in the fill sum (Phase 3B: summed over the lines with valid quantities, aq)');
ok(/score=ad\.length&&aq\.length\?\.5\*otd\+\.2\*stab\+\.15\*Math\.min\(100,fill\)\+\.15\*ls:null/.test(calc),'B.2c supplier score weights unchanged: 50% on-time, 20% stability, 15% fill, 15% lateness (Phase 3B: calculated only when date and quantity evidence both exist, otherwise null)');
// B.4
ok(/PAGE_WIDE=200,PAGE_NARROW=50/.test(app)&&/matchMedia\('\(max-width:600px\)'\)\.matches\?PAGE_NARROW:PAGE_WIDE/.test(app),'B.4a 200 rows above 600 px, 50 rows at or below 600 px (max-width:600px matches at 600) (app.js line '+line(app,/PAGE_WIDE=200/)+')');
ok(/@media\(max-width:600px\)/.test(css),'B.4b the CSS narrow-screen rules use the same 600 px line');
const rl=app.split('\n').find(l=>/addEventListener\('resize'/.test(l))||'';ok(/clearTimeout\(rzT\);rzT=setTimeout\(/.test(rl)&&/\},150\)/.test(rl),'B.4c resize handler is debounced at 150 ms (app.js line '+line(app,/addEventListener\('resize'/)+')');
ok(/pgSize\(\)===lastPg\)return/.test(rl)&&/tblMax<=PAGE_NARROW\)return/.test(rl),'B.4d it does nothing when the page size is unchanged or no table is longer than 50 rows');
ok(/const y=lastY;show\(\);window\.scrollTo\(0,y\)/.test(app),'B.4e it redraws the current tab (show()) and restores the scroll position remembered from before the resize');
ok(/^let pf='all',fsku=null;/m.test(app)&&/^let prAll=false;/m.test(app)&&/let shown=\{\}/.test(app),'B.4f view state (SKU selector fsku, policy filter pf, production toggle prAll, Show all shown{}) lives in top-level variables outside the drawn HTML (lines '+line(app,/^let pf=/)+', '+line(app,/^let prAll/)+', '+line(app,/let shown=/)+')');
ok(!/orientationchange/.test(app),'B.4g (information) there is no separate orientationchange listener: a rotation changes the viewport, which fires resize, and that is what the handler uses');
// runtime: real orientation change under device emulation
(async()=>{const {chromium}=require('playwright');const BIG=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'ph3-')),'items-1500.xlsx');const g=spawnSync('node',[path.join(__dirname,'gen-large-workbook.js'),BIG,'--items=1500'],{encoding:'utf8'});ok(g.status===0,'generated 1,500-item workbook');
 const b=await chromium.launch(),errs=[];
 for(const [w,h,label] of [[412,915,'412x915'],[360,800,'360x800']]){const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:2.6,isMobile:true,hasTouch:true}),p=await ctx.newPage(),cdp=await ctx.newCDPSession(p);p.on('pageerror',e=>errs.push(String(e).slice(0,120)));p.on('console',x=>{if(x.type()==='error')errs.push(x.text().slice(0,120))});
  const L=label+' portrait<->landscape: ',orient=async(portrait)=>{await cdp.send('Emulation.setDeviceMetricsOverride',{width:portrait?w:h,height:portrait?h:w,deviceScaleFactor:2.6,mobile:true,screenOrientation:{type:portrait?'portraitPrimary':'landscapePrimary',angle:portrait?0:90}});await p.waitForTimeout(500)};
  await p.goto('file://'+ROOT+'/index.html');await p.setInputFiles('#f',BIG);await p.waitForFunction(()=>document.querySelector('#st').textContent==='Analysed.',null,{timeout:120000});
  await p.evaluate(()=>{window.__r=0;window.__o=0;addEventListener('resize',()=>window.__r++);addEventListener('orientationchange',()=>window.__o++);window.__n=0;const s=window.show;window.show=function(){window.__n++;return s.apply(this,arguments)}});
  const rows=()=>p.$$eval('#v table tr',r=>r.length-1),tab=t=>p.tap('#nav [data-t="'+t+'"]');
  await tab('Reorder policy');ok(await rows()===50,L+'portrait draws 50 rows ('+await rows()+')');
  await p.evaluate(()=>window.scrollTo(0,900));await p.waitForTimeout(100);const y0=await p.evaluate(()=>Math.round(scrollY));
  await p.evaluate(()=>{window.__n=0});await orient(false);ok(await p.evaluate(()=>window.innerWidth)===h,L+'rotated: viewport is '+h+' px wide');ok(await p.evaluate(()=>window.__r)>=1,L+'rotation fired a resize event ('+await p.evaluate(()=>window.__r)+'; orientationchange events: '+await p.evaluate(()=>window.__o)+')');
  ok(await rows()===200,L+'landscape ('+h+' px, above 600) draws 200 rows ('+await rows()+')');ok(await p.evaluate(()=>window.__n)===1,L+'one redraw for the rotation ('+await p.evaluate(()=>window.__n)+')');
  const y1=await p.evaluate(()=>Math.round(scrollY));ok(Math.abs(y1-y0)<=2,L+'scroll position kept ('+y0+' -> '+y1+' px)');
  await orient(true);ok(await rows()===50,L+'back to portrait: 50 rows ('+await rows()+')');
  // Show all survives rotation both ways
  await tab('Materials');await p.locator('#v [data-more][data-all]').tap();await p.waitForTimeout(600);ok(await rows()===1000,L+'Show all -> 1,000 rows');await orient(false);ok(await rows()===1000,L+'Show all kept in landscape');await orient(true);ok(await rows()===1000,L+'Show all kept in portrait again');
  // view-local selection (Demand forecast SKU)
  await tab('Demand forecast');const opts=await p.$$eval('#fsel option',o=>o.map(x=>x.value));ok(opts.length>=3,L+'Demand forecast has a SKU selector ('+opts.length+' SKUs)');await p.selectOption('#fsel',opts[2]);await p.waitForTimeout(300);await orient(false);ok(await p.$eval('#fsel',e=>e.value)===opts[2]&&await p.evaluate(()=>tab)==='Demand forecast',L+'SKU '+opts[2]+' and the tab kept after rotating to landscape');await orient(true);ok(await p.$eval('#fsel',e=>e.value)===opts[2],L+'SKU kept after rotating back');
  await ctx.close()}
 ok(errs.length===0,'no console errors ('+errs.join(' | ')+')');await b.close();console.log(`test-prephase3: ${pass} passed, ${fail} failed`);process.exit(fail?1:0)})();
