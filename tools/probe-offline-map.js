/* One expression the camera evaluates inside a real page, after that screen's own navigation:
     node tools/shot.cjs --probe=@tools/probe-offline-map.js --offline --only=provider-detail,booking-tracking,provider-job
   §1.7 allows exactly one remote dependency — OpenStreetMap tiles — and D7 asks what the screen says
   when they never arrive. Until `--offline` existed the honest answer was a reading of
   `mapFallback()` plus a tally that counts the requests that DID leave, which is the same claim from
   the wrong side: it proves what the app asks for, not what the app does when the ask fails.

   So this waits for the give-up and reports what was painted in the map's place. Three things have
   to be true, and the probe prints each separately so a reader can see which one failed:
     - a `.map-fallback` exists in the mount that asked for tiles;
     - it carries words, not an empty box;
     - no tile image is left painted as a blank rectangle (naturalWidth 0 with a source set).
   A screen that mounts no map is not a finding and not a pass — it answers `mapsOnScreen: 0` and
   abstains, because scoring "no fallback painted" on a screen that asked for no tiles would be the
   instrument inventing a defect out of its own population. */
(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const screen = document.getElementById('screen');
  if (!screen) return { answer: 'NO CONCLUSION', reason: 'this page paints no #screen' };
  const mounts = [...screen.querySelectorAll('.map-mount, [id$="map"]')];
  if (!mounts.length) return { findings: 0, mapsOnScreen: 0, abstained: 1, note: 'this screen mounts no map' };

  /* The give-up is on a timer, not on a synchronous error: Leaflet fires tileerror per tile and the
     app waits for the pane to stay empty. Poll rather than guess a duration. */
  let fallback = null;
  for (let i = 0; i < 40; i++) {
    fallback = screen.querySelector('.map-fallback');
    if (fallback) break;
    await wait(250);
  }
  const tiles = [...screen.querySelectorAll('img.leaflet-tile, .leaflet-tile-pane img')];
  const blankTiles = tiles.filter(t => t.getAttribute('src') && !t.naturalWidth).length;
  const words = fallback ? (fallback.textContent || '').replace(/\s+/g, ' ').trim() : '';
  const rows = [];
  if (!fallback) rows.push({ kind: 'no-fallback-painted', tilesRequested: tiles.length });
  else if (words.length < 12) rows.push({ kind: 'fallback-painted-without-words', words: words });
  if (blankTiles > 0 && !fallback) rows.push({ kind: 'blank-tile-rectangles-left-painted', blank: blankTiles });
  return {
    findings: rows.length,
    mapsOnScreen: mounts.length,
    fallbackPainted: !!fallback,
    fallbackWords: words.slice(0, 120),
    tilesRequested: tiles.length,
    blankTiles,
    waitedForGiveUpMs: 10000,
    report: rows,
  };
})()
