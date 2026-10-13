/* Does every control in the app resolve to something that exists?
   The gate proves the reverse — that no defined function is unreferenced. This is the
   direction that breaks under a thumb: an onclick naming a function that was renamed,
   inlined away, or never written. Each miss is a tap that throws and paints nothing. */
const fs = require('fs');
const src = fs.readFileSync(process.argv[2] || 'Sukinnect-next.html', 'utf8');

/* function names defined at top level of the page script */
const defined = new Set();
for (const m of src.matchAll(/^function ([A-Za-z_$][\w$]*)/gm)) defined.add(m[1]);
for (const m of src.matchAll(/(?:const|let|var) ([A-Za-z_$][\w$]*) *= *(?:function|\()/g)) defined.add(m[1]);
for (const m of src.matchAll(/^ *([A-Za-z_$][\w$]*)\s*\(.*\)\s*\{[^}]*$/gm)) { /* noise, skipped */ }
/* object-literal method maps are looked up by name below, so collect those keys too */
for (const m of src.matchAll(/^\s{2}([A-Za-z_$][\w$]*)\s*:\s*(?:function|\()/gm)) defined.add(m[1]);

const seen = new Map();
/* onclick="name(...)" — possibly several calls in one attribute, and ternaries inside */
for (const m of src.matchAll(/on(?:click|change|input|submit)="([^"]*)"/g)) {
  for (const c of m[1].matchAll(/(^|[^.\w$])([A-Za-z_$][\w$]*)\s*\(/g)) {
    const name = c[2];
    if (/^(if|return|typeof|function|document|window|Math|JSON|Number|String|Array|Object|this|event|new|alert|confirm|Boolean|Date|isNaN|parseInt|parseFloat)$/.test(name)) continue;
    if (!seen.has(name)) seen.set(name, 0);
    seen.set(name, seen.get(name) + 1);
  }
}
const missing = [...seen.entries()].filter(([n]) => !defined.has(n));
console.log('distinct handler function names referenced from markup: ' + seen.size);
console.log('top-level definitions found: ' + defined.size);
console.log();
if (!missing.length) console.log('every handler resolves to a defined function');
for (const [n, count] of missing.sort((a, b) => b[1] - a[1])) {
  const at = src.indexOf('="' );
  const line = src.slice(0, src.indexOf(n + '(')).split(/\r\n/).length;
  console.log('MISSING  ' + n + '   referenced ' + count + '×   (first near line ' + line + ')');
}
