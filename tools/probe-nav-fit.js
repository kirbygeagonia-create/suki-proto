/* One expression the camera evaluates on every screen (run it with
     node tools/shot.cjs --probe=@tools/probe-nav-fit.js --width=320 --font-scale=2
   and compare against the same command without the scale).

   It is the diagnostic behind a tally, not a substitute for one: tools/shot.cjs now counts
   "bottom-nav items pushed off the panel" on every sweep, so the finding is enforced; this file
   answers the next question — how wide the row wanted to be, which item hung past it, and how
   much of it the viewport still shows — without opening devtools on a phone.

   Why the tally exists at all: the camera already counted "horizontal overflow (a screen wider
   than the phone)" by asking the document, and on the same screen that answered "none" while the
   nav row measured scrollWidth 456 against clientWidth 320 and its last label painted as "Me".
   Found by reading a screenshot taken to check a chart.
   A control whose tap area is partly off-screen is a control the user cannot reach, which is the
   same defect as a tap target under 44px and is measured the same way — in the painted page. */
(() => {
  const vw = window.innerWidth;
  const rows = [];
  document.querySelectorAll('.navbar, #navbar, nav').forEach(nav => {
    const items = Array.from(nav.querySelectorAll('.navitem'));
    if (!items.length) return;
    const nr = nav.getBoundingClientRect();
    let worst = null;
    items.forEach(it => {
      const r = it.getBoundingClientRect();
      const over = Math.round(r.right - nr.right);
      const lab = it.querySelector('.nav-label');
      const clipped = lab ? Math.round(lab.getBoundingClientRect().right - nr.right) : 0;
      if (!worst || clipped > worst.clipped) {
        worst = { text: (lab ? lab.textContent : it.textContent).trim().slice(0, 12), clipped: Math.max(0, clipped),
          w: Math.round(r.width), off: Math.round(Math.max(0, nr.left - r.left)) };
      }
    });
    rows.push({ nav: Math.round(nr.width) + '/' + vw, scroll: nav.scrollWidth + '/' + nav.clientWidth,
      items: items.length, worst });
  });
  return rows.length ? rows : 'no bottom nav painted';
})()
