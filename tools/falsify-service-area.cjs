/* Proves the service-area and availability checks watch the four ways they could be
   wrong. Each mutant names the check that must fail.
     node tools/falsify-service-area.cjs                                                */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'Sukinnect-next.html');
const original = fs.readFileSync(TARGET, 'utf8');

/* Single-line needles: the file is CRLF. */
const MUTANTS = [
  { name: 'discovery goes back to matching where a provider lives',
    label: 'a provider is found where they declared they serve, not only where they live',
    apply: s => s.replace('    (!f.barangay || providerServes(p, f.barangay)) &&',
                         '    (!f.barangay || p.barangay === f.barangay) &&') },
  { name: 'the busy flag stops hiding the provider',
    label: 'marking yourself busy changes what a resident is shown',
    apply: s => s.replace('  return p.acceptingRequests !== false;', '  return true;') },
  { name: 'marking busy never reaches the record',
    label: 'marking yourself busy changes what a resident is shown',
    apply: s => s.replace('  if (me) me.acceptingRequests = false;', '  if (me) me.acceptingRequests = true;') },
  { name: 'the coverage list goes back to three typed barangays',
    label: 'the coverage list is the record’s and says so when there is none',
    apply: s => s.replace('  const list = (p && p.servesBarangays) || [];',
                          "  const list = ['Poblacion', 'San Isidro', 'Barangay 2'];") },
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
    else console.log('MISSED  ' + m.name + '  (exit ' + run.code + '; wanted FAIL on "' + m.label + '")');
  }
} finally {
  fs.writeFileSync(TARGET, original);
}
console.log('\n' + caught + ' of ' + applied + ' mutants caught; file restored.');
process.exit(caught === applied ? 0 : 1);
