// Usage: node compare-snapshots.js <expected.json> <actual.json>
// Compares the regression sections (accepts the legacy flat format or the {meta,core,extended} format). Exit code 1 on any difference.
const fs=require('fs'),load=f=>{const o=JSON.parse(fs.readFileSync(f,'utf8'));return o.core||o};
const [A,B]=[load(process.argv[2]),load(process.argv[3])];let bad=0;
for(const k of [...new Set([...Object.keys(A),...Object.keys(B)])]){const a=JSON.stringify(A[k]),b=JSON.stringify(B[k]);
 if(a===b){console.log('IDENTICAL  '+k.padEnd(6)+' ('+(Array.isArray(A[k])?A[k].length+' records':'value')+')')}
 else{bad++;console.log('DIFFERENT  '+k);const x=A[k]||[],y=B[k]||[];let n=0;for(let i=0;i<Math.max(x.length,y.length)&&n<3;i++)if(JSON.stringify(x[i])!==JSON.stringify(y[i])){console.log('   expected',JSON.stringify(x[i]).slice(0,160));console.log('   actual  ',JSON.stringify(y[i]).slice(0,160));n++}}}
console.log(bad?bad+' section(s) differ':'ALL SECTIONS IDENTICAL');process.exitCode=bad?1:0;
