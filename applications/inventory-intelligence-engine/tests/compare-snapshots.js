// Usage: node compare-snapshots.js <expected.json> <actual.json>   (golden files: the enumerated permitted differences apply, see below)
// Compares the regression sections (accepts the legacy flat format or the {meta,core,extended} format). Exit code 1 on any difference.
const fs=require('fs'),load=f=>{const o=JSON.parse(fs.readFileSync(f,'utf8'));return o.core||o};
const [A,B]=[load(process.argv[2]),load(process.argv[3])];let bad=0;
// Stage 3 (owner decision D1, 16 Nov 2026): exact permitted differences for the historical golden files, listed in snapshots/permitted-differences.json.
// Applied to the in-memory copy of the EXPECTED file only (the snapshot file is never changed). Each change must match exactly one row
// (order + column + original text) or the comparison fails; every difference that is not listed still fails as before.
{const path=require('path'),pf=path.join(__dirname,'snapshots','permitted-differences.json'),base=path.basename(process.argv[2]);
 if(fs.existsSync(pf)){const P=JSON.parse(fs.readFileSync(pf,'utf8'));if(Array.isArray(P.appliesTo)&&P.appliesTo.includes(base)){let used=0;
  for(const c of P.changes){const rows=(A[c.section]||[]).filter(r=>Array.isArray(r)&&r[0]===c.order);
   if(rows.length===1&&rows[0][c.column]===c.from){rows[0][c.column]=c.to;used++}else{bad++;console.log('PERMITTED-DIFFERENCE NOT MATCHED  '+c.section+' '+c.order+' column '+c.column+': expected exactly one row holding '+JSON.stringify(c.from)+' (found '+rows.length+')')}}
  console.log('PERMITTED  '+used+' of '+P.changes.length+' enumerated changes applied to the expected copy ('+P.approval.split(':')[0]+'; snapshots/permitted-differences.json)')}}}
for(const k of [...new Set([...Object.keys(A),...Object.keys(B)])]){const a=JSON.stringify(A[k]),b=JSON.stringify(B[k]);
 if(a===b){console.log('IDENTICAL  '+k.padEnd(6)+' ('+(Array.isArray(A[k])?A[k].length+' records':'value')+')')}
 else{bad++;console.log('DIFFERENT  '+k);/* Stage 3 C-CMP: String() so a missing row or section prints as "undefined" instead of crashing the printer */const x=A[k]||[],y=B[k]||[];let n=0;for(let i=0;i<Math.max(x.length,y.length)&&n<3;i++)if(JSON.stringify(x[i])!==JSON.stringify(y[i])){console.log('   expected',String(JSON.stringify(x[i])).slice(0,160));console.log('   actual  ',String(JSON.stringify(y[i])).slice(0,160));n++}}}
console.log(bad?bad+' section(s) differ':'ALL SECTIONS IDENTICAL');process.exitCode=bad?1:0;
