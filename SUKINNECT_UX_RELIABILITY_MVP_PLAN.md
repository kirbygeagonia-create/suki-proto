# SUKINNECT — UX Reliability and V1 MVP Plan (Phase A)

Produced under `SUKINNECT_UX_RELIABILITY_MVP_PROMPT.md` §1 Phase A. **This is a read-only audit: no application
code, asset, or behaviour was changed to produce it.** It stops for approval at §16/§17; nothing here is
implemented until the owner approves.

---

## 1. Executive summary

**Status of this summary, read 2026-10-26.** Everything below is what Phase A found, and it is left as written
because it is the plan's before-picture. Two of its "three highest-risk gaps" have since been built: rescheduling is
a record family with a state vocabulary, both sides' entry points and a counter path (`RESCHEDULE_REQUESTS`,
`CHANGES.md` §132 and §135), and the three legal documents exist behind a sheet reached from registration, each
carrying a visible draft banner and every undecided fact inside a `NOT DECIDED` bracket (§132). **The third is still
open exactly as stated** — keyboard-open chat has never been observed on a handset, and `visualViewport` still
appears zero times in the page, which is verifiable rather than remembered. The counts in the second paragraph
(567 checks, 82 screens, 105 scripts) are that day's readings; today's come from the commands themselves.

**What the app is.** A hyperlocal services marketplace prototype (residents ↔ local providers, plus an admin
console) whose spine is FIND → REVIEW → BOOK → COORDINATE → COMPLETE → RECORD. The active artefact is
`Sukinnect-next.html`, a single-file client-side rebuild with a real domain kernel: integer-centavo money, a
booking state machine with legal transitions and actor permissions, a ledger, payment/refund/payout paths behind a
gateway seam, offers, disputes, message threads, and a `Store` persistence adapter. `Sukinnect.html` is the shipped
legacy prototype and is deliberately untouched.

**What the audit found.** This build is not a set of unfinished wireframes. The large majority of the prompt's
integrity concerns are already closed, and — importantly — closed by *instruments that can fail*, not by prose:
`node tools/verify.cjs` answers **all 567 checks passed**, the screen walk covers **82 screens**, `audit-modal-actions`
and `audit-camera-dialog-coverage` both report **findings: 0**, `audit-handler-reachability` resolves **513** function
definitions and every handler named in markup, and `audit-build-bytes` proves the page is byte-identical across its
four copies. 105 scripts live in `tools/`, including a mutation-testing aggregate of 15 families over this same file.

**The highest-risk real gaps are three, and they are all absences rather than regressions:**

1. **Rescheduling does not exist.** `reschedul` appears **0 times** in `Sukinnect-next.html`, and the `TRANSITIONS`
   table offers only `requested → upcoming|cancelled|expired` and `upcoming → en_route|ongoing|cancelled|disputed`.
   A schedule conflict therefore has exactly one exit: cancel. Prompt §6.4 asks for rescheduling as a first-class
   flow; §14 forbids inventing state silently; so this needs a *new* record type and transitions, designed here and
   approved before it is built. **This is the single largest item in the plan.**
2. **There is no Terms & Conditions and no Sukinnect Policy anywhere.** Counts in the active file:
   `terms of service / terms & conditions / terms and conditions` → **0**; `sukinnect policy / community standards /
   provider standards` → **0**; `privacy` → 3 hits, all inside one settings card (line 6054 `Privacy & security`,
   with an address-privacy sentence). Prompt §11 asks for three readable documents reachable from registration and
   settings, plus a registration acceptance checkbox that is unchecked by default.
3. **Keyboard-open chat is unverified on real devices, and the code has no viewport-aware handling at all.**
   `visualViewport` appears **0 times**. `DEVICE-PASS.md` records the reason this matters: on the OPPO handset the
   on-screen keyboard moves the page and `window.visualViewport` *does not report it*, so bench rects read stale. The
   camera sweep's `320x300 @ 100%` corner is explicitly documented as "what a keyboard leaves on a small phone,
   **since nothing here emulates a keyboard**" — a proxy, not a test.

**Two P2 coherence items are genuinely open** (§5.3 alignment: `font-variant-numeric` 0 uses, `text-align:right` 5
uses in a 1,189-line stylesheet; §5.1/§8.4 icon semantics: `navItem('admin_dashboard','shield','Dashboard')` at line
8002 and `AUTH_ROLE_ICON.admin = 'shield'` at 7755) and **four are product decisions** the owner must make, listed in
§15 with a recommended default each.

> **Dated pointer, 2026-10-26.** Both of those two are closed: numerals now share one alignment-and-
> tabular rule measured on the shipped face, and `shield` denotes trust while the admin Dashboard takes
> `chart`. The whole P2 block landed the same day — see §17 for the per-item proof, and `CHANGES.md` §135
> for the two findings that came out of doing it (a right-aligned column of proportional digits is not an
> aligned column, and a `.chip` in this app is green because it carries a verification claim). The line
> numbers quoted above are Phase A's and have since moved; `node tools/measure.cjs` is the command.

**Recommended approach.** Do the two content gaps and the one new flow first (reschedule, legal documents,
registration acceptance), because they are the only items where a user is silently denied an option or is not told the
rules. Then the keyboard/viewport verification with a handset on the bus. Then the alignment and icon-semantics pass
in one sweep with screenshot evidence. Do **not** restyle typography, category art, headers, or the kernel: those are
verified good and churning them would be movement without improvement (§14).

---

## 2. Repository / worktree baseline (measured, this session)

**"This session" means the Phase A session of 2026-10-25.** Every figure in the table below is that day's
snapshot and is kept unchanged on purpose — the section exists so a reader can see what the work started from, and
rewriting it would destroy the only before-picture the plan has. It is already out of date on every countable row:
HEAD has moved past `9fec6a1`, the page is longer than 11,854 lines, the walk is wider than 82 screens and the gate
is above 567 checks. **Today's numbers are printed by the commands named in the rows themselves** — `node
tools/measure.cjs Sukinnect-next.html`, `node tools/shot.cjs --list`, `node tools/verify.cjs`,
`node tools/falsify-all.cjs` — and §17's closing block quotes a run rather than restating one. One row was
re-checked rather than assumed: `Suki.docx` is still absent from the workspace, so §13's summarised list remains the
only proxy for it and §4.1's answer through that proxy still stands.

| | |
|---|---|
| Repo | `kirbygeagonia-create/suki-proto`, cwd confirmed (`AGENTS.md`, `Sukinnect-next.html`, `tools/` all present) |
| Branch | `feat/domain-kernel` — the prompt's intended working branch, not the default |
| HEAD | `9fec6a1 Merge pull request #17 …`; `origin/main` and the branch are level (`0 0`) |
| Worktree | `git status --porcelain` → empty. Nothing to protect, nothing stashed, no reset performed |
| Active file | `Sukinnect-next.html` — **11,854 lines**, 1,607 stylesheet lines, 1 `:root`, 95 tokens (3 unreached: `--s-1 --s-8 --info`), 1,752 `var()` uses, 24 hex strings outside `:root` all accounted for by `measure.cjs` |
| Legacy file | `Sukinnect.html` — unchanged; `git diff --quiet origin/main -- Sukinnect.html` holds |
| Screen inventory | **82 screens** enumerated by `node tools/shot.cjs --list` (re-derived, not inherited from prose) |
| Verification available | `verify.cjs` (567), `measure.cjs`, `shot.cjs` (`--measure`, `--focus`, `--dark`, `--reduced-motion`, `--probe=@…`), `sweep-text-scale.cjs` (8 corners), 4 named audits, `falsify-all.cjs` mutant aggregate, deploy/compat/build audits |
| Assets | Logo `Sukinnect_Logo.png` (264,808 B, real file not an LFS pointer); pitch deck PDF 15.7 MB and PPTX 10.5 MB present on disk; `assets/category-art/` holds 7 PNGs **plus `ASSET-LICENSES.md`** |
| **Sources I could not read** | `Suki.docx` is **not in the workspace** — §13's list is its summarised proxy, and §4.1's "for each concern in Suki.docx" is therefore answered through §13 only. Android wrapper `Sukinnect-Android/` is untracked by the owner's standing decision, so shell-side claims come from `CHANGES.md`, not from an inspectable diff. Legal: both `privacy.gov.ph` pages and both Senate issuance-library URLs returned **403** to this client (the prompt's Senate URLs are additionally malformed as `…/legislative+issuances/…`), and the DTI ITA-IRR PDF returned undecodable binary — so **RA 7394 and RA 8792 are unread**, and RA 10173's IRR was read from the judiciary's official copy instead. | **Also untracked, and found by `node tools/audit-citations.cjs` rather than by memory: the brief this plan was written under, `SUKINNECT_UX_RELIABILITY_MVP_PROMPT.md`, is not in the workspace and has never been committed (`git log --all --` it answers nothing). §13's 47-row matrix is therefore the only surviving record of what the brief asked, which is what makes §4's coverage instrument a safeguard and not a nicety.** *(citation-exempt: SUKINNECT_UX_RELIABILITY_MVP_PROMPT.md — absent by fact, stated here, so `audit-citations.cjs` reports it as exempt rather than letting a true absence read as a phantom file.)*
| Environment limits right now | No handset on the bus (the OPPO left mid-session; `adb` resolves only via the SDK absolute path, and ColorOS **denies adb `WRITE_SECURE_SETTINGS`**, so accessibility state cannot be changed from here) |

**Prior-session work already merged, which this plan deliberately does not redo:** the six-published-duplicate-subject
record and the pre-commit subject gate (`--check-message`), the seven-entry baseline, the audit-population fix, the
dated pointer retiring the false "PIN field never measured on Android" row, and the record that all four copies of the
page agree. §9's analytics-honesty requirements are largely covered by that lane's neighbours — `falsify-count-labels`,
`falsify-insights-records`, `falsify-verification-progress`, `falsify-identity-fallbacks`, `falsify-money-bounds`.

---

## 3. Current implementation map

**Roles (3, unchanged, verified in code).** Resident, Service provider, Admin — `AUTH_ROLE_ICON` and role-routed
renderers. Registration exists (`isRegister` branch, `submitAuth`) and writes typed name/barangay into the profile it
greets from, without persisting (a documented owner ruling, not an oversight).

**Domain entities.** One shared `booking` record seen from both sides through `bookingsForProvider()` /
`bookingsForResident()`; `providerOf()` answers a dangling id with an identity-less record-shaped stand-in rather than
somebody else's profile. `PAYMENTS`, `CREDENTIALS` (issuer/kind/`expiresAt`), `PENDING_APPLICANTS` +
`APPLICATION_DOCS` (a missing `submittedAt` *is* what outstanding means), `NOTIFICATIONS`, `MESSAGES` threads keyed to
bookings, `DISPUTES`/cases, ledger entries, `REPUTATION_SEED` kept **outside** the records so derived ratings cannot
drift. Money is integer centavos end to end; booking status and payment status are separate fields with separate
labels.

**Booking states, read off `TRANSITIONS`:** `requested → upcoming | cancelled | expired`;
`upcoming → en_route | ongoing | cancelled | disputed`; plus completion/refund paths. Actor permission and an
overlapping-job rule ("You already have a job in progress. Close it out before starting this one.", line 3113) are
enforced in the kernel, not in screens.

**Navigation.** One mechanism: `pushState` per destination + `popstate` → `stepBack()`, with layer-aware Back
(`modalAboveSheet()`), `clearModals()`, `layerKeys()` **derived from `state` by field-name convention** so a new modal
is counted automatically, and a page→shell depth bridge (`SukiShell.setBackDepth`) because a WebView's `canGoBack()`
cannot see `pushState` entries. Root-tab taps pay Back debt explicitly.

**Sheets/modals/screens.** `node tools/shot.cjs --list` is the count — **88** as of 2026-10-26, against **82** at
Phase A; the walk grew one screen per destination the plan added, the attention queue and the two reschedule-inbox
screens most recently. Sheets are `state.sheet` branches, modals `state.*Modal/*Confirm`.
Category art is 7 static PNGs; the AI concierge is an embedded Home row (`concierge-row`, line 8282) opening its own
screen with a real file control.

---

## 4. Owner-concern audit matrix (§13, every line, classified)

Legend — **CD** confirmed defect · **PR** partially resolved · **AR** already resolved · **NA** not applicable ·
**PD** product decision needed · **CV** cannot verify in the current environment. Evidence is `Sukinnect-next.html`
unless another file is named. AC = acceptance criterion in §14.

