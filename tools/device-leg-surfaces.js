/* Both surfaces the leg exists to read, in ONE page evaluation.
   Why atomic: on the emulated frame the app restarted between separate probes (memory pressure ~92%, gms
   ANRs), so consecutive readings were taken on different pages — splash, login, then `state is not defined` —
   and each one still printed something plausible. One call cannot straddle a restart.
   Fidelity, stated: these layers are raised by the app's OWN handlers, not by a real tap. "Can a thumb open
   this" is proved by tools/device-legs.cjs's tapPainted path; "how big is the painted field" is this file,
   and the same code path also proves the layer opens when a handler reaches it. Returns an object; the
   driver counts it as a reading only if it parses. */
(function () {
  var out = { surfaces: {} };
  function factor() {
    var s = document.createElement('span');
    s.style.cssText = 'position:absolute;left:-9999px;top:0;font-size:100px;line-height:1;white-space:pre';
    s.textContent = 'Hgs';
    document.body.appendChild(s);
    var f = s.getBoundingClientRect().height / 100;
    s.remove();
    return Math.round(f * 1e4) / 1e4;
  }
  out.page = { view: state.view, role: state.role, rootFont: getComputedStyle(document.documentElement).fontSize,
    viewport: innerWidth + 'x' + innerHeight, factor: factor() };

  /* --- the admin lock dialog's PIN field --- */
  try {
    state.sheet = null; state.adminAccountModal = null;
    state.view = 'app'; state.role = 'admin'; state.tab = 'profile'; render();
    out.surfaces.hubH1 = (document.querySelector('#screen h1') || {}).textContent || '';
    if (typeof adminAccountAction === 'function') adminAccountAction('lock');
    var i = document.querySelector('.modal-layer input[type=password]');
    if (i) {
      var cs = getComputedStyle(i), q = i.getBoundingClientRect();
      var probe = document.createElement('span');
      probe.style.cssText = 'position:absolute;left:-9999px;font-size:' + cs.fontSize + ';line-height:1';
      probe.textContent = 'Hgs';
      document.body.appendChild(probe);
      var glyph = Math.round(probe.getBoundingClientRect().height * 10) / 10;
      probe.remove();
      out.surfaces.pin = {
        dialog: ((document.querySelector('.modal-layer b') || {}).textContent || '').trim(),
        placeholder: i.placeholder,
        specifiedSize: cs.fontSize,
        renderedGlyphHeightPx: glyph,
        boxH: Math.round(q.height * 10) / 10,
        boxW: Math.round(q.width * 10) / 10,
        minHeight: cs.minHeight,
        meets44: q.height >= 44,
        below14px: parseFloat(cs.fontSize) < 14
      };
    } else out.surfaces.pin = 'NO PIN FIELD AFTER adminAccountAction("lock")';
    state.adminAccountModal = null; render();
  } catch (e) { out.surfaces.pin = 'THREW: ' + e.message; }

  /* --- the resident filter sheet's rows --- */
  try {
    state.view = 'app'; state.role = 'resident'; state.tab = 'home';
    if (typeof startDiscovery === 'function') startDiscovery('leak');
    state.sheet = 'providerFilters'; render();
    out.surfaces.sheetTitle = ((document.querySelector('.sheet-title') || {}).textContent || '').trim();
    var rows = [].slice.call(document.querySelectorAll('.filter-option'));
    if (rows.length) {
      var hs = rows.map(function (r) { return Math.round(r.getBoundingClientRect().height * 10) / 10; });
      out.surfaces.rows = {
        n: rows.length, minH: Math.min.apply(null, hs), maxH: Math.max.apply(null, hs),
        below44: hs.filter(function (h) { return h < 44; }).length,
        sizes: Array.from(new Set(rows.map(function (r) { return getComputedStyle(r).fontSize; }))),
        lastReachable: (function () {
          var el = rows[rows.length - 1], q = el.getBoundingClientRect(), p = el.parentElement, sc = null;
          while (p) {
            if (p.scrollHeight > p.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(p).overflowY)) { sc = p; break; }
            p = p.parentElement;
          }
          return { inViewport: q.bottom <= innerHeight, scroller: sc ? (sc.className || sc.tagName) : 'none',
            room: sc ? Math.round(sc.scrollHeight) + ' in ' + Math.round(sc.clientHeight) : 'n/a' };
        })()
      };
    } else out.surfaces.rows = 'NO .filter-option ROWS PAINTED';
    state.sheet = null; render();
  } catch (e) { out.surfaces.rows = 'THREW: ' + e.message; }

  out.afterCleanup = { view: state.view, sheet: state.sheet, modal: state.adminAccountModal };
  return JSON.stringify(out);
})()
