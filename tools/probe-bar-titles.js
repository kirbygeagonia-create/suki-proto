/* Every screen name in this app is painted by a top bar, so the bar is the single most
   repeated element in the product — and until now nothing measured it.
     node tools/shot.cjs --probe=@tools/probe-bar-titles.js
   Population: every screen of the walk that paints a `.topbar h1`. Screens with no bar
   (a sheet over the app) are reported as `bar:none` rather than counted as clean.

   The camera reports an off-scale font size only when a value is not on the type scale, and
   16px is on it, so a screen name that inherits the body size passes every tally that exists
   while reading as body copy. That is the drift this probe answers: it reads the painted
   `font-size` and `font-weight` of each bar's h1 beside its `.sub` line, and groups the
   answers by whether the screen is a root tab (`data-root="1"`), because those are the two
   sizes the stylesheet actually intends.

   A running tally is kept on the page because the camera evaluates this expression once per
   screen of the same document, so the LAST line printed is the complete reading and the
   lines before it are that reading as of that screen. `drift=` is that complete figure — the
   number of bars whose title size differs from the majority size of their own group — and
   `findings:` is this screen's own 0 or 1, because the probe runner sums that key across
   every answer. `seen` is printed beside both so a half-walk cannot read as a clean app. */
(() => {
  const bar = document.querySelector('#screen .topbar');
  const W = window.__barTitles || (window.__barTitles = { rows: [], none: 0 });
  const px = el => Math.round(parseFloat(getComputedStyle(el).fontSize) * 100) / 100;
  if (!bar || !bar.querySelector('h1')) {
    W.none++;
  } else {
    const h1 = bar.querySelector('h1');
    const screen = document.querySelector('.screen');
    const sub = bar.querySelector('.sub');
    /* The root flag is read beside the size because the two can disagree: `render()` writes
       data-root from onRootTab(), so a bar that is compact on a screen the app itself calls a
       root tab means the flag was stale at paint time — and the Node harness, which reaches the
       same destination by assigning state.tab, answers root=1 for every one of them. Printed
       rather than inferred, because "which screens are root tabs" is the question a title size
       answers, and two instruments disagreeing about it is a defect in one of them. */
    W.rows.push({
      name: (h1.textContent || '').trim().slice(0, 22),
      root: screen && screen.getAttribute('data-root') === '1' ? 1 : 0,
      size: px(h1),
      weight: getComputedStyle(h1).fontWeight,
      hasClass: /(^| )title( |$)/.test(String(h1.className || '')),
      inline: h1.getAttribute('style') ? 1 : 0,
      sub: sub ? px(sub) : null,
      sameAsSub: sub ? (px(sub) === px(h1) ? 1 : 0) : 0,
      st: (typeof state === 'undefined') ? 'nostate'
        : [state.view, state.role, state.tab, state.adminScreen || '-', state.isChatOpen ? 'chat' : '-'].join('/'),
      fn: (typeof onRootTab === 'function') ? (onRootTab() ? 1 : 0) : 'nofn',
    });
  }
  const tally = {};
  W.rows.forEach(r => {
    const k = (r.root ? 'root' : 'drill') + ':' + r.size;
    tally[k] = (tally[k] || 0) + 1;
  });
  const mode = {};
  Object.keys(tally).forEach(k => {
    const g = k.split(':')[0];
    if (!mode[g] || tally[k] > tally[mode[g]]) mode[g] = k;
  });
  /* `findings` is THIS screen only, because `tools/probe-all.cjs` sums the key across every
     answer — a cumulative count in that key would add 0+0+1+1+1 up to six for one drift.
     The running figure is `drift=`, which a reader takes off the last line. */
  const last = W.rows[W.rows.length - 1];
  const want = mode[last && last.root ? 'root' : 'drill'];
  const mine = last && want ? (last.size === parseFloat(want.split(':')[1]) ? 0 : 1) : 0;
  const drift = W.rows.filter(r => {
    const g = mode[r.root ? 'root' : 'drill'];
    return g && r.size !== parseFloat(g.split(':')[1]);
  }).length;
  const counts = Object.keys(tally).sort().map(k => k + '×' + tally[k]).join(' ');
  return 'BARS seen=' + W.rows.length + ' noBar=' + W.none
    + ' | sizes ' + (counts || 'none')
    + ' | drift=' + drift
    + ' | titleEqualsSub=' + W.rows.filter(r => r.sameAsSub).length
    + ' | classless=' + W.rows.filter(r => !r.hasClass).length
    + ' | inlineStyled=' + W.rows.filter(r => r.inline).length
    + ' | rootVsFlag=' + W.rows.filter(r => r.root !== r.fn).length
    + ' | findings:' + (mine || 0)
    + ' | this=' + (last ? JSON.stringify(last) : 'no-bar');
})()