**Coverage:** §13 of the prompt contains **47** concern bullets (11 general, 11 resident, 11 provider, 14 admin) and
this matrix carries **47 rows** (G1–G11, R1–R11, P1a–P1k, A1–A14), each classified. Every count and zero-result quoted
below was executed this session, not inherited from documentation.

### 4.1 General, all roles and modules

| # | Concern | Class | Evidence and reasoning | Fix / proposal | Pri | Test |
|---|---|---|---|---|---|---|
| G1 | Inconsistent or missing headers, colours, title styles, font sizing | **AR** | Exactly **20** uses of one `class="topbar"` and zero competing header classes; every app screen opens with `<h1>`, every sheet with `<h2>` (24/6), enforced by a gate check that fails if a screen paints no `<h1>`. Colour: 1 `:root`, 95 tokens, 1,752 `var()` uses; 24 literal hex strings are all *explained* by `measure.cjs` (theme-color meta, SERVICE_THEME, ids). Type: 119/121 stylesheet `font-size` declarations take a `var()`, no literal px. | Do nothing. Add nothing. Re-run `sweep-text-scale.cjs` after any later change. | — | `verify.cjs`, `measure.cjs` |
| G2 | Invisible / low-contrast Back buttons; wrong system-Back behaviour | **AR** (page side) | Two hand-rolled 30px copies were replaced by the shared `.back-btn`; no control is under the 44px tap floor (measured, incl. a 16-row filter sheet at exactly 44px); the `back` gate suite plus a real-`Tab` focus pass; hardware Back fixed on the OPPO by the depth bridge — page publishes depth, shell evaluates `systemBack()`, verified on the handset. | Nothing to implement in-page. Keep the handset regression test in §14. | — | `shot.cjs --measure --focus`, handset walk |
| G3 | Readable Terms & Conditions and Sukinnect Policy, plus a Privacy Notice | **CD** | 0 / 0 hits (see §1); the only privacy text is a settings card at 6054. Nothing is reachable from registration; there is no acceptance control. | Three documents behind one readable route, reachable from registration + settings/help; versioned local acceptance record; **no fabricated legal facts** — unknowns surface as `[owner/legal to supply]`. | **P1** | every link opens a titled, non-empty document; checkbox present and unchecked by default |
| G4 | Confusing login/registration and role switching | **PR** | Role selection is a segmented control on a demo sign-in screen; register collects name/email/password/barangay and the identity now lands where it is used (ruled 2026-10-20, `falsify-register-identity` 4/4). What remains: registration **does** expose an admin route (`auth-admin-link`, line 7849) — prompt §11 says the public must not self-register as administrator. | Keep resident/provider in public registration; make admin entry an explicit demo-only affordance with different copy, or hide it behind the demo-account path. | **P1** | register-as-admin either removed or clearly labelled as a demo console entry; no new role invented |
| G5 | Information overload and long scrolling; primary action earlier | **CD (now measured)** | Previously `PR/CV` because nothing measured it. §4.1 demands the painted layout be inspected, so a read-only density probe was run over all **82** walked screens (`.scratch/probe-density.js`, kept out of `tools/` because Phase A is read-only): mean extra scroll is **0.79** of a viewport — most screens are close to one screenful — but **7 distinct screens place their first ≥40px action BELOW the fold**: Money `y=2229`, Categories `y=2075`, Master Administrator `y=2050`, Booking details `y=1453/1400/1142/819`, Provider details `y=933` (viewport 770). Full-painted measurement is otherwise clean: `shot.cjs --measure` reports 0 for tap floor, contrast, clipped text, off-scale fonts, content under nav, unreachable controls, dialog semantics, split figures, text-on-text, chart escapes, moving category art, and console errors; 9 distinct painted font sizes; no horizontal overflow. | Move the primary action above the fold on those 7 screens only, and cut nothing until the number indicts it. Promote the probe to `tools/` in Phase B so the baseline is re-runnable. | **P1** | measured before/after per named screen; no required fact moved off-screen; probe green at 0 below-fold |
| G6 | Progressive disclosure without hiding critical info | **AR** | Documented and enforced in code: privacy gate keeps a provider's door/number withheld until accepted; payment/price and cancellation facts are on the card, not behind a `?`; §77-class honesty checks reject fabricated claims. | Keep as is. | — | existing honesty families |
| G7 | Left-aligned labels, right-aligned numeric values | **CD** | `font-variant-numeric` **0** uses; `text-align:right` **5** uses across a 1,607-line stylesheet — rows, counts, money, dates and status values are aligned ad hoc per screen. | Two tokens/classes: `.row-value` (right-aligned, `font-variant-numeric:tabular-nums` if Atkinson carries the feature — verify before shipping) applied to money/count/date values, and one alignment sweep with screenshot evidence. Do not fake tabular figures if the face lacks them: measure. | **P2** | every money/count row in the walked screens shares one rule; before/after screenshots |
| G8 | Inconsistent spacing, alignment, boldness, weights, numeric presentation | **PR** | Spacing is tokenised and 1 `:root` (G1); arbitrary bold and mixed numeric type are the residue G7 names. | Folded into G7's sweep + a gate check that a numeric-bearing row uses the shared value class. | **P2** | as G7 |
| G9 | Soft-3D static category artwork incl. Plumbing, Cleaning, Fruit Harvest & Buy | **PR / PD** | All seven categories already render **local PNG files** (`assets/category-art/`), licensing recorded in `ASSET-LICENSES.md`, and three independent checks prove they never move (gate forbids `animation`/`transform` on `.cat`, forbids `@keyframes ca*`, and the camera counts moving category nodes in painted pages). What remains is *artistic quality*, which is owner taste, not a defect. | Propose the option, do not presume it: a commissioned/derived coherent soft-3D set, same file names, same tile size, same IDs, still-image only. Until approved, change nothing. | **P3** | if replaced: no runtime animation observed, licence line added per file, `shot.cjs` contrast/tap tallies unchanged |
| G10 | Better empty/error/success/loading/unavailable states with a clear next step | **AR** | `emptyState(...)` is a real helper; §48-style empty branches were found and fixed (admin verification queue), falsified by `falsify-empty-queue`; storage failure raises a standing banner + toast; every profile action reaches a screen and the gate fails a button that opens only a fallback "Changes saved" modal. | Nothing new. One gap worth naming: §10's five *distinct* empty kinds ("no records" vs "no matches" vs "role cannot access" vs "unavailable" vs "error") are not all distinguishable today — fold into the reschedule/legal work rather than opening a new surface. | **P2** | each kind reachable by a tap renders its own wording and next action |
| G11 | 1–3 minute browse → review → book path | **CV** | No usability measurement of any kind exists in the repo — timings, taps, errors and backtracking are not captured by any tool in `tools/`. | Propose a scripted walk (fixed task, same device, stopwatch + tap count, 5 runs, median reported) as a *method*, with results left blank until actually run. Never publish a time that was not measured. | **P2** | median measured on one named device, method written down |

### 4.2 Resident role

