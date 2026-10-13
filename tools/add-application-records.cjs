/* Stage 1 of the verification records pass: the data layer.
   Applicants get one record each (the review screen's duplicate copy goes away in
   stage 2), documents become rows instead of a count and a shared typed list, and the
   review's mutable state becomes one persisted record per applicant instead of five
   loose screen-local bags. */
const fs = require('fs');
const PATH = 'Sukinnect-next.html';
const src = fs.readFileSync(PATH, 'utf8');
const write = process.argv.includes('--write');
const edits = [];
const E = (name, find, replace, expect) => edits.push({ name, find, replace, expect });

/* ── applicants: one record, no typed count, no typed wait ─────────────────── */
E('PENDING_APPLICANTS carries what a review needs',
`const PENDING_APPLICANTS = [
  {id:'maria', initials:'MS', name:'Maria Santos', service:'Electrical Specialist', days:'1 day ago', barangay:'Poblacion', docs:'4/5', priority:'High Priority', priorityColor:'var(--warning-100)', priorityText:'var(--warning-ink)', issue:'Missing NBI Clearance', issueColor:'var(--error-100)', issueText:'var(--error-ink)'},
  {id:'joel', initials:'JA', name:'Joel Aquino', service:'Appliance Specialist', days:'2 days ago', barangay:'San Isidro', docs:'5/5', priority:'Normal Priority', priorityColor:'var(--warning-100)', priorityText:'var(--warning-ink)', issue:'All documents submitted', issueColor:'var(--success-100)', issueText:'var(--success-ink)'},
  {id:'liza', initials:'LR', name:'Liza Ramos', service:'Cleaning Specialist', days:'3 days ago', barangay:'Sta. Cruz', docs:'3/5', priority:'For Initial Review', priorityColor:'var(--brand-tint-soft)', priorityText:'var(--brand-primary-dark)', issue:'2 documents to review', issueColor:'var(--warning-100)', issueText:'var(--warning-ink)'},
];
const docsOutstanding = () => PENDING_APPLICANTS.filter(a => a.docs !== '5/5').length;`,
`/* Three people waiting on a decision. The count of documents and how long someone has
   waited used to be typed here ('4/5', '1 day ago') and typed again, differently, on the
   review screen (docs:4, id:'LS-PV-0024') — two copies of the same applicant that
   disagreed about both the number and the identifier. Both are derived now: the count
   from APPLICATION_DOCS below, the wait from submittedAt. */
const PENDING_APPLICANTS = [
  {id:'maria', applicationId:'LS-PV-0024', initials:'MS', name:'Maria Santos', service:'Electrical Specialist', serviceId:'electrical', barangay:'Poblacion', submittedAt:'2026-10-10', email:'maria.santos@example.com', phone:'+63 917 321 8844', address:'Blk 8 Lot 4, Mabini St., Poblacion', priority:'High Priority', priorityColor:'var(--warning-100)', priorityText:'var(--warning-ink)'},
  {id:'joel', applicationId:'LS-PV-0025', initials:'JA', name:'Joel Aquino', service:'Appliance Specialist', serviceId:'appliance', barangay:'San Isidro', submittedAt:'2026-10-09', email:'joel.aquino@example.com', phone:'+63 918 442 1102', address:'24 Sampaguita St., San Isidro', priority:'Normal Priority', priorityColor:'var(--warning-100)', priorityText:'var(--warning-ink)'},
  {id:'liza', applicationId:'LS-PV-0026', initials:'LR', name:'Liza Ramos', service:'Cleaning Specialist', serviceId:'cleaning', barangay:'Sta. Cruz', submittedAt:'2026-10-08', email:'liza.ramos@example.com', phone:'+63 919 552 4471', address:'15 Orchid St., Sta. Cruz', priority:'For Initial Review', priorityColor:'var(--brand-tint-soft)', priorityText:'var(--brand-primary-dark)'},
];`, 1);

