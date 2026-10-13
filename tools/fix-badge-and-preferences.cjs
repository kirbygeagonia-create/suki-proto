/* Three more instances of the same class, found while reading the markup the camera
   finally reached: the provider's own profile card states two badges as literals, so
   seven of the eight providers are shown a "Top Rated" claim no record makes and are
   hidden the badges they do have; the admin card dates the account from nothing; and the
   preferences card offers a checkbox wired to no state at all.
   Dry run by default; --write to apply. */
const fs = require('fs');
const PATH = 'Sukinnect-next.html';
const src = fs.readFileSync(PATH, 'utf8');
const write = process.argv.includes('--write');

const edits = [];
const E = (name, find, replace, expect) => edits.push({ name, find, replace, expect });
const Q = "'";
/* The app's own text, assembled without a template literal: a ${ that opens inside one
   has to close inside the same literal, and this replacement spans several pieces. */
const BADGE_REPL = [
  '<div style="display:flex; justify-content:center; gap:6px; margin-top:10px;">',
  '${providerOf({providerId:CURRENT_PROVIDER_ID}).badges.map(b => ',
  Q, '<span class="chip">', Q, ' + esc(b) + ', Q, '</span>', Q, ').join(', Q, Q, ')}',
  '</div>',
].join('');

E('the profile card draws the badges on the record',
  `<div style="display:flex; justify-content:center; gap:6px; margin-top:10px;">`
  + `<span class="chip">ID Verified</span><span class="chip">Top Rated</span></div>`,
  BADGE_REPL, 1);

/* A date the card asserted with no field behind it, one line below the four fields the
   card does edit. It becomes a record the card reads, the way credentials and
   verification did. */
E('the admin account gains the date it reports',
  "    accessLevel: 'Super Administrator / Full Municipal Control',",
  "    accessLevel: 'Super Administrator / Full Municipal Control',\r\n"
  + "    since: 'January 2025',", 1);
E('the admin card reads that date instead of typing it',
  `<br>Administrator since: <b>January 2025</b>`,
  `<br>Administrator since: <b>${'${'}esc(ap.since)}</b>`, 1);

/* The only control on the card that answers to nothing: ticking it changes no state,
   paints no difference, and persists nothing. Saying so is shorter than inventing a
   density mode the prototype does not have. */
E('the preferences card stops offering a switch it has no state for',
  `<div class="row" style="font-size:var(--t-caption); margin-top:12px;">Appearance <b>System Default</b></div>`
  + `<div class="row" style="font-size:var(--t-caption); margin-top:12px;">Compact Dashboard <input type="checkbox"></div>`,
  `<div class="row" style="font-size:var(--t-caption); margin-top:12px;">Appearance <b>System default</b></div>`
  + `<div style="font-size:var(--t-caption); color:var(--mist); margin-top:8px; line-height:1.5;">`
  + 'There is no theme or density switch here to turn — this prototype has one layout and it follows the device.</div>', 1);

let out = src, bad = 0;
for (const e of edits) {
  const find = e.find.replace(/\n/g, '\r\n');
  const replace = e.replace.replace(/\n/g, '\r\n');
  const n = out.split(find).length - 1;
  if (n !== e.expect) {
    console.log('COUNT ' + n + ' (want ' + e.expect + ')  ' + e.name);
    console.log('  looking for: ' + JSON.stringify(find.slice(0, 90)));
    bad++; continue;
  }
  out = out.split(find).join(replace);
}
if (bad) { console.log('\n' + bad + ' edit(s) did not match — nothing written.'); process.exit(1); }
for (const e of edits) console.log('ok  ' + e.name);
const left = ['<span class="chip">Top Rated</span>', 'Administrator since: <b>January 2025</b>',
  '<input type="checkbox">'].filter(s => out.includes(s));
console.log('\nleftover: ' + (left.length ? left.join(' | ') : 'none'));
if (!write) { console.log('dry run'); process.exit(0); }
fs.writeFileSync(PATH, out);
const chk = fs.readFileSync(PATH, 'utf8');
console.log('wrote — lines ' + chk.split(/\r\n/).length + ', CRLF ' + (chk.match(/\r\n/g) || []).length
  + ', LF ' + (chk.match(/\n/g) || []).length);
