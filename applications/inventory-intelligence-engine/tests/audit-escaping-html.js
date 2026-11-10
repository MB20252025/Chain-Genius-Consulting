// v0.7 A1 escaping audit tool. Run from the app folder: NODE_PATH=<node_modules with acorn> node tests/audit-escaping-html.js js/app.js
// (1) every H(...) call; (2) every '+' concatenation whose literal parts contain '<' (HTML being built) with a non-escaped operand.
const acorn=require('acorn'),fs=require('fs');const f=process.argv[2],src=fs.readFileSync(f,'utf8'),ast=acorn.parse(src,{ecmaVersion:2022,locations:true});
const S=n=>src.slice(n.start,n.end);const hs=[],cc=[];
const flat=n=>n.type==='BinaryExpression'&&n.operator==='+'?[...flat(n.left),...flat(n.right)]:[n];
(function w(n,parentPlus){if(!n||typeof n.type!=='string')return;
 if(n.type==='CallExpression'&&n.callee.type==='Identifier'&&n.callee.name==='H')hs.push(n.loc.start.line+': '+S(n).slice(0,220));
 if(n.type==='BinaryExpression'&&n.operator==='+'&&!parentPlus){const parts=flat(n);const html=parts.some(p=>(p.type==='Literal'&&typeof p.value==='string'&&/</.test(p.value))||(p.type==='TemplateLiteral'&&p.quasis.some(q=>/</.test(q.value.raw))));
  if(html){const risky=parts.filter(p=>!(p.type==='Literal'||p.type==='TemplateLiteral'||(p.type==='CallExpression'&&p.callee.type==='Identifier'&&/^(esc|f|gbp|tbl|bars|banner|demoBanner)$/.test(p.callee.name))));if(risky.length)cc.push(n.loc.start.line+': '+risky.map(S).join(' | ').slice(0,200))}}
 for(const k in n){if(k==='loc')continue;const v=n[k];const pp=n.type==='BinaryExpression'&&n.operator==='+';Array.isArray(v)?v.forEach(c=>w(c,false)):v&&typeof v.type==='string'&&w(v,pp&&(k==='left'||k==='right'))}})(ast,false);
console.log('== H() calls',hs.length);hs.forEach(x=>console.log(x));console.log('== HTML concatenations with non-literal operands',cc.length);cc.forEach(x=>console.log(x));
