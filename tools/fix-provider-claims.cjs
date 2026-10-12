/* Take the unsourced claims out of the provider's own profile modules.

   The resident and admin passes removed invented history and invented security state. The
   provider's modules were never looked at, and they hold the same three shapes:

   1. The reputation card prints completion and cancellation from the records — 50% and 50% for
      the demo plumber — and then says, directly underneath, "Trust remains strong because
      completion and customer ratings are consistently high." The sentence contradicts the two
      numbers above it, on the same card.
   2. Account & Security asserts "PIN: Enabled", "Two-factor authentication: Enabled" and
      "Active sessions: 2". No state exists for any of the three; the only security-adjacent key
      in the app is providerEmergencyDispatch. This is the same fabricated-security-claim class
      already removed from the admin account.
   3. Emergency Dispatch states "Emergency radius: 3 km" and "Emergency hours: 6:00 AM - 10:00
      PM". Neither is a record. The service radius IS a profile field, so the honest line is the
      one that names where the number comes from.

   Every edit asserts its own match count. */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'Sukinnect-next.html');
const APPLY = process.argv.includes('--apply');
let src = fs.readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n');
const log = []; let failed = 0;
function sub(label, needle, replacement, expected) {
  const hits = src.split(needle).length - 1;
  if (hits !== expected) { log.push('MISMATCH  ' + label + ': found ' + hits + ', expected ' + expected); failed++; return; }
  src = src.split(needle).join(replacement); log.push('ok        ' + label + ' (' + hits + ')');
}

/* a denominator, so the rates can travel with it like the admin rates already do */
sub('closedJobCount helper',
  'function completionRate(providerId) {',
  `/* The jobs that have actually resolved. completionRate and cancellationRate both count out of
   this set; exposing it exists only so the card can say how thin the sample is. */
function closedJobCount(providerId){
  return bookingsForProvider(providerId).filter(b => ['completed', 'cancelled', 'expired', 'no_show'].includes(b.status)).length;
}

function completionRate(providerId) {`, 1);

/* 1. the verdict contradicts the figures two spans above it */
sub('reputation states its sample instead of ruling on it',
  `Trust remains strong because completion and customer ratings are consistently high.`,
  `Counted from the \${closedJobCount(CURRENT_PROVIDER_ID)} job\${closedJobCount(CURRENT_PROVIDER_ID) === 1 ? '' : 's'} on this device that have finished or been cancelled — with a sample that small one booking moves either figure by half. The trust score is the platform's own figure for this account, not a rating of the person.`, 1);

/* 2. three security claims with no state behind any of them */
sub('provider security stops asserting authentication state',
  `<div class="card-body">Password: <b>••••••••</b><br>PIN: <b>Enabled</b><br>Two-factor authentication: <b style="color:var(--success-ink);">Enabled</b><br>Active sessions: <b>2</b></div>`,
  `<div class="card-body">This prototype signs in locally and keeps no authentication state, so there is no PIN, two-factor or session list to report. Changing a password here updates the local view and nothing else.</div>`, 1);

/* 3. invented emergency radius and hours */
sub('dispatch names where its radius comes from',
  `Accept urgent requests outside normal booking flow when available.<br>Emergency radius: 3 km<br>Emergency hours: 6:00 AM - 10:00 PM`,
  `Accept urgent requests outside the normal booking flow when available.<br>Urgent requests reach you inside the service area you set under Service area — <b>\${esc(pp.serviceRadius)}</b>. There is no separate emergency radius or emergency window in this prototype, because nothing records one.`, 1);

/* 2b. the same three claims in the ADMIN security card — the leftover scan found them */
sub('admin security stops asserting authentication state',
  `<div class="card-body">PIN: <b style="color:var(--success-ink);">Enabled</b><br>Password: <b>••••••••</b><br>Two-factor authentication: <b style="color:var(--success-ink);">Enabled</b><br>Active sessions: <b>2</b></div>`,
  `<div class="card-body">This prototype signs in locally and keeps no authentication state, so there is no PIN, two-factor setting or session count to report. Nothing on this card reflects a real security configuration.</div>`, 1);

const leftovers = ['Trust remains strong', 'Active sessions: <b>2</b>', 'Emergency radius:', 'Emergency hours:', 'Two-factor authentication: <b style="color:var(--success-ink);">Enabled</b>', 'PIN: <b>Enabled</b>']
  .filter(s => src.includes(s));
log.push('\nleftover unsourced claims: ' + (leftovers.length ? leftovers.join(' | ') : 'none'));
if (leftovers.length) failed++;

console.log(log.join('\n'));
if (failed) { console.log('\nREFUSING TO WRITE.'); process.exit(1); }
if (!APPLY) { console.log('\nreport only. Re-run with --apply.'); process.exit(0); }
fs.writeFileSync(FILE, src.replace(/\n/g, '\r\n'), 'utf8');
const back = fs.readFileSync(FILE, 'utf8');
const crlf = (back.match(/\r\n/g) || []).length, lf = (back.match(/\n/g) || []).length;
console.log('wrote — lines ' + back.split('\n').length + ', CRLF ' + crlf + ', LF ' + lf + (crlf === lf ? ' (pure CRLF)' : ' (MIXED)'));
