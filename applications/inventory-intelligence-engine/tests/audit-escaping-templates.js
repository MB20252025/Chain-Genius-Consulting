// v0.7 A1 escaping audit tool. Run from the app folder: NODE_PATH=<node_modules with acorn> node tests/audit-escaping-templates.js js/app.js
// Lists every ${...} expression inside template literals in a file, with line numbers, for manual escaping review.
const acorn=require('acorn'),fs=require('fs');
const f=process.argv[2],src=fs.readFileSync(f,'utf8'),ast=acorn.parse(src,{ecmaVersion:2022,locations:true});
const SAFE=/^(esc|f|gbp|sv|cls|tbl|bars|sevCell|cv_|H|pct|confExplain|demoBanner|SRC|banner|chart)\(|^\d|^'[^']*'$|^"[^"]*"$/;
const out=[];
(function walk(n){if(!n||typeof n.type!=='string')return;if(n.type==='TemplateLiteral'){n.expressions.forEach(e=>{const t=src.slice(e.start,e.end);out.push({line:e.loc.start.line,col:e.loc.start.column,safe:SAFE.test(t.trim()),t:t.length>140?t.slice(0,140)+'…':t})})}for(const k in n){if(k==='loc')continue;const v=n[k];Array.isArray(v)?v.forEach(walk):v&&typeof v.type==='string'&&walk(v)}})(ast);
console.log(JSON.stringify(out));
