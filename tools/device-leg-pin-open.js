/* Open the admin lock dialog and do nothing else — one render, one cheap answer.
   Split from tools/device-leg-pin.js because that expression paints twice AND builds a measuring span, and
   at font_scale 1.35 the emulated frame refused it three times running with `Runtime.evaluate timed out`.
   A refusal that repeats is a property of the instrument's cost, not of the application, so the cost is cut
   in half and the measurement is taken by the sibling file on a page that is already painted. */
(function () {
  state.sheet = null;
  state.adminAccountModal = null;
  state.view = 'app'; state.role = 'admin'; state.tab = 'profile';
  render();
  if (typeof adminAccountAction === 'function') adminAccountAction('lock');
  var h = document.querySelector('.modal-layer');
  return JSON.stringify({
    h1: (document.querySelector('#screen h1') || {}).textContent || '',
    dialog: h ? (((h.querySelector('b') || {}).textContent) || '').trim() : 'NO LAYER PAINTED',
    fieldPresent: !!(h && h.querySelector('input[type=password]')),
    scale: (typeof fontScaleProbe === 'function' ? fontScaleProbe() : null),
    rootFont: getComputedStyle(document.documentElement).fontSize,
    viewport: innerWidth + 'x' + innerHeight
  });
})()
