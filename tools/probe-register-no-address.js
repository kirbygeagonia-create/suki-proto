/* One expression the camera evaluates inside a real page:
     node tools/shot.cjs --probe=@tools/probe-register-no-address.js --only=login-register
   §3f item: "a booking with no address". The registration form collects a name, an email, a password
   and a BARANGAY — there is no street-address field, and the profile hub offers no way to delete the
   last saved address (measured: zero delete affordances in the file). So what does a genuinely new
   account hold in `profileData.address`, and what happens when it tries to book?

   Two bad answers were possible and only walking the path separates them. The first is inheritance:
   the new account quietly keeps the demo resident's address and the provider is sent to somebody
   else's door — the same class as `providerOf()` answering a dangling id with the plumber. The second
   is the `undefined` write this file already records once, where an empty rail paints nothing and the
   next request stores an address of `undefined`. The app's stated answer is a refusal
   ("This account has no address to book at"), which is honest — but a refusal is only real if a
   booking is NOT created, so the record count is read before and after.

   Everything here goes through painted controls: the fields are typed with insertText (a programmatic
   .value write is not a keystroke and Chrome treats it differently), the submit is the button the app
   painted, and the booking attempt opens through `openProviderDetail` — the entry the results screen
   uses — rather than by assigning a provider into state. */
(async () => {
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const typeInto = (el, text) => {
    if (!el) return false;
    el.focus();
    if (el.select) el.select();
    document.execCommand('delete', false, null);
    document.execCommand('insertText', false, text);
    return el.value === text;
  };
  const type = (id, text) => typeInto(document.getElementById(id), text);
  const fields = { 'reg-name': 'Nueva Residente', 'reg-brgy': 'Buayan',
    'login-email': 'nueva@example.com', 'login-pass': 'demo1234' };
  const typed = Object.keys(fields).map(id => id + '=' + (type(id, fields[id]) ? 'ok' : 'ABSENT'));
  if (/ABSENT/.test(typed.join(' '))) return 'NO CONCLUSION — register fields not painted: ' + typed.join(' ');

  /* The auth submit is not an inline handler: render wires it by assignment
     (`document.getElementById('login-btn').onclick = submitAuth`), so asking the DOM for an
     onclick ATTRIBUTE finds nothing — which the probe reported as a refusal rather than as a
     silent skip. Same lesson as every other screen here: the control the app wired in code is
     still the control a thumb presses. */
  const btn = document.getElementById('login-btn')
    || [].slice.call(document.querySelectorAll('button'))
      .find(b => /submitAuth\(/.test(b.getAttribute('onclick') || ''));
  if (!btn) return 'NO CONCLUSION — no painted submit button (#login-btn) found on the register sheet';

  const profBefore = JSON.parse(JSON.stringify(state.profileData || {}));
  btn.click();
  await wait(1800);
  const pd = state.profileData || {};
  const inheritedAddress = !!(pd.address && pd.address === profBefore.address);
  const keptSaved = !!(pd.savedAddresses && pd.savedAddresses.length &&
    JSON.stringify(pd.savedAddresses) === JSON.stringify(profBefore.savedAddresses || []));

  /* Now try to book, through the results path. A plumbing trade rather than the fruit pilot: the
     fruit sheet legitimately refuses until harvesting-or-buying is chosen, so booking through it
     would answer a different question than the one asked here. */
  const prov = (typeof PROVIDERS !== 'undefined' ? PROVIDERS : []).find(p => /plumb/i.test(p.service || ''))
    || (typeof PROVIDERS !== 'undefined' ? PROVIDERS : [])[0];
  if (!prov) return 'NO CONCLUSION — no provider record to book with';
  openProviderDetail(prov.id, 'results');
  render();
  openBookingRequest();
  render();
  const addrs = requestAddressBook();
  const sheetText = ((document.querySelector('.sheet-layer') || {}).innerText || '').replace(/\s+/g, ' ');
  /* The sheet refuses a request with no description, and it is right to. Typing one is what a person
     does next; leaving it out made the run report "no booking created" for a reason that had nothing
     to do with the question being asked. */
  const desc = document.getElementById('request-service')
    || [].slice.call(document.querySelectorAll('.sheet-layer textarea, .sheet textarea'))[0];
  const descTyped = typeInto(desc, 'Kitchen faucet keeps dripping into the basin');
  const bookingsBefore = BOOKINGS.length;
  const send = [].slice.call(document.querySelectorAll('.sheet-layer button, .sheet button'))
    .find(b => /submitBookingRequest\(\)/.test(b.getAttribute('onclick') || ''));
  const sendState = !send ? 'NO SEND BUTTON PAINTED'
    : (send.disabled ? 'disabled' : 'enabled');
  if (send && !send.disabled) { send.click(); await wait(1600); }
  const live = BOOKINGS.filter(b => b.source === 'live');
  const newest = live.length ? live[live.length - 1] : null;

  return JSON.stringify({
    typed: typed.join(' '),
    role: pd.role || '-', name: pd.name || '-', brgy: pd.barangay || '-',
    addressAfterRegister: pd.address || '(empty)',
    savedAddressesAfterRegister: (pd.savedAddresses || []).length,
    inheritedAddressFromDemo: inheritedAddress,
    keptDemoSavedAddresses: keptSaved,
    paintedGreeting: (((document.querySelector('#screen h1') || {}).textContent) || '').trim().slice(0, 22),
    addressRailCount: addrs.length,
    sendButton: sendState,
    descriptionField: desc ? ('#' + (desc.id || 'textarea')) : 'ABSENT',
    descriptionTyped: descTyped,
    /* The submit has its own guards, and a run that reports "no booking created" without the reason
       is indistinguishable from a silent failure. Ask the state the handler writes. */
    requestError: String(state.requestError || '').slice(0, 70),
    submitting: !!state.requestSubmitting,
    refusalPainted: /no address to book at/i.test(sheetText),
    bookingsBefore: bookingsBefore, bookingsAfter: BOOKINGS.length,
    newRecordAddress: newest ? String(newest.address || '(empty)').slice(0, 30) : 'none created',
    sheetSnippet: sheetText.slice(0, 110)
  });
})()
