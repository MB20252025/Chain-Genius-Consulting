#!/usr/bin/env bash
# v0.7 T1 unified test runner.
# Usage (from anywhere): NODE_PATH=<node_modules with the pinned test packages> bash tests/run-all.sh --fast|--full [--log <file>] [--remote <name or URL>]
#   --fast  per-commit tier: quick tests, UTC only, quick 100-call wrapper. About 30-60 s.
#   --full  checkpoint / pre-release tier: every test, 2 time zones (golden snapshots 5), the FULL 1,000-call wrapper. About 8 min.
# Statuses (per test; time zones folded in): PASS, FAIL, BLOCKED, REDUCED, ERROR. Accepted counts: tests/accepted-results.json.
# Exit code: 0 when there is no FAIL and no ERROR (accepted BLOCKED/REDUCED items allowed and always listed); 1 otherwise.
# Existing runners (run-regression.sh, run-a1.sh) are unchanged; this runner calls the same test files directly.
# Correction pass (11 Nov 2026): counts must EQUAL the accepted count (R2); a missing test file is ERROR even when blocked (R3);
# REDUCED also requires its documented reason (R4); the environment is recorded and checked (R9/R10); the control files are
# judged by check-control.js taken from the owner's approved baseline tag (R1).
cd "$(dirname "$0")" || exit 9
exec node - "$@" <<'JS'
const fs=require('fs'),path=require('path'),os=require('os'),cp=require('child_process');
const T=process.cwd(),APP=path.resolve(T,'..');
const argv=process.argv.slice(2),tier=argv.includes('--full')?'full':argv.includes('--fast')?'fast':null;
const li=argv.indexOf('--log'),LOG=li>=0?argv[li+1]:null,ri=argv.indexOf('--remote'),REMOTE=ri>=0?argv[ri+1]:'origin';
if(!tier){console.log('Usage: bash run-all.sh --fast|--full [--log <file>] [--remote <name or URL>]');process.exit(9)}
const A=JSON.parse(fs.readFileSync('accepted-results.json','utf8'));
const TMP=fs.mkdtempSync(path.join(os.tmpdir(),'runall-'));let logText='';
const log=s=>{logText+=s+'\n'};
const zonesOf=t=>tier==='fast'?['UTC']:t.zones==='five'?A.zones_five:t.zones==='two'?A.zones_two:['UTC'];
const run=(cmd,args,tz,env)=>{const r=cp.spawnSync(cmd,args,{cwd:T,env:{...process.env,TZ:tz,...(env||{})},encoding:'utf8',timeout:A.timeout_seconds*1000,maxBuffer:256<<20});
  const out=(r.stdout||'')+(r.stderr||'');log('$ TZ='+tz+' '+cmd+' '+args.join(' ')+'  -> exit '+r.status+(r.signal?' signal '+r.signal:'')+'\n'+out);
  return {code:r.error&&r.error.code==='ETIMEDOUT'?'timeout':r.status,out,err:r.error}};
// Summary lines: "<label> N passed, M failed" | "summary N pass M fail". The LAST one counts.
const parse=(out,label)=>{let m,last=null;const re=label?new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*(\\d+) passed, (\\d+) failed','g'):/(?:^|\s)(\d+) passed, (\d+) failed|summary\s+(\d+)\s+pass\s+(\d+)\s+fail/g;
  while((m=re.exec(out)))last=m;if(!last)return null;const p=+(last[1]??last[3]),f=+(last[2]??last[4]);return {pass:p,fail:f}};
