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
  { key: 'bar_title_class_rules', what: 'rules that size a screen name through a class a screen can decline', n: count(/\.topbar \.title/g) },
  { key: 'bar_titles_self_sized', what: 'headings that type their own font-size into the bar', n: count(/<h1[^>]*style="[^"]*font-size/g) },
  { key: 'bar_left_groups_handwritten', what: "a bar's title group typed as flex pixels instead of .hb", n: count(/<div style="display:flex; align-items:center; gap:(8|10)px;">/g) },
  { key: 'bar_action_styles_inline', what: 'an on-bar control typed its own background instead of .btn.onbar', n: count(/style="background:rgba\(255,255,255,0?\.12\)/g) + count(/style="background:var\(--brand-navy-deep\); color:var\(--on-brand\)/g) },
  /* Direction matters for a ratchet. Every other metric here is a count of ways to say one thing,
     so more is worse; this one is the opposite, and ratcheting it would refuse the fix. It is
     printed for context and held to a floor instead, so the shared header cannot quietly stop
     being used. */
  { key: 'screenheader_calls', what: 'screens that do use the shared header (a floor, not a ceiling)', n: count(/screenHeader\(/g) - 1, floor: 13 },
  { key: 'chip_tone_rules', what: 'rules that give a chip its colour', n: count(/\.chip\.[a-z-]+\b[^{]*\{/g) + count(/\.badge-[a-z]+\{/g) },
  { key: 'section_heading_constructs', what: 'distinct ways a section title is expressed', n: (count(/class="section-label"/g) > 0 ? 1 : 0) + distinct(/<h3[^>]*style="[^"]*font-size[^"]*"/g).length + count(/\.card-quiet[^{]*\{[^}]*border-left/g) },
  /* Counted by what is painted, not by how many rules exist. The old definition added
     `.stat-strip`, `.statgrid` and `.stat{` and reported three competing systems, but `.statgrid` is
     the two-column layout that holds `.stat` tiles — a wrapper is not a rival idea. The two real
     answers are a read-only strip of figures and a number you can press, which is exactly the
     distinction the stylesheet's own comment makes. */
  { key: 'stat_tile_systems', what: 'competing stat-tile ideas (a figure strip, a pressable tile)', n: (count(/class="stat-strip"/g) ? 1 : 0) + (count(/class="stat"/g) ? 1 : 0) },
  { key: 'literal_font_sizes', what: 'font-size set in px rather than through the scale', n: count(/font-size:\s?[0-9.]+px/g) },
  { key: 'literal_paddings', what: 'padding set with literal pixels', n: count(/padding:\s?[0-9.]+px/g) },
  { key: 'distinct_paddings', what: 'different padding values in use', n: distinct(/padding:\s?[0-9.]+px(?: [0-9.]+px)*/g).length },
  /* Comments are stripped first: a sentence quoting an old stacking number is the same string to a
     scanner as a rule typing a new one, and the file has already been fooled that way by a hex inside
     a comment (§31). The ceiling is 0 and the gate asserts the same rule independently, so neither can
     rot without the other noticing. */
  { key: 'literal_z_index', what: 'layers that type their own stacking number instead of a rung',
    n: (src.replace(/\/\*[\s\S]*?\*\//g, '').match(/z-index:\s*-?[0-9]/g) || []).length },
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
  /* A floor metric reads its floor from the baseline once one exists. It used to read only the
     hardcoded number, so `--bless` wrote 32 for `screenheader_calls` while the rule still enforced 13 —
     the file said one ceiling and the code applied another, and a build could lose half the shared
     headers and still print "floor held". */
  const floor = m.floor === undefined ? undefined : (ceil === undefined ? m.floor : ceil);
  const flag = floor !== undefined
    ? (m.n >= floor ? 'floor ' + floor + ' held' : 'BELOW FLOOR ' + floor)
    : (ceil === undefined ? 'new' : (m.n > ceil ? 'RISEN from ' + ceil : (m.n < ceil ? 'down from ' + ceil : 'at ceiling')));
  if (floor !== undefined) { if (m.n < floor) worse++; }
  else if (ceil !== undefined && m.n > ceil) worse++;
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
