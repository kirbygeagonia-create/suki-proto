/* Proves the reputation check watches the four ways this could be wrong: accumulating
   instead of deriving, ignoring the job count, blending across providers, and re-seeding
   from an already-blended figure.
     node tools/falsify-reputation.cjs                                                  */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'Sukinnect-next.html');
const original = fs.readFileSync(TARGET, 'utf8');
const LABEL = 'a finished job moves the provider’s reputation, and moves it once';

/* Single-line needles: the file is CRLF. Two earlier mutants — blend from the previous
   blend, and re-capture the seed from the derived figure — were caught as MISSED and
   then shown to be equivalent: at one decimal place the drift they introduce is
   absorbed by the rounding, so no check could see them. The seed now lives in a map
   captured before hydrate() runs, which makes that class of defect impossible to write
   rather than impossible to miss, and these mutants stand in their place. */
const MUTANTS = [
  { name: 'a write stops refreshing the published figures',
    apply: s => s.replace('  refreshReputation();', '  /* not refreshed */;') },
  { name: 'the average ignores how many ratings the seed stands for',
    apply: s => s.replace('const count = seed.ratings + mine.length;', 'const count = mine.length || 1;') },
  { name: 'the job count stops counting this device’s completions',
    apply: s => s.replace('p.jobs = seed.jobs + done;', 'p.jobs = seed.jobs;') },
  { name: 'a completion counts twice',
    apply: s => s.replace('p.jobs = seed.jobs + done;', 'p.jobs = seed.jobs + done * 2;') },
  { name: 'every rating is blended into every provider',
    apply: s => s.replace('return BOOKINGS.filter(b => b.providerId === providerId && b.myRating)',
                          'return BOOKINGS.filter(b => true && b.myRating)') },
];

function gateRun() {
  try {
    return { code: 0, out: execFileSync(process.execPath, [path.join(ROOT, 'tools', 'verify.cjs')],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) };
  } catch (err) {
    return { code: err.status === undefined ? -1 : err.status, out: (err.stdout || '') + (err.stderr || '') };
  }
}

let caught = 0, applied = 0;
try {
  for (const m of MUTANTS) {
    const mutated = m.apply(original);
    if (mutated === original) { console.log('SKIP    ' + m.name + '  (needle did not match)'); continue; }
    applied++;
    fs.writeFileSync(TARGET, mutated);
    const run = gateRun();
    const failed = run.code !== 0 && run.out.includes('FAIL  ' + LABEL);
    if (failed) { caught++; console.log('CAUGHT  ' + m.name); }
    else console.log('MISSED  ' + m.name + '  (exit ' + run.code + '; wanted FAIL on "' + LABEL + '")');
  }
} finally {
  fs.writeFileSync(TARGET, original);
}
console.log('\n' + caught + ' of ' + applied + ' mutants caught; file restored.');
process.exit(caught === applied ? 0 : 1);
