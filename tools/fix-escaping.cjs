/* Close the escaping gap the audit found.

   The invariant is written above esc() itself: "Anything that came from the user is echoed back
   into the interface, so it stays data and never becomes markup." It held for chat and booking
   text and never held for the profile objects, which is the class the injection probe proved
   (5 of 5 probes built real elements out of a name field).

   Every edit asserts its own match count before writing anything, and the file is normalised to
   LF in memory and returned to CRLF on write, because a needle carrying a newline silently
   matches nothing in this repository's checkout.

   usage: node tools/fix-escaping.cjs --apply     (no flag = report only) */
const fs = require('fs');
const path = require('path');

const FILE = path.resolve('Sukinnect-next.html');
const APPLY = process.argv.includes('--apply');
const crlf = fs.readFileSync(FILE, 'utf8');
const LF = crlf.replace(/\r\n/g, '\n');
let src = LF;
const report = [];
let failed = 0;

function sub(label, needle, replacement, expected) {
  const hits = src.split(needle).length - 1;
  if (hits !== expected) {
    report.push('MISMATCH  ' + label + ': found ' + hits + ', expected ' + expected);
    failed++;
    return;
  }
  src = src.split(needle).join(replacement);
  report.push('ok        ' + label + ' (' + hits + ')');
}

/* ---- 1. esc() gains the apostrophe, so a single-quoted attribute is covered too */
sub('esc() also escapes a single quote',
  `  return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));`,
  `  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));`,
  1);

/* ---- 2. a helper for the one context esc() cannot serve: text going into an inline handler */
sub('jsStr() added beside esc()',
  `// One empty state for every list that can legitimately hold no rows: which`,
  `/* Text that has to travel inside an inline onclick is in two languages at once: the attribute
   is HTML, and what the browser hands to the JavaScript parser after decoding it is a string
   literal. esc() alone is wrong there — a double quote becomes &#39; which decodes back into a
   quote the attribute never sees, and a backslash is not touched at all. So quote for JavaScript
   first, then for HTML, in that order. settingsRow is the only place that needs it, because it
   is the only place that carries a label through a handler rather than through state. */
function jsStr(v){
  return esc(JSON.stringify(v == null ? '' : String(v)).slice(1, -1).replace(/'/g, "\\\\'"));
}

// One empty state for every list that can legitimately hold no rows: which`,
  1);

/* ---- 3. settingsRow: its onclick carried user text through a single-quote patch */
sub('settingsRow quotes its handler and escapes its paint',
  `  const act = \`openProfileSection('\${PROFILE_ROLE[sectionKey] || sectionKey}','\${id}',\`
    + \`'\${title.replace(/'/g,'&#39;')}','\${detail.replace(/'/g,'&#39;')}');\`;
  return \`<button type="button" class="job-row" onclick="\${act}" aria-label="\${title}: \${detail}">\`
    + \`<span style="min-width:0; flex:1;"><span class="jr-t">\${title}</span><span class="jr-s">\${detail}</span></span>\``,
  `  const act = \`openProfileSection('\${jsStr(PROFILE_ROLE[sectionKey] || sectionKey)}','\${jsStr(id)}',\`
    + \`'\${jsStr(title)}','\${jsStr(detail)}');\`;
  return \`<button type="button" class="job-row" onclick="\${act}" aria-label="\${esc(title)}: \${esc(detail)}">\`
    + \`<span style="min-width:0; flex:1;"><span class="jr-t">\${esc(title)}</span><span class="jr-s">\${esc(detail)}</span></span>\``,
  1);

/* ---- 4. emptyState: 5 call sites pass plain words, none passes markup */
sub('emptyState escapes its title and body',
  `    <div class="empty-title">\${title}</div>
    <div class="empty-body">\${body}</div>`,
  `    <div class="empty-title">\${esc(title)}</div>
    <div class="empty-body">\${esc(body)}</div>`,
  1);

