/* One expression the camera evaluates inside a real page, after that screen's own navigation:
     node tools/shot.cjs --probe=@tools/probe-notification-targets.js --only=notifications
   §27 makes this a rule, not a nicety: "whenever practical, tapping a notification should open the
   object responsible for it", and the same section forbids notifications "disconnected from the
   underlying system object". Nothing in tools/ had ever asked which screen a notification tap
   reaches, or whether that screen names the thing the notification was about.

   It walks the rows the screen actually painted — `[data-notif]`, which is how the app binds them
   (el.onclick = () => openNotification(el.dataset.notif)) — calls the very function that click
   calls, and reads where the app landed: the destination tab, the selected ids, the words at the top
   of the painted screen, and whether the object the notification routes to is named there.

   WHY history.back IS STUBBED DURING THE WALK. Returning from a drill-in to the list is a
   destination going shallow, and syncBackHandles pays that debt with real history.back() calls —
   which on a file:// page is a navigation, not a state change. That is the mechanism that took the
   inspected target down for three screens in §64 and again killed the blank-query probe, so the
   probe stubs back() and go() while it moves between destinations and puts them back before it
   returns. Nothing here is measuring the Back machinery; stubbing it is what lets the rest be seen.
   The stub is reported in the answer so a reader cannot mistake the run for a thumb. */
(() => {
  const h = window.history;
  const realBack = h.back, realGo = h.go;
  const stubbed = [];
  const results = [];
  const screenText = () => {
    const el = document.getElementById('screen');
    return el ? (el.textContent || '').replace(/\s+/g, ' ').trim() : '';
  };

  try {
    h.back = function () { stubbed.push('back'); };
    h.go = function () { stubbed.push('go'); };

    const rows = [].slice.call(document.querySelectorAll('[data-notif]'));
    const list = rows.map(r => r.getAttribute('data-notif'));
    if (!list.length) return { error: 'this screen paints no notification rows', rows: 0 };

    /* What a landed screen would have to show for the tap to have delivered the object. The first
       version of this probe guessed the field names (`providerName`, `provider`) and so reported
       every one of the four resident notifications as a miss when each had in fact opened its own
       booking or provider page — an instrument's wrong expectation is indistinguishable from an
       application's wrong behaviour unless the record's own keys are printed alongside. So the
       candidates are read from the record generically, and the keys come back with the answer. */
    function candidatesFor(route) {
      if (!route) return { keys: [], names: [] };
      if (route.kind === 'booking') {
        const b = (typeof BOOKINGS !== 'undefined' ? BOOKINGS : []).find(x => String(x.id) === String(route.id)) || {};
        /* providerOf takes the BOOKING, not an id — `p.id === booking.providerId`. Passing the id
           makes every lookup answer "Unknown provider", which is exactly what this probe did on its
           first run and what it reported as four application defects. Four notifications had in
           fact opened their own pages correctly. A wrong expectation in an instrument is
           indistinguishable from a wrong program until the record is printed next to the verdict,
           so recordKeys comes back with the answer now. */
        const prov = typeof providerOf === 'function' && b.providerId ? providerOf(b) : null;
        return { keys: Object.keys(b), names: [prov && prov.name, b.summary, b.request, b.provider] };
      }
      const p = (typeof PROVIDERS !== 'undefined' ? PROVIDERS : []).find(x => String(x.id) === String(route.id));
      return { keys: Object.keys(p || {}), names: [p && p.name, p && p.service] };
    }

    for (const id of list) {
      const n = (typeof NOTIFICATIONS !== 'undefined' ? NOTIFICATIONS : []).find(x => String(x.id) === String(id));
      const route = typeof notificationRoute === 'function' && n ? notificationRoute(n) : null;
      const cand = candidatesFor(route);
      try { openNotification(id); } catch (threw) {
        results.push({ id: id, title: n ? n.title : '', threw: threw.message });
        continue;
      }
      const text = screenText();
      const low = text.toLowerCase();
      const matched = (cand.names || []).filter(s => s && low.indexOf(String(s).toLowerCase()) > -1);
      results.push({
        id: id,
        title: n ? String(n.title || '').slice(0, 34) : '',
        routeKind: route ? route.kind : 'none',
        routeId: route ? String(route.id) : '',
        recordKeys: (cand.keys || []).join(',').slice(0, 120),
        candidates: (cand.names || []).map(String).slice(0, 4).join(' / '),
        namedBy: matched.slice(0, 2).join(' / '),
        landedTab: state.tab,
        landedView: state.view,
        namesObject: matched.length > 0,
        readBack: n ? n.unread === false : false,
        head: text.slice(0, 90),
      });
      state.tab = 'notifications';
      state.isChatOpen = false;
      try { render(); } catch (noRender) {}
    }
  } finally {
    h.back = realBack;
    h.go = realGo;
  }

  const misses = results.filter(r => r.routeKind === 'none' || r.namesObject === false || r.threw);
  return {
    rows: results.length,
    backCallsStubbed: stubbed.length,
    misses: misses.length,
    results: results,
  };
})()
