// Stage 3B readiness, 22 Nov 2026. Helper for the "current-behaviour subset" tests (H1, H3). Not a test itself.
//
// Why: test-fglt-note.js (H1) and test-supplier-eligibility.js (H3) are BLOCKED as whole files, because each one also
// compares the engine with a v0.6 source tree that is no longer available (DEFERRED-HISTORICAL-TESTS.md). Their other
// checks test the current engine against fixed expectations and need no historical material. Until now they have
// never run in v0.7.
//
// What this helper does, and nothing else:
//   1. Reads the ORIGINAL protected test file. Its SHA-256 must equal BOTH the value pinned by the caller AND the file's
//      line in checksums.txt. If either has changed, the subset stops with a FAIL rather than running drifted checks.
//   2. Removes ONLY the listed historical-comparison lines. Each removed line must match an expected start, and the
//      number of ok( calls removed must equal the expected number. Optional exact text replacements are checked the
//      same way: each must occur exactly once.
//   3. Runs the remaining original checks unchanged, compiled at the original file's own path (so __dirname, fixture
//      paths and require() resolve exactly as for the original).
// The original file, its registry entry (BLOCKED) and its checksum are untouched. The removed comparison checks are NOT
// verified by the subset; they stay unverified historical evidence (tests/logs/regression-final-20261109T2300Z.log).
'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),Module=require('module');
module.exports=function runSubset(o){
  const T=__dirname,file=path.join(T,o.file),src=fs.readFileSync(file,'utf8');
  const sha=crypto.createHash('sha256').update(src).digest('hex');
  const line=fs.readFileSync(path.join(T,'checksums.txt'),'utf8').split('\n').find(l=>l.startsWith('file ')&&l.trim().endsWith(' tests/'+o.file));
  const fail=m=>{console.log('FAIL: '+m);console.log(o.label+': 0 passed, 1 failed');process.exit(1)};
  if(sha!==o.sha256)fail(o.file+' has changed since the subset was defined (sha256 '+sha.slice(0,16)+', pinned '+o.sha256.slice(0,16)+')');
  if(!line||line.split(/\s+/)[1]!==sha)fail(o.file+' does not match its checksums.txt line');
  const L=src.split('\n');let removedOk=0;
  for(const [a,b,starts] of o.remove){for(let i=a;i<=b;i++){const t=L[i-1];
    if(t===undefined||!t.startsWith(starts[i-a]))fail(o.file+' line '+i+' is not the expected historical-comparison line');
    removedOk+=(t.match(/\bok\(/g)||[]).length;L[i-1]=null}}
  if(removedOk!==o.removedOk)fail('removed '+removedOk+' ok( calls, expected '+o.removedOk);
  let out=L.filter(x=>x!==null).join('\n');
  for(const [from,to] of (o.replace||[])){if(out.split(from).length!==2)fail('replacement text not found exactly once in '+o.file);out=out.replace(from,()=>to)}
  // Make the summary line unambiguous: "<label>: N passed, M failed" (the runner counts the LAST such line).
  const orig=o.file.replace(/\.js$/,'');
  if(out.split('`'+orig+': ${pass} passed').length!==2)fail('summary line of '+o.file+' not found exactly once');
  // Optional NEW checks (o.addChecks), inserted just before the summary line. They are new evidence written for the
  // caller, not original checks, and the caller's header must say so. They may use only what the kept lines define.
  if(o.addChecks){const at=out.lastIndexOf('console.log(`'+orig+': ${pass} passed');out=out.slice(0,at)+o.addChecks+'\n'+out.slice(at)}
  out=out.replace('`'+orig+': ${pass} passed','`'+o.label+': ${pass} passed');
  console.log('subset of '+o.file+' (sha256 '+sha.slice(0,16)+'…): '+o.remove.reduce((n,[a,b])=>n+b-a+1,0)+' historical-comparison line(s) and '+removedOk+' comparison check(s) removed; every other original check runs unchanged'+(o.addChecks?'; NEW checks written for this test are added':''));
  const m=new Module(file,module);m.filename=file;m.paths=Module._nodeModulePaths(T);m._compile(out,file);
};
