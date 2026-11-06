/* One expression the camera evaluates inside a real page, once per screen of the walk:
     node tools/shot.cjs --probe=@tools/probe-step-words-agree.js
   The defect this exists to catch was found by reading a comment, not a screen: the resident's Home
   card kept its own list of step names beside the six states, and called the state the machine
   names "Accepted" a step called "Scheduled". One booking, two stories, in two vocabularies — and
   every instrument agreed, because the arithmetic was right, the geometry was right, and only the
   NOUN was wrong.

   So this asks the question a source grep cannot: on the screen as painted, does every surface that
   names a job's state say the word the record's own status produces?

   The first version of this probe reported two findings and BOTH WERE ITS OWN ERROR. It compared
   every state chip on the screen against the machine word of the FIRST booking the screen held, so
   a list of eight jobs — where each row legitimately names its own state — answered "Accepted
   disagrees with In progress". A card is the unit of comparison, not a screen: each container that
   carries a booking id is scored against its OWN record, and the screen-level surfaces (the bar
   chip, the step line, the stepper's current row) are only scored on a screen that holds exactly
   one booking, because that is the only screen where "this job" is defined.

   A page that paints nothing is a blind instrument, not a clean one: that answers NO CONCLUSION. */
(() => {
  const screen = document.getElementById('screen');
  if (!screen) return { answer: 'NO CONCLUSION', reason: 'this page paints no #screen' };
  if (typeof label !== 'function' || typeof BOOKING_STATES === 'undefined') {
    return { answer: 'NO CONCLUSION', reason: 'the state vocabulary is not reachable from this page' };
  }
  const text = (el) => (el.textContent || '').replace(/\s+/g, ' ').trim();
  const LOOKS_LIKE_A_STATE = /^(requested|accepted|scheduled|on the way|arrived|in progress|completed|no answer|no one there|under review|cancelled|no_show)$/i;
  const vocabulary = new Set(Object.keys(BOOKING_STATES).map(k => label(k).toLowerCase()));
  const rows = [];
  let cardsRead = 0, surfacesRead = 0;

  const idOf = (el) => el.getAttribute('data-booking') || el.getAttribute('data-provider-booking-id');
  const cards = [...screen.querySelectorAll('[data-booking], [data-provider-booking-id]')].filter(el => idOf(el) && BOOKINGS.some(b => b.id === idOf(el)));

  cards.forEach(card => {
    const rec = BOOKINGS.find(b => b.id === idOf(card));
    const word = label(rec.status).toLowerCase();
    const inside = [...card.querySelectorAll('.chip, .status-pill, .step-now, .slabel')]
      .map(el => ({ el, t: text(el) }))
      .filter(x => LOOKS_LIKE_A_STATE.test(x.t));
    if (!inside.length) return;
    cardsRead++;
    inside.forEach(x => {
      if (!vocabulary.has(x.t.toLowerCase())) {
        rows.push({ kind: 'word-not-in-the-vocabulary', booking: rec.id, painted: x.t });
      } else if (x.t.toLowerCase() !== word) {
        rows.push({ kind: 'card-disagrees-with-its-own-record', booking: rec.id, record: label(rec.status), painted: x.t });
      }
    });
  });

  /* Screen-level surfaces. A detail screen carries no booking id on its own card, so the record it
     is about cannot be read from markup — but the invariant that actually broke did not need the
     record: the bar chip, the step line and the stepper's current row disagreed with EACH OTHER,
     one saying "Accepted" and the other "Scheduled". So on a screen that paints a path and holds no
     list of jobs, every state word it paints has to be the same word.
     The first version of this block used `state.selectedBookingId` as the screen's subject, which is
     a global that survives navigation: it reported "screens about one job: 101" — every screen in
     the app, including the login page — and read surfaces on screens that were about nothing. */
  const paintsAPath = !!screen.querySelector('.stepper, .step-line, .mini-steps');
  if (cards.length === 0 && paintsAPath) {
    const spots = [];
    const bar = document.querySelector('.topbar');
    if (bar) bar.querySelectorAll('.chip, span').forEach(el => spots.push({ where: 'bar', t: text(el) }));
    const stepNow = screen.querySelector('.step-now');
    if (stepNow) spots.push({ where: 'step-line', t: text(stepNow), fromStep: true });
    screen.querySelectorAll('.stepper .sp.now .slabel').forEach(el => spots.push({ where: 'stepper', t: text(el), fromStep: true }));
    /* The step surfaces name a state BY CONSTRUCTION, so every word they paint has to be in the
       vocabulary — a step called "Scheduled" or "Working now" is the defect, and pre-filtering by the
       words the probe already expects would be blind to exactly the novel word it exists to catch.
       The bar is different: §22 keeps payment beside status there, so a bar chip is only scored when
       it is already a state word, and a payment word is legitimately a different word. */
    const hits = spots.filter(s => s.fromStep
      ? (s.t.length > 0 && s.t.length <= 30)
      : LOOKS_LIKE_A_STATE.test(s.t));
    hits.forEach(s => {
      surfacesRead++;
      if (!vocabulary.has(s.t.toLowerCase())) rows.push({ kind: 'word-not-in-the-vocabulary', where: s.where, painted: s.t });
    });
    const words = [...new Set(hits.map(s => s.t.toLowerCase()))];
    if (words.length > 1) {
      rows.push({ kind: 'surfaces-name-one-job-differently', painted: hits.map(s => s.where + '="' + s.t + '"') });
    }
  }

  return {
    findings: rows.length,
    cardsRead: cardsRead,
    surfacesRead: surfacesRead,
    screensPaintingAPath: paintsAPath ? 1 : 0,
    report: rows.slice(0, 6),
  };
})()
