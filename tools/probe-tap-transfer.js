/* node tools/shot.cjs --probe=@tools/probe-tap-transfer.js --width=360 --height=640
   ------------------------------------------------------------------
   Is a small control's hit area actually small?

   The camera's tap check walks three ancestors looking for a taller box, and then — despite
   its own comment saying "a 23px input inside a 56px pill is a 56px target" — reports the
   control anyway without consulting that box. So the list of sub-44px controls mixes two very
   different things: a control whose wrapper genuinely takes the touch, and one where the
   wrapper is inert decoration and the only place you can hit is the 23px input itself.

   A wrapper transfers the touch in exactly three ways, and this asks the live DOM which apply:
   it is a <label> whose control is this element (browsers forward the click natively), it has
   its own click handler, or it is a <button>/<a> that contains the control. Anything else is
   padding over the page background, and tapping it does nothing.
*/
(function () {
  var TAP = 44;
  function painted(el) {
    var r = el.getBoundingClientRect(), s = getComputedStyle(el);
    if (!r.width || !r.height) return null;
    if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) === 0) return null;
    return r;
  }
  function text(el) {
    return [(el.textContent || ''), (el.getAttribute('aria-label') || ''), el.placeholder || '', el.title || '', el.id || '']
      .map(function (s) { return s.trim().replace(/\s+/g, ' '); }).find(function (s) { return s.length; }) || '';
  }
  function transfers(el, wrapper) {
    if (wrapper === el) return 'self';
    if (wrapper.tagName === 'LABEL' && wrapper.control === el) return 'label';
    if (/^(BUTTON|A|SUMMARY)$/.test(wrapper.tagName)) return 'element';
    if (wrapper.onclick || wrapper.getAttribute('onclick')) return 'handler';
    return 'none';
  }

  var out = { small: [], transferred: 0 };
  var seen = new Set();
  document.querySelectorAll('#screen *, .sheet *, .auth-sheet *').forEach(function (el) {
    var r = painted(el); if (!r) return;
    var clickable = el.tagName !== 'DIV' && el.tagName !== 'SPAN' || el.onclick || el.getAttribute('onclick') || el.dataset.openChatId;
    if (!clickable) return;
    if (/^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/.test(el.tagName) === false && !el.onclick && !el.getAttribute('onclick') && !el.dataset.openChatId) return;
    var inline = getComputedStyle(el).display === 'inline';
    if (inline && r.height >= TAP - 0.6) return;
    if (r.height >= TAP - 0.6 && r.width >= 28) return;

    /* walk up looking for the biggest box, exactly as the camera does, then ask whether it
       would actually deliver a tap to this control */
    var best = el, bestH = r.height, how = 'self';
    for (var p = el.parentElement, up = 0; p && up < 3; p = p.parentElement, up++) {
      var pr = painted(p); if (!pr) continue;
      var t = transfers(el, p);
      if (pr.height > bestH && t !== 'none') { bestH = pr.height; best = p; how = t; }
      if (bestH >= TAP) break;
    }
    var key = (text(el) || el.tagName) + '|' + Math.round(r.height);
    if (seen.has(key)) return;
    seen.add(key);
    var ok = bestH >= TAP - 0.6 && r.width >= 28;
    if (ok) out.transferred++;
    out.small.push({
      what: (text(el) || el.tagName.toLowerCase()).slice(0, 26),
      tag: el.tagName.toLowerCase(),
      cls: (el.className || '').toString().split(' ')[0] || '-',
      box: Math.round(r.width) + 'x' + Math.round(r.height),
      reached: Math.round(bestH),
      via: ok ? how : 'NOT REACHABLE',
    });
  });
  out.count = out.small.length;
  out.reallySmall = out.small.filter(function (s) { return s.via === 'NOT REACHABLE'; }).length;
  return out;
})()
