/* node tools/shot.cjs --probe=@tools/probe-home-order.js --only=resident-home --width=360 --height=640
   ------------------------------------------------------------------
   Where the category grid actually sits, with and without a job in motion.

   The order on Resident Home is not accidental. A comment above it says a job in motion is the
   reason the app was opened, so the active booking and the pending offer sit above the browsing,
   and "with nothing live the grid simply moves up into its place". If that conditional already
   works, then asking for the grid to move above the status cards only changes the case where
   something IS live — which is the case where the person is most likely checking where their
   plumber is. This measures both, so the trade is decided against numbers rather than against a
   preference about list order.
*/
(function () {
  function measure(label) {
    var nav = document.querySelector('#nav');
    var navTop = nav ? nav.getBoundingClientRect().top : window.innerHeight;
    var grid = document.querySelector('.catgrid');
    var tiles = [].slice.call(document.querySelectorAll('.cat'));
    var active = document.querySelector('[data-booking]');
    var r = grid ? grid.getBoundingClientRect() : null;
    return {
      case: label,
      gridTop: r ? Math.round(r.top) : null,
      tilesFullyAboveNav: tiles.filter(function (t) { return t.getBoundingClientRect().bottom <= navTop; }).length,
      tilesAnyAboveNav: tiles.filter(function (t) { return t.getBoundingClientRect().top < navTop; }).length,
      totalTiles: tiles.length,
      navTop: Math.round(navTop),
      firstThingBelowHeader: (function () {
        var el = document.querySelector('.pad .section-label');
        return el ? (el.textContent || '').trim() : null;
      })(),
    };
  }

  var out = [];
  out.push(measure('as shipped (a job is live)'));

  /* Now the same screen with nothing in motion, which is the case the comment says the grid
     already rises into. */
  var keep = { tab: state.tab, role: state.role };
  var live = BOOKINGS.filter(function (b) { return ['requested', 'accepted', 'confirmed', 'en_route', 'arrived', 'ongoing', 'upcoming'].indexOf(b.status) >= 0; });
  var was = live.map(function (b) { return [b.id, b.status]; });
  live.forEach(function (b) { b.status = 'completed'; });
  render();
  out.push(measure('with nothing live'));
  was.forEach(function (p) { var b = BOOKINGS.find(function (x) { return x.id === p[0]; }); if (b) b.status = p[1]; });
  render();

  return { screens: out, liveBookingsRestored: was.length };
})()
