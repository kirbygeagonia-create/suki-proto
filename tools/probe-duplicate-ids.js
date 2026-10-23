/* One expression the camera evaluates inside a real page:
     node tools/shot.cjs --probe=@tools/probe-duplicate-ids.js
   The app reads what a person typed by id — `document.getElementById('offer-unit').value` and
   about seventy other sites — so two elements sharing an id on one screen is not a validation
   nit: getElementById answers with the first in tree order, and a save then writes a number from
   a field the person can see but never touched. This counts ids in the painted DOM rather than
   grepping the source, because the same template rendered twice in a list produces a collision no
   static read of the file can see. */
(() => {
  const byId = new Map();
  document.querySelectorAll('[id]').forEach(el => {
    const id = el.id;
    if (!byId.has(id)) byId.set(id, []);
    const r = el.getBoundingClientRect();
    byId.get(id).push({
      tag: el.tagName.toLowerCase(),
      type: el.getAttribute('type') || '',
      painted: r.width > 0 && r.height > 0,
      label: (el.getAttribute('aria-label') || (el.labels && el.labels[0] ? el.labels[0].textContent.trim() : '') || '').slice(0, 34)
    });
  });
  const dupes = [];
  byId.forEach((list, id) => {
    if (list.length > 1) dupes.push(id + ' x' + list.length + ' [' + list.map(n => n.tag + (n.type ? ':' + n.type : '') + (n.painted ? '' : '(unpainted)') + (n.label ? ' "' + n.label + '"' : '')).join(', ') + ']');
  });
  const head = (document.querySelector('#screen h1, #screen h2') || {}).textContent || '?';
  const forms = [];
  byId.forEach((list, id) => {
    if (list.length > 1 && list.some(n => ['input', 'select', 'textarea'].indexOf(n.tag) >= 0)) forms.push(id);
  });
    /* `findings` is the number `probe-all.cjs` reads to decide whether this row is clean; `dupes` stays
     as the detail. Before this the probe reported a collision as data inside an `ok` line, which is the
     §87 shape exactly. */
  return JSON.stringify({ screen: head, ids: byId.size, findings: dupes.length, dupes: dupes, formCollisions: forms });
})()
