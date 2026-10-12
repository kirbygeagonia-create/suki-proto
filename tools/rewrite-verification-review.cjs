/* Stage 2b: the review screen itself. Replaced whole rather than patched line by line,
   because the screen's every claim was typed: five hard-coded document rows shared by all
   three applicants, a '5 of 5' header over four itemised documents, a date of birth
   identical for all three people, six green checks no record performed, a seeded activity
   list, and modals that invented a document number and an upload date. */
const fs = require('fs');
const PATH = 'Sukinnect-next.html';
let src = fs.readFileSync(PATH, 'utf8');
const write = process.argv.includes('--write');
const lines = src.split('\r\n');
const start = lines.findIndex(l => l.startsWith('function providerVerificationReview('));
if (start < 0) { console.log('MISS  providerVerificationReview not found'); process.exit(1); }
let end = -1;
for (let i = start + 1; i < lines.length; i++) if (lines[i] === '}') { end = i; break; }
if (end < 0) { console.log('MISS  no closing line'); process.exit(1); }
const removed = lines.slice(start, end + 1).join('\r\n');
const mustGo = ['May 12, 1994', '**** **** 4821', 'September 8, 2026', "'5' : '4'} of 5",
  'Name matches Government ID', 'state.verificationActivity.map', '${app.docs}/5 submitted',
  'Email and mobile verified', 'Document preview placeholder'];
const still = mustGo.filter(s => !removed.includes(s));
if (still.length) { console.log('WRONG  the body being replaced is missing: ' + still.join(' | ')); process.exit(1); }
console.log('found  ' + (end - start + 1) + ' lines, ' + removed.length + ' chars; every typed claim expected is present');

