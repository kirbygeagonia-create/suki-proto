/* Proves the guard that a profile save records only a change that actually happened.

   Why a camera family: the rule is about what a SECOND tap does, and nothing in the Node harness
   ever taps twice. tools/probe-double-tap.js fills a form the way a person fills one, taps Save,
   taps it again, and counts what each tap wrote to every record array and every array inside `state`.
   It found the admin's save appending "Admin profile updated" to the Audit Log on both taps — and on
   a first tap of an untouched form, which is the same defect with one fewer tap.

   Break one puts that unconditional log back; the camera must see the second tap write again. Break
   two removes the honest dialog branch; the camera cannot see that one, because saving an unchanged
   form writes no record either way — the claim is the only thing that moves — so it is proven by the
   gate and says so on its own line rather than pretending to a test it does not have.

     node tools/falsify-double-tap.cjs    ~3 minutes, needs the machine's Chrome             */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'Sukinnect-next.html');
const original = fs.readFileSync(TARGET, 'utf8');
const LABEL = 'a profile save records or claims only a change that actually happened';
const SCREENS = 'admin-edit-form,resident-edit-form';
const ADMIN_GUARD = '  if (changed.length) {';
const RESIDENT_CLAIM = "state.residentProfileModal = changed.length ? 'saved' : 'unchanged';";

function gateRun() {
  try {
    return { code: 0, fails: [], out: execFileSync(process.execPath,
      [path.join(ROOT, 'tools', 'verify.cjs')], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) };
  } catch (err) {
    const out = (err.stdout || '') + (err.stderr || '');
    return { code: err.status === undefined ? -1 : err.status,
      fails: (out.match(/^FAIL  .*/gm) || []).map(l => l.slice(6).split('   ')[0]), out };
  }
}

function duplicates() {
  let out = '';
  try {
    out = execFileSync(process.execPath,
      [path.join(ROOT, 'tools', 'shot.cjs'), '--probe=@tools/probe-double-tap.js',
        '--only=' + SCREENS], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (err) { out = (err.stdout || '') + (err.stderr || ''); }
  if (out.indexOf('probe →') === -1) return null;
  return [...new Set((out.match(/SECOND TAP WRITES AGAIN[^\\"]*/) || [])
    .map(s => s.replace(/\s+/g, ' ').slice(0, 62)))];
}

const BREAKS = [
  { name: 'the audit row goes back to being written whatever the form did',
    edits: [[ADMIN_GUARD, '  if (true) {']], camera: true },
  { name: 'the dialog stops saying nothing changed and promises a save again',
    edits: [[RESIDENT_CLAIM, 'state.residentProfileModal = \'saved\';']], camera: false },
];

let caught = 0, applied = 0, unmatched = 0;
try {
  const base = gateRun();
  if (base.code !== 0 || !base.out.includes('PASS  ' + LABEL)) {
    console.log('BASELINE gate does not pass on the named check — nothing below means anything.');
    process.exit(1);
  }
  const baseDup = duplicates();
  if (baseDup === null) {
    console.log('BASELINE probe printed no answer, so it cannot certify a clean run.');
    process.exit(1);
  }
  if (baseDup.length) {
    console.log('BASELINE probe already reports ' + baseDup.join(' | ') + ' — the guard is not holding.');
    process.exit(1);
  }
  console.log('baseline: named check passes and no control duplicates a record on ' + SCREENS);

  for (const b of BREAKS) {
    let mutated = original, bad = null;
    for (const [from, to] of b.edits) {
      const hits = mutated.split(from).length - 1;
      if (hits !== 1) { bad = hits; break; }
      mutated = mutated.replace(from, to);
    }
    if (bad !== null) {
      unmatched++;
      console.log('SKIP  ' + b.name + '  (a needle matched ' + bad + ' times, needs exactly 1)');
      continue;
    }
    applied++;
    fs.writeFileSync(TARGET, mutated);
    const run = gateRun();
    const named = run.fails.includes(LABEL);
    const d = b.camera ? duplicates() : null;
    const cameraFailed = !b.camera || (d !== null && d.length > 0);
    const detail = (named ? 'named check failed' : 'GATE STILL PASSED') +
      (b.camera ? '; probe ' + (d === null ? 'silent' : (d.length ? 'reports ' + d.join(' | ') : 'saw nothing')) : '; gate only');
    if (named && cameraFailed) { caught++; console.log('CAUGHT  ' + b.name + '  — ' + detail); }
    else console.log('MISSED  ' + b.name + '  — ' + detail);
  }
} finally {
  fs.writeFileSync(TARGET, original);
}
console.log('\n' + caught + ' of ' + applied + ' breaks caught, ' + unmatched + ' not applied; file restored.');
process.exit(applied > 0 && caught === applied && unmatched === 0 ? 0 : 1);
