# SUKINNECT — Mobile-App Visual Pass: Slice 0 plan and findings ledger

Branch `feat/mobile-app-visual-pass`. Target file `Sukinnect-next.html`. Repo root:
`C:\Users\ADMIN\OneDrive\Desktop\Sukinnect\Suki-proto`.

Baseline recorded before any edit: `node tools/verify.cjs` **740 checks passed**;
`node tools/measure.cjs` 13,737 lines, 100 tokens declared / 9 unreached, 43 glyphs drawn;
`node tools/shot.cjs --measure` 101 screens, **every failure tally zero**, no console errors.
Screenshots saved as `.shots-before/` (123 PNGs).

## Rules that constrain this pass (quoted, not paraphrased)

- **AGENTS.md §10** — `Sukinnect_Logo.png` is the official mark: "Do not replace it with … a
  generated logo", "Do not distort it. Do not stretch it. Preserve its aspect ratio." Untouched.
- **AGENTS.md §30** — the brand hexes are *measured*: logo blue `#0352AE`, logo cyan `#05BCC4`,
  deck navy `#03002B`, pale `#F1F5FF`. §31A (owner ruling 2026-10-27) makes the palette **flat**;
  the brief's "heavy navy gradient bar" describes a build that no longer exists.
- **AGENTS.md §34** — "The application should not make 'blue = success' simply because blue is the
  brand." Status stays semantic.
- **AGENTS.md §68** — "no essential interface text below 14px", measured on two handsets; the type
  scale is `rem` because Android multiplies the used size after CSS resolves.
- **AGENTS.md §46** — "SERVICE-CATEGORY ILLUSTRATIONS NEVER MOVE." Static, at any motion setting.
- **AGENTS.md §23/§24** — booking state and payment state stay separate; no cost may be hidden.
- **AGENTS.md §63/§86** — a prototype may not claim to be a system. Honest labels survive restyling.
- **AGENTS.md §81** — local assets only; the one allowed network dependency is OpenStreetMap tiles.

## Findings, re-confirmed against this build

| # | Verdict | Evidence |
|---|---|---|
| D1 badges break mid-word | **FIXED ALREADY** | `.chip` carries `white-space:nowrap; flex-shrink:0` and `.card-head` carries `flex-wrap:wrap`; sentence-case is still owed (§3.3) and is done in Slice 3. |
| D2 `&ldquo;` printed as text | **CONFIRMED → FIXED Slice 1** | `emptyState()` escapes its title, so an entity typed into the string is escaped twice. Real quote characters now. |
| D3 rating pill wraps | confirmed in earlier passes, re-checked in Slice 4 screenshots | `.row-value` and the pill rule are the sites. |
| D4 bell drops below avatar | **CONFIRMED** (resident Home header) | Slice 4. |
| D5 sticky bar sits on the tab bar | **CONFIRMED** — `.book-bar` is `position:sticky; bottom:0` inside `#screen`, with `.bottomnav` below it | Slice 2. |
| D6 slashed zeros | **CONFIRMED, measured** | `probe-zero-style.js`: Atkinson 364.05/364.05 tabular **with a slashed zero**; Plus Jakarta Sans 345.61/345.61 tabular, plain round zero; Poppins 184.33/361.73, no tabular feature. Figures move to Jakarta; UI stays Poppins. |
| D7 map block blank | tiles load here (933 requests left the device in the baseline walk); the **offline placeholder** is still owed | Slice 4. |
| P1 everything is a card | **CONFIRMED** in `.shots-before/provider-dash.png` (card inside card) | Slice 3/4. |
| P2 grid below the fold | **CONFIRMED** — resident Home "scrolls 635px past the fold" | Slice 4. |
| P3 header patterns inconsistent | **PARTLY FIXED ALREADY** — the navy *gradient* bar is gone (flat `#0352AE`); one white top-bar system is still owed | Slice 2. |
| P4 type proportions | **CONFIRMED** — bold everywhere, caption 14px used app-wide, nav labels ellipsized ("Bookin…", "Messa…") | Slices 2–4. |
| P5 everything lavender | **CONFIRMED → FIXED Slice 1** — page `#F6F7FB`, hairline `#E6E8EF`; brand tint reserved for selection | |
| P6 admin numeral column | confirmed | Slice 5. |
| P7 nav icons thin, `FSM` jargon | **CONFIRMED** — 24px Material Symbols now; the label rename is an owner decision (below) | Slice 2. |
| P8 login floating card | confirmed | Slice 4. |
| P9 long copy in tight rows | **CONFIRMED** — "next: Fri, Nov 6 at 10:30 AM — Main valve repair" | Slices 4–5. |
| P10 unlabeled tracker bars | confirmed | Slice 3/4. |
| A1 seven AI category PNGs | **CONFIRMED** — `SERVICE_ART` / `catArt()` / `CAT_ART_PX` all still present | Slice 6. |
| A2 inline icon family | **RESOLVED Slice 1** — 47 glyphs replaced with official Material Symbols (Apache-2.0), outlined + filled, `ic(name,size)` signature kept | |
| A3 cartoon avatars | **CONFIRMED** — visible in `.shots-before/provider-dash.png` | Slice 3/6. |
| A4 abstract category icons | **FIXED Slice 1** — each trade draws its own glyph (`plumbing`, `electrical`, …) plus a `short` tile label | |
| A5 official logo | **UNTOUCHED**, as required | |

