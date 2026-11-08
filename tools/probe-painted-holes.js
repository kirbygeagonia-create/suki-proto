/* §8's first line asks for "no painted undefined, NaN or unbalanced markup" — and the gate proves
   the markup half in Node while nothing in the camera suite reads the two WORDS. A screen can paint
   `undefined` happily: it is text, it is on-scale, it clears contrast, it is not clipped, and every
   one of the 25 tallies stays silent. This reads the painted page for the three strings a template
   leaves behind when a record is missing.

   Moved into tools/ once a mutating pass no longer owns the tree — writing it there mid-run would
   make falsify-all's tools/ comparison report the family that happened to be running as having left
   an instrument mutated, which is a false alarm about a hazard that did not occur.

     node tools/shot.cjs --probe=@tools/probe-painted-holes.js
*/
(() => {
  const screen = document.getElementById('screen');
  const navbar = document.getElementById('navbar');
  if (!screen) return { answer: 'NO CONCLUSION', reason: 'this page paints no #screen' };
  const nodes = [screen, navbar].filter(Boolean);
  const text = nodes.map(n => n.innerText || n.textContent || '').join('\n');
  const hits = [];
  /* [object Object] is the fourth string a template leaves when an object is interpolated whole, and
     it is the one a reader most often mistakes for a design decision. */
  [/\bundefined\b/g, /\bNaN\b/g, /\[object Object\]/g, /\bnull\b(?=[\s.,;:)\]}]|$)/g].forEach(function (re) {
    const m = text.match(re);
    if (m) hits.push({ pattern: String(re), count: m.length, sample: text.slice(Math.max(0, text.indexOf(m[0]) - 60), text.indexOf(m[0]) + 60).replace(/\s+/g, ' ') });
  });
  /* unbalanced markup in the PAINTED tree: a stray closing tag survives parsing as nothing, so the
     only honest reading is the source of the screen's own markup. */
  const markup = screen.innerHTML || '';
  const opens = (markup.match(/<div\b/gi) || []).length;
  const closes = (markup.match(/<\/div>/gi) || []).length;
  if (opens !== closes) hits.push({ pattern: 'div open/close in the painted subtree', count: Math.abs(opens - closes), sample: 'opens ' + opens + ' closes ' + closes });
  return {
    findings: hits.length,
    charsRead: text.length,
    divBalance: { opens, closes },
    report: hits,
  };
})()
