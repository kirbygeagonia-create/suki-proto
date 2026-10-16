/* One expression the camera evaluates inside a real page (run it with
     node tools/shot.cjs --probe=@tools/probe-date-frames.js --timezone=Pacific/Niue
   and again with --timezone=Pacific/Kiritimati, then diff the two logs).

   It answers with every date-shaped string the screen actually paints, so the question is
   "did a record's day move when only the timezone did" rather than a reading of the source.
   A record's date is a fact about the world; the words that print it must not depend on the
   machine's calendar frame. Relative labels (an ETA, "x minutes ago", open-now hours) are
   listed apart, because those are allowed to move and mixing them in would bury the finding. */
(() => {
  const head = (document.querySelector('#screen h1, #screen h2') || {}).textContent || '?';
  const ABS = /[A-Z][a-z]{2} \d{1,2}(, \d{4})?|\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{4}\b/;
  const REL = /\bin \d+ (?:day|week|month|year)s?\b|\b\d+ (?:minute|hour|day|week|month)s? ago\b|\b(?:Open|Closed) now\b|\btoday\b|\btomorrow\b|\byesterday\b/i;
  const abs = [], rel = [];
  const seen = new Set();
  document.querySelectorAll('#screen, .sheet-layer, .modal-layer').forEach(box => {
    const walk = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walk.nextNode())) {
      const t = (n.textContent || '').replace(/\s+/g, ' ').trim();
      if (!t || t.length > 160) continue;
      const hit = t.match(ABS);
      if (hit) {
        const k = 'A' + hit[0];
        if (!seen.has(k)) { seen.add(k); abs.push(hit[0]); }
      } else {
        const r = t.match(REL);
        if (r) {
          const k = 'R' + r[0].toLowerCase();
          if (!seen.has(k)) { seen.add(k); rel.push(r[0]); }
        }
      }
    }
  });
  return head + ' :: abs[' + abs.join(' | ') + '] rel[' + rel.join(' | ') + ']';
})()
