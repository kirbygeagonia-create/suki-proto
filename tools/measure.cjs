/* node tools/measure.cjs — measure the rebuild the way AGENTS.md §31 describes it.

   Why this is a committed tool and not a paragraph: §31's whole claim is that its numbers
   can be re-derived, and when one reader re-derived them the passage was three out. A count
   that has to be recomputed by hand, in prose, by someone who is not there, drifts. So the
   method lives in code, the code prints the numbers, and the document quotes the tool.

   Every figure below names its own population. `#` followed by hex digits is *not* a colour
   test: `#8226` is a booking id and a four-digit hex is a legal CSS colour, so no pattern
   separates them — only the region each one sits in does, which is what classify() is for. */
const fs = require('fs');
const path = require('path');

const F = process.argv[2] && path.resolve(process.argv[2]) || path.join(__dirname, '..', 'Sukinnect-next.html');
const s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n');
const lines = s.split('\n').length;
console.log('\nmeasured: ' + path.basename(F) + '\n');

const styleStart = s.indexOf('<style>') + 7, styleEnd = s.indexOf('</style>');
const css = s.slice(styleStart, styleEnd);
const js = s.slice(s.lastIndexOf('<script>') + 8, s.lastIndexOf('</script>'));
const head = s.slice(0, styleStart);

/* ---- tokens ---- */
const rootAt = css.indexOf(':root');
const rootBody = css.slice(rootAt, css.indexOf('}', rootAt));
const declared = [...rootBody.matchAll(/(--[a-z0-9-]+)\s*:\s*[^;]+/g)].map(m => m[1]);
const used = new Set([...s.matchAll(/var\((--[a-z0-9-]+)/g)].map(m => m[1]));
const unused = declared.filter(t => !used.has(t));

/* Hex-shaped strings outside the :root block, bucketed by the syntax they sit in.
   Only three buckets are decided by pattern, and they are the three a pattern can
   actually decide: a trade-palette entry, an SVG paint attribute, and the one meta tag
   that cannot take a var(). Everything else is printed rather than explained — a comment
   that quotes a measured brand value and a hard-coded colour in markup look identical to
   any scanner, because they *are* identical to any scanner, so the tool refuses to guess
   and shows the line instead. */
const outside = head
  + css.slice(0, rootAt)
  + rootBody.replace(/--[a-z0-9-]+\s*:\s*[^;]+;?/g, '')
  + css.slice(css.indexOf('}', rootAt))
  + js;
const BUCKETS = [
  ['the seven-trade SERVICE_THEME palette, deliberate (§45)', /bg:'#/],
  ['category artwork: an SVG paint attribute, white by definition', /(fill|stroke|stop-color)="#/],
  ['<meta name="theme-color">, which cannot take a var()', /theme-color/],
];
const found = {}, loose = [];
const all = [...outside.matchAll(/#[0-9a-fA-F]{3,8}\b/g)];
for (const m of all) {
  const lineStart = outside.lastIndexOf('\n', m.index) + 1;
  const lineEnd = outside.indexOf('\n', m.index);
  const line = outside.slice(lineStart, lineEnd < 0 ? undefined : lineEnd).trim();
  const bucket = BUCKETS.find(([, re]) => re.test(line));
  if (bucket) (found[bucket[0]] = found[bucket[0]] || []).push(m[0]);
  else loose.push(line.slice(0, 96));
}
const hexTotal = all.length;

/* ---- type ---- */
const fsAll = (css.match(/font-size\s*:/g) || []).length;
const fsVar = (css.match(/font-size\s*:\s*var\(/g) || []).length;
const fsPx = (css.match(/font-size\s*:\s*[0-9.]+(px|rem|em)/g) || []).length;
const fsOther = fsAll - fsVar - fsPx;
const inl = (js.match(/font-size\s*:/g) || []).length;
const inlVar = (js.match(/font-size\s*:\s*var\(/g) || []).length;

/* ---- headings, glyphs, screens ---- */
const h1 = (s.match(/<h1[ >]/g) || []).length;
const h2 = (s.match(/<h2[ >]/g) || []).length;
/* A name can reach ic() from markup, from a data row (`icon:'…'` on a service), or from
   emptyState('…'). Watching only the first form is how dropping a library blanked six
   icons and every check stayed green. */
const iconsAt = s.indexOf('const ICONS = {');
const iconsBody = iconsAt < 0 ? '' : s.slice(iconsAt, s.indexOf('\n};', iconsAt));
const glyphs = [...iconsBody.matchAll(/^  '?([a-z0-9-]+)'?:\s*\{\s*o:/gm)].map(m => m[1]);
const reached = new Set([
  ...[...s.matchAll(/\bic\(\s*'([a-z0-9-]+)'/g)].map(m => m[1]),
  ...[...s.matchAll(/\bic\(\s*"([a-z0-9-]+)"/g)].map(m => m[1]),
  ...[...s.matchAll(/\bicon:\s*'([a-z0-9-]+)'/g)].map(m => m[1]),
  ...[...s.matchAll(/\bemptyState\(\s*'([a-z0-9-]+)'/g)].map(m => m[1]),
]);
const missingGlyph = [...reached].filter(n => !glyphs.includes(n));
const screens = fs.readFileSync(path.join(__dirname, 'shot.cjs'), 'utf8')
  .split('\n').filter(l => /^\s*\['[a-z0-9-]+',\s*`/.test(l)).length;

const p = (label, value, note) => console.log(label.padEnd(34), String(value).padStart(4), note ? '— ' + note : '');
p('lines', lines);
p('stylesheet lines', css.split('\n').length);
p(':root blocks', (css.match(/:root\s*\{/g) || []).length);
p('tokens declared in :root', declared.length, 'unique ' + new Set(declared).size);
p('tokens never reached', unused.length, unused.join(' '));
p('var(--…) uses, whole file', (s.match(/var\(--/g) || []).length);
p('hex-shaped strings outside :root', hexTotal);
Object.keys(found).forEach(k => p('  · ' + k, found[k].length, [...new Set(found[k])].join(' ')));
p('  · the rest, listed below', loose.length);
loose.forEach(l => console.log('      ' + l));
p('font-size in the stylesheet', fsAll, fsVar + ' with var(), ' + fsPx + ' literal px, ' + fsOther + ' other (inherit)');
p('font-size inline in markup', inl, inlVar + ' with var()');
p('<h1> / <h2>', h1 + ' / ' + h2);
p('glyphs drawn in the file', glyphs.length);
p('glyph names that can be reached', reached.size, iconsAt < 0
  ? 'no ICONS block — this file draws through a library'
  : (missingGlyph.length ? 'MISSING ARTWORK: ' + missingGlyph.join(' ') : 'every one has artwork in the file'));
p('screens in the camera table', screens, 'tools/shot.cjs');
