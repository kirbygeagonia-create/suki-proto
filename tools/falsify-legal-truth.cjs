/* Proves the `legal` suite and the register-storage checks can each fail.

   The documents are drafts, and the checks are not about prose quality — they are about the four
   ways a legal surface in a prototype goes wrong: a pre-ticked box, consent bundled into agreement,
   an invented fact dressed as a placeholder-free statement, and an acceptance that is announced but
   never recorded. Each break restores one of those.

   Break 7 is the ordering the register path now depends on: the acceptance is persisted BEFORE the
   typed name is applied to the profile, so the bytes this action leaves hold a versioned acceptance
   and the demo household's own profile. Reversing it is invisible on screen and turns "the account
   itself is not stored" into a lie on the next reload, which is why it is pinned as a shape.

     node tools/falsify-legal-truth.cjs    ~7 minutes                                             */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'Sukinnect-next.html');
const original = fs.readFileSync(TARGET, 'utf8');

const BREAKS = [
  { name: 'the Terms box comes pre-ticked',
    check: 'the Terms box is painted, is not pre-ticked, and the document links are on the same screen',
    from: '<input type="checkbox" id="reg-terms"',
    to: '<input type="checkbox" id="reg-terms" checked' },
  { name: 'sign-in is held up by a re-acceptance the app has no reason to ask for',
    check: 'signing in is never held up by a re-acceptance the app has no reason to ask for',
    from: '  if (isRegister && !(termsBox && termsBox.checked)) {',
    to: '  if (!(termsBox && termsBox.checked)) {' },
  { name: 'the optional consent is recorded whether or not it was given',
    check: 'the optional marketing consent is not bundled into the Terms acceptance',
    from: '      if (marketing && marketing.checked) {',
    to: '      if (marketing || marketing) {' },
  { name: 'a placeholder stops saying it is undecided',
    check: 'every unknown business fact is a bracket marked as undecided, and nothing is bracketed by accident',
    from: 'no appeal queue yet — [appeal route — NOT DECIDED]',
    to: 'no appeal queue yet — [appeal route]' },
  { name: 'a complaint address is invented for a company that has not registered one',
    check: 'no document invents a contact address, an officer, or a registration that has not happened',
    from: '[complaint email — NOT DECIDED] · [registered address — NOT DECIDED]',
    to: 'complaints@sukinnect.ph · [registered address — NOT DECIDED]' },
  { name: 'the draft banner is replaced by a claim of approval',
    check: 'each document opens with the draft banner, so the status is visible before the text',
    from: '<b>Draft — not reviewed by Philippine counsel.</b>',
    to: '<b>Reviewed and approved for launch.</b>' },
  { name: 'an unknown document id arms a destination with no record behind it',
    check: 'an unknown document id arms nothing',
    from: "  if (!d) { showToast('No document carries that id'); return; }",
    to: "  if (!d) { showToast('No document carries that id'); }" },
  { name: 'the acceptance is announced but never written, so no one can point at it afterwards',
    check: 'an accepted register stores the versioned acceptance and nothing else about the account',
    from: '      state.termsAcceptances = mine;',
    to: '      state.termsAcceptances = [];' },
];

function gateOutput() {
  let out = '';
  try {
    out = execFileSync(process.execPath, [path.join(ROOT, 'tools', 'verify.cjs')],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (err) { out = (err.stdout || '') + (err.stderr || ''); }
  return out;
}
function readCheck(out, watch) {
  const line = out.split(/\r?\n/).find(l => l.indexOf(watch) >= 0);
  if (!line) return { seen: false, failed: false, why: 'the check vanished from the output' };
  const t = line.trim();
  return { seen: true, failed: t.indexOf('FAIL') === 0, why: t.slice(0, 170) };
}

let caught = 0, applied = 0, unmatched = 0;
const base = gateOutput();
for (const b of BREAKS) {
  const r = readCheck(base, b.check);
  if (!r.seen) { console.log('BROKEN  no gate check named "' + b.check + '"'); process.exit(1); }
  if (r.failed) { console.log('BROKEN  already red on "' + b.check + '": ' + r.why); process.exit(1); }
}
console.log('baseline: all ' + BREAKS.length + ' named checks pass on the file as it stands');

try {
  for (const b of BREAKS) {
    const hits = original.split(b.from).length - 1;
    if (hits !== 1) {
      unmatched++;
      console.log('SKIP  ' + b.name + '  (its anchor matched ' + hits + ' times, needs exactly 1)');
      continue;
    }
    applied++;
    fs.writeFileSync(TARGET, original.replace(b.from, b.to));
    const r = readCheck(gateOutput(), b.check);
    if (!r.seen) console.log('MISSED  ' + b.name + '  (' + r.why + ')');
    else if (r.failed) { caught++; console.log('CAUGHT  ' + b.name + '  → ' + r.why); }
    else console.log('MISSED  ' + b.name + '  (the named check still passes, so it is not reading what this breaks)');
  }
} finally {
  fs.writeFileSync(TARGET, original);
}
console.log('\n' + caught + ' of ' + applied + ' breaks caught, ' + unmatched + ' not applied; file restored.');
process.exit(applied > 0 && caught === applied && unmatched === 0 ? 0 : 1);
