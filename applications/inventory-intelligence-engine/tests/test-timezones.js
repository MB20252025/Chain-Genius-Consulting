// Regression test: results and displayed dates must not depend on the browser/computer timezone.
// For each timezone: domtest2 (displayed dates), regress.js output vs the preserved v0.5 golden snapshot, and the independent Python check of dates.
// Run from tests/:  NODE_PATH=<node_modules> node test-timezones.js
const {spawnSync}=require('child_process'),fs=require('fs'),os=require('os'),path=require('path');
const GOLD=path.join(__dirname,'snapshots','v0.5-golden-20261105T101953Z.json'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'tz-'));
let pass=0,fail=0;const ok=(c,m)=>{c?(pass++,process.env.VERBOSE&&console.log('PASS:',m)):(fail++,console.log('FAIL:',m))};
for(const tz of ['UTC','Europe/London','America/New_York','Asia/Kolkata','Pacific/Auckland']){
 const env={...process.env,TZ:tz},run=(cmd,args,cwd)=>spawnSync(cmd,args,{env,cwd:cwd||__dirname,encoding:'utf8'}),n=tz.replace(/\//g,'_');
 const d2=run('node',['domtest2.js']);ok(d2.status===0&&/ 0 fail/.test(d2.stdout),tz+': domtest2 (displayed dates) '+(d2.stdout||'').trim().split('\n').pop());
 const rg=run('node',['regress.js','..',path.join(tmp,n+'.json')]);const cp=run('node',['compare-snapshots.js',GOLD,path.join(tmp,n+'.json')]);ok(rg.status===0&&cp.status===0&&/ALL SECTIONS IDENTICAL/.test(cp.stdout),tz+': all sections identical to v0.5 golden');
 const w=fs.mkdtempSync(path.join(tmp,'w-'));const dm=run('node',[path.join(__dirname,'dump.js')],w);const vf=run('python3',[path.join(__dirname,'verify.py')],w);ok(dm.status===0&&!/^FAIL/m.test(vf.stdout),tz+': independent verify.py has no FAIL')}
console.log(`test-timezones: ${pass} passed, ${fail} failed`);process.exit(fail?1:0);