/* ---- 5. the 43 literal profile-field sites */
const ALIAS_FIELDS = {
  rp: ['name', 'phone', 'address', 'barangay', 'emergencyContact', 'email', 'preferredPayment'],
  pp: ['name', 'phone', 'serviceRadius', 'workingHours', 'barangay', 'service', 'email'],
  ap: ['name', 'phone', 'email', 'officeLocation'],
};
let fieldTotal = 0;
for (const [alias, fields] of Object.entries(ALIAS_FIELDS)) {
  for (const f of fields) {
    const needle = '$' + '{' + alias + '.' + f + '}';
    const hits = src.split(needle).length - 1;
    if (!hits) { report.push('MISMATCH  ' + needle + ': found 0, expected at least 1'); failed++; continue; }
    src = src.split(needle).join('$' + '{esc(' + alias + '.' + f + ')}');
    fieldTotal += hits;
    report.push('ok        ' + needle.padEnd(28) + 'wrapped ' + hits);
  }
}
for (const f of ['type', 'service', 'description']) {
  const needle = '$' + '{item.' + f + '}';
  const hits = src.split(needle).length - 1;
  if (!hits) { report.push('MISMATCH  ' + needle + ': found 0'); failed++; continue; }
  src = src.split(needle).join('$' + '{esc(item.' + f + ')}');
  fieldTotal += hits;
  report.push('ok        ' + needle.padEnd(28) + 'wrapped ' + hits);
}
/* The nickname is the one field with a fallback inside the interpolation, so it is not a
   bare `${item.x}` — wrapping the whole expression is what keeps the fallback a string.
   Built by concatenation because the needle itself contains both ${ and a quote. */
const NICK_FROM = '${' + "item.nickname || 'Household item'" + '}';
const NICK_TO = '${' + "esc(item.nickname || 'Household item')" + '}';
sub('household nickname', NICK_FROM, NICK_TO, 1);

/* ---- 6. the rating on the header pill, and the comment that mis-stated why */
sub('on-dark stars use the token built for them',
  `  .stars.on-dark .fill{ color:var(--gold); }`,
  `  .stars.on-dark .fill{ color:var(--rating-on-dark); }`,
  1);
sub('the --rating-on-dark comment says what measures true',
  `    /* rating gold on brand-navy surfaces: #FFB800 is only 4.1:1 there, so the
       on-dark star text uses this lighter tint (72). */`,
  `    /* The provider-detail header pill sits on the brand gradient lightened by a 12%
       white overlay, and #FFB800 measures 3.14:1 there — over the 3:1 floor a graphic
       needs, by 0.14. This tint measures 3.80:1. On flat navy #FFB800 is 11.66:1, so
       navy was never the problem; the earlier version of this note said it was. */`,
  1);

/* ---- 7. a legacy alias with no call site left */
sub('the unused --deep-700 alias is gone',
  `    --deep-700:var(--brand-navy-deep);\n`, ``, 1);

console.log(report.join('\n'));
console.log('\nfield sites wrapped: ' + fieldTotal);
if (failed) { console.log('\nREFUSING TO WRITE — ' + failed + ' edit(s) did not match the expected count.'); process.exit(1); }
if (!APPLY) { console.log('\nreport only; nothing written. Re-run with --apply.'); process.exit(0); }

fs.writeFileSync(FILE, src.replace(/\n/g, '\r\n'), 'utf8');
const back = fs.readFileSync(FILE, 'utf8');
const crlfCount = (back.match(/\r\n/g) || []).length, lfCount = (back.match(/\n/g) || []).length;
console.log('wrote ' + path.basename(FILE) + ' — lines ' + back.split('\n').length +
  ', CRLF ' + crlfCount + ', LF ' + lfCount + (crlfCount === lfCount ? ' (pure CRLF, as checked out)' : ' (MIXED ENDINGS — investigate)'));
