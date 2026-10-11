/* Swap residentSectionBody's invented history for one that reads the records.

   Asserts before writing: the region being replaced must contain the claims the audit named
   (the ₱2,500 total, the September 12 faucet "repair", the saved provider nobody saved), and
   the replacement must be found. Both directions are checked, because a splice that silently
   matches nothing writes a file that looks edited and is not. */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'Sukinnect-next.html');
const NEW = path.join(ROOT, 'tools/.new-resident-section-body.txt');
const APPLY = process.argv.includes('--apply');

const raw = fs.readFileSync(FILE, 'utf8');
const src = raw.replace(/\r\n/g, '\n');
let replacement = fs.readFileSync(NEW, 'utf8').replace(/\r\n/g, '\n').replace(/\s+$/, '') + '\n\n';

const START = 'function residentSectionBody(section){';
const END = '\nfunction providerSectionBody(';
const a = src.indexOf(START);
const b = src.indexOf(END, a);
if (a < 0 || b < 0) { console.log('FAIL: could not bound the function (start ' + a + ', end ' + b + ')'); process.exit(1); }
const old = src.slice(a, b + 1);

const mustContain = ['₱2,500', 'September 12, 2026', 'Ramil Odiada', 'Kitchen Faucet Repair', '0912***6789', 'Due October 10', 'Active until September 19'];
const missing = mustContain.filter(s => !old.includes(s));
console.log('region  : ' + old.length + ' chars, ' + old.split('\n').length + ' lines');
console.log('claims  : ' + mustContain.length + ' invented claims expected, ' + (mustContain.length - missing.length) + ' found');
if (missing.length) { console.log('FAIL: the region does not hold the claims being removed: ' + missing.join(' | ')); process.exit(1); }

const newFns = ['function residentFinished()', 'function residentPaid()', 'function bookingTotal(', 'function residentSpendByService(',
  'function warrantyEndsAt(', 'function shortDate(', 'function openBookingFromProfile(', 'function residentSectionBody(section){'];
const absent = newFns.filter(f => src.includes(f) && !replacement.includes(f));
if (absent.length) { console.log('FAIL: replacement is missing something already in it: ' + absent.join(', ')); process.exit(1); }
for (const f of newFns.slice(0, 7)) {
  if (!replacement.includes(f)) { console.log('FAIL: replacement does not define ' + f); process.exit(1); }
  if ((src.match(new RegExp(f.replace(/[().]/g, '\\$&'), 'g')) || []).length > 1) {
    console.log('FAIL: ' + f + ' already exists — the splice would duplicate it'); process.exit(1);
  }
}

const out = src.slice(0, a) + replacement + src.slice(b + 1);
console.log('written : ' + out.split('\n').length + ' lines (' + (out.split('\n').length - src.split('\n').length) + ' vs now)');

if (!APPLY) { console.log('\nreport only; nothing written. Re-run with --apply.'); process.exit(0); }
fs.writeFileSync(FILE, out.replace(/\n/g, '\r\n'), 'utf8');
const back = fs.readFileSync(FILE, 'utf8');
const crlf = (back.match(/\r\n/g) || []).length, lf = (back.match(/\n/g) || []).length;
console.log('wrote — CRLF ' + crlf + ', LF ' + lf + (crlf === lf ? ' (pure CRLF)' : ' (MIXED — investigate)'));
