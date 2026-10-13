/* The admin dashboard counted two different questions as one statistic — "Live bookings
   10" was six accepted jobs plus four requests nobody had answered — and its aria-label
   promised a screen that counts something else entirely would reproduce it. This puts
   each half of the fix back the way it was, one at a time, and requires the named gate
   check to fail. A mutant every check survives means the check is not looking.
     node tools/falsify-count-labels.cjs                                                     */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'Sukinnect-next.html');
const original = fs.readFileSync(TARGET, 'utf8');
const LABEL = 'the console counts accepted work apart from unanswered requests';

/* Single-line needles: the file is CRLF, so a needle carrying \n matches nothing and the
   mutant prints SKIP while looking like a clean run. */
const MUTANTS = [
  { name: 'the in-progress count takes the unanswered requests as well',
    apply: s => s.replace(
      "const agreed = BOOKINGS.filter(b => ['upcoming', 'en_route', 'arrived', 'ongoing'].includes(b.status)).length;",
      "const agreed = BOOKINGS.filter(b => ['upcoming', 'en_route', 'arrived', 'ongoing', 'requested'].includes(b.status)).length;") },
  { name: 'open work stops being the sum of the two halves',
    apply: s => s.replace('const open = agreed + waiting;', 'const open = agreed;') },
  { name: 'the tile prints the combined figure under the progress label again',
    apply: s => s.replace('<div class="num">${k.agreed}</div><div class="lbl">Bookings in progress</div>',
      '<div class="num">${k.open}</div><div class="lbl">Bookings in progress</div>') },
  { name: 'the waiting line stops naming how many are waiting',
    apply: s => s.replace("${k.waiting} request${k.waiting === 1 ? '' : 's'} still waiting",
      'Some requests are still waiting') },
  { name: 'the tile promises the intelligence screen counts the same number',
    apply: s => s.replace('aria-label="Bookings a provider has accepted and not finished:',
      'aria-label="Live bookings are counted there by Marketplace Intelligence:') },
  { name: 'the workload ring calls the combined figure live bookings again',
    apply: s => s.replace("{ label:'Open work', items:k.open, tone:'var(--deep)' },",
      "{ label:'Live bookings', items:k.open, tone:'var(--deep)' },") },
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
    else console.log('MISSED  ' + m.name + '  (exit ' + run.code + ', named check '
      + (run.code !== 0 ? 'not the one that failed' : 'passed anyway') + ')');
  }
} finally {
  fs.writeFileSync(TARGET, original);
}
console.log('\n' + caught + ' of ' + applied + ' mutants caught; file restored.');
process.exit(caught === applied ? 0 : 1);
