/* One expression the camera evaluates inside a real page, after each screen's own navigation:
     node tools/shot.cjs --probe=@tools/probe-whitespace.js --only=resident-edit-form,chat-room
   Every field in this app is writable. The three profile save handlers are trim-guarded — each line
   reads `x.value.trim() || the value it already held` — so a name typed as nothing but spaces keeps
   the old name. That is the pattern this probe checks everywhere else: a keyboard can put a single
   space into a chat line, a household nickname, a portfolio entry, a payout account, a request
   description, a dispute note or an offer, and the question is what the app DOES with it.

   Three outcomes matter, and only a real page can answer them:
     - the whitespace is STORED, so a record now holds a value that paints as nothing;
     - a record is CREATED that nobody can see — an array grows, a blank bubble appears, an audit row
       is written for a change no one described;
     - the app CLAIMS something happened while writing nothing.

   Each field is exercised alone, through the platform's own typing path
   (`document.execCommand('insertText')`), because a programmatic `.value` write of unparseable text
   clears a field quietly while a real edit goes through the browser's parser — the comma lesson this
   repository already learned. Then the layer's own primary control is clicked the way a thumb clicks
   it: `.btn-block` first, because that is the class every save/send/confirm button in this file
   carries, with a wording match as the fallback. The first version of this probe had only the wording
   match and reported "no control found" on the sign-in screen, which is an instrument gap and not an
   app finding. state and storage are restored after every field.

   WHAT IT MEASURED ON 2026-10-18, across the 29 screens of the walk that expose a typable field:
     - every guarded write refused, with an error the screen paints: the request sheet, the fruit
       listing, the portfolio, the payout account, the verification note and the reject/flag notes all
       set `profileError` / `requestError` rather than storing the space;
     - the three profile dialogs kept their old values, as their `|| the value it already held`
       fallbacks intend, and the unchanged-save guard then said "No change to save";
     - two residuals, neither of which paints a lie: the sign-in form writes `state.auth.email = " "`
       while refusing with "Enter your email to continue." — nothing in the app reads `auth.email`, so
       the blank value is stored and never shown; and a space sent in chat appends no record and gives
       no feedback, leaving the field as it was typed, which is its own answer.
     No whitespace value was found stored in a record a person can see.

   KNOWN LIMIT OF THE INSTRUMENT: after the first token is clicked the layer re-renders, so the
   element handle held for the second and third tokens is detached and reports `NO CONTROL FOUND`.
   Those rows say nothing about the app; read a finding only from a row that named a real control.
   A companion attempt to ask what the SEARCH screen says about a blank query was deleted the same
   day: it painted in the breath after the tap, while the simulated discovery was still reading
   "Finding nearby providers…", so every query — including one that matches — printed zero cards. An
   instrument that cannot tell its two cases apart has measured nothing, and a probe that prints a
   state nobody can see is worse than no probe. */
