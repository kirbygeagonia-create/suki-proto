/* Proves the 24 checks in the `reschedule` suite are load-bearing, one break per property the
   interface promises.

   The flow is new: until this pass a household with a conflict after an appointment was agreed had
   exactly one door — cancel — and the record itself names the fee that costs. The design rule the
   whole suite defends is that a proposal is NOT a change: the booking's day and hour move only when
   the other side accepts, and the success message says so. Break 3 is therefore the one that matters
   most (a proposal that moves the appointment while telling the reader it did not), and break 6 is
   the oldest class in this repository: an entry point answering an unknown id with somebody else's
   record.

   Each break re-points at a hazard the check specifically names, and the file is restored in a
   finally. Seventeen full gate passes: ~17 minutes. The two clock breaks aim at the SHAPE (one
   reading, handed to both writers) rather than at timing, because a break that made the event writer
   take its own reading survived its behavioural check: two `new Date()` calls a statement apart land
   in the same millisecond, which is §83's lesson applied for the third time in this repository.

     node tools/falsify-reschedule.cjs                                                          */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'Sukinnect-next.html');
const original = fs.readFileSync(TARGET, 'utf8');

/* Every anchor is ONE line except the proposer-refusal pair below. The page is checked out with CRLF,
   so a `from` string carrying a bare newline is a string the file does not contain, and the break
   would report "not applied" for a mutation that never landed — anchors are run through crlf() so the
   two-line needle matches the bytes on disk. */
function crlf(s) { return s.replace(/\n/g, '\r\n'); }
const BREAKS = [
  { name: 'a proposal moves the appointment the moment it is sent, while the message says it did not',
    check: 'sending files a proposal and leaves the agreed time exactly where it was',
    from: '  RESCHEDULE_REQUESTS.push({',
    to: '  b.date = day.date; b.time = time; RESCHEDULE_REQUESTS.push({' },
  { name: 'the side that asked can accept its own request',
    check: 'the side that asked cannot accept its own request',
    /* Two lines, not one: `answerReschedule` and `counterReschedule` both refuse the proposer with
       the identical single-line condition, so a one-line anchor matches twice and this break would
       report "not applied" while the guard it names was perfectly reachable. The refusal MESSAGE is
       what tells them apart, so the anchor carries both lines. */
    from: "  if (actor.side === r.raisedBy) {\n    showToast('Only the other side can answer this request'); return;",
    to: "  if (actor.side === r.raisedBy && false) {\n    showToast('Only the other side can answer this request'); return;" },
  { name: 'accepting a new time also rewrites the money',
    check: 'accepting moves the day and the hour, and nothing else about the job',
    from: "  if (decision === 'accepted') { b.date = r.date; b.time = r.time; }",
    to: "  if (decision === 'accepted') { b.date = r.date; b.time = r.time; b.amountCentavos = 0; }" },
  { name: 'a second proposal is allowed while one is still waiting',
    check: 'a second proposal is refused while one is waiting, so the answer decides one thing',
    from: "  return RESCHEDULE_REQUESTS.find(r => r.bookingId === bookingId && r.status === 'pending') || null;",
    to: "  return RESCHEDULE_REQUESTS.find(r => r.bookingId === bookingId && r.status === 'no-such-state') || null;" },
  { name: 'an unknown booking id opens the first job in the table',
    check: 'an unknown booking id resolves to nothing at the lookup, not to the first job in the table',
    from: 'function rescheduleBooking(bookingId){ return BOOKINGS.find(b => b.id === bookingId) || null; }',
    to: 'function rescheduleBooking(bookingId){ return BOOKINGS.find(b => b.id === bookingId) || BOOKINGS[0]; }' },
  { name: 'the request never reaches storage, so it dies on reload',
    check: 'a proposal survives a reload, because a request that vanishes is one nobody answered',
    from: '    rescheduleRequests: RESCHEDULE_REQUESTS',
    to: '    rescheduleRequests: []' },
  { name: "the storage door stops reading a request's booking reference",
    check: 'a request attached to no booking is refused, not painted onto somebody else’s job',
    from: "   ['rescheduleRequests', 'a reschedule request']].forEach(pair => {",
    to: "   ['offers', 'an offer']].forEach(pair => {" },
  { name: "the storage door stops validating the request's own state",
    check: 'an unknown state is refused',
    from: '      snap.rescheduleRequests.some(r => !r || !RESCHEDULE_STATES[r.status]',
    to: '      snap.rescheduleRequests.some(r => !r && !RESCHEDULE_STATES[r.status]' },
  /* The second half of the flow: one instant handed to both representations, a timeline row that
     says what moved instead of repeating a state that never changed, a counter that retires the ask
     it answers, and a reason that stays absent when nobody typed one. */
  { name: 'the record stamps itself from a second reading instead of the one the event carries',
    check: 'the answer path reads the clock ONCE',
    from: '  r.decidedAt = Date.parse(at);',
    to: '  r.decidedAt = Date.now();' },
  { name: 'the timeline row takes its own reading while the record keeps the other',
    check: 'the answer path reads the clock ONCE',
    from: '    at);',
    to: '    new Date().toISOString());' },
  { name: 'the timeline prints the status label again instead of the move',
    check: 'the timeline says what moved',
    from: "    const what = e.kind === 'reschedule' ? esc(e.note) : label(e.to);",
    to: '    const what = label(e.to);' },
  { name: 'a counter edits nothing, so two asks on one booking are both open',
    check: 'countering supersedes the ask it answers',
    from: "  if (countered && countered.status === 'pending') {",
    to: "  if (countered && countered.status === 'no-such-state') {" },
  { name: 'an untouched reason is stored as an empty string',
    check: 'a reason left empty is stored as nothing',
    from: "    reason: (d.reason || '').trim() || null,",
    to: "    reason: (d.reason || '').trim()," },
  { name: 'a state the records can reach is missing from the vocabulary the door validates against',
    check: 'the vocabulary the door validates against',
    from: "  superseded:  { label:'Replaced by a new proposal', tone:'gone' }",
    to: "  withdrawn2:  { label:'Withdrawn', tone:'gone' }" },
  /* The staleness pair: a request must remember the schedule it was raised against, and an answer
     that no longer matches it must be refused without writing. Without the first there is nothing to
     compare; without the second an accepted move silently overwrites a change nobody offered. */
  { name: 'the request stops recording the schedule it was raised against',
    check: 'a request stores the schedule it was raised against',
    from: '    fromDate: b.date, fromTime: b.time,',
    to: '' },
  { name: 'the stale-request guard is disabled, so an answer overwrites a change it never offered',
    check: 'an answer whose schedule has moved on is refused',
    from: '  if (r.fromDate && (b.date !== r.fromDate || b.time !== r.fromTime)) {',
    to: '  if (r.fromDate && false && (b.date !== r.fromDate || b.time !== r.fromTime)) {' },
  { name: 'a retired request stays answerable instead of being closed',
    check: 'an answer whose schedule has moved on is refused',
    from: "    r.status = 'stale';",
    to: "    r.status = 'pending';" },
  /* The three entry-point breaks. §9's rule 6 was the one the whole suite missed — every other check
     asks what happens inside the flow, so an unrendered inbox passed 17 breaks untouched. */
  { name: 'the provider list stops rendering the pending proposals at all',
    check: 'a pending proposal reaches both booking lists, and a decided one reaches neither',
    from: "    ${rescheduleAskCard('provider')}",
    to: '    ' },
  { name: 'the inbox stops filtering on status, so an answered proposal keeps asking',
    check: 'a pending proposal reaches both booking lists, and a decided one reaches neither',
    from: "    .filter(r => r.status === 'pending' && visible.indexOf(r.bookingId) >= 0)",
    to: '    .filter(r => visible.indexOf(r.bookingId) >= 0)' },
  { name: 'both lists route their rows to the provider screen, so a resident lands on a job that is not theirs',
    check: 'a pending proposal reaches both booking lists, and a decided one reaches neither',
    from: "  const opener = viewer === 'provider' ? 'openProviderBooking' : 'openBookingDetail';",
    to: "  const opener = 'openProviderBooking';" },
];

