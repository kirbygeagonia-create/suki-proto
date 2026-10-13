/* One expression, because shot.cjs evaluates the probe as `(${expr})`.
   Breaks storage first and then asks the app to save, so the banner is photographed
   after a real write failure rather than after a hand-set field. */
(function () {
  localStorage.setItem = function () { throw new Error('QuotaExceeded'); };
  state.storageNotice = null;
  var ok = persist();
  render();
  return {
    writeReturned: ok,
    notice: state.storageNotice,
    painted: (document.getElementById('notice-root').innerHTML || '').replace(/\s+/g, ' ').slice(0, 90),
    bannerHeight: (document.querySelector('.storage-notice') || {}).offsetHeight || 0,
    toastCount: document.querySelectorAll('#toast-root > *').length
  };
})()
