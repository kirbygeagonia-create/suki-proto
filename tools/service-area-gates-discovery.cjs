/* Service area was a string. The provider typed "3 km around Poblacion", the panel
   painted three green checks naming Poblacion, San Isidro and Barangay 2 for every one
   of the eight providers — so the fruit buyer in Buayan was shown covering three
   barangays he never declared — and the resident's barangay filter matched only where a
   provider lived, never where they said they work. Coverage is a record now, discovery
   reads it, and availability has a state that actually changes what a resident sees.
     node tools/service-area-gates-discovery.cjs                                        */
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
const D = '$' + '{';

/* ── 1. coverage as declared capability, one row per provider ─────────────────── */
const COVERAGE = {
  p1: ['Poblacion', 'San Isidro', 'San Jose', 'Barangay 2'],
  p2: ['San Isidro', 'Poblacion', 'Sta. Cruz'],
  p3: ['Poblacion', 'San Isidro', 'San Jose', 'Sta. Cruz', 'Barangay 2'],
  p4: ['Sta. Cruz', 'Poblacion', 'San Isidro'],
  p5: ['San Jose', 'Poblacion', 'Buayan'],
  p6: ['Poblacion', 'San Isidro', 'Sta. Cruz', 'San Jose', 'Barangay 2', 'Buayan'],
  p7: ['Buayan', 'Poblacion', 'San Jose'],
  p8: ['Poblacion', 'Buayan', 'San Jose', 'Sta. Cruz'],
};
const LITERALS = {
  p1: "id:'p1',name:'Ramil Odiada',service:'Plumbing',serviceId:'plumbing',barangay:'Poblacion',",
  p2: "id:'p2',name:'Jerico Salamat',service:'Electrical',serviceId:'electrical',barangay:'San Isidro',",
  p3: "id:'p3',name:'Cristy Fernandez',service:'Cleaning',serviceId:'cleaning',barangay:'Poblacion',",
  p4: "id:'p4',name:'Allan Buenaflor',service:'Appliance',serviceId:'appliance',barangay:'Sta. Cruz',",
  p5: "id:'p5',name:'Kristine Mae Dagohoy',service:'Tutoring',serviceId:'tutoring',barangay:'San Jose',",
  p6: "id:'p6',name:'Junjun Estrada',service:'Delivery',serviceId:'delivery',barangay:'Barangay 2',",
  p7: "id:'p7',name:'Erning Bautista',service:'Fruit Harvest & Buy',serviceId:'fruit',barangay:'Buayan',",
  p8: "id:'p8',name:'Maricel Tan',service:'Fruit Harvest & Buy',serviceId:'fruit',barangay:'Poblacion',",
};
Object.keys(LITERALS).forEach(id => {
  const list = COVERAGE[id].map(b => "'" + b + "'").join(',');
  sub(LITERALS[id], LITERALS[id] + 'servesBarangays:[' + list + '],', 1);
});

/* ── 2. discovery honours coverage, and a provider who is not taking work ──────── */
sub(
  'function providerMatches(){',
  [
    '/* A provider serves a barangay from their own record, not from where they happen to',
    '   live. The filter used to compare the resident\'s barangay against p.barangay, so a',
    '   plumber who travels three kilometres was invisible to the household on his edge —',
    '   which is the connection the product exists to make (slide 3: "a provider who can',
    '   actually serve their area"). */',
    'function providerServes(p, barangay){',
    "  if (!barangay) return true;",
    '  return p.barangay === barangay || (p.servesBarangays || []).includes(barangay);',
    '}',
    'function providerAccepting(p){',
    '  /* Only an explicit false hides a provider: the field is absent on every record that',
    '     has never been toggled, and a missing flag is not a refusal. */',
    '  return p.acceptingRequests !== false;',
    '}',
    '',
    'function providerMatches(){',
  ].join('\n'),
  1);

sub(
  [
    '    (!f.barangay || p.barangay === f.barangay) &&',
    '    (!f.maxWait || p.availabilityMin <= f.maxWait)',
  ].join('\n'),
  [
    '    (!f.barangay || providerServes(p, f.barangay)) &&',
    '    (!f.maxWait || p.availabilityMin <= f.maxWait) &&',
    '    providerAccepting(p)',
  ].join('\n'),
  1);

