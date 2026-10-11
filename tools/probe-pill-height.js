/* node tools/shot.cjs --probe=@tools/probe-pill-height.js --only=resident-home
   Did raising the search input to the tap floor make the pill taller?

   The pill is 56px today because its wrapper's min-height wins over a 23px input plus 5px of
   padding. A 44px input inside the same padding is 44 + 10 + 2 = 56, so the pill should not
   move — but the last time anything on this screen grew, the category grid lost its place on
   the first screen, and that was only found by measuring. This reports the pill, the grid's
   top edge, the tile height and how many tiles clear the bottom nav. */
(function () {
  var nav = document.querySelector('#nav') || document.querySelector('nav');
  var navTop = nav ? nav.getBoundingClientRect().top : window.innerHeight;
  var wrap = document.querySelector('.search-wrapper');
  var input = document.querySelector('.search-wrapper input');
  var grid = document.querySelector('.catgrid');
  var tiles = [].slice.call(document.querySelectorAll('.cat'));
  return {
    pill: wrap ? Math.round(wrap.getBoundingClientRect().height) : null,
    input: input ? Math.round(input.getBoundingClientRect().height) : null,
    gridTop: grid ? Math.round(grid.getBoundingClientRect().top) : null,
    tileH: tiles.length ? Math.round(tiles[0].getBoundingClientRect().height) : null,
    navTop: Math.round(navTop),
    tilesFullyVisible: tiles.filter(function (t) { return t.getBoundingClientRect().bottom <= navTop; }).length,
    tilesPartlyVisible: tiles.filter(function (t) { var r = t.getBoundingClientRect(); return r.top < navTop && r.bottom > navTop; }).length,
    totalTiles: tiles.length,
  };
})()
