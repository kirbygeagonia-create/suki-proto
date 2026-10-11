# Handset pass — the thing no browser check can prove

The rebuild in `Sukinnect-next.html` has been rendered in Node (415 assertions), painted in
real Chrome at 360×640 and 390×844 across 46 screens, and measured for tap targets, contrast,
clipping and occlusion. None of that is a phone. Three categories are still unverified because no
instrument can reach them: a thumb, an on-screen keyboard, and a slow device.

**The Android assets copy is a third file, and `git status` cannot see it.**
`Sukinnect-Android/app/src/main/assets/Sukinnect.html` is gitignored, so no working-tree check
will ever tell you which build a device is about to run. It was re-synced to the current rebuild
on 2026-10-10; it drifts by design, so verify rather than trust this sentence. Do not reach for
`md5sum` against `git show` — `.gitattributes` stores LF and this machine checks out CRLF, so a
hash comparison against a committed blob mismatches by design (see `AGENTS.md` §31). Between two
files on disk a hash is fine, and there is now a tool that checks more than the one file:

```
node Sukinnect-Android/tools/check-assets.cjs            # the source tree
node Sukinnect-Android/tools/check-assets.cjs --apk <file.apk>   # inside a built APK
```

It reads every local path out of the bundled page — including the ones built by concatenation,
like `avatars/avatar-` + `n`, which it expands against the loop's own bound — and fails on any
that is not there. A missing PNG does not fail a Gradle build; it ships and the phone shows a
blank tile, which is the failure this exists to catch. Its own checks were proved the usual way:
`node Sukinnect-Android/tools/falsify-assets.cjs` mutates the bundle three ways and requires the
checker to notice each time (3 mutants applied, 3 caught as of 2026-10-10).

**The first check on the device is the app-switcher title.** A debug install reads
**"Sukinnect · preview"**; a release build still reads "Sukinnect". This is worth one line because
it did not use to be true: this document told the reader to identify the rebuild by its launcher
title from the day it was written until 2026-10-10, when the label was found to be plain
`Sukinnect` in `res/values/app.xml` for every build type. The debug override now lives in
`app/src/debug/res/values/app.xml`, so the word "preview" cannot reach a Play-bound build. Note
that one `applicationId` means one install: installing this **replaces** the customer build rather
than sitting beside it, which is why the version code went up as well as the name.

## Building it — re-built 2026-10-10 for the rebuild's assets; first compiled 2026-10-09

"the Java looks right" is not the same claim as "an APK builds and contains what you changed",
and neither is the same claim as "the page inside it finds its images". All three are now
established, on the assets as they ship rather than as they sit in the repo:

```
cd Sukinnect-Android
~/.gradle/wrapper/dists/gradle-8.14.3-all/*/gradle-8.14.3/bin/gradle --offline :app:assembleDebug
# BUILD SUCCESSFUL in 54s — 34 actionable tasks
adb install -r app/build/outputs/apk/debug/Sukinnect-1.2-preview-debug.apk
```

There is **no gradle wrapper in this project** — no `gradlew`, no `gradle/wrapper/` — so the build
depends on whatever Gradle happens to be installed. It was run here with the 8.14.3 distribution
already in `~/.gradle`, which is the version the project's `.gradle/` directory was written by. A
fresh machine with Android Studio may resolve a different one. Adding the wrapper would make this
reproducible; that is a change to the untracked project, so it is flagged rather than done.

What was verified about the artifact, not assumed:

| Check | Result |
|---|---|
| `:app:assembleDebug` | **BUILD SUCCESSFUL**. Output `Sukinnect-1.2-preview.3-debug.apk`, 4,591,128 bytes, `versionCode 5`, `versionName 1.2-preview.3` |
| Launcher label | `aapt dump badging`: **'Sukinnect · preview'** on this debug APK, and still **'Sukinnect'** on the Oct-1 release APK — the override is debug-scoped, measured on both artifacts |
| `assets/Sukinnect.html` inside the APK | `cmp` says **identical to `Sukinnect-next.html`** (721,990 bytes at the `.3` build) |
| The seven category PNGs inside the APK | `cmp` says identical to `assets/category-art/*.png`, and they sit at `assets/assets/category-art/` because the WebView root mirrors the repo root |
| The four Atkinson weights inside the APK | `cmp` says identical, and `unzip -v` says **Stored** — `noCompress 'woff2'` is doing its job |
| Every path the bundled page asks for | `check-assets.cjs --apk`: **48 of 48 resolve** |
| The bundled page, painted | `tools/shot.cjs --file=<the assets copy> --width=360 --height=640 --measure`: 46 screens then, **47 now**, **0 images that got no pixels, 0 console errors**, 9 painted font sizes all ≥14px, 0 moving category artwork, and **every measured field equal to the same run against the repo source** |
| Scratch left behind | none — the capture directories this pass wrote were deleted. The only tracked edits are `tools/shot.cjs` (the `--file=` flag) and this file |

