# SUKINNECT — UX Reliability and V1 MVP Plan (Phase A)

Produced under `SUKINNECT_UX_RELIABILITY_MVP_PROMPT.md` §1 Phase A. **This is a read-only audit: no application
code, asset, or behaviour was changed to produce it.** It stops for approval at §16/§17; nothing here is
implemented until the owner approves.

---

## 1. Executive summary

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

**Recommended approach.** Do the two content gaps and the one new flow first (reschedule, legal documents,
registration acceptance), because they are the only items where a user is silently denied an option or is not told the
rules. Then the keyboard/viewport verification with a handset on the bus. Then the alignment and icon-semantics pass
in one sweep with screenshot evidence. Do **not** restyle typography, category art, headers, or the kernel: those are
verified good and churning them would be movement without improvement (§14).

---

## 2. Repository / worktree baseline (measured, this session)

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
| **Sources I could not read** | `Suki.docx` is **not in the workspace** — §13's list is its summarised proxy, and §4.1's "for each concern in Suki.docx" is therefore answered through §13 only. Android wrapper `Sukinnect-Android/` is untracked by the owner's standing decision, so shell-side claims come from `CHANGES.md`, not from an inspectable diff. Legal: both `privacy.gov.ph` pages and both Senate issuance-library URLs returned **403** to this client (the prompt's Senate URLs are additionally malformed as `…/legislative+issuances/…`), and the DTI ITA-IRR PDF returned undecodable binary — so **RA 7394 and RA 8792 are unread**, and RA 10173's IRR was read from the judiciary's official copy instead. |
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