## Decisions for the owner (raised, not resolved silently)

1. **Typeface.** §3.3 asks for one family with tabular lining numerals and no slashed zero, and names
   Plus Jakarta Sans. AGENTS.md §31A rules Poppins as the UI face. Applied: **Poppins for words,
   Plus Jakarta Sans for digits** — both halves of the requirement are met, no owner ruling is
   reversed, and the choice is measured rather than argued.
2. **12px `label` role.** §3.3 puts chips, badges, tab labels and helper text at 12px. AGENTS.md §68
   sets a 14px floor as an accessibility ruling measured on two handsets. Applied: **14px**, with the
   conflict named here rather than settled by a quiet number.
3. **`FSM` → `Jobs`.** Requested by §3.4; a nav label change is a product-word change, so it is
   flagged for approval before it ships.
4. **Eighth "All services" tile**, **monogram avatars**, and the **unreferenced cartoon PNGs** left
   on disk awaiting approval to delete — all per §4.4/§4.5.

## Slice order (each leaves the app working, one commit each)

0 baseline · 1 foundations (tokens, type, numerals, chips, entity, icon family) · 2 chrome (top bars,
nav, sticky bar, sheet) · 3 components (list row, card, buttons, chips, stepper, empty state,
monogram) · 4 resident flow · 5 provider and admin · 6 retire the AI images, update every gate,
`ICON-LICENSES.md` + `DESIGN-TOKENS.md` + README assets + Android re-sync.

## Verdicts after Slices 2-6 (updated as the work landed)

The table above was written at Slice 0. What the pass then achieved, and what it did not:

