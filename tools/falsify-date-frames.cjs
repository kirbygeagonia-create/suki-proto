/* Proves the five checks in the `dates` suite watch the rule they claim to. The defect they
   exist for was measured, not guessed: the verification queue's "waiting N days" rounded an
   elapsed interval, so the same application read 6 days in the morning and 7 days after noon.
   One candidate mutant was written, tested, and deleted — counting the interval with
   Math.floor instead of the calendar is an *equivalent* mutant on this data, because every
   submittedAt in the seed is a date-only value and floor(elapsed) equals the day gap for all
   of them. Keeping it would have raised the count without raising the coverage.
     node tools/falsify-date-frames.cjs                                                     */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'Sukinnect-next.html');
const original = fs.readFileSync(TARGET, 'utf8');

/* Single-line needles: the file is CRLF, so a needle carrying \n never matches and the mutant
   reports itself as SKIP while looking like a pass. */
const MUTANTS = [
  { name: 'the wait goes back to rounding an elapsed interval',
    needle: '  return Math.max(0, daysBetween(a.submittedAt, Date.now()));',
    to: '  return Math.max(0, Math.round((Date.now() - parseDay(a.submittedAt)) / 86400000));',
    label: 'no day count is taken by rounding an elapsed interval' },
  { name: 'startOfDay stops truncating to the day',
    needle: '  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();',
    to: '  return d.getTime();',
    label: 'a wait counted in days says the same thing at any hour of the same day' },
  { name: 'the interval is divided into hours instead of days',
    needle: '    - startOfDay(parseDay(fromValue))) / 86400000);',
    to: '    - startOfDay(parseDay(fromValue))) / 3600000);',
    label: 'a wait counted in days says the same thing at any hour of the same day' },
  { name: 'the row stops reading the record and says three days',
    needle: '  return Math.max(0, daysBetween(a.submittedAt, Date.now()));',
    to: '  return 3;',
    label: 'the queue prints that count rather than its own arithmetic' },
  { name: 'the label words one day differently than the count',
    needle: "  return d <= 0 ? 'today' : d === 1 ? '1 day ago' : d + ' days ago';",
    to: "  return d <= 0 ? 'today' : d === 1 ? 'one day ago' : d + ' days ago';",
    label: 'the words on the row are the number the record supports' },
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
