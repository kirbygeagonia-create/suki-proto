'use strict';
/* tools/audit-design-consistency.cjs — the owner's complaint as a number that can only go down.

   "It is not a real system, every screen is inconsistent" is testable: a system is one definition per idea.
   This counts the ideas the app has (a radius, a header, a chip tone, a section heading, a stat tile) and
   how many ways each is written, plus the inline styles that bypass all of them. It prints a ratchet: the
   recorded ceiling per metric, and refuses when a metric rises above it. It is NOT a style guide — it only
   detects the count going up.

     node tools/audit-design-consistency.cjs            # report + ratchet check
     node tools/audit-design-consistency.cjs --bless    # rewrite the ceilings to today's numbers */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const P = path.join(ROOT, 'Sukinnect-next.html');
const BASELINE = path.join(ROOT, 'tools', 'design-consistency-baseline.json');
const src = fs.readFileSync(P, 'utf8');
const bless = process.argv.includes('--bless');

/* Each metric is a name, a matcher, and why a designer would care. Counts are of OCCURRENCES, and the
   distinct-value counts are what actually measure "one system". */
function distinct(rx) { const m = src.match(rx) || []; return [...new Set(m.map(x => x.replace(/\s/g, '')))]; }
function count(rx) { return (src.match(rx) || []).length; }

const metrics = [
  { key: 'inline_styles', what: 'style="" attributes in painted markup — every one is a decision made per element instead of per component', n: count(/style="/g) },
  { key: 'literal_radii', what: 'hard-coded border-radius values', n: count(/border-radius:\s?[0-9.]+px/g) },
  { key: 'distinct_radii', what: 'different corner radii in use', n: distinct(/border-radius:\s?[0-9.]+px/g).length },
  { key: 'topbar_divs_handwritten', what: 'top bars written inline rather than through screenHeader()', n: count(/<div class="topbar"/g) - 1 },
  { key: 'screenheader_calls', what: 'screens that do use the shared header', n: count(/screenHeader\(/g) - 1 },
  { key: 'chip_tone_rules', what: 'rules that give a chip its colour', n: count(/\.chip\.[a-z-]+\b[^{]*\{/g) + count(/\.badge-[a-z]+\{/g) },
  { key: 'section_heading_constructs', what: 'distinct ways a section title is expressed', n: (count(/class="section-label"/g) > 0 ? 1 : 0) + distinct(/<h3[^>]*style="[^"]*font-size[^"]*"/g).length + count(/\.card-quiet[^{]*\{[^}]*border-left/g) },
  { key: 'stat_tile_systems', what: 'competing stat-tile classes', n: (count(/\.stat-strip\b/g) ? 1 : 0) + (count(/\.statgrid\b/g) ? 1 : 0) + (count(/\.stat\{/g) ? 1 : 0) },
  { key: 'literal_font_sizes', what: 'font-size set in px rather than through the scale', n: count(/font-size:\s?[0-9.]+px/g) },
  { key: 'literal_paddings', what: 'padding set with literal pixels', n: count(/padding:\s?[0-9.]+px/g) },
  { key: 'distinct_paddings', what: 'different padding values in use', n: distinct(/padding:\s?[0-9.]+px(?: [0-9.]+px)*/g).length },
];

if (!fs.existsSync(BASELINE) && !bless) {
  console.log('NO CONCLUSION: no baseline file. Run with --bless once the numbers above are the agreed ceiling.');
  metrics.forEach(m => console.log('  ' + m.key.padEnd(26) + String(m.n).padStart(5) + '   ' + m.what));
  process.exit(1);
}
const base = bless ? {} : JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
let worse = 0;
console.log('file: Sukinnect-next.html   ' + src.split(/\r?\n/).length + ' lines');
metrics.forEach(m => {
  const ceil = base[m.key];
  const flag = ceil === undefined ? 'new' : (m.n > ceil ? 'RISEN from ' + ceil : (m.n < ceil ? 'down from ' + ceil : 'at ceiling'));
  if (ceil !== undefined && m.n > ceil) worse++;
  console.log('  ' + m.key.padEnd(26) + String(m.n).padStart(5) + '  [' + flag + ']  ' + m.what);
});
if (bless) {
  const o = {}; metrics.forEach(m => { o[m.key] = m.n; });
  fs.writeFileSync(BASELINE, JSON.stringify(o, null, 2) + '\n');
  console.log('\nceilings written to tools/design-consistency-baseline.json');
  process.exit(0);
}
console.log('\n' + (worse ? worse + ' metric(s) have RISEN above their ceiling — that is the inconsistency growing'
  : 'no metric has grown since the baseline; the count of ways to say the same thing is holding'));
process.exit(worse ? 1 : 0);
