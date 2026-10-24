/* One expression the camera evaluates on every screen of the walk:
     node tools/shot.cjs --probe=@tools/probe-money-sums.js     # every screen in the walk
   A STATISTIC CAN COUNT TWO QUESTIONS UNDER ONE LABEL, and this file already records two instances:
   the admin tile that printed 10 under "Live bookings" by summing two different questions, and the
   resident's profile module showing ₱2,500 where the records held ₱590. Both were caught by checking
   a rendered module against its records. Neither check generalised, so this asks the question of
   every screen: where a card paints an aggregating label next to the figures it claims to add up,
   does it add up?

   The first version of this file produced six findings and every one of them was its own error, which
   is the reason the corrected rules are written out here rather than quietly fixed:
     · it treated any label containing "fee" as an aggregate, so the receipt's own "Booking fee" line
       was read as a total; and
     · it summed the muted provider-side rows — "Ramil keeps", "Sukinnect fee from their share" — into
       what the CUSTOMER pays, then reported the difference as a bug.
   Both rows belong to the other party's arithmetic. So an aggregate is only a label on this list, a
   row is skipped when its amount carries the app's muted class (which is exactly how the receipt marks
   the provider-side figures), and `checked` is reported alongside `findings` — a zero that means
   "nothing agreed or disagreed because nothing was looked at" has to be tellable apart from a zero
   that means the money is right. */
(() => {
  const PESO = /₱\s?-?[\d,]+(?:\.\d+)?/;
  const val = (t) => { const m = t.match(/₱\s?(-?[\d,]+(?:\.\d+)?)/); return m ? Number(m[1].replace(/,/g, '')) : null; };
  const AGGREGATES = /^(total|year to date|collected|outstanding|balance|paid out|spent|amount due)\b/i;
  const out = [];
  let checked = 0;
  [].slice.call(document.querySelectorAll('.card')).forEach(card => {
    const title = ((card.querySelector('.card-title, b, h3') || {}).textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    const rows = [].slice.call(card.querySelectorAll('.row, .chart-row, li')).map(r => {
      const first = r.querySelector('span, div');
      const amountEl = [].slice.call(r.querySelectorAll('b, strong')).reverse().find(b => PESO.test(b.textContent || ''));
      /* A row counts only when its amount IS a figure. The remaining false positive on the first run
         was "Next payout — needs ₱500 more": a shortfall written as a sentence, summed as if it were
         a line item, then reported as an app that cannot add up. Sentences are not components. */
      if (!first || !amountEl || !/^₱[\d,.\s]+$/.test((amountEl.textContent || '').trim())) return null;
      /* Muted amounts are the other side of the transaction, not a component of this one. */
      const muted = (amountEl.className || '').indexOf('mut') > -1 || (first.className || '').indexOf('mut') > -1;
      const label = (first.textContent || '').trim().replace(/\s+/g, ' ');
      const v = val(amountEl.textContent || '');
      return v === null ? null : { label, value: v, muted };
    }).filter(Boolean);
    const agg = rows.filter(r => !r.muted && AGGREGATES.test(r.label));
    const parts = rows.filter(r => !r.muted && !AGGREGATES.test(r.label));
    if (!agg.length || parts.length < 2) return;
    checked++;
    const sum = Math.round(parts.reduce((n, r) => n + r.value, 0) * 100) / 100;
    agg.forEach(a => {
      if (Math.abs(a.value - sum) <= 1) return;   /* whole-peso display rounding is not a defect */
      out.push({ card: title, label: a.label, painted: a.value, sumOfParts: sum,
        delta: Math.round((a.value - sum) * 100) / 100,
        parts: parts.map(r => r.label + '=' + r.value).join(' | ').slice(0, 160) });
    });
  });
  return JSON.stringify({
    screen: ((document.querySelector('#screen h1') || {}).textContent || '').trim().slice(0, 22),
    cardsWithTotals: checked, candidates: out.length,
    /* A NUMBER under the key `findings`, because `probe-all.cjs` reads that key to decide whether the
       row is clean. This used to print the array itself, so the runner could not tell `findings:[]`
       from `findings:2` without parsing prose, and the rows this instrument exists to catch — the
       receipt that does not add up — were invisible to the aggregate. */
    findings: out.length, findingRows: out
  });
})()
