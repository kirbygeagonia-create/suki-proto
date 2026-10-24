/* Proves that the seed-date checks can fail, which is the only thing that makes them checks.

   The pass this family guards replaced 24 typed calendar dates in the seeds with day offsets
   (AGENTS §75): twelve `submittedAt` literals behind a verification queue whose "waiting 10 days"
   grew by one every day forever, and twelve `CREDENTIALS.expiresAt` literals, one of which sat on
   today's date so a document went Valid -> Expiring -> Expired with no record changing. The painted
   states were diffed through the camera before and after and came back identical, so the fix is
   behaviour-preserving; the three gate checks are what stop it being undone by typing a date.

   Four breaks, and each has to name the check it kills:
     A  type a calendar date back into a credential row   -> the no-typed-dates check
     B  build the day with the wrong month field          -> the local-calendar-day check
     C  change one applicant's offset by a day           -> the seeded-states check
     D  make the check's own "good pattern" match nothing -> the no-typed-dates check, by its
                                                          positive control alone
   D is the one worth reading twice. `typedDays.length === 0` is true in a file where nobody ever
   wrote a date and true in a file where the scan broke; only `relativeDays >= 20` tells them apart,
   and this repository has been fooled by a vacuous scan before. The baseline therefore has to show
   the mixed pair — the always-fine file passing and the empty-population file refused — before any
   mutant is believed.

   Breaks A-C mutate the application file and D mutates the gate. Both are restored from in-memory
   copies in a `finally`, and the family asserts that each mutation actually landed before it trusts
   the verdict it produced. This family owns both files: run it alone, never beside another mutant pass.

     node tools/falsify-seed-dates.cjs    ~4 minutes            */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const APP = path.join(ROOT, 'Sukinnect-next.html');
const GATE = path.join(ROOT, 'tools', 'verify.cjs');
const APP_PRISTINE = fs.readFileSync(APP, 'utf8');
const GATE_PRISTINE = fs.readFileSync(GATE, 'utf8');

const CHECK_TYPED = 'a seed row declares an offset from today, never a typed calendar date';
const CHECK_FRAME = 'the day helper answers the local calendar day';
const CHECK_STATE = 'the seeded day offsets still produce the states this build was measured with';

/* Needles the family refuses to run without: a mutated app file or a renamed helper would otherwise
   produce a clean run that means nothing. */
[
  ['expiresAt:isoDayAhead(13)', 1],
  ["String(d.getMonth() + 1).padStart(2, '0')", 1],
  ["barangay:'Poblacion', submittedAt:isoDayAgo(10)", 1],
  ['const relativeDays = (body.match(/isoDay(?:Ago|Ahead)\\(/g) || []).length;', 1],
].forEach(([needle, want]) => {
  const where = needle === 'const relativeDays = (body.match(/isoDay(?:Ago|Ahead)\\(/g) || []).length;' ? GATE : APP;
  const n = fs.readFileSync(where, 'utf8').split(needle).length - 1;
  if (n !== want) throw new Error('pre-flight: ' + JSON.stringify(needle).slice(0, 60) + ' matched ' + n + ', expected ' + want);
});

function runGate() {
  let out = '';
  try { out = execFileSync(process.execPath, [GATE], { encoding: 'utf8', cwd: ROOT, maxBuffer: 64 * 1024 * 1024, timeout: 420000 }); }
  catch (err) { out = (err.stdout || '') + (err.stderr || ''); }
  return out;
}
function failedLabels(out) {
  return out.split(/\r?\n/).filter(l => /^FAIL\b/.test(l)).map(l => l.replace(/^FAIL\s+/, '').slice(0, 120));
}
function died(out, label) { return failedLabels(out).some(l => l.indexOf(label) === 0); }

const BREAKS = [
  { name: 'a typed calendar date goes back into a credential row',
    file: 'app', from: 'expiresAt:isoDayAhead(13)', to: "expiresAt:'2026-11-02'", expect: CHECK_TYPED },
  { name: 'the day builder answers the month below the one it was given',
    file: 'app', from: "String(d.getMonth() + 1).padStart(2, '0')", to: "String(d.getMonth()).padStart(2, '0')",
    expect: CHECK_FRAME },
  { name: "one applicant's offset moves by a day, so the queue's counts are no longer the measured ones",
    file: 'app', from: "barangay:'Poblacion', submittedAt:isoDayAgo(10)",
    to: "barangay:'Poblacion', submittedAt:isoDayAgo(9)", expect: CHECK_STATE },
  { name: "the check's own good pattern is renamed to something that cannot match, so its scan is vacuous",
    file: 'gate', from: 'const relativeDays = (body.match(/isoDay(?:Ago|Ahead)\\(/g) || []).length;',
    to: 'const relativeDays = (body.match(/isoDayZ(?:Ago|Ahead)\\(/g) || []).length;', expect: CHECK_TYPED },
];

function writeMutant(which, from, to) {
  const p = which === 'app' ? APP : GATE;
  const pristine = which === 'app' ? APP_PRISTINE : GATE_PRISTINE;
  const n = pristine.split(from).length - 1;
  if (n !== 1) return { ok: false, why: 'anchor matched ' + n + ' times in ' + path.basename(p) };
  const next = pristine.replace(from, to);
  if (next === pristine) return { ok: false, why: 'the mutant is byte-identical to the source' };
  fs.writeFileSync(p, next);
  /* Read it back: a mutation that did not survive the write is the failure mode this repository has
     been bitten by twice, where a "mutant" run was the unmutated engine passing its own guard. */
  if (fs.readFileSync(p, 'utf8') !== next) return { ok: false, why: 'the write did not land' };
  return { ok: true };
}
function restore() {
  fs.writeFileSync(APP, APP_PRISTINE);
  fs.writeFileSync(GATE, GATE_PRISTINE);
}

let applied = 0, caught = 0, missed = 0, notPlanted = 0;
try {
  const base = runGate();
  const baseFails = failedLabels(base);
  console.log('control  the unmutated gate: ' + (/\d+ checks passed/.exec(base) || [''])[0]
    + (baseFails.length ? ' — FAILING: ' + baseFails.join(' / ') : ''));
  if (baseFails.length) {
    console.log('ABORT — a check that already fails cannot be used to prove anything. NO CONCLUSION.');
    process.exitCode = 1;
  } else {
    for (const b of BREAKS) {
      const p = writeMutant(b.file, b.from, b.to);
      if (!p.ok) { notPlanted++; console.log('NOT PLANTED  ' + b.name + '  (' + p.why + ')'); continue; }
      applied++;
      const out = runGate();
      if (died(out, b.expect)) {
        caught++;
        console.log('CAUGHT   ' + b.name + '\n         -> ' + failedLabels(out).find(l => l.indexOf(b.expect) === 0).slice(0, 96));
      } else {
        missed++;
        console.log('MISSED   ' + b.name + '  (the named check stayed green; FAILs were: '
          + (failedLabels(out).join(' / ') || 'none — the suite crashed?').slice(0, 90) + ')');
      }
      restore();
    }
    console.log('─'.repeat(78));
    console.log(caught + ' of ' + applied + ' breaks caught, ' + notPlanted + ' not applied, ' + missed + ' missed');
    process.exitCode = (caught === applied && applied === BREAKS.length && notPlanted === 0) ? 0 : 1;
  }
} finally {
  restore();
  const back = fs.readFileSync(APP, 'utf8') === APP_PRISTINE && fs.readFileSync(GATE, 'utf8') === GATE_PRISTINE;
  console.log('cleanup  both files restored: ' + back);
  if (!back) process.exitCode = 1;
}
