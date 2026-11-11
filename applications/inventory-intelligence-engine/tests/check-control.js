// v0.7 T1 (correction R1): control-file guard. Compares the test-control files in the working tree with their versions in the
// owner's APPROVED BASELINE tag (default v0.7-tests-approved-1). run-all.sh runs the copy of THIS script taken from the tag, so an
// edited working copy cannot judge itself.
//   Weakening = FAIL: a test removed; a count or full count lowered; a test changed to BLOCKED/REDUCED; a new BLOCKED/REDUCED
//     entry; a file, label, type, snapshot, blocker or reduced-coverage condition changed; a tier, time zone or scenario
//     dropped; a protected line removed from or changed in checksums.txt; any change to run-all.sh, check-protection.js,
//     check-control.js, test-a1-wrapper-quick.js, package.json, package-lock.json or requirements.txt.
//   Growth = allowed, printed as "PENDING: ..." until the owner approves it by moving the tag: a new test, a higher count,
//     a cleared limitation, a new protected line, a new time zone or scenario.
// Usage: node check-control.js --dir <tests folder> [--tag <tag>] [--remote <name or URL>]
// Exit 0 = no weakening; 1 = weakening found; 2 = cannot check (remote or git failure, no summary printed); 3 = no approved tag.
const fs=require('fs'),path=require('path'),{spawnSync}=require('child_process');
const arg=(k,d)=>{const i=process.argv.indexOf(k);return i>0?process.argv[i+1]:d};
const DIR=path.resolve(arg('--dir',__dirname)),TAG=arg('--tag','v0.7-tests-approved-1'),REMOTE=arg('--remote','origin');
const git=(...a)=>spawnSync('git',a,{cwd:DIR,encoding:'utf8',timeout:120000,maxBuffer:256<<20});
const die=(code,msg)=>{console.log((code===3?'NO APPROVED BASELINE: ':'ERROR: ')+msg);process.exit(code)};
// 1. The tag: must exist on the remote; a local copy must match it.
const lr=git('ls-remote',REMOTE,'refs/tags/'+TAG);
if(lr.status!==0)die(2,'cannot read remote "'+REMOTE+'": '+((lr.stderr||'').trim().split('\n').pop()));
const remoteSha=(lr.stdout.trim().split('\t')[0])||null,local=git('rev-parse','--verify','-q','refs/tags/'+TAG);
const localSha=local.status===0?local.stdout.trim():null;
if(!remoteSha&&!localSha)die(3,'tag '+TAG+' does not exist on "'+REMOTE+'" or locally');
let pass=0,fail=0;const ok=(c,m)=>{c?pass++:fail++;console.log((c?'PASS: ':'FAIL: ')+m)},pend=m=>console.log('PENDING: '+m);
if(!remoteSha){console.log('FAIL: tag '+TAG+' exists only locally ('+localSha.slice(0,7)+'), not on "'+REMOTE+'": a local tag is not an approval');console.log(`check-control: 0 passed, 1 failed (baseline ${TAG} not on remote)`);process.exit(1)}
if(localSha&&localSha!==remoteSha){console.log('FAIL: local tag '+TAG+' ('+localSha.slice(0,7)+') differs from "'+REMOTE+'" ('+remoteSha.slice(0,7)+')');console.log(`check-control: 0 passed, 1 failed (local and remote baseline differ)`);process.exit(1)}
if(!localSha){const f=git('fetch','-q','--depth=1',REMOTE,'refs/tags/'+TAG+':refs/tags/'+TAG);if(f.status!==0)die(2,'cannot fetch tag '+TAG+': '+((f.stderr||'').trim().split('\n').pop()))}
const prefix=git('rev-parse','--show-prefix').stdout.trim();
const approved=f=>{const r=git('show',TAG+':'+prefix+f);return r.status===0?r.stdout:null};
const current=f=>fs.existsSync(path.join(DIR,f))?fs.readFileSync(path.join(DIR,f),'utf8'):null;
// 2. Byte-identical control files.
for(const f of ['run-all.sh','check-protection.js','check-control.js','test-a1-wrapper-quick.js','package.json','package-lock.json','requirements.txt']){
  const a=approved(f),c=current(f);
  ok(a!==null&&a===c,f+(a===null?': not in the approved baseline':c===null?': MISSING from the working tree':a===c?': identical to the approved baseline':': CHANGED since the approved baseline (needs approval)'))}
