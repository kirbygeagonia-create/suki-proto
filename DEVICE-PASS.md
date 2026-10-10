# Handset pass — the thing no browser check can prove

The rebuild in `Sukinnect-next.html` has been rendered in Node (394 assertions), painted in
real Chrome at 390×844 across 46 screens, and measured for tap targets, contrast, clipping and
occlusion. None of that is a phone. Three categories are still unverified because no instrument
can reach them: a thumb, an on-screen keyboard, and a slow device.

**The Android assets copy is a third file, and `git status` cannot see it.**
`Sukinnect-Android/app/src/main/assets/Sukinnect.html` is gitignored, so no working-tree check
will ever tell you which build a device is about to run. It was synced to the current rebuild on
2026-10-08; it drifts by design, so verify rather than trust this sentence. Run the comparison
before you build:

```
md5sum Sukinnect-next.html Sukinnect-Android/app/src/main/assets/Sukinnect.html
```

Two identical hashes means the device will run what you have been reading about. To put the
shipped prototype back instead — which is what a customer-facing build should carry until the
owner says otherwise:

```
cp Sukinnect.html Sukinnect-Android/app/src/main/assets/Sukinnect.html
```

The first check on the device: the app switcher should read **"Sukinnect — next (rebuild)"**.
That title is there on purpose, so a phone is never showing a build you cannot name.

## What was settled before the phone

A pre-pass ran on 2026-10-07 with the instruments in this repo — headless Chrome at a phone
viewport, a live-DOM probe (`tools/probe-caret.js`), and the Android shell's own source. It
answered some of this list outright, narrowed others to a single question, and found **three real
defects — all three now fixed**. Everything below marked **[settled]** does not need your hands.

| Checklist item | Status |
|---|---|
| §2 — does the right keyboard come up for numeric fields? | **[settled]** every numeric field in the app carries `inputmode` (`decimal` or `numeric`); the instrument found zero relying on a QWERTY pad. |
| §2 — does the submit button disappear under the keyboard? | **[settled, page-side]** at a keyboard-height viewport (360×380) every one of the seven sheets shrinks to 304px, its body scrolls, and its action row sits flush with the bottom edge. `windowSoftInputMode="adjustResize"` is set in the manifest, so the WebView gives that height up rather than panning. |
| §2 / §5 — does typing cost you the field? | **[settled, and fixed]** one field did this: the admin's search on verified providers called `render()` on every keystroke, which detached the input and dropped focus. `render()` now restores focus and the caret position the same way it already restores scroll. Proven both ways: with the fix the field keeps focus, without it it does not. All 46 screens now pass. |
| §3 — white flash on cold open | **[settled in the shell]** `web.setBackgroundColor(#F1F5FF)` matches `--cloud`. Still worth eyes on, but the cause is handled. |
| §3 — storage after force-close | **[settled in the shell]** `setDomStorageEnabled(true)` and `setAllowFileAccess(true)` are both set, and the round-trip through `hydrate` is gated. |
| §3 — does the map caption sit there for ever offline? | **[settled]** it cannot: a `tileerror` handler, a painted-tile count, and a hard 4-second timeout all hand over to the fallback message. |
| §5 — the weighing's numeric pad, caret and half-kilos | **[settled]** `inputmode="decimal"`, focus survives typing, and 29.5 reopens as 29.5 (a rounding bug caught and fixed the same day). |
| §5 — is the unit-error warning readable without burying the buttons? | **[settled at 360px]** photographed; the amber line sits above a pinned action row. The *keyboard-open* version of this is still yours. |
| §1 — are the controls in thumb reach? | **[measured]** at 360×640 only header-level controls (Back, Log Out, Mark all as read) sit in the top 28%; every primary action is in the lower half. Whether it *feels* right with one thumb is still yours. |
| Accessibility names on every field | **[settled for painted screens]** the instrument now checks form controls against the browser's own `el.labels`. It found seven fields whose visible label was never associated — the booking sheet's "what needs doing", the concierge box, the results search, the seven admin rate fields — all fixed; zero nameless controls remain. |
| §3 — hardware back from a sheet or a drill-in | **[fixed, needs the two phone-only edges]** the page now keeps one history entry per open layer and one per drill-in. See the defects below. |
| §5 — the photo picker | **[fixed in the shell, never run on a device]** `onShowFileChooser` now exists. It compiles; that is the whole of the evidence. See the defects below. |

**Two things the pre-pass could not fix, because they are not page bugs:**

- **[fixed] Hardware back quit the app from inside any open sheet.** The page pushed **no**
  history at all, so `canGoBack()` was false and back exited. The page now keeps one history
  entry per open layer and one while you are off a root tab, and back spends them in order:
  close the sheet, then leave the drill-in, then leave the app. Verified in real Chrome by
  pressing back for real, and pinned by 14 checks in the `back` suite. Two edges a browser
  cannot reach are still yours: **does back close the keyboard before it closes the sheet, and
  does it still quit normally from a root tab?**
