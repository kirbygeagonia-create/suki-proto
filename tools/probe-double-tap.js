/* One expression the camera evaluates inside a real page, after that screen's own navigation:
     node tools/shot.cjs --probe=@tools/probe-double-tap.js --only=booking-sheet,offer-sheet
   A thumb taps twice. Nothing in this repository has ever performed any action twice — every check
   in the gate calls a handler once, and the camera's walk clicks a control once per screen. So the
   one input a phone user produces constantly is the one input no instrument models.

   What it does: on the screen the walk actually reached, it finds the painted controls whose handler
   creates or moves a record, clicks each one TWICE on the same node — the second click lands on a
   detached element if the first click replaced the DOM, which is exactly what a real double tap
   does — and reports how many records each click added. A second click that adds a second booking,
   a second offer, a second dispute, or a second payout is the finding.

   Then it puts everything back: the record arrays are restored in place (they are `const` bindings,
   so their contents are replaced, not the binding) and `state` is re-hydrated from a snapshot, so
   the next control is measured from the same starting page rather than from the wreckage of the
   last one. */
(async () => {
  const ARRAYS = ['BOOKINGS', 'OFFERS', 'DISPUTES', 'MESSAGES', 'LEDGER', 'PAYOUTS', 'LISTINGS',
    'NOTIFICATIONS', 'CREDENTIALS', 'PENDING_APPLICANTS', 'REVIEW_NOTES'];
  const HANDLERS = ['submitBookingRequest', 'makeOffer', 'submitOffer', 'openDispute',
    'runPayoutCycle', 'saveListingDraft', 'commitListingDraft', 'answerResidentOffer',
    'answerOffer', 'submitCase', 'resolveCase', 'sendChatMessage', 'saveHouseholdItem',
    'savePortfolioWork', 'savePayoutAccount', 'verificationAction', 'submitFinalise',
    'saveResidentProfile', 'saveAdminProfile', 'saveProviderProfessionalProfile',
    'savePreferredPayment', 'sendDocumentRequest', 'addConciergeAnswer', 'saveAdminProviderNote'];

  const resolve = name => { try { return typeof eval(name) !== 'undefined' ? eval(name) : null; }
    catch (e) { return null; } };

  const arrays = {};
  ARRAYS.forEach(n => { const a = resolve(n); if (Array.isArray(a)) arrays[n] = a; });
  const snapArrays = () => {
    const s = {};
    Object.keys(arrays).forEach(n => { s[n] = arrays[n].map(r => JSON.stringify(r)); });
    return s;
  };
  const restoreArrays = s => {
    Object.keys(s).forEach(n => {
      const arr = arrays[n];
      /* Keys that are not record arrays (the `rec.` aliases and the `state.` paths the snapshot now
         also carries) have nothing to restore here — the state snapshot below puts them back. */
      if (!arr) return;
      arr.length = 0;
      s[n].forEach(json => { try { arr.push(JSON.parse(json)); } catch (bad) { /* a record that
        cannot be re-parsed cannot be restored either, and saying so is the probe's job */ } });
    });
  };
  let stateSnap = null;
  try { stateSnap = JSON.stringify(state); } catch (unsnapshottable) { stateSnap = null; }

  /* Only controls that are actually on the screen and actually tappable. */
  const targets = [...document.querySelectorAll('[onclick]')].filter(el => {
    const oc = el.getAttribute('onclick') || '';
    return HANDLERS.some(h => oc.indexOf(h + '(') > -1);
  });

  /* A control whose FIRST tap writes nothing is not a guarded control — it is a control this probe
     never exercised, and the two read identically unless the instrument says which happened. Most
     of these buttons sit on a sheet that refuses an empty form, so the fields are filled the way a
     person fills them: focus and type, which is the path a keystroke takes, falling back to a
     dispatched input event only where typing cannot apply (selects, checkboxes). */
  const fillLayer = () => {
    const scope = document.querySelector('.sheet, .modal-card') || document.getElementById('screen');
    if (!scope) return 0;
    let n = 0;
    scope.querySelectorAll('input, textarea, select').forEach(f => {
      const type = (f.type || '').toLowerCase();
      if (f.readOnly || f.disabled) return;
      if (type === 'checkbox' || type === 'radio') { if (!f.checked) { f.click(); n++; } return; }
      if (f.tagName === 'SELECT') {
        if (f.selectedIndex <= 0 && f.options.length > 1) {
          f.selectedIndex = 1;
          f.dispatchEvent(new Event('change', { bubbles: true }));
          n++;
        }
        return;
      }
      if ((f.value || '').trim()) return;
      let v = 'Probe entry';
      if (type === 'number') { const mn = parseFloat(f.min); v = isNaN(mn) ? '100' : String(mn + 1); }
      f.focus();
      try { document.execCommand('insertText', false, v); } catch (noType) { /* fall through */ }
      if (!(f.value || '').trim()) {
        f.value = v;
        f.dispatchEvent(new Event('input', { bubbles: true }));
      }
      n++;
    });
    /* An edit form arrives already filled, so the loop above types nothing and the save below is a
       no-op that looks like a control this probe never exercised. Give it something to write: a
       real edit is a CHANGE, and a second save of a changed value is the thing worth knowing about. */
    if (!n) {
      const first = [...scope.querySelectorAll('input:not([readonly]), textarea')].find(f => {
        const t = (f.type || '').toLowerCase();
        return !f.readOnly && !f.disabled && t !== 'checkbox' && t !== 'radio' && t !== 'number';
      });
      if (first) {
        first.focus();
        try { document.execCommand('insertText', false, ' 2'); } catch (noType) {
          first.value = (first.value || '') + ' 2';
          first.dispatchEvent(new Event('input', { bubbles: true }));
        }
        n = 1;
      }
    }
    return n;
  };

  /* Records do not all live in the top-level arrays: a portfolio entry, a household item, a saved
     address and the admin audit rows are arrays inside `state`, and a control that writes one of
     those looked identical to a control that wrote nothing at all. So the snapshot covers both
     places, and "NOT EXERCISED" means the action genuinely did nothing rather than "did something
     this probe was not looking at". */
  const stateArraySig = () => {
    const m = {};
    const walk = (o, path, d) => {
      if (!o || typeof o !== 'object' || d > 2) return;
      Object.keys(o).forEach(k => {
        const v = o[k];
        if (Array.isArray(v)) m[path + k] = v.length;
        else if (v && typeof v === 'object') walk(v, path + k + '.', d + 1);
      });
    };
    walk(state, 'state.', 0);
    return m;
  };
  /* Two different snapshots for two different jobs: the string list is what puts the records back,
     and a count map is what says whether a tap changed anything. Comparing the first version of
     this probe's snapshots directly subtracted arrays from arrays, answered NaN for every record
     family, and reported every single control as "SECOND TAP WRITES AGAIN" — a sensor whose only
     answer is failure is not measuring the application, it is measuring itself. */
  /* Why a tap did nothing is as useful as that it did. The app says out loud when it refuses —
     `showToast()` and the storage notice are the channels — so the line carries what the device
     answered rather than leaving "NOT EXERCISED" as a mystery. */
  const said = () => {
    const n = document.querySelector('.toast, .storage-notice .sn-text, [role="alert"], [role="status"]');
    const t = n ? (n.textContent || '').trim().replace(/\s+/g, ' ') : '';
    return t.slice(0, 48);
  };
  /* Profile saves change scalar fields, not array lengths, so a count-only snapshot reports them as
     "nothing happened" when in fact the record moved. */
  const scalarSig = () => {
    const m = {};
    ['profileData', 'providerProfileData', 'adminProfileData'].forEach(k => {
      const o = state[k];
      if (o && typeof o === 'object') Object.keys(o).forEach(f => {
        if (typeof o[f] !== 'object') m['state.' + k + '.' + f] = String(o[f]);
      });
    });
    return m;
  };
  const counts = () => {
    const c = {};
    Object.keys(arrays).forEach(n => { c['rec.' + n] = arrays[n].length; });
    const sig = stateArraySig();
    Object.keys(sig).forEach(p => { c[p] = sig[p]; });
    const sc = scalarSig();
    Object.keys(sc).forEach(p => { c[p] = sc[p]; });
    return c;
  };
  const delta = (a, b) => Object.keys(b)
    .filter(k => a[k] !== undefined && b[k] !== a[k])
    .map(k => typeof b[k] === 'number'
      ? k.replace('rec.', '') + ' ' + (b[k] - a[k] > 0 ? '+' : '') + (b[k] - a[k])
      : k.replace('state.', '') + ' changed');

  const report = [];
  let exercised = 0, idle = 0;
  /* The app's most important action commits from a `setTimeout(..., 900)` behind an in-flight flag —
     which is §47's loading state AND a real double-tap guard, and a probe that clicks twice in the
     same tick sees neither. It reported "NOT EXERCISED" for the booking sheet until it learned to
     wait. `shot.cjs` evaluates a probe with `awaitPromise`, so returning a promise here is enough. */
  const wait = ms => new Promise(r => setTimeout(r, ms));
  for (const el of targets) {
    const oc = (el.getAttribute('onclick') || '').replace(/\s+/g, ' ').slice(0, 46);
    const typed = fillLayer();
    const rowsBefore = snapArrays();
    const before = counts();
    let threw1 = '', threw2 = '';
    try { el.click(); } catch (e) { threw1 = e.message; }
    await wait(1300);
    const mid = counts();
    try { el.click(); } catch (e) { threw2 = e.message; }
    await wait(1300);
    const after = counts();
    const firstAdds = delta(before, mid);
    const secondAdds = delta(mid, after);
    if (secondAdds.length) {
      exercised++;
      report.push('SECOND TAP WRITES AGAIN  [' + oc + ']  ' + secondAdds.join(', ') +
        (threw2 ? ' (threw: ' + threw2 + ')' : ''));
    } else if (firstAdds.length) {
      exercised++;
      report.push('guarded  [' + oc + ']  first ' + firstAdds.join(', ') + ', second +0');
    } else {
      idle++;
      report.push('NOT EXERCISED  [' + oc + ']  the first tap changed no count ' +
        '(fields typed: ' + typed + (threw1 ? ', threw: ' + threw1 : '') +
        ', the app said: "' + said() + '")');
    }
    restoreArrays(rowsBefore);
    if (stateSnap) { try { Object.keys(state).forEach(k => delete state[k]);
      Object.assign(state, JSON.parse(stateSnap)); render(); } catch (e) {
      report.push('state not restorable: ' + e.message); } }
  }

  return JSON.stringify({
    screen: state.view + '/' + state.role + ':' + state.tab + (state.sheet ? '+' + state.sheet : ''),
    layers: (typeof openLayers === 'function' ? openLayers() : '?'),
    tappableRecordWriters: targets.length,
    exercised: exercised,
    notExercised: idle,
    report: targets.length === 0 ? ['no record-writing control painted on this screen'] : report
  }, null, 1);
})()
