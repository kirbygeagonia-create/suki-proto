/* A booking's step stamp and the event that names the same act are one moment stored twice: the
   tracking view reads the stamp, the dispute evidence chain and the admin audit read the log. They used
   to be three separate clock reads — the transition effect wrote acceptedAt, the next line wrote
   statusChangedAt, recordStatusEvent took a third — which agree only while nothing spends a millisecond
   between them. attemptTransition now takes one reading and hands it to all three.

   Each break restores one half of the old shape and requires the named gate check to refuse it. The
   behavioural checks cannot see a re-taken reading (two `new Date()` calls a statement apart land in
   the same millisecond), so breaks 1 and 2 are pinned by the structural pair — which is why those
   checks exist. Break 3 is the seed path, where the two representations are written by different
   arithmetic and a divergence is real. Break 4 deletes the stamp write, which the behavioural check
   sees because the live booking then has an event and no stamp.

     node tools/falsify-step-stamps.cjs                                                   */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'Sukinnect-next.html');
const original = fs.readFileSync(TARGET, 'utf8');

const SHAPE = 'the transition hands its own read to the event and the stamp';
const EFFECT = 'no step effect writes a stamp from its own clock';
const MOMENT = 'the step stamp and the event naming that act are the same instant';

const MUTANTS = [
  { name: 'the event takes a fresh clock reading instead of the transition’s',
    label: SHAPE,
    from: "  recordStatusEvent(booking, from, to, actor, (opts && opts.note) || '', at);",
    to: "  recordStatusEvent(booking, from, to, actor, (opts && opts.note) || '');" },
  { name: 'the accept effect writes its own stamp again',
    label: EFFECT,
    from: '  authorizeBooking(booking);            /* held for a partner job, nothing for cash */',
    to: '  booking.acceptedAt = new Date().toISOString();\n' +
      '  authorizeBooking(booking);            /* held for a partner job, nothing for cash */' },
  { name: 'the seed stamps acceptance with the request time, not the event’s',
    label: MOMENT,
    from: '    b.acceptedAt = acceptedAt;',
    to: '    b.acceptedAt = b.createdAt;' },
  { name: 'the transition stops writing the step stamp',
    label: MOMENT,
    from: '  if (STEP_STAMPS[to]) booking[STEP_STAMPS[to]] = at;',
    to: '' },
];

function plant(s, m) {
  const hits = s.split(m.from).length - 1;
  return hits === 1 ? { out: s.replace(m.from, m.to) } : { bad: hits };
}

function gateRun() {
  try {
    return { code: 0, out: execFileSync(process.execPath, [path.join(ROOT, 'tools', 'verify.cjs')],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) };
  } catch (err) {
    return { code: err.status === undefined ? -1 : err.status, out: (err.stdout || '') + (err.stderr || '') };
  }
}

let caught = 0, applied = 0, unmatched = 0;
try {
  for (const m of MUTANTS) {
    const planted = plant(original, m);
    if (planted.bad !== undefined) {
      console.log('SKIP    ' + m.name + '  (needle matched ' + planted.bad + ', expected 1)');
      unmatched++; continue;
    }
    applied++;
    fs.writeFileSync(TARGET, planted.out);
    const run = gateRun();
    const failed = run.code !== 0 && run.out.includes('FAIL  ' + m.label);
    if (failed) { caught++; console.log('CAUGHT  ' + m.name); }
    else console.log('MISSED  ' + m.name + '  (exit ' + run.code + ', named check '
      + (run.code !== 0 ? 'not the one that failed: ' + (run.out.match(/FAIL  .*/g) || [''])[0].slice(0, 70)
        : 'passed anyway') + ')');
  }
} finally {
  fs.writeFileSync(TARGET, original);
}
console.log('\n' + caught + ' of ' + applied + ' breaks caught, ' + unmatched + ' not applied; file restored.');
process.exit(caught === applied && unmatched === 0 ? 0 : 1);
