/* Proves the eight wording-and-scope checks added with the §13 "Optimizer" pass can each fail.

   Two cards on the FSM screen promised mechanisms the build does not have — "Dynamic Availability
   Optimizer / Suggests when to go Available/Busy based on real-time surge predictions" and a "Route &
   Schedule Optimizer" that announced an optimized sequence for "your 2 active jobs today" between two
   typed streets with "travel time minimized by 18 mins". A filter labelled "Arrives within" compared
   `availabilityMin`, which is when a job can START, and a provider card said "about 0.8 km from you"
   over a number typed into the seed. The cards were deleted or told the truth; the labels now name the
   field they read.

   Each break below names the ONE check it is written to fail, and six breaks were chosen so that no
   check in the batch is proven only by the sentence being present: the fabricated route sentence is
   restored, the old label is restored, the arrival word is restored, the seeded distance is claimed as
   a measurement again, the day is listed twice, and the dashboard stops filtering by day. The last two
   are the ones that would otherwise rot quietly, because they assert an absence.

     node tools/falsify-wording-truth.cjs    ~7 minutes (six full gate passes)                    */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'Sukinnect-next.html');
const original = fs.readFileSync(TARGET, 'utf8');

const BREAKS = [
  { name: 'the wait filter is called "Arrives within" again while still comparing availabilityMin',
    check: 'the wait filter is labelled for the field it actually filters',
    from: 'sheet-label">Can start within', to: 'sheet-label">Arrives within' },
  { name: 'a provider card calls the start-availability figure an arrival',
    check: 'no provider card calls availabilityMin an arrival',
    from: 'can start in ~${p.availabilityMin} min', to: 'arrives ~${p.availabilityMin} min' },
  { name: 'the seeded distance is announced as measured from the reader',
    check: 'the seeded distance is disclosed as a sample, not as a measurement of the reader',
    from: 'km away (sample figure, not measured from you)', to: 'km from you' },
  { name: 'the fabricated 18-minute route saving is put back on the FSM screen',
    check: 'no card claims an optimizer or a travel saving the build does not compute',
    from: 'there is no surge model or suggestion engine in this prototype.',
    to: 'Optimized sequence for your 2 active jobs today: Rizal St. (2:30 PM) to San Isidro Ave. '
      + '(4:00 PM). Travel time minimized by 18 mins.' },
  { name: 'the dispatch switch goes back to promising surge suggestions',
    check: 'the dispatch switch says what it does instead of promising suggestions',
    from: 'This switch records your preference on this device. No urgent-request routing reads it yet, '
      + 'so nothing arrives because of it - there is no surge model or suggestion engine in this prototype.',
    to: 'Suggests when to go Available/Busy based on real-time surge predictions.' },
  { name: 'the FSM screen grows a second list of the same day',
    check: 'and the day is listed in exactly one place',
    from: '${earningsCard(CURRENT_PROVIDER_ID)}',
    to: '<h3 style="font-size:var(--t-body); margin:0 0 8px;">Today</h3>${earningsCard(CURRENT_PROVIDER_ID)}' },
  { name: 'the day list stops filtering by day, so a provider with nothing scheduled today still shows other days',
    check: 'a provider with no job today is told so, and never shown p1’s day',
    from: 'const today = scheduled.filter(b => b.date === dayName(0));',
    to: 'const today = scheduled;' },
];

function gateOutput() {
  let out = '';
  try {
    out = execFileSync(process.execPath, [path.join(ROOT, 'tools', 'verify.cjs')],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (err) { out = (err.stdout || '') + (err.stderr || ''); }
  return out;
}

function readCheck(out, watch) {
  const line = out.split(/\r?\n/).find(l => l.indexOf(watch) >= 0);
  if (!line) return { seen: false, failed: false, why: 'the check vanished from the output' };
  const t = line.trim();
  return { seen: true, failed: t.indexOf('FAIL') === 0, why: t.slice(0, 160) };
}

let caught = 0, applied = 0, unmatched = 0;
/* One gate pass reads every named check, because a baseline per break would triple the cost of a
   family that already has to run the whole gate once per mutant. */
const base = gateOutput();
const missing = BREAKS.filter(b => !readCheck(base, b.check).seen);
if (missing.length) {
  console.log('BROKEN  the gate prints no check named: ' + missing.map(m => '"' + m.check + '"').join(', '));
  process.exit(1);
}
const already = BREAKS.map(b => readCheck(base, b.check)).filter(r => r.failed);
if (already.length) { console.log('BROKEN  the gate is already red before any break: ' + already[0].why); process.exit(1); }
console.log('baseline: all ' + BREAKS.length + ' named checks pass on the file as it stands');

try {
  for (const b of BREAKS) {
    const hits = original.split(b.from).length - 1;
    if (hits !== 1) {
      unmatched++;
      console.log('SKIP  ' + b.name + '  (its anchor matched ' + hits + ' times, needs exactly 1)');
      continue;
    }
    applied++;
    fs.writeFileSync(TARGET, original.replace(b.from, b.to));
    const r = readCheck(gateOutput(), b.check);
    if (!r.seen) console.log('MISSED  ' + b.name + '  (' + r.why + ')');
    else if (r.failed) { caught++; console.log('CAUGHT  ' + b.name + '  → ' + r.why); }
    else console.log('MISSED  ' + b.name
      + '  (the named check still passes, so it is not reading what this breaks)');
  }
} finally {
  fs.writeFileSync(TARGET, original);
}
console.log('\n' + caught + ' of ' + applied + ' breaks caught, ' + unmatched + ' not applied; file restored.');
process.exit(applied > 0 && caught === applied && unmatched === 0 ? 0 : 1);