/* ── documents: the four kinds, and one row per applicant ───────────────────── */
E('APPLICATION_DOCS replaces the typed count and the shared list',
`const SELF_PHOTOS = { resident:'avatars/avatar-03.png', admin:'avatars/ADMIN.png', self:'avatars/PLUMBER.png' };`,
`/* The four documents an applicant has to put up. The review screen itemised exactly
   these four while the roster counted out of five, and the same four rows were shown for
   all three applicants — so the cleaning applicant was handed the electrician's TESDA
   NC II. The qualification row is per person now. A row with no submittedAt is
   outstanding, which is the only definition of the count the roster prints. */
const APPLICATION_DOC_KINDS = [
  { kind:'identity',      label:'Government ID' },
  { kind:'nbi',           label:'NBI Clearance' },
  { kind:'barangay',      label:'Barangay Clearance' },
  { kind:'qualification', label:'Service qualification' },
];
const APPLICATION_DOCS = [
  {appId:'maria', kind:'identity',      detail:'Philippine National ID', submittedAt:'2026-10-10'},
  {appId:'maria', kind:'nbi',           detail:'NBI clearance certificate', submittedAt:null},
  {appId:'maria', kind:'barangay',      detail:'Poblacion business clearance', submittedAt:'2026-10-10'},
  {appId:'maria', kind:'qualification', detail:'TESDA Electrical Installation and Maintenance NC II', submittedAt:'2026-10-10', expiresAt:'2028-03-14'},
  {appId:'joel',  kind:'identity',      detail:'Philippine Identification System card', submittedAt:'2026-10-09'},
  {appId:'joel',  kind:'nbi',           detail:'NBI clearance certificate', submittedAt:'2026-10-09'},
  {appId:'joel',  kind:'barangay',      detail:'San Isidro business clearance', submittedAt:'2026-10-09'},
  {appId:'joel',  kind:'qualification', detail:'Manufacturer authorisation — split-type air conditioning', submittedAt:'2026-10-09'},
  {appId:'liza',  kind:'identity',      detail:'Unified Multi-Purpose ID', submittedAt:'2026-10-08'},
  {appId:'liza',  kind:'nbi',           detail:'NBI clearance certificate', submittedAt:null},
  {appId:'liza',  kind:'barangay',      detail:'Sta. Cruz clearance', submittedAt:null},
  {appId:'liza',  kind:'qualification', detail:'Household cleaning practice certificate', submittedAt:'2026-10-08'},
];
/* Read through the kind list, so an applicant with a missing row still shows the
   requirement rather than silently shortening the set. */
function applicationDocs(appId){
  return APPLICATION_DOC_KINDS.map(k => {
    const row = APPLICATION_DOCS.find(d => d.appId === appId && d.kind === k.kind);
    return { kind:k.kind, label:k.label, detail:row ? row.detail : 'No document filed',
             submittedAt:row ? row.submittedAt : null, expiresAt:row ? row.expiresAt : null };
  });
}
function applicationDocsSubmitted(appId){ return applicationDocs(appId).filter(d => d.submittedAt).length; }
function applicationDocsOutstanding(appId){ return applicationDocs(appId).filter(d => !d.submittedAt); }
function applicationDocLabel(kind){
  const k = APPLICATION_DOC_KINDS.find(x => x.kind === kind);
  return k ? k.label : 'Document';
}
function applicantWaitDays(a){
  return Math.max(0, Math.round((Date.now() - parseDay(a.submittedAt)) / 86400000));
}
function applicantWaitLabel(a){
  const d = applicantWaitDays(a);
  return d <= 0 ? 'today' : d === 1 ? '1 day ago' : d + ' days ago';
}
/* The roster's status pill, from the rows and the decision rather than from a typed
   sentence that could disagree with either. */
function applicantIssue(a){
  const decision = reviewOf(a.id).status;
  if (decision === 'verified')  return { label:'Verified — ready to activate', bg:'var(--success-100)', ink:'var(--success-ink)' };
  if (decision === 'rejected')  return { label:'Rejected', bg:'var(--error-100)', ink:'var(--error-ink)' };
  const out = applicationDocsOutstanding(a.id).length;
  if (!out) return { label:'All documents submitted', bg:'var(--success-100)', ink:'var(--success-ink)' };
  if (decision === 'update requested') return { label:out + ' document' + (out === 1 ? '' : 's') + ' requested', bg:'var(--warning-100)', ink:'var(--warning-ink)' };
  return { label:out + ' document' + (out === 1 ? '' : 's') + ' outstanding', bg:'var(--warning-100)', ink:'var(--warning-ink)' };
}
const docsOutstanding = () => PENDING_APPLICANTS.filter(a => applicationDocsOutstanding(a.id).length > 0).length;
/* An applicant stays in the queue until the decision is made on this device; the roster
   reads the same record the review screen writes, so approving one moves the count. */
function pendingApplicantList(){
  return PENDING_APPLICANTS.filter(a => reviewOf(a.id).status !== 'verified');
}
/* One review record per applicant, persisted with the rest of state. It replaces five
   loose bags (verificationStatus, verificationNote, verificationActivity,
   verificationDocStatus and a per-screen modal) that were reset when the admin opened a
   different applicant — so a note written on one person was painted on the next. */
function blankReview(){ return { status:'pending', docs:{}, note:'', activity:[], requestedAt:null, decidedAt:null, reviewer:null, reason:'' }; }
function reviewOf(appId){
  if (!state.verificationReviews[appId]) state.verificationReviews[appId] = blankReview();
  return state.verificationReviews[appId];
}
function reviewStatusLine(status){
  return { pending:'Pending Review', 'update requested':'Update Requested', verified:'Verified',
           rejected:'Rejected' }[status] || 'Pending Review';
}
/* Stamped when the action happens. The five places this is called used to push a
   literal 'Sep 9, 2:45 PM' string, so the activity log named a time that was not the
   time — whatever hour the admin actually pressed the button. */
function logReview(appId, text){
  reviewOf(appId).activity.push({ at: Date.now(), text });
}
/* The timeline before anyone acts on this device is the record's own history: when the
   application came in and when each document was filed. Nothing here is invented. */
function reviewTimeline(appId){
  const a = PENDING_APPLICANTS.find(x => x.id === appId);
  const r = reviewOf(appId);
  if (r.activity.length) return r.activity.slice();
  const seed = [{ at: parseDay(a.submittedAt) + 3600000, text:'Application submitted' }];
  applicationDocs(appId).filter(d => d.submittedAt).forEach(d =>
    seed.push({ at: parseDay(d.submittedAt) + 7200000, text: d.label + ' filed' }));
  return seed.sort((x, y) => x.at - y.at);
}

const SELF_PHOTOS = { resident:'avatars/avatar-03.png', admin:'avatars/ADMIN.png', self:'avatars/PLUMBER.png' };`, 1);

