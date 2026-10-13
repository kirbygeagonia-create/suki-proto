/* Proves the check added with the last three id-substitution fixes actually watches
   them: it puts each fallback back, one at a time, and requires the named verdict to
   fail. A mutant every check survives means the check is not looking.
     node tools/falsify-id-substitutions.cjs                                            */
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
  { name: 'the resident booking detail falls back to the first job',
    apply: s => s.replace(
      '  const b = bookingsForResident().find(item => item.id === state.selectedBookingId);',
      '  const b = bookingsForResident().find(item => item.id === state.selectedBookingId) || bookingsForResident()[0];') },
  { name: 'the review falls back to the first applicant',
    apply: s => s.replace(
      '  return PENDING_APPLICANTS.find(a => a.id === state.selectedVerificationId) || null;',
      '  return PENDING_APPLICANTS.find(a => a.id === state.selectedVerificationId) || PENDING_APPLICANTS[0];') },
  { name: 'the public profile falls back to provider index 2',
    apply: s => s.replace(
      '  const p = PROVIDERS.find(x => x.id === providerId);',
      '  const p = PROVIDERS.find(x => x.id === providerId) || PROVIDERS[2];') },
  { name: 'the review screen stops saying it found nothing',
    apply: s => s.replace("'No application is open', 'The queue has no applicant",
                          "'(nothing)', 'The queue has no applicant") },
];

const LABEL = 'the last three screens refuse somebody else’s record';

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
