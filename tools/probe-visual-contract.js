/* The five visual contracts the mobile-app pass added, measured in a real layout.

   Each one guards a defect that every existing sensor was blind to, which is why they are separate
   tallies rather than extra lines in an old one:

     1. entityText   — no visible text on any screen matches &[a-z]+; or &#\d+;   (guards D2:
                       emptyState() escapes its title, so an entity typed into the string arrives as
                       the literal words "&ldquo;leak&rdquo;")
     2. splitChips   — no badge/chip paints on more than one line, and no word inside one is split
                       (guards D1; a containment question cannot see it, because both lines are
                       inside the pill)
     3. categoryIcons— every SERVICES id resolves to a drawn glyph from the one family, and no <img>
                       references category-art                       (guards 4.6)
     4. gridAboveFold— the category grid's bottom edge sits above the bottom navigation's top edge on
                       Resident Home                                   (guards P2)
     5. oneBottomBar — on a pushed screen exactly one fixed bar occupies the bottom               (guards D5)

   `findings` counts problems with the app; a leg the probe could not complete is reported separately
   as `instrumentRows`, so a clean zero always means it looked.

     node tools/shot.cjs --probe=@tools/probe-visual-contract.js
*/
(async () => {
  const report = {};
  const instrumentRows = [];
  const findings = [];

  /* 1 — entity text. Text nodes only, so an attribute that legitimately carries an entity is not
     mistaken for painted markup, and the page's own source is never consulted. */
  const entityRe = /&[a-zA-Z]+;|&#\d+;/;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const entityHits = [];
  let node;
  while ((node = walker.nextNode())) {
    const t = node.nodeValue;
    if (!t || !t.trim()) continue;
    if (entityRe.test(t)) {
      const el = node.parentElement;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      entityHits.push((el.closest('.screen') ? 'screen' : 'page') + ' "' + t.trim().slice(0, 40) + '"');
    }
  }
  report.entityText = entityHits.length;
  report.entityExamples = entityHits.slice(0, 4);
  if (entityHits.length) findings.push('entity text painted: ' + entityHits.length);

  /* 2 — a chip on more than one line, or a word split inside it. Line boxes are counted through a
     Range, because an element rect covers every wrapped line at once. */
  let splitChips = 0;
  const chipExamples = [];
  for (const chip of document.querySelectorAll('.chip, .status-pill, .seg-count, .notif-count')) {
    const rng = document.createRange();
    rng.selectNodeContents(chip);
    const boxes = rng.getClientRects();
    rng.detach && rng.detach();
    if (boxes.length > 1) { splitChips++; chipExamples.push(JSON.stringify(chip.textContent.trim().slice(0, 22)) + ' on ' + boxes.length + ' lines'); }
  }
  report.splitChips = splitChips;
  report.splitChipExamples = chipExamples.slice(0, 4);
  if (splitChips) findings.push('chip painted on more than one line: ' + splitChips);

  /* 3 — the trades draw, and no raster is asked for.
     Resolved by BARE identifier, not through `window`: a top-level `const` in a classic script is a
     global *lexical* binding and never becomes a window property, so `window.SERVICES` answers
     undefined and the leg would report a clean zero about a set it never saw. */
  const SVC = (typeof SERVICES !== 'undefined') ? SERVICES : null;
  const ICO = (typeof ICONS !== 'undefined') ? ICONS : null;
  if (!SVC) instrumentRows.push('SERVICES is not reachable as a lexical binding — the icon leg measured nothing');
  const trades = (SVC || []).map(s => s.id);
  const undrawn = trades.filter(id => {
    const s = (SVC || []).find(x => x.id === id);
    if (!s || !ICO || !ICO[s.icon]) return true;
    return !ICO[s.icon].o;
  });
  report.tradesRead = trades.length;
  report.undrawnTrades = undrawn.length;
  const rasterArt = [...document.querySelectorAll('img')].filter(i => /category-art/.test(i.getAttribute('src') || ''));
  report.categoryArtImgs = rasterArt.length;
  if (trades.length === 0) instrumentRows.push('SERVICES not reachable from the page — the icon leg measured nothing');
  else if (undrawn.length) findings.push('trades with no drawn glyph: ' + undrawn.join(','));
  if (rasterArt.length) findings.push('category-art <img> still painted: ' + rasterArt.length);

  /* 4 — the grid above the fold on Home. Only asserted where a grid is actually painted. */
  const grid = document.querySelector('.catgrid');
  if (grid) {
    const nav = document.querySelector('.bottomnav');
    const g = grid.getBoundingClientRect();
    const navTop = nav ? nav.getBoundingClientRect().top : window.innerHeight;
    report.gridBottom = Math.round(g.bottom);
    report.navTop = Math.round(navTop);
    report.gridAboveFold = g.bottom <= navTop ? 1 : 0;
    if (g.bottom > navTop) findings.push('category grid bottom ' + Math.round(g.bottom) + ' is past the nav top ' + Math.round(navTop));
  } else report.gridAboveFold = 'no grid on this screen';

  /* 5 — exactly one fixed bar at the bottom of a pushed screen. */
  const screen = document.querySelector('.screen');
  const rootish = screen && screen.getAttribute('data-root') === '1';
  const bars = [];
  const nav = document.querySelector('.bottomnav');
  if (nav && nav.offsetParent !== null) bars.push('bottomnav');
  for (const b of document.querySelectorAll('.book-bar, [data-sticky-bar]')) {
    const r = b.getBoundingClientRect();
    if (b.offsetParent !== null && r.height > 0 && r.bottom > window.innerHeight - 90) bars.push(b.className.split(' ')[0] || 'sticky');
  }
  report.fixedBars = bars.length;
  report.fixedBarNames = bars;
  if (!rootish && bars.length > 1) findings.push('a pushed screen paints ' + bars.length + ' fixed bottom bars: ' + bars.join(','));
  if (rootish && bars.length === 0) instrumentRows.push('a root tab painted no bottom bar at all — the walk is on the wrong screen');

  return {
    findings: findings.length,
    instrumentRows: instrumentRows.length,
    report: Object.assign(report, { verdict: findings, instrumentNotes: instrumentRows }),
  };
})()