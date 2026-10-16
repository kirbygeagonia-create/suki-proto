/* Proves the two checks added with the empty-queue fix watch the rule they claim to. The defect
   was found by emptying every record set the app renders from and reading what words are left
   (tools/probe-empty-states.js): the verification queue lost its rows and said nothing, while
   still advising the admin to prioritise applications that no longer exist. Approving all three
   applicants reaches the same state by tapping, which is what the screen is for.
     node tools/falsify-empty-queue.cjs                                                   */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'Sukinnect-next.html');
const original = fs.readFileSync(TARGET, 'utf8');

const GUARD_OPEN = "${pendingDetails.length ? `<div style=\"background:var(--deep-100);";
const EMPTY_BRANCH = ": emptyState('shield', 'No applications are waiting', 'Every provider who applied has been decided. A new one appears here the moment it arrives.')}";

/* Single-line needles: the file is CRLF, so a needle carrying \n never matches and the mutant
   reports itself as SKIP while looking like a pass. */
const MUTANTS = [
  { name: 'the empty branch renders nothing, which is how the queue shipped',
    needle: EMPTY_BRANCH, to: `: ''}`,
    label: 'an emptied verification queue explains itself and stops giving advice' },
  { name: 'the advice is unconditional again',
    needle: GUARD_OPEN, to: "${true ? `<div style=\"background:var(--deep-100);",
    label: 'an emptied verification queue explains itself and stops giving advice' },
  { name: 'the empty state replaces the queue whatever its size',
    needle: GUARD_OPEN, to: "${false ? `<div style=\"background:var(--deep-100);",
    label: 'and a queue that does have applicants shows them, not the empty state' },
];

function gateOutput() {
  try {
    return { code: 0, out: execFileSync(process.execPath, [path.join(ROOT, 'tools', 'verify.cjs')],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) };
  } catch (err) {
    return { code: err.status === undefined ? -1 : err.status,
      out: (err.stdout || '') + (err.stderr || '') };
  }
}

let caught = 0, applied = 0, unmatched = 0;
try {
  for (const m of MUTANTS) {
    const hits = original.split(m.needle).length - 1;
    if (hits !== 1) {
      unmatched++;
      console.log('SKIP  ' + m.name + '  (needle matched ' + hits + ' times, needs exactly 1)');
      continue;
    }
    applied++;
    fs.writeFileSync(TARGET, original.replace(m.needle, m.to));
    const run = gateOutput();
    const failed = run.code !== 0 && run.out.includes('FAIL  ' + m.label);
    if (failed) { caught++; console.log('CAUGHT  ' + m.name); }
    else console.log('MISSED  ' + m.name + '  (exit ' + run.code + ')');
  }
} finally {
  fs.writeFileSync(TARGET, original);
}
console.log('\n' + caught + ' of ' + applied + ' mutants caught, '
  + unmatched + ' not applied; file restored.');
process.exit(applied > 0 && caught === applied && unmatched === 0 ? 0 : 1);
