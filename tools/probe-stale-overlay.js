/* One expression the camera evaluates inside a real page:
     node tools/shot.cjs --probe=@tools/probe-stale-overlay.js --only=resident-home
   The bottom navigation promises, in its own comment, that "an overlay left flagged by the previous
   screen must not be waiting there for the user". For most of this file's life that promise held for
   the modals and the sheet and NOT for the chat room, and the consequence was measurable on Home:
   the screen painted Home while `onRootTab()` answered false, so the root-tab header treatment was
   replaced by the drill-in one and `syncBackHandles()` recorded a back step that no longer existed —
   a phone's Back button that appears to do nothing.

   So this does not test one flag. It asks the state object what overlays it has — the same
   derivation the Back machinery uses, plus `isChatOpen` — sets each one the way a handler would,
   taps a real nav item, and reports which flags survived the tap. A flag that survives is a screen
   that looks like one destination and behaves like another. */
(() => {
  const out = [];
  const ROLES = ['resident', 'provider', 'admin'];
  const navFor = role => (ROOT_TABS[role] || []).slice(0, 2);

  ROLES.forEach(role => {
    const tabs = navFor(role);
    if (tabs.length < 2) { out.push(role + ': the nav has fewer than two tabs, nothing to test'); return; }
    state.view = 'app'; state.role = role; state.tab = tabs[0];
    state.isChatOpen = false; render();

    /* Every overlay the state object can name, derived rather than listed — the list is how the
       resident's edit form was missed once already. */
    const flags = [...layerKeys(), 'isChatOpen'];
    flags.forEach(field => {
      state.view = 'app'; state.role = role; state.tab = tabs[0];
      flags.forEach(f => { state[f] = undefined; });
      state.isChatOpen = false;
      state[field] = field === 'isChatOpen' ? true : 'edit';
      render();
      const btn = document.querySelector('[data-nav="' + tabs[1] + '"]');
      if (!btn) { out.push(role + ': no nav button for ' + tabs[1] + ' — the walk cannot ask it'); return; }
      btn.click();
      const survived = !!state[field];
      const rootClaim = onRootTab();
      const paintedRoot = (document.getElementById('screen') || {}).dataset
        ? document.getElementById('screen').dataset.root : '?';
      if (survived || !rootClaim || paintedRoot !== '1') {
        out.push('STALE AFTER NAV  ' + role + '  state.' + field +
          (survived ? ' survived the tap (still ' + JSON.stringify(state[field]).slice(0, 12) + ')' : ' cleared') +
          ', onRootTab()=' + rootClaim + ', data-root=' + paintedRoot +
          ', backDepth=' + ownedEntries);
      }
    });
    flags.forEach(f => { state[f] = undefined; });
    state.isChatOpen = false;
    render();
  });

  return JSON.stringify({
    probe: 'does a nav tap clear every overlay the state can name?',
    report: out.length ? out : ['every overlay flag the state names is cleared by the bottom nav, in all three roles']
  }, null, 1);
})()
