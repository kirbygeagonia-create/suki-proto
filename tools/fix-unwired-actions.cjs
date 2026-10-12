/* Every profile action that paints "Changes saved successfully" for a change that
   never happened, and every card that hard-codes what a record already owns.
   Measured by tools/probe-unwired-actions.js: nine action names render the hub's
   fallback body. Each edit below either routes the action to a screen that exists,
   gives it a real branch that writes a real field, or deletes the claim.
   Dry run by default; --write to apply. Every count is asserted. */
const fs = require('fs');
const PATH = 'Sukinnect-next.html';
const src = fs.readFileSync(PATH, 'utf8');
const write = process.argv.includes('--write');

const edits = [];
const E = (name, find, replace, expect) => edits.push({ name, find, replace, expect });

/* ── provider: the five actions with no branch ─────────────────────────────── */

/* The listing editor already exists and already knows how to edit: its title reads
   'Edit service' whenever state.listingDraft carries an id. editListing() builds that
   draft with an id and then calls a name nothing branches on. */
E('editListing reaches the listing editor',
  "  providerProfileAction('edit_service');",
  "  providerProfileAction('add_service');", 1);

/* One form holds rate, radius and hours; the three buttons that name one field each
   all opened a modal that reported a save. They now open the form that carries them. */
E('Edit Pricing opens the profile form',
  `onclick="providerProfileAction('pricing')">Edit Pricing</button>`,
  `onclick="providerProfileAction('edit')">Edit Pricing</button>`, 1);
E('Change Radius opens the profile form',
  `onclick="providerProfileAction('area')">Change Radius</button>`,
  `onclick="providerProfileAction('edit')">Change Radius</button>`, 1);
E('Edit Hours opens the profile form',
  `onclick="providerProfileAction('hours')">Edit Hours</button>`,
  `onclick="providerProfileAction('edit')">Edit Hours</button>`, 1);

/* ── provider: the payout account, hard-coded three times ──────────────────── */

E('payout card reads the record',
  `Current payout: <b>GCash (0918***4321)</b>`,
  `Current payout: <b>${'${'}esc(pp.bankAccount)}</b>`, 1);
E('payout hub row reads the record',
  `${'${'}row('payout','Payout & Earnings','GCash (0918***4321)') }`,
  `${'${'}row('payout', 'Payout & Earnings', pp.bankAccount)}`, 1);
/* The modal asked for a password or PIN it never collected and saved nothing. */
E('payout modal edits the account it shows',
  `modal==='payout'?` + '`<div style="font-size:var(--t-caption); margin-top:12px;">Current: GCash (0918***4321)<br><br>'
  + 'For security, confirm your password or PIN before changing payout account.</div>'
  + `<button class="btn btn-block"   onclick="state.providerProfileModal='saved'; render();">Continue</button>`,
  `modal==='payout'?` + '`<label class="form-label">Payout account'
  + '<input id="provider-payout-account" class="form-input" style="margin-top:6px;" value="'
  + `${'${'}esc(pp.bankAccount)}"`
  + '></label><div style="font-size:var(--t-caption); color:var(--mist); margin-top:8px; line-height:1.5;">'
  + 'This is where a payout would go. The prototype keeps it on this device and sends it nowhere.</div>'
  + `<button class="btn btn-block" onclick="savePayoutAccount()">Save payout account</button>`, 1);
E('savePayoutAccount writes the field the card reads',
  'function saveProviderProfessionalProfile(){',
  'function savePayoutAccount(){\r\n'
  + '  const el = document.getElementById(\'provider-payout-account\');\r\n'
  + '  if (!el || !el.value.trim()) return;\r\n'
  + '  state.providerProfileData.bankAccount = el.value.trim();\r\n'
  + '  persist();\r\n'
  + '  state.providerProfileModal = \'saved\';\r\n'
  + '  render();\r\n'
  + '}\r\n'
  + 'function saveProviderProfessionalProfile(){', 1);

/* ── the sign-in claims that survived one level up from the cards ──────────── */

