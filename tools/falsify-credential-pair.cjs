/* The credential summary and the documents behind it have to name the same set, and the probe that
   checks it was reading only one of the two shapes the summary uses: `2 of 4 expiring soon` was
   compared, `All 3 valid` was skipped in silence, so four of eight providers were never checked at
   all while the run printed clean. This breaks each branch of the widened comparison and requires
   the probe to say so — because a check that cannot fail, and a check that never ran, look
   identical in a log of passing lines.

   Note the needles. `const creds = credentialsOf(providerId);` appears twice in the file, so a
   first-match replace edits the wrong function and the probe correctly reports nothing; and the app
   file is CRLF, so a needle cannot be disambiguated with a newline. Both traps are documented in
   the falsifier headers for exactly this reason.

     node tools/falsify-credential-pair.cjs                                      */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'Sukinnect-next.html');
const original = fs.readFileSync(TARGET, 'utf8');

const CASES = [
  { name: 'the all-valid summary counts one document too many',
    needle: "return { label: 'All ' + creds.length + ' valid', tone: 'var(--success-ink)' };",
    into: "return { label: 'All ' + (creds.length + 1) + ' valid', tone: 'var(--success-ink)' };",
    expect: 'summary counts a different set than the rows' },
  { name: 'the expiring summary counts a set larger than the rows',
    needle: "return { label: flagged + ' of ' + creds.length + ' expiring soon', tone: 'var(--warning-ink)' };",
    into: "return { label: flagged + ' of ' + (creds.length + 1) + ' expiring soon', tone: 'var(--warning-ink)' };",
    expect: 'summary counts a different set than the rows' },
  { name: 'the summary stops naming a count the probe can read',
    needle: "return { label: flagged + ' of ' + creds.length + ' needs renewal', tone: 'var(--error-ink)' };",
    into: "return { label: flagged + ' document(s) need renewal', tone: 'var(--error-ink)' };",
    expect: 'names no count the probe can read' },
];

function probeRun() {
  try {
    return { code: 0, out: execFileSync(process.execPath, [path.join(ROOT, 'tools', 'probe-count-pairs.cjs')],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) };
  } catch (err) {
    return { code: err.status === undefined ? -1 : err.status, out: (err.stdout || '') + (err.stderr || '') };
  }
}

let caught = 0, applied = 0, skipped = 0;
try {
  for (const m of CASES) {
    const hits = original.split(m.needle).length - 1;
    if (hits !== 1) {
      skipped++;
      console.log('SKIP    ' + m.name + '  (needle matched ' + hits + ' times; one match is required)');
      continue;
    }
    applied++;
    fs.writeFileSync(TARGET, original.replace(m.needle, m.into));
    const run = probeRun();
    if (run.out.includes(m.expect)) { caught++; console.log('CAUGHT  ' + m.name); }
    else console.log('MISSED  ' + m.name + ' — the probe printed no DIFF for it');
    fs.writeFileSync(TARGET, original);
  }
} finally {
  fs.writeFileSync(TARGET, original);
}
console.log('\nmutants applied ' + applied + ', caught ' + caught + ', not applied ' + skipped);
process.exit(caught === applied && applied > 0 ? 0 : 1);
