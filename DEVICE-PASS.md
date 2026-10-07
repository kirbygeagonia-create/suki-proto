# Handset pass — the thing no browser check can prove

The rebuild in `Sukinnect-next.html` has been rendered in Node (252 assertions), painted in
real Chrome at 390×844 across 40 screens, and measured for tap targets, contrast, clipping and
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

## 5. The fruit pilot — 6 min

This one can only be seen on a device in two places, and neither is reachable from a
screenshot. Sign in as the **provider** with `erning@demo.ph` (any password) to get the harvest
job in the inbox; `ramil@demo.ph` is still the plumbing account.

- [ ] **The photo control.** On the fruit request sheet, open *Access, timing and photos* and
      tap *Add a photo*. **If nothing happens, that is a finding, not a bug in the page:** an
      `<input type="file">` inside a WebView only opens a picker if the shell implements
      `WebChromeClient.onShowFileChooser`. The desktop Chrome camera cannot tell you this, and
      the page has no way to know either. Report whether a picker appeared. If it did, confirm
      the file name shows as a chip and that removing it works.
- [ ] **The totals move while you type, and nothing is buried.** As the provider, open the
      harvest-and-buy request and press *Make an offer*. Type a price per kilo. The summary
      under the fields must update on every keystroke **without the field losing focus or the
      keyboard closing**. If the caret jumps, or the keyboard dismisses, say so — that is a
      real-device-only failure.
- [ ] **The Send offer button is reachable with the keyboard open** while the price field is
      focused, and it is greyed out until a number exists.
- [ ] **The mode step reads as three decisions, not three paragraphs.** On a 360-class phone,
      is *Harvest Only / Sell My Fruit / Harvest + Buy* scannable in one glance, and does the
      selected one look selected without relying on the blue border alone?
- [ ] **Answering an offer is the loudest thing on the screen.** As the resident, open the job
      with an offer on it. Accept and Decline should sit above *Withdraw this request*, and
      withdrawing should not be the reddest control on the page.
- [ ] **The money wording survives being read aloud.** With TalkBack on, read the offer card
      and then the record after accepting. It should be obvious which number is the fruit and
      which is the service fee, and that the platform holds neither. If you have to re-read it,
      the sentence is too long — report which one.
- [ ] **Nothing claims a certificate.** As the resident, open Erning's profile. The capability
      block should read as what the person declared. If anything on that screen could be
      mistaken for Sukinnect having checked a ladder harness, that is the most serious finding
      on this list.

## What to report

Which of the three groups failed, on which screen, and a photo or screen recording where motion
is the subject — a still screenshot cannot show a flash or a stutter. Everything in §1 and §2 is
fixable in the page; §3's back-button finding may need the shell, and that is a separate change
to a separate project.
