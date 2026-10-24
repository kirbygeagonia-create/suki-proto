/* One expression the camera evaluates inside a real page:
     node tools/shot.cjs --probe=@tools/probe-layer-focus.js --only=booking-sheet,resident-payment-modal,resident-edit-form,provider-edit-form,admin-edit-form,admin-security-modal,case-sheet,offer-sheet,admin-review-approve
   Population: the camera's screens whose entry arrives with a layer already open — 21 ids contain a
   sheet, modal, form, case or review dialog, and nine representative ones are named above.

   What is not measured anywhere today: what an assistive tech is told when a layer opens. §72 walks
   each screen with real Tab presses and proves nothing is unreachable; the inert work proves the
   screen behind cannot be touched; the handset dump proved a picker could be painted, tappable and
   absent from the accessibility tree at the same time. None of those asks the remaining question —
   does the opened box say what it IS, and does the caret go into it. A dialog that opens without a
   role and without focus is, to a screen reader, a change of pixels on a screen it is still reading.

   Reports, read off the painted DOM and never inferred from state: every layer that has a box, the
   dialog semantics found anywhere inside it (role, aria-modal, accessible name from aria-label or a
   heading), where document.activeElement is, whether that node is inside the top layer, and how many
   nodes the app marked inert. The first version of this file looked only at the outer wrapper and
   printed role=- on everything, which is how a bad instrument manufactures a false finding: the one
   dialog declaration in the app sits on an inner `.sheet`, not on the roots this selector returned. */
(() => {
  const desc = (el) => !el ? 'none' : (el.tagName.toLowerCase()
    + (el.id ? '#' + el.id : '')
    + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '')
    + ((el.textContent || '').trim() ? ' "' + (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 20) + '"' : ''));
  const box = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0
    && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden'; };
  const vis = [].slice.call(document.querySelectorAll('[data-layer], .modal-layer, .sheet-layer')).filter(box);
  const act = document.activeElement;
  /* The layer the user is in is the one on top, which is a z-index question, not a DOM-order one:
     on the two screens where a modal is raised over a sheet, the sheet layer comes last in the
     document and the first version of this file reported its box while the modal was the thing a
     person was looking at. The camera's own tally ranks the same way for the same reason. */
  const rank = (el) => { const v = parseInt(getComputedStyle(el).zIndex, 10); return isNaN(v) ? -1 : v; };
  const top = vis.length ? vis.slice().sort((a, b) => rank(b) - rank(a)
    || (a.compareDocumentPosition(b) & 4 ? 1 : -1))[0] : null;
  /* The dialog box itself, wherever the app put it: the root, or a descendant that declares it. */
  const dlg = top ? ([top].concat([].slice.call(top.querySelectorAll('[role],[aria-modal],[aria-label]'))))
    .filter(el => el.getAttribute('role') === 'dialog' || el.getAttribute('aria-modal') === 'true'
      || el.hasAttribute('aria-label')) : [];
  /* A modal paints its title in a bare <b> inside .card.modal-card > .row, so the selector list has
     to include it: an earlier version of this file looked only for heading classes and reported
     name=- on boxes the application had in fact labelled. */
  const nameOf = (el) => {
    const by = el.getAttribute('aria-labelledby');
    const t = by && document.getElementById(by) ? (document.getElementById(by).textContent || '') : '';
    return (t || el.getAttribute('aria-label') || '').trim();
  };
  return JSON.stringify({
    screen: ((document.querySelector('#screen h1') || {}).textContent || '').trim().slice(0, 24),
    layers: vis.map(l => l.className.toString().trim().split(/\s+/)[0] || l.tagName.toLowerCase()),
    dialogNodes: dlg.map(el => (el.className || el.tagName).toString().trim().split(/\s+/)[0]
      + ' role=' + (el.getAttribute('role') || '-')
      + ' modal=' + (el.getAttribute('aria-modal') || '-')
      + ' name=' + (nameOf(el) || '-').trim().replace(/\s+/g, ' ').slice(0, 30)),
    focus: desc(act),
    focusInsideTop: !!(top && act && top.contains(act)),
    focusIsBody: !act || act === document.body,
    inertNodes: document.querySelectorAll('[inert]').length,
    liveInLayer: !!(top && (top.hasAttribute('aria-live') || top.querySelector('[aria-live],[role=status],[role=alert]')))
  });
})()
