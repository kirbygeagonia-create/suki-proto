/* Proves the three register-identity checks can fail, one per ruling.

   The defect (AGENTS §78, CHANGES §78): registration asked for a name and a barangay, validated them
   with "Tell us who to greet" and "Your barangay decides who is nearby", and threw both away — a
   person who registered as Nueva in Buayan was greeted as Ana Dela Cruz, shown Poblacion's providers,
   and would send a request to the demo household's door. The ruling was: use what the form asks for,
   keep the demo address because the form never asked for one, and store nothing so the toast's own
   claim stays true.

   Four breaks, each aimed at one check, and the first two are told apart by which field the failing
   detail names — because both halves live in the same check and a family that only asserts "a check
   went red" cannot say which promise broke:
     A  the typed name is not written        -> 'a register writes the name…' with  name "Ana Dela Cruz"
     B  the typed barangay is not written    -> the same check with  barangay "Poblacion"
     C  the address is blanked (the option the owner did NOT choose)
                                            -> '…keeps the demo household address…'
     D  register persists AFTER the identity is written
                                            -> '…stores the versioned acceptance and nothing else…'

   D moved on 2026-10-25, and the reason is worth keeping: it used to break a rule that said a register
   writes no bytes at all, and that rule became false the moment the acceptance became a record. The
   hazard it guards is the same one, one level deeper — the check now reads the CONTENT of the dump it
   was handed, so a write that stores the versioned acceptance is green and a write that also stores the
   typed identity is red. A check that only asked "did bytes appear" would have gone quiet on exactly
   this change, which is the difference between measuring a write and measuring what was written.

     node tools/falsify-register-identity.cjs    ~4 minutes                                      */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const APP = path.join(ROOT, 'Sukinnect-next.html');
const GATE = path.join(ROOT, 'tools', 'verify.cjs');
const PRISTINE = fs.readFileSync(APP, 'utf8');

const NAME_LINE = '      if (typedName) profile.name = typedName;';
const BRGY_LINE = '        profile.barangay = typedBarangay;';
const PROFILE_LINE = '      const profile = state.role === \'provider\' ? state.providerProfileData : state.profileData;';
const CHECK_IDENTITY = 'a register writes the name and barangay the form collected';
const CHECK_ADDRESS = 'a register keeps the demo household address';
const CHECK_STORAGE = 'an accepted register stores the versioned acceptance and nothing else about the account';

/* The app file is CRLF; a needle written with \n matches nothing and the run reports a clean gate for
   a mutation that never landed. */
function crlf(s) { return s.replace(/\n/g, '\r\n'); }
if (PRISTINE.indexOf(crlf(NAME_LINE)) < 0 || PRISTINE.indexOf(crlf(BRGY_LINE)) < 0
  || PRISTINE.indexOf(crlf(PROFILE_LINE)) < 0) {
  throw new Error('pre-flight: a register needle is not in the file — the fix or this family moved');
}

function runGate() {
  let out = '';
  try { out = execFileSync(process.execPath, [GATE], { encoding: 'utf8', cwd: ROOT, maxBuffer: 64 * 1024 * 1024, timeout: 420000 }); }
  catch (err) { out = (err.stdout || '') + (err.stderr || ''); }
  return out;
}
function failures(out) {
  return out.split(/\r?\n/).filter(l => /^FAIL\b/.test(l)).map(l => l.replace(/^FAIL\s+/, ''));
}
function died(out, label, also) {
  return failures(out).some(f => f.indexOf(label) === 0 && (!also || f.indexOf(also) > -1));
}

const BREAKS = [
  { name: 'the typed name is dropped on the floor again',
    from: NAME_LINE, to: '      if (typedName) profile.name = profile.name;',
    expect: CHECK_IDENTITY, detail: 'name "Ana Dela Cruz"' },
  { name: 'the typed barangay is dropped on the floor again',
    from: BRGY_LINE, to: '        profile.barangay = profile.barangay;',
    expect: CHECK_IDENTITY, detail: 'barangay "Poblacion"' },
  { name: 'the address is blanked, which is the option the owner did not choose',
    from: NAME_LINE,
    to: NAME_LINE + '\n      profile.address = \'\';\n      profile.savedAddresses = [];',
    expect: CHECK_ADDRESS, detail: null },
  { name: 'register persists AFTER writing the typed identity, so the account reaches storage the toast denies',
    from: BRGY_LINE, to: BRGY_LINE + '\n      persist();',
    expect: CHECK_STORAGE, detail: null },
];

let applied = 0, caught = 0, missed = 0, notPlanted = 0;
try {
  const base = runGate();
  const baseFails = failures(base);
  const total = (/all (\d+) checks passed/.exec(base) || [, ''])[1];
  console.log('control  unmutated gate: ' + (total ? total + ' checks passed' : 'no clean total')
    + (baseFails.length ? ' — already FAILING: ' + baseFails.join(' / ').slice(0, 80) : ''));
  if (baseFails.length) { console.log('ABORT — a check that is already red proves nothing. NO CONCLUSION.'); process.exitCode = 1; }
  else {
    for (const b of BREAKS) {
      const src = fs.readFileSync(APP, 'utf8');
      const n = src.split(crlf(b.from)).length - 1;
      if (n !== 1) { notPlanted++; console.log('NOT PLANTED  ' + b.name + '  (anchor matched ' + n + ')'); continue; }
      const next = src.replace(crlf(b.from), crlf(b.to));
      if (next === src) { notPlanted++; console.log('NOT PLANTED  ' + b.name + '  (mutant equals source)'); continue; }
      fs.writeFileSync(APP, next);
      if (fs.readFileSync(APP, 'utf8') !== next) { notPlanted++; console.log('NOT PLANTED  ' + b.name + '  (write did not land)'); continue; }
      applied++;
      const out = runGate();
      if (died(out, b.expect, b.detail)) {
        caught++;
        console.log('CAUGHT   ' + b.name + '\n         -> ' + failures(out).find(f => f.indexOf(b.expect) === 0).slice(0, 96));
      } else {
        missed++;
        console.log('MISSED   ' + b.name + '  (wanted a red "' + b.expect + '"'
          + (b.detail ? ' naming ' + b.detail : '') + '; FAILs: ' + (failures(out).join(' / ') || 'none').slice(0, 70) + ')');
      }
      fs.writeFileSync(APP, PRISTINE);
    }
    console.log('─'.repeat(78));
    console.log(caught + ' of ' + applied + ' breaks caught, ' + notPlanted + ' not applied, ' + missed + ' missed');
    process.exitCode = (caught === applied && applied === BREAKS.length && notPlanted === 0) ? 0 : 1;
  }
} finally {
  fs.writeFileSync(APP, PRISTINE);
  const back = fs.readFileSync(APP, 'utf8') === PRISTINE;
  console.log('cleanup  app restored: ' + back);
  if (!back) process.exitCode = 1;
}
