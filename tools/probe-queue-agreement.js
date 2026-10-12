/* Does the dashboard still agree with the queue after an approval?
   The roster filters by the review record; the counts were written against the static
   array before that record existed. */
const { boot } = require('./harness.cjs');
const app = boot();
app.state.view = 'app'; app.state.role = 'admin';

const read = (label) => {
  const c = app.adminCounts();
  app.state.tab = 'admin_dashboard'; app.state.adminScreen = 'overview';
  app.render();
  const html = app._document.getElementById('screen').innerHTML;
  const pending = (html.match(/(\d+)\s*[^<]{0,40}pending/i) || [])[1];
  console.log(label);
  console.log('  queue (pendingApplicantList) : ' + app.pendingApplicantList().length);
  console.log('  static array                 : ' + app.PENDING_APPLICANTS.length);
  console.log('  adminCounts()                : ' + JSON.stringify(c));
  console.log('  verifiedProviderList()       : ' + app.verifiedProviderList().length);
  console.log('  dashboard tile says          : ' + pending);
};

read('before any decision');
app.openProviderVerification('joel');
app.verificationAction('approved');
read('after approving Joel (all four documents filed)');

const rosterHtml = (app.state.tab = 'admin_verifications', app.state.adminProviderCategory = 'pending',
  app.render(), app._document.getElementById('screen').innerHTML);
const named = app.PENDING_APPLICANTS.filter(a => rosterHtml.includes(a.name)).map(a => a.name);
console.log('\npending roster lists: ' + named.join(', '));
console.log('approved applicant still reachable in the console? ' +
  (['verified', 'pending', 'decided'].some(cat => {
    app.state.adminProviderCategory = cat; app.render();
    return app._document.getElementById('screen').innerHTML.includes('Joel Aquino');
  })));
