/* node tools/shot.cjs --probe=@tools/probe-field-population.js
   ------------------------------------------------------------------
   How many text fields does a person actually meet, and does the caret probe see them?

   probe-caret.js types into the FIRST FOUR visible fields on a screen and no more. Its verdict
   ("62 screens, 47 fields, zero focus loss") is therefore a count of what it touched, not of what
   exists — and a coverage claim read as a population claim is how a clean run hides a gap. This
   asks the page for the whole population so the ratio can be stated instead of assumed.

   Read-only: it never focuses, types, or mutates anything. */
(function(){
  var scopeEl = document.querySelector('.sheet') || document.getElementById('screen') || document.body;
  var els = [].slice.call(
      scopeEl.querySelectorAll('input:not([type=hidden]), textarea'))
    .filter(function(e){
      var r = e.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
  var byType = {};
  els.forEach(function(e){
    var k = e.tagName === 'TEXTAREA' ? 'textarea' : (e.type || 'text');
    byType[k] = (byType[k] || 0) + 1;
  });
  return {
    scope: document.querySelector('.sheet') ? 'sheet' : 'screen',
    visible: els.length,
    typedByCaretProbe: Math.min(4, els.length),
    neverTyped: Math.max(0, els.length - 4),
    byType: byType
  };
})()
