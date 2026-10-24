/* Proves the two gate checks that read tools/shot.cjs can fail.

   They are unusual: they police the instrument rather than the application. §63 found four of the
   camera's element walks skipping .modal-layer — six hand-written container lists that had
   drifted — which meant every text and colour sensor in the tool had never looked inside the
   dialogs where a person types a phone number or a home address. §64 found the same drift in the
   tool's own labelling: the lookup that names each shot asked the sheet and the screen but never
   the dialog raised over them, so all six form screens were reported by the hub behind them.

   A blind sensor reports a zero, and a zero looks exactly like a clean bill of health; a
   mislabelled screenshot makes the reader draw conclusions about a screen they are not looking at.
   Both fail quietly, so neither is trusted here — each break is put in, the gate is run, and the
   named check has to be the thing that fails. Nothing launches Chrome.

     node tools/falsify-camera-surfaces.cjs    ~1½ minutes                                       */
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
  { name: 'the shot label asks the sheet before the dialog raised from it',
    needle: "const t = document.querySelector('.modal-layer b') || document.querySelector('.sheet .sheet-title') ||",
    to: "const t = document.querySelector('.sheet .sheet-title') || document.querySelector('.modal-layer b') ||",
    label: 'the camera names a shot by the topmost layer, so a dialog outranks its sheet' },
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
for (const m of MUTANTS) {
  const want = m.label || LABEL;
  if (gateRun().out.includes('FAIL  ' + want)) {
    console.log('BASELINE fails "' + want + '" — fix the check before testing whether it can fail.');
    process.exit(1);
  }
}
console.log('baseline: both camera checks pass on the unmutated tool');
try {
  for (const m of MUTANTS) {
    const want = m.label || LABEL;
    const hits = original.split(m.needle).length - 1;
    if (hits !== 1) {
      unmatched++;
      console.log('SKIP  ' + m.name + '  (needle matched ' + hits + ' times, needs exactly 1)');
      continue;
    }
    applied++;
    fs.writeFileSync(TARGET, original.replace(m.needle, m.to));
    const run = gateRun();
    const named = run.out.includes('FAIL  ' + want);
    if (run.code !== 0 && named) { caught++; console.log('CAUGHT  ' + m.name); }
    else console.log('MISSED  ' + m.name + '  (exit ' + run.code + ', named check ' +
      (named ? 'failed' : 'passed anyway') + ')');
  }
} finally {
  fs.writeFileSync(TARGET, original);
}
console.log('\n' + caught + ' of ' + applied + ' mutants caught, ' + unmatched + ' not applied; file restored.');
process.exit(applied > 0 && caught === applied && unmatched === 0 ? 0 : 1);
