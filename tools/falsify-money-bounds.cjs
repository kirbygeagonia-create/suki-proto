/* Proves the three checks added with the negative-price fix watch the rule they claim to.
   The defect was reached by typing into the real field and pressing the sheet's own button: the
   offer totals were clamped to zero, so the screen read ₱0 while the record was written at
   -₱5.00/kg. One rejected alternative is mutant 2 — clamp the unit price the way the totals are
   clamped — which is exactly the silent rewrite of the provider's number that the refusal exists
   to avoid, so the check has to fail it.
     node tools/falsify-money-bounds.cjs                                                  */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'Sukinnect-next.html');
const original = fs.readFileSync(TARGET, 'utf8');

const GUARD = "  if (unit !== null && unit < 0) throw new GuardRejected('a price cannot be negative.');";

/* Single-line needles: the file is CRLF, so a needle carrying \n never matches and the mutant
   reports itself as SKIP while looking like a pass. */
const MUTANTS = [
  { name: 'the unit price goes back to being written through unguarded',
    needle: GUARD, to: '  /* the totals are clamped and that was thought enough */',
    label: 'a negative unit price is refused rather than recorded' },
  { name: 'the guard refuses every offer, priced or not',
    needle: GUARD, to: "  if (unit === null || unit < 0) throw new GuardRejected('a price cannot be negative.');",
    label: 'and the refusal stops the bad offer without stopping the good one' },
  { name: 'the unit field loses its lower bound',
    needle: 'id="offer-unit" type="number" min="0" inputmode="decimal"',
    to: 'id="offer-unit" type="number" inputmode="decimal"',
    label: 'every number field declares a lower bound' },
  { name: 'the labour field loses its lower bound',
    needle: 'id="offer-labour" type="number" min="0" inputmode="decimal"',
    to: 'id="offer-labour" type="number" inputmode="decimal"',
    label: 'every number field declares a lower bound' },
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
