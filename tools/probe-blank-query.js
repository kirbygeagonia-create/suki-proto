/* One expression the camera evaluates inside a real page, after that screen's own navigation:
     node tools/shot.cjs --probe=@tools/probe-blank-query.js --only=resident-results
   A query of nothing but spaces is truthy to JavaScript and empty to a person. `startDiscovery()`
   writes `state.searchQuery` straight from the field, and the results filter trims before matching —
   so the model can hold " " while the matcher behaves as if it held nothing. §48 makes this a
   question about words, not arithmetic: does the screen explain the state it is in, or does it quote
   a query nobody typed?

   Three versions of this probe died before this one, and every death was the instrument:
     1. it read the screen in the breath after the tap, while the simulated discovery was still
        printing "Finding nearby providers…", so a query matching plumbers and a query matching
        nothing both reported zero cards;
     2. it held ONE `search-input` element across the loop, but the results screen paints its own
        field, so from the second case on it typed into a detached node and reported the first query
        five times;
     3. it bounced Home → Results → Home to type each query, and the app pays that Back debt with
        real `history.back()` calls, which on a `file://` page is a navigation: Chrome took the
        inspected target down and the run died with "Not attached to an active page".
   So this version never leaves the destination. The results screen carries its own search field and
   its own magnifier, which is the path a thumb uses after arriving anyway, and changing only the
   query is one screen update rather than a step down or up — the Back machinery has nothing to undo.

   The case that MUST find providers runs first: if it prints zero cards the instrument is blind and
   the run aborts rather than interpreting anything after it. Providers are counted by
   `data-provider-detail`, which is how the app itself binds the card — an earlier guess at a class
   name found nothing and read as an empty result. */
(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const out = [];

  async function settle() {
    for (let i = 0; i < 60; i++) {
      const t = (document.getElementById('screen') || document.body).textContent || '';
      if (t.indexOf('Finding nearby providers') < 0) return i + 1;
      await wait(100);
    }
    return 'still loading after 6s';
  }

  async function runCase(q) {
    if (state.tab !== 'results') return { typed: JSON.stringify(q), error: 'not on the results screen' };
    const input = document.getElementById('search-input');
    const btn = document.getElementById('search-btn');
    if (!input) return { typed: JSON.stringify(q), error: 'no search field on this screen' };
    const storedBefore = state.searchQuery;
    input.focus();
    try { document.execCommand('selectAll', false, null); } catch (noSel) {}
    const typed = (() => { try { return document.execCommand('insertText', false, q); } catch (e) { return false; } })();
    const fieldHolds = input.value;
    if (btn) btn.click(); else startDiscovery(fieldHolds);
    const waited = await settle();
    const pad = document.querySelector('#screen .pad') || document.getElementById('screen');
    const text = (pad ? pad.textContent : '').replace(/\s+/g, ' ').trim();
    return {
      typed: JSON.stringify(q), typedOk: typed, fieldHolds: JSON.stringify(fieldHolds),
      stored: JSON.stringify(state.searchQuery), storedBefore: JSON.stringify(storedBefore),
      trimmedToNothing: String(state.searchQuery || '').trim() === '',
      tab: state.tab,
      cards: document.querySelectorAll('#screen [data-provider-detail]').length,
      says: text.slice(0, 200),
      clearOffered: !!document.getElementById('clear-search-btn'),
      waited: waited,
    };
  }

  const CASES = ['plumbing', 'xyzzy', ' ', '   ', ''];
  for (const q of CASES) out.push(await runCase(q));

  const control = out[0];
  if (!control.cards) {
    return { abort: 'the control query found no provider, so this instrument is blind', cases: out };
  }
  return { controlCards: control.cards, cases: out };
})()
