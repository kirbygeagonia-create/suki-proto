/* Does an entity leak into what a person reads?

   esc() was just widened to cover the apostrophe, so every one of its call sites now emits
   &#39; where it used to emit a bare '. HTML decodes that back to ' when it paints — unless
   the value is escaped twice, or lands in a context that is not parsed as HTML, in which case
   the reader sees the entity. This looks for that in the painted text of whatever screen runs. */
(function () {
  var text = (document.body.innerText || '').replace(/\s+/g, ' ');
  var hits = [];
  ['&#39;', '&quot;', '&amp;', '&lt;', '&gt;', '&nbsp;'].forEach(function (e) {
    var at = text.indexOf(e);
    if (at >= 0) hits.push(e + ' … ' + text.slice(Math.max(0, at - 40), at + 40));
  });
  return { leaked: hits.length, examples: hits.slice(0, 3), paintedUndefined: text.indexOf('undefined') >= 0 };
})()