**Sheets/modals/screens.** 82 walked screens; sheets are `state.sheet` branches, modals `state.*Modal/*Confirm`.
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
| R6 | Chat and Call visible with clear hierarchy and touch size | **AR/PR** | Chat is a first-class nav destination and contextual to a booking; call handling exists with the WebView external-action path. Touch floors hold at 44px. | verify hierarchy only where a booking detail offers both; no new surface | **P2** |
| R7 | Separate timeline / contact / schedule / price / completion / receipt | **PR** | Booking status and payment status are separate fields and separate visual labels; receipts derive from records (`residentFinished`/`residentPaid`/`bookingTotal`) and print only paid, finished work; a receipt appears only for a finished paid job (line 6032 says so in the UI). What remains is grouping into tabs on the detail screen, which is layout work. | tab the detail screen along the six named groups; move nothing out of sight that a decision needs | **P2** |
| R8 | Concierge as a bottom-right floating button | **PD** | Today it is a Home row (8282) that opens a real screen (8318) with a working photo control, and it refuses to sort a photo-only request instead of inventing a category. Nothing is broken; a floating button is a different navigation choice with real costs (safe area, composer, nav overlap, discoverability on low-end). | **Recommend keeping the embedded entry for V1** and revisiting only with the keyboard/viewport work, because a FAB is exactly the control a keyboard can bury. | **P2/PD** |
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
| P1e | Which bookings may a provider see (dual-role)? | **PD** | Roles are separate sessions in this prototype; a provider signing in as resident sees resident screens. §13 forbids assuming a dual-role model. | keep explicit role sessions for V1; document that one session = one role; no silent role merge | **P2** |
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
| A4 | Needs Attention ↔ notifications; one list or two | **PD** | One shared filter feeds both the stat strip and the attention card "so they cannot drift apart by construction" (1979) — the duplication risk is already closed. What does not exist is a dedicated, filterable *queue*. | **Recommend** promoting the existing shared filter into a filterable queue reachable from the badge, rather than adding a second list | **P2** |
| A5 | Collapsible sidebar on wide screens | **NA/PD** | The product is mobile-first; §36/§91 of AGENTS.md and the whole measurement rig assume phone widths; admin already works at 450 CSS px. | defer; only if the owner asks for a desktop console | — |
| A6 | Operations: less irrelevant data, actions forward | **PR** | Marketplace Intelligence counts a date window and is record-derived; decorative bars were removed (capacity bar and a cancellation verdict deleted because no record asserts them). | apply G5 metric | **P2** |
| A7 | Providers: discoverable, accessible, functional sort/filter | **AR (now read at the code, not deferred)** | Replaces the earlier "verify in Phase B": `providerMatches()` narrows the set on query, `serviceId`, **barangay through `providerServes()`** (declared service area, not where a provider happens to live), `maxWait`, and `providerAccepting(p)`; `activeFilterCount()` (5848) counts those same three and `blankFilters()` resets them (6103/6115/9204) — so these are real filters, not appearance toggles. Admin sorts bind to named fields (`ADMIN_SORTS`, `ADMIN_PENDING_SORTS`). Icon-only controls stay governed by the camera's label and tap tallies, which read 0. | Residual is R3's **labelling**, not filter function. Add one probe asserting each filter changes the rendered set and that clear-all restores it, so a future regression is caught rather than trusted. | **P2** | per-filter probe: set differs from unfiltered; clear-all restores the full set |
| A8 | Verification queues; drop decorative progress bars | **AR** | Applications and documents are records; the count is `3 of 4` because a missing `submittedAt` *is* outstanding; approve is refused while a document is outstanding and names which; a **Decided** tab exists because a decision that deletes its own record is unauditable; ornamental bars removed. | none | — |
| A9 | Provider profile decluttered without losing decision context | **PR** | Layout work, same rule as R7. | tab/group, keep verification + rate + area visible | **P2** |
| A10 | Missing/incorrect Back buttons | **AR** | as G2 | — | — |
| A11 | Audit log must return to the profile/activity context | **AR** | The audit-log destination is in the walk (`admin-audit`, reached by clicking the row a person clicks) and Back is layer/destination-aware with context restore; the profile→activity→Back case is the documented reason `clearModals()` and the destination key exist. | re-test in Phase B walk 6 | — |
| A12 | Empty profile modules: honest empty states | **AR** | `emptyState('shield','Nothing under warranty', …)` pattern; §76/§88 rule "where a module has no record behind it, it says so plainly"; "PIN enabled/2FA enabled/2 devices" rows were deleted or replaced with `Not configured`. | none | — |
| A13 | Admin Session Lock: make it coherent or remove it | **PD** | Today it is deliberately honest: the dialog states that **no PIN is checked** and that Unlock closes the screen leaving the app signed in; the earlier PIN/password modals were deleted because they fabricated audit-log entries. | **Recommend keep as labelled demo + copy pass**; removing it loses a documented trust surface; *never* dress it as security (§11's "do not imply production authorization") | **P2/PD** |
| A14 | Help Desk around status, priority, summary, linked booking, history, next action | **PR** | Cases are records with timeline/evidence; the sheet is walked; evidence gathering is not framed as blame (AGENTS §28). Density: §13's complaint stands partly — triage ordering by priority needs verifying against records rather than a typed field. | confirm a `priority` source exists; if not, say "unranked" rather than invent one | **P1** |

---

## 4.5 Measured density baseline (added while completing §4.1's painted-layout requirement)

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

---

## 7. Design-system proposal

Nothing new. Retain: one `:root` token set (95 tokens, 3 unreached — `--s-1`, `--s-8`, `--info`: propose deleting the
two spacing orphans and wiring or removing `--info`), `rem` type scale with a 14px floor, Atkinson Hyperlegible Next
locally hosted with Plus Jakarta Sans behind it (four WOFF2 weights, license file present, `falsify-typography`
6/6), one sans family for all interface text, tabular/aligned numerals **to be added** (G7), the existing
tap/contrast/focus/measurement floors, and one icon table (43 glyphs drawn, all 38 reachable names covered, plus a
semantic map written down so A3 stops recurring).

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
- **5 Needs Attention — APPROVED: promote the existing shared filter; no second list.** (Queue work is
  P2 and was not approved, so it is not built.)
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
- **All P2** — not approved, so not started.

**Open in this pass.** One `legal` check reads a screen that never paints the Terms box, so it passes
vacuously; `falsify-legal-truth` caught it as a MISSED and the check is being re-pointed at the
register-mode render before the family is re-run.
