/* Two halves of the same gap. hydrate() refuses a dump whose values are illegal but
   never asks whether its references point at anything, and it answers all of this
   with a report that the boot sequence throws away — so a refused session looked
   exactly like a first run, and a device that cannot write was told "saved" for every
   change it was about to forget.
     node tools/hydrate-references-and-report.cjs                                       */
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

/* ── 1. references ─────────────────────────────────────────────────────────────── */
sub(
  "    return { restored:false, kind:Store.kind, rejected:'an offer belongs to no booking' };",
  [
    "    return { restored:false, kind:Store.kind, rejected:'an offer belongs to no booking' };",
    '  /* The checks above ask whether each value is legal. None asked whether the',
    '     references point at anything. A booking whose providerId names nobody loads',
    '     happily and then renders under the first provider in the table, because',
    '     providerOf() has a fallback — so one dangling id repaints that job\'s name,',
    '     phone, rating and payout account on both sides, from the receipt to the admin',
    '     console, and every figure in between stays arithmetically perfect. A record',
    '     that belongs to nobody is not a record; it is a hole wearing an id. */',
    '  const known = (list, id) => Array.isArray(list) && list.some(r => r && r.id === id);',
    '  if (snap.bookings.some(b => (b.providerId && !known(snap.providers, b.providerId))',
    '                           || (b.customerId && !known(snap.customers, b.customerId))))',
    "    return { restored:false, kind:Store.kind, rejected:'a booking belongs to a provider or customer that does not exist' };",
    '  if (Array.isArray(snap.listings) &&',
    '      snap.listings.some(l => l && l.providerId && !known(snap.providers, l.providerId)))',
    "    return { restored:false, kind:Store.kind, rejected:'a listed service belongs to no provider' };",
    '  if (Array.isArray(snap.payouts) &&',
    '      snap.payouts.some(p => p && p.providerId && !known(snap.providers, p.providerId)))',
    "    return { restored:false, kind:Store.kind, rejected:'a payout belongs to no provider' };",
    '  /* Every child record that names a booking, in one pass. A payment against',
    '     nothing would still be counted as money, and a case, a status line or a',
    '     message would still print as though it belonged to a job. */',
    '  let orphan = null;',
    "  [['payments', 'a payment'], ['disputes', 'a case'], ['statusEvents', 'a status line'],",
    "   ['notifications', 'a notification'], ['messages', 'a message']].forEach(pair => {",
    '    const rows = snap[pair[0]];',
    '    if (!orphan && Array.isArray(rows)',
    '        && rows.some(r => r && r.bookingId && !known(snap.bookings, r.bookingId)))',
    "      orphan = pair[1] + ' belongs to a booking that does not exist';",
    '  });',
    '  if (orphan) return { restored:false, kind:Store.kind, rejected:orphan };',
  ].join('\n'),
  1);

/* ── 2. the write's answer ─────────────────────────────────────────────────────── */
sub(
  'function persist() { return Store.write(snapshot()); }',
  [
    '/* A one-shot notice. The gate already proved persist() returns false without',
    '  throwing; what it never proved is that anybody is told. Twenty-four call sites',
    '  discard the answer, so on a device whose storage is full every "saved" toast in',
    '  this app was a promise about a write that had just failed. */',
    'const storageWarned = {};',
    'function storageNotice(message) {',
    '  if (storageWarned[message]) return;',
    '  storageWarned[message] = true;',
    "  state.storageNotice = message;",
    "  showToast(message, 'warn');",
    '}',
    '',
    'function persist() {',
    '  const ok = Store.write(snapshot());',
    "  if (!ok) storageNotice('This device refused to store the change. It holds for this session only — a reload will lose it.');",
    '  return ok;',
    '}',
  ].join('\n'),
  1);

/* ── 3. the boot report ────────────────────────────────────────────────────────── */
sub(
  [
    'hydrate();',
    'seedHistoricalLedger();',
  ].join('\n'),
  [
    '/* hydrate() answers three questions the app used to discard: was there a dump, did',
    '   it survive validation, and can this device store anything at all. A refused dump',
    '   looked exactly like a first run, so the person who had bookings on this phone saw',
    '   the sample records and no explanation for where theirs went. */',
    'const BOOT = hydrate();',
    "if (BOOT.rejected) storageNotice('Your saved session was refused: ' + BOOT.rejected + '. The sample records are loaded instead.');",
    "else if (BOOT.kind === 'memory') storageNotice('This browser will not keep records between sessions, so anything saved here lasts only while the screen is open.');",
    'seedHistoricalLedger();',
  ].join('\n'),
  1);

fs.writeFileSync(TARGET, wasCRLF ? lf.replace(/\n/g, '\r\n') : lf);
console.log('references, write answer and boot report wired; '
  + (wasCRLF ? 'CRLF' : 'LF') + ' preserved.');
