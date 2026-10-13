/* Stops the last three screens that answer an unknown id with somebody else's
   record. 4eb3400 fixed providerBookingDetail and adminProviderManagementProfile;
   the same sweep left these three, all of which break the same way — only on an id
   that the lists never hand out, which is why no tap has ever found them.
     node tools/fix-remaining-id-substitutions.cjs            */
const fs = require('fs');
const path = require('path');

const TARGET = path.join(__dirname, '..', 'Sukinnect-next.html');
const src = fs.readFileSync(TARGET, 'utf8');
const wasCRLF = src.indexOf('\r\n') >= 0;
let lf = src.replace(/\r\n/g, '\n');

function sub(needle, replacement, expected) {
  const hits = lf.split(needle).length - 1;
  if (hits !== expected) {
    throw new Error('needle matched ' + hits + ' time(s), expected ' + expected + ' :: '
      + needle.slice(0, 70).replace(/\n/g, '\\n'));
  }
  lf = lf.split(needle).join(replacement);
}

/* Built from single-quoted concatenation: the replacements carry the app's own
   ${…} template syntax, which Node would interpolate inside a template literal. */
const D = '$' + '{';

/* 1 — the resident's booking detail. */
sub(
  "  const b = bookingsForResident().find(item => item.id === state.selectedBookingId) || bookingsForResident()[0];",
  [
    '  /* An id this account does not hold used to fall back to the first booking in the',
    '     list, so the screen painted one job\'s money, provider and payment state under a',
    '     reference that named another. Same rule as the provider\'s job screen. */',
    '  const b = bookingsForResident().find(item => item.id === state.selectedBookingId);',
    '  if (!b) return `',
    "  " + D + "screenHeader('Booking details', { back: \"state.tab='bookings'; render();\", backLabel: 'Back to bookings' })}",
    '  <div class="pad" style="background:var(--cloud);">',
    "    " + D + "emptyState('alert-triangle', 'That booking is not on this account', 'This profile has no record with that reference, so there is nothing here to show. Open one from Bookings.')}",
    '  </div>`;',
  ].join('\n'),
  1);

/* 2 — the review reads one applicant, or none. The render site is guarded first so
   the three action sites can share the shorter needle afterwards. */
sub(
  [
    'function verificationApplication(){',
    "  return PENDING_APPLICANTS.find(a => a.id === state.selectedVerificationId) || PENDING_APPLICANTS[0];",
    '}',
  ].join('\n'),
  [
    'function verificationApplication(){',
    '  /* No fallback applicant. The review screen, three actions and the undo all read',
    '     this, so answering an unknown id with whoever was first in the queue let a note,',
    '     a document state or an approval land on the wrong person — the exact thing the',
    '     per-applicant review records were built to prevent. */',
    "  return PENDING_APPLICANTS.find(a => a.id === state.selectedVerificationId) || null;",
    '}',
  ].join('\n'),
  1);

sub(
  [
    '  const app = verificationApplication();',
    '  const review = reviewOf(app.id);',
    '  const docs = applicationDocs(app.id);',
  ].join('\n'),
  [
    '  const app = verificationApplication();',
    '  const review = reviewOf(app.id);',
    '  const docs = applicationDocs(app.id);',
  ].join('\n'),
  1);

lf = lf.replace(
  [
    'function providerVerificationReview(){',
    '  const app = verificationApplication();',
    '  const review = reviewOf(app.id);',
  ].join('\n'),
  [
    'function providerVerificationReview(){',
    '  const app = verificationApplication();',
    '  if (!app) return `',
    "  " + D + "screenHeader('Verification progress', { back: \"state.tab='admin_verifications'; render();\", backLabel: 'Back to the queue' })}",
    '  <div class="pad" style="background:var(--cloud);">',
    "    " + D + "emptyState('alert-triangle', 'No application is open', 'The queue has no applicant with that reference, so there is nothing to review. Open one from Provider verification.')}",
    '  </div>`;',
    '  const review = reviewOf(app.id);',
  ].join('\n'));

/* 3 — the three action sites: refuse the action rather than decide for somebody else. */
sub(
  [
    '  const app = verificationApplication();',
    '  const review = reviewOf(app.id);',
  ].join('\n'),
  [
    '  const app = verificationApplication();',
    "  if (!app) { state.profileError = 'No application is open, so nothing can be recorded against one.'; render(); return; }",
    '  const review = reviewOf(app.id);',
  ].join('\n'),
  3);

/* 4 — every route into a public profile. */
sub(
  '  const p = PROVIDERS.find(x => x.id === providerId) || PROVIDERS[2];',
  [
    '  const p = PROVIDERS.find(x => x.id === providerId);',
    '  /* An unknown id used to open provider index 2 — her photo, her rate, her',
    '     credentials and her map pin — under whatever name was tapped. */',
    "  if (!p) { showToast('No provider carries that id'); return; }",
  ].join('\n'),
  1);

fs.writeFileSync(TARGET, wasCRLF ? lf.replace(/\n/g, '\r\n') : lf);
console.log('all five substitutions applied with their expected counts; '
  + (wasCRLF ? 'CRLF' : 'LF') + ' preserved.');
