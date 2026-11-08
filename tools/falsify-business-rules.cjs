/* Proves that the business rules slice S1 moved into the kernel are rules and not sentences.

   Slice S1 is four decisions from the 27 October plan: the commission is 1.2% under a hard 1.3% cap,
   the processor's fee is funded by the payer and never absorbed, paid and regulated features ship
   switched off, and a refund returns the service money without the fee. Each decision is a gate
   check, and each check needs a break that makes it go red — or the check is describing a build
   rather than guarding one.

   Three breaks in the first draft of this family were wrong about the application, and the readings
   are kept here because each is a mechanism a future reader will meet again:

     · moving the default back to 10% crashed the suite instead of failing a check, because the cap
       is enforced at the first read and CONFIG_DEFAULTS is not validated at definition. The break
       now moves the default to 1.3% — legal, under the ceiling, and still not 1.2%.
     · neutering the cap inside assertWithinFeeCap condemns the setConfig guard, not the form's,
       because the form compares against CONFIG.commissionRateCap itself. The break now raises the
       stored cap, which is what the form actually reads.
     · bypassing the cap on the per-category READ path is an equivalent mutant: setConfig already
       refuses an override above the ceiling, so no illegal number ever reaches the getter. It was
       not deleted to make the count look smaller — it was re-pointed at what the label promises,
       which is that the refusal NAMES the category.

   Two breaks of the settlement rule would be simpler and prove less. Deleting the gateway credit
   line outright crashes the back-filled ledger, so the suite errors rather than naming anything;
   the break below instead makes the line conditional on the very total it is supposed to protect,
   which is the shape absorption actually takes in code — a screen that computes the customer's
   money first and the fee second.

   The absorption guard's two clauses are broken one at a time, in opposite directions: clause 1 is
   about the payer's total, clause 2 about the platform's revenue. Proving only one would let the
   other be deleted with every row still reading clean.

     node tools/falsify-business-rules.cjs                                                */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'Sukinnect-next.html');
const original = fs.readFileSync(TARGET, 'utf8');

/* Single-line needles: the file is CRLF, so a needle carrying a newline never matches and the
   mutant reports SKIP while looking exactly like a pass. */
