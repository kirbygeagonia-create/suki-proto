/* D6: is the slashed zero switchable, and which bundled face is both slashless and tabular?

   The brief's 3.3 asks for a test, not a guess. A slashed zero is the same WIDTH as a plain one, so
   no width comparison can see it; Canvas2D applies no font features, so a canvas cannot either.
   This therefore does two things that are each honest about what they prove:

     1. measures, per family, "111111" against "000000" with and without `font-variant-numeric:
        tabular-nums` — that is the alignment half of the requirement, and it is measurable in DOM;
     2. paints a panel of "0O 1lI" plus real money/time/distance strings at 64px and at the 14px
        floor, in every candidate face, and leaves it on the screen so the run's PNG shows the
        glyphs. Whether a zero carries a slash is then settled by looking, which is the standard the
        brief itself sets ("show that 0/O, 1/l/I remain distinguishable at 14px").

   `findings` counts app problems; anything not measurable is `instrumentRows`.

     node tools/shot.cjs --probe=@tools/probe-zero-style.js --only=resident-home
*/
(async () => {
  const FAMS = ['Atkinson Next', 'Plus Jakarta Sans', 'Poppins'];
  const PX = 96;
  const measure = (fam, text, tabular) => {
    const el = document.createElement('span');
    el.textContent = text;
    el.style.cssText = 'position:absolute;left:-9999px;top:0;white-space:pre;font-size:' + PX +
      'px;font-family:"' + fam + '";' + (tabular ? 'font-variant-numeric:tabular-nums;' : '');
    document.body.appendChild(el);
    const w = el.getBoundingClientRect().width;
    document.body.removeChild(el);
    return Math.round(w * 100) / 100;
  };

  const faces = {};
  const instrumentRows = [];
  for (const fam of FAMS) {
    try { await document.fonts.load(PX + 'px "' + fam + '"', '0O1lI'); await document.fonts.ready; }
    catch (e) { instrumentRows.push('load threw: ' + fam); }
    const available = document.fonts.check(PX + 'px "' + fam + '"');
    if (!available) instrumentRows.push(fam + ' is NOT loaded — its readings would prove nothing');
    faces[fam] = {
      available,
      normal: { ones: measure(fam, '111111', false), zeros: measure(fam, '000000', false) },
      tabular: { ones: measure(fam, '111111', true), zeros: measure(fam, '000000', true) },
    };
    faces[fam].tabularEqualises = Math.abs(faces[fam].tabular.ones - faces[fam].tabular.zeros) < 1;
    faces[fam].proportionalNormally = Math.abs(faces[fam].normal.ones - faces[fam].normal.zeros) > 1;
  }

  const rows = FAMS.map(fam => {
    const line = (px, txt, tab) => '<div style="font-family:\'' + fam + '\';font-size:' + px +
      'px;' + (tab ? 'font-variant-numeric:tabular-nums;' : '') + 'line-height:1.25">' + txt + '</div>';
    return '<div style="margin-bottom:10px"><b style="font-size:15px">' + fam +
      (faces[fam].available ? '' : ' (NOT LOADED)') + '</b>' +
      line(56, '0O 1lI  ₱2,090  0.8 km  2:30  100%', true) +
      line(14, '0O 1lI  ₱2,090  0.8 km  2:30  100%  — at the 14px floor', true) + '</div>';
  }).join('');
  const panel = document.createElement('div');
  panel.id = 'zero-style-panel';
  panel.style.cssText = 'position:fixed;left:0;top:0;width:100%;z-index:99999;background:#fff;' +
    'padding:14px;box-shadow:0 2px 14px rgba(0,0,0,.3);color:#000';
  panel.innerHTML = '<div style="font-size:17px;font-weight:700;margin-bottom:8px">' +
    'Numeral panel — slashed zero, 0/O, 1/l/I</div>' + rows;
  document.body.appendChild(panel);

  /* the app's own current state is the finding: which face paints the figures today */
  const figFace = getComputedStyle(document.documentElement).getPropertyValue('--font-figures').trim();
  const firstFigure = (figFace.match(/"([^"]+)"/) || [])[1] || '';
  const findings = [];
  if (faces[firstFigure] && !faces[firstFigure].tabularEqualises) findings.push(firstFigure + ' is not tabular');
  return {
    findings: findings.length,
    instrumentRows: instrumentRows.length,
    report: { figuresFace: firstFigure, faces, findings, instrumentRows,
      note: 'tabularEqualises answers the alignment half only; the slash is read off the screenshot.' },
  };
})()