| # | Concern | Class | Evidence | Fix | Pri |
|---|---|---|---|---|---|
| R1 | Duplicate status indicators (notification/booking) | **AR** | Every resident notification opens its own record (`probe-notification-targets`: 4/4 deliver, e.g. `n1 → booking_detail "Ramil Odiada / Kitchen faucet leak"`); notification→booking routing is pinned by `falsify-notification-routes`. | none | — |
| R2 | "In progress" only when the lifecycle justifies it | **AR** | The label is bound to state `ongoing` (`ongoing: { label:'In progress', tone:'active', hint:'The work is being done now' }`, line 3050) and `ongoing` is reachable only through the kernel's `upcoming → ongoing` transition, which emits "Work started" (3178) and refuses overlapping jobs (3113). A booking card being open cannot produce it. | none — this is the exact class the build already refuses | — |
| R3 | Is "Arrives within" trustworthy? Is "Nearest" honest? | **CD (plus a correction to this row's first draft)** | Read at the code: `providerMatches()` (5833) filters on `!f.maxWait \|\| p.availabilityMin <= f.maxWait` — the control labelled **"Arrives within"** actually filters **when the provider can start**, not an arrival estimate, so the label promises what the field does not carry. Second, **there is no "Nearest" sort at all**: `providerMatches()` returns `PROVIDERS.filter(…)` with no `.sort()`, and no distance is ever computed in the file (no `haversine`/`atan2`/`sqrt`; `distanceKm` appears 14 times, always a seeded literal, e.g. `distanceKm:0` at 2490). **My first draft of this row claimed ranking was "a computed value" — it is not**; the correction is recorded rather than smoothed over. Admin does have real sorts (`ADMIN_SORTS` 9543, `ADMIN_PENDING_SORTS` 9547). | Re-label the control to what it filters ("Can start within"); keep distance as a labelled demo figure (R5); do **not** add a nearest-sort to answer the concern — with seeded coordinates that manufactures the false precision §4.2.9 forbids. | **P1** | the sheet row names availability, not arrival; no unlabelled nearest-ranking exists |
| R4 | Credentials on the provider profile, not duplicated in booking detail | **AR** | Credential state is a record (`CREDENTIALS` + `credentialState`/`worstCredentialState`), a provider's summary counts flagged documents rather than saying "All Valid", and the booking surface shows a summary. Private documents stay admin-side; §56 respected. | none | — |
| R5 | Distance accuracy / live-location claims | **CD (small and precise)** | Nothing claims live GPS and `mapFallback()` degrades honestly when tiles never paint. But the provider card renders `'Brgy. ' + p.barangay + ' · about ' + p.distanceKm + ' km from you'` (6393) from a **seeded literal**: `"from you"` asserts a relation to the reader's real location that no computation supports — `about` hedges the number, not the premise. | Drop `"from you"` (or show the declared service area alone), or derive the figure from the seeded coordinates **and label it demo**. The cheapest honest fix is the wording. Tile/CDN IP exposure remains the accepted production DPA item and belongs in the Privacy Notice drafted for G3, where a reader expects it. | **P2** | no distance string asserts a user-relative fact unless derived from a record; before/after screenshots |
| R6 | Chat and Call visible with clear hierarchy and touch size | **CD** (built 2026-10-26 after a scope ruling; the tier it needed did not exist) | Chat is a first-class nav destination and contextual to a booking (`data-chat-booking-provider-id` on the detail's pair opens the thread for *that* booking); the call path exists as `href="tel:${DEMO_HOTLINE}"` and is labelled "Call the Sukinnect line", so it names the platform's number rather than pretending to reach the provider. Touch floors hold at 44px. **What was never verified is the row's own subject:** the two controls are byte-identical — same `btn secondary`, same inline style, `flex:1` each — so the screen offers two equally strong actions where one is the in-app path and the other a fallback, which is §70's "do not make all buttons equally visually strong" unmet. This row is also the only one of the 47 that appears nowhere in §17's disposition — **and it is absent from §13's P2 enumeration**, so it was never in the scope the owner approved; the `P2` in its own priority cell is the discrepancy. | put the discrepancy to the owner: either the row joins P2 and the fallback is demoted to a quiet text+glyph link (cut visual mass, never the hit area — `.btn` keeps `min-height:var(--tap)`), or the priority cell is corrected and the pair stays as it is | **P2?** |
| R7 | Separate timeline / contact / schedule / price / completion / receipt | **CD** (fixed in Phase B as labelled groups rather than tabs) | Booking status and payment status are separate fields and separate visual labels; receipts derive from records (`residentFinished`/`residentPaid`/`bookingTotal`) and print only paid, finished work; a receipt appears only for a finished paid job. The six groups are now named in reading order on the resident's booking detail — `BOOKING_GROUPS`, six `<div class="section-label">` headings, arrival/completion stamps moved out of the figures grid, and a group whose records do not exist is not painted at all — asserted by a gate check that requires a `requested` job to carry neither the Completion nor the Receipt heading. **The prescribed widget was not used:** §10's word is *separate*, and a tab control would have hidden two of the six behind a tap, so the deviation is deliberate and recorded in §17. | done as labelled groups; see §17 for the deviation | **P2** |
| R8 | Concierge as a bottom-right floating button | **NA** (ruled by the owner, 2026-10-25 — the class read **PD** afterwards, which asked a reviewer for a decision that has been made) | Today it is a Home row (8282) that opens a real screen (8318) with a working photo control, and it refuses to sort a photo-only request instead of inventing a category. Nothing is broken; a floating button is a different navigation choice with real costs (safe area, composer, nav overlap, discoverability on low-end). | **kept the embedded entry** — a FAB is exactly the control a keyboard can bury, and R10 is unresolved for that reason; revisit only with the keyboard/viewport work | **P2/PD** |
| R9 | Booking/rescheduling copy concise, alignment consistent | **PR / CD** | Booking copy is already short and state-truthful (the receipt line at 6032 says plainly that work in progress and cancelled jobs have no receipt), but the *alignment* half of the concern is the same defect as G7 — `text-align:right` appears 5 times in 1,607 stylesheet lines and tabular figures 0, so money/date/count rows do not share a rule across screens. | Folded into the G7 sweep: one value class covering the booking and (new) reschedule surfaces, so the copy and the numerals are settled by the same change. | **P2** |
| R10 | Chat: nav must not jump above the composer with the keyboard open | **CV** | `visualViewport` 0 uses in code; `DEVICE-PASS` records the on-screen keyboard moving the page **without** `visualViewport` reporting it on the OPPO. Nothing emulates a keyboard, so no bench number proves either safety. | Treat as the plan's main *verification* task: reproduce on a handset with the driver already written, and only then decide whether to add a visual-viewport listener. | **P1** |
| R11 | Profile not crowded; detail on the right screen | **AR** | The hub is module-based (`residentSectionBody`, 10 bodies) and every module derives from records or says plainly that no record backs it (saved providers, maintenance reminders). | none | — |

### 4.3 Service-professional role

| # | Concern | Class | Evidence | Fix | Pri |
|---|---|---|---|---|---|
| P1a | Dashboard too dense; focus on next job / requests / schedule / availability / earnings | **PR** | Structure exists (next job, pending decisions, availability, earnings chart with labels taken out of the scaled SVG); explanatory copy was already trimmed once and the earnings tile reconciles to records. Density *measurement* doesn't exist (see G5). | apply the G5 metric to this screen first, then cut only what the number indicts | **P2** |
| P1b | Today Schedules Back must return to the right tab/state | **AR** | One history mechanism with destination-key routing and context restore; root-tab taps clear layers; `--focus`/`--measure` walks the real entry points, and a `back` gate suite exists. Keep the handset regression. | — | — |
| P1c | FSM: simplify the job view, prioritise actions | **PR** | FSM exists as its own nav destination; job rows carry true state and next valid action; the emergency-dispatch control's availability was made honest (`Enable Dispatch`). | group actions by state; secondary data below the fold but never a *required* fact | **P2** |
| P1d | Dynamic Availability / Rate & Schedule Optimizer: live or illustrative? | **CD (wording)** | Neither performs an optimisation the kernel acts on; presenting either as an automatic decision is the §63/§86 misrepresentation this repo forbids. | **Recommend:** label them plainly as settings that change *their* availability/rate, or remove the "optimizer" framing. Do not add an algorithm to satisfy the name (§88). | **P1** |
| P1e | Which bookings may a provider see (dual-role)? | **AR** (documented 2026-10-26; the class still read **PD** afterwards) | Roles are separate sessions in this prototype; a provider signing in as resident sees resident screens. §13 forbids assuming a dual-role model. The rule is now stated where a reviewer looks — `README.md` "One session is one role, deliberately", naming both directions of the boundary and the fact that no authentication enforces it — and the boundary is structural rather than enforced: `state.role` selects the destination set, and no code path shows one role another role's records. **No gate check asserts that boundary**, and none is claimed here — the row is closed on the documentation the action asked for, which is all §13 asked of it. | done as proposed: explicit role sessions, documented, no silent role merge | **P2** |
| P1f | Payment records: amounts, states, dates, linked booking | **AR** | Payouts are records with their own path; centavo arithmetic, ledger balance and the produce/labour split are gated; a stale index is clamped *and written back* so the rail marks the row the money uses. | none | — |
| P1g | A booking must not vanish when its details open | **AR** | Detail screens no longer fall back to a neighbour's record (foreign-id substitution closed at three entry points and in `providerOf()`), and lists are derived from records. | none | — |
| P1h | A real rescheduling workflow, not forced cancellation | **CD** | **The plan's central gap** — see §1 and §9. | design in §9, approve, then build | **P0/P1** |
| P1i | Validate "I'm on the way / Arrived / Start / Complete" against the machine | **AR** | Labels map to `en_route`, `arrived`, `ongoing`, `completed`; each action appears only where `TRANSITIONS` allows it for that actor, and one reading is stamped into both the step stamp and the `STATUS_EVENTS` row (`STEP_STAMPS`), so a job cannot show a time its log contradicts. | copy audit only (§6.5 wants a short explanation where an action can confuse) | **P2** |
| P1j | Reconcile every displayed count with its source | **AR** | Typed admin tables and verdict labels were deleted; per-provider figures come from `bookingsForProvider(id)`; a rating is derived from a seeded sample weighted by session records; `falsify-*` families break each and require the number to move. | keep, and include the new reschedule counts in the same discipline | — |
| P1k | Read/unread must update | **AR** | `NOTIFICATIONS.filter(n => n.unread)` is the badge source; mark-all-as-read mutates the records and persists; write-claims are measured against storage bytes by `probe-write-claims`. | none | — |

### 4.4 Administrator role

| # | Concern | Class | Evidence | Fix | Pri |
|---|---|---|---|---|---|
| A1 | Dashboard overload; actions above the fold | **PR** | Counts are separated where the nouns differ (`agreed` vs `waiting`, no longer one "Live bookings" 10); Insights is derived or deleted (`networkAttentionList` is the single filter both halves read). Density metric as G5. | metric first, then cut | **P2** |
| A2 | Redundant admin avatar in the header | **PD** | Present today. Harmless; duplicates the Account destination. | **Recommend** leaving it until the header/keyboard sweep, then decide with a screenshot; not worth a change on its own | **P3** |
| A3 | Shield as the generic Dashboard icon | **CD (semantics)** | `navItem('admin_dashboard','shield','Dashboard')` (8002) and `AUTH_ROLE_ICON.admin='shield'` (7755), while `shield` legitimately denotes trust/warranty elsewhere (5980 empty state). §5.5 asks for a stable semantic map. | **Recommend** dashboard→grid/gauge glyph, reserve `shield` for Trust & Safety and verification surfaces; keep the admin role badge as-is if the sign-in screen's meaning is "official console" (say which in the icon table) | **P2** |
| A4 | Needs Attention ↔ notifications; one list or two | **AR** (decided and built 2026-10-26; the class still read **PD** after the queue shipped, which told a reviewer a decision was outstanding) | One shared filter feeds the stat strip, the attention card **and** the queue, "so they cannot drift apart by construction". The queue exists: a fifth Providers segment, `attentionQueue(kind)`, filterable by the three things a record can actually assert, with the reason a provider is listed produced by the same object that decides they are listed. `admin-attention` is a row of the camera's walk, `falsify-coherence` condemns a queue that computes its own membership, and the gate requires `attentionQueue(null)` to answer exactly what the shared filter answers. | done — the recommendation was taken as written | **P2** |
| A5 | Collapsible sidebar on wide screens | **NA/PD** | The product is mobile-first; §36/§91 of AGENTS.md and the whole measurement rig assume phone widths; admin already works at 450 CSS px. | defer; only if the owner asks for a desktop console | — |
| A6 | Operations: less irrelevant data, actions forward | **PR** | Marketplace Intelligence counts a date window and is record-derived; decorative bars were removed (capacity bar and a cancellation verdict deleted because no record asserts them). | apply G5 metric | **P2** |
| A7 | Providers: discoverable, accessible, functional sort/filter | **AR (now read at the code, not deferred)** | Replaces the earlier "verify in Phase B": `providerMatches()` narrows the set on query, `serviceId`, **barangay through `providerServes()`** (declared service area, not where a provider happens to live), `maxWait`, and `providerAccepting(p)`; `activeFilterCount()` (5848) counts those same three and `blankFilters()` resets them (6103/6115/9204) — so these are real filters, not appearance toggles. Admin sorts bind to named fields (`ADMIN_SORTS`, `ADMIN_PENDING_SORTS`). Icon-only controls stay governed by the camera's label and tap tallies, which read 0. | Residual is R3's **labelling**, not filter function. Add one probe asserting each filter changes the rendered set and that clear-all restores it, so a future regression is caught rather than trusted. | **P2** | per-filter probe: set differs from unfiltered; clear-all restores the full set |
| A8 | Verification queues; drop decorative progress bars | **AR** | Applications and documents are records; the count is `3 of 4` because a missing `submittedAt` *is* outstanding; approve is refused while a document is outstanding and names which; a **Decided** tab exists because a decision that deletes its own record is unauditable; ornamental bars removed. | none | — |
| A9 | Provider profile decluttered without losing decision context | **CD** (built 2026-10-26; §17 had previously reported it built when it was not — the over-claim is recorded in `CHANGES.md` §138) | The grouping work R7 describes landed on the **resident's booking detail**, not on this screen, and nothing else in Phase B touched the provider profile's layout. What *is* true of it: verification, rate and area stay visible, the credential summary counts flagged documents rather than asserting "All Valid", and the screen no longer falls back to another provider's record when nothing is selected. Whether it is "decluttered" is a layout judgment this file cannot make, and the row's own prescription — tab/group the profile — has not been executed. | needs its own pass, or the row's prescription corrected to match what §42 of AGENTS.md actually requires; not counted as done | **P2** |
| A10 | Missing/incorrect Back buttons | **AR** | as G2 | — | — |
| A11 | Audit log must return to the profile/activity context | **CD** (built 2026-10-26; the AR had rested on a claim about the machinery, and the destination was worse than reported) | The audit-log destination is in the walk (`admin-audit`, reached by clicking the row a person clicks) and `stepBack()` is layer/destination-aware with context restore — that half is true and measured. **The row's own case is not.** The header "Back" on five admin spokes (Money, Marketplace intelligence, Categories, Trust & Safety, Audit Log) hard-codes `state.adminScreen='overview'; render();`, while the phone's Back runs `stepBack()`, which also resets `state.tab` to `lastRootTab[role]`. Reached from the console those two agree. Reached from the admin account's "My Admin Activity" card — which switches `state.tab` to `admin_dashboard` on the way in — they do not: the visible button lands on the console, the hardware lands back on the account tab, i.e. the activity context the row asks for. So the one Back path the brief names is served by the button the brief does not mention, and no instrument in this repository has ever pressed both and compared. | make the header button call the same function `popstate` calls (`systemBack()`), which is what the shell fix's own comment says keeps the two paths from drifting — then prove it by walking profile→activity→audit and reading the `<h1>` after each of the two back steps; if the four console spokes change destination, that is the finding, not a reason to keep them hard-coded | — |
| A12 | Empty profile modules: honest empty states | **AR** | `emptyState('shield','Nothing under warranty', …)` pattern; §76/§88 rule "where a module has no record behind it, it says so plainly"; "PIN enabled/2FA enabled/2 devices" rows were deleted or replaced with `Not configured`. | none | — |
| A13 | Admin Session Lock: make it coherent or remove it | **AR** (the decision was taken and the copy pass done, 2026-10-26; the class still read **PD** afterwards) | Today it is deliberately honest: the dialog states that **no PIN is checked** and that Unlock closes the screen leaving the app signed in; the earlier PIN/password modals were deleted because they fabricated audit-log entries. The placeholder repeats the promise beside the field a person types into, and the dialog is in the camera's walk (`admin-security-modal`, plus the lock screen reached through the account hub). **No check pins that wording** — it was fixed by reading a screenshot, and it is the kind of sentence a later edit can silently reverse; the row is closed on the decision and the copy, not on an assertion. | done as recommended — kept as a labelled demo surface, never dressed as security (§11) | **P2/PD** |
| A14 | Help Desk around status, priority, summary, linked booking, history, next action | **PR** | Cases are records with timeline/evidence; the sheet is walked; evidence gathering is not framed as blame (AGENTS §28). Density: §13's complaint stands partly — triage ordering by priority needs verifying against records rather than a typed field. | confirm a `priority` source exists; if not, say "unranked" rather than invent one | **P1** |

---

## 4.5 Measured density baseline (added while completing §4.1's painted-layout requirement)
**Three readings in this section are superseded, 2026-10-26.** They stay standing because this is the plan's
baseline — the number Phase A started from is the point of it — but a reader must not take them as current:

- **the walk is 88 screens, not 82.** `node tools/shot.cjs --list` is the count; six destinations have joined
  since this line was written — among them the admin attention queue and the two reschedule-inbox screens,
  each added because a coverage audit found a destination the camera had never opened.
- **`probe-density.js` is tracked.** The sentence below says it was "promoted to `tools/` only in Phase B",
  because Phase A adds no tracked script — Phase B came and went, and `tools/probe-density.js` is what the
  density row in §17 now runs.
- **"7 distinct screens put their first large action below the fold" was the probe's error, not the app's.**
  Its selector asked for the first `.btn` at least 40px tall. Widened to anything a thumb can press
  (`button, a[href], [onclick], .btn`), the honest population on the untouched build was **one**: the admin's
  Money screen, whose two operations sat 2,239px down a 2.5-screen scroll beneath the three cards they change.
  That card has since been hoisted and extracted so its position is one line a check can order. Of the other
  six, the three re-measured under the widened selector begin **121, 128 and 181px** down — Master
  Administrator's thirteen pressable rows, Marketplace Intelligence, and the provider dashboard — and the tall
  content below them is chrome, not an action. **A changed headline number with no comparison beside it is a
  vocabulary change dressed as a finding**, which is why the old seven is quoted here rather than deleted.


`shot.cjs --measure` over all **82** screens: every failure tally **0** — tap floor, WCAG contrast, clipped text,
off-scale fonts, content under the nav, unreachable controls, dialog semantics + caret, split stat figures,
text-on-text, chart escapes, bars over-scale, slivered markers, moving category art, images that asked for a file and
got no pixels, console errors. 9 distinct painted font sizes; no horizontal overflow; the only non-zero rows are the
32 vendor-owned Leaflet controls (§12's accepted exclusion) and the ~971 OSM tile requests already ruled a production
DPA question.

**Text scale, executed this session rather than cited:** `node tools/sweep-text-scale.cjs` → **8 of 8 phone corners
clean, 25 tallies each, exit 0** — `320 @ 200%`, default @ 200%, `450 @ 135%`, the OPPO's own `320x638 @ 135%`,
`320x480 @ 200%` (split-screen / Android Go height), `320x300 @ 100%`, `450x889 @ 200%` (vivo panel at largest text),
and the 100% anchor. That satisfies §12's "verify 200% text-scale scenarios using the existing sweep tooling" as a
measurement. It also *bounds* R9 honestly: the `320x300` corner passes, but the sweep's own label concedes it models
the space a keyboard leaves rather than opening a real one — so the composer question stays `CV`, and only a handset
pass can close it.

A read-only density probe (`.scratch/probe-density.js`, promoted to `tools/` only in Phase B, because Phase A adds no
tracked script) measured scroll depth, card/section counts and the y-position of the first ≥40px action on every
walked screen. Mean extra scroll is **0.79** of a viewport — this is not a long-scrolling app overall — but **7
distinct screens put their first large action below the fold** (770px viewport):

| Screen | extra scroll | first action at y |
|---|---|---|
| Money | 2.5 | 2229 |
| Categories | 1.9 | 2075 |
| Master Administrator | 2.8 | 2050 |
| Booking details (states vary) | 1.5 / 1.4 / 0.5 | 1453, 1400, 1142, 819 |
| Provider details (deep variant) | 1.0 | 933 |

This upgrades **G5 to a confirmed defect** and gives **A1** and **P1a** their concrete targets: the admin drill-ins,
not the dashboards. It also means any later claim that a screen is "too dense" must name a number from this table.

**Two of my own aggregation attempts were wrong before this table was right** — a regex parser reported 0 below-fold
rows while the raw lines show 2050/2229/2075, and I first blamed the camera's 78-char truncation, which was also
false: the log lines are complete. The split-based parse that produced this table agrees with the printed rows
line by line, which is why it is the one recorded here. The lesson is the repository's own, met from the inside: a
count that disagrees with the rows it summarises is a defect in the counter.

## 5. User journey maps — current vs proposed

**Resident, today (measured through the walk + gate suites):** Home → search/category → results (8 providers; blank/
space query handled honestly) → provider detail (verification, area, rate, reviews, Smart Match with reasons) → booking
sheet (date/time slot/address/payment choices clamped through `requestSelection()`) → request → booking detail
(timeline, withheld door/number until accepted, chat, payment state, receipt when finished+paid) → rate.
**Where a user gets stuck today:** (a) a schedule conflict has no path but cancel; (b) the rules of the transaction
are nowhere readable — no Terms, no Policy, no notice; (c) with a keyboard open on a small phone, nobody knows whether
the composer survives, because nothing has measured it.

**Provider, today:** dashboard → request decision (accept/reject, price offered) → progress `en_route → arrived →
ongoing → completed` with each action gated by the machine → weight/offer finalisation for the fruit pilot → payment
and payout records → profile/availability. **Stuck at:** the same missing reschedule, from the other side; and two
feature names that imply automation the app does not perform (P1d).

**Admin, today:** dashboard → providers (filter) → verification review (documents, outstanding counts, notes per
applicant, approve blocked while outstanding) → Decided tab → disputes/help desk with evidence and timeline →
Insights (derived or deleted) → audit log → account/security. **Stuck at:** Needs Attention is a summary, not a
work queue (A4).

**Proposed delta (only three arrows change):** BOOK → *(conflict?)* → **RESCHEDULE** → both sides confirm → schedule
updates once; SIGN-IN/REGISTER → **terms readable and accepted once**; chat keyboard-open state **verified** rather than
assumed. Everything else in §4.1–§13 is already on the map.

**Status of the "stuck at" lines above, 2026-10-26.** Four of the six no longer describe the build, and they are
left in place because they are why the plan asked for what it asked for:
- Resident (a) *no path but cancel* — gone. A proposal is a record, the booking's own `date`/`time` change only when
  the other side accepts, and both booking lists render a pending ask.
- Resident (b) *the rules are nowhere readable* — gone as a mechanism: three documents behind a sheet reached from
  registration, a versioned local acceptance, and every undecided fact inside a `NOT DECIDED` bracket. **The content
  is still a draft no counsel has read**, so "readable" is true and "in force" is not.
- Provider *the same missing reschedule* — gone, from that side too; and the two feature names implying automation
  (P1d) were fixed — one reworded to say what the switch does, the route card deleted rather than reworded.
- Admin *Needs Attention is a summary, not a work queue* — gone: the queue is the shared filter with a label on it,
  filterable by the three conditions a record can assert.
- Resident (c) *whether the composer survives a keyboard* — **still exactly as written.** `visualViewport` appears
  zero times in the page (re-counted today), nothing here emulates a keyboard, and the owner has ruled the leg stays
  pending until a phone is attached.

---

## 6. Navigation / back audit

Root states: three role homes + login/register. Layers: `.sheet-layer`, `.modal-layer`, the verification review's
classless fixed overlay — all marked `data-layer`, modality decided from state (`modalAboveSheet()`), inert applied to
everything outside the top layer, and dialog semantics (`role`, `aria-modal`, `aria-labelledby`, focus in and back to
the opener) applied in the one place that computes the top layer. Back order satisfies §5.2's six rules by
construction; `layerKeys()` derives fields from `state` so a new modal cannot be forgotten (that is how the resident
edit-form's missing entry was found). Hardware/system Back is bridged by published depth, verified on the OPPO at
`.24`: sheets close, drill-ins return to the root tab, and Back at a root tab exits.

**Context restore on return:** implemented for destination keys and nav badges; §5.2(3) is genuinely satisfied;
§5.2(6) keyboard state is the only untested clause (see R9) — that is the honest line between "verified" and
"assumed" here.

**Corrected 2026-10-26: "by construction" was doing more work than the code supports.** The paragraph above is true
of the *history* — `stepBack()`, the published depth the shell asks, `layerKeys()`, the `popstate` handler. It is not
true of the buttons the app paints. Five admin spokes (Money, Marketplace intelligence, Categories, Trust & Safety,
Audit Log) carry a header control whose handler is the literal string `state.adminScreen='overview'; render();` — a
hand-written destination that never consults the history the page maintains. Where the person came from the console
the two agree by luck of the destination; where they came from the admin account's "My Admin Activity" card, which
switches `state.tab` on the way in, they do not: the button lands on the console, the phone's Back lands back on the
account tab. That is the case row **A11** asks about, it is why A11 came out of AR, and it is a second untested
clause in this section beside §5.2(6). The fix is not a new mechanism — it is the one the shell bridge already
establishes: the header button calls the same function `popstate` calls, because two paths that reach the same
destination by different code are the defect this section claims not to have.

---

## 7. Design-system proposal

Nothing new. Retain: one `:root` token set (95 tokens, 3 unreached — `--s-1`, `--s-8`, `--info`: propose deleting the
two spacing orphans and wiring or removing `--info`), `rem` type scale with a 14px floor, Atkinson Hyperlegible Next
locally hosted with Plus Jakarta Sans behind it (four WOFF2 weights, license file present, `falsify-typography`
6/6), one sans family for all interface text, tabular/aligned numerals **to be added** (G7), the existing
tap/contrast/focus/measurement floors, and one icon table (43 glyphs drawn, all 38 reachable names covered, plus a
semantic map written down so A3 stops recurring).

**Corrected 2026-10-26, because three of the proposals above have since been executed.** The token census is no
longer a hand-kept figure — `node tools/measure.cjs Sukinnect-next.html` prints it, and the gate asserts the
*rule* rather than the number: the unreached set must equal the exception list and every exception must still be
declared. The two spacing orphans (`--s-1`, `--s-8`) were reached by converting the literals they already equalled,
which changes no pixel, and `--info` is kept unreached and named as the sole exception, because §31 mandates the
token and §34 forbids spending it on a brand chip. Tabular and aligned numerals are no longer "to be added": one
stylesheet rule carries both halves, and `falsify-figures` proves it. The icon semantic map exists as `ICON_MEANING`
and the gate fails a glyph that navigates without a row.

**Button hierarchy, from R6.** The system as written has PRIMARY (`.btn`), SECONDARY (`.btn.secondary`) and
DESTRUCTIVE (`.btn.danger`) and **no tertiary tier**, which is why the booking detail could paint two byte-identical
`btn secondary` controls side by side and nothing in the file could call that wrong — §70 of AGENTS.md names a
low-priority utility tier, so the missing class is the gap, not the screen's fault. Adding `.btn.tertiary` is the
smallest change that makes the rule expressible; it is not a new visual language, and the fallback keeps its glyph,
its words and its 44px box.

**Explicitly rejected, with reasons:** swapping to Poppins (not a local asset; §5.4 says do not load remote fonts, and
the incumbent face was chosen for legibility and is pinned by tests); any chart library; any framework migration;
remote icon CDNs; a second history mechanism.

---

## 8. Information-architecture proposal

Keep on primary surfaces: current state, next action, date/time, who, price or clearly-labelled estimate, and the
verification summary. Move to tabs/sections: credentials detail, history/receipts, notification preferences, session
and security detail, provider "activity" lists, admin evidence beyond the current case. Add nothing to the Home
screen. The one *new* surface the plan recommends is the reschedule sheet (§9); the one the plan declines for V1 is a
floating concierge button (R8).

---

## 9. Booking and rescheduling state map (the core proposal)

**Current, verified:** `requested → upcoming | cancelled | expired`; `upcoming → en_route | ongoing | cancelled |
disputed`; completion, refund and payout paths downstream; `ongoing` is the only state labelled "In progress"; each
transition records one instant shared by the step stamp and the `STATUS_EVENTS` row; actor permission enforced in the
kernel; a solo provider may hold one `ongoing` job.

**Missing:** any reschedule concept (0 occurrences), and therefore any way to change a date/time without cancelling.

**Proposed model — additive, no existing transition altered.** One new *request* record, not a new booking state, so
the booking's confirmed time stays truthful until someone agrees:

```
RESCHEDULE_REQUEST { id, bookingId, requestedBy: resident|provider,
                     fromAt (the confirmed schedule at request time),
                     proposedAt | proposedSlots[], reason|null,
                     status: pending|accepted|declined|superseded,
                     createdAt, decidedAt|null, decidedBy|null }
```

Rules and why they matter:
1. Only `requested` and `upcoming` bookings may open one — a job already `en_route`/`ongoing` reschedules through
   cancel/dispute, because the provider may already be travelling. (§6.4 "conflicts, stale slots" respected, no
   invented slot engine.)
2. Creating a request **does not** change the booking. Wording is therefore exactly: "Reschedule request sent. Your
   current time stays **<old>** until <party> agrees." — the §10 success-state rule, satisfied by construction rather
   than by copy.
3. The other party may accept, decline, or propose another time (creates a `superseded` chain rather than editing in
   place, so the audit trail shows what was actually offered).
4. Accept applies the new time through the **existing** schedule field with a `STATUS_EVENTS` row and one clock reading
   (§83's shared-instant discipline), and both sides' booking cards update from the same record — no second source.
5. A stale request (booking meanwhile cancelled/completed/time changed) is refused with its reason named, following the
   pattern already used by approve-while-outstanding.
6. No notification is invented: resident sees it in their list (records-backed), provider in the request inbox; each
   entry opens the booking.
7. Demo/session data still distinguishable: a reschedule created this session is a session record.

**Effort/risk:** touches `TRANSITIONS` guards (read-only additions), one record family + snapshot key + `hydrate()`
validation (the door already validates references — a dangling `bookingId` must be rejected there, not defaulted),
both detail screens, the ledger only *if* an agreed time changes a price basis (it must not, silently). Highest-risk
edge is persistence of a new record family across a schema bump; that is a versioned migration, and `SCHEMA_VERSION`
moves with a stated reason.

---

**§4.1's "map every visible status label to its source" — answered by inspection.** Displayed statuses come from label
maps, not typed strings (`REVIEW_STATUS_LABELS` 2093, `PAYMENT_LABELS` 3504, and the booking map at 3050 whose
`ongoing` entry is the only producer of "In progress"). The only literal status *words* found in templates are segment
controls bound to state values — `filter==='ongoing'` renders the chip "In progress", `filter==='upcoming'` renders
"Accepted" (9112–9115), and the admin roster's `category === 'verified'` chip (10033). Those are correct as filters,
but they carry **their own copy of the wording**, so a future label change could leave a chip saying something the
card no longer says. One cheap Phase B item: source chip captions from the same label map, and note that a booking
filter row is exactly where §6.4's reschedule states will have to appear, so the map should grow once rather than
three times.

## 10. Analytics and data-honesty audit

Every visible number now traces to a record or a labelled assumption; the failures of this class were found and closed
here rather than inherited: the admin tile that counted two questions under one label ("Live bookings" 10 = agreed 6 +
waiting 4), the profile module printing ₱2,500 where records held ₱590, the typed `adminProviderMeta` table hiding a
`bookingsForProvider()` that took no parameter, `8 of 11 on the roster are verified` (denominator was roster+queue),
the Insights screen's four typed bars and its invented capacity/cancellation claims, the public preview card typing
p1's rating for everyone, and chart axes whose thinning budget divided viewBox units by a type-relative rule. Chart
labels are HTML outside the scaled SVG, values drop when they cannot fit, and a bar painted above its own top gridline
is now its own sensor.

**Residual checks for Phase B (not defects, assertions to extend):** the new reschedule counts must satisfy the same
`count-labels` discipline; `probe-money-sums.js` must be re-run after any booking-detail change; pilot targets stay out
of denominators (§76/§88). **Nothing in §9 requires new visualisation work, and §9's own instruction — remove a chart
that answers no question — has already been applied.**

---

## 11. Terms, privacy and legal-content proposal

**Status: draft-only, requires qualified Philippine counsel before any public launch** (prompt §11; this plan is not
legal advice and will not be presented as approved).

**Research done for this plan (official copies; two named URLs were unreachable — recorded in §2).**

*RA 11967, Internet Transactions Act of 2023* — approved **5 December 2023**, 18-month transitory period (secondary
legal sources report full effect from 20 June 2025). From the official text: scope covers **business-to-business and
business-to-consumer** internet transactions, and **online media content and consumer-to-consumer (C2C) transactions
are not covered**. Definitions quoted: *online merchant* — a person selling non-financial goods or services to online
consumers through an e-marketplace; *e-marketplace* — a digital platform whose business is connecting online consumers
with online merchants; *consumer* — one who purchases goods or services over the internet for a fee. Platform duties
reported: verify merchant identity, ensure data privacy, provide redress, remove prohibited listings within 48 hours.
Seller duties: disclose price, condition and contact details, issue invoices, handle refunds.

**Applicability — mostly yes, with one question that is genuinely open, and it is also a product decision.** The
prompt is right that C2C coverage cannot be assumed: whether a solo neighbourhood provider completing one job is an
*online merchant* (B2C, duties attach) or a consumer transacting peer-to-peer (expressly excluded) is not resolvable
from the statute's text alone and belongs to counsel — but what the app *says* about providers is what a regulator
would read first, so §15 adds it as decision 13 rather than burying it.

**The one legal duty that constrains the UI now:** "verify merchant identity" cannot be mirrored by prototype copy
without breaking the honesty boundary at §175–§185 of the prompt — this build performs no real identity verification.
Terms/Policy must describe verification as a production process the platform intends to operate, while badge wording
keeps describing only what its own records hold. A legal requirement is not a licence to imply a service exists.

*RA 10173, Data Privacy Act of 2012, with its IRR* — read from the official IRR: notice **before entry of data**,
stating purpose, recipients and rights (Rule/Sec. 34(2)); consent **prior to collection** (Sec. 19(1)(a)); controller
accountability (Secs. 50–51); security measures (Secs. 26–28); **breach notification within 72 hours** (Sec. 38);
registration for systems holding **1,000 or more sensitive records** (Sec. 47); rights — be informed, object, access,
correction, erasure/blocking, portability (Sec. 34); third-party disclosure governed by written agreements
(Secs. 20, 43–44). Names, phone numbers and addresses are **personal information**; ID documents and credentials reach
**sensitive personal information** where tied to identity-fraud risk — exactly what `CREDENTIALS` and the verification
documents model.

**Two drafting consequences that are decisions, not style.** (1) A privacy notice describing server-side retention,
recipient categories or a 72-hour breach process would, in a locally-persisting prototype, be a **false statement** —
so the notice states the intended production processing *and* the interface states plainly that this build keeps data
only on the device. (2) The consent control must precede any field that collects data (the current sign-up order
already does) and must be unchecked by default, which satisfies Sec. 19(1)(a)'s "prior to collection" in form; what it
cannot satisfy is the substance, because no controller exists behind this prototype — recorded, not glossed.

**Not verified here, so not cited as authority:** the two NPC pages returned **403** to this client; both Senate
issuance-library URLs returned **403** and the prompt's own form `…/legislative+issuances/…` is malformed, which is
the likely cause; the DTI **ITA IRR PDF** arrived as undecodable binary. **RA 7394** (Consumer Act) and **RA 8792**
(E-Commerce Act) were therefore **not read** — and RA 8792 still matters, because the RECORD leg of the journey is
about electronic records and signatures. Reading them is a named dependency of P1-2, not a Phase B afterthought.

Three documents, one route, no duplicated contradictory text: **Terms of Service** (roles, listings, booking requests,
agreed scope/pricing, cancellation **and the new reschedule path**, reviews, disputes, prohibited conduct, platform
responsibilities limited to what the prototype actually does); **Sukinnect Policy** (trust/safety, truthful listings,
credential claims, communication, complaints, enforcement *only where supported*); **Privacy Notice** (what is
collected, purpose, lawful basis per activity — consent is not assumed as the basis for everything — recipients,
retention, rights, contact).

**Facts the plan refuses to invent, queued for the owner/legal to supply:** legal entity name, registered address,
DPO/privacy officer, complaint email, retention periods, effective dates, refund commitments, registration/licensing
status. Each appears as `[to be supplied]` in the draft rather than as plausible filler.

**Corrected 2026-10-26 — the marker is not `[to be supplied]`.** The drafts that were actually written mark every
one of those facts `[<thing> — NOT DECIDED]`, and **`to be supplied` appears zero times in `Sukinnect-next.html`**
(`grep -c "to be supplied" Sukinnect-next.html` → 0; `grep -c "NOT DECIDED" …` → 5 bracket sites). A reviewer who
followed this sentence and searched for the quoted string would have found nothing and concluded the drafts had
invented the facts — the opposite of what the marker exists to prevent. Two `legal` checks pin the real shape, by
name: **"every unknown business fact is a bracket marked as undecided, and nothing is bracketed by accident"** and
**"no document invents a contact address, an officer, or a registration that has not happened"**, proved by
`node tools/falsify-legal-truth.cjs`.

Registration mechanics: one unchecked Terms checkbox with working links; a versioned acceptance recorded **locally**
with the honest scope stated; no re-acceptance per login; optional consents kept separate from Terms acceptance.
Because the prototype persists only locally, the acceptance record is demo data and will say so in the developer docs,
not in user-facing jargon.

---

## 12. Static category-art plan

Already satisfied: local PNG per category, `ASSET-LICENSES.md` beside them, still-image only, three independent
no-motion guarantees, and category IDs/labels/theme tokens preserved. If the owner wants the soft-3D upgrade:
same file names and paths, same tile geometry, one family (perspective, light direction, scale, material, shadow
softness), legible at tile size, optimised for low/mid phones, licence line per new asset, **no** animated WebP/GIF/
Lottie/video/hover transform — and a `shot.cjs` run proving the painted page contains no moving category node. Until
approval, art is untouched (P3, and by choice not effort).

---

## 13. Prioritised implementation roadmap

**P0 — integrity blockers:** none open. (Back navigation, money/booking invariants, identity substitution, dead
controls, and status truthfulness are each covered by a passing instrument.) The reschedule gap is classified P0/P1
*only* in the sense that it denies a user an existing real-world option; it breaks no invariant.

**P1 — core journey**
1. **Reschedule flow** (§9): record family + `hydrate()` validation + both sides' UI + wording + tests. Deps: none.
   Risk: schema bump, stale-request races. Largest single item.
2. **Legal documents + registration acceptance** (§11). Deps: owner-supplied facts list; **RA 7394 and RA 8792 must
   actually be read first** (both unreachable this session — see §11), and a counsel review is required before any of
   it is presented as more than draft. No dependency on P1-1, but the Terms should mention reschedule rules, so ship
   after or with it.
3. **Admin self-registration entry** (G4): restrict or relabel. Small, independent.
4. **"Optimizer" naming honesty** (P1d). Small, independent.
5. **Chat keyboard verification** (R9) — a *verification* task first; only implement a visual-viewport/composer fix if
   the handset walk shows a real defect. Needs a phone on the bus.
6. **Action-above-the-fold on the 7 measured screens** (§4.5: Money, Categories, Master Administrator, the booking
   details variants, deep provider details). Promote `.scratch/probe-density.js` to `tools/` so this is a regression
   check, not a one-off. Deps: none; lowest-risk P1, and the only one with before-numbers already captured.

**P2 — coherence:** numeral alignment + tabular figures (G7/G8, one sweep, screenshots); icon semantic table + shield
swap (A3); filter-must-change-results checks (A7/R3); booking-detail grouping (R7/A9); density metric added once and
applied to the three crowded dashboards (G5/A1/A6/P1a); Needs-Attention queue (A4); empty-state kind distinctness
(G10); 1–3 min walk method (G11); `--s-1/--s-8/--info` token cleanup.

**Scope note, 2026-10-26 — since resolved.** This list, not §4's priority cells, is what "implement all of P2"
meant when the owner approved it, and the nine items above are what was built. One row carried `P2` in §4 and was
absent from this enumeration — **R6** — and a second, **A11**, was found in the same re-read carrying no priority
at all. Both were put to the owner rather than built on inference, and both were ruled *build it* the same day, so
the enumeration is now ten items with R6 in it and A11 is closed as a defect the matrix had mis-classified as
already resolved. What the note is worth keeping for is the rule it came out of: **when §4 and §13 disagree about
scope, the disagreement is a finding, and it is asked about rather than resolved by whichever reading is more
convenient.** See `CHANGES.md` §139.

**P3 — polish:** category-art refresh if commissioned (NA), avatar-in-header (A2), wide-screen sidebar (A5),
illustration/chart styling nudges.

7. **"Arrives within" mislabels what it filters** (R3): the sheet row promises arrival timing while the code filters
   `availabilityMin` — when a provider can start. One label change, no new mechanism. Deps: none, tiny.
   Paired P2 wording item: the provider card's `"about N km from you"` on a seeded literal (R5).

**Sequencing rationale:** the two content absences and one missing flow change what a user can *do*; everything in P2
changes how it *looks* and is safest done after the surfaces settle.

---

## 14. Acceptance-test checklist (all runnable, none invented)

| Item | Check | Command / method | Passes when |
|---|---|---|---|
| Every P2/P1 change | full gate | `node tools/verify.cjs` | all checks pass (567 today); new checks added with each rule |
| Any new record family | refusal on a dangling `bookingId`, restored-state behaviour | `tools/falsify-storage-truth.cjs` + a new family | mutants caught, 0 not applied |
| Reschedule wording | no claim of a changed time before agreement | new `honesty` check + `shot.cjs --probe=@…` driving the real sheet | both halves asserted, positive control included |
| Screen coverage | the new sheet/dialogs are in the walk | `node tools/shot.cjs --list`, `audit-camera-dialog-coverage` | count rises with the flow, findings 0 |
| Painted layout | tap floor, contrast, clipped text, reachability, motionless art, dialog semantics | `node tools/shot.cjs --measure` (+ `--focus`, `--dark`) | every failure tally 0 |
| Phone corners | 8 corners incl. `320x480 @200%`, `320x638 @135%` | `node tools/sweep-text-scale.cjs` | all corners clean |
| Alignment sweep | one value class, no per-screen overrides | new gate check + screenshots before/after | numeric rows share the rule |
| Keyboard/chat | real handset, composer visible, nav does not jump | `tools/device-probe.cjs` / leg scripts with the phone attached | observed on device or reported as not run |
| Invariants | centavos, ledger, transitions, status vs payment | existing `machine`, `ledger`, `money` suites | unchanged behaviour |
| Shipped file | `Sukinnect.html` untouched | `git diff --quiet origin/main -- Sukinnect.html` | silent |
| Build copies | four copies identical | `node tools/audit-build-bytes.cjs` | findings 0 |
| Commit hygiene | unique subject per commit | `node tools/audit-commit-subjects.cjs --check-message <file>` **before** committing | exit 0, unique |

---

## 15. Open decisions and assumptions (each with a recommended default)

**Ruled by the owner on 2026-10-25, at the Phase A approval gate.** The recommendations below were
taken in every case; the rulings that were *not* taken as written are marked. Items 1, 2, 4, 5, 6, 7,
8, 9, 10 (partly), 11, 12, 13 are closed as recorded here; the implementation deviations are stated in
`CHANGES.md` §132.

- **1 Reschedule acceptance semantics — APPROVED as recommended** (propose / accept-decline, confirmed
  time unchanged until accepted). **Deviation:** no `SCHEMA_VERSION` bump. A v16 dump has no
  `rescheduleRequests` key, which is an unambiguous absence, so `hydrate()` reads it as an empty list;
  bumping would have deleted testers' saved sessions to protect nothing.
- **2 Public admin registration — CLOSED AS ALREADY RESOLVED.** `isRegister = !isAdmin && …` in the
  rebuild means the admin route never renders a register form; there was nothing to restrict.
- **3 Concierge as a floating button — recommendation stands (no), not built.**
- **4 Session Lock — APPROVED: keep, honestly labelled.**
- **5 Needs Attention — APPROVED: promote the existing shared filter; no second list.** Built on
  2026-10-26, when the owner approved the whole P2 block: a fifth segment on Providers, filterable by the
  three conditions a record can assert, reachable from the Insights card, and asserted by the gate to
  answer exactly what `networkAttentionList()` answers. No second list was created.
- **6 Poppins vs Atkinson — APPROVED: keep Atkinson Hyperlegible Next.**
- **7 Category art — APPROVED: no change until art exists.**
- **8 "Optimizer" naming — APPROVED and BUILT.** The availability card now states what the switch does;
  the route card was deleted rather than reworded, because the dashboard already lists today's jobs.
- **9 1–3 minute target — APPROVED as a measured usability target; never displayed.**
- **10 Legal facts — APPROVED: draft with visible placeholders.** Built as three documents whose every
  unknown is a bracket marked `NOT DECIDED`, a `Draft — not reviewed by Philippine counsel` banner, and
  a versioned local acceptance record. Counsel review is still required before any public launch.
- **11 Map tiles — standing ruling unchanged**, and now disclosed in the Privacy Notice as the one
  network egress the app performs.
- **12 Deploy — UNCHANGED.** Production remains the deliberately stale build; no push or redeploy.
- **13 Provider as merchant or peer — APPROVED: merchants offering services through the platform**,
  stated in the Terms and flagged for counsel.

Original recommendations, kept for the record:

1. **Reschedule acceptance semantics** — assume one-sided propose, other side accept/decline/counter, confirmed time
   unchanged until accepted. *Default as specified.* Needs owner sign-off because it adds a record family and bumps
   `SCHEMA_VERSION`.
2. **Public admin registration** — *assume:* keep a demo admin entry, clearly separated from resident/provider
   registration, since the reviewer needs it. Alt: remove entirely. **Owner call.**
3. **Concierge as a floating button** — *recommend no for V1* (a FAB is the control most likely to be buried by a
   keyboard, which R9 cannot yet bound).
4. **Session Lock** — *recommend keep, honestly labelled*, rather than remove; it is documented as performing no
   authentication.
5. **Needs Attention** — *recommend* promote the existing shared filter into a filterable queue; do not create a
   second list.
6. **Poppins vs Atkinson** — *recommend keep Atkinson Hyperlegible Next*: locally hosted, license recorded, four
   weights pinned by tests, chosen for low-vision legibility; a geometric look is welcome but readable text wins.
7. **Category art** — *recommend no change until art is actually available*; enlarging glyphs is not an upgrade.
8. **Availability/Rate "Optimizer" naming** — *recommend* plain "Availability" / "Service rates" wording rather than
   building a scheduler.
9. **1–3 minute target** — *assume* it is a digital-task usability target measured by a scripted walk, and that
   unmeasured numbers never appear in the UI or docs.
10. **Legal facts** (entity name, DPO, address, retention, refund commitments) — *unknown, must be supplied*; nothing
    is inferred.
11. **Map tiles** — *assume* the accepted ruling continues (keep OSM tiles; treat the CDN/IP exposure as a production
    DPA question) and that it is disclosed in the Privacy Notice.
12. **Deploy** — *assumed unchanged*: production stays on the deliberately stale build; no push or redeploy happens
    without an explicit instruction.
13. **How the app characterises a provider — merchant or peer?** — the ITA covers B2B and B2C and **excludes C2C**, so
    this single product choice decides whether invoice-issuing, refund-handling and disclosure duties attach to
    Sukinnect's listings at all. *Recommended default for the documents:* describe providers as **merchants offering
    services through the platform** (the safer, more protective characterisation, consistent with the professional
    profile, verification and rates the app already models) and flag it explicitly for counsel. **Owner + legal call**
    — it cannot be inferred silently from a wireframe.

---

## 16. Rollback / preservation plan

- Work on `feat/domain-kernel`; `Sukinnect.html` never edited — verified per step by
  `git diff --quiet origin/main -- Sukinnect.html`.
- Small increments, one concern per commit, each proven with `--check-message` before committing; no commit, push or
  merge without an explicit ask (prompt §2.6 and this owner's standing practice).
- The page's four copies are checked by `audit-build-bytes.cjs`; the Android shell is untracked by standing decision,
  so shell-side edits are written out in `CHANGES.md` rather than left on one machine.
- New record families land behind `hydrate()` validation and a `SCHEMA_VERSION` bump with a stated reason, so an old
  dump refuses visibly instead of half-loading.
- Every added rule gets a falsifier break in the matching family (never a comment), and the aggregate runs sequentially
  — one mutating pass at a time, redirecting to a log, `git status` on the target after any interrupted run.
- Any change that cannot be verified here is reported as not verified, not as passing.

---

**End of Phase A.** Approval was requested for the P1 items and the §15 decisions; the owner granted
them on 2026-10-25 as recorded at the head of §15. Phase B is now under way — its status follows.

---

## 17. Phase B implementation status (2026-10-25)

Recorded as built / not built, with the command that proves each claim. Figures are not kept here by
hand: `node tools/verify.cjs` prints the check total, `node tools/shot.cjs --list` prints the screens
the camera walks, and `node tools/falsify-all.cjs` prints one row per mutant family.

**Built.**

| Item | What landed | Proof |
|---|---|---|
| P1-1 Reschedule | `RESCHEDULE_REQUESTS` + `RESCHEDULE_STATES`; propose / accept / decline / withdraw on both roles; only an accepted-not-started job may move; the booking's `date`/`time` change only on accept; survives a reload; `hydrate()` refuses a bad state, a third-party proposer, or a dangling `bookingId` | `suite('reschedule')`; `node tools/falsify-reschedule.cjs` (8 breaks, 8 caught) |
| P1-2 Legal | Three documents as a sheet from the sign-in card; unchecked-by-default Terms box; separate optional consent; versioned local acceptance record; every undecided fact bracketed `NOT DECIDED`; draft banner on each document | `suite('legal')` + three new `login` checks; `node tools/falsify-legal-truth.cjs` |
| P1-3 Admin self-registration | **Already resolved in the rebuild** — `isRegister = !isAdmin && state.authMode === 'register'`, so the admin route never renders a register form | read the guard; existing `login` checks |
| P1-4 "Optimizer" naming | Availability card now states what the switch does and that no routing reads it; the fabricated route card was deleted, not reworded, and a check fails if a second day-list appears | wording checks in `honesty`; `node tools/falsify-wording-truth.cjs` (7 of 7) |
| P1-7 labels | "Arrives within" → "Can start within" with a plain-English line; "arrives ~N min" → "can start in ~N min"; the seeded distance is disclosed as a sample figure, not measured from the reader | same family |

**Deliberate deviation.** No `SCHEMA_VERSION` bump for the reschedule family: a v16 dump has no such
key, an absent key is unambiguous, and bumping would discard testers' saved sessions to protect
nothing. The reason is a comment beside the constant and a paragraph in `CHANGES.md` §132.

**Not built, and why.**

- **P1-5 chat keyboard verification** — `visualViewport` still appears zero times in the file; nothing
  on this bench emulates a soft keyboard, so the claim stays unverified until a handset leg is run.
- **P1-6 buried primary actions** — the density probe is now `tools/probe-density.js` with a corrected
  selector (the Phase A version counted only `.btn`, which over-stated the problem on screens whose
  actions are tappable rows). Re-measure first, move content only where a real action is buried.

**P2 — built on 2026-10-26 after the owner approved the whole block.**

| Item | What landed | Proof |
|---|---|---|
| G7/G8 numerals | One rule for every figure a reader compares: `text-align:right` **and** `font-variant-numeric:tabular-nums`, covering `.row > b`, `.row-value`, `.ol-v`, `.chart-value`, `.stat-strip .f b`, `.stat .num` and number inputs. The five scattered declarations are gone; the property was measured on the shipped face before it was claimed (`111111` 78.16px vs `000000` 124.42px proportional, both 121.36px tabular) | three `hygiene` checks; `node tools/falsify-figures.cjs` |
| Token cleanup | `--s-1` and `--s-8` reached by converting the literals they already equalled; `--info` kept unreached and **named** in the gate's exception list, because §31 mandates it and §34 forbids spending it on a brand chip. The gate asserts the unreached set equals the exceptions and that each exception is still declared | the fourth `hygiene` check; same family |
| A3 icons | `ICON_MEANING` in the page; the admin Dashboard takes `chart` (what the provider's Dash already meant) and `shield` is reserved for trust/warranty/verification and the sign-in console badge. Every glyph a nav item or role badge asks for must have a row in the table | `honesty` check; `node tools/falsify-coherence.cjs` |
| A4 attention queue | A fifth segment on Providers, filterable by the three kinds a record can assert, reachable from the Insights card. `attentionQueue(null)` is asserted to answer exactly what `networkAttentionList()` answers; reasons and kinds are produced in one object and asserted equal in length per provider; the reason controls are `.pick`, not green `.chip`s | `honesty` check; same family |
| A7 filters | Each axis is narrowed from the records and compared against an expectation the gate builds itself, in both directions (a row kept that should go, a row lost that should stay), and `activeFilterCount()` is tied to the axes that actually narrowed | `honesty` check; `node tools/falsify-filter-function.cjs` |
| R7/A9 grouping | `BOOKING_GROUPS` names the six groups; the resident's detail paints them in the declared order with content under each, the arrival/completion stamps moved out of the figures grid into their own block, and a `requested` job asserted NOT to carry the Completion or Receipt heading. The provider's own profile already carried `.section-label` groups (Service settings / Professional / Financial / Account) and is unchanged | `honesty` check; same family |
| G10 empty kinds | Every literal empty-state title classified into one of the five kinds, each kind needing a representative, with the call-site count tied to the classified literals plus one *named* expression-titled site — so a new ternary empty state fails the census instead of drifting out of it | `honesty` check; `node tools/falsify-empty-kinds.cjs` |
| G11 walk method | The procedure is in `DEVICE-PASS.md`: fixed five-step task, one named device, five runs, median with min and max, tap and back counts, a human thumb. **The results table reads `not run`**, because nothing was measured | read the section |

**The §4 matrix re-audited row by row, 2026-10-26.** All **47** concerns were re-read against the current
file rather than against this document's memory of them. The table's own coverage is now an instrument —
`node tools/audit-matrix-coverage.cjs`, which prints one line per id and refuses with `NO CONCLUSION`
rather than summarising a table it failed to parse — and it reads **47/47 ids present exactly once** with the
distribution it prints today; run the command rather than trusting any distribution quoted here, including
the one that was true when this section was first written (**AR 20 · CD 8 · PR 11 · PD 5 · CV 2 · NA 1**).
Five rows have moved since: `R6` and `A11` came **out** of AR because a rule the row names had never been
walked, and `A4`, `P1e` and `A13` came **out** of PD because the owner's decision had been taken and built
while the class still advertised it as outstanding — the same misleading sentence arriving from the other
direction, since a reviewer reads PD as "nothing here yet". `R8` moved PD → NA for the same reason. The
classes, one row per class so a reader can find any id by searching for it:

- **AR — 21.** `G1` `G2` `G6` `G10` `R1` `R2` `R4` `R11` `P1b` `P1e` `P1f` `P1g` `P1i` `P1j` `P1k` `A4` `A7`
  `A8` `A10` `A12` `A13`. Each is *claimed* to be backed by an instrument, and that claim is now measured rather than asserted: `node tools/audit-row-instruments.cjs` reads §4's 47 rows and counts only evidence that resolves — a file under `tools/` that exists, or a bold-quoted label equal to one of the `verify.cjs` check labels. Its answer on the build this section was written: **42 of 47 rows trace to a runnable name, every built-class row now points at something, and 15 dispositions quote a gate-check label that resolves; the five that do not are the two CV rows a phone is required for, the two NA rows and the one PD row the owner is deciding.** Reading the row-to-guard question three ways (line scope, whole-bullet scope, change-log section scope, and finally asking which instrument file names the id) answered that no tool file names any plan id, so the pointer has to be written, not inferred. Two of the exception names in this sentence's previous draft were also wrong: `P1e` is asserted by six checks in `tools/verify.cjs` (`no card claims an optimizer or a travel saving the build does not compute`, `and the day is listed in exactly one place`, `the one list carries every job today's records hold for this provider`, a p7 empty-state check, `the dispatch switch says what it does instead of promising suggestions`, and the surge card showing the request that has waited longest), and `A13`'s lock dialog — the half that genuinely had nothing behind it — now has `the admin lock dialog says what Unlock does, and Unlock does only that`, proved by two breaks in `node tools/falsify-profile-honesty.cjs`.
- **Per-row pointers, written because the class sentences above name evidence for none of the ids they
  cover.** `node tools/audit-row-instruments.cjs` counts a pointer only when it resolves — a file under
  `tools/` that exists, or a bold-quoted label equal to a check the gate actually prints.
- **A13** — **the admin lock dialog says what Unlock does, and Unlock does only that**, with two breaks in
    `tools/falsify-profile-honesty.cjs` that restore the promising label and make Unlock sign the admin out.
- **P1e** — **no card claims an optimizer or a travel saving the build does not compute**, and
    **and the day is listed in exactly one place**.
- **R6** — **and the tertiary tier is a rule in the system, not a style attribute on one button**, with a
    break in `tools/falsify-coherence.cjs` that gives the tier a surface.
- **A9** — **the provider profile answers §42: rating, then verification, then contact, with the map
    last**, with a break in `tools/falsify-coherence.cjs` that renames the ratings block so the order cannot
    be found.
- **A11** — **no admin spoke hard-codes its own way back any more**, with two breaks in
    `tools/falsify-coherence.cjs`: the spoke hard-coding a destination, and the back rule forgetting that a
    spoke is a drill-in.
- **R2** — **a second job cannot start while one is in progress**, and **one job in progress per
    provider**.
- **R3** — `tools/falsify-filter-function.cjs`: the start-within axis stops narrowing anything, and the
    area filter goes back to matching where a provider lives.
- **R4** — `tools/falsify-credential-pair.cjs`, with **the expiring badge stops following the documents**
    in `tools/falsify-trust.cjs`.
- **R5** — **the seeded distance is disclosed as a sample, not as a measurement of the reader**.
- **R7** — **the booking detail names the six groups in order, and only the ones the record supports**.
- **R9** — **the value blocks that typed their own alignment take the shared class**, in
    `tools/falsify-figures.cjs`.
- **A10** — **no hand-rolled 30px back button survives**.
- **P1b** — **moving between root tabs leaves nothing to retrace**.
- **P1c** — **a provider who came from the FSM goes back to the FSM**.
- **P1d** — **the dispatch switch says what it does instead of promising suggestions**.
- **P1f** — **a receipt is only ever a finished job whose money changed hands**, with
    `tools/falsify-pay-records.cjs`.
- **P1g** — `tools/falsify-id-substitutions.cjs`: the resident booking detail falls back to the first job.
- **P1h** — `tools/falsify-reschedule.cjs`: a proposal moves the appointment the moment it is sent, and the
  side that asked can accept its own request.
- **P1i** — **a job that has arrived shows the time it arrived**.
- **P1j** — `tools/falsify-count-labels.cjs`: the in-progress count takes the unanswered requests as well.
- **G3** — `tools/falsify-legal-truth.cjs`: a placeholder stops saying it is undecided, and the Terms box
    comes pre-ticked.
- **A1** and **P1a** — `tools/falsify-action-above-fold.cjs`: the action card goes back below the statement
    figures it changes.
- **A6** — `tools/falsify-insights-records.cjs`: the completion bar goes back to the typed 88.
- **A8** — `tools/falsify-empty-queue.cjs`: the empty state replaces the queue whatever its size.
- **A12** — `tools/falsify-empty-kinds.cjs`: the unavailable screen takes the wording of the
    nothing-has-happened-yet screen.
- **R11** — `tools/falsify-profile-honesty.cjs`: Edit Pricing goes back to an action nothing branches on.
- **G11** and **R10** — *no instrument exists and none can exist on this machine.* Both need a handset: the
    one-to-three-minute walk is a thumb on a screen, and the keyboard-open composer is a soft keyboard. They
    are reported NOT VERIFIED, never as passing, and the method for the first is written in `DEVICE-PASS.md`.
- **G6 — the one AR row with no pointer that resolves.** §4 says its privacy gate is "documented and enforced
  in code", but `Withheld` appears zero times in `tools/verify.cjs` and in no `tools/falsify-*.cjs`, so the
  claim was true of the code and unasserted by the gate. It is asserted now: **the provider is given the customer
  phone only for a job they actually have**, with two breaks in `tools/falsify-profile-honesty.cjs` — one prints
  the phone whatever the state is, the other withholds it even on a job in progress, because a guard that only
  looks for a leak would pass on a screen that hides everything.
- **CD — 12, all twelve now built:** `G3` `G5` `G7` `R3` `R5` `R6` `R7` `A3` `A9` `A11` `P1d` `P1h`.
  The last three closed on 2026-10-26 after the audit reported them open (`CHANGES.md` §139): R6 needed a
  tertiary button tier the system never had, A9 needed §42's reading order and turned out to be painting green
  checks over two expiring documents, and A11 turned out to be worse than reported — an admin spoke was a
  destination the phone's Back could not leave at all.
- **PR — 9:** `G4` (closed as already resolved), `G8` and `R9` (both were the numeral half, built),
  `G9` (artwork: owner ruled no change until art exists), `P1a`/`A1`/`A6` (the density
  metric applied; nothing indicted, so nothing cut), `P1c` (guarded: the gate fails if FSM grows a second job
  list), `A14` (built in this pass, below). Nothing in this class is owed a build any more; the three rows that
  were open at the start of this section — R6, A11 and A9 — moved to CD above.
- **PD — 1:** `A2` (the admin header avatar stays until the wide-screen question, and the owner decides it
  with a screenshot, not this document).
- **CV — 2:** `G11`'s number and `R10`'s keyboard, both gated on hardware.
- **NA — 2:** `A5`'s wide-screen sidebar, which the mobile-first sections rule out, and `R8`'s floating
  concierge button, ruled kept-as-an-embedded-entry by the owner.

**Three rules had never been executed and were closed in this pass**, each of them an instruction this
document wrote for itself:

- **A14** asked: *confirm a `priority` source exists; if not, say "unranked" rather than invent one.* No
  case record carries a priority — `DISPUTES` holds `status`, `reason`, `bookingId`, `openedAt`,
  `amountInClaimCentavos`, `frozenCentavos`, `evidence`, `resolution` — and the help desk orders open
  before closed, which is a record state. What was missing was the sentence the row asked for, so the
  screen now says *"Open cases first, then closed, each in the order it was raised. Nothing here is
  ranked by urgency…"*, and a `honesty` check asserts both that the caption prints above a list and that
  no case record grows a priority field while it claims there is none (`node
  tools/falsify-coherence.cjs`, breaks 7 and 8).
- **P1e** asked: *document that one session = one role.* `README.md`'s known-limitations list now states
  the model explicitly — a provider signed in as a resident sees resident screens and none of their own
  jobs, no dual-role identity exists, and none is implied — instead of leaving the boundary as an
  implication of the sign-in screen.
- **§9 rule 6 — *"no notification is invented: the resident sees it in their list, the provider in the
  request inbox; each entry opens the booking."*** The records, the guards, both answer screens and the
  flow's falsifier breaks were built; the *lists* were not. A provider with six accepted jobs had to open
  each one to find the proposal waiting on them — a mechanism with no door. Both booking lists now render
  a pending-ask card (`rescheduleAskCard`), each row opening the booking the ask was raised against, and a
  decided ask appears nowhere. Two camera screens (`resident-asks`, `provider-asks`) raise the ask through
  the app's own submit path and paint the lists, because a fix that has never been painted has never been
  measured, and three new breaks in `node tools/falsify-reschedule.cjs` prove the check can fail — one of
  them routing both lists' rows to the provider screen, which is the foreign-id substitution class
  arriving through an inbox.

One stale present-tense claim in this document was corrected the same day: §15 item 5 still read *"queue
work is P2 and was not approved, so it is not built"* two sections after the queue landed, and §3's walk
count read 82 where `--list` prints 86. The lesson is the one `tools/audit-open-items.cjs` exists for:
**a row that was true when the plan was written becomes a claim about the present the moment the plan is
implemented.**

**P2 items deliberately not built, and why.**

- **G11's number** — a bench run in Chrome is not a phone, and three handset findings in this repository
  already proved that a desktop reading of a phone-shaped claim is worthless. The method is the
  deliverable; the median waits for a device.
- **A9 as a tab control** — §10's word is *separate*, and the constraint the same section carries is that
  a decision never has to be hunted for. Labels and reading order satisfy both; tabs would hide the price
  or the timeline behind a tap. Recorded as an interpretation, not as a skipped item.
- **The density cuts on the three dashboards** — the metric is a committed instrument
  (`tools/probe-density.js`) and the readings are taken per pass; content moves only where a real action
  is buried, which Phase A measured as one screen (the admin's Money), already fixed.

**As printed on the finished build (2026-10-26, after the repair described in `CHANGES.md` §135).**
`node tools/verify.cjs` → all **641** checks passed · `node tools/shot.cjs --list` → **88** screens (the
walk gained `admin-attention` and the two inbox screens `resident-asks` / `provider-asks`) ·
`node tools/sweep-text-scale.cjs` → **8 of 8** corners, 25 tallies each, all clear ·
`falsify-figures` **7/7**, `falsify-coherence` **8/8**, `falsify-filter-function` **4/4**,
`falsify-empty-kinds` **2/2**, `falsify-compat-floor` **7/7**, `falsify-reschedule` **20/20**, each with
0 not applied and 0 missed · `audit-camera-dialog-coverage` and `audit-matrix-coverage` → findings: 0 ·
density: provider dashboard first pressable row **181px** of 1,598px, admin console **121px** (its
lock/logout pair 2,054px, accepted), Marketplace Intelligence **128px** of 826px — no action buried, so
no content was cut · `node tools/audit-build-bytes.cjs` → **findings: 0**, four copies at `76338e39…`,
shell at `versionCode 43 / 1.2-preview.41`. **The full `falsify-all` aggregate was not re-run in this
pass**, so no mutant total is quoted for it; the five families whose needles this pass could have
orphaned were run individually. The §14 row asking for **screenshots before/after** the alignment sweep is
closed too: the pre-P2 page was extracted to the repository root (a subdirectory copy would photograph a
fallback face), four money-bearing screens were shot, the copy deleted, and the same four re-shot — the
ledger column now lines its peso signs and decimal points vertically, the admin nav shows the chart glyph
in place of the shield, and the booking detail carries four group headings and not the two whose records do
not exist. `CHANGES.md` §135 carries the reading.

**Re-printed the same day after `CHANGES.md` §137**, which is what the paragraph above is dated for rather
than authoritative: `node tools/verify.cjs` → all **643** checks · `node tools/shot.cjs --list` → **88**
screens, and this time the two inbox screens actually paint their card (the first version of those rows
signed in as a provider who cannot see the job, so the walk photographed an ordinary list and every tally
read clean) · `falsify-coherence` **10/10**, the two added breaks proving that a card head must wrap
instead of letting a count crush its title · `sweep-text-scale` → **8 of 8** corners, 25 tallies each, all
clear · `audit-build-bytes` → **findings: 0**, four copies at `2691a76c…`, shell at
`versionCode 45 / 1.2-preview.43`. The aggregate remains un-run and unquoted.

**What this report does not cover, and the rule that was missing.** `node tools/audit-report-coverage.cjs`
answers this of the tree: it reads the §4 rows, then asks which of them §17 **lists** — a bullet or a table
row, not a prose mention — and exits 1 on any row that is silent *and* not classified AR. Run it rather than
trusting a figure here: the first version of this paragraph quoted "40 named, seven silent", and the paragraph
itself, by naming those seven, made that reading false — a count kept in prose inside the document the count
measures is §90's drift arriving one level up. What the reading was when the tool was written is the useful
part: **29 of 47**, with eighteen silent, and every one of those eighteen dispositioned somewhere in prose
that the strict rule does not credit.

The reason the command exists is **R6**, which was classified AR/PR with a P2 action, never had that action
built, and appeared **nowhere in §17** — so nothing in the repository could notice the gap between "the plan
has 47 rows" and "the report dispositions 29 of them". `audit-matrix-coverage.cjs` counts the rows; this asks
the other half. A11 arrived the same way: its AR rested on a sentence about the Back *machinery* rather than
about the destination the row names. Both were found by reading the AR class, not by any check. The rule this
establishes: **a row re-classed out of AR gets a §17 disposition in the same change**, because the report is
the only place a reader looks for what Phase B owes. The class list above is that rule applied — which is why
it is bullets.

**The three rows this section reported open were closed the same day**, after the owner ruled on each
(`CHANGES.md` §139). They are kept here in the order they were found, with what the ruling changed:
- **R6** — ruled *build it*. `.btn.tertiary` was added to the system rather than styled inline on two buttons:
  the button set had PRIMARY, SECONDARY and DESTRUCTIVE and no low-priority utility tier, which is why nothing
  in the file could say that a `btn secondary` chat control beside a byte-identical `btn secondary` `tel:` link
  was wrong. The 44px floor is untouched — the demotion is mass, not reach.
- **A9** — ruled *screenshot it and decide together*, which is how the real defect was found: at the phone’s own
  320 CSS px and 135% text the sticky action bar was painting its primary button as “Book / Appointme / nt”.
  The same squeeze then hit everything the reorder moved above the fold — the ratings label, the score pill, the
  service badge — three more instances of one rule, each fixed the way §137 established: the row wraps, the
  words hold. The screen also now reads its credentials from `credentialsOf()` through `credentialLine()`,
  because the list it replaced painted a green check beside two documents the records call expiring.
- **R6** — ruled *build it*, which resolved the scope question in favour of the matrix: the row joins P2, and
  §13’s enumeration is corrected below rather than left to disagree with §4.
- **A11** — ruled *unify them*, and reading the code showed the finding as written was too kind. An admin spoke
  keeps the console’s root-tab value, so `onRootTab()` answered “root” with a drill-in on screen: no history
  entry was claimed for it and `stepBack()` returned early with nothing to undo. The phone’s Back did not land
  somewhere else — it had nowhere to go. The rule now treats an admin spoke as a drill-in, the five hard-coded
  destinations became the page’s own back step, and the gate asserts the case the row names: account tab →
  audit log → back is the account tab, and from the console it is still the console.

**Closed after the first report.** `falsify-legal-truth` caught one of my own checks as a MISSED - it
grepped the sign-in render, where the register fields are never painted - and was re-pointed at the
register-mode paint with a presence half, so the family now reads 8 of 8. A second audit against §9 of
this plan then found two rules the first cut had skipped, now built: a request stores the schedule it
was raised against (so an answer arriving after the booking moved is refused and retired as `stale`,
writing nothing), and the card shows both ends of the move. The one deviation that survives is
deliberate: `requested` bookings are not offered a reschedule, because an unanswered request has no
agreed time to move. Recorded in `CHANGES.md` §133.

**§14 executed item by item, 2026-10-26.** The checklist above says "all runnable, none invented", so it was run
as a checklist rather than quoted as one. Every result below is from a command executed against the committed
build (`65e375e`, page bytes `2691a76c…`); the aggregate figures come from a single sequential pass, and the
camera readings from runs after the last page edit. **Three rows have since been re-measured against the build
that followed it (`f149390`, page bytes `fd176312…`) and each says so in place** — that is the whole difference
between a dated table and a false one.

| §14 item | Command run | Result |
|---|---|---|
| Every P1/P2 change — full gate | `node tools/verify.cjs` | **all 643 checks passed** |
| Any new record family | `node tools/falsify-storage-truth.cjs` and `node tools/falsify-reschedule.cjs` (both through the aggregate) | storage-truth **5 of 5**, reschedule **20 of 20**, 0 not applied, 0 missed |
| Reschedule wording | gate checks at `tools/verify.cjs:5627`–`:5628`; the two camera screens `reschedule-sheet` / `reschedule-answer` | **Deviation from the stated method:** no `--probe=@` file exists for this row. The rule is asserted by the gate against the rendered card and photographed by the walk, which answers the same question; recorded rather than papered over |
| Screen coverage | `node tools/shot.cjs --list`, `node tools/audit-camera-dialog-coverage.cjs` | **88 screens**; 17 layer-raising profile controls, 17 clicked; **findings: 0** |
| Painted layout | `node tools/shot.cjs --measure`, `--measure --focus`, `--measure --dark` | **Re-run against the current committed build (`f149390`, page bytes `fd176312…`) on 2026-10-26, and all three now agree:** `--measure` and the 8-corner sweep give 25 failure tallies at **0** with no console errors; **`--measure --focus` walked 856 keyboard stops over 88 screens with all four focus tallies at 0** (no ring, default ring, past the scrim, off the viewport); **`--measure --dark` reports 0 contrast failures over the same 88 screens** and no other failure line. The earlier figure this row carried was 855 stops on the pre-§139 build; it was superseded rather than re-quoted, which is what the §90 lane of this plan asks for |
| Phone corners | `node tools/sweep-text-scale.cjs` | **8 of 8 corners, 25 tallies each, all clear** |
| Alignment sweep | three `hygiene` checks, `node tools/falsify-figures.cjs`, the before/after pair in §135 | one alignment rule and one numeral rule in the page (`1` and `1`); **7 of 7 breaks caught** |
| Money aggregation | `node tools/shot.cjs --probe=@tools/probe-money-sums.js`, plus a ₱10 plant on the receipt total | **Proven on this build (`fd176312…`) — after one false negative that was my reader, not the instrument.** Over all **88** screens the probe reached **5 screens carrying an aggregating card, 9 cards inspected, `findings: 0`**. The calibration was re-taken the same minute on the current bytes: planting ₱10 on the receipt `Total` answers `painted 425 sumOfParts 415 delta 10` on both booking-detail receipts, so the clean zero is a measurement; the page came back byte-identical afterwards. **The false negative:** the probe answers a JSON *string*, so a single `JSON.parse` yields a string and every field read `undefined`, which summed to `cardsWithTotals: 0` — and I wrote that up as `NOT PROVEN` before decoding twice. **A probe whose verdict arrives as a string must be decoded twice, or the reader manufactures the silence it then reports as a finding about the app** |
| Keyboard / chat on a handset | — | **NOT VERIFIED, and not verifiable here.** `visualViewport` appears **0** times in the page (re-counted today); the owner has ruled the leg stays pending until a phone is attached |
| Invariants | `machine`, `ledger`, `money` suites inside `verify.cjs` | unchanged behaviour — these are gate suites, not mutant families, so they are counted in the 643 |
| Shipped file | `git diff --quiet origin/main -- Sukinnect.html` | silent — **unchanged from `origin/main`** |
| Build copies | `node tools/audit-build-bytes.cjs` | **findings: 0**, four copies identical at `2691a76c…` |
| Commit hygiene | `node tools/audit-commit-subjects.cjs --check-message <file>` before each commit | run before every commit in this pass; `65e375e` reported **unique** over 347 reachable commits |
| **Matrix coverage** (added by this pass) | `node tools/audit-matrix-coverage.cjs` | **47/47 ids present exactly once**, every row classified: AR 21 · CD 9 · PR 12 · PD 1 · CV 2 · NA 2 |
| **Report coverage** (added by this pass) | `node tools/audit-report-coverage.cjs` | **findings: 0** — every row dispositioned in §17, §17's class list matches §4 id for id, all 17 section headings present and ordered; proved by `node tools/falsify-report-coverage.cjs`, **5 of 5 breaks, 0 not applied, 0 missed** — its first break had printed MISSED and was wrong about the instrument, not about the guard: the audit names the row in a `LIST MISMATCH` finding and A11's §4 class is CD, so the needle `/silent: A11/` described output the tool never had. The family also gained the break that finally moves the headline number — stripping one id from the whole §17 section and requiring `not dispositioned` to climb — which had never been exercised in the audit's existence |

**The answer to the question, stated once.** Of the plan's 47 concerns, **45 are built, ruled out of scope,
or resolved by an earlier pass with an instrument behind them** — including the three rows this section reported
open (R6, A11 and A9), all closed on 2026-10-26 after the owner ruled on each (`CHANGES.md` §139). **One is a
standing owner deferral**: A2's admin header avatar, which the owner chose to leave until the wide-screen question,
decided with a screenshot rather than an argument. **Two cannot be closed on this machine at all** — G11's
one-to-three-minute number and R10's keyboard-open composer — both gated on a handset by standing ruling, and
neither reported as passing. Nothing is pushed, no device was attached, and the deployment is left deliberately
stale as ruled.

**A fourth item was a reader bug wearing an instrument's clothes, and it is recorded because it reached a committed document.** Aggregating `tools/probe-money-sums.js` over the walk first answered `cardsWithTotals: 0` on all 88 screens, which by the probe's own contract means it inspected nothing — and that was written into §14 above as `NOT PROVEN` for the claim that the money adds up. It was my parse: the probe returns `JSON.stringify(…)`, so one decode gives a string and every field is `undefined`. Decoded twice it reaches **5 screens, 9 aggregating cards, 0 findings**, and the planted ₱10 control fires `painted 425 sumOfParts 415 delta 10` on the current bytes, so the claim is proven and §14 now says so. The general rule is the one this plan keeps learning from the reader's side: before concluding anything from a count, check that the count can see the thing it counts.
