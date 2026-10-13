/* node tools/shot.cjs --probe=@tools/probe-composite-text.js [--only=...]
   ------------------------------------------------------------------
   What the contrast tally does NOT look at.

   AUDIT_JS measures text only on leaf elements (`if (el.children.length) return;`),
   which is the cheap way to skip nodes whose text is not their own. It also skips
   every element that carries its own text *and* has children — `<div>Fee <b>10%</b></div>`
   is never measured, and neither is any label wrapped around a control. This probe runs
   the identical colour math over exactly that excluded population, so "0 text below WCAG
   contrast" can be read as a coverage claim and not just a verdict.

   It also reports the one place a derived token was created to fix a rating and was never
   wired in: `.stars.on-dark .fill` paints `--gold` (#FFB800), which the token's own
   comment says is 4.1:1 on navy. A star is a graphic, so the applicable floor is 3:1 —
   this asks what it actually measures rather than what the comment asserts. */
(function () {
  var rgba = function (s) { var m = (s || '').match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/); return m ? [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]] : null; };
  var over = function (fg, bg) { return [0, 1, 2].map(function (i) { return fg[i] * fg[3] + bg[i] * (1 - fg[3]); }); };
  var lum = function (c) { var f = function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  var ratio = function (a, b) { var L1 = lum(a), L2 = lum(b); return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05); };
  function splitTop(s) { var out = [], depth = 0, cur = ''; for (var i = 0; i < s.length; i++) { var ch = s[i]; if (ch === '(') depth++; if (ch === ')') depth--; if (ch === ',' && depth === 0) { out.push(cur); cur = ''; } else cur += ch; } if (cur.trim()) out.push(cur); return out; }
  function toDeg(tok) { if (/deg$/.test(tok)) return parseFloat(tok); var dir = { 'to top': 0, 'to top right': 45, 'to right': 90, 'to bottom right': 135, 'to bottom': 180, 'to bottom left': 225, 'to left': 270, 'to top left': 315 }; var k = tok.replace(/\s+/g, ' ').trim(); return dir[k] === undefined ? 180 : dir[k]; }
  function parseGradient(img) { var m = img.match(/linear-gradient\((.*)\)/); if (!m) return null; var parts = splitTop(m[1]); var angle = 180; var head = parts[0].trim(); var am = head.match(/^(to\s+\w+(?:\s+\w+)?|[\d.]+deg)/i); if (am && parts.length > 2) { angle = toDeg(am[0]); parts.shift(); } var stops = []; parts.forEach(function (p, i, arr) { var c = rgba(p); if (!c) return; var pm = p.match(/([\d.]+)%\s*$/); stops.push({ c: c, pos: pm ? parseFloat(pm[1]) / 100 : (arr.length === 1 ? 0 : i / (arr.length - 1)) }); }); return stops.length ? { angle: angle, stops: stops } : null; }
  function sample(stops, t) { if (t <= stops[0].pos) return stops[0].c; if (t >= stops[stops.length - 1].pos) return stops[stops.length - 1].c; for (var i = 0; i < stops.length - 1; i++) { var a = stops[i], b = stops[i + 1]; if (t >= a.pos && t <= b.pos) { var k = (t - a.pos) / ((b.pos - a.pos) || 1); return [0, 1, 2, 3].map(function (j) { return a.c[j] + (b.c[j] - a.c[j]) * k; }); } } return stops[stops.length - 1].c; }
  function gradAt(node, spec, cx, cy) { var r = node.getBoundingClientRect(); var rad = spec.angle * Math.PI / 180; var dx = Math.sin(rad), dy = -Math.cos(rad); var L = Math.abs(r.width * dx) + Math.abs(r.height * dy); var t = (((cx - (r.left + r.width / 2)) * dx) + ((cy - (r.top + r.height / 2)) * dy)) / (L || 1) + 0.5; return sample(spec.stops, Math.max(0, Math.min(1, t))); }
  function backdrop(el) {
    var layers = [], n = el;
    while (n) { var s = getComputedStyle(n); var c = rgba(s.backgroundColor); if (c && c[3] > 0) layers.push({ solid: c }); var img = s.backgroundImage || ''; if (img.indexOf('linear-gradient') > -1) { var spec = parseGradient(img); if (spec) layers.push({ grad: spec, node: n }); } n = n.parentElement; }
    var r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    var acc = [255, 255, 255, 1];
    for (var i = layers.length - 1; i >= 0; i--) { var L = layers[i]; acc = over(L.solid || gradAt(L.node, L.grad, cx, cy).slice(0, 3).concat(1), acc); }
    return acc;
  }
  function visible(el) { var r = el.getBoundingClientRect(), s = getComputedStyle(el); if (!r.width || !r.height) return null; if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) === 0) return null; return r; }

  var fails = [], population = 0;
  document.querySelectorAll('#screen *, .sheet *, .auth-sheet *').forEach(function (el) {
    if (!el.children.length) return;
    var own = '';
    for (var i = 0; i < el.childNodes.length; i++) if (el.childNodes[i].nodeType === 3) own += el.childNodes[i].textContent;
    own = own.trim().replace(/\s+/g, ' ');
    if (own.length < 2) return;
    if (!visible(el)) return;
    population++;
    var s = getComputedStyle(el);
    var fg = rgba(s.color); if (!fg) return;
    var size = parseFloat(s.fontSize), bold = +s.fontWeight >= 700;
    var need = (size >= 24 || (size >= 18.66 && bold)) ? 3 : 4.5;
    var bg = backdrop(el);
    var got = ratio(over(fg, bg), bg);
    if (got < need - 0.01) fails.push({ text: own.slice(0, 30), ratio: Math.round(got * 100) / 100, need: need, px: size, on: 'rgb(' + bg.slice(0, 3).map(Math.round).join(',') + ')' });
  });

  var star = document.querySelector('.stars.on-dark .fill');
  var starInfo = null;
  if (star) {
    var sc = rgba(getComputedStyle(star).color), sbg = backdrop(star);
    starInfo = { fill: getComputedStyle(star).color, on: 'rgb(' + sbg.slice(0, 3).map(Math.round).join(',') + ')', ratio: Math.round(ratio(sc, sbg) * 100) / 100, nodes: document.querySelectorAll('.stars.on-dark').length };
  }
  return { compositePopulation: population, compositeFails: fails.length, examples: fails.slice(0, 5), onDarkStars: starInfo };
})()
