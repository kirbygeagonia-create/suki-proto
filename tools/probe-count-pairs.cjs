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

/* The resident's unread mail: the nav badge on Home vs the list. */
a.state.role = 'resident'; a.state.tab = 'home'; a.render();
const homeHtml = a._document.getElementById('screen').innerHTML;
const badge = /nav-badge">(\d+)</.exec(homeHtml);
const badgeN = badge ? Number(badge[1]) : 0;
const unread = a.NOTIFICATIONS.filter(n => n.unread).length;
row('notifications unread', unread, badgeN, 'Home nav badge vs NOTIFICATIONS');

/* The provider's nav badge vs the inbox. */
a.state.role = 'provider'; a.state.tab = 'dash'; a.render();
const pHtml = a._document.getElementById('screen').innerHTML;
const pBadge = /nav-badge">(\d+)</.exec(pHtml);
const pBadgeN = pBadge ? Number(pBadge[1]) : 0;
const pRequested = a.bookingsForProvider().filter(b => b.status === 'requested').length;
const pUnreadThreads = a.threadsFor('provider').filter(t => t.unread).length;
console.log('  info  provider nav badge paints', JSON.stringify(pBadgeN), '| requests waiting', pRequested, '| unread threads', pUnreadThreads);

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

/* Does the summary name a count that agrees with the rows? */
a.PROVIDERS.forEach(p => {
  const rows = a.credentialsOf(p.id);
  const label = a.credentialSummaryFor(p.id).label;
  const m = /(\d+) of (\d+)/.exec(label);
  if (m && Number(m[2]) !== rows.length)
    console.log(' DIFF summary counts a different set than the rows  ' + p.id + ' "' + label + '" over ' + rows.length + ' documents');
});
