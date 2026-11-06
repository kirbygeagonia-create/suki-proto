/* One expression the camera evaluates inside a real page, once per screen of the walk:
     node tools/shot.cjs --probe=@tools/probe-action-duplication.js
   §5 asks for "a single prominent primary action per state". The case that found it was the
   provider's job screen, which painted FOUR buttons for TWO decisions: the request card offered
   "Accept request" and "Decline", and the action bar below offered the same two acts again as
   "Accept this request" and "Decline this request". No tally sees that — every control is 44px,
   nothing is clipped, nothing collides, the contrast is fine. It surfaced only by printing the
   painted button list, and the gate check that now holds it is proven by
   `node tools/falsify-one-action.cjs` (3 breaks, 3 caught).

   What counts as a primary is the class list, not the visual weight: exactly ["btn"] is the PRIMARY
   tier of §70's four. A screen may legitimately carry a secondary and a destructive beside it. The
   expectation is derived from the machine rather than typed in, so a finished job painting zero
   primaries is not a finding and a finished job painting one is.

   TWO VERSIONS OF THIS PROBE INVENTED FINDINGS, and the second half is why it no longer has one.
     1. it asked "does this screen paint one primary for the moves this booking offers" of any screen
        holding a booking card, so the Bookings LIST — where a row opens a detail and no row is an
        action — answered `primaries=0, movesOffered=2` sixteen times;
     2. it flagged a button label appearing twice on one screen, which reported "Open verification"
        on the admin's queue (once per applicant — that is a table) and then "Open document" inside a
        single card that holds a LIST of documents. A repeated verb across rows is what a row means.
   Both were the instrument's scope, not the application's. The rule that survives is the one with a
   real case behind it, asserted only on the screen that owns the job: the one that paints the path.

   `instrumentRows` counts the screens where this probe could not answer, and a refusal is reported
   rather than defaulted to zero — a busy or blind instrument cannot report a negative. */
(() => {
  const screen = document.getElementById('screen');
  if (!screen) return { answer: 'NO CONCLUSION', reason: 'this page paints no #screen' };
  const buttons = [...screen.querySelectorAll('button, a.btn')];
  const classOf = (el) => (typeof el.className === 'string' ? el.className : (el.className.baseVal || '')).trim().split(/\s+/).filter(Boolean);
  const primaries = buttons.filter(el => classOf(el).length === 1 && classOf(el)[0] === 'btn');

  const paintsAPath = !!screen.querySelector('.stepper, .step-line, .mini-steps');
  const rec = paintsAPath
    ? (BOOKINGS.find(b => b.id === state.selectedBookingId) || BOOKINGS.find(b => b.id === state.selectedProviderBookingId))
    : null;
  const offered = rec && state.role === 'provider' && typeof providerJobMoves === 'function'
    ? providerJobMoves(rec).filter(m => m.kind !== 'note').length : null;

  const rows = [];
  if (offered !== null && primaries.length !== (offered ? 1 : 0)) {
    rows.push({ kind: 'primary-count', booking: rec.id, status: rec.status, primaries: primaries.length, movesOffered: offered });
  }

  return {
    findings: rows.length,
    instrumentRows: buttons.length === 0 && screen.textContent.trim().length > 40 ? 1 : 0,
    buttonsPainted: buttons.length,
    primaries: primaries.length,
    movesOffered: offered,
    pathScreens: paintsAPath ? 1 : 0,
    scored: offered !== null ? 1 : 0,
    report: rows,
  };
})()
