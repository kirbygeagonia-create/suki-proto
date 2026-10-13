/* What does an unwired profile action actually paint?
   Drive the real render for every action name the app can call, and read the
   screen the way a user would see it — not the hub function in isolation. */
const fs = require('fs');
const { boot } = require('./harness.cjs');
const app = boot();

const src = fs.readFileSync('./Sukinnect-next.html', 'utf8');

const HUBS = [
  ['provider', 'providerProfileAction', 'providerProfileModal'],
  ['admin', 'adminAccountAction', 'adminAccountModal'],
  ['resident', 'residentProfileAction', 'residentProfileModal'],
];

for (const [role, caller, stateKey] of HUBS) {
  const called = [...new Set((src.match(new RegExp(caller + "\\( *'[a-z_]+'", 'g')) || [])
    .map(s => s.match(/'([a-z_]+)'/)[1]))];
  app.state.view = 'app';
  app.state.role = role;
  app.state.tab = 'profile';
  /* The first render of a role's profile tab returns the sample-data skeleton, so the
     action that happens to be first in the list measures as "no modal". Warm the tab
     once before measuring any of them. */
  app.state[stateKey] = null;
  app.render();
  console.log('\n' + role + ': ' + called.length + ' action names reachable — ' + called.join(', '));
  for (const a of called) {
    app.state[stateKey] = a;
    app.render();
    const html = app._document.getElementById('screen').innerHTML;
    const modal = /class="modal-layer"/.test(html);
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const claims = /Changes saved successfully|Update saved and recorded in the Audit Log/.test(html);
    const inputish = /<input|<textarea|<select/.test(html);
    console.log('  ' + a.padEnd(16)
      + (modal ? 'modal ' : 'no modal ')
      + (claims ? 'CLAIMS A SAVE  ' : '               ')
      + (inputish ? 'has fields ' : 'no fields  ')
      + '| ' + text.slice(text.lastIndexOf('|') + 1, 150));
  }
  app.state[stateKey] = null;
}