const NEW = `/* Three small handlers, each reading the controls its own modal painted. The buttons
   below used to call verificationAction('rejected') with no argument at all, so the reason
   the admin picked was dropped on the floor and the record said only "Rejected". */
function sendDocumentRequest(){
  const kinds = applicationDocs(state.selectedVerificationId)
    .filter(d => !d.submittedAt)
    .filter(d => { const el = document.getElementById('request-' + d.kind); return el && el.checked; })
    .map(d => d.kind);
  const note = document.getElementById('request-message');
  const review = reviewOf(state.selectedVerificationId);
  review.requestMessage = note ? note.value.trim() : '';
  verificationAction('request_sent', kinds);
}
function rejectApplication(){
  const sel = document.getElementById('reject-reason');
  const note = document.getElementById('reject-note');
  const reason = [sel ? sel.value : '', note ? note.value.trim() : ''].filter(Boolean).join(' — ');
  verificationAction('rejected', reason);
}
function flagDocument(){
  const kind = state.verificationDocKind;
  const app = verificationApplication();
  const review = reviewOf(app.id);
  if (!kind) { state.profileError = 'Open a document before flagging it.'; render(); return; }
  const sel = document.getElementById('flag-issue');
  const note = document.getElementById('flag-note');
  const why = [sel ? sel.value : '', note ? note.value.trim() : ''].filter(Boolean).join(' — ');
  state.profileError = why ? null : 'Choose or write what is wrong with this document.';
  if (!why) { render(); return; }
  review.docs[kind] = 'flagged';
  review.flags = review.flags || {};
  review.flags[kind] = why;
  logReview(app.id, applicationDocLabel(kind) + ' flagged by ' + state.adminProfileData.name + ': ' + why);
  state.verificationModal = null;
  render();
}

function providerVerificationReview(){
  const app = verificationApplication();
  const review = reviewOf(app.id);
  const docs = applicationDocs(app.id);
  const submitted = docs.filter(d => d.submittedAt).length;
  const outstanding = docs.filter(d => !d.submittedAt);
  const complete = outstanding.length === 0;
  const progress = Math.round(submitted / docs.length * 100);
  const modal = state.verificationModal;
  const about = docs.find(d => d.kind === state.verificationDocKind) || null;
  /* A document's state is the administrator's mark if there is one, and otherwise whether
     the row was ever filed. The old screen had no such thing: it showed four documents as
     verified because four rows said so. */
  const docState = d => review.docs[d.kind] === 'verified' ? 'verified'
    : review.docs[d.kind] === 'flagged' ? 'flagged'
    : d.submittedAt ? 'submitted' : 'missing';
  const INK = { verified:'var(--success-ink)', submitted:'var(--success-ink)',
                flagged:'var(--warning-ink)', missing:'var(--error-ink)' };
  const WORD = { verified:'Verified by ' + state.adminProfileData.name, submitted:'Submitted',
                 flagged:'Flagged for review', missing:'Not submitted' };
  const decided = review.status === 'verified' || review.status === 'rejected';
  const chipTone = review.status === 'verified' ? ''
    : review.status === 'rejected' ? 'badge-alert'
    : review.status === 'update requested' ? 'badge-gold' : 'badge-gold';
  return \`
  <div class="topbar"><div style="display:flex; align-items:center; gap:10px;"><button class="back-btn" onclick="state.tab='admin_verifications'; render();" aria-label="Back to pending providers">\${ic("chevron-left",18)}</button><div><h1 style="font-size:var(--t-lead);">Provider Verification</h1><div class="sub">Application \${esc(app.applicationId)}</div></div></div></div>
  <div class="pad pad-cta" style="background:var(--cloud);">
    <div class="card"><div class="row"><div style="display:flex; gap:10px; align-items:center;"><img class="img-avatar" src="\${VERIF_PHOTOS[app.id] || 'avatars/avatar-10.png'}" alt="\${esc(app.name)}" style="width:42px; height:42px;"><div><b style="font-size:var(--t-input);">\${esc(app.name)}</b><div style="font-size:var(--t-caption); color:var(--mist);">\${esc(app.service)}</div></div></div><span class="chip \${chipTone}">\${esc(reviewStatusLine(review.status))}</span></div><div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:12px; font-size:var(--t-caption);"><div><span style="color:var(--mist);">Barangay</span><br><b>\${esc(app.barangay)}</b></div><div><span style="color:var(--mist);">Submitted</span><br><b>\${esc(shortDate(app.submittedAt))} · \${esc(applicantWaitLabel(app))}</b></div><div><span style="color:var(--mist);">Priority</span><br><b style="color:var(--gold-600);">\${esc(app.priority)}</b></div><div><span style="color:var(--mist);">Contact on file</span><br><b>\${esc(app.phone)}</b></div></div></div>

    <div class="card"><div class="row"><b class="card-title">Verification progress</b><b>\${submitted} of \${docs.length}</b></div><div style="height:9px; background:var(--line); border-radius:99px; overflow:hidden; margin:10px 0 12px;"><div style="width:\${progress}%; height:100%; background:\${complete ? 'var(--verified)' : 'var(--gold)'};"></div></div><div style="display:flex; flex-direction:column; gap:7px; font-size:var(--t-caption);">\${docs.map(d => { const s = docState(d); return '<div style="color:' + INK[s] + '; display:flex; align-items:center; gap:6px;">' + ic(s === 'missing' ? 'alert-triangle' : s === 'flagged' ? 'alert-circle' : 'check-circle', 13) + ' ' + esc(d.label) + ' — ' + esc(WORD[s]) + '</div>'; }).join('')}</div><div style="font-size:var(--t-caption); color:var(--mist); margin-top:10px; line-height:1.5;">Counted from the documents on this application. The prototype runs no automated check of its own — a mark below is something an administrator made.</div></div>

    <details class="card"><summary style="font-weight:800; cursor:pointer;">Identity information</summary><div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:12px; font-size:var(--t-caption);"><div>Full name<br><b>\${esc(app.name)}</b></div><div>Email<br><b>\${esc(app.email)}</b></div><div>Mobile<br><b>\${esc(app.phone)}</b></div><div>Barangay<br><b>\${esc(app.barangay)}</b></div><div style="grid-column:1 / -1;">Address<br><b>\${esc(app.address)}</b></div></div><div style="font-size:var(--t-caption); color:var(--mist); margin-top:10px;">What the applicant filed is on the document list; this screen keeps no date of birth and no document image.</div></details>

    <div class="card"><div class="row" style="margin-bottom:10px;"><b class="card-title">Submitted documents</b><span class="chip">\${submitted} of \${docs.length} filed</span></div>\${docs.map(d => { const s = docState(d); const flag = review.flags && review.flags[d.kind]; return '<div style="border-top:1px solid var(--line); padding:10px 0;"><div class="row"><div><b style="font-size:var(--t-body-sm);">' + esc(d.label) + '</b><div style="font-size:var(--t-caption); color:var(--mist); margin-top:2px;">' + esc(d.detail) + '</div></div><span style="font-size:var(--t-caption); color:' + INK[s] + '; font-weight:800;">' + ic(s === 'missing' ? 'alert-triangle' : s === 'flagged' ? 'alert-circle' : 'check-circle', 13) + ' ' + esc(s === 'missing' ? 'Missing' : s === 'flagged' ? 'Flagged' : s === 'verified' ? 'Verified' : 'Submitted') + '</span></div><div class="row" style="margin-top:7px;"><span style="font-size:var(--t-caption); color:var(--mist);">' + (d.submittedAt ? 'Filed ' + esc(shortDate(d.submittedAt)) + (d.expiresAt ? ' · expires ' + esc(shortDate(d.expiresAt)) : '') : 'Required before approval') + '</span>' + (d.submittedAt ? '<button class="btn sm secondary" onclick="verificationAction(\\'document\\', \\'' + d.kind + '\\')">Open document</button>' : '<button class="btn sm secondary" onclick="state.verificationDocKind=\\'' + d.kind + '\\'; verificationAction(\\'request\\')">Request this</button>') + '</div>' + (flag ? '<div style="font-size:var(--t-caption); color:var(--warning-ink); margin-top:6px;">Flagged: ' + esc(flag) + '</div>' : '') + '</div>'; }).join('')}</div>

    <div class="card"><b class="card-title">What is still outstanding</b><div style="font-size:var(--t-caption); color:var(--ink-soft); line-height:1.5; margin-top:8px;">\${complete ? 'All ' + docs.length + ' documents are filed. ' + (review.status === 'verified' ? 'This application was approved — the decision and its time are in the activity list.' : 'Nothing is waiting on the applicant, so the decision is the administrator\\'s to make.') : esc(app.name) + ' has filed ' + submitted + ' of ' + docs.length + '. Still outstanding: ' + esc(outstanding.map(d => d.label).join(', ')) + '.'}</div>\${state.profileError ? '<div class="inline-error" role="alert">' + esc(state.profileError) + '</div>' : ''}</div>

    <div class="card"><b class="card-title">Internal review notes</b><textarea id="verification-note" aria-label="Internal note about this verification" placeholder="Add notes about this verification..." style="width:100%; min-height:70px; border:1px solid var(--line); border-radius:8px; padding:9px; margin-top:8px; font:inherit; resize:vertical;">\${esc(review.note)}</textarea><button class="btn sm secondary" style="margin-top:8px;" onclick="verificationAction('note', document.getElementById('verification-note').value)">Save Note</button>\${review.note ? '<div style="font-size:var(--t-caption); color:var(--mist); margin-top:10px;">Saved on this device. It is not shown to the applicant.</div>' : ''}</div>

    <details class="card"><summary style="font-weight:800; cursor:pointer;">Application activity</summary><div style="display:flex; flex-direction:column; gap:8px; margin-top:12px; font-size:var(--t-caption); color:var(--ink-soft);">\${reviewTimeline(app.id).map(e => '<div>• ' + esc(shortDate(e.at)) + ' ' + esc(clockText(e.at)) + ' — ' + esc(e.text) + '</div>').join('')}</div>\${review.activity.length ? '' : '<div style="font-size:var(--t-caption); color:var(--mist); margin-top:8px;">These entries come from the application and document dates. Anything you do on this screen is added with the time it happened.</div>'}</details>

    \${decided ? '<div class="card"><b class="card-title">Decision recorded</b><div style="font-size:var(--t-caption); color:var(--ink-soft); line-height:1.6; margin-top:8px;">' + esc(reviewStatusLine(review.status)) + ' on ' + esc(shortDate(review.decidedAt)) + ' ' + esc(clockText(review.decidedAt)) + ' by ' + esc(review.reviewer || 'this administrator') + (review.reason ? ' — ' + esc(review.reason) : '') + '.</div><button class="btn sm secondary" style="margin-top:10px;" onclick="reopenReview()">Reopen this application</button></div>' : ''}
  </div>
  \${decided ? '' : '<div style="position:sticky; bottom:0; width:100%; margin:0 -16px; padding:10px 16px; box-sizing:content-box; background:var(--surface); border-top:1px solid var(--line); display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:8px; align-items:stretch; z-index:25; box-shadow:0 -4px 12px rgba(0,0,0,0.08);"><button class="btn sm secondary" style="width:100%; min-width:0; height:52px; color:var(--error-ink); border-color:var(--error-ink);" onclick="verificationAction(\\'reject\\')">Reject</button><button class="btn sm secondary" style="width:100%; min-width:0; height:52px;" onclick="verificationAction(\\'request\\')">Request update</button><button class="btn sm" style="width:100%; min-width:0; height:52px; opacity:' + (complete ? '1' : '0.5') + ';" ' + (complete ? 'onclick="verificationAction(\\'approve_confirm\\')"' : 'disabled aria-describedby="approve-why"') + '>Approve</button></div>'}
  \${!decided && !complete ? '<div id="approve-why" style="font-size:var(--t-caption); color:var(--mist); margin:8px 0 0;">Approval is unavailable while ' + esc(outstanding.map(d => d.label).join(', ')) + ' is outstanding.</div>' : ''}
  \${modal ? \`<div style="position:fixed; inset:0; background:var(--scrim); z-index:50; display:flex; align-items:center; justify-content:center; padding:18px;"><div class="card" style="width:100%; max-width:350px; max-height:85vh; overflow:auto"><div class="row"><b style="font-size:var(--t-body-lg);">\${modal === 'document' ? (about ? esc(about.label) : 'Document') : modal === 'request' ? 'Request outstanding documents' : modal === 'flag' ? 'Flag this document' : modal === 'reject' ? 'Reject this application' : modal === 'approve_confirm' ? 'Approve this applicant?' : modal === 'approved' ? 'Approved' : modal === 'rejected' ? 'Rejected' : modal === 'request_sent' ? 'Request recorded' : 'Note saved'}</b><button onclick="state.verificationModal=null; render();" aria-label="Close" style="border:0; background:transparent; font-size:var(--t-title); cursor:pointer; min-width:var(--tap); min-height:var(--tap); display:inline-flex; align-items:center; justify-content:center;">&times;</button></div>\${modal === 'document' ? \`<div style="height:110px; background:var(--brand-tint-soft); border:1px solid var(--line); border-radius:8px; margin:12px 0; display:flex; align-items:center; justify-content:center; text-align:center; padding:12px; color:var(--mist); font-size:var(--t-caption);">No image is stored in this prototype.<br>What follows is the record of the filing, not the document itself.</div><div style="font-size:var(--t-caption); line-height:1.7;">\${about ? 'Document: <b>' + esc(about.label) + '</b><br>Filed as: <b>' + esc(about.detail) + '</b><br>Filed on: <b>' + esc(about.submittedAt ? shortDate(about.submittedAt) : 'not filed') + '</b>' + (about.expiresAt ? '<br>Expires: <b>' + esc(shortDate(about.expiresAt)) + '</b>' : '') + '<br>Your mark: <b>' + esc(WORD[docState(about)]) + '</b><br>Applicant: <b>' + esc(app.name) + '</b>' : 'Open a document from the list to review it.'}</div><div style="display:flex; gap:6px; margin-top:12px;"><button class="btn sm" onclick="verificationAction('doc_state')">Mark as verified</button><button class="btn sm secondary" onclick="verificationAction('flag', \${about ? \"'\" + about.kind + \"'\" : 'null'})">Flag an issue</button></div>\` : modal === 'flag' ? \`<div style="font-size:var(--t-caption); color:var(--ink-soft); margin:12px 0;">What is wrong with \${about ? esc(about.label) : 'this document'}?</div><select id="flag-issue" aria-label="Possible issue with this document" style="width:100%; min-height:var(--tap); padding:9px; border:1px solid var(--line); border-radius:8px;"><option>Information does not match the application</option><option>Document has expired</option><option>Image is unreadable</option><option>Wrong document type</option><option>Other</option></select><textarea id="flag-note" aria-label="Administrator note about this document" placeholder="What the applicant should fix" style="width:100%; min-height:70px; margin-top:10px; padding:8px; border:1px solid var(--line); border-radius:8px; font:inherit;"></textarea><button class="btn danger btn-block" style="margin-top:10px;" onclick="flagDocument()">Flag document</button>\` : modal === 'approve_confirm' ? \`<div style="font-size:var(--t-caption); color:var(--ink-soft); line-height:1.5; margin:12px 0;">\${esc(app.name)}, \${esc(app.service)}. All \${docs.length} documents are filed and none is flagged. Approving records the decision on this device with your name and the time, and takes the application out of the pending queue.</div><div style="display:flex; gap:6px;"><button class="btn sm secondary" style="flex:1;" onclick="state.verificationModal=null; render();">Cancel</button><button class="btn sm" style="flex:1;" onclick="verificationAction('approved')">Confirm approval</button></div>\` : modal === 'request' ? \`<div style="font-size:var(--t-caption); color:var(--ink-soft); margin:12px 0 8px;">Pick what you need back from \${esc(app.name)}. Only documents still outstanding are listed.</div>\${outstanding.length ? outstanding.map(d => '<label class="row" style="font-size:var(--t-caption); padding:8px 0; min-height:var(--tap);">' + esc(d.label) + '<input type="checkbox" id="request-' + d.kind + '" checked style="min-width:var(--tap); min-height:var(--tap);"></label>').join('') : '<div style="font-size:var(--t-caption); color:var(--mist);">Nothing is outstanding on this application.</div>'}<label class="form-label" style="margin-top:10px;">Note to attach<div style="font-size:var(--t-caption); color:var(--mist); margin-top:4px;">Kept with the review record. This prototype has no applicant inbox, so nothing is delivered.</div></label><textarea id="request-message" aria-label="Note attached to the document request" style="width:100%; min-height:70px; border:1px solid var(--line); border-radius:8px; padding:8px; margin-top:6px; font:inherit;">Please upload the outstanding document to continue verification.</textarea><button class="btn btn-block" style="margin-top:10px;" onclick="sendDocumentRequest()">Record request</button>\` : modal === 'reject' ? \`<div style="font-size:var(--t-caption); color:var(--ink-soft); margin:12px 0 8px;">A reason is required — it is what the record will show.</div><select id="reject-reason" aria-label="Reason for rejecting this application" style="width:100%; padding:9px; min-height:var(--tap); border:1px solid var(--line); border-radius:8px;"><option>Invalid required document</option><option>Unable to verify identity</option><option>Required qualification not met</option><option>Other</option></select><textarea id="reject-note" aria-label="Reason for rejecting this application" placeholder="What the applicant should know" style="width:100%; min-height:70px; margin-top:10px; padding:8px; border:1px solid var(--line); border-radius:8px; font:inherit;"></textarea><button class="btn danger btn-block" style="margin-top:10px;" onclick="rejectApplication()">Record rejection</button>\` : \`<div style="font-size:var(--t-caption); color:var(--ink-soft); line-height:1.5; margin:12px 0;">\${modal === 'approved' ? esc(app.name) + ' is approved as of ' + esc(shortDate(review.decidedAt)) + ' ' + esc(clockText(review.decidedAt)) + ' and no longer appears in the pending queue.' : modal === 'rejected' ? esc(app.name) + ' is rejected' + (review.reason ? ': ' + esc(review.reason) : '.') + ' The application stays on this device with that reason.' : modal === 'request_sent' ? 'The request is recorded against this application. The pending queue now shows it as awaiting upload.' + (review.requestMessage ? ' Your note: ' + esc(review.requestMessage) + '.' : '') : 'Your note is saved with this application on this device.'}</div><button class="btn" style="width:100%;" onclick="state.verificationModal=null; render();">Close</button>\`}</div></div>\` : ''}\`;
}

function reopenReview(){
  const app = verificationApplication();
  const review = reviewOf(app.id);
  review.status = 'pending';
  review.decidedAt = null;
  review.reviewer = null;
  review.reason = '';
  logReview(app.id, 'Reopened for review by ' + state.adminProfileData.name);
  adminLog('Verification reopened', app.name, 'Application ' + app.applicationId);
  render();
}`;

