/* Splice the decided-applications section in and correct the two console counts that
   stopped agreeing with the queue when approvals started meaning something.
   Anchors are built by concatenation: every one of them contains ${ or a backtick, and a
   script whose needles are interpolated by Node matches nothing at all. */
const fs = require('fs');
const PATH = 'Sukinnect-next.html';
let src = fs.readFileSync(PATH, 'utf8');
const write = process.argv.includes('--write');
const B = '`';
let failed = 0;

function patch(name, find, replace, expect) {
  const f = find.replace(/\n/g, '\r\n'), r = replace.replace(/\n/g, '\r\n');
  const n = src.split(f).length - 1;
  if (n !== expect) { console.log('COUNT ' + n + ' (want ' + expect + ')  ' + name); failed++; return; }
  src = src.split(f).join(r);
  console.log('ok  ' + name);
}

/* 1. the new section, verbatim from its own file */
const snippet = fs.readFileSync('tools/snippet-admin-decided.js', 'utf8')
  .replace(/\r\n/g, '\n').trimEnd() + '\n\n';
patch('the decided-applications section is defined',
  'function adminVerifications(){',
  snippet.replace(/\n/g, '\r\n') + 'function adminVerifications(){', 1);

/* 2. the tab, counting from the same predicate the section uses */
patch('the screen counts the decided applications once',
  "  const category = state.adminProviderCategory || 'verified';",
  "  const decidedList = PENDING_APPLICANTS.filter(a => REVIEW_STATUSES.indexOf(reviewOf(a.id).status) > 1);\n"
  + "  const category = state.adminProviderCategory || 'verified';", 1);
patch('the tab rail offers Decided',
  '>Credentials</button>',
  '>Credentials</button>\n      <button class="seg-btn ${category === \'decided\' ? \'on\' : \'\'}"'
  + ' onclick="state.adminProviderCategory=\'decided\'; render();">Decided'
  + ' <span class="seg-count">${decidedList.length}</span></button>', 1);

/* 3. the branch */
patch('the screen renders it',
  " : category === 'verified' ? " + B,
  " : category === 'decided' ? adminDecidedSection(decidedList) : category === 'verified' ? " + B, 1);

/* 4. the two counts that a decision now moves */
patch('the verified count is the roster that is actually verified',
  '  const verified = PROVIDERS.length;                       /* the demo roster is verified */',
  '  /* The record decides who is verified: two of the eight on the roster are suspended or\n'
  + '     still awaiting review, and the dashboard used to print the whole roster as the\n'
  + '     verified count beside a queue the same screen had just filtered down. */\n'
  + '  const verified = verifiedProviderList().length;', 1);
patch('the pending count is the queue',
  '  const pendingVerification = PENDING_APPLICANTS.length;',
  '  const pendingVerification = pendingApplicantList().length;', 1);

if (failed) { console.log('\n' + failed + ' step(s) did not match — nothing written.'); process.exit(1); }
src = src.replace(/\r\r\n/g, '\r\n');
if (!write) { console.log('\ndry run — lines ' + src.split('\r\n').length); process.exit(0); }
fs.writeFileSync(PATH, src);
const chk = fs.readFileSync(PATH, 'utf8');
console.log('wrote — lines ' + chk.split(/\r\n/).length + ', CRLF ' + (chk.match(/\r\n/g) || []).length
  + ', LF ' + (chk.match(/\n/g) || []).length + ', doubled CR ' + (chk.match(/\r\r\n/g) || []).length);
