/* Behavioural, not textual: call a handler and see whether the bytes in storage changed.
   A grep says "this function never calls persist()" — which is true of every handler that
   reaches a function which does. This asks the only question that matters: after the user
   acted, is there anything on disk that was not there before? */
'use strict';
const { boot, fakeStorage } = require('./harness.cjs');

function tryHandler(label, setup) {
  const store = fakeStorage();
  const a = boot({ storage: store });
  a.state.view = 'app';
  a.persist();                                  // baseline write
  const before = store.getItem('sukinnect.snapshot.v1');
  try { setup(a); } catch (err) { console.log('  ' + label.padEnd(30) + ' THREW ' + err.message.slice(0, 46)); return; }
  const after = store.getItem('sukinnect.snapshot.v1');
  const grew = after && before && after.length !== before.length;
  console.log('  ' + label.padEnd(30) + (after !== before ? 'WROTE  (' + ((after || '').length - (before || '').length) + ' bytes)' : 'no write to storage'));
  return { a, before, after };
}

console.log('record-writing handlers, measured:');

tryHandler('sendChatMessage', a => {
  a.state.role = 'resident'; a.state.tab = 'messages';
  const b = a.bookingsForResident()[0];
  a.openChatThread(b.providerId, b.id);
  a._document.getElementById('chat-input').value = 'Does the breaker trip at night?';
  a.sendChatMessage();
});
tryHandler('askForDocuments', a => {
  a.state.role = 'admin'; a.state.tab = 'admin_verifications';
  a.askForDocuments('maria', 'Maria Santos');
});
tryHandler('flagAccountReview', a => {
  a.state.role = 'admin';
  a.flagAccountReview('p1', 'Ramil Odiada');
});
tryHandler('addConciergeAnswer', a => {
  a.state.role = 'resident'; a.state.tab = 'concierge';
  a.state.conciergeAnalyzed = true; a.state.conciergeServiceId = 'plumbing';
  a.addConciergeAnswer('plumbing', 0);
});
tryHandler('adminLog', a => {
  a.state.role = 'admin';
  a.adminLog('Probe action', 'probe subject', 'probe result');
});
tryHandler('provider notif checkbox', a => {
  a.state.role = 'provider';
  a.setProviderNotification('reviews', false);
});
tryHandler('save household item', a => {
  a.state.view = 'app'; a.state.role = 'resident';
  a._document.getElementById('household-type').value = 'Water Pump';
  a._document.getElementById('household-nickname').value = 'Paso';
  a.saveHouseholdItem();
});
tryHandler('save portfolio work', a => {
  a.state.view = 'app'; a.state.role = 'provider';
  a._document.getElementById('portfolio-service').value = 'Repipe';
  a._document.getElementById('portfolio-description').value = 'Two bathrooms, one weekend.';
  a.savePortfolioWork();
});
tryHandler('admin provider note', a => {
  a.state.role = 'admin';
  a._document.getElementById('provider-admin-note').value = 'Awaiting renewed police clearance.';
  a.saveAdminProviderNote('p1', 'Ramil Odiada');
});
tryHandler('submitCase (raise a dispute)', a => {
  a.state.view = 'app'; a.state.role = 'resident';
  const done = a.bookingsForResident().find(b => a.canDispute(b).ok);
  if (!done) throw new Error('no disputable job on this device');
  a.state.caseBookingId = done.id;
  a._document.getElementById('case-reason').value = 'Work came loose the next day.';
  a.submitCase();
});

/* What does the audit log stamp, and does it survive? */
const a = boot();
a.state.role = 'admin';
a.adminLog('First action', 'one', 'ok');
a.adminLog('Second action', 'two', 'ok');
const rows = a.state.adminAuditLog.slice(-2);
console.log('\nlast two audit rows written minutes apart:');
rows.forEach(r => console.log('  ' + JSON.stringify(r)));
const s = fakeStorage(); const b = boot({ storage: s });
b.state.role = 'admin'; b.adminLog('Persisted?', 'x', 'y'); b.persist();
const c = boot({ storage: s });
console.log('\nadminAuditLog rows after a reload:', (c.state.adminAuditLog || []).length,
  ' (written before reload:', b.state.adminAuditLog.length + ')');
