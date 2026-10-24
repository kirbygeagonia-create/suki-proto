/* Proves the split-figure tally can fail, and says plainly which half of the guard is observable at
   this corner.

   The rule: `body{ overflow-wrap:anywhere }` (the long-input guard) makes a flex item's min-content
   width one character, so at 200% text a stat-strip figure was breaking in the middle — "1039" painted
   as "10" over "39" on the admin's Insights screen. Nothing in the camera could see it: the number is
   not clipped, does not collide, is on scale and clears the nav. It was found by looking at a
   screenshot. The guard is `.stat-strip .f b{ flex-shrink:0; white-space:nowrap }`.

   One break and one observation, both planted every run:
     1. both declarations go        → the tally fires: split=3 on six screens at this corner, which is
                                      the proof the sensor sees the defect it was written for
     2. only nowrap goes, shrink 0  → measured QUIET: split=0, clip=0, overflow=0. An item that cannot
                                      shrink keeps its figure's width, the label wraps instead, and no
                                      break opportunity inside the number is ever reached. So the two
                                      declarations are redundant in this direction at this corner, and
                                      the second edit is reported rather than counted — counting it
                                      would make the aggregate runner print a surviving mutant where
                                      there is a fact about the guard. If it ever fires, the NOTED line
                                      says the prose above has gone stale.

   Measured at 320 CSS px with the text at 200%, the corner where the strip is tightest.

     node tools/falsify-split-figures.cjs    ~6 minutes, needs the machine's Chrome               */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'Sukinnect-next.html');
const original = fs.readFileSync(TARGET, 'utf8');
const RULE = '  .stat-strip .f b{ font-family:var(--font-display); font-size:var(--t-body-lg);' +
  ' font-weight:600; color:var(--deep); flex-shrink:0; white-space:nowrap; }';
if (original.split(RULE).length - 1 !== 1) {
  console.log('the rule the family breaks is not where this file expects it (matched ' +
    (original.split(RULE).length - 1) + ', expected 1) — nothing was written');
  process.exit(1);
}

const SCREENS = 'admin-insights,admin-dash,admin-intel,admin-finance,provider-profile,admin-provider';
const CORNER = ['--width=320', '--font-scale=2'];
const TITLES = {
  split: 'stat-strip figures painted across more than one line',
  overflow: 'horizontal overflow (a screen wider than the phone)',
  clip: 'text clipped by its own container',
};

function measure() {
  let out = '';
  try {
    out = execFileSync(process.execPath,
      [path.join(ROOT, 'tools', 'shot.cjs'), '--measure', '--only=' + SCREENS].concat(CORNER),
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (err) { out = (err.stdout || '') + (err.stderr || ''); }
  const read = {};
  for (const k of Object.keys(TITLES)) {
    const line = out.split(/\r?\n/).find(l => l.indexOf(TITLES[k]) === 0);
    if (!line) { read[k] = null; continue; }
    const n = /:\s*(\d+)/.exec(line);
    /* The overflow line answers "none", not a number — and a line with no number is the sensor
       answering, so it reads 0 here rather than null. A MISSING line is the run measuring nothing. */
    read[k] = n ? Number(n[1]) : (/none/.test(line) ? 0 : null);
  }
  return read;
}
const said = r => Object.keys(TITLES).map(k => k + '=' + r[k]).join(', ');

const BREAKS = [
  { name: 'the figures go back to shrinking and breaking mid-number',
    edits: [[RULE, RULE.replace(' flex-shrink:0; white-space:nowrap;', '')]] },
];
/* Planted and printed, but not counted as a proof: measured redundant at this corner. */
const OBSERVATIONS = [
  { name: 'the figure cannot shrink but is still allowed a break inside it', observe: true,
    edits: [[RULE, RULE.replace(' white-space:nowrap', '')]] },
];

let caught = 0, applied = 0, unmatched = 0;
const observed = [];
const base = measure();
if (base.split === null) { console.log('BASELINE printed no split tally — the sensor is not running.'); process.exit(1); }
if (base.split !== 0) {
  console.log('BASELINE reads ' + said(base) + ' — the tally cannot be credited with a clean row that is not clean.');
  process.exit(1);
}
console.log('baseline: ' + said(base) + ' on ' + SCREENS.split(',').length + ' screens at ' + CORNER.join(' '));

try {
  for (const b of BREAKS.concat(OBSERVATIONS)) {
    let mutated = original, bad = null;
    for (const [from, to] of b.edits) {
      const hits = mutated.split(from).length - 1;
      if (hits !== 1) { bad = hits; break; }
      mutated = mutated.replace(from, to);
    }
    if (bad !== null || mutated === original) {
      console.log('SKIP    ' + b.name + '  (needle matched ' + (bad === null ? 1 : bad) +
        (mutated === original ? ', and the edit changed nothing' : '') + ')');
      if (!b.observe) unmatched++;
      continue;
    }
    if (!b.observe) applied++;
    fs.writeFileSync(TARGET, mutated);
    const r = measure();
    if (r.split === null) {
      console.log('BROKEN  ' + b.name + '  (the tally printed no line, so nothing was measured)');
      if (!b.observe) unmatched++;
    } else if (r.split > 0) {
      if (b.observe) console.log('NOTED   ' + b.name + '  → ' + said(r) +
        '  (this half is load-bearing after all — the prose above needs rewriting)');
      else { caught++; console.log('CAUGHT  ' + b.name + '  → ' + said(r)); }
    } else if (b.observe) {
      observed.push(b.name); console.log('QUIET   ' + b.name + '  → ' + said(r) + '  (redundant at this corner)');
    } else console.log('MISSED  ' + b.name + '  → ' + said(r));
  }
} finally {
  fs.writeFileSync(TARGET, original);
  const back = measure();
  console.log('restored: ' + said(back));
}
/* The exit rule is "the sensor is proven and every break was planted". The second edit is reported,
   not counted, because it is measured redundant at this corner: with the item unable to shrink, the
   figure keeps its width and the label wraps instead, so no break opportunity inside the number is
   ever reached — and the panel does not overflow either (clip=0, overflow=0). Counting it as a break
   would make the aggregate runner print a surviving mutant where there is a fact about the guard,
   which is the difference falsify-all exists to keep. If it ever does fire, the note is the signal
   that the two halves stopped being redundant and the prose needs rewriting. */
console.log('\n' + caught + ' of ' + applied + ' breaks caught, ' + unmatched + ' not applied' +
  (observed.length ? '; observed: ' + observed.join(' | ') : '') + '.');
process.exit(caught > 0 && unmatched === 0 && applied === BREAKS.length ? 0 : 1);
