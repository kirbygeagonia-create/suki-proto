/* Round two: the first probe guessed field names and got three false DIFFs. Every pair
   below now reads the same expression the screen reads, and the status breakdown is
   printed so a claim about "live" can be checked against the rows. */
'use strict';
const { boot } = require('./harness.cjs');
const a = boot();
a.state.view = 'app';
const row = (noun, x, y, where) => console.log(
  (String(x) === String(y) ? '  ok  ' : ' DIFF ') + noun.padEnd(32)
  + String(x).padStart(6) + ' vs' + String(y).padStart(6) + '   ' + where);

/* What "live" is made of, and what the tile calls it. */
const byStatus = a.BOOKINGS.reduce((m, b) => (m[b.status] = (m[b.status] || 0) + 1, m), {});
console.log('  info  BOOKINGS by status:', JSON.stringify(byStatus));
const k = a.adminCounts();
const agreed = a.BOOKINGS.filter(b => ['upcoming', 'en_route', 'arrived', 'ongoing'].includes(b.status)).length;
const requested = (byStatus.requested || 0);
console.log('  info  adminCounts.open =', k.open, '| agreed-only =', agreed, '| requested =', requested,
  '| disputed =', (byStatus.disputed || 0), '| finished =', a.BOOKINGS.filter(b => a.FINISHED_STATES.includes(b.status)).length);
row('admin "Live bookings" tile', k.open, agreed + requested, 'tile vs requested+agreed (tile includes requests)');

/* The resident's unread mail. This pair used to ask "Home nav badge vs NOTIFICATIONS" and print
   a DIFF of 2 vs 0 — but the resident's bottom navigation paints no count badge at all, so the
   needle missed, the fallback answered 0, and the probe reported a defect that did not exist. The
   second form of the same trap: an instrument that turns "nothing matched" into a number. What the
   resident's Home really does is put a dot on the bell and name "unread" in its aria-label, so that
   is the pair measured here: a boolean surface against a boolean fact. */
a.state.role = 'resident'; a.state.tab = 'home'; a.render();
const homeHtml = a._document.getElementById('screen').innerHTML;
const unread = a.NOTIFICATIONS.filter(n => n.unread).length;
const dot = /class="notif-dot"/.test(homeHtml);
const bellSaysUnread = /aria-label="Notifications, unread"/.test(homeHtml);
const residentBadge = /nav-badge">(\d+)</.exec(homeHtml);
row('resident unread bell', unread > 0 ? 1 : 0, dot && bellSaysUnread ? 1 : 0,
  'NOTIFICATIONS has unreads vs the dot and the aria-label both saying so');
console.log('  info  resident Home nav badge:', residentBadge ? 'paints ' + residentBadge[1]
  : 'none is painted — the resident\'s nav carries no count, so do not read its absence as zero');

/* The provider's Bookings badge vs the requests waiting. This one is a real pair — the
   provider's nav is the only nav in the app that carries a count.

   Getting it right needed two corrections to the instrument, not to the app. It read the badge
   out of `#screen`, but `render()` paints the nav bar into `#navbar` and keeps it there so the
   active pill can glide instead of blinking — so the needle missed and the old `|| 0` fallback
   reported a badge of zero over two waiting requests. It also set `state.tab = 'dash'`, which is
   the label on the button, not the value behind it: the nav answers 'dashboard', and 'dash' paints
   an empty screen. Neither value is reachable by a person — every assignment in the app names a tab
   the render branch answers, no URL parameter carries one, and the dump does not persist a
   destination — so the blank screen is a probe artifact, not a missing fallback. */
a.state.role = 'provider'; a.state.tab = 'dashboard'; a.render();
const pHtml = a._document.getElementById('navbar').innerHTML;
const pBadge = /nav-badge">(\d+)</.exec(pHtml);
const pRequested = a.bookingsForProvider().filter(b => b.status === 'requested').length;
const pUnreadThreads = a.threadsFor('provider').filter(t => t.unread).length;
row('provider waiting badge', pRequested, pBadge ? Number(pBadge[1]) : 'no badge is painted',
  'requests waiting vs the Bookings nav badge');
console.log('  info  unread provider threads', pUnreadThreads, '(the Messages nav carries no count, by design)');

/* Credential summary vs the rows it counts — same wording, so compare the counts. */
const bad = a.PROVIDERS.map(p => {
  const rows = a.credentialsOf(p.id);
  const st = rows.map(x => a.credentialState(x));
  const expired = st.filter(s => s.code === 'expired').length;
  const expiring = st.filter(s => s.code === 'expiring').length;
  return { id: p.id, total: rows.length, expired, expiring, label: a.credentialSummaryFor(p.id).label };
}).filter(r => {
  const l = r.label.toLowerCase();
  if (r.expired) return !(l.includes('renewal') || l.includes('expired'));
  if (r.expiring) return !l.includes('expiring');
  return !/all \d+ valid|valid/.test(l) || l.includes('expiring');
});
console.log((bad.length ? ' DIFF ' : '  ok  ') + 'credential summary matches rows'.padEnd(32)
  + bad.length + ' disagreement(s)' + (bad.length ? '  ' + JSON.stringify(bad) : ''));

/* Does the summary name a count that agrees with the rows?

   This loop used to read only the `2 of 4` shape and say nothing when a label did not carry it —
   and half the roster says "All 3 valid" instead, so four providers were never compared at all
   while the probe printed a clean run. A skipped row and an agreeing row print the same nothing. */
const counted = { compared: 0, skipped: 0, diverged: 0 };
a.PROVIDERS.forEach(p => {
  const rows = a.credentialsOf(p.id);
  const label = a.credentialSummaryFor(p.id).label;
  const pair = /(\d+) of (\d+)/.exec(label);
  const all = /All (\d+) valid/.exec(label);
  const named = pair ? Number(pair[2]) : all ? Number(all[1]) : null;
  if (named === null) { skippedLabel(p.id, label); counted.skipped++; return; }
  counted.compared++;
  if (named !== rows.length) {
    counted.diverged++;
    console.log(' DIFF summary counts a different set than the rows  ' + p.id + ' "' + label + '" over ' + rows.length + ' documents');
  }
});
function skippedLabel(id, label) {
  console.log(' DIFF summary names no count the probe can read  ' + id + ' "' + label + '"');
}
console.log((counted.diverged + counted.skipped ? ' DIFF ' : '  ok  ')
  + 'summary count matches the row set'.padEnd(32) + counted.compared + ' providers compared, '
  + counted.skipped + ' label(s) unread, ' + counted.diverged + ' disagreeing'
  + (counted.compared < a.PROVIDERS.length ? '  <<< some provider is not being checked at all' : ''));