**Two build notes from 2026-10-10/11, both learned the hard way.** Rebuilding replaces the
previous debug APK in place — `Sukinnect-1.1-debug.apk` and then `Sukinnect-1.2-preview-debug.apk`
were each removed by the next build, so a bench that wants two builds side by side has to copy the
first one out before making the second. And `:app:packageDebug` failed twice on a stale handle over
`app/build/intermediates/incremental/packageDebug/tmp/debug/zip-cache` with **no Java process
running** — the directory was empty, `rm -rf` on that one path cleared it, and the build succeeded
afterwards. If that error appears, it is build scratch, not the project: delete the `tmp` directory
rather than hunting for a process to kill.

The painted-page row is what the `--file=` flag added to `tools/shot.cjs` exists for. The
camera could previously photograph only `Sukinnect-next.html` at the repo root, where
`assets/category-art/plumbing.png` resolves one level deep. Inside the APK the same page resolves
it against `file:///android_asset/`, one level *deeper*. A pass over the repo source could not have
seen a bundle with every image in the wrong place — which is precisely the bug this build was
exposed to, and it is now measured rather than reasoned about.

**Dead weight this build carries, left in place on purpose.** `assets/reicon.js` is 8,344,694
bytes on disk, 2,490,872 inside the APK — **54% of the file an install pulls down** — and the
bundled page never loads it: the rebuild draws 43 inline glyphs and the only two mentions of
reicon in it are comments. The four Fraunces woff2 files (253,384 bytes) are unreferenced too,
since the type pass moved every role onto Atkinson. They were kept because this one `assets/`
directory serves both pages: the shipped `Sukinnect.html` still loads reicon and still sets
headings in Fraunces, so dropping either from the bundle means the same tree can no longer produce
a customer APK without a second sync step. Taking them out is a promotion decision, not a build
decision, and either way it is one line of `ignoreAssetsPattern` or one `mv`.

**Everything changed in the untracked project on 2026-10-10, since `git` will not show any of
it.** Four things, all reversible:

1. `app/src/main/assets/` re-synced: `Sukinnect.html` ← the current rebuild; seven PNGs into the
   new `assets/category-art/`; four `font-atkinson-next-*.woff2` plus `ATKINSON-OFL.txt` and
   `ATKINSON-AUTHORS.txt` into `fonts/` (the OFL text travels with the fonts it licences);
   `fonts/fonts.css` replaced. Nothing was deleted — the old Fraunces and Jakarta weights are
   still there, and `reicon.js` was not touched.
2. The two files that were overwritten are in `Sukinnect-Android/web-assets-backup-20261010/`,
   outside `app/src/main/assets` so they cannot be packaged: `Sukinnect.html` (719,156 bytes — the
   2026-10-09 sync of the rebuild, which is what the Oct-9 APK carried) and `fonts/fonts.css`
   (the Fraunces-era sheet, which is what was there before the type pass — `grep -c Atkinson`
   returns 0). To put that state back:
   `cp -r Sukinnect-Android/web-assets-backup-20261010/. Sukinnect-Android/app/src/main/assets/`
   — verified to lay down exactly those two paths. It does **not** restore a shipped-prototype
   bundle; for that, copy the repo's `Sukinnect.html` over instead, as the older version of this
   section described.
3. `app/build.gradle`: `versionCode` 2 → 3, `versionName` '1.1' → '1.2-preview'.
4. `app/src/debug/res/values/app.xml`: new, debug-only `app_name`.

Two new files sit alongside them, both in the untracked project because both are about the
artifact rather than the page: `tools/check-assets.cjs` and `tools/falsify-assets.cjs`.