| # | Now | Evidence |
|---|---|---|
| D1 | **fixed** | chips already held `nowrap`; the four uppercase status spellings are sentence case |
| D2 | **fixed** | the empty results screen reads `No provider matches "leak"` in the screenshot |
| D3 | **fixed** | the rating figure no longer paints white-on-white; `splitChips` tally 0 |
| D4 | **fixed by the chrome pass** | the bell sits at the right of the same header row on Resident Home |
| D5 | **fixed** | a pushed screen has one bottom bar; the probe counts `fixedBars: 1` on Provider Detail |
| D6 | **fixed** | digits render in Plus Jakarta Sans — measured tabular and slashless |
| D7 | **partly** | tiles load here; the offline placeholder is still owed |
| P1 | **partly** | cards are flat with a neutral hairline and `.list`/`.list-row` exist; the Home and provider cards still nest a card inside a card |
| P2 | **fixed** | grid bottom 471px against nav top 757px at 390×844, four columns, eight tiles |
| P3 | **fixed** | one light bar on every screen, 56px, bare chevron |
| P4 | **partly** | neutral surfaces and sentence case landed; body copy is still bold in several places and the provider nav still ellipsizes `Bookin…`/`Messa…` at 320px, which is the documented floor behaviour |
| P5 | **fixed** | page `#F6F7FB`, hairline `#E6E8EF`, brand tint reserved for selection |
| P6 | **not touched** | the admin rows already use `.job-row` with a chevron from an earlier pass; the numeral column was not re-audited |
| P7 | **partly** | 24px Material Symbols throughout; `FSM` still says `FSM` (owner decision), and the active-state pill was attempted and reverted |
| P8 | **fixed** | the entry screen is one surface: logo on white, display title, segmented control, 52px fields and action, outlined "Create a new account" |
| P9 | **not touched** | long subtitles still sit in glanceable rows |
| P10 | **fixed** | the marks carry a line naming the step and the count |
| A1 | **fixed in code** | `SERVICE_ART`, `CAT_ART_PX`, `catArt()` gone; PNGs unreferenced, removed from `dist/` and from the staged Android bundle |
| A2 | **fixed** | one family, licence recorded, generated from the shipped map |
| A3 | **attempted and reverted** | two splices of `photoAvatar`/`photoFor` damaged neighbouring functions under text surgery and the gate caught the crash; the cartoon faces remain, and this needs a pass that edits the helper with the harness rather than a bulk text replacement |
| A4 | **fixed** | each trade draws its own glyph and carries a `short` label |
| A5 | **untouched**, as required | |

**One finding the sweep produced that is not mine.** At default width with 200% text the provider
dashboard's weekly chart keeps `Oct 26` hanging 3px sideways of its box. `git diff` over the whole
pass shows no line of chart code changed — `chartColumns`, `chartScale`, `chart-cat` and the gutter
token are untouched — so this is a pre-existing large-text case that the wider 101-screen sweep now
reaches. It is reported, not smoothed over, and the other seven corners are clean.

**Commands a reader can run, in this state:** `node tools/verify.cjs` (741), `node tools/shot.cjs
--measure` (101 screens), `node tools/sweep-text-scale.cjs` (eight corners), `node
tools/falsify-visual-contract.cjs` (5 of 5), `node tools/measure.cjs`, `node
tools/audit-build-bytes.cjs` (three copies agree; the built APK differs until it is rebuilt),
`node tools/shot.cjs --probe=@tools/probe-visual-contract.js`.


## Final verdicts on the ledger (after Slices 5 and the instrument repairs)

Three rows moved from "not touched" to settled by reading the build rather than changing it, and two
of them are the kind of finding a screenshot produces that a grep does not.

| # | Verdict | What was actually there |
|---|---|---|
| D7 | **already satisfied** | `mapFallback()` paints a pin glyph, the barangay, "about N km away (sample figure, not measured from you)" and the service radius when tiles never arrive. The brief saw an empty dashed box because its sandbox had no network *and* the fallback had not been read. The walk's own tally shows only `*.tile.openstreetmap.org` leaving the device. |
| P6 | **fixed** | the attention rows lead with a severity glyph in a tonal container and the count rides in a chip beside its own sentence. The `min-width:60px` numeral gutter is gone from this screen. |
| P7 | **fixed except the label** | one icon family throughout, 24px glyphs, and the admin's Help Desk draws `scale`, documented in `ICON_MEANING` as "cases being read for evidence" — adjudication, not the external-link arrow the brief described. `FSM` still reads `FSM`: the rename to **Jobs** is an owner decision and was not taken silently. |
| P8 | **fixed** | the entry screen is one surface: logo on white, display title, segmented control, 52px fields and primary action, the three documents as text links, "Create a new account" as an outlined action near the bottom. |
| P10 | **fixed** | the marks carry a line naming the step and the count, built from the same `STAGES` array and the same `label()` the rest of the app uses. |
| A3 | **partly, and honestly** | the provider-detail identity block is a monogram; the list rows still use `serviceAvatar`, which is the trade's own glyph in a tonal disc — arguably the better affordance for a marketplace. The cartoon `photoAvatar` faces remain in the Home cards, chat and messages, because the two splices that would replace them broke the suite's boot and the gate caught both. That change needs the harness, not a text replacement. |

