/* Replace the deleted Performance verdict with an attention flag built from real conditions.

   adminProviderMeta used to carry a typed verdict ('Normal' / 'Monitor' / 'Needs Review') that
   no record supported, and two admin surfaces counted on it: the dashboard's "needs attention"
   tile and the verified roster's "N of these need a look". Deleting the verdict would have left
   both reading undefined — which is what the render check caught.

   The replacement says what it is made of. A provider needs a look when something a record
   actually asserts is wrong: an open case, an expired or expiring document, or a suspended
   account. Nothing here is a judgement of the person. */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'Sukinnect-next.html');
const APPLY = process.argv.includes('--apply');
let src = fs.readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n');
const log = []; let failed = 0;
function sub(label, needle, replacement, expected) {
  const hits = src.split(needle).length - 1;
  if (hits !== expected) { log.push('MISMATCH  ' + label + ': found ' + hits + ', expected ' + expected); failed++; return; }
  src = src.split(needle).join(replacement); log.push('ok        ' + label + ' (' + hits + ')');
}

sub('adminProviderMeta gains a derived attention flag',
  `    verifiedAt: verified.verifiedAt || null,
    reviewer: verified.reviewer || null,
  };`,
  `    verifiedAt: verified.verifiedAt || null,
    reviewer: verified.reviewer || null,
    /* Three conditions a record can actually assert. Deliberately not a score: the old table
       carried a verdict with no source, and an admin tile that counts verdicts is worse than
       one that counts reasons. */
    reasons: [
      openCasesFor(provider.id).length ? openCasesFor(provider.id).length + ' open case' + (openCasesFor(provider.id).length === 1 ? '' : 's') : null,
      worstCredentialState(provider.id) === 'expired' ? 'an expired document' : worstCredentialState(provider.id) === 'expiring' ? 'a document expiring within ' + CONFIG.credentialWarnDays + ' days' : null,
      verified.status === 'suspended' ? 'a suspended account' : verified.status === 'pending' ? 'verification still pending' : null,
      !credentialsOf(provider.id).length ? 'no credentials on file' : null,
    ].filter(Boolean),
  };`, 1);

sub('the dashboard tile counts reasons',
  `needsAttention: PROVIDERS.filter(p => adminProviderMeta(p).performance !== 'Normal').length`,
  `needsAttention: PROVIDERS.filter(p => adminProviderMeta(p).reasons.length).length`, 1);

sub('the roster line counts the same thing',
  `<div style="font-size:var(--t-caption); color:\${visibleVerified.filter(p => adminProviderMeta(p).performance !== 'Normal').length ? 'var(--gold-600)' : 'var(--mist)'};">\${visibleVerified.filter(p => adminProviderMeta(p).performance !== 'Normal').length} of these need a look</div>`,
  `<div style="font-size:var(--t-caption); color:\${visibleVerified.filter(p => adminProviderMeta(p).reasons.length).length ? 'var(--gold-600)' : 'var(--mist)'};">\${visibleVerified.filter(p => adminProviderMeta(p).reasons.length).length} of these need a look — an open case, a document expiring or expired, a suspended account, or no credentials on file</div>`, 1);

/* the profile's account grid now has room for the reason it used to give a verdict for */
sub('the profile states the reason, not a rating of the person',
  `<div>Credential<br><b>\${esc(meta.credential)}</b></div>`,
  `<div>Credential<br><b>\${esc(meta.credential)}</b></div><div>Needs a look<br><b>\${meta.reasons.length ? esc(meta.reasons.join(', ')) : 'nothing on file'}</b></div>`, 1);

const leftover = src.match(/\.performance\s*!==\s*'Normal'/g) || [];
log.push('\nremaining verdict comparisons: ' + (leftover.length ? leftover.length : 'none'));
if (leftover.length) failed++;

console.log(log.join('\n'));
if (failed) { console.log('\nREFUSING TO WRITE.'); process.exit(1); }
if (!APPLY) { console.log('\nreport only. Re-run with --apply.'); process.exit(0); }
fs.writeFileSync(FILE, src.replace(/\n/g, '\r\n'), 'utf8');
console.log('wrote — lines ' + fs.readFileSync(FILE, 'utf8').split('\n').length);