const failLines=out=>out.split('\n').filter(l=>/^FAIL|DIFFERENT|^ERROR/.test(l)).slice(0,3).map(l=>l.slice(0,150));
const lastErr=out=>{const l=out.trim().split('\n').filter(x=>/Error|error|ENOENT|Cannot find/.test(x));return (l[0]||out.trim().split('\n').pop()||'no output').slice(0,150)};
// One zone result -> {st, count, why}
function judge(t,res){
  if(res.code==='timeout')return {st:'ERROR',why:'timed out after '+A.timeout_seconds+' s'};
  if(!res.parsed)return {st:'ERROR',why:'no summary line (exit '+res.code+'): '+lastErr(res.out)};
  const {pass,fail}=res.parsed;
  if(fail>0)return {st:'FAIL',count:pass,why:fail+' check(s) failed: '+failLines(res.out).join(' | ')};
  if(res.code!==0)return {st:'ERROR',count:pass,why:'summary shows 0 failed but exit code '+res.code};
  if(pass<t.accepted)return {st:'FAIL',count:pass,why:'COUNT DROPPED: expected '+t.accepted+', actual '+pass};
  if(pass>t.accepted)return {st:'FAIL',count:pass,why:'COUNT ABOVE ACCEPTED: expected '+t.accepted+', actual '+pass+(t.status==='REDUCED'&&pass>=t.full?' (full coverage may be restored: verify, then record it)':' (if checks were added on purpose, raise the count in accepted-results.json; it shows as PENDING until approved)')};
  if(t.status==='REDUCED'){const rc=t.reduced_condition||{},miss=[];
    if(rc.env_unset&&process.env[rc.env_unset])miss.push(rc.env_unset+' is set, so the documented reason does not apply');
    if(rc.marker&&!res.out.includes(rc.marker))miss.push('expected skip message "'+rc.marker+'" not printed');
    if(!rc.env_unset&&!rc.marker)miss.push('no reduced_condition recorded');
    if(miss.length)return {st:'FAIL',count:pass,why:'REDUCED count without its documented reason: '+miss.join('; ')};
    return {st:'REDUCED',count:pass,why:'runs '+pass+' of '+t.full+' ('+(t.full-pass)+' missing). '+t.reason}}
  return {st:'PASS',count:pass}}
// Blocker check: returns a reason string if the documented blocker is still in place, else null.
function blocked(b){
  if(b.kind==='dir'){const d=process.env[b.env]||b.default;return fs.existsSync(path.join(d,b.needs))?null:'missing '+path.join(d,b.needs)}
  if(b.kind==='p3tree'){let d=b.env&&process.env[b.env];if(!d){if(!fs.existsSync('/home/claude/p3tree.txt'))return 'missing /home/claude/p3tree.txt';d=fs.readFileSync('/home/claude/p3tree.txt','utf8').trim()}
    return fs.existsSync(path.join(d,'js','app.js'))?null:'Phase 3 tree not found at '+d}
  if(b.kind==='git-tag'){const r=cp.spawnSync('git',['-C',APP,'rev-parse','--verify','--quiet',b.tag+'^{commit}'],{encoding:'utf8'});return r.status===0?null:'git tag '+b.tag+' not present'}
  if(b.kind==='approved-tag'){const l=cp.spawnSync('git',['-C',APP,'rev-parse','--verify','-q','refs/tags/'+b.tag],{encoding:'utf8'}),r=cp.spawnSync('git',['-C',APP,'ls-remote',REMOTE,'refs/tags/'+b.tag],{encoding:'utf8',timeout:60000});
    if(r.status!==0)return null/* cannot tell: run the check, which reports ERROR */;return (l.status===0||r.stdout.trim())?null:'tag '+b.tag+' not created yet'}
  if(b.kind==='playwright-browser'){try{const p=require('playwright');return fs.existsSync(p.chromium.executablePath())?null:'Playwright browser not installed'}catch(e){return 'playwright package not installed'}}
  return 'unknown blocker kind'}
