/* The administrator's provider profile was the last screen typing its own facts.
   Its audit tab was four dated lines identical for all eight providers — including
   "Received 5-star review" for a provider with no review on file — and its
   credentials tab claimed TESDA "Valid" and Government ID "Verified" in green for
   documents no record asserts, while the third line on the same card read the record
   correctly. §29 is the reason this matters more here than anywhere: it is the screen
   an auditor is meant to trust.
     node tools/admin-profile-reads-records.cjs                                         */
const fs = require('fs');
const path = require('path');

const TARGET = path.join(__dirname, '..', 'Sukinnect-next.html');
const src = fs.readFileSync(TARGET, 'utf8');
const wasCRLF = src.indexOf('\r\n') >= 0;
let lf = src.replace(/\r\n/g, '\n');

function sub(needle, replacement, expected) {
  const hits = lf.split(needle).length - 1;
  if (hits !== expected) {
    throw new Error('needle matched ' + hits + ' time(s), expected ' + expected + ' :: '
      + needle.slice(0, 70).replace(/\n/g, '\\n'));
  }
  lf = lf.split(needle).join(replacement);
}

const D = '$' + '{';   // the app's own interpolation, which Node would otherwise run

sub(
  'September 9 - Completed booking<br>September 8 - Updated availability'
    + '<br>September 7 - Received 5-star review<br>September 5 - Credential reminder sent',
  D + 'adminActivityRows(provider)}',
  1);

sub(
  'TESDA ' + D + 'provider.service} credential - <b style="color:var(--success-ink);">Valid</b>'
    + '<br>Government ID - <b style="color:var(--success-ink);">Verified</b>'
    + '<br>Barangay Clearance - <b style="color:' + D + "meta.credential==='Expired'?'var(--error-ink)':'var(--gold-600)'};\">"
    + D + 'meta.credential}</b>',
  D + 'adminCredentialRows(provider)}',
  1);

sub(
  'function adminProviderMeta(provider){',
  [
    '/* Read from the records the rest of the app already consults. STATUS_EVENTS is the',
    '   same timeline the resident\'s tracking view and the dispute evidence chain show,',
    '   and CREDENTIALS holds each document with its real expiry. Where a record is',
    '   silent the card says so rather than filling the gap with a plausible line. */',
    'function adminActivityRows(provider){',
    '  const events = STATUS_EVENTS.filter(e => {',
    '    const b = BOOKINGS.find(x => x.id === e.bookingId);',
    '    return b && b.providerId === provider.id;',
    '  }).sort((x, y) => String(y.at).localeCompare(String(x.at))).slice(0, 8);',
    '  if (!events.length) return \'No job has moved on this device for this provider, so there is nothing to audit. The list begins with the first status change.\';',
    '  return events.map(e => esc(shortDate(e.at)) + \' — \' + esc((e.to ? label(e.to) : \'Update\')',
    '    + (e.note ? \' · \' + e.note : \'\'))).join(\'<br>\');',
    '}',
    'function adminCredentialRows(provider){',
    '  const rows = credentialsOf(provider.id);',
    '  if (!rows.length) return \'No document is on file for this provider. A credential is recorded during verification, and none exists for them here.\';',
    '  return rows.map(cr => { const st = credentialLine(cr);',
    '    return esc(cr.name) + \' <span style="color:var(--mist);">(\' + esc(cr.issuer) + \')</span> — <b>\' + esc(st.label) + \', \' + esc(st.when) + \'</b>\';',
    '  }).join(\'<br>\');',
    '}',
    '',
    'function adminProviderMeta(provider){',
  ].join('\n'),
  1);

fs.writeFileSync(TARGET, wasCRLF ? lf.replace(/\n/g, '\r\n') : lf);
console.log('audit and credential panels now read records; '
  + (wasCRLF ? 'CRLF' : 'LF') + ' preserved.');
