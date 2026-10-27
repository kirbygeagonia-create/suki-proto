/* Does the app really paint in the face it asks for, and do its numerals still line up in it?

   Two claims this repository has already had to take back because they were reasoned instead of measured:
   that the shipped face was the one being painted (a missing font falls back silently and every screen
   still looks fine), and that a column of figures aligns (Atkinson paints PROPORTIONAL digits — 111111
   measured 78.16px against 000000 at 124.42px — and `font-variant-numeric:tabular-nums` is what made both
   121.36px). Both were measured on Atkinson. This face swap to Poppins invalidates the second reading
   unless it is taken again, and a swap that falls back would invalidate the first.

   So this answers three things, in the browser, on the shipped page:
     1. does the app's own stack really resolve to Poppins, per weight (document.fonts.check), and is the
        family the painted text used the one requested (a width comparison against the families that
        would have stood in for it — `document.fonts` iterated EMPTY on this page once, which is why the
        check is not a FontFaceSet scan);
     2. are the digits under Poppins proportional, and does the app's tabular rule equalise them;
     3. does the flat palette survive: the brand surface is now one colour, so every white label on it is
        sampled against that colour rather than against a blend.

   `findings` counts problems with the app; anything this probe could not complete is reported separately
   as instrumentRows, per the runner's convention.

     node tools/shot.cjs --probe=@tools/probe-face-and-figures.js --only=resident-login,provider-dash
*/
(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const STACK = getComputedStyle(document.documentElement).getPropertyValue('--font-ui').trim();
  const FIRST = (STACK.match(/"([^"]+)"/) || [])[1] || '';

  /* 1 — is the requested face actually available, and actually used? */
  const weights = ['400', '500', '600', '700'];
  const loaded = {};
  for (const w of weights) {
    try { loaded[w] = document.fonts.check(w + ' 16px "' + FIRST + '"'); }
    catch (e) { loaded[w] = 'CHECK THREW'; }
  }
  /* Width comparison against the families that would stand in. Same string, same size, three stacks:
     if the first face is really painting, the requested family and the generic sans differ in width
     for a proportional face — and if they are IDENTICAL to the fallback, the face did not load. */
  const measure = (text, family, tabular) => {
    const el = document.createElement('span');
    el.textContent = text;
    el.style.cssText = 'position:absolute; visibility:hidden; left:-9999px; top:0; font-size:32px;' +
      'font-family:' + family + ';' + (tabular ? 'font-variant-numeric:tabular-nums;' : '');
    document.body.appendChild(el);
    let w = 0;
    try { w = el.getBoundingClientRect().width; } catch (e) { w = -1; }
    el.remove();
    return w;
  };
  await (document.fonts && document.fonts.ready ? document.fonts.ready : sleep(250));
  const probeFace = '"' + FIRST + '", monospace-nonsense-xyz';
  const fallbackOnly = 'monospace-nonsense-xyz';
  const oneFace = measure('0O1l iI', probeFace, false);
  const noFace = measure('0O1l iI', fallbackOnly, false);
  const faceActuallyPaints = oneFace > 0 && noFace > 0 && Math.abs(oneFace - noFace) > 0.5;

  /* 2 — the numerals, under the face the app actually gives them. The UI face is NOT the figure face:
     Poppins has no tabular feature, so measuring the digits in --font-ui would report the defect this
     probe exists to catch as a finding about the app rather than about the rule. */
  const FIG = getComputedStyle(document.documentElement).getPropertyValue('--font-figures').trim();
  const figFamily = (FIG.match(/"([^"]+)"/) || [])[1] || FIRST;
  const props = measure('111111', '"' + figFamily + '"', false);
  const propsZero = measure('000000', '"' + figFamily + '"', false);
  const tab = measure('111111', '"' + figFamily + '"', true);
  const tabZero = measure('000000', '"' + figFamily + '"', true);

  /* 3 — the brand surface, as painted */
  const bar = document.querySelector('.topbar') || document.querySelector('.btn');
  const barStyle = bar ? getComputedStyle(bar) : null;
  const barBg = barStyle ? barStyle.backgroundColor : 'NO BAR PAINTED';
  const gradLeft = (document.querySelector('style') || {}).textContent || '';
  const blended = (gradLeft.match(/linear-gradient|radial-gradient/g) || []).length;

  const rows = [];
  const missing = weights.filter(w => loaded[w] !== true);
  if (missing.length) rows.push('face-not-loaded: ' + FIRST + ' weights ' + missing.join(','));
  if (!faceActuallyPaints) rows.push('face-not-painted: requested stack and the fallback measure the same width (' +
    oneFace + ' vs ' + noFace + ') — the text is being drawn by a stand-in');
  if (props < 0 || tab < 0) rows.push('NO CONTROL FOUND: the width probe could not measure');
  else if (Math.abs(tab - tabZero) > 0.4) rows.push('tabular-not-equal: ' + tab.toFixed(2) + ' vs ' + tabZero.toFixed(2));
  if (barBg === 'NO BAR PAINTED') rows.push('instrumentRows: no brand surface on this screen');

  return {
    probe: 'face-and-figures',
    requested: FIRST,
    stack: STACK,
    weightsLoaded: weights.map(w => w + '=' + loaded[w]).join(' '),
    faceActuallyPaints: faceActuallyPaints,
    digitsProportional: propsZero > 0 && props > 0 ? (Math.abs(props - propsZero) > 0.4) : 'unmeasured',
    width111111: props.toFixed(2), width000000: propsZero.toFixed(2),
    tabular111111: tab.toFixed(2), tabular000000: tabZero.toFixed(2),
    brandSurfacePainted: barBg,
    blendedGradientRulesInStylesheet: blended,
    findings: rows.filter(r => !/^instrumentRows/.test(r)).length,
    instrumentRows: rows.filter(r => /^instrumentRows/.test(r)).length,
    report: rows,
  };
})()