(() => {
  const TOKENS = [' ', '   ', '\t'];
  const SKIP = { number: 1, range: 1, date: 1, time: 1, datetime: 1, 'datetime-local': 1,
    month: 1, week: 1, email_unused: 1, checkbox: 1, radio: 1, hidden: 1, file: 1 };
  const CLAIM = /(modal|confirm|error|notice|toast|status)$/i;
  const screen = document.getElementById('screen') || document.body;

  function snap() {
    const s = {};
    for (const k in state) {
      const v = state[k];
      if (v === null || typeof v === 'undefined') continue;
      try { s[k] = JSON.stringify(v); } catch (notCopyable) {}
    }
    return s;
  }
  function restore(s) {
    for (const k in s) { try { state[k] = JSON.parse(s[k]); } catch (notCopyable) {} }
    try { persist(); } catch (noStore) {}
    try { render(); } catch (noRender) {}
  }
  function brief(v) {
    const t = typeof v === 'string' ? v : JSON.stringify(v);
    return (t === undefined ? '' : String(t)).slice(0, 40);
  }

  function fields() {
    const out = [];
    document.querySelectorAll('input, textarea').forEach(el => {
      if (el.readOnly || el.disabled) return;
      const ty = (el.type || 'text').toLowerCase();
      /* A password field takes whitespace the same way any text field does, and nothing here
         validates it, so it is left out on purpose: the app keeps no credential to store it in. */
      if (ty === 'password' || SKIP[ty]) return;
      if (!el.id && !el.name) return;
      out.push(el);
    });
    return out;
  }

  function submitFor(el) {
    const layer = el.closest('.modal-layer, .sheet-layer, #screen');
    if (!layer) return null;
    const btns = [].slice.call(layer.querySelectorAll('button'));
    return btns.find(b => /(^|\s)btn-block/.test(String(b.className))) ||
      btns.find(b => /save|send|add|submit|confirm|record|sign in|log in|create|continue|book|request|post|next|unlock|rate|mark/i.test(b.textContent || '')) ||
      null;
  }

  function type(el, text) {
    el.focus();
    try { document.execCommand('selectAll', false, null); } catch (noSel) {}
    if (el.setSelectionRange) { try { el.setSelectionRange(0, String(el.value || '').length); } catch (noRange) {} }
    try { return document.execCommand('insertText', false, text); } catch (noType) { return false; }
  }

  function blankPainted() {
    /* Only elements that sit under a label worth naming: a whitespace-only text node in a card row
       is an invisible value, and that is what this walk is looking for. Layout spacers are excluded
       by requiring the element to be inside a row that also paints non-empty text. */
    const hits = [];
    document.querySelectorAll('#screen b, #screen span, #screen li, #screen td, #screen div').forEach(el => {
      if (el.children.length) return;
      if (el.closest('.chart-cols, .bottomnav, #navbar')) return;
      const t = el.textContent || '';
      if (t.length && t.trim() === '') hits.push(el.tagName.toLowerCase() + '[' + t.length + ']');
    });
    return hits.slice(0, 6);
  }

  const fs = fields();
  const report = [];
  for (const el of fs) {
    const before = snap();
    const label = el.id || el.name;
    const claims = [];
    for (const tok of TOKENS) {
      if (!type(el, tok)) { claims.push({ token: JSON.stringify(tok), typed: false }); continue; }
      const btn = submitFor(el);
      const btnText = btn ? (btn.textContent || '').trim().slice(0, 22) : '';
      if (!btn) { claims.push({ token: JSON.stringify(tok), submit: 'NO CONTROL FOUND' }); restore(before); continue; }
      const storedAfter = (() => { try { return el.value; } catch (e) { return ''; } })();
      try { btn.click(); } catch (threw) { claims.push({ token: JSON.stringify(tok), threw: threw.message }); restore(before); continue; }
      const after = snap();
      const changed = [];
      let grew = null;
      for (const k in after) {
        if (after[k] === before[k]) continue;
        let parsed; try { parsed = JSON.parse(after[k]); } catch (e) { parsed = after[k]; }
        const isArr = Array.isArray(parsed);
        let parsedBefore; try { parsedBefore = JSON.parse(before[k]); } catch (e) { parsedBefore = null; }
        if (isArr && Array.isArray(parsedBefore) && parsed.length !== parsedBefore.length)
          grew = k + ' ' + parsedBefore.length + ' -> ' + parsed.length;
        const blank = typeof parsed === 'string' && parsed.length > 0 && parsed.trim() === '';
        claims.blank = claims.blank || blank;
        changed.push({ key: k, blank: blank,
          value: (CLAIM.test(k) || blank) ? brief(parsed) : (isArr ? 'array#' + parsed.length : brief(parsed).slice(0, 18)),
          claim: CLAIM.test(k) });
      }
      claims.push({ token: JSON.stringify(tok), submit: btnText, stayedInField: brief(storedAfter),
        grew: grew, changed: changed, blankPainted: blankPainted() });
      restore(before);
    }
    /* A finding is: whitespace stored anywhere, a record created, a blank painted row, or a claim
       (modal/error/toast) set. A row whose only change is a draft object and no claim is the app
       refusing quietly, which is correct behaviour and stays out of the report. */
    const flat = [];
    claims.forEach(c => (c.changed || []).forEach(ch => flat.push(ch)));
    const bad = claims.some(c => c.threw || c.submit === 'NO CONTROL FOUND' ||
      (c.blankPainted || []).length || c.grew || (c.changed || []).some(ch => ch.blank));
    const stored = flat.some(ch => ch.blank);
    if (bad || stored) report.push({ field: label, tokens: claims });
  }

  return { typedFields: fs.length, findings: report.length, report: report };
})()
