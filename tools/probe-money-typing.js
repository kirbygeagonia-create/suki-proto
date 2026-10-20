/* One expression the camera evaluates inside a real page:
     node tools/shot.cjs --probe=@tools/probe-money-typing.js --only=offer-sheet
   The screen matters: `offer-unit` is painted by `makeOfferSheet()`, which the camera reaches as
   `offer-sheet`. This header used to name `fruit-sheet` — the resident's request sheet, which has no
   such field — so every run through `node tools/probe-all.cjs` answered `offer-unit ABSENT` and was
   still counted as an answer. That is now a refusal the runner flags, not a clean line.
   Setting .value programmatically is NOT what a person does, and Chrome treats the two
   differently: a programmatic write of unparseable text clears the value quietly, while typed
   text leaves the characters on screen and raises validity.badInput. This inserts text the way
   an edit does, so the question "can the app tell that the person typed something it cannot
   read?" is answered with the same flag a real keystroke sets. */
(() => {
  const el = document.getElementById('offer-unit');
  if (!el) return 'NO CONCLUSION — offer-unit is not painted on this screen; is --only= still right?';
  const results = [];
  const attempt = (text) => {
    el.focus();
    el.select && el.select();
    document.execCommand('delete', false, null);
    document.execCommand('insertText', false, text);
    results.push(JSON.stringify({ typed: text, holds: el.value, badInput: el.validity.badInput,
      valid: el.validity.valid, rangeUnderflow: el.validity.rangeUnderflow }));
    el.blur();
  };
  ['1500', '1,500', '1.5.5', '-5'].forEach(attempt);
  return results.join('\n');
})()
