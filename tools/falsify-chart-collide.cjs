/* Proves the camera's three chart tallies can fire, by putting each defect back exactly as the
   handset and the sweep found them.

   Why this exists at all: every other sensor in shot.cjs asks a CONTAINMENT question — is this
   clipped, is it outside its box, is it under the nav, is it off the type scale. None of them asked
   whether two pieces of text land on each other, which is why the provider's Weekly earnings chart
   passed the whole suite on a real OPPO at its own text size while "Aug 24" and "Sep 14" were painted
   27px into one another and five y-axis ticks were stacked into a grey band. The containment tally
   read 0 on that same screen, correctly: both labels were inside the box. They were simply inside it
   on top of each other.

   The second tally exists because the first was blind in a different direction: labels painted
   outside their own chart box measured left and right only, so the admin's Weekly chart kept an "8"
   15px ABOVE its own box — and 13x8px into the card's sub-line — while it printed 0 at every width.
   The third exists because fixing that one blindened the second in turn: the paired-series bug — the
   scale built from one series while the chart paints the larger of two — used to be visible through
   the escaping value label it produced, and once the numbers are suppressed at that text size the
   over-scale bar paints under the svg's own clip and every label tally reads clean. A bar cut off at
   the top is not the smaller problem of the two: it is a chart claiming the week reached its maximum
   when it did not, and nothing measured it.

   Two corners, because the defects live at different ones. The squeezing that overlaps labels side by
   side is worst at 320 CSS px with the text at 200% — the widest type on the narrowest panel. The
   upward escape only appears where the labels still fit horizontally while the headroom reserve is
   refused by its own cap: 320x638 at the OPPO's 135%. Measured at 200% that second one would be
   invisible for the wrong reason, because the horizontal budget already dropped every number.

     node tools/falsify-chart-collide.cjs    ~5 minutes, needs the machine's Chrome             */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'Sukinnect-next.html');
const original = fs.readFileSync(TARGET, 'utf8');
const TALLIES = {
  collide: 'text painted on top of other text in the same card: ',
  escape: 'chart labels painted outside their own chart box: ',
  over: 'bars painted above their own top gridline (a scale smaller than its data): ',
};
const PEAK = 'const peak = rows.reduce((m, r) => Math.max(m, r.value, r.value2 === undefined ? 0 : r.value2), 0);';
const VALROOM = '  const valRoom = topClear && !(valuePx > 0 && slotPx > 0 && valuePx + 6 > slotPx);';
const REFUSE = '        if ((padTop - 5) * unitPx < tickPx + 1) topClear = false;';

