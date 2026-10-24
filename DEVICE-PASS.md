# Handset pass — the thing no browser check can prove

The rebuild in `Sukinnect-next.html` is rendered in Node (`node tools/verify.cjs` prints the count),
painted and measured in real
Chrome across 82 screens at eight corners (`node tools/sweep-text-scale.cjs`: 320 CSS px at 200% text,
the default panel at 200%, 450 px at 135%, the OPPO's own 320×638 at 135%, 320×480 at 200%, 320×300 at
100% as the keyboard proxy, the vivo's own 450×889 at 200%, and the 100% anchor — and separately in the desktop shell at 1280×900, with
`prefers-reduced-motion` emulated and under `prefers-color-scheme: dark`). When a phone is attached,
the same page questions are asked again inside the device's own WebView by
`node tools/device-probe.cjs` driving Chrome over the DevTools socket. Handset walks 1–8 below, and the
earlier `.17`–`.28` passes above, all on two phones, mean this file is
not a list of things a browser cannot do. It is the record of what only a phone showed, and of the
two things that still outrun every instrument here: how the app *feels* under a thumb, and whether a slow
device keeps up with it. The third — what TalkBack says aloud when a dialog opens — was asked properly on
2026-10-24 with the reader actually running (Handset walk 8): an announcement happens, the accessibility
tree carries the dialog's name, and no channel on this device recovers the words.

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

## Building it — re-built 2026-10-15 (`1.2-preview.19`, `versionCode 21`); first compiled 2026-10-09

"the Java looks right" is not the same claim as "an APK builds and contains what you changed",
and neither is the same claim as "the page inside it finds its images". All three are now
established, on the assets as they ship rather than as they sit in the repo — and a fourth was
added today, because the shell fix this build carries is invisible from the source tree:
**the shipped bytecode contains the handler you wrote**, proven with `dexdump -d classes2.dex`
showing the compiled method holding the scheme list, `"tel"`, then `"android.intent.action.DIAL"`.

That fourth check nearly produced a false verdict. `unzip -p APK classes.dex | grep -c` returned
**zero** for all three strings I looked for, including `"blob"`, which the code certainly
contains: `classes.dex` in this APK is a **2,156-byte stub** and the application lives in
`classes2.dex` (8,416 bytes). Grepping the first file measured nothing and looked like an absent
feature. Unzip every `*.dex` and search them all, or use `dexdump`.

```
cd Sukinnect-Android
./gradlew --offline :app:assembleDebug
# BUILD SUCCESSFUL in 8s   (first attempt today FAILED — see the OneDrive note below)
adb install -r app/build/outputs/apk/debug/Sukinnect-1.2-preview.19-debug.apk
```

**This tree sits under OneDrive, and Gradle sometimes cannot snapshot its own intermediates.** The
first attempt today died in `:app:packageDebug` with `Cannot access output property
'incrementalFolder' … java.io.IOException: Cannot snapshot …\zip-cache\javaResources0: not a
regular file` — a sync placeholder, not a code error, and the source compiled fine on the way in.
Deleting `app/build/intermediates/incremental/packageDebug` and re-running produced
`BUILD SUCCESSFUL in 8s`. If that task fails again, clear that directory before suspecting the
change you just made.

**There is a Gradle wrapper now.** Until 2026-10-11 this project had no `gradlew` and no
`gradle/wrapper/`, so the build depended on whatever Gradle happened to be installed and a fresh
machine with Android Studio could resolve a different one. `gradlew`, `gradlew.bat`,
`gradle-wrapper.jar` and `gradle-wrapper.properties` were generated from the cached 8.14.3
distribution, and the command above was run through them — so the version is pinned in the
project now. It is still an untracked project: the wrapper lives inside `Sukinnect-Android/` and
git will never show it.

What was verified about the artifact, not assumed:

