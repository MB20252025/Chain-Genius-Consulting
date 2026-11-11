// v0.7 T1: protection check. Verifies the protected references (main, release/v0.6, tag v0.6) on the remote, and the
// SHA-256 of every protected fixture, golden snapshot and the full wrapper test, as listed in tests/checksums.txt.
// Usage (from tests/): node check-protection.js [--remote <name or URL>]   (default remote: origin)
// Prints one PASS/FAIL line per check and "check-protection: N passed, M failed". Exit 1 if any check fails.
// If the remote cannot be read, it prints no summary and exits 2, so run-all.sh reports ERROR (never PASS).
const fs=require('fs'),path=require('path'),crypto=require('crypto'),{spawnSync}=require('child_process');
const APP=path.resolve(__dirname,'..'),LIST=path.join(__dirname,'checksums.txt');
const ai=process.argv.indexOf('--remote'),REMOTE=ai>0?process.argv[ai+1]:'origin';
const lines=fs.readFileSync(LIST,'utf8').split('\n').filter(l=>l&&!l.startsWith('#'));
const refs=lines.filter(l=>l.startsWith('ref ')).map(l=>l.split(/\s+/).slice(1)),files=lines.filter(l=>l.startsWith('file ')).map(l=>l.split(/\s+/).slice(1));
let pass=0,fail=0;const ok=(c,m)=>{c?pass++:fail++;console.log((c?'PASS: ':'FAIL: ')+m)};
const r=spawnSync('git',['ls-remote',REMOTE,...refs.map(x=>x[0])],{cwd:APP,encoding:'utf8',timeout:60000});
if(r.status!==0){console.log('ERROR: cannot read remote "'+REMOTE+'": '+((r.stderr||String(r.error||'')).trim().split('\n').pop()));process.exit(2)}
const got={};for(const l of r.stdout.trim().split('\n'))if(l){const [sha,ref]=l.split('\t');got[ref]=sha}
for(const [ref,want] of refs)ok(got[ref]===want,'ref '+ref+' = '+(got[ref]||'MISSING')+' (expected '+want+')');
for(const [want,rel] of files){const p=path.join(APP,rel);const have=fs.existsSync(p)?crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'):'MISSING';
  ok(have===want,'file '+rel+(have===want?' unchanged':' CHANGED: sha256 '+have.slice(0,16)+' (expected '+want.slice(0,16)+')'))}
console.log(`check-protection: ${pass} passed, ${fail} failed (${refs.length} references on "${REMOTE}", ${files.length} files)`);process.exit(fail?1:0);