function measure(screens, corner) {
  let out = '';
  try {
    out = execFileSync(process.execPath,
      [path.join(ROOT, 'tools', 'shot.cjs'), '--measure', '--only=' + screens].concat(corner),
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (err) { out = (err.stdout || '') + (err.stderr || ''); }
  const read = {};
  for (const key of Object.keys(TALLIES)) {
    const line = out.split(/\r?\n/).find(l => l.startsWith(TALLIES[key]));
    /* No line is not a zero — a camera that never reached its tally block measured nothing. */
    read[key] = line ? Number(line.slice(TALLIES[key].length).trim()) : null;
  }
  return read;
}

/* null anywhere is not a small number: a tally the camera never printed measured nothing. */
function sum(r) {
  const keys = Object.keys(TALLIES);
  if (keys.some(k => r[k] === null)) return null;
  return keys.reduce((n, k) => n + r[k], 0);
}

function said(r) { return Object.keys(TALLIES).map(k => k + '=' + r[k]).join(', '); }

const WIDE_TEXT = ['--width=320', '--font-scale=2'];
const OPPO = ['--width=320', '--height=638', '--font-scale=1.35'];

/* Each break names the screens and the corner it is expected to dirty, and the pairs are not
   interchangeable: a family that measured one chart or one corner would leave the other unguarded. */
const BREAKS = [
  { name: 'the x-axis stops thinning, so every week label is drawn', screens: 'provider-dash',
    corner: WIDE_TEXT,
    edits: [['    stride = Math.max(1, Math.ceil((labelPx * 1.5 + 8) / slotPx));', '    stride = 1;']] },
  { name: 'the y-axis stops thinning, so five ticks stack in the inner box', screens: 'provider-dash',
    corner: WIDE_TEXT,
    edits: [['  if (tickGapPx > 0 && tickPx > 0) tickStride = Math.max(1, Math.ceil((tickPx + 2) / tickGapPx));',
             '  if (tickGapPx > 0 && tickPx > 0) tickStride = 1;']] },
  { name: 'the scale is built from the first series only, so a taller second bar leaves the plot',
    screens: 'admin-dash', corner: WIDE_TEXT,
    edits: [[PEAK, 'const peak = rows.reduce((m, r) => Math.max(m, r.value), 0);']] },
  /* The screen matters here. This break was first pointed at provider-dash, where a week with no
     settled job paints no label and the series has exactly one — so the guard looked dead and was
     deleted, until the baseline on the admin's 14-bar chart came back with two collisions.
       It forces the whole guard rather than one half, and that is a fact about the app rather than a
     shortcut: at 320px with the text at 200% BOTH halves refuse the numbers, so a break that removes
     only one reads 0. Two versions of this family tried to isolate a single half — the vertical one,
     and the side-by-side one on the default panel where the reserve fits — and both printed MISSED.
     So the horizontal budget is proven jointly with the headroom rule and not alone, which is
     recorded rather than papered over: no corner this seed paints makes that half fail by itself, and
     a mutant that cannot fire anywhere is not coverage. What is known is the redundancy, not a
     verdict on whether the half earns its place. */
  { name: 'value labels are painted even when the bars have no room for them', screens: 'admin-dash',
    corner: WIDE_TEXT,
    edits: [[VALROOM, '  const valRoom = true;']] },
  { name: 'the headroom refusal no longer drops the numbers, so the tallest one leaves the chart',
    screens: 'admin-dash', corner: OPPO,
    edits: [[REFUSE, '']] },
];

let caught = 0, applied = 0, unmatched = 0;
try {
  for (const b of BREAKS) {
    const base = measure(b.screens, b.corner);
    if (sum(base) !== 0) {
      console.log('BASELINE reads ' + said(base) + ' on ' + b.screens + ' at ' + b.corner.join(' ') +
        ' — the tallies cannot be credited with a clean chart that is not clean.');
      process.exit(1);
    }
  }
  console.log('baseline: all three tallies 0 on every screen/corner pair this family breaks');
  for (const b of BREAKS) {
    let mutated = original, bad = null;
    for (const [from, to] of b.edits) {
      const hits = mutated.split(from).length - 1;
      if (hits !== 1) { bad = hits; break; }
      mutated = mutated.replace(from, to);
    }
    if (bad !== null) {
      unmatched++;
      console.log('SKIP  ' + b.name + '  (a needle matched ' + bad + ' times, needs exactly 1)');
      continue;
    }
    applied++;
    fs.writeFileSync(TARGET, mutated);
    const n = measure(b.screens, b.corner);
    const t = sum(n);
    if (t === null) console.log('MISSED  ' + b.name + '  (the camera printed none of its tallies)');
    else if (t > 0) {
      caught++;
      console.log('CAUGHT  ' + b.name + '  (' + said(n) + ' on ' + b.screens + ' at ' +
        b.corner.join(' ') + ')');
    } else console.log('MISSED  ' + b.name + '  (still 0, so this rule is not what keeps the chart clear)');
  }
} finally {
  fs.writeFileSync(TARGET, original);
}
console.log('\n' + caught + ' of ' + applied + ' breaks caught, ' + unmatched + ' not applied; file restored.');
process.exit(applied > 0 && caught === applied && unmatched === 0 ? 0 : 1);
