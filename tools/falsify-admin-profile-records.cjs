/* Proves the administrator's provider profile check watches each thing it claims:
   five mutants, each expected to fail one named reason.
     node tools/falsify-admin-profile-records.cjs                                       */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'Sukinnect-next.html');
const original = fs.readFileSync(TARGET, 'utf8');

/* Single-line needles: the file is CRLF. */
const MUTANTS = [
  { name: 'the audit list ignores which provider it was asked about',
    label: 'a provider with no event on file was shown another provider’s',
    apply: s => s.replace('    return b && b.providerId === provider.id;', '    return b && true;') },
  { name: 'the audit list refuses to show events that exist',
    label: 'the audit card shows no event though the record has one',
    apply: s => s.replace("  if (!events.length) return 'No job has moved", "  if (true) return 'No job has moved") },
  { name: 'every document is painted Valid',
    label: 'an expired document is not shown as expired',
    apply: s => s.replace("+ esc(st.label) + ', '", "+ 'Valid' + ', '") },
  { name: 'a Government ID line comes back',
    label: 'the card still types',
    apply: s => s.replace('  const rows = credentialsOf(provider.id);',
      "  const rows = credentialsOf(provider.id).concat([{id:'crx', name:'Government ID', issuer:'NBI', kind:'identity', expiresAt:null}]);") },
  { name: 'a typed reminder line comes back',
    label: 'the card still types',
    apply: s => s.replace("  if (!events.length) return 'No job has moved",
      "  if (!events.length) return 'Credential reminder sent. No job has moved") },
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
    const failed = run.code !== 0
      && run.out.includes('FAIL  the administrator’s provider profile reads records, not prose');
    if (failed) { caught++; console.log('CAUGHT  ' + m.name); }
    else console.log('MISSED  ' + m.name + '  (exit ' + run.code + '; wanted a FAIL naming "' + m.label + '")');
  }
} finally {
  fs.writeFileSync(TARGET, original);
}
console.log('\n' + caught + ' of ' + applied + ' mutants caught; file restored.');
process.exit(caught === applied ? 0 : 1);