const MUTANTS = [
  { name: 'the default rate moves to the far edge of the cap',
    needle: '  commissionRateDefault: 0.012,',
    to: '  commissionRateDefault: 0.013,',
    label: '₱800 at the pilot fee takes ₱9.60' },

  { name: 'the stored ceiling is raised, so the form stops refusing',
    needle: '  commissionRateCap: 0.013,',
    to: '  commissionRateCap: 0.5,',
    label: 'a rate above the cap is refused at the form' },

  { name: 'the cap stops being enforced where a rate is stored',
    needle: "    if (key === 'commissionRateDefault') assertWithinFeeCap(patch[key], 'the default rate');",
    to: '    /* the form is trusted to have checked it */',
    label: 'and refused inside setConfig, not only by the form' },

  { name: 'the category refusal stops naming the trade it refused',
    needle: "    if (key === 'commissionRateByCategory') Object.keys(patch[key] || {}).forEach(c => assertWithinFeeCap(patch[key][c], c));",
    to: "    if (key === 'commissionRateByCategory') Object.keys(patch[key] || {}).forEach(c => assertWithinFeeCap(patch[key][c], 'an override'));",
    label: 'a per-category override above the cap is refused too, and names the category' },

  { name: 'a frozen seed rate is moved above the cap',
    needle: 'commissionRate:0.012, baseCentavos:160000,',
    to: 'commissionRate:0.02, baseCentavos:160000,',
    label: 'no seed froze a rate above the cap' },

  { name: 'the payer stops funding the processing fee',
    needle: '  const gateway = gatewayFeeFor(opts.payMethod, settledCentavos);',
    to: '  const gateway = null;',
    label: 'an online job discloses the fee as its own amount' },

  { name: 'a cash booking is handed a payment processor',
    needle: '    cash:   null,',
    to: '    cash:   { rate: 0.0223, fixedCentavos: 0, source: \'PayMongo published standard pricing, checked 2026-10-27, ex-VAT; no signed quote on file\' },',
    label: 'a cash job carries no processing fee at all' },

  { name: 'the settlement credits the fee only when the total already contains it',
    needle: '  if ((p.gatewayFeeCentavos || 0) > 0)',
    to: '  if ((p.gatewayFeeCentavos || 0) > 0 && p.customerTotalCentavos > p.baseCentavos + p.passThroughCentavos + p.fixedFeeCentavos + p.taxCentavos)',
    label: 'a settlement that absorbed the fee cannot be booked' },

  { name: 'the first absorption clause stops refusing',
    needle: '    if (b.customerTotalCentavos < service + fee)',
    to: '    if (false && b.customerTotalCentavos < service + fee)',
    label: 'a breakdown that leaves the fee out of what the payer is charged is refused' },

  { name: 'the second absorption clause stops refusing',
    needle: '    if (b.platformRevenueCentavos > b.commissionCentavos + b.fixedFeeCentavos)',
    to: '    if (false && b.platformRevenueCentavos > b.commissionCentavos + b.fixedFeeCentavos)',
    label: 'a breakdown that counts the fee as platform revenue is refused' },

  { name: 'the refund cap stops subtracting the processor fee',
    needle: '  const refundableTotal = p.customerTotalCentavos - (p.gatewayFeeCentavos || 0);',
    to: '  const refundableTotal = p.customerTotalCentavos;',
    label: 'a refund returns the service money and not the processor\'s fee' },

  { name: 'a paid feature ships switched on',
    needle: '    subscriptions: false,',
    to: '    subscriptions: true,',
    label: 'paid and regulated features are off, and nothing in the books is waiting for them' },

  { name: 'the flag reader stops consulting configuration',
    needle: '  return f[flag] === true;',
    to: '  return true;',
    label: 'a flag is read by the kernel, not by the markup' },

  { name: 'the receipt rounds the decimal out of the rate it charged',
    needle: '${ratePercent(p.commissionRate)}%',
    to: '${Math.round(p.commissionRate * 100)}%',
    label: 'a receipt prints the rate it charged, to the decimal the rate has' },

  { name: 'the audit line rounds the decimal out of a saved rate',
    needle: '  if (v < 1 && v > 0) return ratePercent(v) + \'%\';',
    to: '  if (v < 1 && v > 0) return Math.round(v * 100) + \'%\';',
    label: 'the change log prints a rate with the decimal the rate has' },

  { name: 'every config refusal goes back to sharing one sentence',
    needle: "  if (bad.length) { showToast(bad.join(' · '), 'error'); return; }",
    to: "  if (bad.length) { showToast('Check ' + bad.join(', ') + ' — a rate cannot be negative.', 'error'); return; }",
    label: 'an over-cap rate is refused in words about the ceiling, not about signs' },

  { name: 'the category field\'s own refusal names the field instead of the trade',
    needle: "        bad.push(esc(cat.label) + ' rate cannot exceed ' + ratePercent(CONFIG.commissionRateCap) + '%');",
    to: "        bad.push('cfgcat-' + cat.id);",
    label: 'and a per-category override is refused in words that name the trade' },

  { name: 'a priced method drops out of the console table',
    needle: '        return Object.keys(CONFIG.gatewayFees).map(method => {',
    to: '        return Object.keys(CONFIG.gatewayFees).filter(m => m !== \'card\').map(method => {',
    label: 'the console lists every priced gateway method with its dated source' },

  { name: 'the table prints a rate without the date it was read',
    needle: '${spec && spec.source ? `<div style="font-size:var(--t-caption); color:var(--mist); line-height:1.5;">${esc(spec.source)}</div>` : \'\'}`;',
    to: '`;',
    label: 'the console lists every priced gateway method with its dated source' },

  { name: 'the table stops saying which routes this build cannot take money through',
    needle: '${offered.indexOf(method) < 0 ? \' <span class="mut">not offered in this build</span>\' : \'\'}',
    to: '',
    label: 'the console lists every priced gateway method with its dated source' },

  { name: 'a route with no processor is shown as if it had one',
    needle: '${spec ? \'\' : \' <span class="mut">no processor</span>\'}',
    to: '',
    label: 'the console lists every priced gateway method with its dated source' }
];

function gateOutput() {
  try {
    return { code: 0, out: execFileSync(process.execPath, [path.join(ROOT, 'tools', 'verify.cjs')],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'pipe'] }) };
  } catch (err) {
    return { code: err.status === undefined ? -1 : err.status,
      out: (err.stdout || '') + (err.stderr || '') };
  }
}

let caught = 0, applied = 0, unmatched = 0, crashed = 0;
try {
  for (const m of MUTANTS) {
    const hits = original.split(m.needle).length - 1;
    if (hits !== 1) {
      unmatched++;
      console.log('SKIP  ' + m.name + '  (needle matched ' + hits + ' times, needs exactly 1)');
      continue;
    }
    if (m.needle === m.to) {
      unmatched++;
      console.log('SKIP  ' + m.name + '  (the replacement is the needle: nothing would change)');
      continue;
    }
    applied++;
    fs.writeFileSync(TARGET, original.replace(m.needle, m.to));
    const run = gateOutput();
    /* A crash is not a catch. If the suite died before printing the named verdict, the mutant
       condemned nothing about that check however nonzero the exit code. */
    if (run.code === -1) {
      crashed++;
      console.log('MISSED  ' + m.name + '  (the gate did not run: ' + run.out.split('\n')[0] + ')');
      continue;
    }
    const failed = run.code !== 0 && run.out.indexOf('FAIL  ' + m.label) >= 0;
    if (failed) { caught++; console.log('CAUGHT  ' + m.name); }
    else {
      const firstFail = (run.out.split('\n').find(l => l.indexOf('FAIL  ') === 0) || 'no FAIL line at all');
      console.log('MISSED  ' + m.name + '  (exit ' + run.code + '; nearest verdict: ' + firstFail.trim() + ')');
    }
  }
} finally {
  fs.writeFileSync(TARGET, original);
}
console.log('\n' + caught + ' of ' + applied + ' mutants caught, ' + unmatched + ' not applied, '
  + crashed + ' gate failures; file restored.');
process.exit(applied > 0 && caught === applied && unmatched === 0 && crashed === 0 ? 0 : 1);