One expected warning, not introduced here: `onBackPressed` is deprecated since API 33. It still
works at `targetSdk 34`; Android's predictive back will want `OnBackInvokedCallback` eventually,
and that needs `androidx.activity`, which this shell deliberately does not use.


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
**Decided 2026-10-10: the shell stays local and untracked.** The owner was asked directly and chose
to leave it out of git, so this is settled rather than outstanding — do not re-raise it, and do not
"tidy" it by adding the directory to a commit. What follows is the consequence to live with, not a
proposal: `git` will never show a change made here, so every shell edit has to be described in this
file by hand, and a clone of this repository does not contain the app that runs on a phone.

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
- [ ] Look at the seven category tiles. Each is now a PNG in `assets/category-art/`, loaded
      from disk — do all seven show their picture, or is any one a blank or a broken-image
      icon? Then tap one: the artwork must not move, scale or bounce, on press or afterwards.

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
- [ ] **Type an apostrophe into your own name.** Profile → Edit profile → put `D'Amore` in Full
      Name and save. It must read `D'Amore` on the home greeting, the profile card and the row
      that opens the sheet — not `D&#39;Amore`, and not a name that has swallowed the words after
      it. Chrome proves the escaping holds for a straight `'`; **a handset keyboard usually
      inserts a typographic `’` instead**, and autocorrect may rewrite what you typed after the
      first character. Do the same with a `"` in Home Address. This is the one place where the
      device's own text handling can produce a character the browser tests never sent.

## 3. A slow device — 5 min

- [ ] Cold open. Between the splash and Home, is there a white flash? (The shell paints
      `#F1F5FF` behind the WebView for exactly this; if you see white, that changed.)
- [ ] Admin dashboard scrolls about 1,650px past the fold and draws a chart. Scroll it fast.
      Jank, blank rows, or a stutter on each repaint is the finding.
- [ ] Open a provider's map on a weak or offline connection. The "Loading map…" caption must
      hand over to the offline message — it must not sit there for ever, and the tiles must not
      paint outside the map frame.
- [ ] **Hardware back** from: an open sheet, provider detail, a chat, the booking screen.
      **[the defect is fixed — this is now a real check, not a discovery]** the page used to push
      no history at all, so `canGoBack()` was false and back quit the app from inside every
      modal; it now keeps one entry per open layer and one per drill-in, verified in real Chrome
      by pressing back for real and pinned by 14 checks in the `back` suite. What a browser
      cannot answer is the two device edges: **does back close the keyboard before it closes the
      sheet, and does it still quit normally from a root tab?**
- [ ] Create a booking, force-close the app, reopen it. The booking is still there, and the
      admin money console still says storage is available. If it says storage is unavailable on
      a real device, that is news — it has only ever worked in a browser.

## 4. Worth a look, not pass/fail

- **Profile dates come from `toLocaleDateString('en-PH', …)`**, which is new since the last build
  and is the one thing here that depends on the device's ICU data rather than the page. Open
  Profile → Service History and Receipts on the phone: a finished job must read like
  "Sep 7, 2026", not "2026-09-07", not "Sep 7, 2026 AD", and never blank. A blank there means the
  locale tag is unsupported and the format should be pinned in the page instead of asked for.
- The resident's "Account activity" tiles and the spending card now read **2 completed / ₱590
  paid**, because they are computed from the bookings on the device. They are not wrong because
  they differ from the old screenshot — the old numbers were invented. If a phone shows
  different figures, that means its local storage holds different bookings, which is the point.
- `reicon.js` (8.3 MB) is still bundled and the rebuild does not load it. Deleting it from
  `assets/` shrinks the APK; put it back before running the shipped file again.
- The UI is one family everywhere: Atkinson Hyperlegible Next, with Plus Jakarta Sans behind
  it, both from `fonts/` on disk. The decorative serif is gone from headings — if a heading
  renders in the system serif or the two fonts differ between the sign-in card and a list
  screen, the local `@font-face` is not being picked up over `file://`. The smallest text in
  the app is 14px; anything visibly smaller than that is a bug, not a design choice.
- The category tiles are static images and must stay that way. They no longer animate at all,
  so there is nothing to judge for flicker; what is worth checking on the lowest-spec device
  is whether the seven PNGs decode without a visible flash or a blank frame on first paint.

## 5. The fruit pilot — 9 min

This one can only be seen on a device in two places, and neither is reachable from a
screenshot. Sign in as the **provider** with `erning@demo.ph` (any password) to get the harvest
job in the inbox; `ramil@demo.ph` is still the plumbing account.

- [ ] **The photo control.** **[the shell now answers it — this is the check that cannot be made
      any other way]** `MainActivity` used to set a `WebViewClient` and no `WebChromeClient`, so
      `onShowFileChooser` did not exist and **no picker could open** — on the fruit request *and*
      in the Concierge. The shell implements it now, and this APK carries that shell. It has still
      never run on a device: compiling is the whole of the evidence. Press it in both places and
      report: does a picker open, does the chosen photo appear, does **cancelling** leave the
      control working (an unanswered request is the classic way to kill every later attempt
      silently), and does the remove button remove?
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
