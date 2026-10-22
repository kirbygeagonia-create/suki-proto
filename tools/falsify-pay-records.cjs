/* A payment code is a claim about money; the payment rows are the money. Three checks in `honesty` pin
   that seam, and this plants one contradiction per check.

   The family is also the reason there are three checks and not five. The first draft pinned five
   relations and every seed edit survived them, because the demo payment rows are DERIVED — the back-fill
   at the bottom of the seed pass calls recordPayment, which writes the row and the code in one
   statement — so changing a seed's code regenerates its row and the pair cannot be pulled apart from
   that side. Four decorative checks were deleted on the strength of that run, before any of them reached
   a document. The three that remain are broken where the derivation itself can be broken: an undeclared
   code in a seed, the route test flipped so a cash job is coded as partner money, and the settlement row
   never written under a code that claims it.

     node tools/falsify-pay-records.cjs                                                   */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'Sukinnect-next.html');
const original = fs.readFileSync(TARGET, 'utf8');

const DECLARED = 'every payment code is one the vocabulary declares';
const MOVED = 'a code claiming money moved is backed by a row saying so';
const ROUTE = 'the two payment routes never borrow each other’s code';

const MUTANTS = [
  { name: 'a called-off visit is labelled with a word the vocabulary does not declare',
    label: DECLARED,
    from: "    amountCentavos:31500, payStatus:'voided', payMethod:'gcash',",
    to: "    amountCentavos:31500, payStatus:'settled', payMethod:'gcash'," },
  { name: 'the settlement row is never written, although the code says the money moved',
    label: MOVED,
    from: "      if (!paymentsFor(b.id).some(p => p.type === 'capture' || p.type === 'collection'))",
    to: '      if (false)' },
  { name: 'a cash collection is coded as partner money',
    label: ROUTE,
    from: "        recordPayment(b, cash ? 'collection' : 'capture', cash ? 'collected' : 'captured',",
    to: "        recordPayment(b, cash ? 'collection' : 'capture', 'captured'," },
];

function plant(s, m) {
  const hits = s.split(m.from).length - 1;
  return hits === 1 ? { out: s.replace(m.from, m.to) } : { bad: hits };
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
    applied++;
    fs.writeFileSync(TARGET, planted.out);
    const run = gateRun();
    const failed = run.code !== 0 && run.out.includes('FAIL  ' + m.label);
    if (failed) { caught++; console.log('CAUGHT  ' + m.name); }
    else console.log('MISSED  ' + m.name + '  (exit ' + run.code + ', named check '
      + (run.code !== 0 ? 'not the one that failed: ' + (run.out.match(/FAIL  .*/g) || [''])[0].slice(0, 70)
        : 'passed anyway') + ')');
  }
} finally {
  fs.writeFileSync(TARGET, original);
}
console.log('\n' + caught + ' of ' + applied + ' breaks caught, ' + unmatched + ' not applied; file restored.');
process.exit(caught === applied && unmatched === 0 ? 0 : 1);
