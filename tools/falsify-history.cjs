/* Throwaway: break each of the resident-history rules in the real source and require the
   gate to notice. Pristine bytes are held in memory and restored in a finally, and every
   mutant asserts it landed before its verdict is believed. */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'Sukinnect-next.html');
const pristine = fs.readFileSync(FILE);

function gate() {
  try { return { code: 0, out: execFileSync(process.execPath, [path.join(ROOT, 'tools/verify.cjs')], { encoding: 'utf8', stdio: 'pipe', cwd: ROOT }) }; }
  catch (e) { return { code: e.status, out: (e.stdout || '') + (e.stderr || '') }; }
}

const mutants = [
  { name: 'the spending card prints a peso figure no record produces',
    from: '<div class="card"><b>What has been paid</b>',
    to: '<div class="card"><b>What has been paid — ₱9,999</b>',
    expect: 'every peso figure on the spending card is one the records produce' },
  /* The first two cuts of this mutant were both wrong, and the gate said so. Dropping the
     payStatus filter alone broke the *reconciliation* check instead, because b1 is ongoing and
     never reaches the finished set; widening only the pay statuses broke nothing at all, for
     the same reason. To put an unpaid booking on a receipt the function has to stop filtering
     on both axes. */
  { name: 'a receipt is drawn from every booking, paid or not',
    from: "return residentFinished().filter(b => ['captured', 'collected'].includes(b.payStatus));",
    to: "return bookingsForResident(state.customerId);",
    expect: 'no receipt names a booking that has not been paid' },
  { name: 'the warranty window is typed rather than computed',
    from: 'return new Date(at + CONFIG.warrantyDays * 86400000);',
    to: 'return new Date(at + 30 * 86400000);',
    expect: 'the warranty window is computed, never typed' },
  { name: "the admin's invented recent bookings come back",
    from: 'No bookings recorded for this provider on this device.',
    to: 'Pipe Leak Repair - Ben R. - Sep 6 - ₱650 - Completed',
    expect: 'the invented resident history is gone from the file' },
  { name: 'the hub tile hard-codes the total again',
    from: "${esc(pesoShort(residentPaid().reduce((s, b) => s + bookingTotal(b), 0)))}",
    to: '₱2,500',
    expect: 'the invented resident history is gone from the file' },
  { name: 'the spending total stops moving when a job stops being paid',
    from: "return residentFinished().filter(b => ['captured', 'collected'].includes(b.payStatus));",
    to: 'return residentFinished();',
    expect: 'the spending total follows the records' },
];

const base = gate();
if (base.code !== 0) { console.log('BASELINE NOT GREEN:\n' + base.out.split('\n').filter(l => l.startsWith('FAIL')).join('\n')); process.exit(1); }
console.log('baseline: green (' + (base.out.match(/all (\d+) checks passed/) || [])[1] + ' checks)\n');

let applied = 0, caught = 0;
try {
  for (const m of mutants) {
    const text = pristine.toString('utf8').replace(/\r\n/g, '\n');
    const hits = text.split(m.from).length - 1;
    if (hits !== 1) { console.log('NOT APPLIED  ' + m.name + ' (needle matched ' + hits + ', expected 1)'); continue; }
    fs.writeFileSync(FILE, text.replace(m.from, m.to).replace(/\n/g, '\r\n'));
    applied++;
    const r = gate();
    const failed = r.out.split('\n').filter(l => l.startsWith('FAIL'));
    if (r.code !== 0 && failed.some(l => l.includes(m.expect))) {
      caught++; console.log('CAUGHT       ' + m.name + '\n               → ' + (failed.find(l => l.includes(m.expect)) || '').slice(0, 96));
    } else if (r.code !== 0) {
      console.log('PARTIAL      ' + m.name + ' — gate failed elsewhere:\n               ' + failed.join(' / ').slice(0, 150));
    } else console.log('MISSED       ' + m.name + ' — stayed green with the rule broken');
  }
} finally {
  fs.writeFileSync(FILE, pristine);
  const after = gate();
  console.log('\nrestored: ' + (after.code === 0 ? 'gate green again' : 'STILL FAILING\n' + after.out.split('\n').filter(l => l.startsWith('FAIL')).join('\n')));
  console.log('mutants applied ' + applied + ', caught ' + caught + ', not applied ' + (mutants.length - applied));
}
