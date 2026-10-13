/* The rule "an unknown id never answers with somebody else's record" was applied to
   five screens and enforced at the storage door, but the lookups underneath every
   screen still fell back to a real row: providerOf() → PROVIDERS[0], the signed-in
   lookup → PROVIDERS[0], serviceMeta() → SERVICES[0], the chat counterpart →
   PROVIDERS[0], the concierge sort → CONCIERGE_SORTS[2], a stale choice index →
   the first option. This puts each fallback back, one at a time, and requires the
   named gate check to fail. A mutant every check survives means the check is not
   looking — and a mutant that no call site can reach is dropped rather than kept to
   make the count look bigger.
     node tools/falsify-identity-fallbacks.cjs                                            */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'Sukinnect-next.html');
const original = fs.readFileSync(TARGET, 'utf8');

/* Single-line needles: the file is CRLF, so a needle carrying \n matches nothing and
   the mutant prints SKIP while looking like a clean run. */
const SEAM = 'a provider record that is gone leaves no identity behind';
const ROOM = 'a chat room with one side missing keeps both out of it';
const PROFILE = 'the resident’s provider profile shows nobody rather than somebody else';
const CHOICE = 'a stale choice index cannot record a method nobody picked';
const CONCIERGE = 'the concierge sorts what it can read and refuses the rest';
/* Three separate rules live behind the profile door, so three separate labels: a harness
   that reports the same victim for every mutant proves nothing about which one fired. */
