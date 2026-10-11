/* Give credentials and verification a record, and make the admin's provider profile read it.

   Three things were wrong at once, and the third was hiding the first two:

   1. bookingsForProvider() takes no parameter at all — it always returns CURRENT_PROVIDER_ID's
      bookings. completionRate(providerId) and cancellationRate(providerId) declare an argument
      and then call it anyway, so every per-provider rate silently returned the signed-in
      provider's number. The one call that passes provider.id was getting p1's rows.
   2. adminProviderMeta was a typed table of four providers' operating metrics. For p1 it said
      96% completion, 4% cancellation, trust 94/100, 2 complaints; the records say 50%, 50%,
      trustScore 96, and zero open cases (the one dispute is on p2). The provider signing in
      sees its own real numbers on its own profile and different ones on the admin's screen.
   3. Nothing anywhere carried a credential status, an expiry, or a verified date. The provider
      profile asserted "NBI Clearance — Valid" for a provider whose record says Police Cleared,
      "Barangay Clearance — Expires in 23 days", and "Verified since March 14, 2026"; and the
      admin's expiring-soon badge — a number shown in the nav — was counted out of a string in
      the typed table.

   Every edit asserts its own match count. The file is normalised to LF in memory and returned
   to CRLF on write, because a needle carrying a newline matches nothing in this checkout.

   usage: node tools/add-credential-records.cjs --apply */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'Sukinnect-next.html');
const APPLY = process.argv.includes('--apply');
const src0 = fs.readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n');
let src = src0;
const log = [];
let failed = 0;

function sub(label, needle, replacement, expected) {
  const hits = src.split(needle).length - 1;
  if (hits !== expected) { log.push('MISMATCH  ' + label + ': found ' + hits + ', expected ' + expected); failed++; return; }
  src = src.split(needle).join(replacement);
  log.push('ok        ' + label + ' (' + hits + ')');
}

/* ── 1. the argument that was being dropped ─────────────────────────────── */
sub('bookingsForProvider takes a provider id',
  `function bookingsForProvider(){ return BOOKINGS.filter(b => b.providerId === CURRENT_PROVIDER_ID); }`,
  `/* The id is optional because most callers really do mean "the provider using the app". It is
   not optional in meaning: completionRate and cancellationRate take a providerId, and while this
   ignored its argument every per-provider figure in the admin console was the signed-in
   provider's figure wearing another name. */
function bookingsForProvider(providerId){
  const id = providerId || CURRENT_PROVIDER_ID;
  return BOOKINGS.filter(b => b.providerId === id);
}`, 1);

sub('completionRate passes its id down',
  `function completionRate(providerId) {
  const closed = bookingsForProvider().filter(b => ['completed', 'cancelled', 'expired', 'no_show'].includes(b.status));`,
  `function completionRate(providerId) {
  const closed = bookingsForProvider(providerId).filter(b => ['completed', 'cancelled', 'expired', 'no_show'].includes(b.status));`, 1);

sub('cancellationRate passes its id down',
  `function cancellationRate(providerId) {
  const closed = bookingsForProvider().filter(b => ['completed', 'cancelled', 'expired', 'no_show'].includes(b.status));`,
  `function cancellationRate(providerId) {
  const closed = bookingsForProvider(providerId).filter(b => ['completed', 'cancelled', 'expired', 'no_show'].includes(b.status));`, 1);

/* ── 2. the records ─────────────────────────────────────────────────────── */
sub('CONFIG gains a credential warning window',
  `  warrantyDays: 7\n`,
  `  warrantyDays: 7,
  /* How close to expiry counts as "expiring soon". A number the platform chose, not a fact
     about any document — the admin can see it is a threshold because the badge says so. */
  credentialWarnDays: 30,\n`, 1);

const VERIFICATION = {
  p1: ['verified', '2026-03-14', 'admin:raquel'],
  p2: ['verified', '2026-04-02', 'admin:raquel'],
  p3: ['verified', '2026-01-27', 'admin:raquel'],
  p4: ['suspended', '2025-11-08', 'admin:raquel'],
  p5: ['verified', '2026-05-19', 'admin:raquel'],
  p6: ['verified', '2026-02-11', 'admin:raquel'],
  p7: ['pending', null, null],
  p8: ['verified', '2026-06-30', 'admin:raquel'],
};
for (const [id, [status, verifiedAt, reviewer]] of Object.entries(VERIFICATION)) {
  const anchor = "id:'" + id + "',name:";
  const at = src.indexOf(anchor);
  if (at < 0) { log.push('MISMATCH  verification anchor for ' + id); failed++; continue; }
  const insert = 'verification:' + JSON.stringify({ status, verifiedAt, reviewer }) + ', ';
  src = src.slice(0, at) + insert + src.slice(at);
  log.push('ok        verification record on ' + id);
}

