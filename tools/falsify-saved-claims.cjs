/* Nine user actions told their reader the change was saved, and wrote nothing to storage;
   the audit log stamped every row with one typed date; and the identity restore ran after
   the stored profile was merged in, so a provider's saved edits came back as the demo seed.
   This puts each of those back, one at a time, and requires the named gate check to fail.
   A mutant every check survives means the check is not looking.
     node tools/falsify-saved-claims.cjs                                                      */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'Sukinnect-next.html');
const original = fs.readFileSync(TARGET, 'utf8');

const RELOAD = 'what the app says it saved survives a reload';
const STAMP = 'the audit log stamps each row with the moment it happened';
const IDENTITY = 'a saved provider profile is not overwritten by the seed on reload';

/* Single-line needles — the file is CRLF, so a needle carrying \n matches nothing and the
   mutant prints SKIP while looking like a clean run. */
const MUTANTS = [
  { name: 'the audit row is stamped with a fixed instant again', label: STAMP,
    /* Anchored on the push, not on `at: Date.now(),` — that string appears twice in the
       file, and an unanchored replace mutated the verification stamp instead. The run
       still failed a check, just not the one this mutant is meant to prove. */
    apply: s => s.replace('state.adminAuditLog.push({ at: Date.now(),',
      'state.adminAuditLog.push({ at: 1757464800000,') },
  { name: 'the audit log is not written to storage', label: RELOAD,
    apply: s => s.replace('adminAuditLog: state.adminAuditLog,', '') },
  { name: 'household items are not written to storage', label: RELOAD,
    apply: s => s.replace('residentHouseholdItems: state.residentHouseholdItems,', '') },
  { name: 'portfolio entries are not written to storage', label: RELOAD,
    apply: s => s.replace('providerPortfolio: state.providerPortfolio,', '') },
  { name: 'notification preferences are not written to storage', label: RELOAD,
    apply: s => s.replace('providerNotifications: state.providerNotifications,', '') },
  { name: 'administrator notes are not written to storage', label: RELOAD,
    apply: s => s.replace('adminProviderNotes: state.adminProviderNotes,', '') },
  { name: 'administrator alert preferences are not written to storage', label: RELOAD,
    apply: s => s.replace('adminNotifications: state.adminNotifications,', '') },
  { name: 'messages are not restored on load', label: RELOAD,
    apply: s => s.replace('if (snap.messages) replaceContents(MESSAGES, snap.messages);', '') },
  { name: 'the portfolio Save button stores nothing again', label: RELOAD,
    apply: s => s.replace('state.providerPortfolio.push({ service: s, description: d });', '') },
  { name: 'the identity is applied after the stored profile, as it used to be', label: IDENTITY,
    apply: s => s.replace('if (snap.providerSettings && snap.providerSettings.identity) {',
      'if (false && snap.providerSettings && snap.providerSettings.identity) {') },
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
/* Every needle must match exactly once. `String.replace` with a string pattern edits the
   FIRST occurrence, so a needle that appears twice silently mutates somewhere else and
   the run reports a MISS against a check that was never touched. */
const NEEDLES = {
  'the audit row is stamped with a fixed instant again': 'state.adminAuditLog.push({ at: Date.now(),',
  'the audit log is not written to storage': 'adminAuditLog: state.adminAuditLog,',
  'household items are not written to storage': 'residentHouseholdItems: state.residentHouseholdItems,',
  'portfolio entries are not written to storage': 'providerPortfolio: state.providerPortfolio,',
  'notification preferences are not written to storage': 'providerNotifications: state.providerNotifications,',
  'administrator notes are not written to storage': 'adminProviderNotes: state.adminProviderNotes,',
  'administrator alert preferences are not written to storage': 'adminNotifications: state.adminNotifications,',
  'messages are not restored on load': 'if (snap.messages) replaceContents(MESSAGES, snap.messages);',
  'the portfolio Save button stores nothing again': 'state.providerPortfolio.push({ service: s, description: d });',
  'the identity is applied after the stored profile, as it used to be':
    'if (snap.providerSettings && snap.providerSettings.identity) {'
};
for (const [name, needle] of Object.entries(NEEDLES)) {
  const hits = original.split(needle).length - 1;
  if (hits !== 1) {
    console.error('NEEDLE NOT UNIQUE for "' + name + '": ' + hits + ' matches. Refusing to run.');
    process.exit(2);
  }
}
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
