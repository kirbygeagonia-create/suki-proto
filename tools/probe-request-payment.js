/* One expression the camera evaluates inside a real page:
     node tools/shot.cjs --probe=@tools/probe-request-payment.js --only=booking-sheet
   §3f item: does the payment row the sheet MARKS become the payment the RECORD carries, and does the
   booking detail then say the same thing? Until now this was only reasoned about from `payIdx` and
   `choice.pay.code`, which is the mistake this repository keeps naming: reading the model while the
   question is about what a person sees and what the write stored.

   It walks the path a thumb takes, in the sheet the camera already opened by clicking: read the
   painted payment rails, click the LAST one (so a default-only pass cannot fake it), confirm the rail
   that now reports aria-pressed is the one clicked, submit through the sheet's own Send button, wait
   past the app's 900 ms commit, then compare three separate things — what was marked, what the record
   stored, what the detail screen paints. The booking count is printed on every branch: a submit that
   silently did nothing would otherwise look like agreement between three empty values. */
(async () => {
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const rails = [].slice.call(document.querySelectorAll('.pick'))
    .filter(el => /pickRequest\('payIdx'/.test(el.getAttribute('onclick') || ''));
  if (rails.length < 2) return 'NO CONCLUSION — the sheet painted ' + rails.length + ' payment rail(s)';
  const send = [].slice.call(document.querySelectorAll('button'))
    .find(b => /submitBookingRequest\(\)/.test(b.getAttribute('onclick') || ''));
  if (!send) return 'NO CONCLUSION — no Send button was painted, so nothing could be submitted';

  const chosen = rails[rails.length - 1];
  const label = (chosen.textContent || '').trim().replace(/\s+/g, ' ');
  const before = BOOKINGS.length;
  chosen.click();
  await wait(60);
  /* Re-query AFTER the click: `pickRequest` renders, which detaches every node captured above, and
     asking a detached rail what it reports pressed answers the question "what was painted before the
     tap" — the first version of this probe did exactly that and reported the wrong rail as marked.
     The text of the live nodes is the only honest read of what the screen shows as chosen. */
  const liveRails = [].slice.call(document.querySelectorAll('.pick'))
    .filter(el => /pickRequest\('payIdx'/.test(el.getAttribute('onclick') || ''));
  const pressed = liveRails.filter(r => r.getAttribute('aria-pressed') === 'true')
    .map(r => (r.textContent || '').trim().replace(/\s+/g, ' '));
  const model = requestChoices(state.requestDraft).pay || {};

  send.click();
  await wait(1600);
  const after = BOOKINGS.length;
  const rec = BOOKINGS.find(b => b.source === 'live') || null;
  if (!rec) return JSON.stringify({ marked: label, pressed: pressed.join('|'), modelCode: model.code,
    bookingsBefore: before, bookingsAfter: after, verdict: 'NO RECORD CREATED' });

  /* The booking detail is a destination, not a field assignment: the camera's own entry calls
     openBookingDetail(id), so this does too, and a screen that does not paint is then reported as a
     screen that does not paint rather than as a payment row that disagrees. */
  state.view = 'app'; state.role = 'resident';
  openBookingDetail(rec.id);
  render();
  const painted = ((document.getElementById('screen') || {}).innerText || '').replace(/\s+/g, ' ');
  const mention = (painted.match(/[^.]{0,60}(payment|pay|GCash|cash|Maya)[^.]{0,60}/i) || [''])[0].trim();
  return JSON.stringify({
    marked: label, pressed: pressed.join('|'), modelCode: model.code,
    recordMethod: rec.payMethod, recordPayStatus: rec.payStatus, recordAddress: (rec.address || '').slice(0, 28),
    bookingsBefore: before, bookingsAfter: after,
    markMatchesRecord: !!(model.code && model.code === rec.payMethod),
    labelMatchesPainted: pressed.indexOf(label) > -1,
    detailSnippet: mention.slice(0, 90),
    detailNamesRecordStatus: new RegExp(String(rec.payStatus).replace(/_/g, ' '), 'i').test(painted)
      || /pending|paid|unpaid|collected|cash/i.test(mention)
  });
})()