const results=[];
// Pre-flight: prerequisites that are NOT accepted blockers. Missing -> ERROR.
{const need=tier==='full'?['xlsx','jsdom','acorn','puppeteer-core','@sparticuz/chromium']:['xlsx','jsdom','acorn'];const miss=need.filter(m=>{try{require.resolve(m);return false}catch(e){return true}});
 if(tier==='full'){const py=cp.spawnSync('python3',['-c','import pandas,openpyxl'],{encoding:'utf8'});if(py.status!==0)miss.push('python3 with pandas and openpyxl')}
 if(cp.spawnSync('git',['--version']).status!==0)miss.push('git');
 // Environment (R9/R10): record it; exact package versions must match accepted-results.json "environment" (else ERROR); interpreter versions differing = WARNING.
 const E=A.environment||{},got={node:process.version},warns=[],wrong=[];
 got.npm=(cp.spawnSync('npm',['-v'],{encoding:'utf8'}).stdout||'?').trim();
 const pkgVer=m=>{try{return require(m+'/package.json').version}catch(e){}/* some packages hide package.json behind "exports": read it from NODE_PATH */
   for(const d of (process.env.NODE_PATH||'').split(path.delimiter).filter(Boolean)){const f=path.join(d,m,'package.json');if(fs.existsSync(f))return JSON.parse(fs.readFileSync(f,'utf8')).version}return 'missing'};
 for(const m of Object.keys(E.node_packages||{})){got[m]=pkgVer(m);
   if(got[m]==='missing'){if(!miss.includes(m)&&need.includes(m))miss.push(m)}   // a package this tier needs is missing: ERROR (listed once)
   else if(got[m]!==E.node_packages[m])wrong.push(m+' '+got[m]+' (recorded '+E.node_packages[m]+')')}   // wrong version: ERROR
 if(tier==='full'){const py=cp.spawnSync('python3',['-c','import sys,json,importlib.metadata as m\nv={}\nfor p in sys.argv[1:]:\n  try: v[p]=m.version(p)\n  except Exception: v[p]="missing"\nprint(json.dumps({"python":sys.version.split()[0],"pkgs":v}))',...Object.keys(E.python_packages||{})],{encoding:'utf8'});
   try{const j=JSON.parse(py.stdout);got.python=j.python;for(const [p,v] of Object.entries(j.pkgs)){got['py:'+p]=v;if(v!=='missing'&&v!==E.python_packages[p])wrong.push('python '+p+' '+v+' (recorded '+E.python_packages[p]+')')}}catch(e){got.python='?'}}
 for(const k of ['node','npm','python'])if(got[k]&&E[k]&&got[k]!==E[k])warns.push(k+' '+got[k]+' differs from recorded '+E[k]);
 const why=[miss.length?'missing prerequisite(s) not on the accepted list: '+miss.join(', ')+' (check NODE_PATH)':'',wrong.length?'package versions differ from the recorded environment: '+wrong.join(', '):''].filter(Boolean).join('; ');
 results.push({name:'pre-flight',st:why?'ERROR':'PASS',exp:'-',act:'-',why,warns});
 log('Environment: '+JSON.stringify(got));global.ENV_LINE='Environment: '+Object.entries(got).map(([k,v])=>k+' '+v).join(', ')}
