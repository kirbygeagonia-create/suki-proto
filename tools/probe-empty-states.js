/* One expression the camera evaluates inside a real page:
     node tools/shot.cjs --probe=@tools/probe-empty-states.js --only=resident-bookings
   AGENTS 48 says an empty state has to explain what is missing and what to do next, and 76 says a
   statistic must not be decorative. Neither is provable by looking at a screen that has demo data
   on it, so this removes the data: it empties each record set the app renders from, re-renders the
   screen the person would see, measures what words are left, and puts the records back.

   "Almost nothing painted" is the finding it is looking for — a blank panel where a list was, or a
   screen that still asserts counts after the thing being counted is gone. */
(() => {
  const NAMES = ['BOOKINGS', 'PROVIDERS', 'NOTIFICATIONS', 'OFFERS', 'DISPUTES', 'MESSAGES',
    'LEDGER', 'PAYMENTS', 'PAYOUTS', 'LISTINGS', 'CREDENTIALS', 'PENDING_APPLICANTS'];
  const head = (document.querySelector('#screen h1, #screen h2') || {}).textContent || '?';
  const words = () => {
    let t = '';
    document.querySelectorAll('#screen, .sheet-layer, .modal-layer').forEach(box => { t += ' ' + box.textContent; });
    return t.replace(/\s+/g, ' ').trim();
  };
  const report = [];
  const base = words().length;
  NAMES.forEach(name => {
    /* Resolved by bare identifier, not off `window`: the records are top-level `const` bindings,
       which never become window properties, so a window lookup reports every one of them as
       missing and the probe answers "nothing to test" about a page it never actually touched. */
    let arr = null;
    try { arr = (typeof eval(name) !== 'undefined') ? eval(name) : null; } catch (notInScope) { arr = null; }
    if (!Array.isArray(arr)) { report.push(name + ': not a reachable array'); return; }
    const saved = arr.slice();
    let after = '';
    try {
      arr.length = 0;
      render();
      after = words();
    } finally {
      saved.forEach(v => arr.push(v));
      render();
    }
    const gone = base - after.length;
    report.push(name + ' (' + saved.length + ' rows): words ' + base + ' -> ' + after.length
      + (gone > 60 ? '  LOST ' + gone : '')
      + (after.length < 60 ? '  BARE: "' + after.slice(0, 50) + '"' : ''));
  });
  return JSON.stringify({ screen: head, restored: words().length === base, report: report }, null, 1);
})()
