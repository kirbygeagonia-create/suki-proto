/* Throwaway: break each of the five profile-honesty rules the pass just added and
   require the gate to notice. The mutants put the old source back, not a caricature
   of it — a check that only fails on an absurd mutation proves nothing. */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'Sukinnect-next.html');
const pristine = fs.readFileSync(FILE);

function gate() {
  try {
    return { code: 0, out: execFileSync(process.execPath, [path.join(ROOT, 'tools/verify.cjs')],
      { encoding: 'utf8', stdio: 'pipe', cwd: ROOT }) };
  } catch (e) { return { code: e.status, out: (e.stdout || '') + (e.stderr || '') }; }
}

const REACH = 'every control a profile screen paints reaches a screen of its own';
const CLAIM = 'no profile row reports a sign-in state the app does not keep';
const PAYOUT = 'the payout account is read from the field that pays it';
const PREVIEW = 'the public preview is the signed-in provider, not a fixed one';
const METHOD = 'the change-method sheet offers the methods on the record';
const BADGES = 'the profile card shows the badges its provider actually holds';
const PREF = 'the preferences card offers no switch it cannot turn';
const NOTFOUND = 'an id outside the account shows nothing rather than someone else';

const mutants = [
  { name: 'Edit Pricing goes back to an action nothing branches on',
    from: `onclick="providerProfileAction('edit')">Edit Pricing</button>`,
    to: `onclick="providerProfileAction('pricing')">Edit Pricing</button>`,
    expect: REACH },
  { name: 'the payout card is typed again instead of read',
    from: `Current payout: <b>${'${'}esc(pp.bankAccount)}</b>`,
    to: `Current payout: <b>GCash (0918***4321)</b>`,
    expect: PAYOUT },
  { name: 'the provider hub row reports a PIN and a second factor',
    from: `row('security', 'Password & Sign-in', 'Not stored on this device')`,
    to: `row('security','Password & Sign-in','PIN enabled - 2FA enabled')`,
    expect: CLAIM },
  { name: 'the PIN modal takes a credential field and writes the audit log',
    from: 'keeps no PIN, so there is nothing to change here and nothing to write to the Audit Log.'
      + ' A real deployment would store a hashed secret server-side and record the change as an'
      + ' audited action.</div>',
    to: 'keeps no PIN, so nothing here is checked.</div>'
      + '<input type="password" placeholder="Current PIN" style="width:100%; padding:9px; margin-top:12px;">'
      + `<button class="btn btn-block"   onclick="adminLog('Security PIN updated','Master Administrator',`
      + `'PIN updated'); state.adminAccountModal='saved'; render();">Update PIN</button>`,
    expect: CLAIM },
  { name: 'the public preview goes back to one account’s figures',
    from: ['${stars(providerOf({providerId:CURRENT_PROVIDER_ID}).rating,12)}',
           '<span style="font-weight:700;">${providerOf({providerId:CURRENT_PROVIDER_ID}).rating}</span>',
           '<span style="color:var(--mist);">- ${providerOf({providerId:CURRENT_PROVIDER_ID}).jobs}',
           ' completed jobs</span>'].join(''),
    to: ['${stars(4.9,12)}', '<span style="font-weight:700;">4.9</span>',
         '<span style="color:var(--mist);">- 214 completed jobs</span>'].join(''),
    expect: PREVIEW },
  { name: 'the change-method branch is renamed away from its action',
    /* the backtick tells the body branch from the heading branch, which now share the name */
    from: "modal==='add_payment'?" + '`',
    to: "modal==='add_paymentX'?" + '`',
    expect: METHOD },
  /* The rail matched p1 exactly before this pass, so only a second account could prove
     it was reading a record. This mutant puts p1's two literals back. */
  { name: 'the badge rail goes back to one account’s chips',
    from: ['${providerOf({providerId:CURRENT_PROVIDER_ID}).badges.map(b => ',
           "'<span class=\"chip\">' + esc(b) + '</span>').join('')}",
           '</div>'].join(''),
    to: '<span class="chip">ID Verified</span><span class="chip">Top Rated</span></div>',
    expect: BADGES },
  { name: 'the preferences card grows a checkbox wired to nothing',
    from: '<div style="font-size:var(--t-caption); color:var(--mist); margin-top:8px; line-height:1.5;">'
      + 'There is no theme or density switch here to turn — this prototype has one layout and it '
      + 'follows the device.</div>',
    to: '<div class="row" style="font-size:var(--t-caption); margin-top:12px;">Compact Dashboard '
      + '<input type="checkbox"></div>',
    expect: PREF },
  /* The body branch and the heading branch are two separate ternaries in each hub; this
     deletes only the heading, which is how the picker ended up titled "Update". */
  { name: 'the payment-method picker loses its heading',
    from: `modal==='add_payment'?'Change payment method':`,
    to: ``,
    expect: REACH },
  /* The two silent fallbacks. Each mutant puts one back and expects the not-found check
     to catch a screen answering a foreign id with somebody else's record. */
  { name: 'the provider job screen falls back to the first job again',
    from: 'const booking = findProviderBooking(state.selectedProviderBookingId);',
    to: 'const booking = findProviderBooking(state.selectedProviderBookingId) || bookingsForProvider()[0];',
    expect: NOTFOUND },
  { name: 'the admin profile falls back to the first provider again',
    from: 'const provider = PROVIDERS.find(item => item.id === state.selectedAdminProvider) || null;',
    to: 'const provider = PROVIDERS.find(item => item.id === state.selectedAdminProvider) || PROVIDERS[0];',
    expect: NOTFOUND },
];

const base = gate();
if (base.code !== 0) {
  console.log('BASELINE NOT GREEN:\n' + base.out.split('\n').filter(l => l.startsWith('FAIL')).join('\n'));
  process.exit(1);
}
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
    const fl = r.out.split('\n').filter(l => l.startsWith('FAIL'));
    if (r.code !== 0 && fl.some(l => l.includes(m.expect))) {
      caught++;
      console.log('CAUGHT       ' + m.name);
      console.log('             ' + fl.join(' / ').slice(0, 150));
    } else if (r.code !== 0) console.log('PARTIAL      ' + m.name + ' — red elsewhere:\n               ' + fl.join(' / ').slice(0, 150));
    else console.log('MISSED       ' + m.name);
  }
} finally {
  fs.writeFileSync(FILE, pristine);
  const after = gate();
  console.log('\nrestored: ' + (after.code === 0 ? 'gate green again' : 'STILL FAILING'));
  console.log('mutants applied ' + applied + ', caught ' + caught + ', not applied ' + (mutants.length - applied));
}
