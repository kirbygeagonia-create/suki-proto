/* Proves the bottom-nav fit can fail, and proves the FLOOR is a real limit rather than a number in
   a comment, by breaking each half and reading a different sensor.

   The rule: fitNavLabels() shrinks the nav labels until the widest word fits its slot, stopping at
   14px — the type floor §68 sets. Below that the word would be whole and unreadable, so the
   provider's five-item nav on a 320px panel keeps "Bookings" and "Messages" ellipsized on purpose.

   Three breaks, two tallies:
     1. the fit never runs          → the avoidable-cut tally fires (resident and admin truncate at
                                      the full 28px caption size, which 14px would have fitted)
     2. the floor is lowered to 8px → the avoidable-cut tally goes QUIET and the below-14px type
                                      tally fires instead, which is the proof that the floor is what
                                      stops the shrinking, not the arithmetic
     3. the ratio is inverted       → the fit asks for a larger size than it has, so the words stay
                                      cut and the avoidable-cut tally fires again

   Measured at 320 CSS px with the text at 200% — the corner where the row is tightest.

     node tools/falsify-nav-fit.cjs    ~3 minutes, needs the machine's Chrome                    */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'Sukinnect-next.html');
const original = fs.readFileSync(TARGET, 'utf8');

/* Matched by prefix, and the number parsed out of the line, because the below-floor tally's title
   carries the count of elements it walked — "(68)" — so a needle pinned to the whole title stops
   matching the day a screen is added. That is the stale-needle failure this repository keeps reading
   out of the not-applied column, and it is cheaper to avoid here than to find later. */
const TALLIES = {
  cut: 'bottom-nav labels cut although the 14px floor would have fitted them',
  floor: 'text painted below the 14px floor',
};
const SCREENS = 'resident-home,provider-dash,admin-dash';
const CORNER = ['--width=320', '--font-scale=2'];

function measure() {
  let out = '';
  try {
    out = execFileSync(process.execPath,
      [path.join(ROOT, 'tools', 'shot.cjs'), '--measure', '--only=' + SCREENS].concat(CORNER),
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (err) { out = (err.stdout || '') + (err.stderr || ''); }
  const read = {};
  for (const k of Object.keys(TALLIES)) {
    const line = out.split(/\r?\n/).find(l => l.indexOf(TALLIES[k]) === 0);
    const n = line ? /:\s*(\d+)/.exec(line) : null;
    /* No line, or a line with no number, is not a zero: the camera measured nothing. */
    read[k] = n ? Number(n[1]) : null;
  }
  return read;
}
const said = r => Object.keys(TALLIES).map(k => k + '=' + r[k]).join(', ');
const total = r => (r.cut === null || r.floor === null) ? null : r.cut + r.floor;

const BREAKS = [
  { name: 'the fit pass never runs, so the labels keep the full caption size and lose their tails',
    edits: [['  fitNavLabels();', '']] },
  { name: 'the floor is lowered to 8px, so the words go whole and unreadable',
    edits: [['const NAV_LABEL_FLOOR_PX = 14;', 'const NAV_LABEL_FLOOR_PX = 8;']] },
  { name: 'the fit ratio is inverted, so it asks for a larger size than it already has',
    edits: [['if (slot > 0 && wants > slot) worst = Math.min(worst, slot / wants);',
             'if (slot > 0 && wants > slot) worst = Math.min(worst, wants / slot);']] },
];

let caught = 0, applied = 0, unmatched = 0;
const base = measure();
if (total(base) !== 0) {
  console.log('BASELINE reads ' + said(base) + ' — the tallies cannot be credited with a clean row that is not clean.');
  process.exit(1);
}
console.log('baseline: 0 avoidable cuts and 0 sub-floor text on ' + SCREENS + ' at ' + CORNER.join(' '));

try {
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
    const r = measure();
    const t = total(r);
    if (t === null) console.log('MISSED  ' + b.name + '  (the camera printed none of its tallies)');
    else if (t > 0) { caught++; console.log('CAUGHT  ' + b.name + '  (' + said(r) + ')'); }
    else console.log('MISSED  ' + b.name + '  (still 0 everywhere, so neither sensor reads this rule)');
  }
} finally {
  fs.writeFileSync(TARGET, original);
}
console.log('\n' + caught + ' of ' + applied + ' breaks caught, ' + unmatched + ' not applied; file restored.');
process.exit(applied > 0 && caught === applied && unmatched === 0 ? 0 : 1);
