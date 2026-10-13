/* The rule "an unknown id never answers with somebody else's record" was applied to
   five screens and enforced at the door by the storage pass, but the shared lookups
   underneath every screen still fell back to a real row: providerOf() → PROVIDERS[0],
   the signed-in lookup → PROVIDERS[0], serviceMeta() → SERVICES[0]. This puts each
   fallback back, one at a time, and requires the named gate check to fail. A mutant
   every check survives means the check is not looking.
     node tools/falsify-identity-fallbacks.cjs                                            */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'Sukinnect-next.html');
const original = fs.readFileSync(TARGET, 'utf8');

/* Single-line needles: the file is CRLF, so a needle carrying \n matches nothing and
   the mutant prints SKIP while looking like a clean run. */
const SEAM = 'a provider record that is gone leaves no identity behind';
const MUTANTS = [
  { name: 'providerOf falls back to the first provider on the roster', label: SEAM,
    apply: s => s.replace(
      'p.id === booking.providerId) || unknownProviderOf(booking);',
      'p.id === booking.providerId) || PROVIDERS[0];') },
  { name: 'the signed-in lookup answers the first provider again', label: SEAM,
    apply: s => s.replace(
      'return PROVIDERS.find(p => p.id === CURRENT_PROVIDER_ID) || null;',
      'return PROVIDERS.find(p => p.id === CURRENT_PROVIDER_ID) || PROVIDERS[0];') },
  { name: 'an unknown trade is drawn as Plumbing', label: SEAM,
    apply: s => s.replace(
      "return { id:null, askedFor:serviceId || null, label:'Service not on this roster',",
      "return { id:SERVICES[0].id, askedFor:serviceId || null, label:SERVICES[0].label,") },
  { name: 'an unknown category borrows the pilot trade’s behaviour', label: SEAM,
    apply: s => s.replace(
      'return Object.assign({}, CATEGORY_DEFAULTS, (svc && svc.behaviour) || {});',
      "return Object.assign({}, CATEGORY_DEFAULTS, (svc && svc.behaviour) || SERVICES.find(s => s.pilot).behaviour);") },
  { name: 'a job with no price on file is accepted at ₱0', label: SEAM,
    apply: s => s.replace(
      'if (provider.unknown && !listing) {', 'if (false && provider.unknown && !listing) {') },
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
    else console.log('MISSED  ' + m.name + '  (exit ' + run.code + ', named check '
      + (run.code !== 0 ? 'not the one that failed' : 'passed anyway') + ')');
  }
} finally {
  fs.writeFileSync(TARGET, original);
}
console.log('\n' + caught + ' of ' + applied + ' mutants caught; file restored.');
process.exit(caught === applied ? 0 : 1);
