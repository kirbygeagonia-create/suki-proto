/* Take "Performance" out of the admin console, and put the provider's own credential list on
   the new records.

   Performance was one of three labels in adminProviderMeta with nothing behind it — no record
   says how well a provider is doing, only how their jobs resolved. A judgement with no source
   is not made honest by deriving it from a different number, so it is removed rather than
   recomputed, and the filter that keyed on it goes too. The credential filter already exists
   and now reads real expiry data, so nothing is lost that was ever true.

   Every edit asserts its own match count. */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'Sukinnect-next.html');
const APPLY = process.argv.includes('--apply');
let src = fs.readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n');
const log = [];
let failed = 0;

function sub(label, needle, replacement, expected) {
  const hits = src.split(needle).length - 1;
  if (hits !== expected) { log.push('MISMATCH  ' + label + ': found ' + hits + ', expected ' + expected); failed++; return; }
  src = src.split(needle).join(replacement);
  log.push('ok        ' + label + ' (' + hits + ')');
}

/* a verification sentence, from the record */
sub('providerVerificationLine helper',
  'function isVerifiedProvider(p){',
  `function providerVerificationLine(providerId){
  const p = PROVIDERS.find(x => x.id === providerId);
  const v = (p && p.verification) || {};
  if (v.status === 'verified') return 'Verified ' + shortDate(v.verifiedAt) + ' by ' + (v.reviewer || 'the platform');
  if (v.status === 'suspended') return 'Suspended — see the admin console';
  if (v.status === 'pending') return 'Awaiting review';
  return 'Not verified';
}
function isVerifiedProvider(p){`, 1);

/* 1. the grid cell becomes a real dimension */
sub('grid cell: Performance -> Credential',
  '<div>Performance<br><b>${meta.performance}</b></div>',
  '<div>Credential<br><b>${esc(meta.credential)}</b></div>', 1);

/* 2. the sentence that branched on the judgement */
sub('review sentence reads the records',
  "${meta.performance==='Normal' ? 'This provider maintains a high completion rate, strong customer rating, and low cancellation rate.' : 'Performance needs administrator review. Review recent jobs and complaints before taking action.'}",
  "${meta.complaints ? meta.complaints + ' open case' + (meta.complaints === 1 ? '' : 's') + ' on this provider.' : 'No open cases on this provider.'} Completion and cancellation are counted from the jobs on this device, not from a rating of the person.", 1);

/* 3+4+5. the filter: predicate, state key, control, and the count on the button */
sub('filter predicate drops Performance',
  "(state.adminVerifiedPerformance === 'all' || meta.performance.toLowerCase().replace(' ','-') === state.adminVerifiedPerformance) && ",
  '', 1);
sub('state key removed',
  "adminVerifiedPerformance:'all',\n", '', 1);
sub('filter reset drops the removed key',
  "state.adminVerifiedPerformance='all'; ", '', 1);
sub('filter control removed',
  '<label>Performance<select onchange="state.adminVerifiedPerformance=this.value; render();" style="width:100%; padding:7px; margin-top:3px;"><option value="all">All</option><option value="normal">Normal</option><option value="monitor">Monitor</option><option value="needs-review">Needs Review</option></select></label>',
  '', 1);
sub('filter count reads one dimension',
  "Filter${(state.adminVerifiedPerformance !== 'all' || state.adminVerifiedCredential !== 'all') ? 's (1)' : ''}",
  "Filter${state.adminVerifiedCredential !== 'all' ? ' (1)' : ''}", 1);

/* 6. the chip in the verified list */
sub('performance chip removed',
  "<span class=\"chip\" style=\"background:${meta.performance==='Normal'?'var(--success-100)':meta.performance==='Monitor'?'var(--warning-100)':'var(--error-100)'}; color:${meta.performance==='Normal'?'var(--success-ink)':meta.performance==='Monitor'?'var(--warning-ink)':'var(--error-ink)'};\">${meta.performance}</span>",
  `<span class="chip" style="background:\${meta.credentialCode==='expired'?'var(--error-100)':meta.credentialCode==='expiring'?'var(--warning-100)':'var(--success-100)'}; color:\${meta.credentialCode==='expired'?'var(--error-ink)':meta.credentialCode==='expiring'?'var(--warning-ink)':'var(--success-ink)'};">\${esc(meta.credential)}</span>`, 1);

/* 7. the provider's own credentials module, from the records */
const NEW_MODULE = fs.readFileSync(path.join(ROOT, 'tools/.provider-credentials-module.txt'), 'utf8')
  .replace(/\r\n/g, '\n').replace(/\s+$/, '');
const OLD_MODULE_START = "section === 'credentials' ? `<div class=\"card\"><b>Credentials &amp; Verification</b><div class=\"card-body\">ID Verification";
const oi = src.indexOf(OLD_MODULE_START);
if (oi < 0) { log.push('MISMATCH  the provider credentials module was not found'); failed++; }
else {
  const oe = src.indexOf("` : section === 'reputation'", oi);
  if (oe < 0) { log.push('MISMATCH  could not bound the provider credentials module'); failed++; }
  else { src = src.slice(0, oi) + NEW_MODULE + src.slice(oe + 2); log.push('ok        provider credentials module reads CREDENTIALS (1)'); }
}

/* 'NBI Clearance - ' on its own is too loose: the applicant document checklist legitimately
   says "NBI Clearance - Missing" for someone who has not submitted one. The invented block is
   the one that pairs the name with a styled status. */
const leftovers = ['meta.performance', 'adminVerifiedPerformance', 'Expires in 23 days',
  'NBI Clearance - <b', 'ID Verification - ', 'March 14, 2026'];
const present = leftovers.filter(s => src.includes(s));
log.push('\nleftover references: ' + (present.length ? present.join(' | ') : 'none'));
if (present.length) failed++;

console.log(log.join('\n'));
if (failed) { console.log('\nREFUSING TO WRITE.'); process.exit(1); }
if (!APPLY) { console.log('\nreport only. Re-run with --apply.'); process.exit(0); }
fs.writeFileSync(FILE, src.replace(/\n/g, '\r\n'), 'utf8');
const back = fs.readFileSync(FILE, 'utf8');
const crlf = (back.match(/\r\n/g) || []).length, lf = (back.match(/\n/g) || []).length;
console.log('wrote — lines ' + back.split('\n').length + ', CRLF ' + crlf + ', LF ' + lf + (crlf === lf ? ' (pure CRLF)' : ' (MIXED)'));
