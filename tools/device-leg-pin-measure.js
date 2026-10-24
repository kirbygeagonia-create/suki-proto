/* Measure the already-painted PIN field — no navigation, no render, one rect and one span.
   The pair to tools/device-leg-pin-open.js. The split exists because the combined expression timed out on a
   software-rendered frame at font_scale 1.35: refusing three times identically is the instrument being too
   expensive, not the app being wrong. If the field is not on screen this says so rather than measuring
   something else, which is the difference between a refused reading and a false one. */
(function () {
  var i = document.querySelector('.modal-layer input[type=password]');
  if (!i) return JSON.stringify({ field: 'NOT PAINTED — run device-leg-pin-open.js first' });
  var cs = getComputedStyle(i), q = i.getBoundingClientRect();
  var s = document.createElement('span');
  s.style.cssText = 'position:absolute;left:-9999px;top:0;font-size:' + cs.fontSize + ';line-height:1;white-space:pre';
  s.textContent = 'Hgs';
  document.body.appendChild(s);
  var glyph = Math.round(s.getBoundingClientRect().height * 10) / 10;
  s.remove();
  var s100 = document.createElement('span');
  s100.style.cssText = 'position:absolute;left:-9999px;top:0;font-size:100px;line-height:1;white-space:pre';
  s100.textContent = 'Hgs';
  document.body.appendChild(s100);
  var factor = Math.round((s100.getBoundingClientRect().height / 100) * 1e4) / 1e4;
  s100.remove();
  return JSON.stringify({
    placeholder: i.placeholder,
    specifiedSize: cs.fontSize,
    measuredFactor: factor,
    renderedGlyphHeightPx: glyph,
    boxH: Math.round(q.height * 10) / 10,
    boxW: Math.round(q.width * 10) / 10,
    minHeight: cs.minHeight,
    meets44: q.height >= 44,
    rootFont: getComputedStyle(document.documentElement).fontSize,
    viewport: innerWidth + 'x' + innerHeight
  });
})()
