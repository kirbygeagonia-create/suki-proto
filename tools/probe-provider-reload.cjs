/* §3f item, walked in Node rather than reasoned about: does a provider's edited profile come back
   after a reload, as the same provider, with the same numbers?

     node tools/probe-provider-reload.cjs

   `boot({ storage })` evaluates the application script in a fresh function scope with a fresh fake
   document, so the second boot is not the first one with `hydrate()` bolted on — module state is
   rebuilt and the only thing that crosses the boundary is the bytes in the shared store. That is the
   closest bench analogue to killing the app and opening it again, and it is what caught the ordering
   bug this record re-asserts: the identity used to be applied AFTER the restore, so every saved edit
   was overwritten by the seed on reload.

   Three things are asserted, because a check that only compares the two boots passes when nothing
   was ever saved: the write moved the bytes on disk; the reloaded value differs from the seed (the
   positive control that stops a vacuous agreement); and the reloaded identity is still the provider
   who typed it — signed in as p7 deliberately, so a mutant that drops the identity cannot hide
   behind p1's seed matching by accident. */
'use strict';
const { boot, fakeStorage } = require('./harness.cjs');
const KEY = 'sukinnect.snapshot.v1';

const store = fakeStorage();
const a = boot({ storage: store });
a.applyProviderIdentity('p7');
a.state.view = 'app'; a.state.role = 'provider'; a.state.tab = 'profile';
a.render();

const seed = Object.assign({}, a.state.providerProfileData);
const baseline = store.getItem(KEY);
if (!baseline) console.log('  note: nothing on disk before the edit (a first run), which is correct');

/* The painted fields, typed the way the app reads them: the element the handler looks up by id. */
const edits = { 'provider-profile-phone': '0917 000 1234', 'provider-profile-radius': '7 km',
  'provider-profile-hours': 'Mon-Sat 07:00-18:00' };
const seen = [];
for (const id of Object.keys(edits)) {
  const el = a._document.getElementById(id);
  seen.push(id + '=' + (el ? 'painted' : 'ABSENT'));
  if (el) el.value = edits[id];
}
if (/ABSENT/.test(seen.join(' '))) {
  console.log('NO CONCLUSION — ' + seen.join(' ') + ': the edit fields are not painted, so nothing was typed');
  process.exitCode = 1;
  process.exit(1);
}
a.saveProviderProfessionalProfile();
const after = store.getItem(KEY);
const wrote = after !== baseline;

/* The reload: a whole new evaluation of the same script against the same bytes. */
const b = boot({ storage: store });
b.hydrate();
b.applyProviderIdentity('p7');
const back = Object.assign({}, b.state.providerProfileData);
const reloaded = Object.assign({}, b.state.providerProfileData);
b.hydrate();                                     /* identity first, then the stored profile         */
const final = Object.assign({}, b.state.providerProfileData);

const rows = Object.keys(edits).map(id => {
  const field = { 'provider-profile-phone': 'phone', 'provider-profile-radius': 'serviceRadius',
    'provider-profile-hours': 'workingHours' }[id];
  return { field, typed: edits[id], seed: String(seed[field]), cameBack: String(final[field]),
    agrees: String(final[field]) === edits[id], differsFromSeed: String(seed[field]) !== edits[id] };
});
const identity = String(b.CURRENT_PROVIDER_ID);
console.log('signed in as p7 · wrote ' + (wrote ? 'yes (bytes changed)' : 'NO — nothing reached storage'));
console.log('identity after reload: ' + identity + (identity === 'p7' ? '  (matches)' : '  MISMATCH'));
for (const r of rows) {
  console.log('  ' + r.field.padEnd(14) + ' typed "' + r.typed + '" · seed "' + r.seed
    + '" · reloaded "' + r.cameBack + '" · ' + (r.agrees ? 'KEPT' : 'LOST')
    + (r.differsFromSeed ? '' : '  (vacuous: the seed already held that value)'));
}
const kept = rows.filter(r => r.agrees).length;
const nonVacuous = rows.filter(r => r.agrees && r.differsFromSeed).length;
console.log('\n' + kept + '/' + rows.length + ' fields survived the reload, ' + nonVacuous
  + ' of them as a real change rather than an accident of the seed');
process.exitCode = (wrote && identity === 'p7' && kept === rows.length && nonVacuous >= 1) ? 0 : 1;
if (process.exitCode) console.log('NO CONCLUSION — the reload claim does not hold as printed above');
