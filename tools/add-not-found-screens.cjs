/* Splice the two not-found screens over the two silent fallbacks. The replacement text
   lives in snippet files because it is app template source full of ${…}, and a script
   whose needles get interpolated by Node matches nothing at all. */
const fs = require('fs');
const PATH = 'Sukinnect-next.html';
let src = fs.readFileSync(PATH, 'utf8').replace(/\r\n/g, '\n');
const write = process.argv.includes('--write');
let bad = 0;

/* Work in LF the whole way through and convert exactly once at the end. Converting the
   joined result with a global \n -> \r\n re-converts every line ending that was already
   CRLF, and the file comes back with a stray carriage return on every line — which is
   what this script did on its first run, and what the gate's doubled-CR check caught. */
function swap(name, find, snippetPath, expect) {
  const f = find.replace(/\r\n/g, '\n');
  const replace = fs.readFileSync(snippetPath, 'utf8').replace(/\r\n/g, '\n');
  const n = src.split(f).length - 1;
  if (n !== expect) { console.log('COUNT ' + n + ' (want ' + expect + ')  ' + name); bad++; return; }
  src = src.split(f).join(replace);
  console.log('ok  ' + name);
}

swap('the provider job screen stops substituting another client',
  '  const booking = findProviderBooking(state.selectedProviderBookingId) || bookingsForProvider()[0];',
  'tools/snippet-provider-not-found.js', 1);
swap('the admin profile stops substituting another provider',
  '  const provider = PROVIDERS.find(item => item.id === state.selectedAdminProvider) || PROVIDERS[0];',
  'tools/snippet-admin-not-found.js', 1);

if (bad) { console.log('\nnothing written. (If both report COUNT 0 the change is already in.)'); process.exit(1); }
src = src.replace(/\r\r\n/g, '\r\n').replace(/\n/g, '\r\n');
const still = ['|| bookingsForProvider()[0]', '=== state.selectedAdminProvider) || PROVIDERS[0]']
  .filter(s => src.includes(s));
console.log('fallbacks remaining: ' + (still.length ? still.join(' | ') : 'none'));
if (!write) { console.log('dry run — lines ' + src.split('\r\n').length); process.exit(0); }
fs.writeFileSync(PATH, src);
const chk = fs.readFileSync(PATH, 'utf8');
console.log('wrote — lines ' + chk.split(/\r\n/).length + ', CRLF ' + (chk.match(/\r\n/g) || []).length
  + ', LF ' + (chk.match(/\n/g) || []).length + ', doubled CR ' + (chk.match(/\r\r\n/g) || []).length);