// 3. accepted-results.json ratchet.
{let A,C,bad=[];try{A=JSON.parse(approved('accepted-results.json'));C=JSON.parse(current('accepted-results.json'))}catch(e){bad.push('cannot read accepted-results.json in the baseline or working tree: '+e.message)}
 if(A&&C){const rank={one:1,two:2,five:3},same=(x,y)=>JSON.stringify(x)===JSON.stringify(y),sup=(a,c)=>(a||[]).every(v=>(c||[]).includes(v));
  for(const z of ['zones_two','zones_five']){if(!sup(A[z],C[z]))bad.push(z+': a time zone was removed');else if(!same(A[z],C[z]))pend(z+' changed: '+JSON.stringify(C[z]))}
  for(const k of ['timeout_seconds','reference_commit','environment'])if(!same(A[k],C[k]))pend(k+' changed');
  const byName=new Map((C.tests||[]).map(t=>[t.name,t]));
  for(const a of A.tests){const c=byName.get(a.name),n=a.name;
   if(!c){bad.push(n+': test REMOVED');continue}
   for(const k of ['type','file','label','snapshot','blocker','reduced_condition'])if(!same(a[k],c[k]))bad.push(n+': '+k+' changed');
   if(!sup(a.tiers,c.tiers))bad.push(n+': removed from a tier');
   if(a.zones&&(rank[c.zones]||0)<rank[a.zones])bad.push(n+': fewer time zones');
   if(a.list&&!sup(a.list,c.list))bad.push(n+': scenario removed');else if(a.list&&!same(a.list,c.list))pend(n+': scenario list grew');
   const sa=a.status||'NORMAL',sc=c.status||'NORMAL';
   if(sa!==sc){if((sa==='NORMAL'&&sc!=='NORMAL')||(sa==='REDUCED'&&sc==='BLOCKED'))bad.push(n+': status weakened '+sa+' -> '+sc);else pend(n+': status improved '+sa+' -> '+sc)}
   if(a.accepted!==undefined){if(c.accepted===undefined&&sc!=='BLOCKED')bad.push(n+': accepted count removed');else if(c.accepted<a.accepted)bad.push(n+': accepted count LOWERED '+a.accepted+' -> '+c.accepted);else if(c.accepted>a.accepted)pend(n+': accepted count raised '+a.accepted+' -> '+c.accepted)}
   if(a.full!==undefined&&c.full!==undefined&&c.full<a.full)bad.push(n+': full count LOWERED '+a.full+' -> '+c.full)}
  const names=new Set(A.tests.map(t=>t.name));
  for(const c of C.tests)if(!names.has(c.name)){if(c.status)bad.push(c.name+': NEW '+c.status+' entry (a new limitation needs approval)');else pend(c.name+': new test, accepted '+c.accepted)}}
 ok(!bad.length,'accepted-results.json: '+(bad.length?'WEAKENED: '+bad.join('; '):'no weakening against the approved baseline'))}
// 4. checksums.txt ratchet: every approved line must still be present, unchanged.
{const lines=s=>(s||'').split('\n').filter(l=>l&&!l.startsWith('#'));const a=approved('checksums.txt'),c=current('checksums.txt');
 if(a===null||c===null)ok(false,'checksums.txt: missing in the baseline or working tree');
 else{const cs=new Set(lines(c)),as=new Set(lines(a)),gone=lines(a).filter(l=>!cs.has(l)),added=lines(c).filter(l=>!as.has(l));
  for(const l of added)pend('checksums.txt new protected line: '+l.slice(0,120));
  ok(!gone.length,'checksums.txt: '+(gone.length?gone.length+' approved line(s) REMOVED or CHANGED: '+gone.slice(0,3).map(l=>l.split(' ').pop()).join(', '):'every approved line present'))}}
console.log(`check-control: ${pass} passed, ${fail} failed (baseline ${TAG} = ${remoteSha.slice(0,7)})`);process.exit(fail?1:0);