**Remaining, stated as remaining.** The Home and provider-dashboard cards still nest a card inside a
card (P1 is partly done: the components exist — `.list`, `.list-row`, `.tile`, `.btn.tonal`,
`.count-chip` — and the admin console uses them; the two dashboards do not yet). The provider job flow
is not yet a stepper with one prominent primary action per state. The sheet pattern, the messages rows
and the profile rows inherit the old markup. None of these is a defect the instruments would catch;
they are the pass's remaining work, and §10 lists them rather than describing them as done.

## Ledger, latest (after Slice 5b and the sweep that caught it)

| # | Now | What changed since the last table |
|---|---|---|
| A3 | **fixed** | Monograms replace the cartoon faces across the UI. The third attempt worked because the boundary came from the next function's declaration rather than from "the next brace on its own line", which had been cutting `serviceAvatar` in half. `serviceAvatar`'s photo-first branch went too. A record with no name paints the person glyph, not an invented initial. |
| P1 | **further** | the provider's waiting requests and the conversation list are rows of `.list-row` with a hairline between siblings; the card-in-card is gone on both. The Home active-booking block remains a single card, which is what §3.5 reserves cards for. |
| §5 Profile | **done** | the destructive action is a text button at the bottom, through a `.btn.text-danger` tier the button system did not have — the same shape as the §70 lesson: the rule existed, the vocabulary did not. |
| Sweep | **caught what the walk could not** | the initials were sized by `Math.round(size * 0.4)`, which is 22px on a 56px disc — a step the scale owns — and 44px once the platform doubles the text, which it does not. Six of eight corners reported it while the default-width walk read zero. The size now comes from `--t-body`. |

**Still remaining, unchanged from the last table:** the provider job flow as a stepper with one
prominent primary action per state, the concierge's prompt chips, P9's long subtitles, the 3px chart
overhang at 200% text (pre-existing, two fixes measured and reverted), the APK rebuild, and every
handset leg. The pass is not complete and does not claim to be.


## Ledger, final (after the job path, the one-action repair and the three new probes)

| Item | Now | What the instruments say |
|---|---|---|
| §5 Booking detail / tracking | **done** | `stepPath()` paints a labelled vertical stepper on the resident's tracking screen and the provider's job screen; the current step carries `stateHint()` and each walked step carries the stamp the record wrote. `probe-step-words-agree.js` reads 12 cards and 21 surfaces over 102 screens and finds no screen naming one job two ways. |
| §5 Provider dashboard / job | **done, and it found a defect** | The job screen painted four buttons for two decisions — "Accept request"/"Decline" in the request card and "Accept this request"/"Decline this request" in the action bar. `jobActionBar(b, { answerAbove })` keeps the path and drops the duplicate moves; the surviving button reads its words from `JOB_VERBS`. Proven by `node tools/falsify-one-action.cjs` (3 of 3). |
| §5 AI Concierge | **done** | The prompt chips come from `CONCIERGE_PROMPTS` and take their look from `button.chip`; the simulated-flow note is still the quiet inline card. Clicking a chip in a real browser fills the field with all 84 characters — the proof the escaping change cost nothing. |
| §5 All sheets / modals / forms | **done on the two sites this pass touched** | "No page-specific one-offs" was checked by removing the concierge rail's four inline properties and the provider status cell's hand-typed `text-transform`. The remaining one-offs are the ones the components already cover. |
| P9 long copy in tight rows | **done** | The provider dashboard's "2 more scheduled jobs" row split its run-on caption: date and hour on line one, the job's own words on line two. |
| §8 five new probes | **done** | `probe-zero-style`, `probe-visual-contract` (both falsified by `falsify-visual-contract`, 5 of 5), plus `probe-action-duplication`, `probe-step-words-agree`, `probe-flat-palette` — all three falsified by `falsify-painted-contracts` (6 breaks: 3 plants, 3 refusals). |
| D7 offline placeholder | **done, and now a run rather than a reading** | `mapFallback()` was already there; `shot.cjs --offline` tells Chrome the device has no network, so the claim is measured on the screens that ask for tiles. |

