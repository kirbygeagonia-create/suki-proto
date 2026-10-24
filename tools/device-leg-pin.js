/* One layer, one render, one number — the admin lock dialog's PIN field.
   Split out of tools/device-leg-surfaces.js because that whole evaluation (two renders per surface, four in
   all) answered `Runtime.evaluate timed out` on a software-rendered frame: the page could not finish that
   much work inside the WebView's own evaluation limit. A single navigation plus a single measurement can.
   Fidelity: the layer is raised by the app's own adminAccountAction('lock'), which is what the painted
   button calls; the tap-fidelity question is answered by tools/device-legs.cjs. */
(function () {
  state.sheet = null;
  state.adminAccountModal = null;
  state.view = 'app'; state.role = 'admin'; state.tab = 'profile';
  render();
  var h1 = (document.querySelector('#screen h1') || {}).textContent || '';
  if (typeof adminAccountAction === 'function') adminAccountAction('lock');
  var i = document.querySelector('.modal-layer input[type=password]');
  if (!i) return JSON.stringify({ h1: h1, pin: 'NO PIN FIELD AFTER adminAccountAction("lock")' });
  var cs = getComputedStyle(i), q = i.getBoundingClientRect();
  var s = document.createElement('span');
  s.style.cssText = 'position:absolute;left:-9999px;font-size:' + cs.fontSize + ';line-height:1';
  s.textContent = 'Hgs';
  document.body.appendChild(s);
  var glyph = Math.round(s.getBoundingClientRect().height * 10) / 10;
  s.remove();
  var out = {
    h1: h1,
    dialog: ((document.querySelector('.modal-layer b') || {}).textContent || '').trim(),
    placeholder: i.placeholder,
    specifiedSize: cs.fontSize,
    renderedGlyphHeightPx: glyph,
    boxH: Math.round(q.height * 10) / 10,
    minHeight: cs.minHeight,
    meets44: q.height >= 44,
    rootFont: getComputedStyle(document.documentElement).fontSize,
    viewport: innerWidth + 'x' + innerHeight
  };
  state.adminAccountModal = null; render();
  return JSON.stringify(out);
})()