| Check | Result |
|---|---|
| `:app:assembleDebug` | **BUILD SUCCESSFUL in 8s** for `.19` (2,132,422 bytes, `versionCode 21`, `versionName 1.2-preview.19`, `aapt dump badging`; 48 of 48 paths resolve inside the APK). **No behavioral device check has been run against `.19`** — the phone dropped its USB authorisation mid-session — and none is owed by its two page changes, both of which were found and proved in headless Chrome: a timezone override on the camera, and a probe that types through the same edit path a keystroke uses. The number moved anyway, because an install holding bytes the repository no longer contains is the drift this file exists to catch. `.18` was **BUILD SUCCESSFUL in 45s**, first try — no stale-intermediate clear needed this time. Current output `Sukinnect-1.2-preview.18-debug.apk`, **2,131,806 bytes**, `versionCode 20`, `versionName 1.2-preview.18`, label `Sukinnect · preview`, minSdk 24 / target 36 — read off `aapt dump badging`. **`.18` is the build the handset produced rather than the bench**: walking §3f on the vivo turned up two defects no instrument on this machine could see, and both are recorded below with the dump that found them. `.17` moved two bytes of copy (the concierge button label) and `dexdump -d classes2.dex` shows `openOutsideTheWebView` holding the scheme list, then `"tel"`, then `"android.intent.action.DIAL"` — so the two support "Call" buttons hand the number to the dialer instead of failing the scheme into a system error page. `SCHEMA_VERSION` is 16, so a handset holding a v15 dump shows the refusal notice on first launch — that is the notice working, and the reason is that v15 audit rows are indistinguishable on disk from real ones. Earlier builds: `.17` 2,131,282 / `19` (the concierge label), `.15` 2,130,522 / `17` (ten write claims that stored nothing, the audit log's real instant and actor, the restore that overwrote a saved profile), `.14` 2,127,438 / `16` (the admin console's booking statistic relabelled), `.13` 2,126,962 / `15` (the last bare index reads, the stored profile through the record door), `.12` 2,125,430 / `14` (identity lookups, the chat room, the concierge, the chart axis), `.11` 2,118,834 / `13`, `.10` 2,113,374 / `12`, `.9` 2,112,782, `.8` 2,111,574, `.7` 2,105,566, `.6` 2,104,798 |
| Launcher label | `aapt dump badging`: **'Sukinnect · preview'** on this debug APK, and still **'Sukinnect'** on the Oct-1 release APK — the override is debug-scoped, measured on both artifacts |
| `assets/Sukinnect.html` inside the APK | `cmp` says identical to `Sukinnect-next.html` — **803,310 bytes** at the `.19` build (801,996 at `.18` (800,761 at `.17`, 800,763 at `.16` and `.15`, 792,132 at `.14`, 791,013 at `.13`, 786,835 at `.12`). `grep` inside the extracted asset proves which copy shipped — `modalAboveSheet` appears twice (the rule and its call site), and `Prepare the job briefing` once with `Analyze the text` nowhere. Verified by extracting `assets/Sukinnect.html` out of the APK itself with `unzip` and comparing that, not the staged copy. Compared with `cmp`, not with a hash: `.gitattributes` normalises line endings, so a hash match is the wrong question for a text file here |
| The seven category PNGs inside the APK | `cmp` says identical to `assets/category-art/*.png`, and they sit at `assets/assets/category-art/` because the WebView root mirrors the repo root |
| The four Atkinson weights inside the APK | `cmp` says identical, and `unzip -v` says **Stored** — `noCompress 'woff2'` is doing its job |
| Every path the bundled page asks for | `check-assets.cjs --apk`: **48 of 48 resolve** |
| The bundled page, painted | `tools/shot.cjs --file=<the staged assets copy> --width=360 --height=640 --measure` re-run against the staged `.17` copy: **62 screens**, every tally zero — no clipped text from the reworded concierge button, no unnamed control, no image without pixels, no console errors — the newest is `admin-audit`, reached by clicking the dashboard row a person clicks, because the audit log had never been photographed and its timestamps are exactly what only a screenshot can confirm. Every tally 0: tap floor, contrast, clipped, off-scale, text below the 14px floor, under-nav, unnamed controls, occlusion, moving artwork, no-pixels images, horizontal overflow, chart labels outside their own box. 9 painted font sizes all ≥14px, and **no console errors**. Run it against the staged copy, which the row above proves is the copy inside the APK: run against a lone extracted file it reports 72 broken images that do not exist in the artifact, because the page resolves `assets/` and `avatars/` beside itself |
| Scratch left behind | none — the capture directories this pass wrote were deleted. The only tracked edits are `tools/shot.cjs` (the `--file=` flag) and this file |

**The bench build is `.19` and the repository has moved past it — deliberately.** Since that APK was
cut, three more page changes landed, none of them device-facing: the verification queue's day count
(now counted in calendar days), the money guard plus the five number fields' lower bound, and the
empty branch on the verification queue. `Sukinnect-Android/app/src/main/assets/Sukinnect.html` is
therefore stale against `Sukinnect-next.html`, and no APK carries these three. That is recorded here
rather than papered over by bumping to `.20` now, because a version number that has never met a
device is exactly the drift this file keeps documenting — and the phone dropped its USB
authorisation mid-session. **When the handset returns: sync the asset, build `.20`, install, and work
down §3f in the same session**, so one build is cut and one build is verified. The three changes are
each proved in headless Chrome — a timezone override, a probe that types through the same edit path a
keystroke uses, and `admin-verifiers-empty` in the camera's walk — so nothing here is a fix nobody
has run; what is missing is a thumb.

**Three build notes from 2026-10-10/11/12, all learned the hard way.** Rebuilding replaces the
previous debug APK in place — `Sukinnect-1.1-debug.apk` and then `Sukinnect-1.2-preview-debug.apk`
were each removed by the next build, so a bench that wants two builds side by side has to copy the
first one out before making the second. And `:app:packageDebug` has now failed **three times** on
`app/build/intermediates/incremental/packageDebug/tmp/debug/zip-cache`, twice with no Java process
running and once (2026-10-12, the `.10` build) with a live Gradle daemon that `--stop` released
without the build recovering. The error is always the same — `Cannot snapshot …\zip-cache\javaResources0:
not a regular file` — and the file is a two-byte `[]`, which is what an OneDrive dehydrated
placeholder looks like to Gradle; this whole tree lives under `OneDrive\Desktop`. **If that error
appears it is build scratch, not the project: `rm -rf` that one `zip-cache` path and rebuild.** That
worked on all three occasions, in five seconds, and nothing else needed touching. Keeping the
project outside a synced folder would remove the cause entirely.

**This build resets the phone's stored demo state.** `SCHEMA_VERSION` went 12 → 13 when
credentials and verification became records, and a snapshot from 12 has no `verification` on any
provider — so the app discards it and reseeds. If you had been part-way through a booking on the
old build, it will not be there. That is expected, not a storage bug; note it in the report only if
the app *keeps* resetting after you have made something on this build.

### 3b. Credentials and verification — 3 min, new since the trust pass

These three screens are the reason the pass exists. They used to assert document states nothing
recorded, and the admin's numbers for a provider disagreed with that provider's own screen.

- [ ] **Provider → Profile → Credentials.** It must list the documents on file with their issuer
      and expiry, and each status must be consistent with the day it is read: Ramil's Barangay
      Clearance and Police Clearance should be **Expiring soon**, his two TESDA/association
      certificates **Valid** ("does not expire"). Nothing may say "NBI Clearance" for this
      provider — that document belongs to the cleaner, not the plumber. Tap each row and check the
      date arithmetic is the same on the phone as in the header.
- [ ] **The verified date.** The header reads "Verified Mar 14, 2026 by admin:raquel". If your
      phone shows **Mar 13**, the date-shift fix did not survive the device's locale — that is a
      real finding, because it was found once already on a desktop browser and every number
      around it looked correct.
- [ ] **Admin → Providers → a verified provider → Performance, then Account.** Completion and
      cancellation must be the same figures that provider sees on its own profile, not the numbers
      the old typed table carried (the plumber used to be shown as 96% / 4% to the admin and 50% /
      50% to itself). "Needs a look" must list reasons — an open case, a document expiring, a
      suspended account — and never a bare verdict like "Normal" or "Monitor".
- [ ] **Admin → Account → Active Sessions and Login Activity.** Both must say plainly that the
      prototype keeps no record, rather than naming a second device or a failed login. If either
      lists a session, that is a fabricated security claim back in the UI.

### 3c. The controls this build added — 3 min, new since the profile-honesty pass

Three surfaces changed on the way to the phone that no desktop instrument can settle, because a
browser renders a `<select>` and a `<input>` the way Chrome wants to, not the way a handset does.

- [ ] **Resident → Profile → Payment → Change method.** This sheet is new: it used to answer the
      button with "Changes saved successfully" and change nothing. It now shows a picker over the
      two methods on the record. On Android that is a native dialog — check it opens, that both
      options are listed, that picking one and tapping **Save method** leaves the card above reading
      the method you chose, and that it **is still that method after you close and reopen the app**
      (it writes `preferredPayment`, which the Store persists). A picker that closes without
      selecting anything must not overwrite the current method.
- [ ] **Provider → Profile → Payout & Earnings → Manage Payout.** The sheet now holds a real text
      field prefilled with the account on the record. Type into it with the keyboard up: the field
      must stay visible and the **Save payout account** button must not end up under the keyboard
      (§2's rule, on a control that has never been on a phone before). Save a change, then check the
      card behind it, the row in the profile list, and the Payout line inside **Edit Professional
      Profile** all read the new value — they were four separate literals until this build. Sign in
      as the fruit buyer (**`erning@demo.ph`** — the second of the two provider accounts in
      `PROVIDER_DEMO_ACCOUNTS`) and confirm the payout shown is
      **0917***8102**, not the plumber's number the literals carried for every provider.
- [ ] **Every modal's close.** The `×` that closes a profile modal measured 24×25px and is 44×44 now.
      It is transparent, so it looks identical — the test is whether you can hit it one-handed at
      the top-right of the sheet, with the sheet still open underneath. Tap it and confirm you land
      back on the section you came from, not on the profile list.

### 3d. The verification queue — 4 min, new since the records build

The admin's review screen was rebuilt on records in `.8`: one applicant record, per-person document
rows, and decisions that persist. On a phone the thing to test is not the arithmetic but whether the
queue behaves like a queue under the conditions a bench has no equivalent for — a thumb, a back
gesture, and an app killed mid-review.

- [ ] **Open verification on Maria Santos.** The header must read `Application LS-PV-0024`, the
      progress **3 of 4**, and the four rows must be Government ID, NBI Clearance (Not submitted),
      Barangay Clearance and Service qualification — with **her** electrical NC II, not a certificate
      belonging to somebody else. If the screen shows five documents, or a TESDA row that matches
      another applicant's trade, the records did not reach the build.
- [ ] **Approval is unavailable while NBI Clearance is outstanding.** That sentence has to be
      visible **above** the three buttons, not below them or off the bottom of the screen — it was
      painted under the sticky bar first and nobody saw it until a screenshot did. Tap the dimmed
      Approve anyway: nothing should happen, and nothing should be recorded.
- [ ] **Request update → Record request, then leave the screen and come back.** The row must now
      read as requested, the queue pill should say `1 document requested`, and the activity list
      should carry the entry **stamped with the time you actually pressed the button** — compare it
      with the phone's clock. A `Sep 9, 2:45 PM` on any entry means a typed timestamp came back.
- [ ] **Approve Joel Aquino** (all four filed). He must leave the pending queue, the dashboard's
      pending count must fall by one, and reopening the app must **not** put him back. Then
      `Reopen this application` and confirm he returns.
- [ ] **The Decided tab.** After approving Joel he must appear there — name, the decision, and the
      date **with** the time (`Oct 11, 2026 8:19 PM by …`, not a bare time), and `Open the decision`
      must take you to the review showing that entry in its activity list. All four tab labels have
      to be readable without the selected one being cut off at the right edge; on a 360px-wide device
      it was, and the instrument reported nothing because the rail scrolls.
- [ ] **Kill the app while a review modal is open** and reopen it. The decision list should show
      only what was actually recorded; a note typed into the box and never saved must not appear,
      and a saved note must. Notes are per applicant now — open Liza Ramos and confirm none of
      Maria's notes or status is painted on her.

### 3e. What this build changed — 5 min, new since the deck audit

- [ ] **A dialog opened from a sheet must answer its own buttons.** Resident → Profile → Payment →
      `Change method`. The "Change payment method" card used to paint *under* the sheet's scrim:
      dimmed, and every tap inside it closed the sheet instead. Tap **Save method** and confirm the
      method changes and the sheet stays. Repeat for provider → Payout and admin → Security.
- [ ] **The refusal notice.** `SCHEMA_VERSION` went 14 → 15, so the first launch on a handset that
      already holds records will show an amber banner at the top of the screen saying the saved
      session was refused and naming why. That is the notice doing its job, not a crash. It must be
      dismissable, and it must not cover the search field or the bottom navigation.
- [ ] **Reputation moves.** Complete a job, rate it 1 star, then open that provider's public card.
      The average must shift (a 5.0 over 59 sample ratings becomes 4.9 — a small move is correct,
      that is what an average is) and the reputation panel must state how many ratings came from
      **this device**. Kill the app and reopen: the figure must not move again.
- [ ] **Coverage is what you are found by.** Provider → Profile → Service area: the list must be
      that provider's own barangays with the base marked, not three names every provider shares.
      Then, as a resident, filter Find Services to a barangay the signed-in provider serves but
      does not live in — they must still appear. Filter to one they never declared — they must not.
- [ ] **Mark myself busy.** Provider → the opportunity card. After marking busy, a resident
      searching that trade must be shown someone else, and `Mark myself available` must bring them
      back. Before this build the only control went available, so the promise in its toast could not
      be tested either way.
- [ ] **The administrator's provider profile.** Open a provider who has **no** job on this device:
      the Activity tab must say so plainly rather than listing four September events. Open one whose
      credential expires soon: the Credentials tab must name each document from the record and show
      its real state — no green "Verified" for a document nothing verified.

### 3f. What .12 and .13 changed — 6 min, new since the identity pass

- [ ] **The concierge refuses to guess.** Resident → AI Service Concierge → type something with
      no trade in it (`The garden gate hinge is loose`) → Analyze. It must say the words did not
      sort, and offer nothing else. Then attach **a photo with no words at all** and Analyze:
      before this build both cases were filed under plumbing and the screen said so in a toast.
      Nothing may appear that looks like a diagnosis.
- [ ] **A thread stays with its pair.** Open a chat from a booking, read it, kill the app, reopen,
      go to Messages → the same conversation. Then open a *different* customer's thread as the
      provider and confirm the header names that customer and the messages are theirs — the room
      used to fill an empty counterpart from the first provider on the roster.
- [ ] **What the sheet marks is what the booking records.** Book one provider choosing Cash on
      arrival, then open a second provider and book again: the payment row that is marked must be
      the one the confirmation and the booking show. A draft carried between providers used to
      price and record the first option while appearing to select another.
- [ ] **A request cannot be booked to nowhere.** Resident → Profile → edit the address
      field: it must not be clearable to nothing. Then, on an account genuinely left with no
      address, open Book on any provider: the service-address block must say there is nothing
      to choose and the send must refuse — the old code stored `address: undefined` and the
      provider saw a visit with no door. `.13` also clamps a stale day/time choice, so a
      sheet that used to simply fail to appear now opens with a real row marked.
- [ ] **The refusal notice, on a bad profile.** `SCHEMA_VERSION` is 16, so a handset holding a
      v15 dump is expected to show the amber notice on first launch — that is the notice working,
      not a fault. What the check is really for: a stored profile whose field arrived as the wrong
      kind of value, or carrying a field the app never had, is refused at the door with the field
      **named** — so read what it names rather than assuming it is only the schema bump.
- [ ] **A reload keeps what it promised.** Type a chat message on a job, add a household
      item under Profile → Home, switch a notification off, then kill the app and reopen.
      All three must still be there — until `.15` none of them were written to storage at
      all, and the portfolio button stored nothing while printing "Changes saved
      successfully." Then edit the provider profile (phone or rate), save, reload: the
      number you typed must be on the card, not the demo seed.
- [ ] **The audit log tells the truth about when.** Admin → Dashboard → Audit log. Take two
      actions, then open it: the rows must carry different, plausible times, not one shared
      stamp, and the name on them must be the administrator who acted.
- [ ] **The console says what it does not do.** Admin → Dashboard → the card naming what is not
      managed here, and Categories → the line saying the catalogue is read-only. It is disclosure
      for slide 8, not decoration: judge whether it reads as information about the tool rather
      than as an error. A chart's axis is HTML beside the drawing now — on this phone (~450 CSS px)
      the labels should sit clear of the card edge; the narrow case was measured at 320px, which
      this device cannot show.
- [ ] **The support "Call" button dials.** Resident → the card offering a phone number, and the
      same control on the provider's side: both are `<a href="tel:+639170001122">`, and until
      today the shell handed no scheme to the system — the default `WebViewClient` treats `tel:`
      as a URL, fails it with `ERR_UNKNOWN_URL_SCHEME`, and **replaces the running app with a
      system error page**. `MainActivity` now routes anything that is not http/https/file/data/
      about/blob to an Intent (`ACTION_DIAL` for `tel:`, never `ACTION_CALL`, because dialling
      needs no permission and placing a call does). On the handset: the dialer must open
      pre-filled, returning must land on the same screen with no error page, and if no app can
      take the scheme the page must simply stay as it is. This is fixed in the shell and
      **compiled** (`javac` against `android-36`, clean but for the expected deprecation note on
      the `String` overload kept as a backstop); it has not run on a device, and it reaches one
      only in a new build.

#### What the handset answered — walked 2026-10-15 on a vivo 1906, `preview.17`, then re-walked on `.18`

- [x] **The support "Call" button dials.** Passed. The dialer
      (`com.android.dialer/.TwelveKeyDialer`) opened with `+63 917 000 1122` pre-filled, and
      returning landed on the same Booking details screen with no error page.
- [x] **A reload keeps what it promised.** Passed. A typed chat message survived
      `am force-stop` and a relaunch and appeared in Messages with its own timestamp.
- [x] **The audit log tells the truth about when.** Passed. Saving the admin profile wrote
      `Admin profile updated` against `Master Administrator` stamped **Oct 15, 2026 - 3:17 PM**
      while `adb shell date` read `15:18` — a real instant, not the `Sep 10, 2026 / 2:42 PM`
      every row used to carry. Opening the log before any action says
      "No administrator action has been recorded on this device", which is the honest empty.
- [x] **The console says what it does not do.** Passed. The admin Account rows read
      "Not stored on this device", "This device only", "Nothing is recorded here" at ~450 CSS px
      with nothing clipped.
- [x] **The payment picker works.** Passed, and it is where the two defects below came from.
      The native Android radio dialog opened with both methods and the current one marked;
      choosing Cash on Arrival and tapping **Save method** left the card above reading it, and
      force-stop + relaunch + re-login still read it.
- [ ] **The concierge refuses to guess**, **a thread stays with its pair**, **what the sheet
      marks is what the booking records**, **a request cannot be booked to nowhere**, **the
      refusal notice on a bad profile** (no v15 dump exists to produce it), and the provider
      half of the reload check: **not walked.** The two defects below came out of the four
      items that were, so the remaining five are still the highest-value part of this file.

**Two defects, and neither one is visible to a screen.** They are recorded at length in
`CHANGES.md` §52; what belongs here is the instrument that produced them, because it is not in
`tools/` and no bench run will ever produce it again: `adb shell uiautomator dump`, which is the
system accessibility tree rather than the DOM.

- Back from the resident's "Edit profile" form **quit Sukinnect to the launcher**
  (`mCurrentFocus` → `com.bbk.launcher2`). On the admin's equivalent form the same press closed
  the modal and stayed in the app — the positive control that made the difference diagnosable.
- With the Payment Methods sheet open and the picker painted above it, the dump listed the
  sheet's nodes and **never the picker's**: no "Change payment method", no "Save method". After
  the fix the same walk lists both layers in one tree.

Two cautions this walk earned, both about reading the instrument rather than the app. An empty
dump on the sign-in screen is **not** a finding — Chromium builds its accessibility tree lazily,
and one tap on a field populated every node; the same was nearly concluded twice. And a password
field whose dump line reads `text="demo1234"` is not leaking anything: the same node carries
`password="true"`, which is what a screen reader honours. Read the flag before the string.

## A second handset — OPPO CPH2179, measured across the midnight that cut preview.20, and why it matters

Every figure above belongs to the vivo 1906. A second phone was connected to run `preview.20` on,
and it is a **better instrument for two of the cases this file has kept calling untestable** — so
they are recorded here even though the pass never ran, because the reason it did not run is itself
the finding.

| | Measured off the device |
|---|---|
| Identity | `ro.product.brand` **OPPO**, `ro.product.model` **CPH2179**, serial `S4CUYTJB6HNNWC49` |
| Android | **10**, `ro.build.version.sdk` **29** |
| Panel | `wm size` → `Physical size: 720x1600` |
| Density | `wm density` → physical **320**, **`Override density: 360`** |
| CSS viewport | **720 × 160 ÷ 360 ≈ 320 CSS px** — computed, and it is the narrow case |
| System theme | `settings get secure ui_night_mode` → **`2` = UI_MODE_NIGHT_YES**, the device is in **dark mode** |
| App state | `pm list packages com.sukinnect.app` → **empty. Nothing installed, no store, no dump** |

**Two surfaces the vivo could not reach.** At ~320 CSS px this is the narrow layout every clipping
case was tuned against and the vivo at 450 never exercised — including the provider tab rail that
clipped its fourth label mid-word at 360px. And `ui_night_mode=2` makes it the first phone here in
dark mode, which is the one configuration where Chrome's Auto Dark Theme could rewrite the §30
palette; the bench could only measure the media-query half of that and rule the WebView out from
`Theme.Material.Light.NoActionBar`, so a real dark handset is the missing evidence.

**Android 10 does not unlock the edge-to-edge question.** `targetSdk 36` forces edge-to-edge at
API 35+, and this device is API 29 — so that item stays open on both phones, not just the vivo.

**Why the pass did not run, in the order it failed.**

1. **`/data` is full.** `df` reports 50,132,664 KB total, 49,545,480 used, **439,728 KB available —
   100% used, 0.87% free** — and `adb install` failed with
   `android.os.ParcelableException: java.io.IOException: Requested internal only, but not enough
   space` from `PackageInstallerService.createSession`. The APK is 2,132,502 bytes; the refusal is
   the installer's low-storage threshold, not the size of the file. Freeing space is the owner's
   call — it is their photos and apps on that partition, and deleting them from here would be
   destroying someone's data to make a test pass.
2. **The connection would not hold.** Four drops in ten minutes, `transport_id` changing on each
   (12 → 14 → gone), the device alternating `unauthorized` → `device` → absent, and `pnputil`
   seeing no Android device while it was off the bus. Typical of a phone whose ADB daemon is killed
   when the screen sleeps, or a cable carrying power but not data reliably.

**What is already done for it, so the next attempt starts at the install.** `preview.20` is built
and verified at the artifact level: `versionCode 22`, 2,132,502 bytes, `aapt dump badging` agrees,
`assets/Sukinnect.html` extracted out of the APK is `cmp`-identical to `Sukinnect-next.html` at
**803,487 bytes**, `check-assets --apk` resolves every path the page asks for, and grepping the
shipped page proves which bytes are in there — `a price cannot be negative` 1, `No applications are
waiting` 1, `daysBetween` 2, `modalAboveSheet` 2, and `Analyze the text` **0**. That is the first
build carrying the accessibility-tree fix, the calendar-day wait count, the money guard and the
empty verification queue, and **no device had run any of them until the section below.**

### What has since run on it — 2026-10-17

The owner cleared the storage and `.20` installed: `versionCode=22`, `targetSdk 36`, on WebView
**148.0.7778.120**.

- **Dark mode, observed rather than inferred.** The system is in night mode and the app renders
  **fully light** — white card, pale lavender field, navy text, brand-gradient CTA, official logo
  intact. That is the first real observation of the case the bench could only rule out from
  `Theme.Material.Light.NoActionBar`: the shell's fixed Light theme does keep Chrome's Auto Dark
  Theme off the palette on a dark handset.
- **The narrow layout is clean.** At ~320 CSS px the sign-in role toggle was measured, not eyeballed:
  `Resident` right edge 158, `Service Pro` right edge 280 inside a parent ending at 283,
  `scrollWidth == clientWidth == 246`, `overflow: false`. It had looked clipped in a downscaled
  screenshot and was not — the third time in this pass an instrument corrected an assumption.
- **The accessibility-tree fix holds on a second, different device.** With the Payment Methods sheet
  open and the picker painted above it, the platform tree lists **both** layers — `Payment Methods`,
  `Close Payment Methods`, `Change payment method`, `Preferred payment method`, `Save method` — and
  the sheet's `aria-modal` reads `false` from inside the real page.
- **Three instrument traps, all false alarms, all worth keeping.** (1) `uiautomator dump` reports the
  **active window only** — with the native select popup open it returns just its two rows, which looks
  like the app's tree collapsed. (2) The WebView's tree is built **lazily**: an early dump returned
  2 KB and zero text nodes, and the same tree returned 20 KB and 30 nodes a few seconds and one tap
  later. `accessibility_enabled` was already `1`, and ColorOS refuses `WRITE_SECURE_SETTINGS` from
  shell, so the fix is patience, not configuration. (3) A probe that sets `state.tab` without setting
  `state.view` leaves the app on the **sign-in** screen and then reports a modal missing from a DOM
  that was never painted — `residentProfileHub()` returned the modal while `#screen` began
  `<div class="auth-screen">`. The same trap the camera documents for setup scripts, now on device.

**`tools/device-probe.cjs` is new, and it is why any of that was answerable.** It forwards to the
WebView's DevTools socket and evaluates an expression in the page running on the phone, with no npm
dependencies — a hand-rolled WebSocket client, the same approach `shot.cjs` uses for Chrome. Before
this, `tools/` could measure headless Chrome and the platform tree but could never ask a shipping
WebView what it decided, so a disagreement between two phones was not resolvable by measurement. It
needs `WebView.setWebContentsDebuggingEnabled(true)` in the shell, gated on `FLAG_DEBUGGABLE` so a
release build never exposes an inspector. Two bugs found on the way there: Chrome's DevTools endpoint
rejects `Host: localhost`, and its `Content-Length` counts **bytes** while the page title carries an
em dash, so comparing it against a character count reads as a timeout on a socket that was answering
perfectly well.


Because nothing is installed on this phone, it is also the cleanest persistence fixture available:
no store, no dump, no leftover session — the write-claims and reload checks start from a genuinely
first-run state rather than from whatever the vivo accumulated.

The vivo 1906 renders at **~450 CSS px** (720px
panel at `Override density: 256`), so it does not exercise the narrow-device tab-rail case, and
being Android 11 it cannot exercise the `targetSdk 36` edge-to-edge behaviour at all. The OPPO
above reaches neither either — Android 10, so edge-to-edge stays closed on both handsets — but at
~320 CSS px it is the first device here that would exercise the narrow layout, and it is the first
in system dark mode, which is one of the reasons the storage block above is worth clearing.

The painted-page row is what the `--file=` flag added to `tools/shot.cjs` exists for. The
camera could previously photograph only `Sukinnect-next.html` at the repo root, where
`assets/category-art/plumbing.png` resolves one level deep. Inside the APK the same page resolves
it against `file:///android_asset/`, one level *deeper*. A pass over the repo source could not have
seen a bundle with every image in the wrong place — which is precisely the bug this build was
exposed to, and it is now measured rather than reasoned about.

**`reicon.js` is no longer in the bundle, and the APK halved.** It was 8,344,694 bytes on disk,
2,490,872 compressed — **54% of the file an install pulled down** — and the bundled page never
loaded it: the rebuild draws 43 inline glyphs and the only mention of reicon in the page is a
comment. Removing it took the debug APK from 4,595,092 bytes to **2,104,798**. It was moved to
`Sukinnect-Android/web-assets-offline/reicon.js`, outside `app/src/main/assets` so it cannot be
packaged, and it is **not deleted** — the shipped `Sukinnect.html` still loads the library, so
putting it back is one `mv` before building that file. The four unreferenced Fraunces woff2
(253,384 bytes) were left alone: same reasoning, smaller prize.

**targetSdk went from 34 to 36, and that is the riskiest change in this build.** Play requires
the current API level for new submissions and updates, and as of 2026-08-31 that is 36. The
consequence is behavioural, not cosmetic: at targetSdk 35+ the window is drawn **edge to edge**
and `setStatusBarColor` / `setNavigationBarColor` stop doing anything, so `MainActivity` now
pads the WebView from the system-bar insets instead of painting the bars. `ime()` is included in
those pads deliberately, because `adjustResize` is what kept the chat and the booking sheet above
the keyboard at 34 and that guarantee is not carried forward automatically. **None of this has
run on a device — it compiles, and that is the whole of the evidence.** Section 2 below is now
the most important part of this checklist.

**Everything changed in the untracked project, since `git` will not show any of it.** All of it
lives inside `Sukinnect-Android/`, which is gitignored by the owner's decision, so this list is
the only record.

1. `app/src/main/assets/` re-synced: `Sukinnect.html` ← the current rebuild; seven PNGs into the
   new `assets/category-art/`; four `font-atkinson-next-*.woff2` plus `ATKINSON-OFL.txt` and
   `ATKINSON-AUTHORS.txt` into `fonts/` (the OFL text travels with the fonts it licences);
   `fonts/fonts.css` replaced. Nothing was deleted — the old Fraunces and Jakarta weights are
   still there.
2. The two files that were overwritten on 2026-10-10 are in
   `Sukinnect-Android/web-assets-backup-20261010/`, outside `app/src/main/assets` so they cannot
   be packaged: `Sukinnect.html` (719,156 bytes — the 2026-10-09 sync of the rebuild, which is
   what the Oct-9 APK carried) and `fonts/fonts.css` (the Fraunces-era sheet, which is what was
   there before the type pass — `grep -c Atkinson` returns 0). To put that state back:
   `cp -r Sukinnect-Android/web-assets-backup-20261010/. Sukinnect-Android/app/src/main/assets/`
   — verified to lay down exactly those two paths. It does **not** restore a shipped-prototype
   bundle; for that, copy the repo's `Sukinnect.html` over instead.
3. `app/src/main/assets/reicon.js` **moved out** to
   `Sukinnect-Android/web-assets-offline/reicon.js` on 2026-10-11, so it is no longer packaged.
   To build the shipped prototype again: `mv Sukinnect-Android/web-assets-offline/reicon.js
   Sukinnect-Android/app/src/main/assets/reicon.js`.
4. `app/build.gradle`: `versionCode` 2 → 8 → 9 → 10 → 11 → **12**, `versionName` '1.1' →
   '1.2-preview.6' → '.7' → '.8' → '.9' → **'.10'**, **`targetSdk` 34 → 36**. The `.10` build is
   the one where `providerBookingDetail()` and the admin's provider profile stop substituting the
   first record in the list for an id they do not hold.
5. `app/src/debug/res/values/app.xml`: new, debug-only `app_name` = "Sukinnect · preview".
6. `MainActivity.java`: `applySystemBarInsets()` added, plus the `Build` and `WindowInsets`
   imports. This is the edge-to-edge compensation for item 4 and it is **device-unverified**.
7. `gradlew`, `gradlew.bat`, `gradle/wrapper/`: new, generated 2026-10-11.
8. `tools/check-assets.cjs`, `tools/falsify-assets.cjs`: new. Both are about the artifact rather
   than the page, which is why they live here and not in `tools/` at the repo root.

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
| §2 — does the submit button disappear under the keyboard? | **[settled, page-side, and now proved app-wide]** the whole 62-screen walk was run at keyboard height (360×380): no control sits under the bottom nav, no text is clipped, nothing paints over an open modal, no field is unnameable, no console error, no horizontal overflow — and the mode is real, not a re-labelled default run, because the PNGs measure 720×760 and the same screen scrolls 1,065px there against 543px at 390×844. The older seven-sheet figure — each shrinks to 304px with its action row flush to the bottom edge — was taken when the table held 46 screens and is not re-quoted as current. `windowSoftInputMode="adjustResize"` is set in the manifest, so the WebView gives that height up rather than panning. What the pad *feels* like arriving is still yours. |
| §2 / §5 — does typing cost you the field? | **[settled, and fixed]** one field did this: the admin's search on verified providers called `render()` on every keystroke, which detached the input and dropped focus. `render()` now restores focus and the caret position the same way it already restores scroll. Proven both ways: with the fix the field keeps focus, without it it does not. The table has since grown to 62 screens; the keyboard-height walk reports zero unnameable fields, no clipped text and no console errors across all of them. Focus retention is measured over the whole population, not a sample of it: `probe-caret.js` used to type into only the first four fields per screen, and its "47 fields, zero focus loss" was being read as the app's entire input surface, while `node tools/shot.cjs --probe=@tools/probe-field-population.js` counts **69 visible fields across the 62 screens** (25 `number`, 21 `text`, 16 `textarea`, 3 `checkbox`, 2 `password`, 2 `file`). The cap is gone; the uncapped walk covers exactly that population and still reports **69 typed into, none losing focus, none erroring, none left unrestored**. |
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

**Read this first if you only do one section.** This build moved `targetSdk` from 34 to 36, and at
35+ the window is drawn edge to edge: the two `setStatusBarColor` calls in the shell are now no-ops
and `MainActivity` pads the WebView from the system-bar insets instead, `ime()` included. That is
the mechanism that keeps the keyboard from covering anything, and it has never run on a phone. If
the header sits under the status bar, or the send button hides behind the keyboard, that is this
change and nothing else — and it is worth reporting even if it looks like a small visual thing,
because it decides whether the targetSdk bump can stay.

- [ ] **The status bar.** On the very first screen: is the app's own header fully below the
      phone's clock and battery icons, with no text under them? Same check at the bottom — the
      Home / Bookings / Messages / Profile bar should sit above the gesture pill, not under it.
- [ ] **Then with the keyboard open.** Tap a field. Does the header stay clear of the status bar
      *while* the keyboard is up? Padding the WebView with the IME inset can fight `adjustResize`
      and produce double spacing, a header that jumps, or a screen that shrinks twice.
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

### Second-handset walk, 2026-10-17 — what got settled and what did not

**Settled on the OPPO, by reading the screen or the page:**

- **§22 holds on hardware.** The resident's active-booking card shows **"Stage 5 of 6: In progress"**
  and **"Pending (Cash on Arrival)"** as two separate pills — booking lifecycle and payment lifecycle
  are not merged, on a real phone, not just in the gate.
- **§26 holds.** The Messages list is booking-contextual: each row names the provider, the trade, the
  barangay and the last message, with `All 7` / `Unread 5` filters — not a social feed.
- **§75's wording is right on the device.** The concierge carries *"Describe the problem or attach a
  photo. This…"* and its action reads **"Prepare the job briefing"** — confirmed on a second phone
  after the label change.
- **Storage works on this phone even with `/data` at 100%.** The empty `localStorage` looked like the
  full-disk case the storage-truth pass was built for, and it was not: a raw write succeeded, read
  back, `persist()` returned `true`, and two keys were present afterwards. The inference was wrong and
  the measurement caught it before it was written down.
- **A mid-session reload returned the app to sign-in, which is correct** — no destination is
  persisted, so a process kill is honest rather than confusing. Not a defect.

**Not settled — the five §3f items remain un-walked** (concierge refusing to guess, thread pairing
across a kill/reopen, the sheet's marked payment row against the booking record, booking with no
address, the provider reload check). The concierge test got as far as typing *"The garden gate hinge
is loose"* through the real edit path and clicking the painted **Prepare the job briefing** button,
which reported `clicked: true`; the answer was never read, because the page reloaded in between. The
blocker is the harness, not the app: on this device `adb shell input text` inserts `%20` **literally**
(`%s` is the working escape), the soft keyboard compresses the layout and pushes the submit button
under the nav bar so a remembered coordinate taps **Messages** instead, and a synthetic `.click()` on
the sign-in button does not sign in. Each is solvable; none was worth more of this session.

**The real finding from the phone is not on that list:** the app ignores the device's text-size
setting. Measured — `font_scale = 1.35`, the root font computes to `21.6px`, and painted text stays
`14px` because every type token is a hard `px` and no `text-size-adjust` exists. Decided on the spot:
convert the tokens to `rem` with the multiplier capped, and fix the top bar to absorb larger text —
a live `rem` conversion on the phone showed both the benefit (text 35% bigger, readable) and the cost
("Resident Profile" wrapped to two lines and "Log Out" ballooned into a square). Tracked as the type
task; it also closes the long-open `px` vs `rem` owner decision.
### §3f attempt on the vivo, 2026-10-17 — blocked by my own harness, not by the app

The phone came back unlocked and `preview.22` was already installed. The walk reached the resident
Edit-profile form with the Home Address field on screen and cleared it with 40 `KEYCODE_DEL`
presses. Then it was gone: the page was back at sign-in and `state` was all defaults.

**The reload was caused by the test, not the application.** To get the keyboard out of the way the
harness sent `KEYCODE_BACK`. If the IME has already closed, that same key goes to the app instead —
and the app's Back handling is correct, so it finished the activity and the next launch starts at
sign-in. Three separate "the app reloaded mid-session" observations in this pass were all this same
sequence. Recorded here because the alternative — reporting that the WebView recreates during form
entry — would have been a fabricated defect, and because the fix belongs in the harness: dismiss the
keyboard with `KEYCODE_ESCAPE` or by tapping outside the field, never with `BACK`.

What that leaves unverified is unchanged: the five §3f items — concierge refusing to guess, thread
pairing across a kill/reopen, the sheet's marked payment row against the booking record, booking with
no address, and the provider reload check. The address item got furthest: the field was reached and
cleared, and whether the save refuses is still unknown.

*(Disposition as the later sections record it, none of it claimed for a phone that did not run it: the
payment rail and the provider reload were closed **without** a handset and said so —
`tools/probe-request-payment.js` and `tools/probe-provider-reload.cjs`; walking "booking with no address"
is what surfaced the registration defect §78 fixed; thread pairing was settled on the vivo at
`1.2-preview.28`; and the three genuinely handset-only remnants — the day states, the register greeting
and the real file picker — were read in Handset walks 6 and 7, the last of them by the key route
returning a document whose *name* is all the page kept.)*

One thing the attempt did establish, measured rather than assumed: the vivo reports
`font_scale 1.0`, and at that setting `preview.22` computes a 16px root and paints the same 14px
caption it always did — the rem conversion is a no-op for a user who has not asked for larger text.

### What the text-scale pass owes a handset — recorded 2026-10-17, none of it verifiable on the bench

The chart-axis and flex-crush work (§60 of `CHANGES.md`) was measured with `--font-scale`, which sets
the root font size directly because that is what Chromium on Android produces. Four corners are clean
on the bench: 320px at 200%, default width at 200%, 450px at 135%, and the 100% anchor —
`node tools/sweep-text-scale.cjs`. What a bench cannot answer is whether the *platform* agrees:

1. **Set the phone's font size to its maximum and dump the navigation.** `Settings > Display > Font
   size` to the largest step, then `adb shell uiautomator dump` on Resident Home. The nav labels are
   now ellipsized by CSS at narrow widths (`D… F… B… M… Pr…` at 320px), so the question is what the
   accessibility tree carries for each button: the whole word from the DOM, or the painted tail. The
   camera reads the DOM and cannot tell — this is the same surface that hid the sheet-modality
   defect, and it is the only instrument that answers it. Expect `content-desc` to read "Bookings";
   if it reads "Booki…" the ellipsis has cost a screen-reader user their navigation, and the fix is
   an explicit `aria-label` on every nav item, not a layout change.
2. **Read the root font size on the phone at maximum scale**, through `tools/device-probe.cjs`, and
   confirm it is `16 × scale` and not capped — the cap in `:root` is inert on Android and the claim
   should be re-measured on a device that has the setting at 200%, not at the 1.0 this vivo ships
   with.
3. **Look at the provider dashboard's two charts at maximum scale.** The axis thins itself by the
   measured root size now (12 columns → 2 labels at 200%), which is arithmetic the bench proved and
   a thumb has not: the question is whether two week labels still tell a provider what the period is,
   or whether the chart should say "last 4 weeks" in its subtitle instead.
4. The five §3f items above are still open, and the installed build (`preview.22`) predates this
   pass, so any of them needs a new build first.

### What the short-viewport pass (§61) owes a handset — recorded 2026-10-17

`320x480 @ 200% text` is now measured on the bench and clean across all 63 screens, but every number
behind it comes from Chrome emulating a viewport, and the two Android modes that produce that shape
have behaviours an emulator does not:

1. **Split-screen, for real.** Enter it on the vivo (recents → split icon) and open the booking
   sheet. The WebView's `innerHeight` drops to roughly half the panel, which is what the sweep
   models — but Android also resizes the activity, and the keyboard can arrive inside the half.
   Confirm the sheet's "Send request" is reachable by scrolling the sheet, and that nothing is
   stranded when the divider is dragged back to full height.
2. **Maximum font size, then the same sheet.** The bench sets the root font directly; the phone
   multiplies the used size after CSS resolves. At the largest setting, read `innerHeight` and the
   root font through `tools/device-probe.cjs` so the 480px/200% corner is confirmed to be reachable
   by a real configuration rather than only by a flag.
3. **The top bar now wraps.** On a narrow phone at large text the action drops to a second line, so
   the bar is taller than it was. That is a visible change to every screen's header at that corner —
   look at Resident Home, Notifications, and the resident's profile and confirm the bar reads as a
   design rather than as a broken layout. If it does not, the alternative is truncating the title,
   which this pass tried and took back out for costing the screen its name.

### What the keyboard pass (§62) owes a handset — recorded 2026-10-17

The Tab walk runs in Chrome on this machine. Three of its answers are Chrome's, not the WebView's,
and only the phone can settle them:

1. **`inert` on the WebView's actual build.** The background stops being focusable because Chromium
   honours `inert`, which shipped in WebView 102. Open a booking sheet, attach a keyboard (or use
   TalkBack's explore-by-touch), and confirm Tab cannot reach the screen behind the scrim. If the
   device's WebView is older, the fix silently does nothing and the 91 stops come back.
2. **TalkBack with a layer open.** `inert` should also take the background out of the accessibility
   tree the screen reader reads. `adb shell uiautomator dump` with the booking sheet open, then
   again with the resident's payment picker raised over it — the same pair of dumps that found the
   sheet-modality defect. Expect no nodes from `#screen` while the sheet is up.
3. **The focus ring on a real panel.** The walk asserts that something visible changes for every
   keyboard stop; it cannot say whether a 3px brand-blue outline at `outline-offset:2px` reads on a
   phone at arm's length, or on the dark gradient top bar where the ring is the same hue as the
   surface. Tab through Resident Home, the provider dashboard and the admin console and look.

None of this needs a new build to answer 1 and 2 — the installed `preview.22` predates the `inert`
work, so it needs one. Item 3 can be read off any build that has the ring, which is the one already
installed.

### Handset walk, 2026-10-17/18 — OPPO CPH2179, `1.2-preview.23` then `.24`

The three "owes a handset" lists above were written on 2026-10-17 and answered the same evening and
the next morning. Device: OPPO CPH2179, Android 10, WebView 155, `font_scale 1.35`, laid out at
360 CSS px on a 720px panel. Two builds: `.23` to reproduce, `.24` to verify the fix.

**Settled — the nav labels keep their whole words in the platform tree.** Largest text the phone
offers, Resident Home, `adb shell uiautomator dump` (`.scratch/nav-dump.xml`): the four nav nodes
carry `text="Home"`, `text="Bookings"`, `text="Messages"`, `text="Profile"`. The *photograph* of the
same screen reads `Booki…` and `Mess…`. That is the §68 rule working exactly as designed — the word
gives up its tail so the destination keeps its tap area, and the DOM text, which is what the
accessibility tree is built from, is untouched — and it is the answer the camera could not give,
because the camera reads the DOM and would have reported the same thing either way. No `aria-label`
is needed. This was item 1 of the text-scale list.

**Settled — the root font is uncapped on Android, and the bench models it correctly.** Through
`tools/device-probe.cjs` on the phone at 1.35: computed root `21.6px` = 16 × 1.35, so the
`min(1em, 20px)` cap in `:root` does nothing on a handset, as §68 now says. The new sweep corner
(`--width=360 --font-scale=1.35`) prints `root set to 21.6px -> computed 21.6px`, which is the same
number from the other side. Item 2 of the text-scale list.

**Found and fixed — the phone's Back button quit the app from any drill-in.** This is `CHANGES.md`
§65: the shell asked `WebView.canGoBack()`, which does not count `history.pushState` entries, so the
whole Back machinery was unreachable on hardware while eight gate checks passed it. Verified on `.24`
by three presses: sheet → closes, drill-in → root tab with the app running, root tab → exits.

**Found, not fixed — a layout can be clean and still be unreadable.** `.scratch/back-fixed.png` is
Resident Home after a successful Back, and every hard tally is zero on it. It is also nine lines of
one-word-each for the active booking ("Kitchen / faucet / keeps / leaking" then "Ramil / Odiada · /
Sat, Oct / 17, 2:30 / PM"), because the card is a flex row and the 44px avatar is not negotiable
while the text column is. The bench now reproduces the phone's corner and quantifies it: the
ellipsized-string review line goes **5 → 163** at 360px @ 1.35, and the first examples are the nav
labels. Nothing here is a failure; it is the open owner decision about nav labels at large text, with
a number and a photograph attached instead of a description.

**Still open on a handset:**

1. The provider dashboard's two charts at maximum text — whether two week labels still say what the
   period is, or the subtitle should name it. Item 3 of the text-scale list; needs eyes, not a build.
2. Real split-screen (`adb shell wm size 720x700`) rather than the bench's emulated 480px-tall
   viewport, and the same with the on-screen keyboard up. The short-viewport list's items 1 and 2.
3. Whether the 3px brand-blue focus ring reads on the dark gradient top bar at arm's length. Item 3
   of the keyboard list. Any build answers it.
4. The five §3f items, unchanged, and `inert` on the WebView's own build — answered here in part:
   the dump with a sheet open (`.scratch/sheet-dump.xml`) shows no nodes from `#screen` behind it,
   on WebView 155, which is well past the 102 that shipped `inert`. TalkBack itself was not run.

## `1.2-preview.25` — built 2026-10-18, not yet installed

This tree is untracked, so everything about it has to be written down here or it never existed.

- **What went in:** `CHANGES.md` §65 (the `systemBack()` entry point and the `SukiShell.setBackDepth`
  call the shell reads) and §66 (the `body{ overflow-wrap:anywhere; }` rule). The staged page was
  copied from `Sukinnect-next.html` and proved identical with `cmp` — 818,307 bytes — and then proved
  *again from the artifact*: `unzip -p <apk> assets/Sukinnect.html | cmp - ../../Sukinnect-next.html`
  passes, so the bytes a phone would run are the bytes the bench measured, not the bytes sitting in
  the staging directory.
- **Version:** `versionCode 27`, `versionName '1.2-preview.25'`, read back out of the built file with
  `aapt dump badging` rather than from `build.gradle` — `package: name='com.sukinnect.app'
  versionCode='27' versionName='1.2-preview.25'`. Artifact:
  `app/build/outputs/apk/debug/Sukinnect-1.2-preview.25-debug.apk`, 2,139,506 bytes.
- **A build gotcha worth keeping:** `./gradlew assembleDebug` failed with
  `Could not create service of type FileLockContentionHandler using
  BasicGlobalScopeServices.createFileLockContentionHandler()` — "Unable to start the daemon process" —
  while *no* `java.exe` was running, so it was not a contending daemon. `--no-daemon` built clean in
  the same directory with no other change. The wrapper still reported the failed run as exit 0,
  because the last command in the pipeline succeeded; the only thing that told the truth was
  `gradle exit=1` written from `$?` and the absence of a `.25` APK on disk.
- **Not verified on hardware.** No device was attached when this was built. The two things it carries
  that a bench cannot settle are already on the list above: whether the focus ring reads on the dark
  top bar, and whether the provider charts at maximum text still say what the period is. The §66 rule
  is a CSS change the camera measured on 69 screens, so it needs no new handset claim — but if a
  handset ever shows a long name clipped where the bench does not, that is WebView text measurement
  disagreeing with Chrome, and `tools/probe-long-input.js` is the instrument to point at it.

## `1.2-preview.26` — built 2026-10-18, supersedes `.25` the same day

§67 landed after `.25` was cut, so the staged page changed twice in one session. `.26`
(`versionCode 28`) carries both: the nav now closes an open chat room, and `clearModals()` derives
its fields from `layerKeys()` instead of naming four of them. Verified the same way —
`aapt dump badging` on the built file reads `versionCode='28' versionName='1.2-preview.26'`, and
`unzip -p <apk> assets/Sukinnect.html | cmp - Sukinnect-next.html` passes, so the bytes a handset
would run are the bytes the bench measured. Artifact:
`app/build/outputs/apk/debug/Sukinnect-1.2-preview.26-debug.apk`, 2,140,306 bytes.

`--no-daemon` was used again for the same reason recorded above; the daemon has not started on this
machine since. `.25` is now dead — if a handset is loaded with it, it is one build behind and the
Back-button behaviour on a root tab after a chat will not match the source.

## Handset walk, `1.2-preview.27` on the OPPO CPH2179 — 2026-10-18, installed and measured

`versionCode 29`, installed with `adb install -r -t` and read back with `dumpsys package` rather than
assumed from `build.gradle`. The app was attachable over the DevTools socket the debug build opens, so
every number below is the phone's own answer, not an emulation of it.

**What the device actually is.** `Physical size: 720x1600`, `Physical density: 320`,
`Override density: 360`, `font_scale 1.35`, WebView `155.0.8059.45`. And the measurement that matters:
`window.innerWidth = 320`, `innerHeight = 638`, computed root `21.6px`. **320 CSS px, not 360** —
`Override density` is a density, and 720 ÷ (360/160) = 320. The sweep corner added yesterday under the
label "360 CSS px, the OPPO's own combination" was therefore modelling a width this phone never uses,
and it is now `{ width: 320, height: 638, scale: 1.35 }`. The corrected corner reproduces the handset
to the pixel, which is the check that says the correction was right:

| | device | bench at 320×638 @ 1.35 |
| --- | --- | --- |
| root font | 21.6px | 21.6px |
| `Bookings` label | clipped by 14px | "loses 14px" |
| `Messages` label | clipped by 20px | "loses 20px" |
| `Home`, `Profile` | whole | whole |

**§66 on hardware.** `getComputedStyle(document.body).overflowWrap` answers `anywhere` on the phone.
The rule that stops a 60-character word running off the device is live in the installed build, not
just in the file.

**§67 on hardware, through the real controls.** Messages list → tap a thread card → tap Home in the
bottom navigation:

```
A. messages list   tab=messages isChatOpen=false onRootTab=true  data-root=1 backDepth=0
B. room open       tab=messages isChatOpen=true  onRootTab=false data-root=0 backDepth=1
C. after nav Home  tab=home     isChatOpen=false onRootTab=true  data-root=1 backDepth=0
```

Then one press of the physical Back button (`input keyevent 4`) put
`com.oppo.launcher/.Launcher` in `mCurrentFocus`: **the app exits in one press from a root tab it
reached through a chat.** Before the fix, state C carried `backDepth=1` and the first press spent a
step that did not exist — a Back button that appeared to do nothing.

**§68 on hardware, with a real edit typed.** `admin-profile-name` edited through
`document.execCommand('insertText')` (the path a keystroke takes), saved, then saved again untouched:

```
audit rows: 0 -> edited+save 1 ("Account update") -> untouched save again 1 ("No change to save")
row: {"action":"Admin profile updated","result":"name changed","stamped":true}
```

One edit, one row. The second press wrote nothing and said so.

**Two probe errors found on the way, both worth remembering.** The first device walk reported
`NOT PAINTED: /openChatThread/` — the messages list binds its rows through `data-open-chat-id`, not an
inline `onclick`, so the run silently tested nothing about the chat path while still printing three
plausible-looking lines. And the audit row appeared to hold `detail: "undefined"`, which was the probe
reading a field the record does not have; the field is `result`, and it reads `"name changed"`.
**A device probe that cannot find its control must fail loudly**, which is why the lines now say
`NO CHAT CARD PAINTED` rather than continuing quietly.

**Still open on a handset:** the provider dashboard's two charts at maximum text (does two week labels
still say what the period is); real split-screen via `adb shell wm size` rather than the emulated
480px-tall viewport; the keyboard-open viewport, which nothing here emulates; whether the 3px
brand-blue focus ring reads on the dark gradient top bar at arm's length; TalkBack itself; and the
five §3f items.

### Two device facts that cost a false result each, so they are written down

**A `screencap` taken while the phone is asleep returns a blank image, not an error.** After the
Back-button test exited the app to the launcher the handset dozed, and `exec-out screencap -p`
produced first a 4,590-byte all-white 720×1600 PNG and then a 0-byte file. Neither failed loudly.
`dumpsys power | grep mWakefulness` answering `Asleep` with `isStatusBarKeyguard=true` is the check
that tells a blank surface apart from a blank screen. **Never read a device screenshot without
confirming the display was awake** — a white PNG is exactly what a "the page rendered nothing" finding
would look like.

**`adb shell wm size` is refused on this handset.** Both the set and the reset came back
`SecurityException: Must hold permission android.permission.WRITE_SECURE_SETTINGS` (ColorOS), and the
probe's `innerWidth/innerHeight` were identical before and after — so the "short viewport" reading
that run appeared to produce was the same 320×638 viewport measured twice. The real split-screen and
keyboard-height questions therefore cannot be answered by `wm size` on this device; they need the
physical gesture, or the permission granted over a rooted/wireless-debugging shell. The emulated
`320x480` and `320x300` corners in `tools/sweep-text-scale.cjs` remain the only measurements of that
shape, and they are emulations.

**What the device did answer numerically, with the screen off and the WebView still laying out**
(`document.hidden` was true, which does not stop layout): on the provider dashboard at the phone's own
320×638 and 21.6px root, a walk of every button and link in the screen, the bottom nav and any open
layer found **0 controls unreachable** — none off the viewport, none clipped by a non-scrolling
ancestor. That is the §61 reachability rule confirmed on real hardware rather than emulated, on one
screen; the remaining 71 have the bench number only.

## Handset walk, `1.2-preview.28` on the vivo 1906 — 2026-10-18, installed and measured

**What was cut.** `Sukinnect-next.html` copied into `Sukinnect-Android/app/src/main/assets/Sukinnect.html`
byte-for-byte (832,270 both sides), `versionCode 29 → 30`, `versionName 1.2-preview.27 → .28`, built with
`./gradlew --offline --no-daemon :app:assembleDebug` → `BUILD SUCCESSFUL in 48s`, installed with
`adb install -r -t` → `Success`, and read back from the package rather than trusted from the installer:
`versionCode=30  versionName=1.2-preview.28`. This build is the first on a handset that carries §69 and
§69b — the chart labels, the headroom refusal, and the double-tap guards.

**What the device is, asked of the device.** vivo 1906, Android 11, WebView `154.0.8037.106`,
`font_scale 1.0`, physical `720x1544` with `Override density: 256` → **450 CSS px**, and the page itself
answers `innerWidth 450, innerHeight 889`. The height is the part the bench does not model: the sweep's
450 corner runs at 844. Root font measured **16px at 1.0** and **21.6px at 1.35**, which is §68's
"Android multiplies after CSS resolves" mechanism confirmed on a second handset, and `schema v16` in the
running app.

**§69b verified where it counts.** Signed out through the profile hub's own Log Out and its modal
confirm, signed back in as Service Pro via `#rt-provider` + Log in, opened Dash, and asked the §69
questions inside the phone's WebView (`device-chart-check.js`, line boxes from a `Range`, the top
gridline read off the smallest `y1`, nothing re-derived from the app's arithmetic):

| text | charts | bar numbers painted | colliding pairs | labels outside the box | bars above their gridline |
| --- | --- | --- | --- | --- | --- |
| 1.0 (16px) | 1 | 0 | 0 | 0 | 0 |
| 1.35 (21.6px) | 1 | 0 | 0 | **2** | 0 |

So the collision the OPPO photographed is gone on hardware at both text sizes, and no bar escapes its
scale. Two things the screenshots show that no tally reports, and one the tally caught:

- **The 2px is the gutter, not the font.** `₱200` and `₱400` hang 2px and 3px past the left edge of
  their own chart box at 1.35 on this WebView, while the bench at the same width, same root font and
  same screen reports **0**. `document.fonts` answers `status: loaded`, 16 faces, and
  `check('16px "Atkinson Hyperlegible Next"', '₱') → true`, so the face is not the difference — the
  y-axis gutter is `calc(3.75 * var(--t-body-sm))`, sized against the bench's own text metrics, and the
  device's rendering is a couple of pixels wider. The screenshot shows the ticks flush against the
  card's padding rather than clipped, which is why this is recorded as an owner decision and not
  patched on the strength of a 2px number.
- **The only bar with money in it has no week under it.** The earnings series is eight weeks with one
  non-zero row — the last — and the axis thinning keeps rows 0, 2, 4, 6 at 1.0 and 0, 3, 6 at 1.35.
  Row 7 never survives, so the chart's single fact is the one thing its x-axis does not name. The
  y-axis is deliberately thinned the other way ("counted back from the top so the highest value is
  always named"); the x-axis has no equivalent rule for the peak.
- **At the phone's own default text the chart prints no per-bar numbers at all** — the side-by-side
  budget refuses them at 450 CSS px. The bars, the gridlines and three named ticks remain, so the
  shape is readable, but the sr-only summary is the only place the figures appear, and a sighted
  person never reaches it.

**Device state restored.** `settings put system font_scale 1.0`, read back as `1.0`; the app was left
at its sign-in screen, which is where it starts.

## Handset walk 2 — `1.2-preview.28` at 200% text and in real split-screen, 2026-10-18

**200% text on the device itself.** `settings put system font_scale 2.0`, force-stop, relaunch, sign in
as Service Pro through the painted controls. The WebView answers **root 32px at 450 CSS px**:

- the earnings chart paints **0 bar numbers** and only **2 axis labels — `Aug 24` and `Sep 21`** — while
  its single non-zero bar is the last row. That is §72's finding reproduced on hardware rather than
  emulated: the tallest bar in the chart has no week named under it.
- the bottom navigation loses **`Bookings` 43px, `Messages` 52px, `Profile` 9px**; `Dash` and `FSM` are
  whole. Every item keeps its tap area and the word gives up its tail, which is what §68's rule
  intends — but at the phone's largest text three of five destinations are read from the icon alone.
- **no horizontal overflow**: `document.documentElement.scrollWidth` is 450 against `innerWidth` 450.

**Real split-screen, which the OPPO refused.** `adb shell wm size 720x700` is accepted on this vivo
(`Override size: 720x700`), and the page lays out at **450×362 CSS px** — shorter than the bench's
480px corner, so this is the harsher case. Provider dashboard and the bookings list were measured with
the camera's own two-part reachability rule (outside the viewport *and* nothing in the ancestor chain
scrolls): **0 unreachable controls** on both, the nav rendered whole at 289→362px, and the screenshot
shows the list continuing under it as a scrolling column should. Note *why* the second half mattered
here: `document.scrollHeight` equals the viewport because `#screen` is the scroller, so a
viewport-only check would have called everything below the fold unreachable on a screen that is
fine.

**Device restored.** `wm size reset` (read back: `Physical size: 720x1544`, no override),
`font_scale 1.0` (read back), app relaunched and answering 450×889 at root 16px.

**One instrument lesson.** Mid-walk the handset went `offline` and then `unauthorized` (the RSA dialog
needs a thumb), and every `adb` command issued while it was offline failed *silently in effect*: the
first `settings put system font_scale 2.0` never applied, so the phone stayed at 1.0 while the script
carried on as if it had. A device that is not answering is not a device that has agreed — read the
setting back, as the restore step does.

## §3f item 2 settled — a chat thread across a kill and reopen, `1.2-preview.28` on the vivo

Of the five §3f items the 2026-10-17 walk could not reach, **thread pairing across a kill/reopen** is
the one only a handset can answer, and it passes:

```
signed in as Service Pro → Messages → the Ana Dela Cruz thread (c1 / booking b1)
typed "handset kill check 42" through the page's own input path, clicked Send
    MESSAGES 43 -> 44, last row { thread: "t-c1-p1", from: "provider" }
am force-stop → relaunch → sign in as Service Pro again → Messages → same thread
    MESSAGES.length 44          the marked row survived the kill
    thread "t-c1-p1"            still paired to this counterpart and this booking
    screenShowsIt true          the message paints in the room, not just in the array
    namesAna true               the room is headed by the right person
    list preview: "Ana Dela Cruz 4 minutes ago Client · Brgy…", "Nena Corpuz…", "Boy Ramos…"
```

The message was then removed and `persist()` called, so the handset's storage is back to 43 rows and
`testRowsLeft: 0`.

**Why this walk did not hit the wall that stopped the last one.** The 2026-10-17 attempt lost the page
because it drove the phone's own keyboard and then pressed `KEYCODE_BACK` to dismiss the IME — which
the app correctly reads as Back, and the activity finished. This run never touched the IME: the text
went in through `document.execCommand('insertText')` on the focused field and the Send control was
clicked inside the page, so the keyboard never opened and there was nothing to dismiss. The lesson
stands as written on 2026-10-17 — dismiss an IME with `KEYCODE_ESCAPE` or by tapping outside the
field, never with `BACK` — and the cheaper route is to not summon it.

**Still un-walked from §3f:** the concierge refusing to guess (needs a real file picker, which `adb`
cannot drive without pushing through the system UI), the sheet's marked payment row against the booking
record, booking with no address, and the provider reload check.

## Keyboard-open viewport on the vivo, `1.2-preview.28` — and a correction to the 2026-10-17 note

The bench emulates a keyboard by setting the viewport to 320x300. This is the real thing: the same
handset, its own IME, and the three surfaces §73 names — a search field, a multi-field dialog, and the
chat room's pinned input.

**The keyboard takes 324 CSS px.** Focusing the resident's search field opened the IME and the WebView
resized: `innerHeight` 889 → **565**, `visualViewport.height` 566, and the bottom nav rode up to
492–566 rather than being left under the keys. With the keyboard up, resident Home reports
**0 unreachable controls of 16** under the camera's two-part rule (outside the viewport *and* nothing
in the ancestor chain scrolls).

**The five-field edit dialog: the action starts off-screen and the dialog is a real scroller.** With
the last field (Emergency Contact) focused, that field sits at 505–553 — visible — while **Save Changes
is at 565–609, below the keyboard line**. That is not a §61 unreachable control: the chain above it is
`card modal-card` with `overflow-y:auto` and `scrollHeight 608 > clientHeight 532`, and
`scrollIntoView` brings the button to **490–534, fully visible**. So the app is usable and the browser's
own focus handling keeps the field you are typing in on screen; what is not done is any attempt to keep
the *action* in view while you type. Whether it should is a product call, recorded here rather than
changed.

**The chat room behaves.** Focusing the message input leaves it at 436–480 with **Send visible**, the
nav at 492, and the message list scrolling at `569 > 492` — the pinned-input case §73 asks about.

### The correction

The 2026-10-17 note says to dismiss the keyboard with `KEYCODE_ESCAPE` or by tapping outside the field,
**never with `BACK`**. Measured on this device just now, ESCAPE does nothing: `innerHeight` stayed 565
with the IME up. `KEYCODE_BACK` is what closed it — and while the IME is up, BACK is consumed by the
IME, because the app survived the press exactly where it was (`tab: messages`, `isChatOpen: true`,
`mCurrentFocus` still `MainActivity`).

So the rule is not "ESCAPE instead of BACK". It is: **BACK closes the keyboard only while the keyboard
is there to close.** The 2026-10-17 failure was a BACK that arrived after the IME had already gone, and
the app correctly read it as navigating backwards out of the activity. A harness must not press BACK
blind — read `innerHeight` first: if it is still shrunk, BACK dismisses the IME; if it has already
returned, BACK will be given to the app. That is the same discipline this repository applies everywhere
— check what the surface actually is before sending the key that assumes it.

## Focus rings and the accessibility tree on the vivo, `1.2-preview.28`

The last two obligations from the text-scale and layer passes, both answered on the handset rather
than the bench — the tree because no Node or CDP check can see it, the rings because `el.focus()` never
matches `:focus-visible` and these presses are real `KEYCODE_TAB` events.

**The path, replayed the way a thumb takes it:** profile tab → the Payments row → **Change method**, so
the picker modal sits on top of the payment sheet.

### The tree is the third surface, and it agrees

| state | what `uiautomator dump` contains |
| --- | --- |
| modal over sheet | `Change payment method`, `Preferred payment method`, `Cash on Arrival`, the "no account is linked" line, `Save method` — **5 nodes**. The sheet's own `Payment Methods` heading is **absent**, as is the screen behind (`Home Address`, `Edit Profile`). |
| sheet alone | `Payment Methods`, `Preferred method: Cash on Arrival`, `Change method`, `Close Payment Methods` — **7 nodes**, and the modal's `Save method`/`Change payment method` are **absent**. |

So `modalAboveSheet()` + `inert` does what §64 says it must on a second handset: whichever layer is on
top is the only layer a screen reader can reach, and the positive control runs both ways — the sheet's
nodes *are* there when the sheet is the top layer, so their absence under the modal is a judgement about
the app rather than about a dump that captured nothing.

**One instrument note.** The first dump came back 0 bytes and every probe string read "ABSENT", because
Git Bash rewrote the device path `/sdcard/tree.xml` into `C:/Users/…/Git/sdcard/tree.xml`. The
"everything is missing" verdict measured the shell. `MSYS_NO_PATHCONV=1` with `//sdcard/` is the fix, and
the byte count is printed before any conclusion — an empty dump is the instrument, not the app.

### The keyboard walk stays inside the layer

Six real Tab presses with the sheet open (no modal): every stop was **inside `.sheet-layer`** —
`Close`, `Close Payment Methods`, `Change method`, then round again — and every one reported
`:focus-visible → true` with a computed `outline: 2.5px solid`. Nothing was ever focusable behind the
sheet, which is the platform-tree claim confirmed by the tab order rather than by reading the attribute.

One wrinkle, recorded rather than fixed: the fourth press landed on `document.body` — the sequential
walk cycling past the last item in the only live layer before returning to the first. No control is
lost to it and the ring is absent because there is no control; on a phone with no keyboard attached this
is a path a thumb never takes.

**Device left clean:** app force-stopped, no override display size, `font_scale 1.0`.

## `1.2-preview.30` — built, **not handset-verified**, 2026-10-20

§76's conversion (24 typed seed dates → day offsets) changed the application file, so the asset was
re-synced and a new APK cut: `versionCode 32`, `versionName 1.2-preview.30`, built with
`./gradlew --offline --no-daemon :app:assembleDebug`. The bundled `assets/Sukinnect.html` is
byte-identical to `Sukinnect-next.html` — `md5sum` of both answers `3addb1d5d3af1c03768385a2d0cdf834`,
which is the check that matters here because the shipped file is *named* differently from the source.
The built archive was opened rather than assumed: `unzip -p Sukinnect-1.2-preview.30-debug.apk
assets/Sukinnect.html | md5sum` answers that same hash, so the APK on disk contains the code the
repository says it does.

**Nothing in this section was measured on a phone.** No device was on adb when the build finished
(`adb devices` lists nothing), so:

- the four remaining §3f items were owed that afternoon (concierge refusing to guess through the real system
  file picker, the sheet's marked payment row against the booking record, a booking with no address,
  the provider reload check)
  — disposition as of 2026-10-23: the payment-row, no-address and provider-reload legs were walked
  in Chrome and recorded in §78–§79, the concierge’s refuse-to-guess state is a screen in the camera’s
  table (`concierge-no-match`), and the real system picker was reached on hardware in walk 5;
- §76's date conversion is verified only by the camera diff — the wait labels, document counts and
  credential states printed identical before and after — and the handset leg is what would show a
  *rendered* difference the Node and Chrome frames cannot see, which is exactly the mistake §73 made
  twice (the floor that cancelled the user's text scale, the px the bench wrote and the phone scaled);
- the device's own text size is **unknown**, not known. This file's last line says `font_scale 1.0`,
  but a later session set it to 1.35 on the vivo and Android then refused adb's write
  (`com.android.shell was not granted WRITE_SETTINGS`), so the stored sentence and the later action
  disagree and neither can be checked without the phone. Read it off the device when it is reattached
  rather than quoting either claim.

`1.2-preview.29` remains the last build actually verified on hardware, and the claims attached to it in
§73/§74 (the nav labels rendering at 14.0px, the a11y tree, split-screen reachability) stand on that
build only.

## `1.2-preview.31` — the current build, still **not handset-verified**, 2026-10-20

§77 changed the application file again, so `.30` was superseded inside the same session rather than
left as the newest artifact: `versionCode 33`, `versionName 1.2-preview.31`, built with
`./gradlew --offline --no-daemon :app:assembleDebug` (`BUILD SUCCESSFUL in 51s`). The archive was
opened rather than assumed, as with `.30`:

```
unzip -p Sukinnect-1.2-preview.31-debug.apk assets/Sukinnect.html | md5sum
b427857296593895236ef9f7248788c1
md5sum Sukinnect-next.html
b427857296593895236ef9f7248788c1
```

So this APK carries §76's day offsets and §77's dialog labelling. **It has never been on a phone.**
`adb devices` has listed nothing since `1.2-preview.29`, which remains the last build actually verified
on hardware — and the gap is not symmetric: everything verified up to `.29` was verified on the vivo,
and everything since has been verified only by Chrome.

What only a handset can now settle, in rough order of how much it changes the claims in this repository:

1. **Whether TalkBack announces an opened dialog.** §77 asserts the box now declares `role=dialog`, is
   named, and takes the caret — all three measured in Chromium. Whether Android's screen reader turns
   that into speech on a real WebView is a different claim, and this file has already caught one
   case (`1.2-preview.23`) where the platform behaved unlike the bench: a specified 14px rendered
   18.9px because Android multiplies the used font size after CSS resolves.
2. **§76's states on a real screen** — the queue's "waiting 10/11/12 days", a credential banner reading
   Expiring against today's date. Anything date-shaped has to be read off a screenshot here; the day a
   reviewer opens the app is now part of the input, and the whole point of the conversion was that they
   see the intended states whatever that day is.
3. **The four §3f items** — the concierge refusing to guess through the real system file picker, the
   sheet's marked payment row against the booking record, a booking with no address, the provider
   reload check.
4. **The device's own text size**, which is unknown, not 1.0. This file's earlier line says
   `font_scale 1.0`; a later session set 1.35 and Android then refused adb's write back
   (`com.android.shell was not granted WRITE_SETTINGS`). Read it off the handset rather than quoting
   either claim.

`1.2-preview.29` is still the build whose hardware claims in §73/§74 (nav labels at 14.0px rendered,
the accessibility tree, split-screen reachability) can be quoted as verified.

## `1.2-preview.32` — the current build; **still not handset-verified**, 2026-10-20

§78 changed the application file, so `.31` was superseded the same day: `versionCode 34`,
`versionName 1.2-preview.32`, `./gradlew --offline --no-daemon :app:assembleDebug` (`BUILD SUCCESSFUL
in 1m 3s`). The archive was opened rather than assumed: `unzip -p Sukinnect-1.2-preview.32-debug.apk
assets/Sukinnect.html | md5sum` answers `97320aa179e24ad01d6d865aba5ce1db`, the same hash as
`Sukinnect-next.html` on disk.

Two §3f items were closed **without** a phone, and that is stated rather than glossed, because they
were on this file's owed list for sessions: the sheet's marked payment row against the booking record
(`tools/probe-request-payment.js` — marked rail, painted `aria-pressed`, model code, stored
`payMethod`/`payStatus` and the detail screen's words all agree, booking count 16 → 17), and the
provider reload check (`tools/probe-provider-reload.cjs` — the script is re-evaluated in a fresh scope
against the same store, signed in as p7, and 3/3 edited fields come back, each differing from the
seed). Walking the third, "booking with no address", is what surfaced the registration defect §78
fixes: the typed name and barangay were discarded and the demo resident's identity was kept.

What remains in this section is genuinely handset-only:

1. **TalkBack announcing an opened dialog** (§77's `role=dialog` + name + caret are measured in
   Chromium; whether Android turns that into speech is a different claim, and this file already
   records the bench disagreeing with a phone once — the 14px floor that rendered 18.9px);
2. **§76's day states and §78's register greeting read off a real screen** — anything date-shaped or
   typed-by-hand belongs on a device, per the standing rule;
3. **the concierge refusing to guess through the system file picker**, which adb cannot drive without
   the UI;
4. **the device's actual `font_scale`** — still unknown, not 1.0.

`1.2-preview.29` remains the last build actually verified on hardware.

## Handset walk 4 — `1.2-preview.33` on the OPPO CPH2179, 2026-10-20

Device: `S4CUYTJB6HNNWC49`, `CPH2179T2`, WebView `155.0.8059.45`, `Physical size: 720x1600` with
`Override density: 360` → **320 CSS px × 638**, `font_scale **1.35**`, root computing **21.6px**.
Installed over `preview.29` with data retained, so the upgrade path was part of the walk.

**Four claims settled on the platform, one of them by the platform disagreeing with the bench.**

1. **§76's day states, from a pre-existing dump.** The snapshot on disk was written 2026-10-18 at
   schema 16 by `preview.29`; the new build hydrated it and still reads `maria = 10 days ago`,
   `joel = 11`, `liza = 12`, with `1 expired / 5 expiring / 5 valid`. The relative-date conversion
   holds on a device whose stored data predates it, which is exactly the case it was built for.
2. **§77, as a tree.** With the "Edit profile" modal open, `uiautomator dump` lists the dialog's own
   nodes — `Edit profile`, `Close`, `Full Name`, `Email (read-only)`, `Phone Number`, `Home Address`,
   `Barangay`, `Emergency Contact`, `Save Changes` — and no node from the screen behind it, in 32
   nodes total. The in-page read agrees: `role=dialog`, `aria-modal=true`,
   `aria-labelledby=layer-title-1 → "Edit profile"`, focus inside, 8 inert siblings. Two limits stated
   rather than smoothed: the *first* dump listed 6 nodes with no text at all, which is Chromium
   building the tree lazily (a tap warms it — read a dump twice before calling it a defect), and this
   is the tree, not speech. **TalkBack was not enabled**, because turning on the owner's accessibility
   service is a device change to ask for, so "the dialog is announced aloud" remains unverified.
   *(Advanced as far as any channel here can advance it: on 2026-10-24 the owner approved enabling the
   service for the measurement and restoring it, and Handset walk 8 ran with `dumpsys accessibility`
   reporting it bound. The announcement is caught on the audio channel and the name in the tree; nothing
   on either phone recovers the words, so whether it **sounds** right is a person's answer, not a log's.)*
3. **§78, on screen.** Registering `Nueva Residente` / `Buayan` through the painted form greets
   `Nueva`, toasts `Prototype build - this account is not stored, and bookings use the demo household
   address`, and the snapshot still on disk names `Ana Dela Cruz` — the not-persisted promise, read
   as bytes rather than as a sentence.
4. **The nav boundary bug, found here and fixed here.** The first pass reported the fit loop writing
   `--nav-label-size: 11.85px` (16px rendered) with **`Bookings` and `Messages` cut** — where the
   bench and the camera's own tally had read zero for four sessions, because both measured the
   `.navitem`'s box, which includes 4px of padding the label never gets. After fixing the loop and the
   tally to measure the label's own box (§79) and reinstalling as `.33`: `10.52px` written →
   **`14.2px` rendered** → `cut none`, stable at 900ms and 1600ms. The floor is met in rendered space,
   on the platform that multiplies after CSS resolves.

**Not settled: the concierge's system file picker.** The photo control measures below the fold at this
corner (`centreCss.y = 666` in a 638px viewport) and `scrollIntoView` — with the animation suppressed,
which is the trap the keyboard walk documents — left the rect unmoved, so the synthetic tap landed on
the gesture bar and sent the app to the launcher. The instrument failed, not the application:
`controls no tap can reach` reads 0 here on all 72 screens, so a thumb can scroll to it. What stays
unverified is the narrower thing — that a real picker opens, and that §75's "we keep the name, not the
picture" holds against it. That needs a finger or a scroll container the probe can actually move.

**Device state at the end of the walk:** `preview.33` installed, signed-out state not restored (the app
was left on the concierge/login after the failed tap), and `svc power stayon true` was set so the
screen would not sleep between probes — clear it with `svc power stayon false` when the phone is next
handled. `font_scale` is **1.35**; the older line in this file saying the device was left at 1.0 was
written about a different session and is now contradicted by the device itself.

## `1.2-preview.34` — built, **not handset-verified**, 2026-10-21

§81 is the only application change since `preview.33` (§80 was tooling and documentation), so this is a
one-caption build: the admin dashboard's analytics row. `Sukinnect-Android/app/src/main/assets/Sukinnect.html`
was re-copied from `Sukinnect-next.html` and the archive was opened rather than assumed —
`unzip -p Sukinnect-Android/app/build/outputs/apk/debug/Sukinnect-1.2-preview.34-debug.apk
assets/Sukinnect.html | md5sum` answers `f0e810f970d4f920bf138ce290932ace`, which is the same hash
`md5sum Sukinnect-next.html` answers, so the APK on disk carries the file the repository says it does.
Built with `./gradlew --offline --no-daemon :app:assembleDebug` (BUILD SUCCESSFUL in 40s,
`versionCode 36`).

**Nothing in this section was measured on a phone.** `adb devices` lists nothing — the OPPO slept and
has not been reconnected since walk 4 — so what the handset owes this build is small but real:

- the admin dashboard's **Marketplace analytics** row read on a real screen: it should say
  `Provider verification 75%` above `6 of 8 providers on the roster are verified; 1 awaits review and
  1 is suspended`. It is text, not geometry, so the sweep cannot see it and only an eye can confirm
  nothing overflows at the device's own 1.35 text on a 320 CSS px panel;
- `admin-insights`, now in the walk and photographed for the first time, has never been seen on the
  handset either — and the four typed bars on it are the next pass's subject, so the screen will change
  before it is worth a thumb;
  *(closed: CHANGES §82 de-typed it, and Handset walk 5 read the three derived divisions — 33 / 75 / 38
  on the vivo against the bench's 60 / 75 / 38, both correct — so the thumb arrived after the change.)*
- the two legs walk 4 left open: whether **TalkBack speaks** an opened dialog (the platform *tree* is
  proven; speech is not, and enabling the owner's accessibility service needs their say-so), and the
  concierge's **system file picker**, which a synthetic tap cannot reach at this corner.

`preview.33` is what is installed on the device. When it is next connected: reinstall `.34`, remember
`svc power stayon true` is still set, and read the analytics row before the Insights work lands.
*(Both device states changed and were read: Handset walk 6 found the app **uninstalled** with
`svc power stayon` already cleared, so neither instruction was performed, and the analytics caption was
read and corrected as §77 rather than left pending the Insights work, which landed as §82.)*

## `1.2-preview.35` — supersedes `.34` an hour later; **still not handset-verified**, 2026-10-21

§82 landed while the device was off adb, so `.34` was never installed anywhere and this is the build to
put on the phone: `versionCode 37`, `versionName 1.2-preview.35`, built with
`./gradlew --offline --no-daemon :app:assembleDebug` (BUILD SUCCESSFUL in 1m 1s). The asset was re-copied
from `Sukinnect-next.html` and the archive opened rather than assumed — `unzip -p
Sukinnect-Android/app/build/outputs/apk/debug/Sukinnect-1.2-preview.35-debug.apk assets/Sukinnect.html |
md5sum` answers `0cb42e60c9372474efbb68ed49f88697`, the same hash `md5sum Sukinnect-next.html` and
`dist/Sukinnect-next.html` answer, so the repository, the published subset and the installed archive hold
one file.

**What the handset is now owed, in priority order.** Two of these are things the bench cannot settle:

1. **The admin's Provider Insights screen**, at the device's own `font_scale 1.35` on a 320 CSS px panel.
   It should read `Analytics over the 8 providers on the roster`, a stat row of `8 / 4.8 / 1039 / 6`, and
   three bars answering **60% / 75% / 38%** with an `x of y` line under each. The old screen typed
   `88 / 96 / 75 / 68`, so if any of those four numbers is still visible the rewrite did not ship.
2. **A figure that breaks in half.** §82's second fix is a CSS declaration (`.stat-strip .f b` refuses to
   shrink or break) and the sensor for it counts line boxes in Chrome. The phone's engine is the same
   Chromium family but not the same build, and this is precisely the class where §73's
   multiply-after-CSS lesson bit twice — so read the admin dashboard's stat row and the Insights stat row
   at 1.35 text and confirm `1039` paints as one word.
3. The `.34` item, still unread: the analytics caption `6 of 8 providers on the roster are verified; 1
   awaits review and 1 is suspended`.
4. The two legs walk 4 left open: whether **TalkBack speaks** an opened dialog, and the concierge's
   **system file picker**.
   *(Both closed later on this list — the picker by Handset walk 7 returning a document through `input
   keyevent` on the vivo, the dialog by Handset walk 8 with the reader actually enabled. What stays open
   is narrower: the same key route on the OPPO's ColorOS, and whether the announcement sounds right.)*

`preview.33` is still what is installed. `svc power stayon true` is still set on the device — clear it
with `svc power stayon false` when it is next handled.
*(Superseded by the read, not by an action: Handset walk 6 found the app uninstalled and the stay-on flag
already `0`, so neither instruction was performed; Handset walk 7 installed `1.2-preview.38` on the **vivo**,
and §98 built `1.2-preview.39` for that same phone, which is owed an install.)*

## `1.2-preview.36` — supersedes `.35`; **still not handset-verified**, 2026-10-21

§83 is the only application change since `.35`: `attemptTransition` now takes one clock reading and
hands it to the step stamp, `statusChangedAt` and the `STATUS_EVENTS` row, where those three each took
their own `new Date()` before. `versionCode 38`, `versionName 1.2-preview.36`,
`./gradlew --offline --no-daemon :app:assembleDebug` → BUILD SUCCESSFUL in 55s, and the archive was
opened: `unzip -p Sukinnect-1.2-preview.36-debug.apk assets/Sukinnect.html | md5sum` answers
`4bfd9d614c89c18c41da3af9ff476bd3`, the same value `md5sum Sukinnect-next.html` and
`dist/Sukinnect-next.html` answer.

**What the phone can add over the bench here is small, and it is named so it does not look like a gap.**
The stamps this touches are painted as relative labels — "Made 6 hours ago", "received 7 minutes ago",
the tracking view's step times — so the one thing worth a look at the device's own 1.35 text on a 320
CSS px panel is that a booking's tracking card and its timeline agree to the second, which is now true by
construction rather than by timing. Everything else in the `.35` list still stands and is still owed in
that order: the de-typed Provider Insights figures (60 / 75 / 38 and a flag named with a count), an
unbroken `1039` in the admin stat row, the `6 of 8 … 1 awaits review and 1 is suspended` caption,
whether **TalkBack speaks** an opened dialog, and the concierge's **system file picker**.
*(All five were put to a phone and are written up in the owed list's own disposition — the caption, the
Insights figures, the `1039`, the second provider's own header, the dialog tree, the TalkBack question,
the five-item nav at the OPPO's text scale and the sign-out confirmation. The only leg this order owed
and did not close is ColorOS refusing a synthetic tap on a document row, and Handset walk 7 retired even
that as a platform conclusion by returning a document on the vivo through the key route.)*

`preview.33` remains what is installed on `S4CUYTJB6HNNWC49`; `svc power stayon true` is still set.

## Handset walk 5 — `1.2-preview.37` on the vivo 1906, 2026-10-22

Device: `80d20768`, vivo 1906, Android **11** — this row said 10 until 2026-10-24, when the phone was asked
again: `ro.build.version.release` 11, `sdk` 30, `RP1A.200720.012`, vivo OS 11.5, build dated 2025-07-11, so no
update explains the 10 and it was simply a wrong reading. The observations that row drew from the device stand
unchanged; only the release and the two sentences that reasoned from it were corrected, in this file and in
`AGENTS.md`. — WebView `155.0.8059.43`, `Physical size: 720x1544` with
`Override density: 256` → **450 CSS px**. Read from the page this walk, not assumed: `innerWidth 450`,
`innerHeight 889`, `devicePixelRatio 1.600000023841858`, and the WebView node occupying device
`[0,54][720,1423]` — two coordinate spaces, which matters because `--tap` takes **page** coordinates and
`adb shell input tap` takes **device** ones. Installed over `preview.28` with data retained, so the
upgrade path was walked: `dumpsys package com.sukinnect.app` answers `versionCode=39`,
`versionName=1.2-preview.37`.

**All six owed legs were put to the phone. Five settled, one settled as far as an automated thumb can.**

1. **§81's caption, on screen.** The admin analytics row reads
   `6 of 8 providers on the roster are verified; 1 awaits review and 1 is suspended`, and the row is
   labelled *Provider verification*, not progress.
2. **§82's Insights, de-typed on the device — and reading different numbers than the bench.** The three
   divisions paint **33 / 75 / 38** here where the bench paints 60 / 75 / 38, and the difference is the
   derivation doing its job: this device's stored snapshot carries extra live bookings, so the screen
   says `3 of 9 jobs that reached a final state` against the seed's 3-of-5. The flag sentence names a
   count, the attention card holds 6 rows and the strip counts 6, and nothing on the screen is typed.
   A bench screenshot of a clean number would have hidden both facts.
3. **§82's split-figure guard, broken and then honoured on hardware.** At the device's own **2.0** text
   on a 450px panel, with the whole guard removed from `.stat-strip .f b` the admin stat row paints
   `1039` across **2 line boxes**; with the shipped rule it paints **1**. (Which half of the rule does
   the work is already recorded in CHANGES §82: dropping only `white-space:nowrap` while keeping
   `flex-shrink:0` breaks nothing, because the item then keeps its width and the label wraps — so this
   row was taken against the guard as a pair, not against one declaration.) This is the measurement the
   camera's 25th tally makes, taken where the type is actually multiplied.
4. **§85's identity, on the account the camera has never been.** Signing in as the second provider
   through the *painted* form (`erning@demo.ph`) yields the dashboard header
   `Erning Bautista · Fruit Harvest & Buy · Brgy. Buayan` — no typed `Ramil Odiada (Pro)`, no
   `Plumbing Specialist · Brgy. Poblacion`. The sign-in chips read **Resident / Provider** on the
   platform's own text engine, so §85's one-word ruling is on hardware too.
5. **§77's dialog semantics, re-read on this device.** With the resident's "Edit profile" open:
   `role=dialog`, `aria-modal=true`, `aria-labelledby=layer-title-2`, focus inside the layer; after the
   `×` tap the `[data-layer]` list is empty. The sign-out confirmation is the same shape (`×`, `Cancel`,
   `Log Out` inside one modal layer), so the guarantee holds for a dialog the app raised second.
6. **TalkBack does speak an opened dialog — and an earlier "no" from this walk was the instrument.**
   The channel is `dumpsys audio`'s `SpeechControllerImpl` focus transitions, taken as a **set
   difference** against a snapshot (the log is a ring buffer, and a lexical timestamp comparison against
   a bare `HH:MM:SS` silently answers "nothing new" forever). Order: positive control first, so a
   silence can mean something.

   | tap | focus stack clear before? | new speech lines |
   | --- | --- | --- |
   | non-interactive card on the profile hub | yes | **0** |
   | dialog body text | yes | **0** |
   | "Edit Profile" → dialog opens | yes | **2** — `requestAudioFocus()`, `GAIN_TRANSIENT_MAY_DUCK`, `usage=USAGE_ASSISTANCE_ACCESSIBILITY` |
   | the `×` → dialog closes | yes | **2** |

   The first attempt at the close row read **0** and would have been filed as "closing announces
   nothing". It was not: TalkBack keeps its focus entry on the stack for tens of seconds after it
   speaks (observed holds of 39s and 51s, and one still held 81s after the request), and a new
   `requestAudioFocus()` line only appears when the stack is empty — so an utterance inside a held
   session is invisible to a burst count. The driver now waits for the stack to clear and prints how
   long it waited. **A silence from a channel that is still busy is not a negative result.**
   What this does *not* prove: that the announcement *names* the dialog. No utterance text is
   recoverable here — `logcat` carries no TalkBack speech line for this walk (0 lines matching
   `talkback|accessib`), and that build's `PlaybackActivityMonitor` dump lists client handles without
   per-player detail. The naming is carried by the tree evidence in row 5, not by this row.

**Not settled by automation, with the whole chain recorded: picking the file.** The concierge's photo
control opens the real system picker — `mResumedActivity: com.google.android.documentsui/…picker.PickActivity`
— reached by `--tap` on the painted button, which is the §75 leg's blocker before this session
(`element.click()` from `Runtime.evaluate` carries no user activation, so the chooser never appeared).
Two obstacles sit between that and a completed selection, and both belong to the instrument:

- *The file has to exist where the picker looks.* `adb push` preserved the source file's 2026-09-20
  date and did not index it, so "RECENT IMAGES" showed only the owner's real photos — and selecting one
  of those is not mine to do. `touch` + `MEDIA_SCANNER_SCAN_FILE` put `suki-leg6-test.png` at MediaStore
  row 667 and at the **top** of the grid, labelled `9.05 kB, 6:21 AM`.
- *ColorOS's DocumentsUI will not hand a document to a synthetic pointer.* Four attempts on two layouts —
  grid tile centre `(141,629)`, grid preview icon `(205,564)`, list-view preview icon `(662,577)`, and the
  same icon as `motionevent DOWN` + 1s + `UP` — left the picker resumed and our page unchanged. The
  injected input is *not* being dropped wholesale: a tap at `(106,194)` flipped the "Large files" chip
  from `checked="false"` to `checked="true"`, and a swipe at `360,1200→360,700` scrolled the very list
  whose rows refuse taps. So the chrome answers and the document rows do not. **A thumb is still owed
  for this one tap.**
  *(Retired for this device by the route this row did not try: Handset walk 7 ran
  `--keys=TAB,TAB,DPAD_DOWN,DPAD_CENTER` against the vivo's DocumentsUI and our page came back holding a
  file, which makes it a refused input method rather than a refused platform. ColorOS remains the open
  half, and it has never been tried with keys.)*

The app's half of the same promise was then measured in a real browser instead: a `File` handed to
`#hidden-file-input` through `DataTransfer` — the mechanism the browser itself uses when a picker returns
a document — then a `change` event, then a read of the painted screen.
`node tools/shot.cjs --probe=@tools/probe-concierge-photo-name.js --only=concierge` answers
`painted ["…Attach a photo of the problem IMG_kitchen_leak"]`, `imageSourcesHoldingBytes: 0` and
`blobOrDataInPaintedHtml: 0` — no `blob:` or `data:` anywhere on the screen, as an attribute or in the
markup. The probe refuses rather than printing those zeros, and `node tools/falsify-photo-name.cjs`
(2 breaks, 2 caught) proves both refusal paths fire: a handler that keeps an object URL instead of the
name answers `LEAK`, and one that returns before reading the pick answers `NO CONCLUSION`. §75's "you see
the name you gave it, not the photo" is a measurement, not a comment. No console errors.

**One trap re-encountered, third time in this repository:** after `scrollIntoView({block:'center'})` the
concierge entry's rect still read `y=897` in an 889px viewport, because `#screen` scrolls smoothly by
contract. Setting `style.scrollBehavior='auto'` and moving `scrollTop` directly put it at `y=496`,
`vis:true`. A rect read in the breath after a scroll is the element's *old* position — §72 says so, the
keyboard walk says so, and this walk fell for it anyway.

**Device state at the end of the walk — restored, and each item is what was set for the test:**
`enabled_accessibility_services` back to `null` and `accessibility_enabled` back to `0` (both were off
before TalkBack was turned on for row 6); `svc power stayon false`; `/sdcard/Pictures/suki-leg6-test.png`
deleted and re-scanned so its MediaStore row is gone; 11 `uiautomator` dumps left by this and earlier
walks deleted from `/sdcard` (`ls /sdcard/*.xml` answers 0); `font_scale` back to its default (the
global setting reads `null`, i.e. 1.0, after being set to 1.35 and 2.0 for rows 3 and 4); and the app
signed out through its own Log Out control and confirmation dialog, so the device shows the sign-in
screen with `Resident / Provider` chips. `preview.37` stays installed.

## Handset walk 6 — `1.2-preview.37` installed on the OPPO CPH2179, 2026-10-23

Device: `S4CUYTJB6HNNWC49`, `CPH2179T2`, WebView `155.0.8059.45`, `Physical size: 720x1600` with
`Override density: 360` → **320 CSS px**, confirmed from the page as `innerWidth 320`, `innerHeight 638`,
`devicePixelRatio 2.25`. This is the panel that produced the nav-label boundary bug in walk 4, so the
point of the walk was to re-check it on the build the rebuild actually ships.

**The phone contradicted this file before anything was measured, twice.**

- `dumpsys package com.sukinnect.app` answered nothing at all: **Sukinnect was not installed**, while the
  line above this section said the device "still holds `preview.33`". The install was therefore a fresh
  install rather than an upgrade, and no data carried over.
- `settings get global font_scale` reads `null`, which looked like the text scale having returned to
  default — and contradicted walk 4's finding that the device's real scale is **1.35**. It is: the value
  lives in the **`system`** namespace, and `settings get system font_scale` answers `1.35`. Asking the
  wrong table and reporting the silence as a fact is the same mistake §86 wrote up twice in one day.
- `svc power stayon true`, which this file still owed to be cleared, was already `0`
  (`stay_on_while_plugged_in` reads 0). Cleared by somebody between walks; the owed line was stale.
- Accessibility is on and is **not** mine to touch: `enabled_accessibility_services` is
  `com.google.android.marvin.talkback/…AccessibilityMenuService` with `accessibility_enabled=1`. That is
  the Accessibility *Menu*, not the TalkBack engine, so this phone offered no speech channel for §77's
  wording question, and nothing was changed.

**Installed**: `Sukinnect-1.2-preview.37-debug.apk` streamed and `-r -g` → `Success`,
`versionCode=39`, `versionName=1.2-preview.37`.

**Four readings on the platform, and one defect found in a number nobody could see on the bench.**

1. **Resident nav, 4 items, at the device's own 1.35:** `--nav-label-size` written `10.52px` → every
   label computes **14.202px**, and all four report `scrollWidth <= clientWidth`, i.e. **no cuts**. This
   matches walk 4's `.33` reading exactly, so the fit loop still behaves on `.37`.
2. **Provider nav, 5 items, 58px slots, at 1.35:** written `10.37px` → computes **13.9995px**; `Dash`,
   `FSM` and `Profile` are whole, and `Bookings` and `Messages` are cut — the documented outcome of
   holding the floor rather than shrinking below it. The new thing is the fifth decimal: the floor is
   declared as 14px and the phone painted 13.9995px. `size` is the rendered floor, the property takes the
   *specified* size, and `Math.round(14 / 1.35 * 100) / 100` sends `10.37` out, which the platform
   multiplies back to just under 14. No bench run can see this — `navFontScale()` is exactly 1 there, so
   specified and rendered are the same number — and the camera's below-14px walk carries a 0.7px
   tolerance that would never report half a thousandth. Fixed by converting upward
   (`Math.ceil((size / scale) * 100) / 100`), pinned by two `hygiene` checks (the conversion direction,
   and that the factor is still measured rather than assumed, so the check cannot pass on a build where
   the loop was deleted), and proved by a fifth break in `node tools/falsify-nav-fit.cjs` that restores
   `Math.round` and requires the gate check to fail. **A rule stated in one coordinate space has to be
   converted in the direction that keeps it true, and a tolerance is not a floor.**
3. **§82's stat figures on this device:** the provider dashboard carries two, `₱2,750` and `50%`, and each
   returns **one** client rectangle — no figure breaks in half here.
4. **§77 on the provider's own editor dialog:** `role=dialog`, `aria-modal=true`,
   `aria-labelledby=layer-title-3`, focus inside, **8 inert siblings**, with
   `document.hasFocus() === true`. An earlier read of the same dialog said `focusInside:false`, and that
   was the instrument: when a document does not have focus, `document.activeElement` is `<body>` by
   specification, so the answer is "the reader was blind", not "the app lost the caret". `hasFocus()` is
   printed beside the reading in this walk's driver for exactly that reason.

**Three more ways the handset defeated the driver, all recorded because the next driver will repeat them.**

- **The on-screen keyboard moves the page and `window.visualViewport` does not report it.** The Log in
  button measured `y=454` with the keyboard open and `y=688`/`y=547` without it, so two `--tap` calls at
  a rect that had been read honestly hit nothing; a probe that waits for the viewport to change saw no
  change either. The reliable submit is the field's own `Enter` — `inp.onkeydown = (e) => { if(e.key ===
  'Enter') submitAuth(); }` — so `adb shell input keyevent KEYCODE_ENTER` after typing reached the
  provider dashboard where four coordinate taps had missed.
- **A blind `KEYCODE_BACK` is not a harmless dismiss.** Hardware Back is wired to the app's own history
  (§65), so pressing it to close a keyboard that is not open pops a screen, and at a root tab it exits
  the app. The driver now asks the page first and presses Back only when the viewport really shrank.
- **Two same-named controls, one of them the target.** On the provider hub the "Log Out" *row* is at page
  `y=2374` — below the 638px viewport, reachable by scroll, which is what `controls no tap can reach`
  reading 0 has always meant — while the confirmation dialog's "Log Out" *button* is inside the open
  layer. A document-wide search by label matched the row first, in DOM order, so the confirm tap re-tapped
  the row and the app never signed out. Every lookup is now scoped to the top `[data-layer]` when one is
  open, and the scroll-then-read-then-tap order is: read the rect **after** the last layout change.

**Device left:** `preview.37` installed, signed out through its own control and confirmation dialog, text
scale 1.35 (its own value, never written by this walk), `stay_on_while_plugged_in` 0 (as found), the
owner's Accessibility Menu left enabled, no files pushed and no dumps written.

**Then the reading above became a fix, and the fix was re-measured on this phone.** The 13.9995px is a
rounding direction in `fitNavLabels` (§89): the conversion back from rendered to specified px was
`Math.round`, and it now goes up. `1.2-preview.38` (`versionCode 40`, asset hashed
`a4cf6fc31df59ae2964b0d726b071534` against the source, `dist/` and the staged copy) was built and
installed over `.37` on this same device, and the provider nav re-measured: **`10.38px` written,
14.013px rendered**, still `Bookings` and `Messages` cut at the floor and `Dash`/`FSM`/`Profile` whole.
That is the first time a nav-floor number in this project has been confirmed in the space the platform
actually paints in, rather than inferred from the bench where the factor is 1. The phone is again signed
out with its own settings untouched. The vivo `80d20768` was not on the cable for this and still runs
`preview.37`; walk 5 never read the *provider* nav on that phone, so the shortfall was never measured
there — when it is next attached, install `.38` and read the same two numbers (written size and computed
size) to confirm the fix on a second panel.

## Handset walk 7 — `1.2-preview.38` on the vivo 1906, 2026-10-23

The vivo `80d20768` came back attached, still on `1.2-preview.37` (`versionCode 39`, installed 2026-10-22),
Android **11**, `Override density: 256` on a 720px panel, and its `system` namespace `font_scale` at **1.0**.
The two legs the `.37` walks owed were both put to this phone and both answered; one of them answered with a
privacy incident that belongs in this file rather than in a footnote.

**`1.2-preview.38` installed:** `adb install -r -g` of the 2,153,694-byte debug APK, `dumpsys package`
answering `versionName=1.2-preview.38`, and the page inside it is the current bytes — `unzip -p … assets/Sukinnect.html |
md5sum` matches `a4cf6fc31df59ae2964b0d726b071534`, the same hash as the source, `dist/` and the staged asset.

**Owed leg — the nav floor on the second panel, at three text sizes.** Read on the provider dashboard, whose
five-item nav is the case that showed the unit bug on the OPPO. Each row is the property the app *writes* and
the size the WebView *paints*, plus the platform factor measured with a throwaway 100px span:

| `font_scale` | factor | `--nav-label-size` written | computed size painted | slot | cut |
|---|---|---|---|---|---|
| 1.0 (as found) | 1 | *nothing written* | 14px | 84px | 0 |
| 1.35 | 1.35 | `12.15px` | **16.4025px** | 84px | 0 |
| 2.0 | 2 | `8.15px` | **16.3px** | 84px | 0 |

So the conversion holds on the vivo panel: the app writes 8.15px and the phone paints 16.3px, which is above
the 14px floor in the only space a phone measures in. Note what the floor is *not* doing here: at 450 CSS px
five items get 84px slots, so the loop stops as soon as the words fit — at 2.0 that is 16.3px rendered, well
above the floor. The 320px OPPO panel is the case where the floor binds (10.38 written → 14.013 painted), and
that corner stays the one where the rounding direction is observable. A bench sweep cannot tell these apart,
because `navFontScale()` is 1 there and specified equals rendered.

**Owed leg — the concierge's system file picker, settled by the route that had never been tried.** Signed in
as the resident, the concierge entry sits below the fold on this panel (`y=871` of 889): `scrollIntoView` alone
did not move it, and the §86 fix did — `scrollBehavior='auto'` plus a direct `scrollTop` on `#screen` brought it
to 470 and the tap landed. The photo control, `Upload or take a photo`, was already on screen at 225,434; one
`--tap` there resumed `com.google.android.documentsui/com.android.documentsui.picker.PickActivity`, so §75's
"this phone never opened the picker" was the instrument again — the earlier attempt had been tapping the
gesture bar. Then the key route the `.37` walk flagged and never ran:

```
node tools/device-probe.cjs --keys=TAB,TAB,DPAD_DOWN,DPAD_CENTER '<reader>'
```

and the page came back holding a file: `conciergePhotoAttached=true`, our activity resumed, the picker closed.
**A synthetic pointer was never the only obstacle** — `input keyevent` reaches a document row on this vivo's
DocumentsUI where four injected taps across two layouts on ColorOS refused one. The conclusion "a thumb is
still owed" is therefore retired for this device; it stays open only for the OPPO's ColorOS picker, where the
key route has not been tried.

**The privacy problem, stated plainly.** A key-driven pick selects whatever the grid has focused, and the
focused row on a real phone is the newest image — **one of the owner's own photographs**, a camera-timed
`.jpg`, not the `suki-leg7-test.png` pushed for this test. Pushing and re-indexing the test file (touch +
`MEDIA_SCANNER_SCAN_FILE`, `_id=65630`) did not put it at the front of the recents the picker opened on, so
the route cannot be steered at a known tile without either navigating a counted number of rows or clearing the
recents. The app's own promise limited the damage and was measured holding: **zero** `blob:` and **zero**
`data:image` references in the painted screen, no `<img>` carrying bytes, and only `conciergePhotoAttached`
plus the name in memory — the stored snapshot (51,903 bytes) held no name at all, so nothing about that
photograph crossed into storage or onto a network. The photo was removed through the screen's own **Remove
photo** control and re-read as cleared. The pushed test file was deleted; the owner's other Download entries
(a guide PDF, a validation toolkit, a repo archive and an older `suki-test-photo.png`) were left exactly where
they were; `font_scale` was restored to 1.0 and verified; the app was signed out through its own `signOut()` —
a script call rather than a thumb, because this was cleanup, not measurement. **The general rule: a working
key route makes the pick automatable and therefore makes it able to choose somebody's real file. It must not
be run on a device holding photographs the owner has not offered; the safe fixture is a folder that is empty
except for the test file, entered by name.**

**Three instrument notes from the same walk.** `--keys` is applied *before* the reader expression, so an
attempt to focus a field inside the reader and then press Enter arrives too late — the sign-in had to be
completed by tapping the button's own rect, which is what a thumb does anyway. `document.hasFocus()` answered
false for the injected `focus()`, and the Enter keypress was swallowed silently, which is the same blindness
§89 recorded for `document.activeElement`. And the auth screen's `Log in` button sat at page `y=901` in an
889px viewport at 2.0 text while `document.scrollingElement.scrollHeight` equalled the viewport: the scroll
container is the auth panel, not the document, so reading `scrollTop` and concluding "unreachable" would have
been wrong twice over. The reachability tally already answered correctly (`controls no tap can reach`: 0),
because it asks whether an *ancestor* scrolls.

**The corner this walk produced.** 450 CSS px at 200% text had never been swept — the seven corners pair
narrow panels with large text because that is where clipping was found. It is in `DEFAULT_CASES` now, and the
eight-corner run is the figure quoted afterwards.

## Handset walk 8 — TalkBack actually running, the two-tap rule, and a dialog no walk had ever visited

`2026-10-24`. The vivo 1906 came back attached and authorised, so the one device-side question left — does
an opened dialog get **spoken**, not merely exposed — could be asked properly. The owner approved enabling
TalkBack for the measurement and restoring it after, which matters because every earlier reading of this
channel was taken with the service **off**: `settings get secure enabled_accessibility_services` answered
`null` and `accessibility_enabled` `0` both before and after this walk, and that is exactly what walk 5's
own note says — so its conclusion about what TalkBack does or does not say was read from a channel nobody was
speaking on. The package is present (`com.google.android.marvin.talkback`, base + `arm64_v8a` split), and
after enabling, `dumpsys accessibility` reports the service **bound**.

**The engine, re-read.** `dumpsys webviewupdate` → `com.google.android.webview 155.0.8059.43`, identical to
what walk 5 captured, and the phone is **Android 11 / API 30** (`RP1A.200720.012`, vivo OS 11.5, build dated
2025-07-11) — which corrects that walk's header line and, with it, two sentences in `AGENTS.md` that
reasoned from "Android 10". The two handsets are therefore **one patch apart on the same Chromium build**
(.43 here, .45 on the OPPO), and yet one returns a document to `input keyevent` while the other refused four
synthetic taps — so the picker difference is the OEM shell, not the WebView, and cannot be argued across.

**Four instrument facts, each one learned by being wrong first.**

1. **The audio log is a history, not a state.** Six `SpeechControllerImpl` lines were there before
   force-stopping TalkBack and the same six after; the set grew to 10 and then 13 as the walk tapped things.
   A `dumpsys audio` silence therefore says nothing about whether anything is speaking *now*, and a burst
   count has to be a **difference across the event**, read beside the service's own bound state.
2. **With a screen reader on, the first tap selects and the second activates.** Every single-tap
   navigation in the first attempt silently focused instead of firing, which is why it reported "no edit
   button of 14" while the hub's fourteen painted buttons were exactly where they had always been. Tapping
   each control twice fixed the walk.
3. **A dialog's words reach no channel on this device — now measured with the reader running.** Opening
   the resident **Log out?** confirm (`role=dialog`, `aria-modal=true`, `aria-labelledby` naming it
   "Log out?") produced one new audio line, and it was an **`abandonAudioFocus()`** — a teardown of an older
   hold, not a request. A cleared `logcat` window over the open showed 5 lines in total, **0** mentioning
   talkback/TextToSpeech/utterance, and **0** containing the dialog's own name. So: the burst proves an
   announcement happens and §77's tree proves the name is exposed; with the service verifiably on, nothing
   here recovers the wording. That is the same conclusion the project has carried, but it now rests on a run
   where the thing being measured was actually switched on.
4. **The caret reading that started all this is a device divergence, and the bench's real failure was
   population.** With the dialog open, `document.activeElement` was `<body>` while `document.hasFocus()` was
   true — with TalkBack **on**, and again with it **off** and a single real tap, so it was not the reader
   owning focus. The bench, driving the *same* control through `clickPainted` (a real CDP input event, not a
   page-side `click()`), reports the caret inside and the tally reads 0. What was actually wrong is that
   `grep -i logout tools/shot.cjs` returned nothing: **the logout confirm was a dialog no instrument had
   ever opened.** It is `resident-logout-modal` in the walk now, and it measures clean on all 25 tallies,
   labelled by its own dialog title — and because that reading was a person noticing rather than a sensor
   asking, §97 turned the question into `node tools/audit-camera-dialog-coverage.cjs`, which found seven such
   destinations in total and grew the table to **81** screens.

**Three instruments added, and proved.** `tools/probe-dialog-focus-settled.js` reads the caret immediately,
at one second and at three — because a guarantee that fires then is undone by a later render is precisely the
distinction the single-shot tally cannot make. It reports `findings`, so `probe-all.cjs` reads it. The fifth
break in `node tools/falsify-dialog-focus.cjs` refuses the caret through `focusIntoLayer` and requires **that
probe** to notice: baseline `findings=0`, mutated `findings=2`, with the tally's own break reporting
`count=9` — one more than the `count=8` it printed before this screen existed, which is the walk getting
wider doing its job. **5 of 5 breaks caught, 0 not applied, 0 missed.**

**Restoration, which belongs in an exit hook rather than the last line of a happy path.** The first driver
died on `>/dev/null` — cmd.exe cannot open it — between enabling TalkBack and restoring it, and the owner's
screen reader stayed on until it was put back by hand. That is §88's cancelled-run-leaves-a-mutant class
arriving with a device setting instead of a file, and the fixed drivers now install
`process.on('exit', restore)` before they enable anything. Verified at the end of this walk, each reading
taken after the sign-out rather than remembered from it: `enabled_accessibility_services` `null`,
`accessibility_enabled` `0`, no talkback process at all in `ps -A`, `font_scale` `1.0` in the **system**
namespace (and `null` in `global`, which is the table that has no entry for it), installed build still
`versionCode=40 / 1.2-preview.38`, and the app back on its sign-in screen — reached the way a thumb reaches
it, the profile rail's **Log Out** row and then the confirm dialog's own **Log Out** button, after which
`state.view` reads `login` and the painted body text is the login form. The walk's own pushed fixture
(`/sdcard/Pictures/suki-leg6-test.png`) is gone and `Pictures/` holds only `Messenger`. One `suki-*` file does
remain, `/sdcard/Download/suki-test-photo.png`, dated **2026-10-11** and already recorded in the walk-4 exit
notes as one of the owner's files left where it was: a `grep -i suki` on a directory listing is a lead, not a
finding, and the date is what tells them apart.

## Owed, in order — a pointer list, not an explanation

Everything below is written out where it belongs; this is only the list of what the next person finds
open. Nothing here is a defect the bench can close.

**On the handset** — two open items, one per phone, plus one closed note a later walk reopened:
1. **The OPPO's ColorOS picker has never been tried with keys.** Handset walk 7 settled this leg on the
   vivo: `node tools/device-probe.cjs --keys=TAB,TAB,DPAD_DOWN,DPAD_CENTER '<reader>'` closed the picker
   and our page came back holding a file, which retires "a thumb is owed" for that DocumentsUI. ColorOS
   refused four injected taps on a document row while accepting one on its own chrome, so the open
   question is only whether the same key route works there. **Fixture rule from walk 7, which picked the
   owner's photograph by accident:** a key route selects the focused row, so run it against a folder that
   is empty except for the test file and entered by name — never against a recents grid holding real
   photographs.
   **Correction 2026-10-24, and the correction is the finding.** An earlier draft of this item read that 
   same tree was ColorOS's and "narrowed" the leg from it. It is not ColorOS's: a scan of every dump left 
   on this machine — 34 files carry a picker window or a focused node — shows `docui.xml`, `d2.xml` … `d8.xml` all stamped 
   **2026-10-22, 16:43 to 16:58** — the afternoon walk 7 ran the key route on the **vivo**. The sequence is 
   legible: the 177-node tree has **no** focused node, and the five later trees `d2.xml`–`d6.xml` (16:47–16:56) each have **exactly one
   node focused inside `com.google.android.documentsui`** — the same picker before and after `input 
   keyevent` moved focus. That is independent corroboration of walk 7 on the phone where keys already 
   worked. **No ColorOS picker tree exists here at all**, so this item's residual is exactly what it was: 
   whether keys move focus among the rows on that shell, answered by one `--dump` reading on that phone.
   **A defect in the guard itself, found by running it against real trees rather than made-up ones.** The 
   rule was "the focused row's name must be the fixture". Tested over every saved picker tree 
   (`node tools/device-picker-keys.cjs --guard-real`), it would have **allowed** the centre press on 
   `d2.xml`–`d6.xml` — because in those trees the one focused node is 
   `com.google.android.documentsui:id/search_src_text`, an **EditText whose text is the fixture name**: 
   walk 7 entered the file by name into the picker's own search field, and the rows it searched up 
   (`suki-test-photo.png, 100 kB, Oct 11`, `Preview the file suki-test-photo.png`) are a different part of 
   the tree. Pressing centre there re-runs the query, selects nothing, and the leg would have reported a 
   pick that never happened. The rule now also requires that focus is not on an editor and that exactly 
   one node reports focus. Proof, on the artifacts themselves: **18 trees → 18 refusals** (5 edit-box, 13 
   nothing-focused) with a synthetic document-row-focus case as the **only** ALLOW — so the guard still 
   discriminates rather than simply refusing — `findings: 0`, exit 0 when that is the shape and exit 1 
   when it is not.
   The attribution itself is now an instrument: `node tools/device-dump-provenance.cjs` lists every saved
   tree with its timestamp, node count and focus counts, and refuses with `NO CONCLUSION` when no picker tree
   exists to attribute. It answers 18 picker trees on this machine, **all of them stamped 2026-10-22**, one
   picker package, five with a focused node — which is the whole of the ColorOS question still being open.
   **The route is now written down, in the order walk 7 actually took it.** `node tools/device-picker-keys.cjs`
   runs `--fixture` (push + `touch` + a scan broadcast, then prove the MediaStore row exists), `--open` (a real
   tap at the rect the page reports for the concierge's own photo button — `element.click()` carries no user
   activation), `--search` (read the LIVE tree, find `documentsui:id/search_src_text`, tap its bounds centre in
   **device** pixels, type the fixture's name, re-dump), then `--key=DPAD_DOWN` one press at a time until the
   report names the fixture row as FOCUSED, then `--key=DPAD_CENTER`, which the guard allows only then, then
   `--dump` to read what the page holds, then `--teardown`. `--connect=IP:PORT` reaches a phone over Wi-Fi.
   **Armed 2026-10-24, and the arming answered part of the question off the phone.** The picker tree walk 7 left on the **vivo** (`.scratch/docui.xml`, 177 nodes, every one of them `com.google.android.documentsui`) carries 
   **no node with `focused="true"`**, and two clickable rows named `Preview the file IMG_20261020_1859` — the 
   owner's own photographs, at `[167,526]` and `[386,526]`. So the open question is narrower than "does 
   ColorOS accept keys": with nothing focused, the first key *establishes* focus and a centre key then 
   activates whatever it landed on. The leg is `node tools/device-picker-keys.cjs`, which sends **one key 
   at a time**, re-reads the platform tree after it, and refuses `DPAD_CENTER` unless the focused row is 
   named for the fixture it pushed — proved without a phone by `--guard-test` (3 of 3: nothing focused 
   refused, that photograph refused, the fixture allowed) and its parser proved by running it over that 
   saved tree, which is where the two photograph rows came to light.
2. **`1.2-preview.39` is built and bundle-verified but not installed.** §98 changed the page (the
   admin lock field and its copy), so the tree, `dist/`, the staged asset and the APK all read
   `3c78fdd…` (three page changes since `.38`: the §98 lock field, §99's filter rows, and §99's
   unique icon ids), and the APK was rebuilt each time so the bundle still matches, while the vivo still
   runs `.38` at `a4cf6fc3…`. The bench measured both fixes;
   the device reading of them is owed, because the phone left the bus between the build and the walk — and
   Windows enumerates no handset at all now, so this is not an authorisation wait. A field sized in `rem` is
   exactly the case where a phone can disagree with the bench (§68 multiplies used sizes after CSS
   resolves), so this is a real leg rather than a formality: install `.39`, open Lock Admin Session on the
   hub and read the PIN field's computed size and box height, then open **Filter providers** on the results
   bar and read the sixteen option rows — they are 44px on the bench and the phone is the place a px floor
   is not what it looks like.
   **Armed 2026-10-24, with its readers run on the bench first.** The leg is `node 
   tools/device-legs.cjs`: it enters the two screens exactly as `tools/shot.cjs` enters 
   `admin-lock-modal` and `resident-filter-sheet`, then opens each with a **real input event** at the rect 
   the page reports, and it installs by the `applicationId` and version read out of 
   `app/build/outputs/apk/debug/output-metadata.json` rather than constants typed into the driver — which is 
   how it found that this app's id is **`com.sukinnect.app`**, not the `com.sukinnect.proto` the first draft 
   assumed. A wrong package would only have shown up as a refusal, so the refusal is a tested function: 
   `--selftest` proves the install check on 5 cases — both `dumpsys` spellings (`versionName:` and 
   `versionName=`) accepted, and a stale code, a stale name and a missing package each refused. 
   The five page readings and **all five node lookups** the legs make were run against the bench, where the answer is known, before any phone was 
   touched: the PIN field computes **16px** in a **48px** box with `min-height:48px`, and the filter sheet 
   paints **16 rows at exactly 44px, none below the floor, at 15px type**. That pass also caught the 
   instrument, not the app: the first reachability reading called the last row unreachable because it never 
   consulted a scrolling ancestor, and corrected, the row is reachable through `sheet-body` (833px of content 
   in a 660px box) — which the eight-corner sweep had already implied, since it reports 0 unreachable 
   controls. A walk that began on the phone would have filed that as a defect in the application.
   **One stage needs the owner's say-so, and the driver says which.** At the `font_scale` these phones
   were left at (1.0, restored after walk 8) the reading above can only prove the phone *agrees* with the
   bench; §68's claim is that a `rem`-sized field is multiplied **after** CSS resolves, and that is only
   observable with the text turned up. `node tools/device-legs.cjs --scale=1.35` reads the PIN field and
   the sixteen filter rows again at that scale — reporting the measured factor, the rendered size it
   implies, the box heights and the 44px verdict — then restores the previous value through an `exit`
   hook as well as on the happy path (walk 8's first driver died between enabling TalkBack and restoring
   it, which is why restoration is not the last line of a success branch) and proves the restore by
   **reading the setting back** rather than remembering it. It is opt-in because this is the owner's
   handset: ask, get a yes, then run it. The stage sits *after* the device gate, so it cannot change a
   setting on a phone that is not there — verified: `--scale=1.35` with nothing attached prints `NO DEVICE`
   and touches nothing.

   **Partly answered 2026-10-24 on an emulated frame, and the scoping matters.** No handset was on the bus, so
   the two surfaces were read on an AVD from this SDK's own `android-36/google_apis_playstore/x86_64` image
   (**Android 16, WebView 133.0.6943.137**) carrying this same `1.2-preview.39`, install proved by reading
   `versionCode=41 / versionName=1.2-preview.39` back off the package. Three readings: PIN field at the
   default **`16px` specified in a `48px` box, `min-height:48px`, `meets44: true`, root `16px`, viewport
   393x851**; filter sheet at the default **16 rows, minH and maxH both `44px`, `below44: 0`, 15px type**;
   filter sheet at **`font_scale 1.35`** **16 rows, both heights `46px`, `below44: 0`, type `20.25px`** —
   15 × 1.35 exactly, so the platform multiplied the used type after CSS resolved while the `var(--tap)` floor
   held and was in fact exceeded by content; the sheet body's room moved from **834 in 668** to **884 in
   636**, which is why reachability asks the scroller and not the viewport. **The PIN field at 1.35 was
   refused by the frame** (`Runtime.evaluate timed out` — that expression paints twice and software rendering
   could not finish it), recorded as refused, not measured. None of this reads the vivo: a framework answers
   mechanism questions, not one handset's density or WebView build, so items 1 and 2 stay owed on the
   physical phones. Two instrument facts came with it: every reading was blocked by a **stale `tcp:9222`
   forward** that made the probe blame the app for a WebView that was exposing an inspector all along
   (`/proc/net/unix` showed `webview_devtools_remote_1831`; `adb forward --remove-all` cleared it), and the
   combined reader had to be split into one surface per evaluation (`tools/device-leg-pin.js`,
   `tools/device-leg-rows.js`). `font_scale` was set back to 1.0 and read back as 1.0 before the emulator
   stopped.

3. **Closed 2026-10-24, and the item itself was the defect.** Walk 7 wrote that the vivo's WebView version
   "was never captured"; opening the log showed walk 5 had captured it, and `dumpsys webviewupdate` today
   answers the same `com.google.android.webview 155.0.8059.43`. What the earlier walk had got wrong was the
   release above. The parity is worth keeping for its own sake: the two handsets sit **one patch apart on the
   same Chromium build line** (.43 here, .45 on the OPPO), yet the key route selects a document on one while
   ColorOS refused four synthetic taps on the other — which locates that difference in the OEM shell, not in
   the WebView, and is the reason item 1 above stays open rather than being folded into "Android refuses
   this". Read and left alone at the time: `enabled_accessibility_services` is `null` and
   `accessibility_enabled` is 0, so TalkBack was off, and measuring what it *says* would mean turning the
   owner's accessibility service on — which they had ruled to leave as documented. **Changed 2026-10-24:**
   the owner then approved enabling it for the measurement and restoring it, Handset walk 8 did that, and the
   same two settings were read back at `null` and 0 afterwards. Device otherwise as walk 8 left it: `.38`
   installed (`versionCode=40`), `font_scale` 1.0 in the `system` namespace, signed out on the login screen,
   and the pushed fixture gone — the one `suki-*` file still in `Download/` is the owner's, dated 2026-10-11.

Everything else the `.37` list owed was put to a phone and is written up in *Handset walk 5*,
*Handset walk 6* and *Handset walk 8* above — the caption, the Insights figures, the `1039`, the second
provider's own header, the dialog tree, whether TalkBack speaks an opened dialog, the five-item nav at the
OPPO's own text scale,
and the sign-out confirmation as a second modal surface. What those walks could not automate with injected pointers is ColorOS
refusing a document row to a synthetic tap — four taps and one held press across two layouts, with the two controls that show
the injected input reaching that same window. The app's half of the promise was measured in a browser and
holds: a real `File` arrives, the screen paints only its name, no `blob:` or `data:` image exists.
*(Superseded in part by Handset walk 7: the same pick completed on the vivo through `input keyevent`, and the
no-bytes reading was repeated there against the real chooser rather than only in a browser. ColorOS on the
OPPO is the remaining refusal, and it has never been tried with keys.)*

One device-shaped thing was open because it is an owner question rather than bench work: whether either
provider or admin reaches a notification surface at all in this build (§27 is untestable for the other two
roles, as `tools/probe-notification-targets.js` reports every pass). **Decided 2026-10-24: leave it as
documented.** The owner declined both a per-role notification record family and an empty-state screen for it,
so the gap stays a sentence in `AGENTS.md` rather than a feature invented to make a check pass — §88's rule
that a doc section is not a requirement. Nothing here is owed on it.

TalkBack's *wording* is no longer on this list in
the same shape. Handset walk 8 turned the reader on, verified the service bound, opened a dialog that
`role=dialog` and `aria-labelledby` name, and found the announcement on the audio channel and nothing
anywhere that carries the words — so the remaining question is not *whether* it is spoken but whether it
sounds right, and that answer lives in a person's ears rather than in any log this machine can read.

And one flag that this file used to owe and no longer does: the OPPO `S4CUYTJB6HNNWC49` was found with the
app **uninstalled** and `svc power stayon` already cleared. Handset walk 6 installed `1.2-preview.37`,
found the nav floor rendering at 13.9995px, and the same device then took `1.2-preview.38` with the fix
and measured `10.38px` written / **14.013px** rendered (§89). Its text scale is 1.35 in the `system`
namespace — `settings get global font_scale` answers `null` and means nothing there — and its Accessibility
Menu is the owner's own setting, left alone.

**Decided 2026-10-21 and closed** —
- `color-scheme: only light` is declared in `:root`, with `--measure --dark` re-run afterwards across all
  73 screens to show it costs nothing measurable. Pinned by a hygiene check that also refuses a
  half-built `@media (prefers-color-scheme…)` block.
- One word for the role: the chip, a demo notification and — the real find — the provider dashboard's
  typed `<h1>` all now say *provider*. `node tools/falsify-declared-state.cjs`, 6 of 6.

**Decided to leave, deliberately** —
- The y-axis gutter is 2–3px short on the device engine and 0 on the bench at the same width, root font
  and screen. Not patched on the strength of a number only the phone can see; the ticks sit flush
  against the card's padding rather than clipped.
- Promotion. `Sukinnect.html` is still `origin/main` and untouched (proved with
  `git diff --quiet origin/main -- Sukinnect.html`), so the floors the rebuild earned are proven for
  `Sukinnect-next.html` and unproven for the file a reviewer opens today. The owner's ruling is to
  **refresh PR #9 rather than merge it** — done 2026-10-22 (70 commits then) and refreshed again 2026-10-23.
  The totals are deliberately *not* repeated here: `gh pr view 9 --json body -q .body` is the live table, and
  the four numbers this bullet hand-carried had all moved by the time the sentence was re-written — the same
  drift §90 and §91 are about. The pull request
  describes the rebuild it actually carries and what merging would ship unverified, and stays OPEN. The merge
  button is still a human's, and the handset legs above are the
  reason it should stay that way for now.

