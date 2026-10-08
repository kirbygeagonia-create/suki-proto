/* node tools/shot.cjs --probe=@tools/probe-caret.js --only=admin-verified,offer-sheet
   ------------------------------------------------------------------
   Does typing into a field cost you the field?

   A handler that rebuilds the screen on every keystroke detaches the element the reader
   is typing in. On the desktop it looks like a caret that jumps; on a phone it closes the
   keyboard after one character, which is a defect nobody can reproduce from a screenshot.
   The symptom is device-only. The cause is entirely in the page, and this asks the page.

   It types one character into each of the first four fields on the painted screen, then
   reports what the live document has focused — not the node it held on to, which is the
   mistake this probe originally made: a re-render detaches that node, so comparing
   against it can only ever answer "lost", whether the app is broken or not.

   Destructive by nature (it dispatches real input events), so run it on the screens you
   are asking about, and re-run tools/shot.cjs --measure afterwards if you want clean
   layout numbers. */
(function(){
  var out = { typed: [] };
  var sheet = document.querySelector('.sheet');
  var scope = sheet || document.getElementById('screen') || document.body;
  var els = [].slice.call(scope.querySelectorAll('input:not([type=hidden]), textarea'))
    .filter(function(e){ var r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });

  els.slice(0, 4).forEach(function(el){
    var rec = { field: (el.id || el.className.split(' ')[0] || el.tagName.toLowerCase()).slice(0, 26),
                in: sheet ? 'sheet' : 'screen' };
    var original = el.value;
    try {
      el.focus();
      rec.focusedFirst = document.activeElement === el;
      /* only text-ish fields take a character; a checkbox would be toggled by it */
      var types = el.tagName === 'TEXTAREA' || ['text','search','number','tel','email','password',''].indexOf(el.type) >= 0;
      if (types) el.value = original + '1';
      el.dispatchEvent(new Event('input', { bubbles: true }));

      var after = document.activeElement;
      rec.keptFocus = !!(after && after.isConnected && after.tagName === el.tagName && after.type === el.type);
      rec.keptText = !!(after && after.value === el.value);
      /* true here means the element really was replaced and something put focus back —
         that is the fix working, not a failure */
      rec.oldNodeReplaced = !el.isConnected;

      var live = (after && after.isConnected) ? after : el;
      live.value = original;
      live.dispatchEvent(new Event('input', { bubbles: true }));
      rec.restored = !!(live.value === original);
    } catch (err) { rec.error = err.message; }
    out.typed.push(rec);
  });
  out.lostFocus = out.typed.filter(function(r){ return r.focusedFirst && !r.keptFocus; })
                         .map(function(r){ return r.field; });
  return out;
})()