const CREDENTIALS_SEED = `
/* A credential is a record, not a decoration beside a name. Before this the only thing the app
   knew about a document was the string in PROVIDERS[].credentials, and three screens asserted
   statuses, expiry dates and a "verified since" that nothing owned. expiresAt null means the
   document does not expire — a TESDA certificate, unlike a barangay clearance. */
const CREDENTIALS = [
  {id:'cr1', providerId:'p1', name:'TESDA NC II Plumbing', issuer:'TESDA', kind:'qualification', expiresAt:null},
  {id:'cr2', providerId:'p1', name:'Barangay Clearance', issuer:'Brgy. Poblacion', kind:'clearance', expiresAt:'2026-11-02'},
  {id:'cr3', providerId:'p1', name:'Master Plumber Apprentice', issuer:'TDSA', kind:'qualification', expiresAt:null},
  {id:'cr4', providerId:'p1', name:'Police Clearance', issuer:'PNP', kind:'clearance', expiresAt:'2026-10-25'},
  {id:'cr5', providerId:'p2', name:'TESDA NC II Electrical Installation', issuer:'TESDA', kind:'qualification', expiresAt:null},
  {id:'cr6', providerId:'p2', name:'Licensed Electrician', issuer:'PRC', kind:'licence', expiresAt:'2027-01-31'},
  {id:'cr7', providerId:'p2', name:'Safety Certified', issuer:'BOSS', kind:'qualification', expiresAt:'2026-10-20'},
  {id:'cr8', providerId:'p3', name:'TESDA Housekeeping NC II', issuer:'TESDA', kind:'qualification', expiresAt:null},
  {id:'cr9', providerId:'p3', name:'Sanitation Certified', issuer:'City Health Office', kind:'qualification', expiresAt:'2027-03-14'},
  {id:'cr10', providerId:'p3', name:'NBI Clearance', issuer:'NBI', kind:'clearance', expiresAt:'2026-12-01'},
  {id:'cr11', providerId:'p4', name:'Appliance Repair Certified', issuer:'TDSA', kind:'qualification', expiresAt:null},
  {id:'cr12', providerId:'p4', name:'Police Clearance', issuer:'PNP', kind:'clearance', expiresAt:'2026-09-30'},
  {id:'cr13', providerId:'p5', name:'Tutoring Credential', issuer:'DepEd', kind:'qualification', expiresAt:null},
  {id:'cr14', providerId:'p6', name:'Driver\u2019s License', issuer:'LTO', kind:'licence', expiresAt:'2027-06-08'},
  {id:'cr15', providerId:'p6', name:'Police Clearance', issuer:'PNP', kind:'clearance', expiresAt:'2026-11-19'},
  {id:'cr16', providerId:'p7', name:'Nursing License', issuer:'PRC', kind:'licence', expiresAt:'2027-02-20'},
  {id:'cr17', providerId:'p8', name:'Barangay Clearance', issuer:'Brgy. Lun Magsaysay', kind:'clearance', expiresAt:'2026-10-28'},
  {id:'cr18', providerId:'p8', name:'Farm Workers Association Card', issuer:'FWA', kind:'qualification', expiresAt:null},
];
`;
sub('the CREDENTIALS record set exists',
  `\nconst PENDING_APPLICANTS = [`,
  CREDENTIALS_SEED + `\nconst PENDING_APPLICANTS = [`, 1);

/* ── 3. the derivations ─────────────────────────────────────────────────── */
sub('credential and verification helpers',
  `function completionRate(providerId) {`,
  `function credentialsOf(providerId){ return CREDENTIALS.filter(c => c.providerId === providerId); }
/* Three states, one threshold, and the day count that decided it — because a badge that says
   "expiring" without saying from what is the kind of trust claim this project is told not to
   make. A missing expiry is "valid", not "unknown": the record says the document does not
   expire. */
function credentialState(cred){
  if (!cred || !cred.expiresAt) return { code:'valid', days:null };
  const days = Math.ceil((Date.parse(cred.expiresAt) - Date.now()) / 86400000);
  if (days < 0) return { code:'expired', days: Math.abs(days) };
  if (days <= CONFIG.credentialWarnDays) return { code:'expiring', days };
  return { code:'valid', days };
}
const CREDENTIAL_STATES = {
  valid:    { label:'Valid',            tone:'var(--success-ink)' },
  expiring: { label:'Expiring soon',    tone:'var(--warning-ink)' },
  expired:  { label:'Expired',          tone:'var(--error-ink)' },
};
function credentialLine(cred){
  const st = credentialState(cred), meta = CREDENTIAL_STATES[st.code];
  const when = st.code === 'expired' ? st.days + ' days ago'
    : st.code === 'expiring' ? 'in ' + st.days + ' days'
    : cred.expiresAt ? 'until ' + shortDate(cred.expiresAt) : 'does not expire';
  return { label: meta.label, when, tone: meta.tone };
}
/* The worst document decides what the provider\u2019s row says, so a provider with one expired
   clearance is never shown as clean because another document is fine. */
function worstCredentialState(providerId){
  const creds = credentialsOf(providerId);
  if (!creds.length) return 'none';
  const order = ['expired', 'expiring', 'valid'];
  for (const code of order) if (creds.some(c => credentialState(c).code === code)) return code;
  return 'valid';
}
function isVerifiedProvider(p){ return !!(p && p.verification && p.verification.status === 'verified'); }
function verifiedProviderList(){ return PROVIDERS.filter(isVerifiedProvider); }
function expiringProviderCount(){
  return PROVIDERS.filter(p => ['expired', 'expiring'].includes(worstCredentialState(p.id))).length;
}
function openCasesFor(providerId){
  return DISPUTES.filter(d => d.status === 'open' && (bookingById(d.bookingId) || {}).providerId === providerId);
}

function completionRate(providerId) {`, 1);

