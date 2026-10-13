/* Stage 2a: the applicants become one record, and the admin's decisions become data.
   Functions are replaced by index (start line to the next column-0 `}`) rather than by
   literal, because these bodies run to a hundred lines each and a single drifted space
   would otherwise fail a match for the wrong reason. Every removal is asserted against
   text that had to be in what went away. */
const fs = require('fs');
const PATH = 'Sukinnect-next.html';
let src = fs.readFileSync(PATH, 'utf8');
const write = process.argv.includes('--write');
let failed = 0;

function replaceFunction(name, text, mustHave) {
  const lines = src.split('\r\n');
  const start = lines.findIndex(l => l.startsWith('function ' + name + '('));
  if (start < 0) { console.log('MISS   ' + name + ' — function not found'); failed++; return; }
  let end = -1;
  for (let i = start + 1; i < lines.length; i++) if (lines[i] === '}') { end = i; break; }
  if (end < 0) { console.log('MISS   ' + name + ' — no closing line'); failed++; return; }
  const removed = lines.slice(start, end + 1).join('\r\n');
  const missing = (mustHave || []).filter(s => !removed.includes(s));
  if (missing.length) {
    console.log('WRONG   ' + name + ' — the body being replaced does not hold: ' + missing.join(' | '));
    failed++; return;
  }
  const body = text.replace(/\n/g, '\r\n').split('\r\n');
  lines.splice(start, end - start + 1, ...body);
  src = lines.join('\r\n');
  console.log('ok      ' + name + '  (replaced ' + (end - start + 1) + ' lines, removed ' +
    removed.length + ' chars)');
}

function patch(name, find, replace, expect) {
  const f = find.replace(/\n/g, '\r\n'), r = replace.replace(/\n/g, '\r\n');
  const n = src.split(f).length - 1;
  if (n !== expect) { console.log('COUNT   ' + n + ' (want ' + expect + ')  ' + name); failed++; return; }
  src = src.split(f).join(r);
  console.log('ok      ' + name);
}

/* ── one applicant record ──────────────────────────────────────────────────── */
replaceFunction('verificationApplication', `/* The roster and the review screen used to carry separate copies of the same three
   people, and they disagreed: the roster called Maria 'maria' with docs:'4/5' while the
   review called her 'LS-PV-0024' with docs:4, so "Application #…" and the row that opened
   it named the same person two different ways. One record now, read by both. */
function verificationApplication(){
  return PENDING_APPLICANTS.find(a => a.id === state.selectedVerificationId) || PENDING_APPLICANTS[0];
}`, ['LS-PV-0024', "docs:4", "days:'1 day ago'"]);

/* ── the queue: a decision moves it ────────────────────────────────────────── */
patch('the pending roster reads the review records',
`  const pendingDetails = PENDING_APPLICANTS.slice().sort((a,b) => state.adminPendingSort === 'longest'
    ? waitDays(b.days) - waitDays(a.days)
    : waitDays(a.days) - waitDays(b.days));`,
`  /* Sorted out of the record list, and filtered by it: approving an applicant on the
     review screen used to change nothing outside that screen, so the queue kept the
     person it had just declared verified. The wait is counted from submittedAt rather
     than parsed back out of a '1 day ago' string. */
  const pendingDetails = pendingApplicantList().sort((a,b) => state.adminPendingSort === 'longest'
    ? applicantWaitDays(b) - applicantWaitDays(a)
    : applicantWaitDays(a) - applicantWaitDays(b));`, 1);

/* The app's own template syntax is ${…}, so any string containing it has to be built
   from single-quoted pieces: a backtick literal here would be interpolated by Node
   before it ever reached the file. */
patch('the roster row prints the derived count and wait',
  ['        <div style="display:flex; gap:12px; font-size:var(--t-caption); color:var(--mist); margin:8px 0;"><span>Submitted ${provider.days}</span><span>${provider.barangay}</span></div>',
   '        <div style="display:flex; justify-content:space-between; align-items:center; font-size:var(--t-caption); margin-bottom:5px;"><span>Documents ${provider.docs}</span><span style="background:${provider.issueColor}; color:${provider.issueText}; padding:4px 7px; border-radius:999px;">${provider.issue}</span></div>',
   '        <div style="height:6px; background:var(--line); border-radius:99px; overflow:hidden; margin-bottom:8px;"><div style="width:${provider.docs === ' + "'5/5'" + ' ? ' + "'100'" + ' : provider.docs === ' + "'4/5'" + ' ? ' + "'80'" + ' : ' + "'60'" + '}%; height:100%; background:${provider.docs === ' + "'5/5'" + ' ? ' + "'var(--deep)'" + ' : ' + "'var(--gold)'" + '};"></div></div>'].join('\n'),
  ['        <div style="display:flex; gap:12px; font-size:var(--t-caption); color:var(--mist); margin:8px 0;"><span>Submitted ${applicantWaitLabel(provider)}</span><span>${provider.barangay}</span></div>',
   '        <div style="display:flex; justify-content:space-between; align-items:center; font-size:var(--t-caption); margin-bottom:5px;"><span>Documents ${applicationDocsSubmitted(provider.id)} of ${APPLICATION_DOC_KINDS.length}</span><span style="background:${applicantIssue(provider).bg}; color:${applicantIssue(provider).ink}; padding:4px 7px; border-radius:999px;">${applicantIssue(provider).label}</span></div>',
   '        <div style="height:6px; background:var(--line); border-radius:99px; overflow:hidden; margin-bottom:8px;"><div style="width:${Math.round(applicationDocsSubmitted(provider.id) / APPLICATION_DOC_KINDS.length * 100)}%; height:100%; background:${applicationDocsOutstanding(provider.id).length ? ' + "'var(--gold)'" + ' : ' + "'var(--deep)'" + '};"></div></div>'].join('\n'), 1);

