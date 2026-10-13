/* node tools/shot.cjs --probe=@tools/probe-resident-modules.js --only=resident-profile
   ------------------------------------------------------------------
   What the resident's profile modules actually say, once the records drive them.

   The modules used to carry an invented history: a faucet job presented as completed, rated
   and paid, and a year-to-date total of ₱2,500 across four trades. The records hold two
   finished jobs worth ₱590 and no completed plumbing or electrical work. This opens every
   section in turn and prints the painted sentences, so the claim "it reads the records now"
   can be checked against the words rather than against the source.

   It also recomputes the money from BOOKINGS in the page itself and compares, so a total that
   agrees with the card by coincidence is not mistaken for one that agrees by derivation. */
(function () {
  var sections = ['history', 'saved', 'warranty', 'home', 'reminders', 'payments', 'receipts', 'spending', 'notifications', 'privacy'];
  var out = { sections: {}, truth: {}, mismatch: [] };

  var mine = bookingsForResident(state.customerId);
  var finished = mine.filter(function (b) { return b.status === 'completed'; });
  var paid = finished.filter(function (b) { return ['captured', 'collected'].indexOf(b.payStatus) >= 0; });
  var total = paid.reduce(function (s, b) {
    return s + ((b.pricing && b.pricing.customerTotalCentavos != null) ? b.pricing.customerTotalCentavos : (b.amountCentavos || 0));
  }, 0);
  out.truth = {
    bookings: mine.length, finished: finished.length, paid: paid.length,
    paidTotal: pesoShort(total),
    paidIds: paid.map(function (b) { return b.id; }).join(','),
    openCases: DISPUTES.filter(function (d) { return d.status === 'open'; }).map(function (d) { return d.bookingId; }).join(',')
  };

  sections.forEach(function (id) {
    try {
      openProfileSection('resident', id, id, '');
      var sheet = document.querySelector('.sheet');
      var text = sheet ? (sheet.innerText || '').replace(/\s+/g, ' ').trim() : '(no sheet painted)';
      out.sections[id] = text.slice(0, 300);
      closeSheet();
    } catch (e) { out.sections[id] = 'threw: ' + e.message; }
  });

  /* The card must not restate a number the records do not produce. */
  var spent = out.sections.spending || '';
  if (paid.length && spent.indexOf(out.truth.paidTotal) < 0) out.mismatch.push('spending card does not contain ' + out.truth.paidTotal);
  var allText = JSON.stringify(out.sections);
  /* 0912***6789 is left off this list on purpose: it is the profile record's own
     preferredPayment value now, so painting it is correct. Only claims with no record behind
   them belong here. */
  ['₱2,500', 'September 12, 2026', 'Kitchen Faucet Repair', 'Active until September 19', 'Due October 10'].forEach(function (claim) {
    if (allText.indexOf(claim) >= 0) out.mismatch.push('invented claim still painted: ' + claim);
  });
  return out;
})()
