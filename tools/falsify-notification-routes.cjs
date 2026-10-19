/* Proves the gate check "every notification points at a record that exists" can fail.

   It was written to prove two failure shapes — a notification pointing at a record that is gone, and
   one pointing nowhere — and the run showed the application has only one: `notificationRoute()`
   resolves the record before it answers, so a dangling `bookingId:'b99'` and a deleted field both
   print "routes nowhere". Both breaks are kept anyway, because the second is the only one that shows
   the check reads the *route* rather than the mere presence of a field, and a family that quietly
   tested one thing while claiming two is the failure mode this repository keeps documenting. The
   AGENTS and CHANGES passages for this pass say the same thing, so the claim and the evidence match.

   Why a mutant family for a rule the camera already measured: the camera walk
   (`node tools/shot.cjs --probe=@tools/probe-notification-targets.js`) proves the four resident
   notifications open screens that name their provider and their job. It cannot catch the seed
   drifting later, because a notification whose booking no longer exists still opens *a* page — the
   honest "Unknown provider" stand-in §69b built for exactly that case — and a screenshot of a
   stand-in looks like a screen. Only the reference itself can be asserted, so it is asserted in the
   gate and broken here to show the assertion is load-bearing.

     node tools/falsify-notification-routes.cjs    ~1½ minutes                                    */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'Sukinnect-next.html');
const original = fs.readFileSync(TARGET, 'utf8');
const CHECK = 'every notification points at a record that exists';

const BREAKS = [
  { name: 'a notification is left pointing at a booking that no longer exists',
    from: "bookingId:'b1'", to: "bookingId:'b99'" },
  { name: 'a notification loses its target and routes nowhere',
    from: "bookingId:'b3'", to: '' },
];

function runGate() {
  let out = '';
  try {
    out = execFileSync(process.execPath, [path.join(ROOT, 'tools', 'verify.cjs')],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (err) { out = (err.stdout || '') + (err.stderr || ''); }
  const line = out.split(/\r?\n/).find(l => l.indexOf(CHECK) >= 0);
  if (!line) return { seen: false, failed: false, why: 'the check vanished from the output' };
  const t = line.trim();
  return { seen: true, failed: t.indexOf('FAIL') === 0, why: t.slice(0, 150) };
}

let caught = 0, applied = 0, unmatched = 0;
const base = runGate();
if (!base.seen) { console.log('the named check is not in the gate output — nothing to prove'); process.exit(1); }
if (base.failed) { console.log('the gate is already red before any break: ' + base.why); process.exit(1); }
console.log('baseline: the check passes on the file as it stands');

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
    const r = runGate();
    if (!r.seen) console.log('MISSED  ' + b.name + '  (' + r.why + ')');
    else if (r.failed) { caught++; console.log('CAUGHT  ' + b.name + '  → ' + r.why); }
    else console.log('MISSED  ' + b.name + '  (the check still passes, so it is not reading what this breaks)');
  }
} finally {
  fs.writeFileSync(TARGET, original);
}
console.log('\n' + caught + ' of ' + applied + ' breaks caught, ' + unmatched + ' not applied; file restored.');
process.exit(applied > 0 && caught === applied && unmatched === 0 ? 0 : 1);
