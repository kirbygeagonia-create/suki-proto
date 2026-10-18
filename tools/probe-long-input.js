/* One expression the camera evaluates inside a real page, after that screen's own navigation:
     node tools/shot.cjs --probe=@tools/probe-long-input.js --only=resident-profile,chat-room
   Every field in this app is writable and `maxlength` appears zero times in the file, so a
   keyboard can put a 60-character token with no spaces in it into a name, a barangay, a payout
   account or a chat line. Two rules in the stylesheet carry `overflow-wrap:anywhere`; nothing
   else is prepared for a word that will not break.

   The camera measures the screens as the seed data paints them. This asks the same screens what
   happens with the text a person can actually type — the walk still reaches each screen through
   the app's own entry points, so the layout being judged is one a thumb gets to.

   It writes each string field a DISTINCT unbreakable token, re-renders once, and reports which
   element broke and which field's token is inside it. Writing the model rather than typing into
   the input is deliberate: for length there is no parsing between the two (the handler is
   `state.x = el.value`), and the lesson about typing instead of assigning was about number and
   comma fields, where the platform does parse. Everything is restored before the answer. */
(() => {
  const N = 60;
  const tok = label => label + 'x'.repeat(Math.max(0, N - label.length));
  const panel = document.querySelector('.phone') || document.body;
  const pr = panel.getBoundingClientRect();
  const SURF = '#screen, .sheet-layer, .modal-layer, .bottomnav, #navbar';
  const report = [];
  const saved = [];
  const fields = [];

  function set(target, key, label) {
    if (!target || typeof target[key] !== 'string') return;
    saved.push({ target: target, key: key, was: target[key] });
    fields.push({ label: label, token: tok(label) });
    target[key] = tok(label);
  }

  /* The writable set, read from the same state objects the edit handlers write. */
  const P = state.profileData, PP = state.providerProfileData, A = state.adminProfileData;
  set(P, 'name', 'Rname'); set(P, 'phone', 'Rphone'); set(P, 'address', 'Raddr');
  set(P, 'barangay', 'Rbgy'); set(P, 'emergencyContact', 'Remerg');
  set(PP, 'phone', 'Pphone'); set(PP, 'workingHours', 'Phours'); set(PP, 'bankAccount', 'Pbank');
  set(A, 'name', 'Aname'); set(A, 'phone', 'Aphone'); set(A, 'officeLocation', 'Aoffice');
  if (Array.isArray(state.residentHouseholdItems) && state.residentHouseholdItems[0]) {
    set(state.residentHouseholdItems[0], 'nickname', 'Hnick');
    set(state.residentHouseholdItems[0], 'type', 'Htype');
  }
  if (Array.isArray(state.providerPortfolio) && state.providerPortfolio[0]) {
    set(state.providerPortfolio[0], 'service', 'Pserv');
    set(state.providerPortfolio[0], 'description', 'Pdesc');
  }
  /* A chat line is the one field a person writes on a screen this walk already reaches, so add a
     record through the app's own append rather than pushing into the array by hand. */
  let addedRow = null;
  const msgBefore = MESSAGES.length;
  try {
    if (typeof appendMessage === 'function' && typeof currentThreadKey === 'function') {
      const thread = currentThreadKey();
      if (thread) addedRow = appendMessage(thread, state.activeChatBookingId,
        state.role === 'provider' ? 'provider' : 'customer', tok('Cmsg'));
    }
  } catch (noChat) { addedRow = null; }
  render();

  const owns = el => fields.filter(f => (el.textContent || '').indexOf(f.token) > -1)
    .map(f => f.label).join('+');
  /* `className` is an SVGAnimatedString on SVG nodes, so it has no split — a probe that throws on
     the first circle it meets reports nothing about the layout it was written to measure. */
  const cls = el => (typeof el.className === 'string' ? el.className : (el.getAttribute('class') || ''))
    .split(' ')[0];
  const tag = el => el.tagName.toLowerCase() + (cls(el) ? '.' + cls(el) : '');
  const scrolls = el => {
    for (let a = el.parentElement; a; a = a.parentElement) {
      const s = getComputedStyle(a);
      if (/(auto|scroll)/.test(s.overflowX)) return true;
    }
    return false;
  };

  document.querySelectorAll(SURF).forEach(box => {
    box.querySelectorAll('*').forEach(el => {
      if (!el.children.length && !(el.textContent || '').trim()) return;
      const r = el.getBoundingClientRect();
      if (!r.width) return;
      const who = owns(el);
      if (!who) return;
      if (r.right > pr.right + 2 && !scrolls(el)) {
        report.push('PAST PANEL ' + who + ' <' + tag(el) + '> by ' + Math.round(r.right - pr.right) + 'px');
      }
      const cs = getComputedStyle(el);
      if (el.scrollWidth > el.clientWidth + 2 && /hidden|clip/.test(cs.overflowX) &&
          cs.textOverflow !== 'ellipsis') {
        /* The geometry, not just the delta: this finding only appears in a full sweep, so a subset
           run cannot reproduce it and the line has to carry enough to read it from the log. The
           `culprit` walk goes down to the deepest node whose own box reaches past this element's
           content edge — the thing that is actually refusing to break. */
        const kids = [...el.children].map(c => Math.round(c.getBoundingClientRect().width)).join(',');
        const limit = el.getBoundingClientRect().left + el.clientWidth;
        let culprit = el;
        for (let node = el; node.children.length;) {
          const next = [...node.children].find(c => c.getBoundingClientRect().right > limit + 1);
          if (!next) break;
          culprit = next; node = next;
        }
        const ccs = getComputedStyle(culprit);
        report.push('CLIPPED NO ELLIPSIS ' + who + ' <' + tag(el) + '> hides ' +
          (el.scrollWidth - el.clientWidth) + 'px (client=' + el.clientWidth +
          ' scroll=' + el.scrollWidth + ' ow=' + cs.overflowWrap + ' wrap=' + cs.flexWrap +
          ' childWidths=[' + kids + '] culprit=<' + tag(culprit) + '> w=' +
          Math.round(culprit.getBoundingClientRect().width) + ' ow=' + ccs.overflowWrap +
          ' ws=' + ccs.whiteSpace + ' txt=' + (culprit.textContent || '').trim().slice(0, 14) + ')');
      }
      if (r.width > pr.width + 2 && el !== panel && !scrolls(el)) {
        report.push('WIDER THAN PHONE ' + who + ' <' + tag(el) + '> ' + Math.round(r.width) + 'px vs ' + Math.round(pr.width));
      }
    });
  });
  const pageOverflow = document.scrollingElement.scrollWidth - window.innerWidth;
  if (pageOverflow > 1) report.push('PAGE OVERFLOW by ' + pageOverflow + 'px');

  /* Put it all back, including the chat line, so a later screen in the same run is measured on the
     seed and the dump on disk is not carrying a 60-character name. */
  saved.forEach(s => { s.target[s.key] = s.was; });
  if (addedRow) {
    const at = MESSAGES.indexOf(addedRow);
    if (at > -1) MESSAGES.splice(at, 1);
    else report.push('chat row not found in MESSAGES — the leak is still on screen');
  }
  if (addedRow && MESSAGES.indexOf(addedRow) > -1) report.push('chat row survived the splice');
  render();
  const restored = saved.every(s => s.was === null || s.target[s.key] === s.was) &&
    (!addedRow || MESSAGES.indexOf(addedRow) === -1);
  return JSON.stringify({
    screen: state.view + '/' + state.role + ':' + state.tab + (state.sheet ? '+' + state.sheet : ''),
    /* Which layer was actually open when this was measured. The finding this line exists for only
       appears mid-walk, so the state the previous screen left behind is part of the answer. */
    layers: (typeof openLayers === 'function' ? openLayers() : '?') +
      (state.isChatOpen ? '|chat' : ''),
    fieldsWritten: fields.length,
    restored: restored,
    report: report.length ? [...new Set(report)] : ['nothing broke at ' + N + ' characters']
  }, null, 1);
})()
