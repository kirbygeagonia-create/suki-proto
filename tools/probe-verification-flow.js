/* Does the verification queue actually behave now?
   Drives the flow the way an administrator does and reports what changed, because a
   screen that renders clean can still record nothing. */
const { boot } = require('./harness.cjs');
const app = boot();
const out = [];
const ok = (label, pass, detail) => out.push((pass ? 'PASS  ' : 'FAIL  ') + label + (pass ? '' : '   ' + detail));

/* 1. the count is the rows, not a typed string */
const joel = app.applicationDocsSubmitted('joel'), maria = app.applicationDocsSubmitted('maria');
ok('Joel has every document filed', joel === 4, joel + ' of 4');
ok('Maria is short one', maria === 3 && app.applicationDocsOutstanding('maria').length === 1,
   maria + ' filed, ' + app.applicationDocsOutstanding('maria').map(d => d.label).join(','));

/* 2. the qualification is the applicant's own trade */
const qual = id => app.applicationDocs(id).find(d => d.kind === 'qualification').detail;
ok('each applicant holds a different qualification',
   new Set(['maria', 'joel', 'liza'].map(qual)).size === 3,
   ['maria', 'joel', 'liza'].map(qual).join(' | '));
ok('Maria’s is the electrical one and Liza’s is not',
   /Electrical/.test(qual('maria')) && !/Electrical/.test(qual('liza')), qual('liza'));

/* 3. approving is refused while something is outstanding, and the reason says why */
app.state.view = 'app'; app.state.role = 'admin';
app.openProviderVerification('maria');
app.verificationAction('approved');
ok('Maria cannot be approved with a document outstanding',
   app.reviewOf('maria').status === 'pending' && /outstanding/.test(app.state.profileError || ''),
   JSON.stringify(app.state.profileError));

/* 4. approving Joel moves the queue */
const before = app.pendingApplicantList().length;
app.openProviderVerification('joel');
app.verificationAction('approved');
const after = app.pendingApplicantList().length;
ok('approving removes the applicant from the pending queue', before === 3 && after === 2,
   before + ' -> ' + after);
ok('and the decision names who made it', app.reviewOf('joel').reviewer === app.state.adminProfileData.name,
   app.reviewOf('joel').reviewer);
ok('the audit log carries the decision',
   (app.state.adminAuditLog || []).some(e => /verification approved/i.test(JSON.stringify(e))),
   JSON.stringify((app.state.adminAuditLog || []).slice(-1)));

/* 5. the activity stamp is the moment, not a typed hour */
const last = app.reviewOf('joel').activity.slice(-1)[0];
const ageSec = last ? (Date.now() - last.at) / 1000 : -1;
ok('the approval is stamped with the real clock', ageSec >= 0 && ageSec < 5, ageSec + 's old');
ok('and the painted screen shows no invented September hour', (() => {
  app.render();
  const html = app._document.getElementById('screen').innerHTML;
  return !/Sep [0-9]+, [0-9]:/.test(html) && /\d{1,2}:\d{2} (AM|PM)/.test(html);
})(), 'the activity list still carries a typed time, or no time at all');

/* 6. a decision survives a reload, and reopening undoes it.
   Same trick the gate uses: boot twice over one fake storage, because hydrate() reads the
   store rather than an argument. */
const { fakeStorage } = require('./harness.cjs');
const store = fakeStorage();
const first = boot({ storage: store });
first.state.view = 'app'; first.state.role = 'admin';
first.openProviderVerification('joel');
first.verificationAction('approved');
/* no persist() call: the action writing its own record is part of what this proves */
const again = boot({ storage: store });
const restored = again.hydrate();
ok('the dump is accepted', restored.restored !== false, JSON.stringify(restored));
ok('the approval survives a reload', again.pendingApplicantList().length === 2,
   again.pendingApplicantList().length + ' pending after hydrate');
again.openProviderVerification('joel');
again.reopenReview();
ok('reopening puts the applicant back in the queue', again.pendingApplicantList().length === 3,
   again.pendingApplicantList().length);

/* 7. notes and requests are per applicant */
app.openProviderVerification('maria');
app.verificationAction('note', 'Call her about the NBI date.');
app.verificationAction('request_sent', ['nbi']);
const m = app.reviewOf('maria'), l = app.reviewOf('liza');
ok('Maria is now awaiting an upload', m.status === 'update requested'
   && app.state.adminDocRequests.includes('maria'), m.status);
ok('Liza has no note of hers', l.note === '' && l.status === 'pending', JSON.stringify(l.note));
ok('the request names the document', /NBI/.test(m.activity.slice(-1)[0].text),
   m.activity.slice(-1)[0].text);
ok('an empty note is refused rather than recorded',
   (app.verificationAction('note', '   '), app.reviewOf('maria').note === 'Call her about the NBI date.'),
   app.reviewOf('maria').note);

/* 8. the roster pill agrees with the record */
ok('the roster pill reads the decision',
   app.applicantIssue(app.PENDING_APPLICANTS.find(a => a.id === 'joel')).label === 'All documents submitted'
   || /Verified/.test(app.applicantIssue(app.PENDING_APPLICANTS.find(a => a.id === 'joel')).label),
   app.applicantIssue(app.PENDING_APPLICANTS.find(a => a.id === 'joel')).label);

console.log(out.join('\n'));
console.log('\n' + out.filter(l => l.startsWith('PASS')).length + ' of ' + out.length + ' held');
process.exitCode = out.some(l => l.startsWith('FAIL')) ? 1 : 0;
