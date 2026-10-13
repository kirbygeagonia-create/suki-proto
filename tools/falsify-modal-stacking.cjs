/* Proves the two checks added with the modal-stacking fix actually watch the rule
   they claim to: it puts each defect back and requires the named check to fail.
   A mutant that every check survives means the check is not looking.
     node tools/falsify-modal-stacking.cjs                                            */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'Sukinnect-next.html');
const original = fs.readFileSync(TARGET, 'utf8');

/* Single-line needles on purpose: the file is CRLF, so a needle carrying \n never
   matches and the mutant reports itself as SKIP while looking like a pass. */
const MUTANTS = [
  { name: 'the modal drops under the sheet again',
    apply: s => s.replace('inset:0; background:var(--scrim); z-index:70;',
                         'inset:0; background:var(--scrim); z-index:50;') },
  { name: 'the sheet is raised over the modal',
    apply: s => s.replace('position:absolute; inset:0; z-index:60;',
                         'position:absolute; inset:0; z-index:80;') },
  { name: 'the modal loses its z-index entirely',
    apply: s => s.replace('inset:0; background:var(--scrim); z-index:70;',
                         'inset:0; background:var(--scrim);') },
];

const LABEL = 'a modal opened from a sheet sits above the sheet';

function gateOutput() {
  try {
    return { code: 0, out: execFileSync(process.execPath, [path.join(ROOT, 'tools', 'verify.cjs')],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) };
  } catch (err) {
    return { code: err.status === undefined ? -1 : err.status,
      out: (err.stdout || '') + (err.stderr || '') };
  }
}

let caught = 0, applied = 0;
try {
  for (const m of MUTANTS) {
    const mutated = m.apply(original);
    if (mutated === original) { console.log('SKIP  ' + m.name + '  (needle did not match)'); continue; }
    applied++;
    fs.writeFileSync(TARGET, mutated);
    const run = gateOutput();
    const failed = run.code !== 0 && run.out.includes('FAIL  ' + LABEL);
    if (failed) { caught++; console.log('CAUGHT  ' + m.name); }
    else console.log('MISSED  ' + m.name + '  (exit ' + run.code + ')');
  }
} finally {
  fs.writeFileSync(TARGET, original);
}
console.log('\n' + caught + ' of ' + applied + ' mutants caught; file restored.');
process.exit(caught === applied ? 0 : 1);