E('the provider hub row stops reporting a PIN',
  `${'${'}row('security','Password & Sign-in','PIN enabled - 2FA enabled')}`,
  `${'${'}row('security', 'Password & Sign-in', 'Not stored on this device')}`, 1);
/* The card said changing a password updates the local view; there is no password in
   state for any view to read, so the control could only ever report a save. */
E('the provider security card keeps no password control',
  `list to report. Changing a password here updates the local view and nothing else.</div>`
  + `<button class="btn sm secondary" style="margin-top:8px;" onclick="providerProfileAction('password')">Change Password</button>`,
  `list to report.</div>`, 1);
E('the resident privacy card says what it does not keep',
  `Contact: your phone number is visible to a provider once they accept your request.`
  + `\r\n      </div>\r\n      <button class="btn sm secondary" style="margin-top:10px;"`
  + ` onclick="residentProfileAction('password')">Change password</button>`,
  `Contact: your phone number is visible to a provider once they accept your request.<br>`
  + `Sign-in: this prototype keeps no password, so there is nothing here to change.`
  + `\r\n      </div>`, 1);

/* ── resident: "Change method" now changes the method ──────────────────────── */
/* preferredPayment is a real field on profileData, and paymentMethods is a real array,
   so the button has a referent — it just had no screen. */
E('the resident hub grows an add_payment branch',
  '`<div style="font-size:var(--t-caption); color:var(--success-ink); margin-top:12px;">'
  + 'Changes saved successfully.</div><button class="btn btn-block"   onclick="'
  + 'state.residentProfileModal=null; render();">Close</button>`',
  `modal==='add_payment'?` + '`<label class="form-label">Preferred payment method'
  + '<select id="resident-preferred-payment" aria-label="Preferred payment method"'
  + ' style="width:100%; min-height:var(--tap); padding:9px; margin-top:6px;'
  + ' border:1px solid var(--line); border-radius:8px; font:inherit; font-size:var(--t-caption);">'
  + `${'${'}(state.profileData.paymentMethods||[]).map(m => '<option value="' + esc(m) + '"'`
  + ' + (m === state.profileData.preferredPayment ? \' selected\' : \'\') + \'>\' + esc(m) + \'</option>\').join(\'\')}'
  + '</select></label><div style="font-size:var(--t-caption); color:var(--mist); margin-top:8px;'
  + ' line-height:1.5;">A label for the provider to work against. No account is linked and no money moves here.</div>'
  + `<button class="btn btn-block" onclick="savePreferredPayment()">Save method</button>`
  + '`:'
  + '`<div style="font-size:var(--t-caption); color:var(--success-ink); margin-top:12px;">'
  + 'Changes saved successfully.</div><button class="btn btn-block"   onclick="'
  + 'state.residentProfileModal=null; render();">Close</button>`', 1);
E('savePreferredPayment writes the field the card reads',
  'function saveProviderProfessionalProfile(){',
  'function savePreferredPayment(){\r\n'
  + '  const el = document.getElementById(\'resident-preferred-payment\');\r\n'
  + '  if (!el || !el.value) return;\r\n'
  + '  state.profileData.preferredPayment = el.value;\r\n'
  + '  persist();\r\n'
  + '  state.residentProfileModal = \'saved\';\r\n'
  + '  render();\r\n'
  + '}\r\n'
  + 'function saveProviderProfessionalProfile(){', 1);

/* ── admin: three modals that claimed a configuration and two that wrote the audit log ── */

E('the login activity button opens the card that exists',
  `<button class="btn sm secondary" onclick="adminAccountAction('login_activity')">View Login Activity</button>`,
  `<button class="btn sm secondary" onclick="openProfileSection('admin','login_activity',`
  + `'Login activity','What this device records')">View Login Activity</button>`, 1);
/* The card below these buttons says the prototype keeps no authentication state; the
   buttons still said Change/Manage, which is a promise the modal then breaks. */