/* ── 4. the admin table stops typing ────────────────────────────────────── */
const META_OLD = src.slice(src.indexOf('function adminProviderMeta(provider){'));
const META_END = META_OLD.indexOf('\n}\n') + 3;
if (META_END < 3) { log.push('MISMATCH  could not bound adminProviderMeta'); failed++; }
else {
  const replacement = `/* Every figure here is read from a record. It used to be a typed table keyed by provider
   id, and it disagreed with the app's own data: for p1 it claimed 96% completion, 4%
   cancellation, trust 94/100 and 2 complaints, where the records give 50%, 50%, trustScore 96
   and no open case at all — so the provider and the admin looking at the same person saw
   different numbers. "Performance", "active" and "response" are gone rather than derived: no
   record says when a provider last opened the app or how fast they answer, and a judgement
   with no source is not made honest by computing it from a different number. */
function adminProviderMeta(provider){
  const worst = worstCredentialState(provider.id);
  const verified = provider.verification || {};
  return {
    credential: worst === 'none' ? 'None on file' : CREDENTIAL_STATES[worst] ? CREDENTIAL_STATES[worst].label : worst,
    credentialCode: worst,
    account: verified.status === 'suspended' ? 'Suspended' : verified.status === 'pending' ? 'Awaiting review' : 'Active',
    completion: completionRate(provider.id) + '%',
    cancellation: cancellationRate(provider.id) + '%',
    trust: provider.trustScore + ' / 100',
    complaints: openCasesFor(provider.id).length,
    verifiedAt: verified.verifiedAt || null,
    reviewer: verified.reviewer || null,
  };
}
`;
  src = src.slice(0, src.indexOf('function adminProviderMeta(provider){')) + replacement +
        src.slice(src.indexOf('function adminProviderMeta(provider){') + META_END);
  log.push('ok        adminProviderMeta derives from records');
}

sub('the verified list reads the record',
  `  const verifiedProviders = PROVIDERS.slice(0, 4);`,
  `  const verifiedProviders = verifiedProviderList();`, 1);
sub('the expiring-soon badge counts documents',
  `  const expiringSoon = PROVIDERS.filter(p => adminProviderMeta(p).credential !== 'Valid').length;`,
  `  const expiringSoon = expiringProviderCount();`, 1);

/* ── 5. the two invented lines in the admin profile ─────────────────────── */
sub('verified-since comes from the record',
  '<div>Verified since<br><b>March 14, 2026</b></div>',
  "<div>Verified since<br><b>${meta.verifiedAt ? esc(shortDate(meta.verifiedAt)) : 'not verified'}</b></div>", 1);

sub('schema version goes up',
  `const SCHEMA_VERSION = 12;`,
  `/* 13 adds PROVIDERS[].verification, the CREDENTIALS record set and CONFIG.credentialWarnDays.
   A stored snapshot from 12 has no verification on any provider, so the admin's verified list
   would silently read as empty rather than wrong — but it would read differently to the same
   person on a fresh install, which is the thing worth avoiding. A device holding 12 resets. */
const SCHEMA_VERSION = 13;`, 1);

console.log(log.join('\n'));
if (failed) { console.log('\nREFUSING TO WRITE — ' + failed + ' edit(s) did not match.'); process.exit(1); }
if (!APPLY) { console.log('\nreport only; nothing written. Re-run with --apply.'); process.exit(0); }
fs.writeFileSync(FILE, src.replace(/\n/g, '\r\n'), 'utf8');
const back = fs.readFileSync(FILE, 'utf8');
const crlf = (back.match(/\r\n/g) || []).length, lf = (back.match(/\n/g) || []).length;
console.log('wrote — lines ' + back.split('\n').length + ', CRLF ' + crlf + ', LF ' + lf + (crlf === lf ? ' (pure CRLF)' : ' (MIXED)'));
