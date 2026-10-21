/* The admin analytics card printed "8 of 11 on the roster are verified" while the records say six
   are verified, one awaits review and one is suspended: the numerator was every provider record and
   the denominator was the roster plus the applicant queue, which is not a roster. Both halves came
   from static arrays, so approving an applicant moved neither number. This puts each half of the fix
   back the way it was, one at a time, and requires the named gate check to fail. The last break is
   not a code change at all — it verifies a verified provider in the seed and requires the positive
   control to fire, because a fraction check on a roster where everybody is verified cannot fail.
     node tools/falsify-verification-progress.cjs                                          */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'Sukinnect-next.html');
const original = fs.readFileSync(TARGET, 'utf8');
const LABEL = 'the verification row counts the verified out of the roster';

/* Single-line needles, and an exact count in front of every one of them: the file is CRLF, so a
   needle carrying \n matches nothing, and `replace` swaps only the FIRST occurrence — a needle that
   matches twice would plant its mutant in the wrong function and still print CAUGHT. That is not
   hypothetical: this very pass put a second `const verified = verifiedProviderList().length;` into
   the file and orphaned a break in falsify-verification-records, which refuses on a count of 2. */
const MUTANTS = [
  { name: 'the numerator goes back to every provider record, suspended and unreviewed included',
    from: '    verifiedCount: verifiedOnRoster, verificationOf: PROVIDERS.length,',
    to: '    verifiedCount: PROVIDERS.length, verificationOf: PROVIDERS.length,' },
  { name: 'the denominator takes the applicant queue back in',
    from: '    verifiedCount: verifiedOnRoster, verificationOf: PROVIDERS.length,',
    to: '    verifiedCount: verifiedOnRoster, verificationOf: PROVIDERS.length + PENDING_APPLICANTS.length,' },
  { name: 'the percentage divides by a population the caption does not show',
    from: '    verification: PROVIDERS.length ? Math.round(verifiedOnRoster / PROVIDERS.length * 100) : null,',
    to: '    verification: PROVIDERS.length ? Math.round(verifiedOnRoster / (PROVIDERS.length + PENDING_APPLICANTS.length) * 100) : null,' },
  { name: 'the note paints the roster length instead of the verified list',
    from: "note: rates.verificationOf ? rates.verifiedCount + ' of ' + rates.verificationOf +",
    to: "note: rates.verificationOf ? PROVIDERS.length + ' of ' + rates.verificationOf +" },
  { name: 'the note stops naming the providers who are not verified',
    label: 'and the row says what the providers who are not verified are',
    from: "                    rates.awaitingReview ? rates.awaitingReview + (rates.awaitingReview === 1 ? ' awaits' : ' await') + ' review' : '',",
    to: "                    ''," },
  { name: 'the seed verifies the provider the check needs suspended',
    label: 'the roster really does hold an unverified provider, so the check above can fail',
    from: 'verification:{"status":"suspended","verifiedAt":"2025-11-08"',
    to: 'verification:{"status":"verified","verifiedAt":"2025-11-08"' },
];

function plant(s, m) {
  const hits = s.split(m.from).length - 1;
  if (hits !== 1) return { bad: hits };
  return { out: s.replace(m.from, m.to) };
}

function gateRun() {
  try {
    return { code: 0, out: execFileSync(process.execPath, [path.join(ROOT, 'tools', 'verify.cjs')],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) };
  } catch (err) {
    return { code: err.status === undefined ? -1 : err.status, out: (err.stdout || '') + (err.stderr || '') };
  }
}

let caught = 0, applied = 0, unmatched = 0;
try {
  for (const m of MUTANTS) {
    const planted = plant(original, m);
    if (planted.bad !== undefined) {
      console.log('SKIP    ' + m.name + '  (needle matched ' + planted.bad + ', expected 1)');
      unmatched++; continue;
    }
    const mutated = planted.out;
    if (mutated === original) { console.log('SKIP    ' + m.name + '  (from and to are equal)'); unmatched++; continue; }
    applied++;
    fs.writeFileSync(TARGET, mutated);
    const run = gateRun();
    const label = m.label || LABEL;
    const failed = run.code !== 0 && run.out.includes('FAIL  ' + label);
    if (failed) { caught++; console.log('CAUGHT  ' + m.name); }
    else console.log('MISSED  ' + m.name + '  (exit ' + run.code + ', named check '
      + (run.code !== 0 ? 'not the one that failed' : 'passed anyway') + ')');
  }
} finally {
  fs.writeFileSync(TARGET, original);
}
console.log('\n' + caught + ' of ' + applied + ' breaks caught, ' + unmatched + ' not applied; file restored.');
process.exit(caught === applied && unmatched === 0 ? 0 : 1);
