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
  /* The proof that the FLOOR is a limit and not a comment. Lowering it to 8px makes every word whole,
     so the cut tally goes quiet — and the below-14px type tally is what has to fire. It did not, on
     the first two runs: the nav-label skip in the camera's off-scale walk was a plain return, which
     also disarmed the floor check two statements below it, so the sensor was blind exactly where the
     comment beside it claimed it was not. The break was removed for a session under the belief that
     it was unobservable; it was the sensor that was wrong. This is the case for keeping a break that
     prints MISSED and reading why, instead of deleting it and moving on. */
  { name: 'the floor is lowered to 8px, so the words go whole and unreadable',
    edits: [['const NAV_LABEL_FLOOR_PX = 14;', 'const NAV_LABEL_FLOOR_PX = 8;']] },
  { name: 'the fit ratio is inverted, so it asks for a larger size than it already has',
    edits: [['if (slot > 0 && wants > slot) worst = Math.min(worst, slot / wants);',
             'if (slot > 0 && wants > slot) worst = Math.min(worst, wants / slot);']] },
  /* The boundary break, which is the §79 case. The fit loop and the camera's tally both used to compare
     each word against the ITEM's clientWidth, which still includes the item's 4px horizontal padding —
     in a 74px slot the label can only use 66px. Restoring that comparison here has to make the FIXED
     tally report a cut; if it reads clean, then the tally is still measuring the wrong box and this
     family cannot see the defect it exists to guard. Found on the OPPO at its own 1.35 text, where the
     loop wrote 11.85px (16px rendered) and clipped two words while both sensors said zero. */
  { name: 'the fit measures the item\u2019s box again, so it stops while the label is still clipped',
    edits: [['const slot = l.clientWidth || item.clientWidth;', 'const slot = item.clientWidth;']] },
  /* The conversion break, which NO camera on this machine can see. `size` is the rendered 14px floor and
     the property takes specified px, so dividing by the measured factor and rounding to NEAREST wrote
     10.37 on a 1.35 handset, which the platform multiplied back to 13.9995px — under the declared floor
     by half a thousandth of a pixel, and the camera's below-14px walk carries a 0.7px tolerance that
     would never report it. On the bench the factor is exactly 1, so specified and rendered are the same
     number and every tallies stays 0 under either rounding: the defect is only visible on hardware, and
     this break is proved by the hygiene check that pins the shape instead. */
  { name: 'the specified size is rounded to nearest again, so a 1.35 handset renders under the floor',
    gate: 'the nav floor is converted upward, so the specified size never renders under it',
    edits: [["(Math.ceil((size / scale) * 100) / 100)", "(Math.round((size / scale) * 100) / 100)"]] },
];

/* One gate run per break that asks the Node suite rather than the browser. */
function gateVerdict(label) {
  let out = '';
  try {
    out = execFileSync(process.execPath, [path.join(ROOT, 'tools', 'verify.cjs')],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (err) { out = (err.stdout || '') + (err.stderr || ''); }
  const line = out.split(/\r?\n/).find(l => l.indexOf(label) >= 0);
  if (!line) return { seen: false, failed: false };
  return { seen: true, failed: /^\s*FAIL/.test(line) };
}

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
    if (b.gate) {
      const g = gateVerdict(b.gate);
      if (!g.seen) console.log('MISSED  ' + b.name + '  (the named gate check is not in verify.cjs output at all)');
      else if (g.failed) { caught++; console.log('CAUGHT  ' + b.name + '  (the gate check for the conversion fails)'); }
      else console.log('MISSED  ' + b.name + '  (the gate check still passes, so it does not read the rounding)');
      continue;
    }
    const r = measure();
    const t = total(r);
    if (t === null) console.log('MISSED  ' + b.name + '  (the camera printed none of its tallies)');
    else if (t > 0) { caught++; console.log('CAUGHT  ' + b.name + '  (' + said(r) + ')'); }
    else console.log('MISSED  ' + b.name + '  (still 0 everywhere, so neither sensor reads this rule)');
  }
} finally {
  fs.writeFileSync(TARGET, original);
}
const gateBase = gateVerdict('the nav floor is converted upward, so the specified size never renders under it');
if (!gateBase.seen) console.log('NOTE the conversion check is absent from the gate, so its break was not run');
else if (gateBase.failed) console.log('BASELINE the conversion check already fails before any break — nothing above this line is trustworthy');
console.log('\n' + caught + ' of ' + applied + ' breaks caught, ' + unmatched + ' not applied; file restored.');
process.exit(applied > 0 && caught === applied && unmatched === 0 && gateBase.failed === false ? 0 : 1);