const DOOR = 'a profile field that changed kind is refused and named';
const PROMO = 'a dump cannot teach the app a field it never had';
const KIND = 'money that arrives as a word is refused at the door';
const MUTANTS = [
  { name: 'providerOf falls back to the first provider on the roster', label: SEAM,
    apply: s => s.replace(
      'p.id === booking.providerId) || unknownProviderOf(booking);',
      'p.id === booking.providerId) || PROVIDERS[0];') },
  { name: 'the signed-in lookup answers the first provider again', label: SEAM,
    apply: s => s.replace(
      'return PROVIDERS.find(p => p.id === CURRENT_PROVIDER_ID) || null;',
      'return PROVIDERS.find(p => p.id === CURRENT_PROVIDER_ID) || PROVIDERS[0];') },
  { name: 'an unknown trade is drawn as Plumbing', label: SEAM,
    apply: s => s.replace(
      "return { id:null, askedFor:serviceId || null, label:'Service not on this roster',",
      "return { id:SERVICES[0].id, askedFor:serviceId || null, label:SERVICES[0].label,") },
  { name: 'an unknown category borrows the pilot trade’s behaviour', label: SEAM,
    apply: s => s.replace(
      'return Object.assign({}, CATEGORY_DEFAULTS, (svc && svc.behaviour) || {});',
      "return Object.assign({}, CATEGORY_DEFAULTS, (svc && svc.behaviour) || SERVICES.find(s => s.pilot).behaviour);") },
  { name: 'a job with no price on file is accepted at ₱0', label: SEAM,
    apply: s => s.replace(
      'if (provider.unknown && !listing) {', 'if (false && provider.unknown && !listing) {') },
  { name: 'the thread key is invented from the first provider and the demo resident', label: ROOM,
    apply: s => s.replace(
      'return provider && customer ? threadKeyOf(customer, provider) : null;',
      'return threadKeyOf(customer || CURRENT_CUSTOMER_ID, provider || PROVIDERS[0].id);') },
  { name: 'a tap may open one customer’s thread from another customer’s card', label: ROOM,
    apply: s => s.replace(
      'const counterpartIsTheOtherHalf = other.serviceId ? other.id === providerId : other.id === customerId;',
      'const counterpartIsTheOtherHalf = true;') },
  { name: 'the room wears the first provider when the id names nobody', label: ROOM,
    apply: s => s.replace(
      'const activeChat = chatCounterpart();',
      'const activeChat = chatCounterpart() || PROVIDERS[0];') },
  { name: 'a message typed into a room with no thread is filed anyway', label: ROOM,
    apply: s => s.replace(
      "if (!thread) { showToast('This room has no conversation on this device to write into'); return; }",
      "if (false) { showToast('This room has no conversation on this device to write into'); return; }") },
  { name: 'the room stops resolving who it is with from the ids on the thread', label: ROOM,
    apply: s => s.replace(
      'return PROVIDERS.find(p => p.id === id) || CUSTOMERS.find(c => c.id === id) || null;',
      'return null;') },
  { name: 'the provider profile falls back to index 2', label: PROFILE,
    apply: s => s.replace('function residentProviderDetail(){',
      'function residentProviderDetail(){ state.selectedProvider = state.selectedProvider || PROVIDERS[2];') },
  { name: 'a draft index is clamped for the picture but not written back', label: CHOICE,
    apply: s => s.replace('if (d && d[key] !== i) d[key] = i;', 'if (d && false) d[key] = i;') },
  { name: 'the sheet reads the payment row from the stale index again', label: CHOICE,
    apply: s => s.replace(
      '  const { days, times, pays, addrs, pay } = requestChoices(d);',
      "  const days = requestDays();\n  const times = REQUEST_TIMES;\n  const pays = requestPaymentOptions();\n  const addrs = state.profileData.savedAddresses || [state.profileData.address];\n  const pay = pays[d.payIdx] || pays[0];") },
  { name: 'an empty saved-address list stops falling back to the home address', label: CHOICE,
    apply: s => s.replace('  if (saved.length) return saved;', '  return saved;') },
  { name: 'a blank entry in the address list survives the filter', label: CHOICE,
    apply: s => s.replace("    ? state.profileData.savedAddresses.filter(a => typeof a === 'string' && a.trim())",
      '    ? state.profileData.savedAddresses') },
  { name: 'the listing index is left past the end of the provider’s own list', label: CHOICE,
    apply: s => s.replace(
      'if (d.listingIdx !== idx) d.listingIdx = idx;', 'if (false) d.listingIdx = idx;') },
  { name: 'the listing rail marks nothing while the terms price one row', label: CHOICE,
    apply: s => s.replace('requestPick((d.listingIdx || 0) === i,', 'requestPick(false,') },
  { name: 'a description nothing sorts is placed under Plumbing anyway', label: CONCIERGE,
    apply: s => s.replace('  }) || null;', '  }) || CONCIERGE_SORTS[2];') },
  { name: 'a briefing with no sort row asks the plumbing question', label: CONCIERGE,
    apply: s => s.replace('? CONCIERGE_SORTS.find(s => s.id === state.conciergeServiceId) || null',
      '? CONCIERGE_SORTS.find(s => s.id === state.conciergeServiceId) || CONCIERGE_SORTS[2]') },
  { name: 'an answer from another trade is appended to the briefing', label: CONCIERGE,
    apply: s => s.replace('const row = CONCIERGE_SORTS.find(r => r.id === sortId) || null;',
      'const row = CONCIERGE_SORTS.find(r => r.id === sortId) || CONCIERGE_SORTS[2];') },
  { name: 'an unsorted briefing still opens a category’s results', label: CONCIERGE,
    apply: s => s.replace('const s = SERVICES.find(x => x.id === state.conciergeServiceId) || null;',
      'const s = SERVICES.find(x => x.id === state.conciergeServiceId) || SERVICES[0];') },
  { name: 'the profile walks through the storage door entirely', label: DOOR,
    apply: s => s.replace('if (badProfile) return { restored:false,',
      'if (false && badProfile) return { restored:false,') },
  { name: 'a dump is allowed to teach the app a field it never had', label: PROMO,
    apply: s => s.replace('const extra = Object.keys(given).find(k => !(k in seed));',
      'const extra = Object.keys(given).find(k => false);') },
  { name: 'a field that changed kind is accepted because the seed is not consulted', label: KIND,
    apply: s => s.replace('const wrong = Object.keys(given).find(k => seedKind(seed[k]) !== seedKind(given[k]));',
      'const wrong = Object.keys(given).find(k => false);') },
];

function gateRun() {
  try {
    return { code: 0, out: execFileSync(process.execPath, [path.join(ROOT, 'tools', 'verify.cjs')],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) };
  } catch (err) {
    return { code: err.status === undefined ? -1 : err.status, out: (err.stdout || '') + (err.stderr || '') };
  }
}

let caught = 0, applied = 0;
try {
  for (const m of MUTANTS) {
    const mutated = m.apply(original);
    if (mutated === original) { console.log('SKIP    ' + m.name + '  (needle did not match)'); continue; }
    applied++;
    fs.writeFileSync(TARGET, mutated);
    const run = gateRun();
    const failed = run.code !== 0 && run.out.includes('FAIL  ' + m.label);
    if (failed) { caught++; console.log('CAUGHT  ' + m.name); }
    else console.log('MISSED  ' + m.name + '  (exit ' + run.code + ', named check '
      + (run.code !== 0 ? 'not the one that failed' : 'passed anyway') + ')');
  }
} finally {
  fs.writeFileSync(TARGET, original);
}
console.log('\n' + caught + ' of ' + applied + ' mutants caught; file restored.');
process.exit(caught === applied ? 0 : 1);