/* ── state and schema ───────────────────────────────────────────────────────── */
E('state carries one review record per applicant',
  `  verificationDocStatus:{},`,
  `  verificationDocStatus:{},\n  verificationReviews:{},`, 1);
E('schema 14: the review state changed shape',
  `const SCHEMA_VERSION = 13;`,
  `/* 14 moves the verification review onto records: one applicant record instead of two
   disagreeing copies, per-applicant document rows instead of a typed count, and one
   review record per applicant in place of five screen-local bags. A dump from 13 carries
   a note and a status with no applicant attached to them, which is the one thing this
   screen must not get wrong, so a device holding 13 starts again. */
const SCHEMA_VERSION = 14;`, 1);

let out = src, bad = 0;
for (const e of edits) {
  const find = e.find.replace(/\n/g, '\r\n'), replace = e.replace.replace(/\n/g, '\r\n');
  const n = out.split(find).length - 1;
  if (n !== e.expect) { console.log('COUNT ' + n + ' (want ' + e.expect + ')  ' + e.name); bad++; continue; }
  out = out.split(find).join(replace);
}
if (bad) { console.log('\n' + bad + ' edit(s) did not match — nothing written.'); process.exit(1); }
for (const e of edits) console.log('ok  ' + e.name);
if (!write) { console.log('\ndry run'); process.exit(0); }
fs.writeFileSync(PATH, out);
const chk = fs.readFileSync(PATH, 'utf8');
console.log('wrote — lines ' + chk.split(/\r\n/).length + ', CRLF ' + (chk.match(/\r\n/g) || []).length
  + ', LF ' + (chk.match(/\n/g) || []).length);