for(const t of A.tests){
  if(!t.tiers.includes(tier))continue;
  const zs=zonesOf(t),row={name:t.name,zones:zs.length,exp:t.status==='REDUCED'?t.accepted+' (full '+t.full+')':t.accepted===undefined?'-':String(t.accepted),act:'-',warns:[]};
  if(t.file&&!fs.existsSync(path.join(T,t.file))){Object.assign(row,{st:'ERROR',why:'test file '+t.file+' is MISSING'+(t.status==='BLOCKED'?' (a missing file is never an accepted blocker)':'')});results.push(row);continue}
  if(t.status==='BLOCKED'){const why=blocked(t.blocker);
    if(why){Object.assign(row,{st:'BLOCKED',why:t.reason+' ['+why+']'});results.push(row);continue}
    row.warns.push('documented blocker is no longer present: running the test; update accepted-results.json and the records');
    if(t.type==='blocked-only'){Object.assign(row,{st:'ERROR',why:'blocker cleared, but this runner has no verified procedure for this item yet; run run-regression.sh and record'});results.push(row);continue}}
  const per=[];
  for(const tz of zs){let res;
    if(t.type==='node'){res=run('node',t.file==='check-protection.js'?[t.file,'--remote',REMOTE]:[t.file],tz);res.parsed=parse(res.out,t.label)}
    else if(t.type==='control'){// R1: run check-control.js as it is in the APPROVED tag, never the working copy.
      const tag=t.tag,pre=cp.spawnSync('git',['-C',T,'rev-parse','--show-prefix'],{encoding:'utf8'}).stdout.trim();
      if(cp.spawnSync('git',['-C',T,'rev-parse','--verify','-q','refs/tags/'+tag]).status!==0)cp.spawnSync('git',['-C',T,'fetch','-q','--depth=1',REMOTE,'refs/tags/'+tag+':refs/tags/'+tag],{timeout:120000});
      const src=cp.spawnSync('git',['-C',T,'show',tag+':'+pre+'check-control.js'],{encoding:'utf8',maxBuffer:64<<20});
      if(src.status!==0)res={code:2,out:'cannot read check-control.js from approved tag '+tag+': '+(src.stderr||'').trim(),parsed:null};
      else{const f=path.join(TMP,'approved-check-control.js');fs.writeFileSync(f,src.stdout);res=run('node',[f,'--dir',T,'--tag',tag,'--remote',REMOTE],tz);res.parsed=parse(res.out,'check-control:')}}
    else if(t.type==='golden'){const snap=path.join(TMP,'regress-'+tz.replace(/\//g,'_')+'.json');
      const g=run('node',['regress.js','..',snap],tz);
      if(g.code!==0||!fs.existsSync(snap))res={code:g.code===0?1:g.code,out:g.out,parsed:null};
      else{const c=run('node',['compare-snapshots.js',t.snapshot,snap],tz);const same=(c.out.match(/^IDENTICAL/gm)||[]).length,diff=(c.out.match(/^DIFFERENT/gm)||[]).length;
        res={code:c.code,out:c.out,parsed:/ALL SECTIONS IDENTICAL|section\(s\) differ/.test(c.out)?{pass:same,fail:diff}:null}}}
    else if(t.type==='pyverify'){const d=run('node',['dump.js'],tz);const v=d.code===0?run('python3',['verify.py'],tz):{code:d.code,out:d.out};try{fs.unlinkSync(path.join(T,'dump.json'))}catch(e){}
      res={code:v.code,out:v.out,parsed:d.code===0?parse(v.out):null}}
    else if(t.type==='scenarios'){let p=0,f=0,bad=[],err=null,out='';
      for(const s of t.list){const [d,n]=s.split('/'),wb='fixtures/'+d+'/scenario-'+n+'.xlsx',exp='fixtures/'+d+'/supplier-output-'+n+'.json',dump=path.join(TMP,'dump-'+n+'.json');
        const a=run('node',['dump_sup.js',wb,dump],tz);if(a.code!==0||!fs.existsSync(dump)){err=n+': dump failed: '+lastErr(a.out);break}
        const v=run('python3',['verify_sup.py',wb,dump,n],tz);if(v.code!==0&&!/FAIL/.test(v.out)){err=n+': verifier did not run: '+lastErr(v.out);break}
        const same=fs.readFileSync(dump).equals(fs.readFileSync(exp));if(v.code===0&&same)p++;else{f++;bad.push(n+(v.code!==0?' (verifier FAIL)':'')+(same?'':' (differs from stored output)'))}}
      res=err?{code:1,out:err,parsed:null}:{code:f?1:0,out:bad.map(b=>'FAIL '+b).join('\n'),parsed:{pass:p,fail:f}}}
    per.push({tz,out:res.out,...judge(t,res)})}
  const order=['ERROR','FAIL','REDUCED','PASS'],worst=order.find(s=>per.some(z=>z.st===s));
  const counts=[...new Set(per.map(z=>z.count===undefined?'-':z.count))];
  Object.assign(row,{st:worst,act:counts.join('/'),why:(w=>w.length===1?w[0]:per.filter(z=>z.st===worst&&z.why).map(z=>z.tz+': '+z.why).slice(0,3).join(' || '))([...new Set(per.filter(z=>z.st===worst&&z.why).map(z=>z.why))])});
  for(const z of per)if(z.warn)row.warns.push(z.warn);
  for(const l of new Set(per.flatMap(z=>(z.out||'').split('\n').filter(x=>x.startsWith('PENDING: ')))))row.warns.push(l+' (needs the owner\'s approval: move the approved tag)');
  results.push(row)}
// Report
const n=s=>results.filter(r=>r.st===s).length,real=results.filter(r=>r.name!=='pre-flight');
const red=results.filter(r=>r.st==='REDUCED'),missing=red.reduce((q,r)=>{const t=A.tests.find(x=>x.name===r.name);return q+(t.full-(+r.act))},0);
const ran=real.filter(r=>/^\d+$/.test(r.act)).reduce((q,r)=>q+(+r.act),0);
const code=n('FAIL')||n('ERROR')?1:0,P=[];
P.push('v0.7 tests ('+tier.toUpperCase()+') - green means no NEW failures, NOT full coverage');
P.push('PASS: '+n('PASS')+' | FAIL: '+n('FAIL')+' | BLOCKED: '+n('BLOCKED')+' | REDUCED: '+n('REDUCED')+' | ERROR: '+n('ERROR'));
const fullCount=A.tests.filter(t=>t.tiers.includes('full')).length;
P.push('Scope: '+(tier==='fast'?'FAST ('+real.length+' tests, UTC only, quick 100-call wrapper; the full tier has '+fullCount+' tests)':'FULL ('+real.length+' tests, all time zones, full 1,000-call wrapper)')+' + pre-flight');
P.push('Checks counted in this run (first zone of each test): '+ran);P.push(global.ENV_LINE||'Environment: not recorded');
const allBlocked=A.tests.filter(t=>t.status==='BLOCKED').length,allRed=A.tests.filter(t=>t.status==='REDUCED');
P.push(tier==='full'?'Not running: '+missing+' checks in REDUCED tests; '+n('BLOCKED')+' BLOCKED tests':'Known limitations (full tier): '+allRed.reduce((q,t)=>q+t.full-t.accepted,0)+' checks not running in '+allRed.length+' REDUCED tests; '+allBlocked+' BLOCKED tests. Not run in this fast tier.');
P.push('');P.push('STATUS   TEST                        ZONES  EXPECTED          ACTUAL   NOTE');
const ord={ERROR:0,FAIL:1,BLOCKED:2,REDUCED:3,PASS:4};
for(const r of [...results].sort((a,b)=>ord[a.st]-ord[b.st])){P.push(r.st.padEnd(8)+' '+r.name.padEnd(27)+' '+String(r.zones||'-').padEnd(6)+' '+String(r.exp).padEnd(17)+' '+String(r.act).padEnd(8)+' '+(r.why||''));
  for(const w of (r.warns||[]))P.push('         WARNING: '+w)}
P.push('');
P.push(code?'EXIT 1: '+n('FAIL')+' FAIL and '+n('ERROR')+' ERROR. Something new is wrong; see the FAIL/ERROR lines above.'
  :'EXIT 0: no FAIL and no ERROR. '+(n('BLOCKED')+n('REDUCED')?'Accepted limitations remain ('+n('BLOCKED')+' BLOCKED, '+n('REDUCED')+' REDUCED) and are listed above: this is NOT full coverage.':'All tests in this tier passed at their accepted counts.'+(tier==='fast'?' FAST tier only: the full-tier limitations listed above still apply.':'')));
const text=P.join('\n');console.log(text);
if(LOG)fs.writeFileSync(LOG,text+'\n\n===== full output of every command =====\n'+logText);
fs.rmSync(TMP,{recursive:true,force:true});process.exit(code);
JS