- **[fixed, never run on a device] Both photo controls opened nothing.** `MainActivity` had a
  `WebViewClient` and no `WebChromeClient`, so `onShowFileChooser` did not exist. The shell now
  implements it, returns the picked URIs to the page, and answers `null` when the picker is
  cancelled — without that, one cancelled attempt leaves the input dead for the rest of the
  session. It compiles clean against `android.jar` (API 34) and that is the whole extent of what
  has been verified: **no phone is attached here.** Confirm a picker opens from both the fruit
  request and the Concierge, the name shows as a chip, removing it works, and cancelling once
  does not break the next try. Expect the chip to read something like `1000004321.jpg`: Android
  hands over a document URI and the page stores the name it carries, which is a device fact, not
  a page bug.

**The Android shell is not in git.** `.gitignore` line 2 is `Sukinnect-Android/` and
`git ls-files Sukinnect-Android` returns nothing — the whole project, including the file chooser
above and the assets copy below, is unversioned and exists only on the machine that edited it.
That is a large part of why a defect this basic survived: no check, review or clone can see it.
Tracking the shell is a decision worth making deliberately, not a step to slip in sideways.

**The assets copy now matches the rebuild**, so a build today runs the weighing step and the back
fix. They drift by design, so re-check before building:

```
md5sum Sukinnect-next.html Sukinnect-Android/app/src/main/assets/Sukinnect.html
```

Everything still unmarked below genuinely needs the handset: a thumb, a real keyboard, and a
slow device.

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
- [x] ~~Admin → configuration: change the commission rate. The field is numeric; does the right
      keyboard come up?~~ **[settled]** every numeric field in the app carries `inputmode`; the
      instrument found none relying on a QWERTY pad. Still glance at it, but it is not open.
- [ ] Close the keyboard. Does the screen land back where you were, or somewhere else?

## 3. A slow device — 5 min

- [ ] Cold open. Between the splash and Home, is there a white flash? (The shell paints
      `#F1F5FF` behind the WebView for exactly this; if you see white, that changed.)
- [ ] Admin dashboard scrolls about 1,650px past the fold and draws a chart. Scroll it fast.
      Jank, blank rows, or a stutter on each repaint is the finding.
- [ ] Open a provider's map on a weak or offline connection. The "Loading map…" caption must
      hand over to the offline message — it must not sit there for ever, and the tiles must not
      paint outside the map frame.
- [x] ~~**Hardware back** from: an open sheet, provider detail, a chat, the booking screen.~~
      **[answered — it is a defect, no need to discover it twice]** the page pushes no history at
      all, so `web.canGoBack()` is false and back quits the app from inside every modal. Confirm
      it once so the report has a device on it, then pick the fix: page-side history entries, or
      a shell that asks the page to close its sheet first. See the two defects at the top.
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

## 5. The fruit pilot — 9 min

This one can only be seen on a device in two places, and neither is reachable from a
screenshot. Sign in as the **provider** with `erning@demo.ph` (any password) to get the harvest
job in the inbox; `ramil@demo.ph` is still the plumbing account.

- [x] ~~**The photo control.**~~ **[answered — it is a defect]** `MainActivity` sets a
      `WebViewClient` and no `WebChromeClient`, so `onShowFileChooser` is never implemented and
      **no picker can open** — on the fruit request *and* in the Concierge, which the checklist
      did not name. They have only ever worked in a browser. Do not spend time on the chip and
      the remove button; decide instead whether the shell grows twenty lines or the page loses
      two controls.
- [ ] **The totals move while you type, and nothing is buried.** As the provider, open the
      harvest-and-buy request and press *Make an offer*. Type a price per kilo. The summary
      under the fields must update on every keystroke **without the field losing focus or the
      keyboard closing**. If the caret jumps, or the keyboard dismisses, say so — that is a
      real-device-only failure.
- [ ] **The Send offer button is reachable with the keyboard open** while the price field is
      focused, and it is greyed out until a number exists.
- [ ] **Weighing out the fruit behaves like the offer sheet, not like a form submit.** As the
      provider, walk a harvest-and-buy to *Arrived* and press *Enter kilos* (or *Enter trees*).
      The number field must bring up the **numeric** keyboard, the totals block must update on
      every keystroke without the caret moving, and the sheet must not jump when it does.
- [ ] **Half a kilo stays half a kilo.** Record 29.5, then reopen the sheet: it must read
      29.5, not 30. Then correct it to 31 and check the card and the resident's row both show
      the new figure with the old one beside it. A reading that rounds on the way back in is a
      record that changes when you look at it.
- [ ] **The unit-error warning is readable and does not bury the button.** Type `31000` into
      the kilos field (what a person holding a scale readout would type). An amber line should
      appear saying it is more than double the estimate. On the smallest phone you have: is the
      line readable in one pass, and can you still reach **Record** and **Cancel** with the
      keyboard closed? The sheet grows downward, so this is the one place where a warning could
      push the action off the screen.
- [ ] **The weighing is below the fold and you can find it.** On a 360-class phone the card sits
      under the map and the job notes on the provider's job screen. Scroll from the top: is it
      obvious enough that the visit is not finished until you enter what you carried?
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
