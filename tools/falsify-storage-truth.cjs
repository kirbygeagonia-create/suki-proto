/* Proves the four storage-truth checks each watch the thing they claim to. Every
   mutant names the check it is supposed to fail; a mutant that the named check
   survives means the check is not looking.
     node tools/falsify-storage-truth.cjs                                               */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'Sukinnect-next.html');
const original = fs.readFileSync(TARGET, 'utf8');

/* Single-line needles: the file is CRLF, so a needle carrying \n matches nothing and
   the mutant prints SKIP while looking like a clean run. */
const MUTANTS = [
  { name: 'the foreign-key pass stops asking whether the provider exists',
    label: 'a booking that belongs to nobody is refused, and named',
    apply: s => s.replace('snap.bookings.some(b => (b.providerId && !known(snap.providers, b.providerId))',
                         'snap.bookings.some(b => (false && !known(snap.providers, b.providerId))') },
  { name: 'a customer nobody knows is allowed through',
    label: 'the customer half of that door holds on its own',
    apply: s => s.replace('|| (b.customerId && !known(snap.customers, b.customerId))))',
                         '|| (false)))') },
  { name: 'the notice is never painted',
    label: 'the refusal is painted where it can be read, not only stored',
    apply: s => s.replace("  const text = state.storageNotice || '';", '  const text = \'\';') },
  { name: 'a refused write goes back to being silent',
    label: 'a refused write is said out loud, not only returned',
    apply: s => s.replace('  if (!ok) storageNotice(', '  if (false) storageNotice(') },
  { name: 'the app shouts about storage on an ordinary launch',
    label: 'an ordinary session says nothing about storage',
    apply: s => s.replace('if (BOOT.rejected) storageNotice(', 'if (true) storageNotice(') },
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
    const failed = run.code !== 0 && run.out.includes('FAIL  ' + m.label);
    if (failed) { caught++; console.log('CAUGHT  ' + m.name); }
    else console.log('MISSED  ' + m.name + '  (exit ' + run.code + '; expected FAIL on "' + m.label + '")');
  }
} finally {
  fs.writeFileSync(TARGET, original);
}
console.log('\n' + caught + ' of ' + applied + ' mutants caught; file restored.');
process.exit(caught === applied ? 0 : 1);
