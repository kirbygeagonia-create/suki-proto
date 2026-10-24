/* Bench self-check for the walk-9 readers. The device driver asks five questions of the page; if any
   of those expressions is a typo, the walk prints MISSING/NO ROWS on a phone that is fine and the leg
   is burned on the instrument. Run the same text here, where the answer is known: the bench paints the
   PIN field at 56px and sixteen filter rows at the 44px floor, so a reader that cannot say that on the
   bench cannot be trusted on a handset.

     node tools/shot.cjs --probe=@tools/device-leg-readers.js --only=admin-lock-modal,resident-filter-sheet

   Returns one object per screen it can answer for and NO CONCLUSION on the screens where the subject is
   genuinely absent, so the runner counts answers rather than assuming them. */
(function () {
  var out = {};
  var pin = document.querySelector('.modal-layer input[type=password]');
  var rows = [].slice.call(document.querySelectorAll('.filter-option'));
  var title = (document.querySelector('.modal-layer b, .sheet-title') || {}).textContent || '';

  if (pin) {
    var cs = getComputedStyle(pin), q = pin.getBoundingClientRect(), lab = pin.closest('label');
    out.pin = {
      dialog: title.trim(),
      placeholder: pin.placeholder,
      computedFontSize: cs.fontSize,
      rootFont: getComputedStyle(document.documentElement).fontSize,
      rectH: Math.round(q.height * 10) / 10,
      minHeight: cs.minHeight,
      tapFloorOk: q.height >= 44,
      labelText: lab ? lab.firstChild.textContent.replace(/\s+/g, ' ').trim() : 'NO LABEL'
    };
    return out;
  }

  if (rows.length) {
    var hs = rows.map(function (r) { return Math.round(r.getBoundingClientRect().height * 10) / 10; });
    var last = rows[rows.length - 1].getBoundingClientRect();
    /* Reachability has to ask whether an ancestor scrolls. The first version of this reader only asked
       whether the rect met the viewport, and on a sheet whose own body scrolls it answers "off screen"
       about a row any thumb can reach — the walk would have filed that as a defect in the app. */
    var sc = null, p = rows[rows.length - 1].parentElement;
    while (p) {
      if (p.scrollHeight > p.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(p).overflowY)) { sc = p; break; }
      p = p.parentElement;
    }
    out.sheet = {
      title: title.trim(),
      n: rows.length,
      minH: Math.min.apply(null, hs),
      maxH: Math.max.apply(null, hs),
      below44: hs.filter(function (h) { return h < 44; }).length,
      fontSizes: Array.from(new Set(rows.map(function (r) { return getComputedStyle(r).fontSize; }))),
      setSize: new Set(rows.map(function (r) { return getComputedStyle(r).fontSize; })).size,
      first3: rows.slice(0, 3).map(function (r) { return r.textContent.replace(/\s+/g, ' ').trim().slice(0, 26); }),
      inViewportNow: last.top >= 0 && last.bottom <= innerHeight,
      scroller: sc ? (sc.className || sc.tagName) : 'none',
      scrollerSeesMore: sc ? Math.round(sc.scrollHeight) + ' in ' + Math.round(sc.clientHeight) : 'n/a',
      reachable: last.bottom <= innerHeight || !!sc,
      viewportH: Math.round(innerHeight)
    };
    return out;
  }

  return { refuse: 'NO CONCLUSION: neither a modal PIN field nor a .filter-option row is painted on ' +
    (document.querySelector('#screen h1') || {}).textContent };
})()
