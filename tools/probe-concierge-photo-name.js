/* §75: when a picture really arrives, does the concierge keep only its name?
   The claim is a sentence in the UI ("the provider sees the name you gave it, not the photo") and a
   branch in `handlePhotoUpload`, and neither of those is evidence about pixels. This hands the control a
   `File` through `DataTransfer` — the mechanism the browser itself uses when a system picker returns a
   document, so the state is one a person produces rather than one written into a model — fires the same
   `change` event a pick does, then reads what the page painted and whether any bytes reached it.
   The handset could not finish this leg: ColorOS's DocumentsUI accepts an injected tap on its own chrome
   and refuses one on a document row (Handset walk 5 in DEVICE-PASS.md), so the thumb-tap stays owed and
   the app's half is measured here instead.
   Rows are ordered so a clean answer cannot come from a screen that measured nothing: the pick is
   confirmed, then bytes are looked for, then the name is confirmed to be painted, and only then does the
   verdict say 0. `node tools/falsify-photo-name.cjs` breaks each of the first two steps and requires a
   different non-clean answer from each.
   Population: the concierge only. Every other screen has no photo input and refuses.
     node tools/shot.cjs --probe=@tools/probe-concierge-photo-name.js --only=concierge */
(async () => {
  const input = document.getElementById('hidden-file-input');
  if (!input || !/image/.test(input.accept || '')) return 'NO CONCLUSION: this screen paints no concierge photo input';
  const name = 'IMG_kitchen_leak.jpg';
  const f = new File([new Uint8Array([137, 80, 78, 71])], name, { type: 'image/jpeg' });
  const dt = new DataTransfer();
  dt.items.add(f);
  input.files = dt.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
  await new Promise(r => setTimeout(r, 600));

  /* Step 1 — did the pick land at all? */
  if (input.files.length !== 1 || input.files[0].name !== name) {
    return 'NO CONCLUSION: the control failed — input holds ' +
      input.files.length + ' file(s) named ' + JSON.stringify((input.files[0] || {}).name);
  }

  const screen = document.getElementById('screen');
  const txt = (screen.textContent || '').replace(/\s+/g, ' ');

  /* Step 2 — did any bytes reach the painted screen, as an image source or as markup?
     Asking the markup as well as the elements matters: a handler that stores `URL.createObjectURL(file)`
     where it should store `file.name` puts a bytes-bearing string on the screen without ever creating an
     <img>, and a probe that counts image tags alone reads that as clean. */
  const imgLeaks = [...screen.querySelectorAll('img')].map(i => i.getAttribute('src') || '')
    .filter(s => /blob:|data:|kitchen_leak/i.test(s));
  const htmlLeaks = (screen.innerHTML.match(/blob:|data:image/g) || []).length;
  if (imgLeaks.length || htmlLeaks) {
    return 'LEAK: ' + imgLeaks.length + ' image source(s) and ' + htmlLeaks +
      ' bytes-bearing string(s) in the painted screen — ' + imgLeaks.slice(0, 2).join(' , ').slice(0, 120);
  }

  /* Step 3 — is the name the handler is supposed to keep actually painted? Without this, a handler that
     silently dropped the file answers "0 leaks, clean", which is the same character as the real verdict. */
  if (!txt.includes(name)) return 'NO CONCLUSION: the pick landed and no bytes leaked, but the screen paints no file name — nothing was measured';

  return JSON.stringify({
    painted: (txt.match(/[^.]{0,44}IMG_kitchen_leak[^.]{0,30}/g) || []).slice(0, 2),
    sizePainted: /\b\d+(\.\d+)?\s?(bytes|kB|MB)\b/.test(txt),
    imageSourcesHoldingBytes: 0,
    blobOrDataInPaintedHtml: 0,
    refusalCopyShown: /keeps the picture on your device/.test(txt)
  });
})()
