# Handset pass — the thing no browser check can prove

The rebuild in `Sukinnect-next.html` has been rendered in Node (252 assertions), painted in
real Chrome at 390×844 across 30 screens, and measured for tap targets, contrast, clipping and
occlusion. None of that is a phone. Three categories are still unverified because no instrument
can reach them: a thumb, an on-screen keyboard, and a slow device.

**The Android shell is currently staged with the rebuild.** `Sukinnect-Android/app/src/main/assets/Sukinnect.html`
is byte-identical to `Sukinnect-next.html` (`md5 eada07167c7d17e88b454e2c1bf36ff2`), not to the
shipped prototype. Build and install from `Sukinnect-Android/` and you are testing the rebuild.

To put the shipped file back:

```
cp Sukinnect.html Sukinnect-Android/app/src/main/assets/Sukinnect.html
```

The first check on the device: the app switcher should read **"Sukinnect — next (rebuild)"**.
That title is there on purpose, so a phone is never showing a build you cannot name.

## 1. Touch and one-handed reach — 5 min

- [ ] Hold the phone in one hand. On each role's Home, reach the bottom nav, the search field,
      and the notification bell without shifting your grip.
- [ ] Open a provider, then the booking sheet. Tap the primary action with a thumb, not an
      index finger. If you reposition to hit it, note which control.
- [ ] Sheets have no drag-to-dismiss — the close affordance and the scrim tap are the only
      exits. Close every sheet you open both ways. Is it obvious which one you are about to hit?
- [ ] Scroll the category chip rail sideways, then scroll the page downwards. The horizontal
      rail should not steal the vertical gesture, and vice versa.
- [ ] Tap a category tile while its artwork is animating. Does the tap feel immediate?

*Anything that fails here is a size or placement problem in the page, not a device problem.*

## 2. The keyboard — 5 min

The instrument cannot emulate this at all: `shot.cjs` measures a viewport with no keyboard in it.

- [ ] Booking sheet → the "what needs doing" field. With the keyboard open, can you still see
      what you typed **and** reach the submit button?
- [ ] Concierge → describe the problem. Same question.
- [ ] Chat → the message field. The send control must not disappear under the keyboard.
- [ ] Provider → professional profile: edit a rate, then a phone number. Does the field you are
      in stay above the fold while you type?
- [ ] Admin → configuration: change the commission rate. The field is numeric; does the right
      keyboard come up?
- [ ] Close the keyboard. Does the screen land back where you were, or somewhere else?

## 3. A slow device — 5 min

- [ ] Cold open. Between the splash and Home, is there a white flash? (The shell paints
      `#F1F5FF` behind the WebView for exactly this; if you see white, that changed.)
- [ ] Admin dashboard scrolls about 1,650px past the fold and draws a chart. Scroll it fast.
      Jank, blank rows, or a stutter on each repaint is the finding.
- [ ] Open a provider's map on a weak or offline connection. The "Loading map…" caption must
      hand over to the offline message — it must not sit there for ever, and the tiles must not
      paint outside the map frame.
- [ ] **Hardware back** from: an open sheet, provider detail, a chat, the booking screen. The
      shell only knows web history and this app never pushes any, so back may quit the app from
      inside a modal. If it does, that is a real defect worth reporting, not a mistake.
- [ ] Create a booking, force-close the app, reopen it. The booking is still there, and the
      admin money console still says storage is available. If it says storage is unavailable on
      a real device, that is news — it has only ever worked in a browser.

## 4. Worth a look, not pass/fail

- `reicon.js` (8.3 MB) is still bundled and the rebuild does not load it. Deleting it from
  `assets/` shrinks the APK; put it back before running the shipped file again.
- Headings use Fraunces and the interface uses Plus Jakarta Sans, both from `fonts/` on disk.
  If a heading looks like the system serif, the local font is not being picked up over `file://`.
- The category tiles animate. On the lowest-spec device you have, is the motion still readable,
  or does it read as flicker? `prefers-reduced-motion` is honoured in code but only if the
  device reports it.

## What to report

Which of the three groups failed, on which screen, and a photo or screen recording where motion
is the subject — a still screenshot cannot show a flash or a stutter. Everything in §1 and §2 is
fixable in the page; §3's back-button finding may need the shell, and that is a separate change
to a separate project.
