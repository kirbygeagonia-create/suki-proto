/* One layer, one render, one count — the resident filter sheet's option rows.
   The sibling of tools/device-leg-pin.js, split for the same reason: the combined evaluation timed out on a
   software-rendered frame. Reachability asks whether an ancestor scrolls, because the rect meeting the
   viewport is not the rule — the first version of that check called a reachable row unreachable. */
(function () {
  state.sheet = null;
  state.view = 'app'; state.role = 'resident'; state.tab = 'home';
  if (typeof startDiscovery === 'function') startDiscovery('leak');
  state.sheet = 'providerFilters';
  render();
  var rows = [].slice.call(document.querySelectorAll('.filter-option'));
  var out = {
    h1: (document.querySelector('#screen h1') || {}).textContent || '',
    title: ((document.querySelector('.sheet-title') || {}).textContent || '').trim(),
    n: rows.length
  };
  if (rows.length) {
    var hs = rows.map(function (r) { return Math.round(r.getBoundingClientRect().height * 10) / 10; });
    out.minH = Math.min.apply(null, hs);
    out.maxH = Math.max.apply(null, hs);
    out.below44 = hs.filter(function (h) { return h < 44; }).length;
    out.sizes = Array.from(new Set(rows.map(function (r) { return getComputedStyle(r).fontSize; })));
    var el = rows[rows.length - 1], q = el.getBoundingClientRect(), p = el.parentElement, sc = null;
    while (p) {
      if (p.scrollHeight > p.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(p).overflowY)) { sc = p; break; }
      p = p.parentElement;
    }
    out.last = { inViewport: q.bottom <= innerHeight, scroller: sc ? (sc.className || sc.tagName) : 'none',
      room: sc ? Math.round(sc.scrollHeight) + ' in ' + Math.round(sc.clientHeight) : 'n/a' };
  }
  out.viewport = innerWidth + 'x' + innerHeight;
  state.sheet = null; render();
  return JSON.stringify(out);
})()