**What is still not done, stated as not done.** The APK copy of the page is stale until the owner rebuilds it (§1.10); the `FSM` → `Jobs` label is an owner decision; the cartoon PNGs and `avatars/` sit on disk unreferenced awaiting approval to delete; the handset legs, the spoken screen-reader wording, and the one-minute task timing need a phone and a thumb.


## Ledger addendum (the last four passes: A3 finished, the chrome words, the width nobody had swept)

| Item | Now | What the instruments say |
|---|---|---|
| A3 cartoon avatars | **finished, after the audit re-opened a closed row** | Two admin paint sites were still requesting a PNG, and the verification review's fallback drew an applicant with no row as `maria`. Both call `photoAvatar` now, and `warmAvatars()` is deleted — it decoded all 22 files on boot for a flicker class that left the build with the monograms, and it is why the PNGs could not honestly be called unreferenced. `node tools/measure.cjs`: paint sites 0, `new Image()` for avatars 0, paths still named 18 (the three upload tables). |
| §3.4 chrome words | **applied, not substituted** | `FSM` → `Jobs` on the nav item, the screen header and the one button; `support_agent` on the admin Help Desk, with `scale` left on the case objects. The tab value, `providerFSM()` and every handler are untouched, so §1.3 is intact — the word changed, the navigation logic did not. |
| Icon provenance record | **48 rows for 48 glyphs** | `assets/ICON-LICENSES.md` shipped 47 rows because the generator's pattern required `{o:` and the new entry is written `{o: `. The count is now compared with the `ms: "` declarations inside the block, so the guard is "every glyph drawn has a row". |
| §8 width grid | **11 of 11 corners clean, and the grid found what the sweep could not** | 360 CSS px had never been run: the payment rail left 2px of "Cash on Arrival" past its scroller on three booking sheets at the *default* text size. `.req-rail` wraps now; the two 360 corners are in `DEFAULT_CASES`, which is ten corners and the run prints its own list. |
| The walk's own coverage | **102 screens, and a skipped row now fails a corner** | `provider-job-path` had skipped at every corner since the row was added: nine fruit rows sign in as p7 and `CURRENT_PROVIDER_ID` is a module binding, so the row asked the fruit harvester for the plumber's ongoing job. The per-row preamble restores the identity, and `camera rows that never painted a screen` is a tally the sweep fails on. |
| §8 five probes | **six, and the family is at 9 breaks** | `probe-painted-holes.js` reads the painted page for `undefined`/`NaN`/`[object Object]` rather than grepping the source; `node tools/falsify-painted-contracts.cjs` → 9 of 9, 0 not applied. |

| Chart axis anchoring | **the rule the comment declined, written when its own precondition arrived** | `default @ 200%` reported one label hanging 3px sideways of its chart box on the provider dashboard — not an edit, a date: the relative seed moved which week label is drawn last, and it landed at 79.06% of the plot against an `> 80` anchor band. The anchor is measured now (plot width against label reach, per kind), with the band kept for the harness path that has no box. The first version of the fix then put `Oct 26` 34x43px on top of `Sep 14`, and the guard written for *that* swallowed the thinning rule's proof until it was scoped to the one anchor direction that reaches backwards. `falsify-chart-collide` 4 of 4, the thinning break at `collide=15`. |
| Design census | **two ratchets are red, and they are this pass's** | `node tools/audit-design-consistency.cjs`: `inline_styles 1119 [RISEN from 1001]`, `literal_radii 20 [RISEN from 17]`. The audit is in no gate and no sweep, so the climb was invisible for a dozen passes; the last two commits moved it by −2. The bulk is one missing component — 274 fine-print blocks that type `font-size:var(--t-caption)` themselves instead of taking a class. |

**What is still not done, stated as not done.** The fine-print component that would take the 274
inline `font-size:var(--t-caption)` blocks out of the census (and with them the ratchet that is red);
the APK copy of the page is stale until the owner
rebuilds it (§1.10); the cartoon PNGs and `avatars/` sit on disk unreferenced awaiting approval to
delete; the handset legs, the spoken screen-reader wording, and the one-minute task timing need a
phone and a thumb; and the wallet contradiction (conflict C4) is the owner's to rule on, not this
pass's to resolve.