lines.splice(start, end - start + 1, ...NEW.replace(/\n/g, '\r\n').split('\r\n'));
let outText = lines.join('\r\n');

/* The four bags this screen owned are now per-applicant records, and waitDays parsed a
   '1 day ago' string that no longer exists. Left behind they would trip the gate's own
   rule about state nothing reads, so they go with the screen that used them. */
const drops = [
  ['the four screen-local review bags',
    '  verificationDocStatus:{},\r\n  verificationReviews:{},\r\n  verificationNote:\'\',\r\n'
    + '  verificationActivity:[],\r\n  verificationStatus:\'Pending Review\',',
    '  verificationReviews:{},'],
  ['the wait parser',
    'const waitDays = d => { const n = parseInt(String(d).replace(/[^0-9]/g, \'\'), 10);'
    + ' return Number.isNaN(n) ? 0 : n; };\r\n', ''],
];
for (const [name, find, replace] of drops) {
  const n = outText.split(find).length - 1;
  if (n !== 1) { console.log('COUNT   ' + n + ' (want 1)  ' + name); process.exit(1); }
  outText = outText.split(find).join(replace);
  console.log('ok      dropped ' + name);
}

const stray = ['May 12, 1994', '**** **** 4821', "'Sep 8, 9:1",
  "verificationActivity.push('Sep 9", 'Email and mobile verified',
  'Name matches Government ID', 'verificationDocStatus.government', 'state.verificationActivity',
  'state.verificationNote', 'state.verificationStatus'].filter(s => outText.includes(s));
console.log('leftover typed claims: ' + (stray.length ? stray.join(' | ') : 'none'));
if (stray.length) { console.log('nothing written'); process.exit(1); }
if (!write) { console.log('dry run — lines ' + outText.split('\r\n').length); process.exit(0); }
fs.writeFileSync(PATH, outText);
const chk = fs.readFileSync(PATH, 'utf8');
console.log('wrote — lines ' + chk.split(/\r\n/).length + ', CRLF ' + (chk.match(/\r\n/g) || []).length
  + ', LF ' + (chk.match(/\n/g) || []).length);
