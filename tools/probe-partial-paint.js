/* One expression the camera evaluates on every screen (run it with
     node tools/shot.cjs --probe=@tools/probe-partial-paint.js --width=320 --font-scale=2
   and compare against the same command at the default text scale).

   Why: an element pushed past the edge of the phone paints as a stub — a 3px sliver of a pill,
   half a chevron — and every existing tally calls that clean. It is not horizontal overflow
   (the document is not wider, the element is simply outside the frame), it is not clipped text
   (nothing clips it, the viewport does), and it is not off the type scale. The screenshot of the
   provider dashboard at 320px and 200% text had one such mark in the top-right of the first
   card, which is what this probe was written to name.

   It answers with the painted boxes that do not fit the viewport, widest overflow first, and
   carries the element's own text so the finding can be read without opening devtools. */
(() => {
  const vw = window.innerWidth;
  const hits = [];
  document.querySelectorAll('#screen *, .bottomnav *').forEach(el => {
    if (el.children.length) return;
    if (!(el.textContent || '').trim() && !el.classList.contains('ic')) return;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const over = Math.max(0, Math.round(r.right - vw));
    const before = Math.max(0, Math.round(-r.left));
    const worst = Math.max(over, before);
    if (worst <= 0) return;
    const cs = getComputedStyle(el);
    hits.push({
      tag: el.tagName.toLowerCase(),
      cls: (el.className || '').toString().slice(0, 28),
      text: (el.textContent || '').trim().slice(0, 22),
      over: worst, w: Math.round(r.width),
      size: Math.round(parseFloat(cs.fontSize) * 10) / 10,
      bg: cs.backgroundColor, radius: cs.borderTopLeftRadius,
    });
  });
  hits.sort((a, b) => b.over - a.over);
  return hits.length ? hits.slice(0, 6) : 'nothing painted past the viewport';
})()
