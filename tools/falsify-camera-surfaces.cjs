/* Proves the gate's "no walk in the camera carries its own list of surfaces" check can fail.

   The check is unusual: it reads tools/shot.cjs rather than the app, because the defect it guards
   is in the instrument. §63 found four of the camera's element walks skipping .modal-layer — six
   hand-written container lists that had drifted — which meant every text and colour sensor in the
   tool had never looked inside the dialogs where a person types a phone number or a home address.
   A blind sensor reports a zero, and a zero looks exactly like a clean bill of health, so the only
   fix that lasts is one that cannot be undone quietly.

   Both mutants are read from disk by the gate, so this family never launches Chrome: it puts each
   break in, runs tools/verify.cjs, and requires the named check to be the thing that fails.

     node tools/falsify-camera-surfaces.cjs    ~1 minute                                          */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'tools', 'shot.cjs');
const original = fs.readFileSync(TARGET, 'utf8');

const LABEL = 'no walk in the camera carries its own list of surfaces';

/* Single-line needles throughout — a needle carrying a line break has been the thing that silently
   matched nothing in this repository before, and a mutant that is never applied reports as a skip
   that reads like a pass if the not-applied column is not read. */
const MUTANTS = [
  { name: 'the shared selector becomes a hand-written list again, and loses two surfaces',
    needle: "const WALK = SURFACES.map(s => s + ' *').join(', ');",
    to: "const WALK = '#screen *, .sheet *, .auth-sheet *';" },
  { name: 'the convention is renamed, so a new walk has nothing to derive from',
    needle: 'const SURFACES = [', to: 'const SURFACE_LIST = [' },
];

function gateRun() {
  try {
    return { code: 0, out: execFileSync(process.execPath, [path.join(ROOT, 'tools', 'verify.cjs')],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) };
  } catch (err) {
    return { code: err.status === undefined ? -1 : err.status,
      out: (err.stdout || '') + (err.stderr || '') };
  }
}

let caught = 0, applied = 0, unmatched = 0;
const clean = gateRun();
if (clean.out.includes('FAIL  ' + LABEL)) {
  console.log('BASELINE fails the named check — fix the check before testing whether it can fail.');
  process.exit(1);
}
console.log('baseline: the check passes on the unmutated camera');
try {
  for (const m of MUTANTS) {
    const hits = original.split(m.needle).length - 1;
    if (hits !== 1) {
      unmatched++;
      console.log('SKIP  ' + m.name + '  (needle matched ' + hits + ' times, needs exactly 1)');
      continue;
    }
    applied++;
    fs.writeFileSync(TARGET, original.replace(m.needle, m.to));
    const run = gateRun();
    const named = run.out.includes('FAIL  ' + LABEL);
    if (run.code !== 0 && named) { caught++; console.log('CAUGHT  ' + m.name); }
    else console.log('MISSED  ' + m.name + '  (exit ' + run.code + ', named check ' +
      (named ? 'failed' : 'passed anyway') + ')');
  }
} finally {
  fs.writeFileSync(TARGET, original);
}
console.log('\n' + caught + ' of ' + applied + ' mutants caught, ' + unmatched + ' not applied; file restored.');
process.exit(applied > 0 && caught === applied && unmatched === 0 ? 0 : 1);