function gateOutput() {
  let out = '';
  try {
    out = execFileSync(process.execPath, [path.join(ROOT, 'tools', 'verify.cjs')],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (err) { out = (err.stdout || '') + (err.stderr || ''); }
  return out;
}
function readCheck(out, watch) {
  const line = out.split(/\r?\n/).find(l => l.indexOf(watch) >= 0);
  if (!line) return { seen: false, failed: false, why: 'the check vanished from the output' };
  const t = line.trim();
  return { seen: true, failed: t.indexOf('FAIL') === 0, why: t.slice(0, 170) };
}

let caught = 0, applied = 0, unmatched = 0;
/* Pre-flight every anchor before spending a gate pass on any of it: a needle that matches twice (or
   not at all) is a fact about this file, not about the application, and finding that out on the
   thirteenth run wastes thirteen. */
const bad = BREAKS.map((b, i) => [i, original.split(crlf(b.from)).length - 1]).filter(p => p[1] !== 1);
if (bad.length) {
  console.log('BROKEN  ' + bad.length + ' anchor(s) do not match exactly once — the file or this family moved:');
  bad.forEach(p => console.log('  [' + p[0] + '] ' + p[1] + '  ' + BREAKS[p[0]].from.split('\n')[0].trim().slice(0, 64)));
  process.exit(1);
}
const base = gateOutput();
for (const b of BREAKS) {
  const r = readCheck(base, b.check);
  if (!r.seen) { console.log('BROKEN  no gate check named "' + b.check + '"'); process.exit(1); }
  if (r.failed) { console.log('BROKEN  the gate is already red on "' + b.check + '": ' + r.why); process.exit(1); }
}
console.log('baseline: all ' + BREAKS.length + ' named checks pass on the file as it stands');

try {
  for (const b of BREAKS) {
    const hits = original.split(crlf(b.from)).length - 1;
    if (hits !== 1) {
      unmatched++;
      console.log('SKIP  ' + b.name + '  (its anchor matched ' + hits + ' times, needs exactly 1)');
      continue;
    }
    applied++;
    fs.writeFileSync(TARGET, original.replace(crlf(b.from), crlf(b.to)));
    const r = readCheck(gateOutput(), b.check);
    if (!r.seen) console.log('MISSED  ' + b.name + '  (' + r.why + ')');
    else if (r.failed) { caught++; console.log('CAUGHT  ' + b.name + '  → ' + r.why); }
    else console.log('MISSED  ' + b.name + '  (the named check still passes, so it is not reading what this breaks)');
  }
} finally {
  fs.writeFileSync(TARGET, original);
}
console.log('\n' + caught + ' of ' + applied + ' breaks caught, ' + unmatched + ' not applied; file restored.');
process.exit(applied > 0 && caught === applied && unmatched === 0 ? 0 : 1);
