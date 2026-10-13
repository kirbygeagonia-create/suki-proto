/* The escaping check caught the branch this pass added: a writable field referenced
   inside ${…}, compared rather than painted. Hoisting it into a helper means every
   value the interpolation can paint goes through esc(), with no raw field reference
   left inside the braces for a reader (or the audit) to mistake for a paint. */
const fs = require('fs');
const PATH = 'Sukinnect-next.html';
const src = fs.readFileSync(PATH, 'utf8');
const write = process.argv.includes('--write');
const Q = "'";                       // the file's own single quotes, unescaped here

const edits = [];
const E = (name, find, replace, expect) => edits.push({ name, find, replace, expect });

const INNER = [
  '>${(state.profileData.paymentMethods||[]).map(m => ',
  Q, '<option value="', Q, ' + esc(m) + ', Q, '"', Q, ' + (m === state.profileData.preferredPayment',
  ' ? ', Q, ' selected', Q, ' : ', Q, Q, ') + ', Q, '>', Q, ' + esc(m) + ', Q, '</option>', Q,
  ').join(', Q, Q, ')}',
].join('');

E('the option list is built by a helper that escapes every paint',
  INNER, '>${preferredPaymentOptions()}', 1);

E('the helper reads the current value once, locally',
  'function savePreferredPayment(){',
  [
    'function preferredPaymentOptions(){',
    '  const cur = state.profileData.preferredPayment;',
    '  return (state.profileData.paymentMethods || []).map(m =>',
    '    ' + Q + '<option value="' + Q + ' + esc(m) + ' + Q + '"' + Q + ' + (m === cur ? ' + Q + ' selected' + Q + ' : ' + Q + Q + ')',
    '    + ' + Q + '>' + Q + ' + esc(m) + ' + Q + '</option>' + Q + ').join(' + Q + Q + ');',
    '}',
    'function savePreferredPayment(){',
  ].join('\r\n'), 1);

let out = src, bad = 0;
for (const e of edits) {
  const n = out.split(e.find).length - 1;
  if (n !== e.expect) {
    console.log('COUNT ' + n + ' (want ' + e.expect + ')  ' + e.name);
    console.log('  looking for: ' + JSON.stringify(e.find.slice(0, 90)));
    bad++; continue;
  }
  out = out.split(e.find).join(e.replace);
}
if (bad) { console.log('\n' + bad + ' edit(s) did not match — nothing written.'); process.exit(1); }
for (const e of edits) console.log('ok  ' + e.name);
if (!write) { console.log('dry run'); process.exit(0); }
fs.writeFileSync(PATH, out);
const chk = fs.readFileSync(PATH, 'utf8');
console.log('wrote — lines ' + chk.split(/\r\n/).length + ', CRLF ' + (chk.match(/\r\n/g) || []).length
  + ', LF ' + (chk.match(/\n/g) || []).length);