E('the admin security buttons name what they open',
  `<button class="btn sm secondary" onclick="adminAccountAction('pin')">Change PIN</button>`
  + `<button class="btn sm secondary" onclick="adminAccountAction('password')">Change Password</button>`
  + `<button class="btn sm secondary" onclick="adminAccountAction('twofa')">Manage 2FA</button>`,
  `<button class="btn sm secondary" onclick="adminAccountAction('pin')">Security PIN</button>`
  + `<button class="btn sm secondary" onclick="adminAccountAction('password')">Password</button>`
  + `<button class="btn sm secondary" onclick="adminAccountAction('twofa')">Two-factor</button>`, 1);
/* Six password inputs, none of them read, and a write to the audit log recording a
   change that did not happen — in the one place the app claims to keep a real record. */
E('the PIN modal holds no fields and logs nothing',
  `modal==='pin'?` + '`<input type="password" placeholder="Current PIN" style="width:100%; padding:9px; margin-top:12px;">'
  + '<input type="password" placeholder="New PIN" style="width:100%; padding:9px; margin-top:8px;">'
  + '<input type="password" placeholder="Confirm New PIN" style="width:100%; padding:9px; margin-top:8px;">'
  + `<button class="btn btn-block"   onclick="adminLog('Security PIN updated','Master Administrator','PIN updated');`
  + ` state.adminAccountModal='saved'; render();">Update PIN</button>`,
  `modal==='pin'?` + '`<div style="font-size:var(--t-caption); line-height:1.6; margin-top:10px;">'
  + 'This prototype signs in from the sample account and keeps no PIN, so there is nothing to change here'
  + ' and nothing to write to the Audit Log. A real deployment would store a hashed secret server-side and'
  + ' record the change as an audited action.</div>'
  + `<button class="btn btn-block" onclick="state.adminAccountModal=null; render();">Close</button>`, 1);
E('the password modal holds no fields and logs nothing',
  `modal==='password'?` + '`<div style="font-size:var(--t-caption); color:var(--mist); margin:10px 0;">'
  + 'Use at least 8 characters with a number and symbol.</div>'
  + '<input type="password" placeholder="Current Password" style="width:100%; padding:9px;">'
  + '<input type="password" placeholder="New Password" style="width:100%; padding:9px; margin-top:8px;">'
  + '<input type="password" placeholder="Confirm New Password" style="width:100%; padding:9px; margin-top:8px;">'
  + `<button class="btn btn-block"   onclick="adminLog('Password updated','Master Administrator','Password updated');`
  + ` state.adminAccountModal='saved'; render();">Update Password</button>`,
  `modal==='password'?` + '`<div style="font-size:var(--t-caption); line-height:1.6; margin-top:10px;">'
  + 'No password is stored, so nothing could be checked against it and nothing would change if you typed one.'
  + ' The sign-in screen reads the sample account directly.</div>'
  + `<button class="btn btn-block" onclick="state.adminAccountModal=null; render();">Close</button>`, 1);
E('the 2FA modal reports the absence instead of a status',
  `modal==='twofa'?` + '`<div style="font-size:var(--t-caption); line-height:1.6; margin-top:10px;">'
  + 'Status: <b style="color:var(--success-ink);">Enabled</b><br>Method: Authenticator App<br>'
  + '<span style="color:var(--mist);">Authentication secrets are not displayed in this prototype.</span></div>'
  + `<button class="btn sm secondary" style="margin-top:10px;" onclick="state.adminAccountModal='saved'; render();">Manage 2FA</button>`,
  `modal==='twofa'?` + '`<div style="font-size:var(--t-caption); line-height:1.6; margin-top:10px;">'
  + 'Status: <b>Not configured</b><br>No second factor exists to enable, and no secret is held to display.</div>'
  + `<button class="btn btn-block" onclick="state.adminAccountModal=null; render();">Close</button>`, 1);

E('the profile summary line reads the account too',
  `<br>Payout account: <b>GCash (0918***4321)</b>`,
  `<br>Payout account: <b>${'${'}esc(pp.bankAccount)}</b>`, 1);

/* The preview of a provider's own public card carried p1's rating and job count as
   literals: signed in as any other provider it still said 4.9 and 214. The records
   hold both figures for every provider, and the rest of the app already reads them. */