/* ── 3. the availability control reaches the record it claims to change ────────── */
sub(
  [
    'function setProviderAvailable() {',
    "  state.providerAvailability = 'Available';",
    '  persist();',
    '  render();',
    "  showToast('You are marked available - residents in your area see you now');",
    '}',
  ].join('\n'),
  [
    'function setProviderAvailable() {',
    "  state.providerAvailability = 'Available';",
    '  const me = PROVIDERS.find(p => p.id === CURRENT_PROVIDER_ID);',
    '  if (me) me.acceptingRequests = true;',
    '  persist();',
    '  render();',
    "  showToast('You are marked available - residents in your area see you now');",
    '}',
    '/* The pair. Until now the only control went available, so nothing could ever be',
    '   hidden and the toast\'s promise that residents would see you was unfalsifiable. */',
    'function setProviderBusy() {',
    "  state.providerAvailability = 'Busy';",
    '  const me = PROVIDERS.find(p => p.id === CURRENT_PROVIDER_ID);',
    '  if (me) me.acceptingRequests = false;',
    '  persist();',
    '  render();',
    "  showToast('You are marked busy - residents searching now are shown someone else');",
    '}',
  ].join('\n'),
  1);

sub(
  [
    '        Mark myself available',
    '      </button>',
  ].join('\n'),
  [
    '        ' + D + "(state.providerAvailability === 'Busy' ? 'Mark myself available' : 'Still marked available')}",
    '      </button>',
    '      ' + D + "(state.providerAvailability === 'Busy' ? '' : `<button class=\"btn sm secondary\" style=\"width:100%; margin-top:8px;\" onclick=\"setProviderBusy()\">Mark myself busy</button>`)}",
  ].join('\n'),
  1);

/* ── 4. the service-area panel reads the coverage record ───────────────────────── */
sub(
  '<br><span style="color:var(--success-ink); display:inline-flex; align-items:center; gap:2px;">'
    + D + 'ic("check",11)} Poblacion</span><br><span style="color:var(--success-ink); display:inline-flex; align-items:center; gap:2px;">'
    + D + 'ic("check",11)} San Isidro</span><br><span style="color:var(--success-ink); display:inline-flex; align-items:center; gap:2px;">'
    + D + 'ic("check",11)} Barangay 2</span>',
  D + 'coverageLines(providerOf({providerId:CURRENT_PROVIDER_ID}))}',
  1);

sub(
  'function credentialState(cred){',
  [
    '/* The barangays a provider is recorded as serving, from the record rather than three',
    '   names typed into markup. The base is marked, because a provider is always taken to',
    '   work where they live and the rest is travel. */',
    'function coverageLines(p){',
    '  const list = (p && p.servesBarangays) || [];',
    '  if (!list.length) return \'<br><span style="color:var(--mist);">No barangay coverage is recorded for this account.</span>\';',
    '  return list.map(b => \'<br><span style="color:var(--success-ink); display:inline-flex; align-items:center; gap:2px;">\'',
    '    + ic(\'check\', 11) + \' \' + esc(b)',
    "    + (b === p.barangay ? ' <span style=\"color:var(--mist);\">(base)</span>' : '')",
    "    + '</span>').join('');",
    '}',
    '',
    'function credentialState(cred){',
  ].join('\n'),
  1);

/* ── 5. the two claims that were not true of any record ────────────────────────── */
sub(
  '<br>Sunday: Unavailable',
  '<br><span style="color:var(--mist);">No day-by-day schedule is recorded, so nothing here claims a day you have not set.</span>',
  1);
sub(
  'Urgent requests reach you inside the service area you set under Service area — <b>' + D + 'esc(pp.serviceRadius)}</b>.',
  'Urgent requests reach you inside the barangays recorded under Service area. The radius you typed — <b>' + D + 'esc(pp.serviceRadius)}</b> — is your own description of that area; the list above is what discovery filters on.',
  1);

fs.writeFileSync(TARGET, wasCRLF ? lf.replace(/\n/g, '\r\n') : lf);
console.log('coverage recorded, discovery honours it, availability has a counterpart; '
  + (wasCRLF ? 'CRLF' : 'LF') + ' preserved.');
