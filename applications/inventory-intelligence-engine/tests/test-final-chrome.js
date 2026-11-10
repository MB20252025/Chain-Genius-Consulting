// Needs the Git repository (the RC tree is extracted from tag v0.6-candidate-4-rc) or RC_TREE=<folder>. Final hardening: tests for the two authorised UI fixes, in headless Chrome (NOT a physical Android device).
// F1 Settings draft: several values survive repeated tab switches without any recalculation; Apply and Reset behave as before; the applied config is separate; results after Apply equal the RC's.
// F2 Summary at 360/412/desktop with a normal and a very long file name: no horizontal page overflow, full name kept (not truncated); layout of all 17 tabs at 3 widths identical to the RC except where the fix applies.
const {chromium}=require('playwright'),path=require('path'),os=require('os'),fs=require('fs');
const ROOT=path.resolve(__dirname,'..'),RC=process.env.RC_TREE||(()=>{const d=fs.mkdtempSync(path.join(os.tmpdir(),'rc-')),cp=require('child_process');cp.execSync('git -C "'+path.resolve(__dirname,'..')+'" archive v0.6-candidate-4-rc | tar -x -C '+d);return d})(),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fin-'));let pass=0,fail=0;const ok=(c,m)=>{c?(pass++,process.env.VERBOSE&&console.log('PASS:',m)):(fail++,console.log('FAIL:',m))};
const NS=path.join(__dirname,'fixtures/northstar/Chain_Genius_Project_001_Northstar_Dataset_1.xlsx');
const LONG='Chain_Genius_Project_001_Northstar_Dataset_1_FINAL_v2_for_client_review_with_all_regional_sites_2026-11-09_(copy_of_copy)_UNBROKEN.xlsx';
const longF=path.join(tmp,LONG);fs.copyFileSync(NS,longF);
const load=async(b,root,file,W,H)=>{const ctx=await b.newContext({viewport:{width:W,height:H}}),p=await ctx.newPage(),errs=[];p.on('pageerror',e=>errs.push(String(e).slice(0,160)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,160))});await p.goto('file://'+root+'/index.html');await p.setInputFiles('#f',file);await p.waitForFunction(()=>document.querySelector('#st').textContent==='Analysed.',null,{timeout:120000});p.errs=errs;p.ctx=ctx;return p};
const tab=(p,t)=>p.click('#nav [data-t="'+t+'"]'),val=(p,k)=>p.$eval('input[data-k="'+k+'"]',e=>e.value),cfg=(p,k)=>p.evaluate(k=>CFG[k],k);
(async()=>{const b=await chromium.launch();
 // ---------- F1
 for(const [vn,W,H] of [['desktop',1280,800],['412',412,915],['360',360,800]]){const p=await load(b,ROOT,NS,W,H),T='[F1 '+vn+'] ';
  await p.evaluate(()=>{window.__an=0;window.__run=0;const a=window.analyse,r=window.run;window.analyse=function(){window.__an++;return a.apply(this,arguments)};window.run=function(){window.__run++;return r.apply(this,arguments)}});
  const D={z:'1.9',supMinPO:'8',outZ:'4.2',abcA:'70',ltMinSup:'7',supMed:'55',basis:'6'},C0={};
  await tab(p,'Settings');for(const k of Object.keys(D))C0[k]=await cfg(p,k);for(const [k,v] of Object.entries(D))await p.fill('input[data-k="'+k+'"]',v);
  const tabs=await p.$$eval('#nav [data-t]',e=>e.map(x=>x.dataset.t));
  for(const rep of [1,2,3]){for(const t of tabs.filter(x=>x!=='Settings')){await tab(p,t)}await tab(p,'Settings')}
  let same=true;for(const [k,v] of Object.entries(D))if(await val(p,k)!==v)same=false;ok(same,T+'7 unapplied values (z, supMinPO, outZ, abcA, ltMinSup, supMed, basis) all survive 3 rounds through all 16 other tabs');
  let cfgSame=true;for(const k of Object.keys(D))if(await cfg(p,k)!==C0[k])cfgSame=false;ok(cfgSame,T+'the applied configuration (CFG) is unchanged by typing and navigating');
  ok(await p.evaluate(()=>window.__an)===0&&await p.evaluate(()=>window.__run)===0,T+'no analysis and no recalculation ran while switching tabs ('+await p.evaluate(()=>window.__an)+' analyse, '+await p.evaluate(()=>window.__run)+' run)');
  // an untouched field still shows the applied value
  ok(await val(p,'hor')===String(await cfg(p,'hor')),T+'an untouched setting still shows its applied value');
  // resize/orientation
  await p.setViewportSize({width:H,height:W});await p.waitForTimeout(450);ok(await val(p,'z')==='1.9','T+rotation keeps the draft'.replace('T+',T));await p.setViewportSize({width:W,height:H});await p.waitForTimeout(450);
  // Apply
  await p.click('#rc');await p.waitForTimeout(1500);let ap=true;for(const [k,v] of Object.entries(D))if(String(await cfg(p,k))!==String(+v))ap=false;ok(ap,T+'Apply (Recalculate) applies every draft value to CFG');
  await tab(p,'Overview');await tab(p,'Settings');let shown=true;for(const [k,v] of Object.entries(D))if(await val(p,k)!==String(+v))shown=false;ok(shown,T+'after Apply and a tab round trip Settings shows the applied values');
  ok(await p.evaluate(()=>Object.keys(setDraft).length)===0,T+'Apply clears the draft');
  // out of range
  await p.fill('input[data-k="z"]','99');await tab(p,'Overview');await tab(p,'Settings');ok(await val(p,'z')==='99','T+an out-of-range draft (99) is kept as typed until Apply'.replace('T+',T));await p.click('#rc');await p.waitForTimeout(1500);const zmax=await cfg(p,'z');ok(zmax<99&&await val(p,'z')===String(zmax),T+'Apply still clamps out-of-range input as before (z=99 becomes '+zmax+') and shows the clamped value');
  // Reset
  await p.fill('input[data-k="outZ"]','9');await tab(p,'Overview');await tab(p,'Settings');ok(await val(p,'outZ')==='9',T+'new draft kept');await p.click('#rs');await p.waitForTimeout(1500);const d0=await p.evaluate(()=>CFG0.outZ);ok(await cfg(p,'outZ')===d0&&await val(p,'outZ')===String(d0)&&await val(p,'z')===String(await p.evaluate(()=>CFG0.z)),T+'Reset restores every default and replaces the draft');ok(await p.evaluate(()=>Object.keys(setDraft).length)===0,T+'Reset clears the draft');
  ok(!p.errs.length,T+'no console or page errors'+(p.errs.length?': '+p.errs[0]:''));await p.ctx.close()}
 // F1 equivalence: after Apply, results equal the RC's
 {const mk=async root=>{const p=await load(b,root,NS,1280,800);await tab(p,'Settings');await p.fill('input[data-k="z"]','1.9');await p.fill('input[data-k="supMinPO"]','8');await p.click('#rc');await p.waitForTimeout(1500);const r=await p.evaluate(()=>JSON.stringify({fg:R.fg.map(x=>[x.id,x.val,x.ss,x.rop,x.sev,x.act]),rm:R.rm.map(x=>[x.id,x.val,x.ss,x.rop,x.sev,x.act]),sup:R.sup.map(s=>[s.id,s.score,s.cat,s.evid]),dq:R.dq.length,tot:R.tot}));await p.ctx.close();return r};
  const a=await mk(ROOT),c=await mk(RC);ok(a===c&&a.length>1000,'[F1] after changing z and supMinPO and applying, items, risk classes, suppliers, data-quality count and totals are identical to the RC ('+a.length+' chars compared)')}
 // ---------- F2
 for(const [vn,W,H] of [['desktop',1280,800],['412',412,915],['360',360,800]])for(const [fn,f] of [['normal name',NS],['very long name',longF]]){const p=await load(b,ROOT,f,W,H),T='[F2 '+vn+', '+fn+'] ';
  const tabs=await p.$$eval('#nav [data-t]',e=>e.map(x=>x.dataset.t)),over=[];for(const t of tabs){await tab(p,t);await p.waitForTimeout(40);const m=await p.evaluate(()=>[document.documentElement.scrollWidth,innerWidth]);if(m[0]>m[1]+1)over.push(t+' '+m[0]+'>'+m[1])}
  ok(!over.length,T+'no horizontal page overflow on any of the 17 tabs'+(over.length?': '+over.join(', '):''));
  await tab(p,'Summary');const h=await p.$eval('#v h2',e=>e.innerText),nm=path.basename(f);ok(h.includes(nm),T+'Summary heading keeps the whole file name, untruncated');
  ok(await p.$eval('#v h2',e=>e.scrollWidth<=e.clientWidth+1),T+'the heading text fits its box (wrapped, not clipped or scrolled)');
  const ov=await p.evaluate(()=>[...document.querySelectorAll('#v h2')].filter(e=>e.scrollWidth>e.clientWidth+1).length);ok(ov===0,T+'no heading on the Summary tab is wider than its box');
  ok(!p.errs.length,T+'no console or page errors');await p.ctx.close()}
 // layout identical to the RC for the normal Northstar name (all tabs, 3 widths) except Summary at 360
 for(const [vn,W,H] of [['desktop',1280,800],['412',412,915],['360',360,800]]){const snap=async root=>{const p=await load(b,root,NS,W,H),o={};const tabs=await p.$$eval('#nav [data-t]',e=>e.map(x=>x.dataset.t));for(const t of tabs){await tab(p,t);await p.waitForTimeout(40);o[t]=await p.evaluate(()=>[...document.querySelectorAll('#v *')].map(e=>{const r=e.getBoundingClientRect();return e.tagName+':'+Math.round(r.x)+','+Math.round(r.y)+','+Math.round(r.width)+','+Math.round(r.height)}).join('|'))}await p.ctx.close();return o};
  const A=await snap(ROOT),B=await snap(RC),diff=Object.keys(A).filter(t=>A[t]!==B[t]);
  ok(vn==='360'?(diff.every(t=>t==='Summary')):diff.length===0,'[F2 '+vn+'] layout (position and size of every element) of all 17 tabs identical to the RC'+(vn==='360'?' except Summary, which is the fixed screen':'')+(diff.length?' (differs: '+diff.join(', ')+')':''))}
 await b.close();console.log(`test-final-chrome: ${pass} passed, ${fail} failed`);process.exit(fail?1:0)})().catch(e=>{console.log('CRASH',e);process.exit(2)});
