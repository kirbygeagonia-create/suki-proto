/* node tools/shot.cjs --probe=@tools/probe-grown.js --only=admin-finance,provider-profile,admin-provider
   Which of the raised controls actually changed the layout around it.

   The search pill was the risk and it did not move. These three could: seven commission-rate
   inputs gaining 12px each, the trust-score disclosure gaining 15px inside a header row, and a
   back button going from 30 to 44 in the same row as the page title. */
(function () {
  function h(sel) { var e = document.querySelector(sel); return e ? Math.round(e.getBoundingClientRect().height) : null; }
  var screen = document.querySelector('#screen');
  var row = document.querySelector('#cfgcat-plumbing');
  var sw = document.querySelector('.auth-switch');
  var back = document.querySelector('[aria-label="Back to verified providers"], [aria-label="Back to pending providers"]');
  var out = {
    screenScrollHeight: screen ? screen.scrollHeight : null,
    rate: h('#cfgcat-plumbing'),
    authSwitch: sw ? Math.round(sw.getBoundingClientRect().height) : null,
    backBtn: back ? Math.round(back.getBoundingClientRect().width) + 'x' + Math.round(back.getBoundingClientRect().height) : null,
    topbar: h('.topbar'),
    clipped: (window.__auditClipped || null),
  };
  /* the row the control lives in is what actually moves — measure it, not just the child */
  if (row && row.closest('tr')) out.rateRow = Math.round(row.closest('tr').getBoundingClientRect().height);
  if (sw && sw.parentElement) out.authRow = Math.round(sw.parentElement.getBoundingClientRect().height);
  if (back && back.parentElement) out.backRow = Math.round(back.parentElement.getBoundingClientRect().height);
  return out;
})()