/* ── opening an applicant no longer resets a shared bag ────────────────────── */
replaceFunction('openProviderVerification', `function openProviderVerification(id){
  /* Per applicant now: the note, the status and the activity used to be three single
     slots that this function wiped whenever the admin opened someone else, so a note
     written on Maria was cleared by looking at Joel — and whatever was left over was
     painted on whoever was opened next. */
  state.selectedVerificationId = id;
  state.verificationModal = null;
  state.tab = 'verification_review';
  render();
}`, ['Sep 8, 9:14 AM', 'Pending Review']);

/* ── the actions write records with the real clock ─────────────────────────── */
replaceFunction('verificationAction', `function verificationAction(action, value){
  const app = verificationApplication();
  const review = reviewOf(app.id);
  const adminName = state.adminProfileData.name;
  /* Every branch used to push a literal 'Sep 9, 2:45 PM - …' into the activity list, so
     the log named a time that had nothing to do with when the button was pressed.
     logReview stamps the moment; shortDate and clockText render it. */
  if(action === 'document') { state.verificationDocKind = value || null; state.verificationModal = 'document'; }
  if(action === 'flag') { state.verificationDocKind = value || null; state.verificationModal = 'flag'; }
  if(action === 'request') state.verificationModal = 'request';
  if(action === 'reject') state.verificationModal = 'reject';
  if(action === 'approve_confirm') state.verificationModal = 'approve_confirm';
  if(action === 'note'){
    const text = String(value || '').trim();
    if (!text) { state.profileError = 'Write the note before saving it — an empty note records nothing.'; render(); return; }
    state.profileError = null;
    review.note = text;
    logReview(app.id, 'Internal review note added by ' + adminName);
    state.verificationModal = 'note_saved';
  }
  if(action === 'request_sent'){
    const kinds = (Array.isArray(value) && value.length) ? value : applicationDocsOutstanding(app.id).map(d => d.kind);
    if (!kinds.length) { state.profileError = 'Nothing is outstanding, so there is nothing to request.'; render(); return; }
    state.profileError = null;
    review.status = 'update requested';
    review.requestedAt = Date.now();
    if (!state.adminDocRequests.includes(app.id)) state.adminDocRequests.push(app.id);
    logReview(app.id, 'Requested ' + kinds.map(applicationDocLabel).join(', ') + ' from the applicant');
    adminLog('Verification documents requested', app.name, kinds.map(applicationDocLabel).join(', '));
    state.verificationModal = 'request_sent';
  }
  if(action === 'approved'){
    const out = applicationDocsOutstanding(app.id);
    if (out.length) { state.profileError = 'Cannot approve: ' + out.map(d => d.label).join(', ') + ' still outstanding.'; render(); return; }
    review.status = 'verified';
    review.decidedAt = Date.now();
    review.reviewer = adminName;
    logReview(app.id, 'Application approved by ' + adminName);
    adminLog('Provider verification approved', app.name, 'Application ' + app.applicationId);
    state.verificationModal = 'approved';
  }
  if(action === 'rejected'){
    const reason = String(value || '').trim();
    if (!reason) { state.profileError = 'A rejection needs a reason before it can be recorded.'; render(); return; }
    state.profileError = null;
    review.status = 'rejected';
    review.decidedAt = Date.now();
    review.reviewer = adminName;
    review.reason = reason;
    logReview(app.id, 'Application rejected by ' + adminName + ': ' + reason);
    adminLog('Provider verification rejected', app.name, reason);
    state.verificationModal = 'rejected';
  }
  if(action === 'doc_state'){
    const kind = state.verificationDocKind;
    if (!kind) { state.profileError = 'Open a document before changing its review state.'; render(); return; }
    review.docs[kind] = review.docs[kind] === 'verified' ? null : 'verified';
    logReview(app.id, applicationDocLabel(kind) + (review.docs[kind] ? ' marked verified by ' + adminName : ' returned to unreviewed'));
  }
  render();
}`, ["state.verificationActivity.push('Sep 9, 2:35 PM", "state.verificationStatus = 'Verified'", "state.verificationStatus = 'Rejected'"]);

patch('the review remembers which document a modal is about',
  `  verificationModal:null,`,
  `  verificationModal:null,\n  verificationDocKind:null,`, 1);

if (failed) { console.log('\n' + failed + ' step(s) did not match — nothing written.'); process.exit(1); }
if (!write) { console.log('\ndry run — lines ' + src.split('\r\n').length); process.exit(0); }
fs.writeFileSync(PATH, src);
const chk = fs.readFileSync(PATH, 'utf8');
console.log('wrote — lines ' + chk.split(/\r\n/).length + ', CRLF ' + (chk.match(/\r\n/g) || []).length
  + ', LF ' + (chk.match(/\n/g) || []).length);
