/* Which painted values can a keyboard write, and does each one stay data?

   esc() exists for one reason, stated at its definition: "Anything that came from the user is
   echoed back into the interface, so it stays data and never becomes markup." Counting esc(
   calls cannot answer whether that holds, because the values reach the page through local
   aliases (`const rp = state.profileData`) and through helper arguments, and an interpolation
   that is escaped is invisible to a pattern that only looks at what is left over.

   So this resolves the aliases for the objects a keyboard can actually write into — found by
   looking for `X.field = el.value` assignments, not by guessing field names — and then reads
   every `${ … }` in the file with real brace matching, marks the spans covered by a formatter
   call, and reports each occurrence of a writable value as protected or raw.

   usage: node tools/audit-escaping.cjs [file] */
const fs = require('fs');
const path = require('path');

const FILE = path.resolve(process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'Sukinnect-next.html');
const src = fs.readFileSync(FILE, 'utf8');

/* 1. the writable fields, read from the page's own assignments */
const writable = new Set();
for (const m of src.matchAll(/(state\.[A-Za-z]+)\.([A-Za-z_$][\w$]*)\s*=\s*[A-Za-z_$][\w$.]*\.value/g)) {
  writable.add(m[1] + '.' + m[2]);
}
const sources = new Set([...writable].map(w => w.split('.')[1] + '.' + w.split('.')[2]).map(s => 'state.' + s.split('.')[1]));

/* 2. aliases: `const rp = state.profileData` and `const {name: x} = state.profileData` */
const alias = {};
for (const m of src.matchAll(/(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(state\.[A-Za-z]+)\b/g)) {
  if (!alias[m[1]]) alias[m[1]] = m[2];
}
/* The object path is another way to read the same field. */
for (const target of new Set(Object.values(alias))) alias[target] = target;

/* 3. every ${ … } with real brace matching, so nested templates are not silently dropped */
function interpolations(text) {
  const out = [];
  for (let i = 0; i < text.length - 1; i++) {
    if (text[i] !== '$' || text[i + 1] !== '{') continue;
    let depth = 0, j = i + 1;
    for (; j < text.length; j++) {
      if (text[j] === '{') depth++;
      else if (text[j] === '}') { depth--; if (!depth) break; }
    }
    out.push({ start: i + 2, expr: text.slice(i + 1, j) });
    i = j;
  }
  return out;
}

/* 4. spans covered by a call that returns safe text, and by a call that escapes what it is
      handed. The two are different: esc() sanitises on the way out, while settingsRow (and the
      per-role `row` wrappers around it) sanitises on the way into the markup it builds. A value
      passed to either is protected, but only the first protects itself in one expression. */
const FORMATTERS = ['esc', 'peso', 'pesoShort', 'rateLabel', 'label', 'chartSrSummary', 'Number', 'String', 'Math'];
const SINKS = ['settingsRow', 'row', 'emptyState'];
function protectedSpans(expr) {
  const spans = [];
  for (const f of [...FORMATTERS, ...SINKS]) {
    let at = -1;
    while ((at = expr.indexOf(f + '(', at + 1)) >= 0) {
      if (at && /[\w$.]/.test(expr[at - 1])) continue;
      let depth = 0, j = at + f.length;
      for (; j < expr.length; j++) {
        if (expr[j] === '(') depth++;
        else if (expr[j] === ')') { depth--; if (!depth) break; }
      }
      spans.push([at, j + 1]);
    }
  }
  return spans;
}
const covered = (spans, idx) => spans.some(([a, b]) => idx >= a && idx < b);

const rows = [];
for (const { start, expr } of interpolations(src)) {
  const line = src.slice(0, start).split('\n').length;
  const spans = protectedSpans(expr);
  for (const [aliasName, target] of Object.entries(alias)) {
    const re = new RegExp('\\b' + aliasName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\.([A-Za-z_$][\\w$]*)', 'g');
    for (const m of expr.matchAll(re)) {
      const key = target.replace('state.', 'state.') + '.' + m[1];
      if (!writable.has(key)) continue;
      rows.push({ line, field: key, raw: !covered(spans, m.index), expr: expr.trim().slice(0, 60) });
    }
  }
}

const raw = rows.filter(r => r.raw), safe = rows.filter(r => !r.raw);
console.log('file      : ' + path.basename(FILE));
console.log('writable  : ' + writable.size + ' fields the page assigns straight from an input .value');
console.log('aliases   : ' + Object.keys(alias).length + ' names standing for those objects');
console.log('painted   : ' + rows.length + ' sites read a writable field into markup');
console.log('  protected by a formatter : ' + safe.length);
console.log('  painted RAW              : ' + raw.length + '\n');

const byField = {};
for (const r of rows) { byField[r.field] = byField[r.field] || { raw: 0, safe: 0 }; byField[r.field][r.raw ? 'raw' : 'safe']++; }
for (const [f, c] of Object.entries(byField).sort((a, b) => b[1].raw - a[1].raw)) {
  console.log('  ' + f.padEnd(42) + 'raw ' + String(c.raw).padStart(3) + '   protected ' + c.safe);
}
console.log('\nraw sites:');
for (const r of raw) console.log('  :' + String(r.line).padEnd(6) + r.field.padEnd(38) + r.expr);