E('the public preview shows the signed-in provider',
  `${'${'}stars(4.9,12)}<span style="font-weight:700;">4.9</span>`
  + `<span style="color:var(--mist);">- 214 completed jobs</span>`,
  `${'${'}stars(providerOf({providerId:CURRENT_PROVIDER_ID}).rating,12)}`
  + `<span style="font-weight:700;">${'${'}providerOf({providerId:CURRENT_PROVIDER_ID}).rating}</span>`
  + `<span style="color:var(--mist);">- ${'${'}providerOf({providerId:CURRENT_PROVIDER_ID}).jobs}`
  + ` completed jobs</span>`, 1);
E('the preview badge comes from the badges on the record',
  `<div style="color:var(--success-ink); margin-top:6px;">ID Verified - Top Rated</div>`,
  `<div style="color:var(--success-ink); margin-top:6px;">`
  + `${'${'}esc(providerOf({providerId:CURRENT_PROVIDER_ID}).badges.join(' - '))}</div>`, 1);

/* ── the hub rows one level up: the same claims, in the list that opens them ── */
E('the admin security row stops reporting a PIN',
  `${'${'}row('security','Security & Sign-in','PIN enabled - 2FA enabled')}`,
  `${'${'}row('security', 'Security & Sign-in', 'Not stored on this device')}`, 1);
/* One row said two devices were signed in; the sheet it opens says this is the only
   session the prototype knows about. Both were on screen one tap apart. */
E('the admin sessions row reports the one session there is',
  `${'${'}row('sessions','Active Sessions','2 devices signed in')}`,
  `${'${'}row('sessions', 'Active Sessions', 'This device only')}`, 1);
E('the admin login row stops promising history',
  `${'${'}row('login_activity','Login Activity','Recent authentication activity')}`,
  `${'${'}row('login_activity', 'Login Activity', 'Nothing is recorded here')}`, 1);
E('the admin role row reads the field it describes',
  `${'${'}row('role','Role & Access','Super Administrator - Full Municipal Control')}`,
  `${'${'}row('role', 'Role & Access', ap.accessLevel)}`, 1);
E('the provider credentials row counts the documents',
  `${'${'}row('credentials','Credentials & Verification','ID verified - credential status')}`,
  `${'${'}row('credentials', 'Credentials & Verification', credentialSummaryFor(CURRENT_PROVIDER_ID).label)}`, 1);

/* ── run ───────────────────────────────────────────────────────────────────── */
let out = src, bad = 0;
for (const e of edits) {
  const n = out.split(e.find).length - 1;
  if (n !== e.expect) { console.log('COUNT ' + n + ' (want ' + e.expect + ')  ' + e.name); bad++; continue; }
  out = out.split(e.find).join(e.replace);
}
if (bad) { console.log('\n' + bad + ' of ' + edits.length + ' edits did not match — nothing written.'); process.exit(1); }
for (const e of edits) console.log('ok  ' + e.name);
const before = src.split(/\r\n/).length, after = out.split(/\r\n/).length;
const stray = ['GCash (0918***4321)</b>', 'PIN enabled - 2FA enabled', '2 devices signed in',
  "adminLog('Password updated'",
  "adminLog('Security PIN updated'", "confirm your password or PIN", "providerProfileAction('password')",
  "residentProfileAction('password')", "providerProfileAction('edit_service')", "providerProfileAction('pricing')",
  "providerProfileAction('area')", "providerProfileAction('hours')", 'placeholder="Current PIN"',
  'placeholder="Current Password"'];
const left = stray.filter(s => out.includes(s));
console.log('\nleftover claims: ' + (left.length ? left.join(' | ') : 'none'));
if (!write) { console.log('dry run — ' + before + ' lines, would be ' + after); process.exit(0); }
fs.writeFileSync(PATH, out);
const chk = fs.readFileSync(PATH, 'utf8');
console.log('wrote — lines ' + chk.split(/\r\n/).length + ', CRLF ' + (chk.match(/\r\n/g) || []).length
  + ', LF ' + (chk.match(/\n/g) || []).length + ' (pure CRLF if equal)');
