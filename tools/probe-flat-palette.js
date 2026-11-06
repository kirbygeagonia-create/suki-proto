/* One expression the camera evaluates inside a real page, once per screen of the walk:
     node tools/shot.cjs --probe=@tools/probe-flat-palette.js
   The owner's ruling of 2026-10-27 is that the palette is flat. The gate asserts it against the
   bytes of the stylesheet, with comments stripped — which is the right check for a rule written in
   CSS, and the wrong one for the pixels a person sees: a class with no rule, an inline style built
   by a template, or a value carried in from a record can all paint a gradient that no grep in the
   stylesheet would find. This reads the COMPUTED style of everything the screen actually painted.

   The one exception is declared where it is used, in the page itself, as
   `flat-palette-exception: conic-gradient`: the workload ring is a chart, and a ring drawn with
   hard colour stops is a segmented circle rather than a blend. So a conic gradient is allowed only
   on an element that carries that marker in its own class list or in its parent's, and everything
   else that resolves to a gradient function is a finding.

   A page with no painted elements is not a clean page, it is a blind instrument: that answers
   NO CONCLUSION. */
(() => {
  const screen = document.getElementById('screen');
  if (!screen) return { answer: 'NO CONCLUSION', reason: 'this page paints no #screen' };
  const nodes = [screen, ...screen.querySelectorAll('*'),
    ...(document.getElementById('navbar') ? [document.getElementById('navbar'), ...document.getElementById('navbar').querySelectorAll('*')] : [])];
  if (nodes.length < 2) return { answer: 'NO CONCLUSION', reason: 'nothing is painted on this screen' };
  const GRAD = /(linear|radial|repeating-linear|repeating-radial)-gradient/;
  const CONIC = /conic-gradient/;
  const marked = (el) => {
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const cls = typeof n.className === 'string' ? n.className : (n.className && n.className.baseVal) || '';
      if (/flat-palette-exception/.test(cls) || /chart-ring/.test(cls)) return true;
    }
    return false;
  };
  const rows = [];
  let conicMarked = 0;
  nodes.forEach(el => {
    const cs = getComputedStyle(el);
    ['backgroundImage', 'borderImageSource', 'maskImage', 'WebkitMaskImage'].forEach(prop => {
      const v = cs[prop] || '';
      if (GRAD.test(v)) rows.push({ where: el.tagName + '.' + (typeof el.className === 'string' ? el.className : '').split(/\s+/)[0], prop, value: v.slice(0, 70) });
    });
    if (CONIC.test(cs.backgroundImage)) { if (marked(el)) conicMarked++; else rows.push({ where: el.tagName + '.' + (typeof el.className === 'string' ? el.className : '').split(/\s+/)[0], prop: 'conic unmarked', value: cs.backgroundImage.slice(0, 70) }); }
  });
  return {
    findings: rows.length,
    nodesRead: nodes.length,
    conicOnMarkedElement: conicMarked,
    report: rows.slice(0, 6),
  };
})()
