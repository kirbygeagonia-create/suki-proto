/* One expression the camera evaluates inside a real page:
     node tools/shot.cjs --probe=@tools/probe-chart-axis-coverage.js --only=provider-dash,admin-dash --width=450 --font-scale=1
   Pin the screens. Measured on 2026-10-19 by walking all 72: exactly TWO screens paint a
   `.chart-cols` bar chart — `provider-dash` (8 rows) and `admin-dash` (14 rows) — and the file holds
   only two of that class, so this is the whole population, not a sample. Run with no `--only=`, the
   camera evaluates it 72 times and 70 answers are `charts:[]`, which is why the header used to print
   one empty answer and `probe-all` called it clean: the runner read the first screen, the sign-in
   page, where no chart can exist.

   Two things the vivo 1906 screenshots showed that no tally in shot.cjs can see, because both are
   questions about what a chart *names* rather than where its pixels land:

     - the earnings series has exactly one non-zero week, it is the last row, and the x-axis thinning
       keeps rows 0, 2, 4 and 6 — so the one bar with money in it is the one week the axis does not
       name. The y-axis is deliberately thinned the other way ("counted back from the top so the
       highest value is always named"); the x-axis has no equivalent rule.
     - at the phone's own default text the chart paints no per-bar numbers at all, because the
       side-by-side budget refuses them. The bars, gridlines and named ticks stay, so the shape is
       readable — but the figures live only in the sr-only summary a sighted person never reaches.

   Neither is a defect a geometry sensor can fail on, and both are product judgements, so this
   answers them as a measurement across every screen rather than as an assertion: for each chart it
   reports how many rows the series has, how many axis labels survive the thinning, whether the
   tallest bar's own week is one of them, whether the first and last rows are, and how many bar
   numbers are painted. Nothing is inferred from the app's arithmetic — the bars and labels are read
   off the painted DOM, and the tallest bar is the one whose rect reaches highest in the svg. */
(() => {
  const charts = [];
  document.querySelectorAll('.chart-cols').forEach((box, ci) => {
    const svg = box.querySelector('svg');
    const plot = box.querySelector('.chart-plot');
    if (!svg || !plot) return;
    const vb = (svg.getAttribute('viewBox') || '').split(/[ ,]+/).map(Number);
    const sb = svg.getBoundingClientRect();
    if (vb.length < 4 || !vb[3] || !sb.width) return;

    /* Every row paints a rect, including the zero weeks — a zero-height bar with the line colour is
       how the chart says "a week with no settled job shows as zero, not as a gap". The first version
       of this probe filtered those out and then divided the plot width by what survived, so on the
       earnings series (one non-zero week out of eight) a slot came out a third of the whole chart
       and every label looked like it named the tallest bar. Rows are counted from all rects; only
       the tallest-bar search ignores the empty ones. */
    const allRects = [].slice.call(svg.querySelectorAll('rect'));
    const rects = allRects.filter(r => parseFloat(r.getAttribute('height') || '0') > 0);
    const cats = [].slice.call(box.querySelectorAll('.chart-cat'));
    const vals = [].slice.call(box.querySelectorAll('.chart-val'));
    const ticks = [].slice.call(box.querySelectorAll('.chart-tick')).map(t => (t.textContent || '').trim());

    const pb = plot.getBoundingClientRect();
    const tallest = rects.slice().sort((a, b) => {
      const ay = parseFloat(a.getAttribute('y')), by = parseFloat(b.getAttribute('y'));
      const ah = parseFloat(a.getAttribute('height')), bh = parseFloat(b.getAttribute('height'));
      return (by + bh) - (ay + ah) || ay - by;
    })[0];
    const centreOf = el => { const r = el.getBoundingClientRect(); return r.left + r.width / 2; };
    let named = null, nearest = null, nearestGapPx = null;
    if (tallest && cats.length) {
      const tc = centreOf(tallest);
      const slotPx = pb.width / Math.max(1, allRects.length);
      let best = Infinity;
      cats.forEach(c => { const d = Math.abs(centreOf(c) - tc); if (d < best) { best = d; nearest = (c.textContent || '').trim(); } });
      nearestGapPx = Math.round(best);
      named = best <= slotPx / 2;
    }

    charts.push({
      chart: ci,
      aria: (svg.getAttribute('aria-label') || '').slice(0, 46),
      rows: allRects.length,
      bars: rects.length,
      axisLabels: cats.length,
      barNumbers: vals.length,
      ticksNamed: ticks.length,
      tallestBarNamed: named,
      nearestLabel: nearest,
      nearestGapPx: nearestGapPx,
      firstLabel: cats.length ? (cats[0].textContent || '').trim() : '',
      lastLabel: cats.length ? (cats[cats.length - 1].textContent || '').trim() : '',
      plotPx: Math.round(pb.width) + 'x' + Math.round(pb.height),
    });
  });
  /* An empty population is not a clean answer. On a screen the operator pointed at deliberately, no
     `.chart-cols` means the walk no longer reaches a chart, and the naming question this file exists
     to ask has not been asked. Say so in the sentinel `probe-all` refuses on. */
  if (!charts.length) return 'NO CONCLUSION — this screen paints no .chart-cols bar chart';
  return JSON.stringify({
    screen: (document.querySelector('#screen h1') || document.querySelector('.topbar h1') || {}).textContent || '',
    root: getComputedStyle(document.documentElement).fontSize,
    vw: innerWidth,
    charts: charts,
  });
})()
